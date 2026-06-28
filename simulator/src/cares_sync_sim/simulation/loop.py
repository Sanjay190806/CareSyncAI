"""Async simulation loop — generates correlated vitals every 2 seconds."""

from __future__ import annotations

import asyncio
import logging

from cares_sync_sim.patients.state import PatientSimulator, patient_record_from_api
from cares_sync_sim.publishers.vitals_publisher import VitalsPublisher

logger = logging.getLogger(__name__)


class SimulationLoop:
    def __init__(self, publisher: VitalsPublisher, interval_ms: int = 2000):
        self.publisher = publisher
        self.interval_sec = interval_ms / 1000.0
        self._patients: list[PatientSimulator] = []
        self._running = False

    async def load_patients(self) -> None:
        raw = await self.publisher.fetch_patients()
        self._patients = [PatientSimulator.from_record(patient_record_from_api(p)) for p in raw]
        logger.info("Loaded %d patients for simulation", len(self._patients))

    async def tick(self) -> int:
        if not self._patients:
            await self.load_patients()

        published = 0
        for patient in self._patients:
            reading = patient.generate_reading()
            if await self.publisher.publish(reading):
                published += 1
        return published

    async def run(self) -> None:
        self._running = True
        await self.load_patients()
        logger.info("Starting simulation loop (interval=%.1fs)", self.interval_sec)

        while self._running:
            count = await self.tick()
            logger.debug("Published %d vital readings", count)
            await asyncio.sleep(self.interval_sec)

    def stop(self) -> None:
        self._running = False
