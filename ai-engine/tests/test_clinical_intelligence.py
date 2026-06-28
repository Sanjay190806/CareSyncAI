"""Tests for the clinical intelligence layer."""

from cares_ai.engines.baseline.engine import BaselineEngine
from cares_ai.engines.risk.engine import RiskEngine


def test_baseline_deviation_is_patient_specific() -> None:
    engine = BaselineEngine(window_minutes=30)
    patient_id = "patient-1"
    engine.seed_baseline(patient_id, "spo2", mean=89.0, std_dev=1.2, sample_count=20)
    result = engine.process_reading(patient_id, None, {"spo2": 83.0, "heart_rate": 90.0, "bp_sys": 120.0, "bp_dia": 80.0, "respiratory_rate": 16, "temperature": 98.4, "glucose": 100.0, "etco2": 38.0})
    score = result.deviations[0]
    assert score.sigma_deviation < -4.0


def test_risk_engine_uses_trend_and_factors() -> None:
    engine = RiskEngine()
    result = engine.evaluate(
        [
            type("Deviation", (), {"sigma_deviation": -2.3, "vital": "spo2", "is_critical": False})(),
            type("Deviation", (), {"sigma_deviation": 2.1, "vital": "heart_rate", "is_critical": False})(),
        ],
        correlation_flags=["SpO2_Decrease_HR_Increase"],
        patient_context={"trend": "declining"},
    )
    assert result.score >= 35
    assert "spo2" in result.contributing_factors
    assert result.trend == "deteriorating"


def test_narrative_mentions_deviation_and_risk() -> None:
    engine = RiskEngine()
    result = engine.evaluate(
        [
            type("Deviation", (), {"sigma_deviation": -2.6, "vital": "spo2", "is_critical": False})(),
            type("Deviation", (), {"sigma_deviation": 2.2, "vital": "heart_rate", "is_critical": False})(),
        ],
        correlation_flags=["SpO2_Decrease_HR_Increase"],
        patient_context={"trend": "declining"},
    )
    assert result.score >= 35
    assert result.contributing_factors
