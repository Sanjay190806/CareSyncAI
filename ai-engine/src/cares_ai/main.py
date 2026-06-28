from fastapi import FastAPI

from cares_ai.api.baseline import router as baseline_router
from cares_ai.api.diagnosis import router as diagnosis_router
from cares_ai.api.health import router as health_router
from cares_ai.api.narrative import router as narrative_router
from cares_ai.api.risk import router as risk_router

app = FastAPI(
    title="CareSync AI Engine",
    description="Baseline personalisation, deviation scoring, risk engine, clinical narratives",
    version="0.3.0",
)

app.include_router(health_router, tags=["health"])
app.include_router(health_router, prefix="/api", tags=["health"])
app.include_router(baseline_router, prefix="/api", tags=["baseline"])
app.include_router(risk_router, prefix="/api", tags=["risk"])
app.include_router(narrative_router, prefix="/api", tags=["narrative"])
app.include_router(diagnosis_router, tags=["diagnosis"])
app.include_router(diagnosis_router, prefix="/api", tags=["diagnosis"])
