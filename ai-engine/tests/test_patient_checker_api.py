from cares_ai.api.diagnosis import DiagnosisRequest, patient_checker_health, predict_diagnosis
from cares_ai.main import app


def test_patient_checker_endpoint_returns_contract():
    body = predict_diagnosis(
        DiagnosisRequest.model_validate(
            {
                "demographics": {"age": 72, "gender": "Male", "height": 170, "weight": 78},
                "vitals": {
                    "spo2": 86,
                    "heartRate": 112,
                    "bpSys": 124,
                    "bpDia": 78,
                    "respiratoryRate": 30,
                    "temperature": 99,
                    "glucose": 120,
                },
                "symptoms": ["shortness of breath", "cough", "wheezing"],
                "clinicalContext": ["smoker", "copd"],
            }
        )
    )

    assert body["success"] is True
    assert body["primaryDiagnosis"] == body["primaryCondition"]
    assert body["confidence"] >= 50
    assert body["riskScore"] >= 0
    assert len(body["differentials"]) == 5
    assert body["recommendations"]
    assert body["modelUsed"]
    assert body["dataQuality"] >= 50
    assert body["disclaimer"].startswith("Suggestive diagnosis only")


def test_patient_checker_health_reports_model_and_fallback_status():
    body = patient_checker_health()

    assert body["status"] == "ok"
    assert body["aiStatus"] == "ok"
    assert body["fallbackStatus"] == "available"
    assert body["modelStatus"]["status"] in {"loaded", "fallback"}


def test_patient_checker_routes_are_registered():
    paths = route_paths()

    assert "/patient-checker" in paths
    assert "/predict" in paths
    assert "/api/patient-checker" in paths
    assert "/api/predict" in paths
    assert "/api/patient-checker/health" in paths


def route_paths() -> set[str]:
    paths: set[str] = set()
    for route in app.routes:
        path = getattr(route, "path", None)
        if path:
            paths.add(path)
            continue
        original_router = getattr(route, "original_router", None)
        include_context = getattr(route, "include_context", None)
        prefix = getattr(include_context, "prefix", "") if include_context else ""
        for child in getattr(original_router, "routes", []):
            child_path = getattr(child, "path", None)
            if child_path:
                paths.add(f"{prefix}{child_path}")
    return paths
