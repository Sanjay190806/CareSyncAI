"""Train and select a diagnosis model from synthetic clinical data."""

from __future__ import annotations

import argparse
import csv
import pickle
from pathlib import Path

from cares_ai.engines.diagnosis.dataset_generator import export_dataset


def _load_csv(path: Path) -> tuple[list[list[float]], list[str], list[str]]:
    with path.open() as fh:
        reader = csv.DictReader(fh)
        feature_names = [
            name for name in reader.fieldnames or []
            if name not in {"disease_label", "clinical_outcome", "symptoms", "clinical_context", "record_json"}
        ]
        x: list[list[float]] = []
        y: list[str] = []
        for row in reader:
            x.append([float(row[name]) for name in feature_names])
            y.append(row["disease_label"])
    return x, y, feature_names


def train(csv_path: Path, artifact_path: Path) -> dict:
    try:
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
        from sklearn.model_selection import train_test_split
    except Exception as exc:
        raise RuntimeError("Training requires scikit-learn. Install the ai-engine ML extras.") from exc

    x, y, feature_names = _load_csv(csv_path)
    x_train, x_test, y_train, y_test = train_test_split(x, y, test_size=0.2, random_state=42, stratify=y)
    model = RandomForestClassifier(
        n_estimators=220,
        random_state=42,
        class_weight="balanced",
        min_samples_leaf=2,
        n_jobs=-1,
    )
    model.fit(x_train, y_train)
    pred = model.predict(x_test)
    metrics = {
        "model": "RandomForest",
        "accuracy": round(accuracy_score(y_test, pred), 4),
        "precision": round(precision_score(y_test, pred, average="weighted", zero_division=0), 4),
        "recall": round(recall_score(y_test, pred, average="weighted", zero_division=0), 4),
        "f1": round(f1_score(y_test, pred, average="weighted", zero_division=0), 4),
    }

    artifact_path.parent.mkdir(parents=True, exist_ok=True)
    with artifact_path.open("wb") as fh:
        pickle.dump({"model": model, "feature_names": feature_names, "metrics": [metrics], "selected_model": "RandomForest"}, fh)
    return {"selected_model": "RandomForest", "metrics": [metrics], "artifact": str(artifact_path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", type=Path)
    parser.add_argument("--artifact", type=Path, default=Path("src/cares_ai/engines/diagnosis/patient_checker.pkl"))
    parser.add_argument("--generate", type=int, default=10000)
    args = parser.parse_args()
    dataset = args.dataset
    if dataset is None:
        count = max(args.generate, 10000)
        dataset = Path(export_dataset(count, Path("artifacts/diagnosis"))["csv"])
    print(train(dataset, args.artifact))


if __name__ == "__main__":
    main()
