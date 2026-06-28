"""Clinical narrative API — deterministic rule-based intelligence."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from cares_ai.engines.narrative.engine import (
    ClinicalNarrativeEngine,
    NarrativeInput,
    ShiftReportGenerator,
    build_patient_7_demo_stage,
)

router = APIRouter()
_engine = ClinicalNarrativeEngine()


class NarrativeRequest(BaseModel):
    patient_id: str = Field(alias="patientId")
    vitals: dict[str, float]
    baseline: dict[str, float] | None = None
    deviations: list[dict[str, float | str]] | None = None
    trend: str = "stable"
    risk_score: int = Field(default=0, alias="riskScore")
    previous_risk_score: int | None = Field(default=None, alias="previousRiskScore")
    tier: int = 1
    correlation_patterns: list[str] = Field(default_factory=list, alias="correlationPatterns")

    model_config = {"populate_by_name": True}


@router.post("/narrative/generate")
def generate_narrative(request: NarrativeRequest) -> dict:
    deviations = None
    if request.deviations:
        from cares_ai.engines.narrative.engine import DeviationSnapshot

        deviations = [
            DeviationSnapshot(vital=str(item["vital"]), sigma=float(item["sigma"]))
            for item in request.deviations
        ]

    input_data = NarrativeInput(
        patient_id=request.patient_id,
        vitals=request.vitals,
        baseline=request.baseline,
        deviations=deviations or [],
        trend=request.trend,
        risk_score=request.risk_score,
        previous_risk_score=request.previous_risk_score,
        tier=request.tier,
        correlation_patterns=request.correlation_patterns,
    )
    output = _engine.generate_code_red(input_data) if request.tier >= 5 else _engine.generate(input_data)
    return {
        "patient_id": output.patient_id,
        "narrative": output.narrative,
        "severity_reasoning": output.severity_reasoning,
        "trend_interpretation": output.trend_interpretation,
        "risk_explanation": output.risk_explanation,
        "confidence": output.confidence,
        "suggested_action": output.suggested_action,
        "is_code_red": output.is_code_red,
        "clinical_reasoning": output.clinical_reasoning,
    }


@router.post("/narrative/shift-report")
def generate_shift_report(patients: list[dict]) -> dict:
    return ShiftReportGenerator.generate(patients)


@router.get("/narrative/demo/patient-7/{stage_index}")
def get_patient_7_demo_stage(stage_index: int) -> dict:
    payload = build_patient_7_demo_stage(stage_index)
    narrative = payload["narrative"]
    return {
        "stage": payload["stage"],
        "stageIndex": payload["stage_index"],
        "patientId": payload["patient_id"],
        "vitals": payload["vitals"],
        "riskScore": payload["risk_score"],
        "tier": payload["tier"],
        "narrative": {
            "patient_id": narrative.patient_id,
            "narrative": narrative.narrative,
            "severity_reasoning": narrative.severity_reasoning,
            "trend_interpretation": narrative.trend_interpretation,
            "risk_explanation": narrative.risk_explanation,
            "confidence": narrative.confidence,
            "is_code_red": narrative.is_code_red,
            "clinical_reasoning": narrative.clinical_reasoning,
        },
    }
