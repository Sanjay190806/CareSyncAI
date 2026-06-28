"""Risk scoring API surface for the AI engine."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from cares_ai.engines.baseline.engine import DeviationScore
from cares_ai.engines.risk.engine import RiskEngine

router = APIRouter()


class RiskScoreRequest(BaseModel):
    patient_id: str = Field(alias="patientId")
    deviations: list[dict] = Field(default_factory=list)
    correlation_flags: list[str] | None = Field(default=None, alias="correlationFlags")
    previous_risk_score: int | None = Field(default=None, alias="previousRiskScore")

    model_config = {"populate_by_name": True, "by_alias": True}


class RiskScoreResponse(BaseModel):
    score: int
    contributing_factors: list[str] = Field(alias="contributingFactors")
    trend: str
    tier: int
    risk_velocity: int = Field(alias="riskVelocity")
    trend_type: str = Field(alias="trendType")
    urgency_boost: int = Field(alias="urgencyBoost")
    prediction_10min: dict[str, float] = Field(alias="prediction10Min")
    triage_score: int = Field(alias="triageScore")

    model_config = {"populate_by_name": True, "by_alias": True}


@router.post("/risk/score", response_model=RiskScoreResponse)
def score_risk(payload: RiskScoreRequest) -> RiskScoreResponse:
    engine = RiskEngine(patient_context={"patientId": payload.patient_id, "previousRiskScore": payload.previous_risk_score})
    deviations = [
        DeviationScore(
            vital=item["vital"],
            current_value=float(item["currentValue"]),
            baseline_mean=float(item["baselineMean"]),
            baseline_std_dev=float(item["baselineStdDev"]),
            sigma_deviation=float(item["sigmaDeviation"]),
            is_critical=bool(item.get("isCritical", False)),
        )
        for item in payload.deviations
    ]
    result = engine.evaluate(deviations, correlation_flags=payload.correlation_flags)
    return RiskScoreResponse(
        score=result.score,
        contributingFactors=result.contributing_factors,
        trend=result.trend,
        tier=result.tier,
        riskVelocity=result.risk_velocity,
        trendType=result.trend_type,
        urgencyBoost=result.urgency_boost,
        prediction10Min=result.prediction_10min,
        triageScore=result.triage_score,
    )
