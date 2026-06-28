"""Deterministic clinical narrative intelligence engine — Phase 7."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import Sequence


VITAL_LABELS = {
    "spo2": "oxygen saturation (SpO₂)",
    "heart_rate": "heart rate",
    "heartRate": "heart rate",
    "blood_pressure": "blood pressure",
    "bloodPressure": "blood pressure",
    "respiratory_rate": "respiratory rate",
    "respiratoryRate": "respiratory rate",
    "temperature": "temperature",
    "etco2": "end-tidal CO₂ (EtCO₂)",
}

CLINICAL_IMPACT = {
    "spo2": "acute respiratory stress and hypoxemia risk",
    "heart_rate": "cardiovascular compensation or hemodynamic strain",
    "heartRate": "cardiovascular compensation or hemodynamic strain",
    "blood_pressure": "perfusion compromise or shock physiology",
    "bloodPressure": "perfusion compromise or shock physiology",
    "respiratory_rate": "respiratory distress or ventilatory failure",
    "respiratoryRate": "respiratory distress or ventilatory failure",
    "temperature": "infectious or inflammatory process",
    "etco2": "ventilatory efficiency and airway patency concern",
}


@dataclass(slots=True)
class DeviationSnapshot:
    vital: str
    sigma: float


@dataclass(slots=True)
class NarrativeInput:
    patient_id: str
    vitals: dict[str, float]
    baseline: dict[str, float] | None = None
    deviations: list[DeviationSnapshot] = field(default_factory=list)
    trend: str = "stable"
    risk_score: int = 0
    previous_risk_score: int | None = None
    tier: int = 1
    correlation_patterns: Sequence[str] = field(default_factory=list)


@dataclass(slots=True)
class ClinicalNarrativeOutput:
    patient_id: str
    narrative: str
    severity_reasoning: str
    trend_interpretation: str
    risk_explanation: str
    confidence: float
    suggested_action: str | None = None
    is_code_red: bool = False
    clinical_reasoning: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class StoryTimelineEntry:
    patient_id: str
    stage: str
    narrative: str
    tier: int
    risk_score: int
    timestamp: str
    event_type: str


def _format_sigma(sigma: float) -> str:
    sign = "+" if sigma >= 0 else ""
    return f"{sign}{sigma:.1f}σ"


def _suggest_action(tier: int) -> str:
    if tier >= 5:
        return "Activate CODE RED protocol — mobilize rapid response and ICU escalation."
    if tier >= 4:
        return "Notify physician and increase monitoring to continuous."
    if tier >= 3:
        return "Reassess within 5 minutes and continue close observation."
    if tier >= 2:
        return "Continue enhanced observation."
    return "Continue routine personalized baseline monitoring."


class ClinicalNarrativeEngine:
    """Rule-based narrative generator — no LLM, fully deterministic."""

    def generate(self, input_data: NarrativeInput) -> ClinicalNarrativeOutput:
        deviations = input_data.deviations or self._infer_deviations(input_data)
        significant = sorted(
            [item for item in deviations if abs(item.sigma) >= 1.2],
            key=lambda item: abs(item.sigma),
            reverse=True,
        )

        primary = significant[0] if significant else None
        if primary:
            direction = "decline" if primary.sigma < 0 else "elevation"
            label = VITAL_LABELS.get(primary.vital, primary.vital)
            what_changed = (
                f"Patient shows {direction} in {label} ({_format_sigma(primary.sigma)} from personalized baseline)"
            )
            if abs(primary.sigma) >= 2.0:
                what_changed += f", indicating {CLINICAL_IMPACT.get(primary.vital, 'physiologic instability')}"
            what_changed += "."
        else:
            what_changed = f"Vitals remain near personalized baseline with risk score at {input_data.risk_score}."

        max_sigma = max((abs(item.sigma) for item in deviations), default=0.0)
        if input_data.tier >= 5:
            severity = (
                f"Life-threatening deviation magnitude ({max_sigma:.1f}σ) with Tier 5 CODE RED threshold breached "
                "— immediate intervention required."
            )
        elif input_data.tier >= 4:
            severity = (
                f"Critical-tier physiology: {max_sigma:.1f}σ deviation exceeds personalized warning envelope."
            )
        elif input_data.tier >= 3:
            severity = f"Watch-tier signal: sustained deviation ({max_sigma:.1f}σ) warrants increased surveillance."
        else:
            severity = "Clinically meaningful change within manageable monitoring parameters."

        previous = input_data.previous_risk_score
        delta = input_data.risk_score - previous if previous is not None else 0
        if input_data.trend in {"deteriorating", "declining", "down"}:
            accel = "accelerating deterioration" if delta >= 8 else "progressive worsening"
            trend_text = f"Trend analysis shows {accel}"
            if delta > 0:
                trend_text += f" with risk score rising {delta} points"
            trend_text += "."
        elif input_data.trend in {"improving", "recovering", "up"}:
            trend_text = "Trend analysis indicates improving physiology"
            if delta < 0:
                trend_text += f" with risk score decreasing {abs(delta)} points"
            trend_text += "."
        else:
            trend_text = "Trend remains stable"
            if delta != 0:
                trend_text += f"; risk score changed marginally ({abs(delta)} pts)"
            trend_text += "."

        factors = [VITAL_LABELS.get(item.vital, item.vital) for item in deviations if abs(item.sigma) >= 2.0]
        factor_text = " + ".join(factors) if factors else "multi-vital pattern"
        risk_text = f"Overall risk at {input_data.risk_score}/100 (Tier {input_data.tier}) driven by {factor_text}"
        if delta != 0 and previous is not None:
            risk_text += f". Risk {'escalated' if delta > 0 else 'decreased'} from {previous}"
        risk_text += "."

        confidence = min(
            0.99,
            0.55
            + len(significant) * 0.08
            + (0.1 if input_data.trend not in {"stable", "flat"} else 0.0)
            + (0.12 if input_data.tier >= 4 else 0.0),
        )

        narrative = " ".join([what_changed, severity, trend_text, risk_text])
        clinical_reasoning = {
            "basic": what_changed,
            "clinical": severity,
            "critical_reasoning": trend_text,
            "icustyle_summary": risk_text,
        }

        return ClinicalNarrativeOutput(
            patient_id=input_data.patient_id,
            narrative=narrative,
            severity_reasoning=severity,
            trend_interpretation=trend_text,
            risk_explanation=risk_text,
            confidence=round(confidence, 2),
            suggested_action=_suggest_action(input_data.tier),
            is_code_red=input_data.tier >= 5,
            clinical_reasoning=clinical_reasoning,
        )

    def generate_code_red(self, input_data: NarrativeInput) -> ClinicalNarrativeOutput:
        base = self.generate(replace(input_data, tier=5))
        deviations = input_data.deviations or self._infer_deviations(input_data)
        worst = max(deviations, key=lambda item: abs(item.sigma), default=None)
        sigma_text = _format_sigma(worst.sigma) if worst else "critical"
        label = VITAL_LABELS.get(worst.vital, "vital") if worst else "vital"
        base.narrative = (
            f"CODE RED: Patient demonstrates life-threatening {label} depletion ({sigma_text} from personalized baseline) "
            f"with rapidly deteriorating cardiovascular compensation. {base.trend_interpretation} Immediate ICU intervention required."
        )
        base.is_code_red = True
        base.suggested_action = "Activate CODE RED — rapid response team and critical care escalation NOW."
        base.clinical_reasoning = {
            "basic": "CODE RED active: immediate patient threat detected.",
            "clinical": f"{label} is critically outside personalized baseline ({sigma_text}).",
            "critical_reasoning": base.trend_interpretation,
            "icustyle_summary": "Acute respiratory decompensation pattern requiring rapid response and airway/perfusion management.",
        }
        return base

    def _infer_deviations(self, input_data: NarrativeInput) -> list[DeviationSnapshot]:
        if not input_data.baseline:
            return []
        std_defaults = {"spo2": 1.5, "heartRate": 8.0, "heart_rate": 8.0, "bloodPressure": 12.0, "respiratoryRate": 3.0, "temperature": 0.4}
        deviations: list[DeviationSnapshot] = []
        for key, std in std_defaults.items():
            if key in input_data.vitals and key in input_data.baseline:
                current = float(input_data.vitals[key])
                mean = float(input_data.baseline[key])
                sigma = (current - mean) / std if std else 0.0
                deviations.append(DeviationSnapshot(vital=key, sigma=round(sigma, 2)))
        return deviations


class PatientStoryEngine:
    """Maintains continuous clinical story timelines per patient."""

    def __init__(self) -> None:
        self._timelines: dict[str, list[StoryTimelineEntry]] = {}
        self._last_tier: dict[str, int] = {}

    def record(self, input_data: NarrativeInput, output: ClinicalNarrativeOutput, timestamp: str) -> list[StoryTimelineEntry]:
        timeline = self._timelines.setdefault(input_data.patient_id, [])
        previous_tier = self._last_tier.get(input_data.patient_id, 1)

        if not timeline:
            timeline.append(
                StoryTimelineEntry(
                    patient_id=input_data.patient_id,
                    stage="normal_state",
                    narrative="Baseline stable vitals recorded within personalized profile.",
                    tier=1,
                    risk_score=input_data.risk_score,
                    timestamp=timestamp,
                    event_type="baseline",
                )
            )

        if input_data.tier > previous_tier:
            timeline.append(
                StoryTimelineEntry(
                    patient_id=input_data.patient_id,
                    stage="code_red" if input_data.tier >= 5 else "critical_escalation" if input_data.tier >= 4 else "warning_state",
                    narrative=output.narrative,
                    tier=input_data.tier,
                    risk_score=input_data.risk_score,
                    timestamp=timestamp,
                    event_type="code_red" if input_data.tier >= 5 else "critical",
                )
            )
        elif input_data.trend in {"improving", "recovering", "up"} and input_data.tier < previous_tier:
            timeline.append(
                StoryTimelineEntry(
                    patient_id=input_data.patient_id,
                    stage="recovery",
                    narrative=output.narrative,
                    tier=input_data.tier,
                    risk_score=input_data.risk_score,
                    timestamp=timestamp,
                    event_type="recovery",
                )
            )

        self._last_tier[input_data.patient_id] = input_data.tier
        self._timelines[input_data.patient_id] = timeline[-20:]
        return list(timeline)


class ShiftReportGenerator:
    """End-of-shift ICU documentation generator."""

    @staticmethod
    def generate(patients: Sequence[dict]) -> dict:
        critical = sum(1 for patient in patients if int(patient.get("tier", 1)) >= 4)
        code_red = sum(1 for patient in patients if int(patient.get("tier", 1)) >= 5)
        sorted_patients = sorted(patients, key=lambda item: int(item.get("risk_score", item.get("riskScore", 0))), reverse=True)
        worst = sorted_patients[0] if sorted_patients else None

        narrative = f"During the shift, {len(patients)} patients were monitored under personalized baseline intelligence. "
        if critical:
            narrative += f"{critical} patient(s) entered critical distress states. "
        if worst:
            name = worst.get("name", worst.get("patient_id", "Unknown"))
            narrative += (
                f"{name} exhibited the most severe deterioration pattern "
                f"(Tier {worst.get('tier')}, score {worst.get('risk_score', worst.get('riskScore'))}). "
            )

        return {
            "total_patients_monitored": len(patients),
            "critical_events": critical,
            "code_red_events": code_red,
            "narrative_report": narrative.strip(),
            "major_incidents_summary": (
                f"{code_red} CODE RED event(s) requiring immediate intervention."
                if code_red
                else f"{critical} critical-tier patient(s) under active monitoring."
                if critical
                else "No major critical incidents during this shift."
            ),
        }


PATIENT_7_DEMO_STAGES = [
    {"stage": "stable_baseline", "risk_score": 12, "tier": 1, "vitals": {"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1, "etco2": 38}, "trend": "stable"},
    {"stage": "early_deviation", "risk_score": 32, "tier": 2, "vitals": {"spo2": 90, "heartRate": 96, "bloodPressure": 118, "respiratoryRate": 18, "temperature": 98.4, "etco2": 44}, "trend": "deteriorating"},
    {"stage": "worsening_oxygen", "risk_score": 58, "tier": 3, "vitals": {"spo2": 86, "heartRate": 110, "bloodPressure": 104, "respiratoryRate": 14, "temperature": 99.0, "etco2": 49}, "trend": "deteriorating"},
    {"stage": "rapid_deterioration", "risk_score": 79, "tier": 4, "vitals": {"spo2": 82, "heartRate": 124, "bloodPressure": 88, "respiratoryRate": 10, "temperature": 99.8, "etco2": 56}, "trend": "deteriorating"},
    {"stage": "code_red", "risk_score": 91, "tier": 5, "vitals": {"spo2": 78, "heartRate": 140, "bloodPressure": 79, "respiratoryRate": 8, "temperature": 100.2, "etco2": 62}, "trend": "deteriorating"},
    {"stage": "intervention_response", "risk_score": 45, "tier": 3, "vitals": {"spo2": 92, "heartRate": 98, "bloodPressure": 102, "respiratoryRate": 16, "temperature": 99.2, "etco2": 46}, "trend": "improving"},
]

BASELINE_VITALS = {"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1, "etco2": 38}


def build_patient_7_demo_stage(stage_index: int, patient_id: str = "p7") -> dict:
    """Build deterministic demo payload for Patient 7 crisis sequence."""
    if stage_index < 0 or stage_index >= len(PATIENT_7_DEMO_STAGES):
        raise IndexError("Invalid demo stage index")

    stage = PATIENT_7_DEMO_STAGES[stage_index]
    previous_score = PATIENT_7_DEMO_STAGES[stage_index - 1]["risk_score"] if stage_index > 0 else stage["risk_score"]
    engine = ClinicalNarrativeEngine()
    input_data = NarrativeInput(
        patient_id=patient_id,
        vitals=stage["vitals"],
        baseline=BASELINE_VITALS,
        trend=stage["trend"],
        risk_score=stage["risk_score"],
        previous_risk_score=previous_score,
        tier=stage["tier"],
        correlation_patterns=["SpO2_Decrease_HR_Increase"] if stage_index > 0 else [],
    )
    output = engine.generate_code_red(input_data) if stage["tier"] >= 5 else engine.generate(input_data)
    return {
        "stage": stage["stage"],
        "stage_index": stage_index,
        "patient_id": patient_id,
        "narrative": output,
        "vitals": stage["vitals"],
        "risk_score": stage["risk_score"],
        "tier": stage["tier"],
    }
