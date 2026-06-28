"""Patient-data simulation facade for Phase 2."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from cares_sync_sim.correlation.engine import CorrelationEngine
from cares_sync_sim.devices.registry import DeviceRegistry, DeviceType
from cares_sync_sim.patients.state import PatientRecord, PatientSimulator
from cares_sync_sim.scenarios.patient_7_crisis import build_patient_7_sequence


@dataclass(slots=True)
class SimulatorConfig:
    patient_id: str
    patient_name: str
    profile_type: str = "Healthy"
    room_number: str = "101"


class PatientDataSimulator:
    """High-level simulator that coordinates patient state and scenario generation."""

    def __init__(self, config: SimulatorConfig | None = None) -> None:
        self.config = config or SimulatorConfig(patient_id="patient-001", patient_name="Demo Patient")
        self.device_registry = DeviceRegistry()
        self.correlation = CorrelationEngine()

    def build_patient_record(self) -> PatientRecord:
        return PatientRecord(
            id=self.config.patient_id,
            hospital_id=f"HOSP-{self.config.patient_id}",
            name=self.config.patient_name,
            age=68,
            gender="Female",
            room_number=self.config.room_number,
            diagnoses=["COPD"],
            medications=["Albuterol"],
            allergies=["Penicillin"],
            risk_category="Moderate",
            profile_type=self.config.profile_type,
        )

    def create_patient_simulator(self) -> PatientSimulator:
        return PatientSimulator.from_record(self.build_patient_record())

    def available_devices(self) -> list[dict[str, Any]]:
        return [
            {"deviceType": device.device_type.value, "category": device.category, "description": device.description}
            for device in self.device_registry.list_devices()
        ]

    def get_patient_7_sequence(self) -> list[dict[str, Any]]:
        return build_patient_7_sequence()

    def get_device(self, device_type: str) -> DeviceType:
        return DeviceType(device_type)
