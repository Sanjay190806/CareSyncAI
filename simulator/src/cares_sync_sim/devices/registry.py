"""Registry and metadata for the 12 IoMT device types per master spec."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class DeviceType(str, Enum):
    # Bedside
    PULSE_OXIMETER = "pulse_oximeter"
    ECG_MONITOR = "ecg_monitor"
    NIBP_CUFF = "nibp_cuff"
    TEMPERATURE_PROBE = "temperature_probe"
    # Wearables
    BIOSENSOR_PATCH = "biosensor_patch"
    SMART_WRISTBAND = "smart_wristband"
    FALL_DETECTION_BELT = "fall_detection_belt"
    SMART_IV_PATCH = "smart_iv_patch"
    # High Acuity
    VENTILATOR = "ventilator"
    CAPNOGRAPH = "capnograph"
    GLUCOMETER = "glucometer"
    INFUSION_PUMP = "infusion_pump"


DEVICE_CATEGORIES = {
    "bedside": [
        DeviceType.PULSE_OXIMETER,
        DeviceType.ECG_MONITOR,
        DeviceType.NIBP_CUFF,
        DeviceType.TEMPERATURE_PROBE,
    ],
    "wearables": [
        DeviceType.BIOSENSOR_PATCH,
        DeviceType.SMART_WRISTBAND,
        DeviceType.FALL_DETECTION_BELT,
        DeviceType.SMART_IV_PATCH,
    ],
    "high_acuity": [
        DeviceType.VENTILATOR,
        DeviceType.CAPNOGRAPH,
        DeviceType.GLUCOMETER,
        DeviceType.INFUSION_PUMP,
    ],
}


@dataclass(slots=True)
class DeviceDefinition:
    device_type: DeviceType
    category: str
    description: str


class DeviceRegistry:
    """Simple registry that exposes all supported device definitions."""

    def __init__(self) -> None:
        self._definitions = {
            DeviceType.PULSE_OXIMETER: DeviceDefinition(
                DeviceType.PULSE_OXIMETER, "bedside", "Pulse oximeter for SpO2 and pulse trend"
            ),
            DeviceType.ECG_MONITOR: DeviceDefinition(DeviceType.ECG_MONITOR, "bedside", "ECG monitor for rhythm and rate"),
            DeviceType.NIBP_CUFF: DeviceDefinition(DeviceType.NIBP_CUFF, "bedside", "Non-invasive blood pressure monitor"),
            DeviceType.TEMPERATURE_PROBE: DeviceDefinition(DeviceType.TEMPERATURE_PROBE, "bedside", "Temperature monitoring probe"),
            DeviceType.BIOSENSOR_PATCH: DeviceDefinition(DeviceType.BIOSENSOR_PATCH, "wearables", "Adhesive biosensor patch"),
            DeviceType.SMART_WRISTBAND: DeviceDefinition(DeviceType.SMART_WRISTBAND, "wearables", "Continuous smart wristband"),
            DeviceType.FALL_DETECTION_BELT: DeviceDefinition(DeviceType.FALL_DETECTION_BELT, "wearables", "Fall detection belt"),
            DeviceType.SMART_IV_PATCH: DeviceDefinition(DeviceType.SMART_IV_PATCH, "wearables", "Smart IV patch"),
            DeviceType.VENTILATOR: DeviceDefinition(DeviceType.VENTILATOR, "high_acuity", "Ventilator for respiratory support"),
            DeviceType.CAPNOGRAPH: DeviceDefinition(DeviceType.CAPNOGRAPH, "high_acuity", "Capnograph for EtCO2 monitoring"),
            DeviceType.GLUCOMETER: DeviceDefinition(DeviceType.GLUCOMETER, "high_acuity", "Glucose monitoring device"),
            DeviceType.INFUSION_PUMP: DeviceDefinition(DeviceType.INFUSION_PUMP, "high_acuity", "Infusion pump"),
        }

    def list_devices(self) -> list[DeviceDefinition]:
        return list(self._definitions.values())

    def get(self, device_type: DeviceType | str) -> DeviceDefinition:
        normalized = device_type if isinstance(device_type, DeviceType) else DeviceType(device_type)
        return self._definitions[normalized]
