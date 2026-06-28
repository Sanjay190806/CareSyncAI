from cares_ai.engines.diagnosis import DiagnosisEngine


def test_diagnosis_engine_predicts_copd_pattern():
    engine = DiagnosisEngine(model_path="/tmp/missing-diagnosis-model.pkl")
    result = engine.predict(
        {
            "demographics": {"age": 72, "gender": "Male", "height": 170, "weight": 78},
            "vitals": {"spo2": 86, "heartRate": 112, "bpSys": 124, "bpDia": 78, "respiratoryRate": 30, "temperature": 99, "glucose": 120},
            "symptoms": ["shortness of breath", "cough", "wheezing"],
            "clinicalContext": ["smoker", "copd"],
        }
    )

    assert result["primaryCondition"] == "COPD Exacerbation"
    assert result["confidence"] >= 0.6
    assert result["topPredictions"]
    assert result["disclaimer"].startswith("Suggestive")


def test_diagnosis_engine_includes_explanations_for_sepsis_pattern():
    engine = DiagnosisEngine(model_path="/tmp/missing-diagnosis-model.pkl")
    result = engine.predict(
        {
            "demographics": {"age": 68, "gender": "Female"},
            "vitals": {"spo2": 92, "heartRate": 132, "bpSys": 82, "bpDia": 48, "respiratoryRate": 28, "temperature": 103.1, "glucose": 140},
            "symptoms": ["fever", "chills", "confusion", "weakness"],
            "clinicalContext": [],
        }
    )

    assert result["primaryCondition"] == "Sepsis"
    assert any("Temperature" in reason for reason in result["reasoning"])
    assert result["triageLevel"] >= 4
