"""Clinical risk scoring with deviation, trend, and correlation intelligence."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Sequence

from cares_ai.engines.baseline.engine import DeviationScore


@dataclass(slots=True)
class RiskAssessmentResult:
    """Represents the crisis score and the clinical factors driving it."""

    score: int
    contributing_factors: list[str] = field(default_factory=list)
    trend: str = "stable"
    tier: int = 1
    deviation: dict[str, float] | None = None
    narrative: str | None = None
    confidence: float = 0.5
    risk_velocity: int = 0
    trend_type: str = "stable"
    urgency_boost: int = 0
    prediction_10min: dict[str, float] = field(default_factory=dict)
    triage_score: int = 0


class RiskEngine:
    """Translate physiologic deviation data into a 0-100 crisis score."""

    def __init__(self, patient_context: dict | None = None) -> None:
        self.patient_context = patient_context or {}

    def evaluate(
        self,
        deviations: Sequence[DeviationScore],
        correlation_flags: Sequence[str] | None = None,
        patient_context: dict | None = None,
    ) -> RiskAssessmentResult:
        effective_context = patient_context or self.patient_context or {}
        flags = [str(flag) for flag in (correlation_flags or [])]
        sigma_values = [abs(float(item.sigma_deviation)) for item in deviations]

        if not sigma_values:
            return RiskAssessmentResult(score=0, contributing_factors=[], trend="stable", tier=1)

        severity_score = sum(min(30.0, value * 10.0) for value in sigma_values)
        normalized_score = severity_score / max(1, len(sigma_values))
        correlation_bonus = len(flags) * 8
        critical_bonus = sum(1 for item in deviations if item.is_critical or abs(item.sigma_deviation) >= 4.0) * 15
        trend_bonus = self._trend_bonus(effective_context.get("trend"))
        threshold_bonus = sum(1 for item in deviations if abs(float(item.sigma_deviation)) >= 2.0) * 10

        score = min(100, int(round(normalized_score + correlation_bonus + critical_bonus + threshold_bonus + trend_bonus)))
        factors = self._select_contributing_factors(deviations)
        trend = self._determine_trend(sigma_values, flags, effective_context)
        tier = self._tier_for_score(score)
        deviation_payload = {
            item.vital: round(float(item.sigma_deviation), 2) for item in deviations if item.vital
        }
        narrative = self._build_narrative(deviation_payload, trend, factors)
        confidence = min(0.99, 0.55 + min(0.3, len(factors) * 0.08) + (0.1 if trend != "stable" else 0.0))
        previous_score = effective_context.get("previousRiskScore", effective_context.get("previous_risk_score"))
        risk_velocity = int(score - previous_score) if previous_score is not None else 0
        trend_type = self._trend_type(risk_velocity)
        urgency_boost = self._urgency_boost(risk_velocity, trend_type)
        prediction_10min = self._forecast_10min(score, risk_velocity, deviations)
        triage_score = int(round(score * 0.5 + max(0, risk_velocity) * 1.5 * 0.3 + prediction_10min["risk_forecast_10min"] * 0.2 + urgency_boost * 0.15))
        return RiskAssessmentResult(
            score=score,
            contributing_factors=factors,
            trend=trend,
            tier=tier,
            deviation=deviation_payload,
            narrative=narrative,
            confidence=round(confidence, 2),
            risk_velocity=risk_velocity,
            trend_type=trend_type,
            urgency_boost=urgency_boost,
            prediction_10min=prediction_10min,
            triage_score=triage_score,
        )

    @staticmethod
    def _tier_for_score(score: int) -> int:
        if score >= 86:
            return 5
        if score >= 66:
            return 4
        if score >= 41:
            return 3
        if score >= 21:
            return 2
        return 1

    @staticmethod
    def _select_contributing_factors(deviations: Sequence[DeviationScore]) -> list[str]:
        ranked = sorted(
            deviations,
            key=lambda item: abs(float(item.sigma_deviation)),
            reverse=True,
        )
        factors: list[str] = []
        for item in ranked:
            if abs(float(item.sigma_deviation)) >= 2.0:
                factors.append(item.vital)
            if len(factors) >= 4:
                break
        return factors

    @staticmethod
    def _determine_trend(
        sigma_values: Sequence[float],
        correlation_flags: Sequence[str],
        patient_context: dict | None,
    ) -> str:
        maximum = max(sigma_values, default=0.0)
        if maximum >= 3.5 or (correlation_flags and maximum >= 2.5):
            return "deteriorating"
        if maximum >= 1.2 or patient_context.get("trend") in {"declining", "deteriorating"}:
            return "deteriorating"
        if patient_context.get("trend") == "recovering":
            return "recovering"
        return "stable"

    @staticmethod
    def _trend_bonus(trend: str | None) -> int:
        if trend in {"declining", "deteriorating"}:
            return 15
        if trend == "recovering":
            return -5
        return 0

    @staticmethod
    def _build_narrative(deviation_payload: dict[str, float], trend: str, factors: Sequence[str]) -> str:
        primary = max(deviation_payload.items(), key=lambda item: abs(item[1]), default=("vital", 0.0))[0]
        risk_reason = ", ".join(factors) if factors else "multi-vital change"
        return (
            f"Patient shows {primary} deviation with {trend} trend and clinical concern in {risk_reason}."
        )

    @staticmethod
    def _trend_type(risk_velocity: int) -> str:
        if risk_velocity >= 15:
            return "critical_spike"
        if risk_velocity >= 5:
            return "worsening"
        if risk_velocity <= -5:
            return "recovering"
        return "stable"

    @staticmethod
    def _urgency_boost(risk_velocity: int, trend_type: str) -> int:
        if trend_type == "critical_spike":
            return 100
        if trend_type == "worsening":
            return max(0, min(100, 45 + risk_velocity * 3))
        if trend_type == "recovering":
            return 0
        return max(0, min(100, risk_velocity * 2))

    @staticmethod
    def _forecast_10min(score: int, risk_velocity: int, deviations: Sequence[DeviationScore]) -> dict[str, float]:
        by_vital = {item.vital: item for item in deviations}
        spo2 = by_vital.get("spo2")
        hr = by_vital.get("heartRate") or by_vital.get("heart_rate")
        predicted_spo2 = 96.0
        predicted_hr = 82.0
        if spo2:
            current_spo2 = float(getattr(spo2, "current_value", predicted_spo2))
            predicted_spo2 = current_spo2 - max(0, risk_velocity) * 0.12 - max(0.0, -float(spo2.sigma_deviation)) * 0.4
        if hr:
            current_hr = float(getattr(hr, "current_value", predicted_hr))
            predicted_hr = current_hr + max(0, risk_velocity) * 0.4 + max(0.0, float(hr.sigma_deviation)) * 1.5
        return {
            "predicted_spo2_10min": round(max(70.0, min(100.0, predicted_spo2)), 1),
            "predicted_hr_10min": round(max(45.0, min(170.0, predicted_hr)), 1),
            "risk_forecast_10min": round(max(0.0, min(100.0, score + risk_velocity * 0.9)), 1),
            "confidence": round(max(0.45, min(0.94, 0.58 + abs(risk_velocity) / 85 + len(deviations) * 0.03)), 2),
        }
