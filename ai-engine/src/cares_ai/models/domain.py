"""Pydantic models aligned with master spec domain types."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class VitalStats(BaseModel):
    mean: float
    std_dev: float = Field(alias="stdDev")

    model_config = {"populate_by_name": True}


class VitalReading(BaseModel):
    timestamp: datetime
    spo2: float = Field(ge=0, le=100)
    heart_rate: int = Field(ge=0, le=300, alias="heartRate")
    bp_sys: int = Field(ge=0, le=300, alias="bpSys")
    bp_dia: int = Field(ge=0, le=200, alias="bpDia")
    respiratory_rate: int = Field(ge=0, le=60, alias="respiratoryRate")
    temperature: float = Field(ge=90, le=110)
    etco2: float | None = None
    glucose: float | None = None

    model_config = {"populate_by_name": True}


class BaselineProfile(BaseModel):
    patient_id: str = Field(alias="patientId")
    spo2: VitalStats
    heart_rate: VitalStats = Field(alias="heartRate")
    blood_pressure: VitalStats = Field(alias="bloodPressure")
    respiratory_rate: VitalStats = Field(alias="respiratoryRate")
    temperature: VitalStats
    established_at: datetime = Field(alias="establishedAt")
    window_minutes: int = Field(default=30, alias="windowMinutes")

    model_config = {"populate_by_name": True}


class DeviationScore(BaseModel):
    vital: str
    current_value: float = Field(alias="currentValue")
    baseline_mean: float = Field(alias="baselineMean")
    baseline_std_dev: float = Field(alias="baselineStdDev")
    sigma_deviation: float = Field(alias="sigmaDeviation")

    model_config = {"populate_by_name": True}


AlertTier = Literal[1, 2, 3, 4, 5]
TrendDirection = Literal["improving", "stable", "deteriorating"]


class RiskAssessment(BaseModel):
    patient_id: str = Field(alias="patientId")
    crisis_probability_score: int = Field(ge=0, le=100, alias="crisisProbabilityScore")
    tier: AlertTier
    deviation_scores: list[DeviationScore] = Field(alias="deviationScores")
    trend_direction: TrendDirection = Field(alias="trendDirection")
    timestamp: datetime

    model_config = {"populate_by_name": True}


class ClinicalNarrative(BaseModel):
    patient_id: str = Field(alias="patientId")
    narrative: str
    tier: AlertTier
    suggested_action: str | None = Field(default=None, alias="suggestedAction")
    generated_at: datetime = Field(alias="generatedAt")

    model_config = {"populate_by_name": True}
