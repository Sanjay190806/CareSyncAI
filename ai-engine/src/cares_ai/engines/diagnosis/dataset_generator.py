"""Synthetic clinical dataset generator for diagnosis model training."""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

import numpy as np

from cares_ai.engines.diagnosis.feature_extractor import HISTORY_FLAGS, SYMPTOMS, feature_vector

PATIENT_CHECKER_DISEASES = [
    "COPD Exacerbation",
    "Asthma",
    "Pneumonia",
    "Sepsis",
    "Respiratory Failure",
    "Heart Failure",
    "Stroke",
    "Diabetes",
    "DKA",
    "Kidney Injury",
]

PATTERNS = {
    "COPD Exacerbation": {"spo2": (88, 4), "heartRate": (104, 16), "respiratoryRate": (27, 5), "temperature": (99.2, 1.0), "symptoms": ["shortness of breath", "cough", "wheezing"], "context": ["copd", "smoker"]},
    "Asthma": {"spo2": (91, 4), "heartRate": (108, 18), "respiratoryRate": (29, 5), "temperature": (98.8, 0.8), "symptoms": ["shortness of breath", "wheezing", "cough"], "context": ["asthma"]},
    "Pneumonia": {"spo2": (92, 4), "heartRate": (105, 16), "respiratoryRate": (24, 4), "temperature": (101.7, 1.2), "symptoms": ["fever", "cough", "productive cough", "chills", "fatigue"], "context": []},
    "Sepsis": {"spo2": (93, 5), "heartRate": (122, 20), "respiratoryRate": (26, 5), "temperature": (102.0, 1.8), "bpSys": (88, 12), "bpDia": (55, 10), "symptoms": ["fever", "chills", "confusion", "weakness"], "context": []},
    "Respiratory Failure": {"spo2": (84, 5), "heartRate": (118, 20), "respiratoryRate": (31, 7), "temperature": (99.5, 1.2), "symptoms": ["shortness of breath", "confusion", "weakness"], "context": ["copd"]},
    "Diabetes": {"spo2": (97, 2), "heartRate": (94, 14), "respiratoryRate": (19, 4), "temperature": (98.7, 0.8), "glucose": (205, 50), "symptoms": ["excessive thirst", "excessive urination", "fatigue"], "context": ["diabetic"]},
    "DKA": {"spo2": (95, 3), "heartRate": (116, 18), "respiratoryRate": (29, 5), "temperature": (99.0, 0.9), "glucose": (365, 75), "symptoms": ["excessive thirst", "excessive urination", "fatigue", "weakness"], "context": ["diabetic"]},
    "Hypertension": {"spo2": (96, 2), "heartRate": (98, 18), "respiratoryRate": (20, 4), "temperature": (98.7, 0.7), "bpSys": (188, 18), "bpDia": (112, 12), "symptoms": ["headache", "chest pain", "dizziness"], "context": ["hypertension"]},
    "Hypotension": {"spo2": (95, 3), "heartRate": (112, 18), "respiratoryRate": (22, 4), "temperature": (98.4, 1.0), "bpSys": (82, 10), "bpDia": (50, 8), "symptoms": ["dizziness", "weakness", "confusion"], "context": []},
    "Cardiac Arrhythmia": {"spo2": (96, 2), "heartRate": (132, 30), "respiratoryRate": (20, 4), "temperature": (98.6, 0.7), "symptoms": ["palpitations", "dizziness", "chest pain"], "context": ["cardiac history"]},
    "Heart Failure": {"spo2": (91, 4), "heartRate": (112, 18), "respiratoryRate": (24, 5), "temperature": (98.7, 0.8), "symptoms": ["shortness of breath", "fatigue", "chest pain"], "context": ["cardiac history", "hypertension"]},
    "Stroke": {"spo2": (96, 2), "heartRate": (94, 14), "respiratoryRate": (18, 3), "temperature": (98.6, 0.7), "bpSys": (158, 22), "bpDia": (92, 12), "symptoms": ["confusion", "weakness", "headache", "neurologic deficit", "facial droop"], "context": ["hypertension"]},
    "COVID-like Infection": {"spo2": (93, 4), "heartRate": (96, 16), "respiratoryRate": (22, 5), "temperature": (100.8, 1.2), "symptoms": ["fever", "cough", "fatigue", "sore throat"], "context": ["covid exposure"]},
    "Anemia": {"spo2": (96, 2), "heartRate": (108, 16), "respiratoryRate": (20, 4), "temperature": (98.4, 0.7), "symptoms": ["fatigue", "weakness", "dizziness", "pale skin"], "context": ["anemia"]},
    "Kidney Injury": {"spo2": (96, 2), "heartRate": (96, 16), "respiratoryRate": (20, 4), "temperature": (98.8, 0.8), "symptoms": ["fatigue", "weakness", "reduced urine output", "edema"], "context": ["kidney disease", "diabetic"]},
}


