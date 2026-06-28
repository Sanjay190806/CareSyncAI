"""Tests for the crisis probability scoring engine."""

from cares_ai.engines.baseline.engine import DeviationScore
from cares_ai.engines.risk.engine import RiskEngine, RiskAssessmentResult


def make_score(vital: str, current: float, baseline_mean: float, baseline_std: float) -> DeviationScore:
    return DeviationScore(
        vital=vital,
        current_value=current,
        baseline_mean=baseline_mean,
        baseline_std_dev=baseline_std,
        sigma_deviation=(current - baseline_mean) / baseline_std,
        is_critical=abs((current - baseline_mean) / baseline_std) >= 4.0,
    )


def test_low_deviations_produce_low_score() -> None:
    engine = RiskEngine()
    deviations = [
        make_score("spo2", 96.0, 95.0, 1.0),
        make_score("heart_rate", 78.0, 80.0, 5.0),
        make_score("bp_sys", 118.0, 120.0, 8.0),
    ]

    result = engine.evaluate(deviations)

    assert isinstance(result, RiskAssessmentResult)
    assert result.score < 25
    assert result.trend == "stable"


def test_severe_clinical_deviation_increases_score() -> None:
    engine = RiskEngine()
    deviations = [
        make_score("spo2", 82.0, 89.0, 1.2),
        make_score("heart_rate", 124.0, 88.0, 8.0),
        make_score("bp_sys", 80.0, 120.0, 10.0),
        make_score("respiratory_rate", 8.0, 16.0, 2.0),
        make_score("etco2", 58.0, 40.0, 5.0),
    ]

    result = engine.evaluate(deviations, correlation_flags=["SpO2_Decrease_HR_Increase", "Respiratory_Depression_EtCO2_RR"])

    assert result.score >= 75
    assert "spo2" in result.contributing_factors
    assert "respiratory_rate" in result.contributing_factors
    assert result.trend == "deteriorating"
