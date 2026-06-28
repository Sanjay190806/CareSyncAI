"""
Baseline Personalisation Engine.

Every patient receives a dynamic baseline profile using rolling mean and
standard deviation over a 30-minute window.

deviation_score = (current_value - baseline_mean) / baseline_std_dev
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Literal

from cares_ai.engines.baseline.window import RollingWindow

VitalKey = Literal[
    "spo2", "heart_rate", "bp_sys", "bp_dia",
    "respiratory_rate", "temperature", "glucose", "etco2",
]

TRACKED_VITALS: list[VitalKey] = [
    "spo2", "heart_rate", "bp_sys", "bp_dia",
    "respiratory_rate", "temperature", "glucose", "etco2",
]

CRITICAL_SIGMA_THRESHOLD = 4.0


@dataclass
class VitalStats:
    mean: float
    std_dev: float
    sample_count: int


@dataclass
class DeviationScore:
    vital: str
    current_value: float
    baseline_mean: float
    baseline_std_dev: float
    sigma_deviation: float
    is_critical: bool


@dataclass
class BaselineProfile:
    patient_id: str
    spo2: VitalStats
    heart_rate: VitalStats
    bp_sys: VitalStats
    bp_dia: VitalStats
    respiratory_rate: VitalStats
    temperature: VitalStats
    glucose: VitalStats
    etco2: VitalStats
    window_minutes: int
    updated_at: datetime


@dataclass
class BaselineUpdateResult:
    patient_id: str
    baseline: BaselineProfile
    deviations: list[DeviationScore]


@dataclass
class PatientBaselineStore:
    patient_id: str
    window_minutes: int = 30
    windows: dict[VitalKey, RollingWindow] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.windows:
            self.windows = {
                vital: RollingWindow(window_minutes=self.window_minutes)
                for vital in TRACKED_VITALS
            }

    def update(self, timestamp: datetime, readings: dict[VitalKey, float]) -> BaselineProfile:
        for vital, value in readings.items():
            self.windows[vital].add(timestamp, value)
        return self.build_profile(timestamp)

    def build_profile(self, now: datetime | None = None) -> BaselineProfile:
        now = now or datetime.now(timezone.utc)

        def stats(vital: VitalKey) -> VitalStats:
            mean, std = self.windows[vital].stats()
            return VitalStats(
                mean=mean if mean is not None else 0.0,
                std_dev=std if std is not None else RollingWindow.min_std,
                sample_count=self.windows[vital].sample_count,
            )

        return BaselineProfile(
            patient_id=self.patient_id,
            spo2=stats("spo2"),
            heart_rate=stats("heart_rate"),
            bp_sys=stats("bp_sys"),
            bp_dia=stats("bp_dia"),
            respiratory_rate=stats("respiratory_rate"),
            temperature=stats("temperature"),
            glucose=stats("glucose"),
            etco2=stats("etco2"),
            window_minutes=self.window_minutes,
            updated_at=now,
        )


class BaselineEngine:
    """Manages per-patient rolling baselines and deviation scoring."""

    def __init__(self, window_minutes: int = 30):
        self.window_minutes = window_minutes
        self._stores: dict[str, PatientBaselineStore] = {}

    def get_store(self, patient_id: str) -> PatientBaselineStore:
        if patient_id not in self._stores:
            self._stores[patient_id] = PatientBaselineStore(
                patient_id=patient_id,
                window_minutes=self.window_minutes,
            )
        return self._stores[patient_id]

    @staticmethod
    def compute_deviation(
        current: float,
        mean: float,
        std_dev: float,
    ) -> float:
        if std_dev <= 0:
            std_dev = RollingWindow.min_std
        return (current - mean) / std_dev

    @staticmethod
    def is_critical(sigma: float) -> bool:
        return abs(sigma) >= CRITICAL_SIGMA_THRESHOLD

    def score_deviations(
        self,
        readings: dict[VitalKey, float],
        profile: BaselineProfile,
    ) -> list[DeviationScore]:
        vital_map: dict[VitalKey, VitalStats] = {
            "spo2": profile.spo2,
            "heart_rate": profile.heart_rate,
            "bp_sys": profile.bp_sys,
            "bp_dia": profile.bp_dia,
            "respiratory_rate": profile.respiratory_rate,
            "temperature": profile.temperature,
            "glucose": profile.glucose,
            "etco2": profile.etco2,
        }

        scores: list[DeviationScore] = []
        for vital, current in readings.items():
            stats = vital_map[vital]
            if stats.sample_count == 0:
                continue
            sigma = self.compute_deviation(current, stats.mean, stats.std_dev)
            scores.append(
                DeviationScore(
                    vital=vital,
                    current_value=current,
                    baseline_mean=stats.mean,
                    baseline_std_dev=stats.std_dev,
                    sigma_deviation=round(sigma, 2),
                    is_critical=self.is_critical(sigma),
                )
            )
        return scores

    def process_reading(
        self,
        patient_id: str,
        timestamp: datetime | None,
        readings: dict[VitalKey, float],
    ) -> BaselineUpdateResult:
        effective_timestamp = timestamp or datetime.now(timezone.utc)
        store = self.get_store(patient_id)
        baseline_profile = store.build_profile(effective_timestamp)
        deviations = self.score_deviations(readings, baseline_profile)
        updated_profile = store.update(effective_timestamp, readings)
        return BaselineUpdateResult(
            patient_id=patient_id,
            baseline=updated_profile,
            deviations=deviations,
        )

    def seed_baseline(
        self,
        patient_id: str,
        vital: VitalKey,
        mean: float,
        std_dev: float,
        sample_count: int = 30,
    ) -> None:
        """Pre-populate baseline for testing with a deterministic mean/std profile."""
        if sample_count <= 1:
            sample_count = 2

        store = self.get_store(patient_id)
        window = store.windows[vital]
        now = datetime.now(timezone.utc)

        base_values = [((i % 7) - 3) / 3.0 for i in range(sample_count)]
        sample_mean = sum(base_values) / len(base_values)
        centered = [value - sample_mean for value in base_values]
        sample_var = sum(value * value for value in centered) / max(1, len(centered) - 1)
        if sample_var <= 0:
            sample_var = 1.0
        scaled = [(value / sample_var ** 0.5) * std_dev for value in centered]
        for i, value in enumerate(scaled):
            adjusted = value + mean
            ts = now - timedelta(minutes=sample_count - i)
            window.add(ts, adjusted)

    def evaluate_spo2(
        self,
        patient_id: str,
        spo2: float,
        profile: BaselineProfile | None = None,
    ) -> DeviationScore:
        profile = profile or self.get_store(patient_id).build_profile()
        sigma = self.compute_deviation(spo2, profile.spo2.mean, profile.spo2.std_dev)
        return DeviationScore(
            vital="spo2",
            current_value=spo2,
            baseline_mean=profile.spo2.mean,
            baseline_std_dev=profile.spo2.std_dev,
            sigma_deviation=round(sigma, 2),
            is_critical=self.is_critical(sigma),
        )


# Singleton used by API layer
baseline_engine = BaselineEngine(window_minutes=30)
