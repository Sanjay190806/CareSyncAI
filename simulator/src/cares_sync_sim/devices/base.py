"""Base abstractions for the 12 medical devices in the simulator."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(slots=True)
class DeviceReading:
    device_type: str
    value: float
    unit: str
    metadata: dict[str, Any] | None = None


class DeviceSimulator:
    """Base class for a single simulated medical device."""

    def __init__(self, device_type: str, *, name: str | None = None) -> None:
        self.device_type = device_type
        self.name = name or device_type

    def emit(self, *, baseline: float, severity: float = 0.0) -> DeviceReading:
        raise NotImplementedError
