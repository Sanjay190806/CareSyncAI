"""Tests for Baseline Personalisation Engine."""

from datetime import datetime, timedelta, timezone

import pytest

from cares_ai.engines.baseline.engine import BaselineEngine, CRITICAL_SIGMA_THRESHOLD
from cares_ai.engines.baseline.window import RollingWindow


PATIENT_ID = "a0000001-0000-4000-8000-000000000007"  # P-007 COPD


@pytest.fixture
def engine() -> BaselineEngine:
    return BaselineEngine(window_minutes=30)


@pytest.fixture
def copd_engine() -> BaselineEngine:
    eng = BaselineEngine(window_minutes=30)
    eng.seed_baseline(PATIENT_ID, "spo2", mean=89.0, std_dev=1.2, sample_count=60)
    return eng


class TestRollingWindow:
    def test_mean_and_std(self):
        window = RollingWindow(window_minutes=30)
        now = datetime.now(timezone.utc)
        for i in range(10):
            window.add(now - timedelta(minutes=i), 89.0 + (i % 2) * 0.5)
        mean, std = window.stats()
        assert mean is not None
        assert 88.5 <= mean <= 89.5
        assert std is not None
        assert std >= RollingWindow.min_std

    def test_evicts_old_samples(self):
        window = RollingWindow(window_minutes=30)
        now = datetime.now(timezone.utc)
        window.add(now - timedelta(minutes=45), 80.0)
        window.add(now - timedelta(minutes=5), 89.0)
        assert window.sample_count == 1
        assert window.mean() == 89.0


class TestDeviationScoring:
    def test_deviation_formula(self, engine: BaselineEngine):
        sigma = engine.compute_deviation(88.0, 89.0, 1.2)
        assert round(sigma, 2) == -0.83

    def test_critical_threshold(self, engine: BaselineEngine):
        assert engine.is_critical(-5.0) is True
        assert engine.is_critical(-0.83) is False
        assert abs(-0.83) < CRITICAL_SIGMA_THRESHOLD


class TestCOPDPatient:
    """COPD baseline SpO₂ = 89%, σ = 1.2 per master spec."""

    def test_spo2_88_no_critical_alert(self, copd_engine: BaselineEngine):
        profile = copd_engine.get_store(PATIENT_ID).build_profile()
        score = copd_engine.evaluate_spo2(PATIENT_ID, 88.0, profile)
        assert score.baseline_mean == pytest.approx(89.0, abs=0.5)
        assert score.sigma_deviation == pytest.approx(-0.83, abs=0.2)
        assert score.is_critical is False

    def test_spo2_83_critical_alert(self, copd_engine: BaselineEngine):
        profile = copd_engine.get_store(PATIENT_ID).build_profile()
        score = copd_engine.evaluate_spo2(PATIENT_ID, 83.0, profile)
        assert score.sigma_deviation == pytest.approx(-5.0, abs=0.3)
        assert score.is_critical is True

    def test_process_reading_updates_baseline(self, engine: BaselineEngine):
        now = datetime.now(timezone.utc)
        readings = {
            "spo2": 89.0,
            "heart_rate": 88.0,
            "bp_sys": 128.0,
            "bp_dia": 78.0,
            "respiratory_rate": 20.0,
            "temperature": 98.4,
            "glucose": 105.0,
            "etco2": 42.0,
        }
        for i in range(20):
            ts = now - timedelta(minutes=20 - i)
            result = engine.process_reading(PATIENT_ID, ts, readings)
        assert result.baseline.spo2.sample_count == 20
        assert result.baseline.spo2.mean == pytest.approx(89.0, abs=0.1)
        assert len(result.deviations) == 8


class TestTrackedVitals:
    def test_all_seven_vitals_tracked(self, engine: BaselineEngine):
        now = datetime.now(timezone.utc)
        readings = {
            "spo2": 97.0,
            "heart_rate": 72.0,
            "bp_sys": 120.0,
            "bp_dia": 80.0,
            "respiratory_rate": 16.0,
            "temperature": 98.2,
            "glucose": 95.0,
            "etco2": 38.0,
        }
        result = engine.process_reading("test-patient", now, readings)
        assert result.baseline.heart_rate.sample_count == 1
        assert result.baseline.glucose.sample_count == 1
        assert result.baseline.etco2.sample_count == 1
