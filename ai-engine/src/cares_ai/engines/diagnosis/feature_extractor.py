"""Feature extraction for clinical diagnosis prediction."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable


SYMPTOMS = [
    "shortness of breath",
    "cough",
    "wheezing",
    "chest pain",
    "palpitations",
    "dizziness",
    "fever",
    "chills",
    "fatigue",
    "confusion",
    "headache",
    "weakness",
    "excessive thirst",
    "excessive urination",
    "productive cough",
    "neurologic deficit",
    "facial droop",
    "reduced urine output",
    "edema",
    "pale skin",
    "sore throat",
]

HISTORY_FLAGS = [
    "smoker",
    "copd",
    "asthma",
    "diabetic",
    "hypertension",
    "cardiac history",
    "kidney disease",
    "anemia",
    "covid exposure",
]


@dataclass(frozen=True, slots=True)
class ClinicalFeatures:
    values: dict[str, float]
    symptoms: set[str]
    context: set[str]


def _norm(values: Iterable[str] | None) -> set[str]:
    return {str(value).strip().lower() for value in values or [] if str(value).strip()}


def extract_features(payload: dict) -> ClinicalFeatures:
    """Return normalized numeric features from API or dataset records."""

    demographics = payload.get("demographics") or payload.get("patient") or {}
    vitals = payload.get("vitals") or {}
    symptoms = _norm(payload.get("symptoms"))
    context = _norm(payload.get("clinicalContext") or payload.get("clinical_context") or payload.get("context"))

    age = float(payload.get("age", demographics.get("age", 0)) or 0)
    gender = str(payload.get("gender", demographics.get("gender", ""))).lower()
    height = float(payload.get("height", demographics.get("height", 0)) or 0)
    weight = float(payload.get("weight", demographics.get("weight", 0)) or 0)
    bmi = weight / ((height / 100) ** 2) if height > 0 and weight > 0 else 0.0
    bp_sys = float(vitals.get("bpSys", vitals.get("bp_sys", vitals.get("bloodPressure", 0))) or 0)
    bp_dia = float(vitals.get("bpDia", vitals.get("bp_dia", 0)) or 0)

    values: dict[str, float] = {
        "age": age,
        "gender_male": 1.0 if gender in {"m", "male"} else 0.0,
        "gender_female": 1.0 if gender in {"f", "female"} else 0.0,
        "height": height,
        "weight": weight,
        "bmi": bmi,
        "spo2": float(vitals.get("spo2", 0) or 0),
        "heart_rate": float(vitals.get("heartRate", vitals.get("heart_rate", 0)) or 0),
        "bp_sys": bp_sys,
        "bp_dia": bp_dia,
        "respiratory_rate": float(vitals.get("respiratoryRate", vitals.get("respiratory_rate", 0)) or 0),
        "temperature": float(vitals.get("temperature", 0) or 0),
        "glucose": float(vitals.get("glucose", vitals.get("bloodGlucose", 0)) or 0),
        "pulse_pressure": max(0.0, bp_sys - bp_dia) if bp_sys and bp_dia else 0.0,
    }

    for symptom in SYMPTOMS:
        values[f"symptom_{symptom.replace(' ', '_')}"] = 1.0 if symptom in symptoms else 0.0
    for flag in HISTORY_FLAGS:
        values[f"context_{flag.replace(' ', '_')}"] = 1.0 if flag in context else 0.0

    return ClinicalFeatures(values=values, symptoms=symptoms, context=context)


def feature_vector(payload: dict, feature_names: list[str] | None = None) -> tuple[list[str], list[float]]:
    features = extract_features(payload).values
    names = feature_names or sorted(features)
    return names, [float(features.get(name, 0.0)) for name in names]
