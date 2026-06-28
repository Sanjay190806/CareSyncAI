"""Diagnosis API surface for Patient Checker Pro."""

from __future__ import annotations

from dataclasses import asdict
import logging
import time

from fastapi import APIRouter
from pydantic import BaseModel, Field

from cares_ai.engines.baseline.engine import DeviationScore
from cares_ai.engines.diagnosis import DiagnosisEngine
from cares_ai.engines.risk.engine import RiskEngine

router = APIRouter()
diagnosis_engine = DiagnosisEngine()
logger = logging.getLogger("cares_ai.patient_checker.api")


class DiagnosisRequest(BaseModel):
    patient_id: str | None = Field(default=None, alias="patientId")
    demographics: dict = Field(default_factory=dict)
    vitals: dict = Field(default_factory=dict)
    symptoms: list[str] = Field(default_factory=list)
    clinical_context: list[str] = Field(default_factory=list, alias="clinicalContext")
    baseline: dict | None = None
    previous_risk_score: int | None = Field(default=None, alias="previousRiskScore")

    model_config = {"populate_by_name": True, "by_alias": True}


@router.post("/diagnosis/predict")
@router.post("/patient-checker")
@router.post("/patient-checker/predict")
@router.post("/predict")
def predict_diagnosis(payload: DiagnosisRequest) -> dict:
    started = time.perf_counter()
    request = payload.model_dump(by_alias=True)
    logger.info(
        "Patient Checker Request Received",
        extra={"patientId": payload.patient_id, "symptomCount": len(payload.symptoms)},
    )
    try:
        deviations = _deviations_from_baseline(request)
        risk = RiskEngine(patient_context={"previousRiskScore": payload.previous_risk_score}).evaluate(deviations)
        result = diagnosis_engine.predict(request, risk)
        result["integrations"] = {
            "riskEngine": {"score": risk.score, "tier": risk.tier, "trend": risk.trend},
            "baselineEngine": {"deviations": [asdict(item) for item in deviations]},
        }
        logger.info(
            "Patient Checker Request Completed",
            extra={
                "patientId": payload.patient_id,
                "primaryDiagnosis": result.get("primaryDiagnosis") or result.get("primaryCondition"),
                "modelUsed": result.get("modelUsed") or result.get("modelType"),
                "durationMs": round((time.perf_counter() - started) * 1000, 2),
            },
        )
        return result
    except Exception as exc:
        logger.exception(
            "Patient Checker Failed",
            extra={"patientId": payload.patient_id, "error": str(exc)},
        )
        return _emergency_response(request, str(exc))


@router.get("/patient-checker/health")
def patient_checker_health() -> dict:
    return {
        "service": "caresync-ai-patient-checker",
        "status": "ok",
        "aiStatus": "ok",
        "modelStatus": diagnosis_engine.model.status.as_dict(),
        "databaseStatus": {"status": "not_configured"},
        "webSocketStatus": {"status": "not_configured"},
        "fallbackStatus": "available",
    }


def _deviations_from_baseline(payload: dict) -> list[DeviationScore]:
    baseline = payload.get("baseline") or {}
    vitals = payload.get("vitals") or {}
    mapping = {
        "spo2": "spo2",
        "heartRate": "heart_rate",
        "bpSys": "bp_sys",
        "respiratoryRate": "respiratory_rate",
        "temperature": "temperature",
        "glucose": "glucose",
    }
    deviations: list[DeviationScore] = []
    defaults = {
        "spo2": (96.0, 2.0),
        "heartRate": (82.0, 12.0),
        "bpSys": (122.0, 14.0),
        "respiratoryRate": (18.0, 4.0),
        "temperature": (98.6, 0.8),
        "glucose": (110.0, 28.0),
    }
    for request_key, vital_name in mapping.items():
        current = vitals.get(request_key)
        if current is None:
            continue
        profile = baseline.get(request_key) or {}
        mean, std = defaults[request_key]
        mean = float(profile.get("mean", mean)) if isinstance(profile, dict) else mean
        std = max(0.1, float(profile.get("stdDev", std)) if isinstance(profile, dict) else std)
        sigma = (float(current) - mean) / std
        if request_key == "spo2":
            sigma = (mean - float(current)) / std
        deviations.append(
            DeviationScore(
                vital=vital_name,
                current_value=float(current),
                baseline_mean=mean,
                baseline_std_dev=std,
                sigma_deviation=sigma,
                is_critical=abs(sigma) >= 3.0,
            )
        )
    return deviations


def _emergency_response(payload: dict, reason: str) -> dict:
    vitals = payload.get("vitals") or {}
    try:
        spo2 = float(vitals.get("spo2") or 100)
    except (TypeError, ValueError):
        spo2 = 100.0
    risk_score = 74 if spo2 < 90 else 55
    top_predictions = [
        {"condition": "Pneumonia", "probability": 0.24, "explanation": ["Emergency fallback activated after AI route failure."]},
        {"condition": "COPD Exacerbation", "probability": 0.22, "explanation": ["Respiratory symptoms and oxygenation should be reviewed."]},
        {"condition": "Sepsis", "probability": 0.20, "explanation": ["Screen for infection, hypotension, tachycardia, and altered mentation."]},
        {"condition": "Heart Failure", "probability": 0.18, "explanation": ["Consider cardiac history, oxygenation, and fluid balance."]},
        {"condition": "Asthma", "probability": 0.16, "explanation": ["Assess wheeze, work of breathing, and bronchodilator response."]},
    ]
    return {
        "success": True,
        "primaryDiagnosis": top_predictions[0]["condition"],
        "primaryCondition": top_predictions[0]["condition"],
        "confidence": 52,
        "confidenceScore": 0.52,
        "riskScore": risk_score,
        "differentials": [
            {"diagnosis": item["condition"], "confidence": int(item["probability"] * 100), "reasoning": " ".join(item["explanation"])}
            for item in top_predictions
        ],
        "topPredictions": top_predictions,
        "reasoning": ["Emergency fallback activated after Patient Checker failure."],
        "reasoningText": "Emergency fallback activated after Patient Checker failure.",
        "reasoningItems": ["Emergency fallback activated after Patient Checker failure."],
        "recommendations": ["Repeat vitals.", "Clinician review recommended.", "Escalate if instability is present."],
        "recommendedActions": ["Repeat vitals.", "Clinician review recommended.", "Escalate if instability is present."],
        "modelUsed": "ai_engine_emergency_fallback",
        "modelType": "ai_engine_emergency_fallback",
        "modelStatus": diagnosis_engine.model.status.as_dict(),
        "dataQuality": 50,
        "dataQualityScore": 50,
        "riskFactors": [],
        "severity": "Moderate",
        "triageLevel": 3,
        "fallbackReason": reason,
        "disclaimer": "Suggestive diagnosis only. Not a definitive medical diagnosis.",
    }
