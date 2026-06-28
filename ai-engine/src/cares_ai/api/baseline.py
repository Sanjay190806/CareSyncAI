from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from cares_ai.engines.baseline.engine import (
    TRACKED_VITALS,
    VitalKey,
    baseline_engine,
)

router = APIRouter()


class VitalInput(BaseModel):
    patient_id: str = Field(alias="patientId")
    timestamp: datetime
    heart_rate: int = Field(alias="heartRate")
    spo2: float
    bp_sys: int = Field(alias="bpSys")
    bp_dia: int = Field(alias="bpDia")
    respiratory_rate: int = Field(alias="respiratoryRate")
    temperature: float
    etco2: float
    blood_glucose: float = Field(alias="bloodGlucose")

    model_config = {"populate_by_name": True}


class VitalStatsResponse(BaseModel):
    mean: float
    std_dev: float = Field(alias="stdDev")
    sample_count: int = Field(alias="sampleCount")

    model_config = {"populate_by_name": True, "by_alias": True}


class BaselineResponse(BaseModel):
    patient_id: str = Field(alias="patientId")
    spo2: VitalStatsResponse
    heart_rate: VitalStatsResponse = Field(alias="heartRate")
    bp_sys: VitalStatsResponse = Field(alias="bpSys")
    bp_dia: VitalStatsResponse = Field(alias="bpDia")
    respiratory_rate: VitalStatsResponse = Field(alias="respiratoryRate")
    temperature: VitalStatsResponse
    glucose: VitalStatsResponse
    etco2: VitalStatsResponse
    window_minutes: int = Field(alias="windowMinutes")
    updated_at: datetime = Field(alias="updatedAt")

    model_config = {"populate_by_name": True, "by_alias": True}


class DeviationResponse(BaseModel):
    vital: str
    current_value: float = Field(alias="currentValue")
    baseline_mean: float = Field(alias="baselineMean")
    baseline_std_dev: float = Field(alias="baselineStdDev")
    sigma_deviation: float = Field(alias="sigmaDeviation")
    is_critical: bool = Field(alias="isCritical")

    model_config = {"populate_by_name": True, "by_alias": True}


class BaselineUpdateResponse(BaseModel):
    patient_id: str = Field(alias="patientId")
    baseline: BaselineResponse
    deviations: list[DeviationResponse]

    model_config = {"populate_by_name": True, "by_alias": True}


def _stats_response(stats) -> VitalStatsResponse:
    return VitalStatsResponse(
        mean=round(stats.mean, 4),
        stdDev=round(stats.std_dev, 4),
        sampleCount=stats.sample_count,
    )


def _baseline_response(profile) -> BaselineResponse:
    return BaselineResponse(
        patientId=profile.patient_id,
        spo2=_stats_response(profile.spo2),
        heartRate=_stats_response(profile.heart_rate),
        bpSys=_stats_response(profile.bp_sys),
        bpDia=_stats_response(profile.bp_dia),
        respiratoryRate=_stats_response(profile.respiratory_rate),
        temperature=_stats_response(profile.temperature),
        glucose=_stats_response(profile.glucose),
        etco2=_stats_response(profile.etco2),
        windowMinutes=profile.window_minutes,
        updatedAt=profile.updated_at,
    )


def _readings_from_input(data: VitalInput) -> dict[VitalKey, float]:
    return {
        "spo2": data.spo2,
        "heart_rate": float(data.heart_rate),
        "bp_sys": float(data.bp_sys),
        "bp_dia": float(data.bp_dia),
        "respiratory_rate": float(data.respiratory_rate),
        "temperature": data.temperature,
        "glucose": data.blood_glucose,
        "etco2": data.etco2,
    }


@router.post("/baseline/update", response_model=BaselineUpdateResponse)
def update_baseline(data: VitalInput):
    readings = _readings_from_input(data)
    result = baseline_engine.process_reading(data.patient_id, data.timestamp, readings)
    return BaselineUpdateResponse(
        patientId=result.patient_id,
        baseline=_baseline_response(result.baseline),
        deviations=[
            DeviationResponse(
                vital=d.vital,
                currentValue=d.current_value,
                baselineMean=round(d.baseline_mean, 4),
                baselineStdDev=round(d.baseline_std_dev, 4),
                sigmaDeviation=d.sigma_deviation,
                isCritical=d.is_critical,
            )
            for d in result.deviations
        ],
    )


@router.get("/baseline/{patient_id}", response_model=BaselineResponse)
def get_baseline(patient_id: str):
    store = baseline_engine.get_store(patient_id)
    profile = store.build_profile()
    if all(
        getattr(profile, v if v != "glucose" else "glucose").sample_count == 0
        for v in TRACKED_VITALS
    ):
        raise HTTPException(status_code=404, detail="No baseline data for patient")
    return _baseline_response(profile)
