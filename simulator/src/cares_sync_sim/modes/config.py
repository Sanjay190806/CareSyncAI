"""Operation modes — each changes devices, refresh frequency, alert behaviour."""

from enum import Enum


class OperationMode(str, Enum):
    ICU = "ICU"
    GENERAL_WARD = "General Ward"
    REMOTE_PATIENT_MONITORING = "Remote Patient Monitoring"
    AMBULANCE = "Ambulance"


MODE_CONFIG = {
    OperationMode.ICU: {
        "refresh_interval_ms": 500,
        "device_categories": ["bedside", "high_acuity"],
    },
    OperationMode.GENERAL_WARD: {
        "refresh_interval_ms": 2000,
        "device_categories": ["bedside", "wearables"],
    },
    OperationMode.REMOTE_PATIENT_MONITORING: {
        "refresh_interval_ms": 5000,
        "device_categories": ["wearables"],
    },
    OperationMode.AMBULANCE: {
        "refresh_interval_ms": 1000,
        "device_categories": ["bedside", "wearables"],
    },
}
