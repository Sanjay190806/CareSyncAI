"""Patient Checker model loading and safe inference helpers."""

from __future__ import annotations

import logging
import pickle
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from cares_ai.engines.diagnosis.feature_extractor import feature_vector

logger = logging.getLogger("cares_ai.patient_checker")


@dataclass(slots=True)
class PatientCheckerModelStatus:
    status: str
    model_used: str
    fallback_active: bool
    model_path: str | None = None
    error: str | None = None
    metrics: list[dict[str, Any]] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "modelUsed": self.model_used,
            "fallbackActive": self.fallback_active,
            "modelPath": self.model_path,
            "error": self.error,
            "metrics": self.metrics,
        }


class PatientCheckerModel:
    """Load the trained Patient Checker model and fail open to rules."""

    def __init__(self, model_path: str | Path, legacy_model_path: str | Path | None = None) -> None:
        self.model_path = Path(model_path)
        self.legacy_model_path = Path(legacy_model_path) if legacy_model_path else None
        self.bundle: dict[str, Any] | None = None
        self.status = PatientCheckerModelStatus(
            status="fallback",
            model_used="baseline_fallback_rules",
            fallback_active=True,
            model_path=str(self.model_path),
            error="Model not loaded yet",
        )
        self.load()

    def load(self) -> None:
        candidate = self.model_path if self.model_path.exists() else self.legacy_model_path
        if candidate is None or not candidate.exists():
            self._activate_fallback(f"Model artifact missing: {self.model_path}")
            return

        try:
            with candidate.open("rb") as fh:
                bundle = pickle.load(fh)
            if not isinstance(bundle, dict) or "model" not in bundle or "feature_names" not in bundle:
                raise ValueError("Model artifact must contain model and feature_names")
            model = bundle["model"]
            if not hasattr(model, "predict_proba"):
                raise ValueError("Model does not expose predict_proba")
            self.bundle = bundle
            self.status = PatientCheckerModelStatus(
                status="loaded",
                model_used=str(bundle.get("selected_model", "patient_checker_ml")),
                fallback_active=False,
                model_path=str(candidate),
                metrics=list(bundle.get("metrics", [])),
            )
            logger.info("Model Loaded Successfully", extra=self.status.as_dict())
        except Exception as exc:
            self.bundle = None
            self._activate_fallback(f"{type(exc).__name__}: {exc}")

    def predict_scores(self, payload: dict[str, Any]) -> dict[str, float]:
        if not self.bundle:
            return {}
        try:
            _, vector = feature_vector(payload, list(self.bundle["feature_names"]))
            model = self.bundle["model"]
            classes = list(getattr(model, "classes_", []))
            if not classes:
                return {}
            probabilities = model.predict_proba([vector])[0]
            return {str(name): float(probabilities[index]) for index, name in enumerate(classes)}
        except Exception as exc:
            self._activate_fallback(f"Inference failed: {type(exc).__name__}: {exc}")
            return {}

    def _activate_fallback(self, reason: str) -> None:
        self.status = PatientCheckerModelStatus(
            status="fallback",
            model_used="baseline_fallback_rules",
            fallback_active=True,
            model_path=str(self.model_path),
            error=reason,
        )
        logger.warning("Fallback Model Activated", extra=self.status.as_dict())
