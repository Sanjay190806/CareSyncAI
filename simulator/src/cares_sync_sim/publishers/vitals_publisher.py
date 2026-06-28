"""Publish vital readings to backend REST API."""

from __future__ import annotations

import logging

import httpx

from cares_sync_sim.patients.state import VitalSnapshot

logger = logging.getLogger(__name__)


class VitalsPublisher:
    def __init__(self, backend_url: str, timeout: float = 10.0):
        self.backend_url = backend_url.rstrip("/")
        self.timeout = timeout

    async def publish(self, reading: VitalSnapshot) -> bool:
        url = f"{self.backend_url}/api/vitals"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                response = await client.post(url, json=reading.to_payload())
                response.raise_for_status()
                return True
            except httpx.HTTPError as exc:
                logger.error("Failed to publish vitals for %s: %s", reading.patient_id, exc)
                return False

    async def fetch_patients(self) -> list[dict]:
        url = f"{self.backend_url}/api/patients"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
