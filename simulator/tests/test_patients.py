"""Tests for patient archetypes and vital generation."""

import pytest

from cares_sync_sim.patients.archetypes import ARCHETYPES, ProfileType, get_archetype
from cares_sync_sim.patients.state import PatientRecord, PatientSimulator, compute_map


def make_record(profile_type: str, hospital_id: str = "P-TEST") -> PatientRecord:
    return PatientRecord(
        id="test-uuid",
        hospital_id=hospital_id,
        name="Test Patient",
        age=65,
        gender="Female",
        room_number="101A",
        diagnoses=["Test"],
        medications=["Test Med"],
        allergies=["None"],
        risk_category="Moderate",
        profile_type=profile_type,
    )


class TestArchetypes:
    def test_seven_profile_types_defined(self):
        assert len(ARCHETYPES) == 7

    def test_copd_spo2_baseline_range(self):
        copd = get_archetype("COPD")
        assert copd.spo2.mean == 89.0
        assert copd.spo2.std == 1.2
        assert copd.spo2.min_val >= 84.0

    def test_all_archetypes_have_twelve_params(self):
        for profile in ARCHETYPES.values():
            assert profile.spo2 is not None
            assert profile.heart_rate is not None
            assert profile.bp_sys is not None
            assert profile.bp_dia is not None
            assert profile.respiratory_rate is not None
            assert profile.temperature is not None
            assert profile.etco2 is not None
            assert profile.blood_glucose is not None
            assert profile.ecg_rhythm
            assert profile.activity_level
            assert profile.medication_compliance > 0


class TestPatientSimulator:
    def test_generates_twelve_clinical_parameters(self):
        sim = PatientSimulator.from_record(make_record("Healthy"))
        reading = sim.generate_reading()
        assert reading.heart_rate > 0
        assert 0 < reading.spo2 <= 100
        assert reading.bp_sys > 0
        assert reading.bp_dia > 0
        assert reading.bp_map == compute_map(reading.bp_sys, reading.bp_dia)
        assert reading.respiratory_rate > 0
        assert reading.temperature > 0
        assert reading.ecg_rhythm
        assert reading.etco2 > 0
        assert reading.blood_glucose > 0
        assert reading.activity_level
        assert reading.fall_detection_status in ("Normal", "Inactive", "Fall Detected")
        assert reading.iv_flow_status in ("Normal", "Occlusion", "Stopped")
        assert 0 <= reading.medication_compliance <= 100

    def test_copd_spo2_stays_in_clinical_range(self):
        sim = PatientSimulator.from_record(make_record("COPD", "P-007"))
        for _ in range(50):
            reading = sim.generate_reading()
            assert 80.0 <= reading.spo2 <= 96.0

    def test_payload_has_camel_case_keys(self):
        sim = PatientSimulator.from_record(make_record("Diabetes"))
        payload = sim.generate_reading().to_payload()
        assert "patientId" in payload
        assert "heartRate" in payload
        assert "bloodGlucose" in payload
        assert "fallDetectionStatus" in payload
