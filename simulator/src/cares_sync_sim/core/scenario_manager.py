"""Scenario orchestration helpers for the simulator."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class ScenarioDefinition:
    name: str
    description: str
    patient_id: str


class ScenarioManager:
    """Loads and exposes the built-in patient scenarios."""

    def __init__(self) -> None:
        self._scenarios = [
            ScenarioDefinition("Normal", "Stable physiological baseline", "patient-001"),
            ScenarioDefinition("COPD", "Chronic obstructive disease baseline", "patient-002"),
            ScenarioDefinition("Respiratory Failure", "Low oxygen and rising EtCO2", "patient-003"),
            ScenarioDefinition("Sepsis", "Elevated glucose with tachycardia", "patient-004"),
            ScenarioDefinition("Post Surgical", "Recovery-related instability", "patient-005"),
            ScenarioDefinition("Cardiac Event", "Hemodynamic compromise", "patient-006"),
        ]

    def list_scenarios(self) -> list[dict[str, Any]]:
        return [
            {"name": scenario.name, "description": scenario.description, "patientId": scenario.patient_id}
            for scenario in self._scenarios
        ]
