"""Device-level simulator facade for the 12 supported devices."""

from __future__ import annotations

from cares_sync_sim.devices.registry import DeviceRegistry


class DeviceSimulator:
    """Thin facade exposing the device registry for the simulator core."""

    def __init__(self) -> None:
        self.registry = DeviceRegistry()

    def list_supported_devices(self) -> list[dict[str, str]]:
        return [
            {"deviceType": definition.device_type.value, "category": definition.category}
            for definition in self.registry.list_devices()
        ]
