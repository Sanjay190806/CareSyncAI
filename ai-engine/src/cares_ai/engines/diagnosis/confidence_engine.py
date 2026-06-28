"""Confidence and explainability helpers for diagnosis predictions."""

from __future__ import annotations


def calibrated_confidence(raw_score: float, evidence_count: int, competing_score: float = 0.0) -> float:
    margin = max(0.0, raw_score - competing_score)
    evidence_bonus = min(0.14, evidence_count * 0.025)
    margin_bonus = min(0.12, margin * 0.12)
    confidence = 0.48 + raw_score * 0.32 + evidence_bonus + margin_bonus
    return round(max(0.35, min(0.97, confidence)), 2)


def severity_from_confidence(confidence: float, risk_score: int) -> str:
    if risk_score >= 85 or confidence >= 0.9:
        return "Critical"
    if risk_score >= 65 or confidence >= 0.78:
        return "High"
    if risk_score >= 40 or confidence >= 0.62:
        return "Moderate"
    return "Low"