def _clip(value: float, low: float, high: float) -> float:
    return round(float(max(low, min(high, value))), 2)


def generate_records(count: int, seed: int = 42) -> list[dict]:
    rng = np.random.default_rng(seed)
    records: list[dict] = []
    for index in range(count):
        label = str(rng.choice(PATIENT_CHECKER_DISEASES))
        pattern = PATTERNS[label]
        age = int(_clip(rng.normal(58, 18), 18, 95))
        gender = str(rng.choice(["Male", "Female", "Other"], p=[0.48, 0.49, 0.03]))
        height = _clip(rng.normal(168, 11), 140, 205)
        weight = _clip(rng.normal(78, 18), 42, 160)
        bp_sys = _clip(rng.normal(*pattern.get("bpSys", (122, 16))), 65, 230)
        bp_dia = _clip(rng.normal(*pattern.get("bpDia", (78, 11))), 35, 140)
        glucose = _clip(rng.normal(*pattern.get("glucose", (118, 35))), 35, 520)
        symptoms = set(pattern["symptoms"])
        symptoms.update(rng.choice(SYMPTOMS, size=int(rng.integers(0, 3)), replace=False).tolist())
        context = set(pattern["context"])
        for flag in HISTORY_FLAGS:
            if rng.random() < 0.12:
                context.add(flag)
        record = {
            "record_id": f"SYN-{index + 1:06d}",
            "age": age,
            "gender": gender,
            "height": height,
            "weight": weight,
            "vitals": {
                "spo2": _clip(rng.normal(*pattern["spo2"]), 70, 100),
                "heartRate": int(_clip(rng.normal(*pattern["heartRate"]), 35, 190)),
                "bpSys": int(bp_sys),
                "bpDia": int(bp_dia),
                "respiratoryRate": int(_clip(rng.normal(*pattern["respiratoryRate"]), 6, 45)),
                "temperature": _clip(rng.normal(*pattern["temperature"]), 94, 106),
                "glucose": glucose,
            },
            "symptoms": sorted(symptoms),
            "clinicalContext": sorted(context),
            "disease_label": label,
            "clinical_outcome": str(rng.choice(["monitored", "treated", "escalated", "icu_transfer"], p=[0.3, 0.42, 0.2, 0.08])),
        }
        records.append(record)
    return records


def flatten_record(record: dict) -> dict:
    names, values = feature_vector(record)
    row = {name: value for name, value in zip(names, values)}
    row["disease_label"] = record["disease_label"]
    row["clinical_outcome"] = record["clinical_outcome"]
    row["symptoms"] = "|".join(record["symptoms"])
    row["clinical_context"] = "|".join(record["clinicalContext"])
    row["record_json"] = json.dumps(record, separators=(",", ":"))
    return row


def export_dataset(count: int, output_dir: Path, seed: int = 42) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    records = generate_records(count, seed)
    rows = [flatten_record(record) for record in records]
    csv_path = output_dir / "synthetic_clinical_dataset.csv"
    with csv_path.open("w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

    training_path = output_dir / "diagnosis_training.jsonl"
    with training_path.open("w") as fh:
        for record in records:
            fh.write(json.dumps(record) + "\n")

    parquet_path = output_dir / "synthetic_clinical_dataset.parquet"
    try:
        import pandas as pd

        pd.DataFrame(rows).to_parquet(parquet_path, index=False)
        parquet_status = str(parquet_path)
    except Exception:
        parquet_status = "parquet export requires pandas with pyarrow or fastparquet"

    return {"csv": str(csv_path), "training": str(training_path), "parquet": parquet_status}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=10000)
    parser.add_argument("--output-dir", type=Path, default=Path("artifacts/diagnosis"))
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(export_dataset(args.count, args.output_dir, args.seed))


if __name__ == "__main__":
    main()
