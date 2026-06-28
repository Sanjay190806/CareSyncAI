"""Tests for scenario generation helpers."""

from cares_sync_sim.scenarios.patient_7_crisis import build_patient_7_sequence


def test_patient_7_sequence_escalates_to_critical() -> None:
    sequence = build_patient_7_sequence()

    assert len(sequence) == 4
    assert [step["riskScore"] for step in sequence] == [32, 58, 79, 91]
    assert sequence[-1]["tier"] == 5
