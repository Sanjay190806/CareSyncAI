"""Tests for Phase 7 clinical narrative intelligence engine."""

from dataclasses import replace

from cares_ai.engines.narrative.engine import (
    ClinicalNarrativeEngine,
    NarrativeInput,
    PatientStoryEngine,
    ShiftReportGenerator,
    build_patient_7_demo_stage,
    PATIENT_7_DEMO_STAGES,
)


def test_narrative_includes_deviation_trend_and_risk() -> None:
    engine = ClinicalNarrativeEngine()
    output = engine.generate(
        NarrativeInput(
            patient_id="p7",
            vitals={"spo2": 82, "heartRate": 132, "bloodPressure": 79, "respiratoryRate": 32, "temperature": 100.2},
            baseline={"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1},
            deviations=[],
            trend="deteriorating",
            risk_score=92,
            previous_risk_score=74,
            tier=5,
            correlation_patterns=["SpO2_Decrease_HR_Increase"],
        )
    )
    assert "σ" in output.narrative or "baseline" in output.narrative
    assert output.severity_reasoning
    assert output.trend_interpretation
    assert output.risk_explanation
    assert "92" in output.risk_explanation
    assert output.confidence >= 0.5


def test_code_red_narrative_at_tier_5() -> None:
    engine = ClinicalNarrativeEngine()
    output = engine.generate_code_red(
        NarrativeInput(
            patient_id="p7",
            vitals={"spo2": 78, "heartRate": 140, "bloodPressure": 79, "respiratoryRate": 8, "temperature": 100.2},
            baseline={"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1},
            trend="deteriorating",
            risk_score=91,
            tier=5,
        )
    )
    assert output.is_code_red is True
    assert "CODE RED" in output.narrative


def test_patient_story_timeline_ordered() -> None:
    engine = ClinicalNarrativeEngine()
    story = PatientStoryEngine()
    narrative_engine = engine

    base = NarrativeInput(
        patient_id="p7",
        vitals={"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1},
        baseline={"spo2": 96, "heartRate": 78, "bloodPressure": 128, "respiratoryRate": 14, "temperature": 98.1},
        trend="stable",
        risk_score=12,
        tier=1,
    )
    story.record(base, narrative_engine.generate(base), "t0")
    mid = replace(base, risk_score=58, tier=3, trend="deteriorating", vitals={**base.vitals, "spo2": 86})
    story.record(mid, narrative_engine.generate(mid), "t1")
    timeline = story._timelines["p7"]
    assert len(timeline) >= 2
    assert timeline[0].event_type == "baseline"


def test_shift_report_accuracy() -> None:
    report = ShiftReportGenerator.generate(
        [
            {"name": "Patient 07", "tier": 5, "risk_score": 91},
            {"name": "Patient 02", "tier": 4, "risk_score": 71},
        ]
    )
    assert report["total_patients_monitored"] == 2
    assert report["code_red_events"] == 1
    assert report["critical_events"] == 2


def test_patient_7_demo_all_stages() -> None:
    assert len(PATIENT_7_DEMO_STAGES) == 6
    stages = [build_patient_7_demo_stage(i) for i in range(6)]
    assert stages[0]["stage"] == "stable_baseline"
    assert stages[4]["tier"] == 5
    assert stages[4]["narrative"].is_code_red is True
    assert stages[5]["stage"] == "intervention_response"
