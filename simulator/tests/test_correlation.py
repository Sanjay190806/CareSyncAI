"""Tests for physiological correlation engine."""

import pytest

from cares_sync_sim.correlation.engine import CorrelationEngine, CorrelationPattern


@pytest.fixture
def engine() -> CorrelationEngine:
    return CorrelationEngine()


class TestSpO2HRCompensation:
    def test_low_spo2_increases_heart_rate(self, engine: CorrelationEngine):
        result = engine.apply(
            spo2=85.0,
            heart_rate=75.0,
            bp_sys=120.0,
            bp_dia=80.0,
            respiratory_rate=16.0,
            etco2=38.0,
            blood_glucose=100.0,
        )
        assert result.heart_rate > 75.0
        assert CorrelationPattern.SPO2_HR_COMPENSATION in result.active_patterns


class TestShockPattern:
    def test_low_bp_high_hr_triggers_shock(self, engine: CorrelationEngine):
        result = engine.apply(
            spo2=96.0,
            heart_rate=100.0,
            bp_sys=88.0,
            bp_dia=55.0,
            respiratory_rate=18.0,
            etco2=38.0,
            blood_glucose=100.0,
        )
        assert CorrelationPattern.SHOCK_PATTERN in result.active_patterns
        assert result.heart_rate > 100.0


class TestRespiratoryDepression:
    def test_high_etco2_low_rr(self, engine: CorrelationEngine):
        result = engine.apply(
            spo2=94.0,
            heart_rate=80.0,
            bp_sys=120.0,
            bp_dia=75.0,
            respiratory_rate=10.0,
            etco2=50.0,
            blood_glucose=110.0,
        )
        assert CorrelationPattern.RESPIRATORY_DEPRESSION in result.active_patterns
        assert result.respiratory_rate < 10.0


class TestSepsisRisk:
    def test_high_glucose_high_hr(self, engine: CorrelationEngine):
        result = engine.apply(
            spo2=97.0,
            heart_rate=90.0,
            bp_sys=110.0,
            bp_dia=70.0,
            respiratory_rate=18.0,
            etco2=40.0,
            blood_glucose=220.0,
        )
        assert CorrelationPattern.SEPSIS_RISK in result.active_patterns
        assert result.heart_rate > 90.0


class TestHealthyVitalsNoPatterns:
    def test_normal_vitals_no_correlation(self, engine: CorrelationEngine):
        result = engine.apply(
            spo2=98.0,
            heart_rate=72.0,
            bp_sys=118.0,
            bp_dia=76.0,
            respiratory_rate=14.0,
            etco2=38.0,
            blood_glucose=95.0,
        )
        assert result.active_patterns == []
