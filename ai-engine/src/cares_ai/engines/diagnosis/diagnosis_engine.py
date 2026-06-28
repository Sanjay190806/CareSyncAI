"""Clinical differential diagnosis engine.

The engine uses deterministic, explainable disease profiles for runtime
prediction and can optionally load a trained scikit-learn artifact for model
probabilities when the training pipeline has produced one.
"""

from __future__ import annotations

from pathlib import Path

from cares_ai.engines.diagnosis.confidence_engine import calibrated_confidence, severity_from_confidence
from cares_ai.engines.diagnosis.feature_extractor import extract_features
from cares_ai.engines.diagnosis.patient_checker_model import PatientCheckerModel
from cares_ai.engines.risk.engine import RiskAssessmentResult


CONDITIONS = [
    "COPD Exacerbation",
    "Asthma",
    "Pneumonia",
    "Sepsis",
    "Respiratory Failure",
    "Diabetes",
    "DKA",
    "Hypertension",
    "Hypotension",
    "Cardiac Arrhythmia",
    "Heart Failure",
    "Stroke",
    "COVID-like Infection",
    "Anemia",
    "Kidney Injury",
]


class DiagnosisEngine:
    """Predict suggestive differential diagnoses from vitals and symptoms."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        self.model_path = Path(model_path or Path(__file__).with_name("patient_checker.pkl"))
        self.legacy_model_path = Path(__file__).with_name("diagnosis_model.pkl")
        self.model = PatientCheckerModel(self.model_path, self.legacy_model_path)

    def predict(self, payload: dict, risk_assessment: RiskAssessmentResult | None = None) -> dict:
        features = extract_features(payload)
        rule_scores = self._rule_scores(features.values, features.symptoms, features.context)
        model_scores = self._model_scores(payload)
        scores = self._blend_scores(rule_scores, model_scores)
        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        primary, raw_score = ranked[0]
        second = ranked[1][1] if len(ranked) > 1 else 0.0
        explanations = self._explain(primary, features.values, features.symptoms, features.context)
        confidence_score = calibrated_confidence(raw_score, len(explanations), second)
        confidence = int(round(confidence_score * 100))
        risk_score = risk_assessment.score if risk_assessment else self._risk_estimate(features.values, confidence_score)
        severity = severity_from_confidence(confidence_score, risk_score)
        data_quality = self._data_quality(payload, features.values, features.symptoms, features.context)
        model_used = self.model.status.model_used if model_scores else "baseline_fallback_rules"
        if not model_scores and self.model.status.status == "loaded":
            model_used = "baseline_fallback_rules_after_inference_failure"
        recommended_actions = self._actions(primary, severity)
        top_predictions = [
            {
                "condition": name,
                "probability": round(max(0.01, min(0.99, score)), 2),
                "explanation": self._explain(name, features.values, features.symptoms, features.context)[:4],
            }
            for name, score in ranked[:5]
        ]

        return {
            "success": True,
            "primaryDiagnosis": primary,
            "primaryCondition": primary,
            "confidence": confidence,
            "confidenceScore": confidence_score,
            "modelConfidence": confidence,
            "predictionConfidence": confidence,
            "dataQuality": data_quality,
            "dataQualityScore": data_quality,
            "differentials": [
                {
                    "diagnosis": item["condition"],
                    "confidence": int(round(item["probability"] * 100)),
                    "reasoning": " ".join(item["explanation"]),
                }
                for item in top_predictions
            ],
            "topPredictions": top_predictions,
            "riskFactors": self._risk_factors(features.values, features.context),
            "reasoning": explanations,
            "reasoningText": " ".join(explanations),
            "reasoningItems": explanations,
            "recommendations": recommended_actions,
            "recommendedActions": recommended_actions,
            "severity": severity,
            "triageLevel": self._triage_level(severity, risk_score),
            "riskScore": risk_score,
            "modelUsed": model_used,
            "modelType": model_used,
            "modelStatus": self.model.status.as_dict(),
            "disclaimer": "Suggestive diagnosis only. Not a definitive medical diagnosis.",
        }

    def _model_scores(self, payload: dict) -> dict[str, float]:
        return self.model.predict_scores(payload)

    @staticmethod
    def _blend_scores(rule_scores: dict[str, float], model_scores: dict[str, float]) -> dict[str, float]:
        if not model_scores:
            return rule_scores
        blended: dict[str, float] = {}
        for condition in CONDITIONS:
            blended[condition] = rule_scores.get(condition, 0.0) * 0.55 + model_scores.get(condition, 0.0) * 0.45
        return blended

    @staticmethod
    def _rule_scores(v: dict[str, float], symptoms: set[str], context: set[str]) -> dict[str, float]:
        def has(*names: str) -> float:
            return sum(1.0 for name in names if name in symptoms)

        score = {condition: 0.08 for condition in CONDITIONS}
        spo2 = v["spo2"]
        hr = v["heart_rate"]
        rr = v["respiratory_rate"]
        temp = v["temperature"]
        bp_sys = v["bp_sys"]
        glucose = v["glucose"]

        score["COPD Exacerbation"] += (0.24 if spo2 and spo2 < 92 else 0) + (0.18 if rr > 22 else 0) + has("wheezing", "cough", "shortness of breath") * 0.12 + (0.22 if "copd" in context else 0) + (0.1 if "smoker" in context else 0)
        score["Asthma"] += has("wheezing", "shortness of breath", "cough") * 0.16 + (0.16 if rr > 24 else 0) + (0.1 if spo2 and spo2 < 94 else 0) + (0.14 if "asthma" in context else 0)
        score["Pneumonia"] += has("fever", "cough", "productive cough", "chills", "fatigue", "shortness of breath") * 0.11 + (0.18 if temp > 100.4 else 0) + (0.12 if spo2 and spo2 < 94 else 0)
        score["Sepsis"] += has("fever", "chills", "confusion", "weakness") * 0.13 + (0.18 if hr > 110 else 0) + (0.18 if bp_sys and bp_sys < 95 else 0) + (0.12 if rr > 22 else 0)
        score["Respiratory Failure"] += (0.34 if spo2 and spo2 < 88 else 0) + (0.2 if rr > 28 or (rr and rr < 10) else 0) + has("confusion", "shortness of breath") * 0.13
        score["Diabetes"] += (0.2 if "diabetic" in context else 0) + (0.16 if glucose > 180 else 0) + has("excessive thirst", "excessive urination", "fatigue") * 0.12
        score["DKA"] += (0.14 if "diabetic" in context else 0) + (0.28 if glucose > 250 else 0) + (0.1 if rr > 24 else 0) + has("excessive thirst", "excessive urination", "fatigue") * 0.11
        score["Hypertension"] += (0.42 if bp_sys >= 180 else 0) + (0.16 if bp_sys >= 150 else 0) + has("headache", "chest pain", "confusion", "dizziness") * 0.12 + (0.12 if "hypertension" in context else 0)
        score["Hypotension"] += (0.5 if bp_sys and bp_sys < 90 else 0) + has("dizziness", "weakness", "confusion") * 0.12
        score["Cardiac Arrhythmia"] += has("palpitations", "dizziness", "chest pain") * 0.17 + (0.18 if hr > 125 or (hr and hr < 50) else 0) + (0.08 if "cardiac history" in context else 0)
        score["Heart Failure"] += has("shortness of breath", "fatigue", "chest pain") * 0.11 + (0.16 if spo2 and spo2 < 93 else 0) + (0.12 if hr > 105 else 0) + (0.2 if "cardiac history" in context else 0)
        score["Stroke"] += has("confusion", "headache", "weakness", "dizziness", "neurologic deficit", "facial droop") * 0.13 + (0.1 if "hypertension" in context else 0)
        score["COVID-like Infection"] += has("fever", "cough", "fatigue", "headache", "chills", "sore throat") * 0.1 + (0.1 if spo2 and spo2 < 94 else 0) + (0.1 if "covid exposure" in context else 0)
        score["Anemia"] += has("fatigue", "weakness", "dizziness", "pale skin") * 0.12 + (0.08 if hr > 105 else 0) + (0.12 if "anemia" in context else 0)
        score["Kidney Injury"] += has("fatigue", "weakness", "reduced urine output", "edema") * 0.1 + (0.12 if "kidney disease" in context else 0) + (0.07 if "diabetic" in context or "hypertension" in context else 0)

        total = sum(max(0.01, value) for value in score.values())
        return {condition: max(0.01, value) / total for condition, value in score.items()}

    @staticmethod
    def _explain(condition: str, v: dict[str, float], symptoms: set[str], context: set[str]) -> list[str]:
        reasons: list[str] = []
        if condition in {"COPD Exacerbation", "Asthma", "Respiratory Failure", "Pneumonia", "Heart Failure", "COVID-like Infection"}:
            if v["spo2"] and v["spo2"] < 94:
                reasons.append(f"SpO2 {v['spo2']:.0f}% is below expected range.")
            if v["respiratory_rate"] > 22:
                reasons.append(f"Respiratory rate {v['respiratory_rate']:.0f}/min is elevated.")
        if "wheezing" in symptoms:
            reasons.append("Wheezing reported.")
        if condition in {"Sepsis", "Pneumonia", "COVID-like Infection"} and v["temperature"] > 100.4:
            reasons.append(f"Temperature {v['temperature']:.1f}F supports infectious concern.")
        if condition in {"Sepsis", "Hypotension"} and v["bp_sys"] and v["bp_sys"] < 95:
            reasons.append(f"Systolic BP {v['bp_sys']:.0f} mmHg is low.")
        if condition in {"Cardiac Arrhythmia", "Sepsis", "Heart Failure", "Anemia"} and (v["heart_rate"] > 120 or (v["heart_rate"] and v["heart_rate"] < 50)):
            reasons.append(f"Heart rate {v['heart_rate']:.0f}/min is outside expected range.")
        if condition == "Hypertension" and v["bp_sys"] >= 180:
            reasons.append(f"Systolic BP {v['bp_sys']:.0f} mmHg is in crisis range.")
        if condition in {"Diabetes", "DKA"} and v["glucose"] > 180:
            reasons.append(f"Glucose {v['glucose']:.0f} mg/dL is elevated.")
        if condition == "Stroke" and {"weakness", "confusion", "neurologic deficit", "facial droop"} & symptoms:
            reasons.append("Neurologic symptoms reported.")
        if condition == "Kidney Injury" and {"reduced urine output", "edema"} & symptoms:
            reasons.append("Renal warning symptoms reported.")
        for flag in sorted(context):
            if flag in {"copd", "asthma", "smoker", "diabetic", "hypertension", "cardiac history", "kidney disease", "anemia", "covid exposure"}:
                reasons.append(f"Clinical context includes {flag}.")
        if not reasons:
            reasons.append("Pattern is based on the combined symptom and vital profile.")
        return reasons[:6]

    @staticmethod
    def _risk_factors(v: dict[str, float], context: set[str]) -> list[str]:
        factors: list[str] = []
        if v["age"] > 60:
            factors.append("age > 60")
        if v["bmi"] >= 30:
            factors.append("obesity range BMI")
        factors.extend(sorted(context))
        return factors[:8]

    @staticmethod
    def _data_quality(payload: dict, v: dict[str, float], symptoms: set[str], context: set[str]) -> int:
        demographics = payload.get("demographics") or payload.get("patient") or {}
        vital_keys = ["spo2", "heart_rate", "bp_sys", "bp_dia", "respiratory_rate", "temperature", "glucose"]
        vital_score = sum(1 for key in vital_keys if v.get(key, 0) > 0) * 7
        demographic_score = sum(
            1 for key in ["age", "gender", "height", "weight"]
            if demographics.get(key) not in {None, ""}
        ) * 4
        return min(100, 30 + vital_score + demographic_score + len(symptoms) * 4 + len(context) * 3)

    @staticmethod
    def _actions(condition: str, severity: str) -> list[str]:
        actions = {
            "COPD Exacerbation": ["Immediate respiratory assessment", "Check bronchodilator/oxygen plan", "Repeat SpO2 and respiratory rate"],
            "Asthma": ["Assess airway and work of breathing", "Prepare bronchodilator therapy per protocol", "Repeat peak/vital assessment"],
            "Pneumonia": ["Evaluate for infection source", "Consider chest imaging and labs", "Monitor oxygen requirement"],
            "Sepsis": ["Activate sepsis screening pathway", "Check lactate/cultures per protocol", "Review fluids, antibiotics, and escalation needs"],
            "Respiratory Failure": ["Urgent airway and oxygenation assessment", "Prepare ventilatory support pathway", "Notify senior clinician immediately"],
            "Diabetes": ["Review glucose trend and diabetes plan", "Assess hydration and medication timing", "Repeat glucose monitoring"],
            "DKA": ["Check ketones, anion gap, and acid-base status", "Review insulin and fluid protocol", "Escalate metabolic pathway if unstable"],
            "Hypertension": ["Confirm BP manually", "Assess neurologic/chest pain symptoms", "Escalate for controlled BP management"],
            "Hypotension": ["Assess perfusion and volume status", "Repeat BP and review trends", "Escalate if mental status or perfusion worsens"],
            "Cardiac Arrhythmia": ["Obtain ECG rhythm strip", "Assess hemodynamic stability", "Review electrolyte and medication risks"],
            "Heart Failure": ["Assess fluid status and oxygenation", "Review cardiac history and medications", "Consider ECG and cardiac markers"],
            "Stroke": ["Perform urgent neurologic assessment", "Confirm last-known-well time", "Escalate stroke pathway if deficits persist"],
            "COVID-like Infection": ["Review isolation precautions", "Monitor temperature and oxygenation", "Escalate if respiratory distress develops"],
            "Anemia": ["Review hemoglobin and bleeding risk", "Assess perfusion and symptoms", "Repeat vitals and labs as indicated"],
            "Kidney Injury": ["Review urine output and creatinine trend", "Hold nephrotoxic medications if appropriate", "Assess fluid balance"],
        }
        selected = actions.get(condition, ["Clinician review recommended", "Repeat vitals", "Document symptom onset"])
        if severity in {"Critical", "High"}:
            return ["Prioritize bedside clinician review", *selected]
        return selected

    @staticmethod
    def _risk_estimate(v: dict[str, float], confidence: float) -> int:
        score = confidence * 55
        if v["spo2"] and v["spo2"] < 90:
            score += 25
        if v["bp_sys"] and (v["bp_sys"] < 90 or v["bp_sys"] >= 180):
            score += 18
        if v["heart_rate"] > 125 or (v["heart_rate"] and v["heart_rate"] < 45):
            score += 14
        return int(max(0, min(100, round(score))))

    @staticmethod
    def _triage_level(severity: str, risk_score: int) -> int:
        if severity == "Critical" or risk_score >= 86:
            return 5
        if severity == "High" or risk_score >= 66:
            return 4
        if severity == "Moderate" or risk_score >= 41:
            return 3
        if risk_score >= 21:
            return 2
        return 1
