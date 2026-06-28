from fastapi import APIRouter
from cares_ai.api.diagnosis import diagnosis_engine

router = APIRouter()


@router.get("/health")
def health():
    return {
        "service": "caresync-ai-engine",
        "status": "ok",
        "phase": "patient-checker-stabilized",
        "aiStatus": "ok",
        "modelStatus": diagnosis_engine.model.status.as_dict(),
        "databaseStatus": {"status": "not_configured"},
        "webSocketStatus": {"status": "not_configured"},
        "patientChecker": {
            "status": "ok",
            "fallbackStatus": "available",
            "modelStatus": diagnosis_engine.model.status.as_dict(),
        },
    }
