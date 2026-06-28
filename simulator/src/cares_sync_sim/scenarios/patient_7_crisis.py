"""Patient 7 respiratory crisis scenario for the demo sequence."""

from __future__ import annotations

from typing import Any


def build_patient_7_sequence() -> list[dict[str, Any]]:
    """Return a deterministic escalation sequence matching the requested signature."""

    return [
        {
            "step": 1,
            "riskScore": 32,
            "tier": 2,
            "spo2": 90.0,
            "etco2": 44.0,
            "respiratoryRate": 18,
            "heartRate": 96,
            "note": "Early respiratory compromise",
        },
        {
            "step": 2,
            "riskScore": 58,
            "tier": 3,
            "spo2": 86.0,
            "etco2": 49.0,
            "respiratoryRate": 14,
            "heartRate": 110,
            "note": "Oxygenation worsens and EtCO2 rises",
        },
        {
            "step": 3,
            "riskScore": 79,
            "tier": 4,
            "spo2": 82.0,
            "etco2": 56.0,
            "respiratoryRate": 10,
            "heartRate": 124,
            "note": "Respiratory depression and escalating tachycardia",
        },
        {
            "step": 4,
            "riskScore": 91,
            "tier": 5,
            "spo2": 78.0,
            "etco2": 62.0,
            "respiratoryRate": 8,
            "heartRate": 140,
            "note": "Critical respiratory failure",
        },
    ]
