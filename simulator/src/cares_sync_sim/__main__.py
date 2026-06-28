"""CareSync Simulator — synthetic patient vital stream generator."""

from __future__ import annotations

import argparse
import asyncio
import logging
import threading

import uvicorn
from fastapi import FastAPI

from cares_sync_sim.config.settings import settings
from cares_sync_sim.publishers.vitals_publisher import VitalsPublisher
from cares_sync_sim.simulation.loop import SimulationLoop

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="CareSync Simulator",
    description="IoMT device ecosystem with physiological correlation",
    version="0.2.0",
)

_loop: SimulationLoop | None = None
_task: asyncio.Task | None = None


@app.get("/api/health")
def health():
    patient_count = len(_loop._patients) if _loop else 0
    return {
        "service": "caresync-simulator",
        "status": "ok",
        "phase": "2A",
        "patients": patient_count,
        "intervalMs": settings.refresh_interval_ms,
    }


@app.on_event("startup")
async def startup():
    global _loop, _task
    publisher = VitalsPublisher(settings.backend_url)
    _loop = SimulationLoop(publisher, settings.refresh_interval_ms)
    _task = asyncio.create_task(_loop.run())


@app.on_event("shutdown")
async def shutdown():
    if _loop:
        _loop.stop()
    if _task:
        _task.cancel()


def main():
    parser = argparse.ArgumentParser(description="CareSync Synthetic Patient Simulator")
    parser.add_argument("--loop-only", action="store_true", help="Run simulation without HTTP server")
    args = parser.parse_args()

    if args.loop_only:
        async def run():
            publisher = VitalsPublisher(settings.backend_url)
            loop = SimulationLoop(publisher, settings.refresh_interval_ms)
            await loop.run()

        asyncio.run(run())
    else:
        uvicorn.run(app, host="0.0.0.0", port=8001)


if __name__ == "__main__":
    main()
