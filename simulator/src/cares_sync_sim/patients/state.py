"""Patient state and vital reading generation."""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime, timezone

from cares_sync_sim.correlation.engine import CorrelationEngine, CorrelationPattern
from cares_sync_sim.patients.archetypes import ArchetypeProfile, get_archetype


def compute_map(bp_sys: float, bp_dia: float) -> int:
    return round((bp_sys + 2 * bp_dia) / 3)


@dataclass
class PatientRecord:
    id: str
    hospital_id: str
    name: str
    age: int
    gender: str
    room_number: str
    diagnoses: list[str]
    medications: list[str]
    allergies: list[str]
    risk_category: str
    profile_type: str


@dataclass
class VitalSnapshot:
    patient_id: str
    timestamp: datetime
    heart_rate: int
    spo2: float
    bp_sys: int
    bp_dia: int
    bp_map: int
    respiratory_rate: int
    temperature: float
    ecg_rhythm: str
    etco2: float
    blood_glucose: float
    activity_level: str
    fall_detection_status: str
    iv_flow_status: str
    medication_compliance: float
    correlation_patterns: list[str] = field(default_factory=list)

    def to_payload(self) -> dict:
        return {
            "patientId": self.patient_id,
            "timestamp": self.timestamp.isoformat(),
            "heartRate": self.heart_rate,
            "spo2": round(self.spo2, 1),
            "bpSys": self.bp_sys,
            "bpDia": self.bp_dia,
            "bpMap": self.bp_map,
            "respiratoryRate": self.respiratory_rate,
            "temperature": round(self.temperature, 1),
            "ecgRhythm": self.ecg_rhythm,
            "etco2": round(self.etco2, 1),
            "bloodGlucose": round(self.blood_glucose, 1),
            "activityLevel": self.activity_level,
            "fallDetectionStatus": self.fall_detection_status,
            "ivFlowStatus": self.iv_flow_status,
            "medicationCompliance": round(self.medication_compliance, 1),
            "correlationPatterns": self.correlation_patterns,
        }


@dataclass
class PatientSimulator:
    record: PatientRecord
    archetype: ArchetypeProfile
    correlation: CorrelationEngine
    _spo2: float = 0.0
    _heart_rate: float = 0.0
    _bp_sys: float = 0.0
    _bp_dia: float = 0.0
    _respiratory_rate: float = 0.0
    _temperature: float = 0.0
    _etco2: float = 0.0
    _blood_glucose: float = 0.0
    _fall_status: str = "Normal"
    _iv_status: str = "Normal"

    @classmethod
    def from_record(cls, record: PatientRecord) -> PatientSimulator:
        archetype = get_archetype(record.profile_type)
        sim = cls(record=record, archetype=archetype, correlation=CorrelationEngine())
        sim._initialize_vitals()
        return sim

    def _initialize_vitals(self) -> None:
        a = self.archetype
        self._spo2 = self._sample(a.spo2)
        self._heart_rate = self._sample(a.heart_rate)
        self._bp_sys = self._sample(a.bp_sys)
        self._bp_dia = self._sample(a.bp_dia)
        self._respiratory_rate = self._sample(a.respiratory_rate)
        self._temperature = self._sample(a.temperature)
        self._etco2 = self._sample(a.etco2)
        self._blood_glucose = self._sample(a.blood_glucose)

    @staticmethod
    def _sample(rng) -> float:
        value = random.gauss(rng.mean, rng.std)
        return max(rng.min_val, min(rng.max_val, value))

    def _apply_drift(self, current: float, rng, scale: float = 0.15) -> float:
        delta = random.gauss(0, rng.std * scale)
        return max(rng.min_val, min(rng.max_val, current + delta))

    def generate_reading(self) -> VitalSnapshot:
        a = self.archetype

        self._spo2 = self._apply_drift(self._spo2, a.spo2)
        self._heart_rate = self._apply_drift(self._heart_rate, a.heart_rate)
        self._bp_sys = self._apply_drift(self._bp_sys, a.bp_sys)
        self._bp_dia = self._apply_drift(self._bp_dia, a.bp_dia)
        self._respiratory_rate = self._apply_drift(self._respiratory_rate, a.respiratory_rate)
        self._temperature = self._apply_drift(self._temperature, a.temperature)
        self._etco2 = self._apply_drift(self._etco2, a.etco2)
        self._blood_glucose = self._apply_drift(self._blood_glucose, a.blood_glucose)

        patterns = self.correlation.apply(
            spo2=self._spo2,
            heart_rate=self._heart_rate,
            bp_sys=self._bp_sys,
            bp_dia=self._bp_dia,
            respiratory_rate=self._respiratory_rate,
            etco2=self._etco2,
            blood_glucose=self._blood_glucose,
            temperature=self._temperature,
        )

        self._spo2 = patterns.spo2
        self._heart_rate = patterns.heart_rate
        self._bp_sys = patterns.bp_sys
        self._bp_dia = patterns.bp_dia
        self._respiratory_rate = patterns.respiratory_rate
        self._etco2 = patterns.etco2
        self._temperature = patterns.temperature
        self._blood_glucose = patterns.blood_glucose

        if self.record.profile_type == "ICU Critical" and random.random() < 0.02:
            self._fall_status = "Inactive"
        else:
            self._fall_status = "Normal"

        if self.record.profile_type in ("ICU Critical", "Post Surgery") and random.random() < 0.01:
            self._iv_status = random.choice(["Occlusion", "Stopped"])
        else:
            self._iv_status = "Normal"

        compliance = max(
            50.0,
            min(100.0, a.medication_compliance + random.gauss(0, 2)),
        )

        return VitalSnapshot(
            patient_id=self.record.id,
            timestamp=datetime.now(timezone.utc),
            heart_rate=round(self._heart_rate),
            spo2=round(self._spo2, 1),
            bp_sys=round(self._bp_sys),
            bp_dia=round(self._bp_dia),
            bp_map=compute_map(self._bp_sys, self._bp_dia),
            respiratory_rate=round(self._respiratory_rate),
            temperature=round(self._temperature, 1),
            ecg_rhythm=a.ecg_rhythm,
            etco2=round(self._etco2, 1),
            blood_glucose=round(self._blood_glucose, 1),
            activity_level=a.activity_level,
            fall_detection_status=self._fall_status,
            iv_flow_status=self._iv_status,
            medication_compliance=compliance,
            correlation_patterns=[p.value for p in patterns.active_patterns],
        )


def patient_record_from_api(data: dict) -> PatientRecord:
    return PatientRecord(
        id=data["id"],
        hospital_id=data["hospitalId"],
        name=data["name"],
        age=data["age"],
        gender=data["gender"],
        room_number=data["roomNumber"],
        diagnoses=data.get("diagnoses", []),
        medications=data.get("medications", []),
        allergies=data.get("allergies", []),
        risk_category=data["riskCategory"],
        profile_type=data["profileType"],
    )
