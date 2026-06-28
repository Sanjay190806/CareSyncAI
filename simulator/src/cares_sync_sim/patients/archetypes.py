"""Clinical archetype definitions with realistic vital ranges."""

from dataclasses import dataclass
from enum import Enum


class ProfileType(str, Enum):
    HEALTHY = "Healthy"
    COPD = "COPD"
    DIABETES = "Diabetes"
    HYPERTENSION = "Hypertension"
    HEART_FAILURE = "Heart Failure"
    POST_SURGERY = "Post Surgery"
    ICU_CRITICAL = "ICU Critical"


@dataclass(frozen=True)
class VitalRange:
    mean: float
    std: float
    min_val: float
    max_val: float


@dataclass(frozen=True)
class ArchetypeProfile:
    profile_type: ProfileType
    spo2: VitalRange
    heart_rate: VitalRange
    bp_sys: VitalRange
    bp_dia: VitalRange
    respiratory_rate: VitalRange
    temperature: VitalRange
    etco2: VitalRange
    blood_glucose: VitalRange
    ecg_rhythm: str
    activity_level: str
    medication_compliance: float


ARCHETYPES: dict[ProfileType, ArchetypeProfile] = {
    ProfileType.HEALTHY: ArchetypeProfile(
        profile_type=ProfileType.HEALTHY,
        spo2=VitalRange(98.0, 0.8, 95.0, 100.0),
        heart_rate=VitalRange(72.0, 6.0, 55.0, 100.0),
        bp_sys=VitalRange(118.0, 8.0, 100.0, 130.0),
        bp_dia=VitalRange(76.0, 5.0, 60.0, 85.0),
        respiratory_rate=VitalRange(14.0, 2.0, 10.0, 20.0),
        temperature=VitalRange(98.2, 0.3, 97.0, 99.5),
        etco2=VitalRange(38.0, 3.0, 32.0, 45.0),
        blood_glucose=VitalRange(95.0, 8.0, 70.0, 110.0),
        ecg_rhythm="Normal Sinus",
        activity_level="Active",
        medication_compliance=98.0,
    ),
    ProfileType.COPD: ArchetypeProfile(
        profile_type=ProfileType.COPD,
        spo2=VitalRange(89.0, 1.2, 84.0, 93.0),
        heart_rate=VitalRange(88.0, 8.0, 70.0, 110.0),
        bp_sys=VitalRange(128.0, 10.0, 105.0, 150.0),
        bp_dia=VitalRange(78.0, 6.0, 60.0, 95.0),
        respiratory_rate=VitalRange(20.0, 3.0, 14.0, 28.0),
        temperature=VitalRange(98.4, 0.4, 97.5, 100.0),
        etco2=VitalRange(42.0, 4.0, 35.0, 55.0),
        blood_glucose=VitalRange(105.0, 12.0, 80.0, 140.0),
        ecg_rhythm="Normal Sinus",
        activity_level="Resting",
        medication_compliance=85.0,
    ),
    ProfileType.DIABETES: ArchetypeProfile(
        profile_type=ProfileType.DIABETES,
        spo2=VitalRange(97.0, 1.0, 93.0, 99.0),
        heart_rate=VitalRange(78.0, 7.0, 60.0, 100.0),
        bp_sys=VitalRange(132.0, 10.0, 110.0, 155.0),
        bp_dia=VitalRange(82.0, 6.0, 65.0, 95.0),
        respiratory_rate=VitalRange(16.0, 2.0, 12.0, 22.0),
        temperature=VitalRange(98.3, 0.3, 97.0, 99.8),
        etco2=VitalRange(37.0, 3.0, 32.0, 44.0),
        blood_glucose=VitalRange(165.0, 25.0, 120.0, 280.0),
        ecg_rhythm="Normal Sinus",
        activity_level="Resting",
        medication_compliance=78.0,
    ),
    ProfileType.HYPERTENSION: ArchetypeProfile(
        profile_type=ProfileType.HYPERTENSION,
        spo2=VitalRange(97.5, 0.8, 94.0, 99.0),
        heart_rate=VitalRange(76.0, 6.0, 58.0, 95.0),
        bp_sys=VitalRange(148.0, 12.0, 130.0, 175.0),
        bp_dia=VitalRange(92.0, 8.0, 78.0, 105.0),
        respiratory_rate=VitalRange(15.0, 2.0, 11.0, 20.0),
        temperature=VitalRange(98.1, 0.3, 97.0, 99.5),
        etco2=VitalRange(37.0, 3.0, 32.0, 44.0),
        blood_glucose=VitalRange(102.0, 10.0, 80.0, 130.0),
        ecg_rhythm="Normal Sinus",
        activity_level="Resting",
        medication_compliance=82.0,
    ),
    ProfileType.HEART_FAILURE: ArchetypeProfile(
        profile_type=ProfileType.HEART_FAILURE,
        spo2=VitalRange(94.0, 2.0, 88.0, 98.0),
        heart_rate=VitalRange(92.0, 10.0, 70.0, 120.0),
        bp_sys=VitalRange(108.0, 12.0, 85.0, 130.0),
        bp_dia=VitalRange(68.0, 8.0, 50.0, 85.0),
        respiratory_rate=VitalRange(22.0, 4.0, 16.0, 32.0),
        temperature=VitalRange(98.0, 0.4, 97.0, 99.5),
        etco2=VitalRange(40.0, 4.0, 33.0, 50.0),
        blood_glucose=VitalRange(108.0, 12.0, 85.0, 150.0),
        ecg_rhythm="Atrial Fibrillation",
        activity_level="Limited",
        medication_compliance=80.0,
    ),
    ProfileType.POST_SURGERY: ArchetypeProfile(
        profile_type=ProfileType.POST_SURGERY,
        spo2=VitalRange(96.5, 1.5, 92.0, 99.0),
        heart_rate=VitalRange(82.0, 8.0, 65.0, 105.0),
        bp_sys=VitalRange(122.0, 10.0, 100.0, 145.0),
        bp_dia=VitalRange(74.0, 6.0, 58.0, 90.0),
        respiratory_rate=VitalRange(16.0, 3.0, 12.0, 24.0),
        temperature=VitalRange(99.1, 0.5, 98.0, 101.0),
        etco2=VitalRange(38.0, 3.0, 32.0, 45.0),
        blood_glucose=VitalRange(115.0, 15.0, 90.0, 160.0),
        ecg_rhythm="Normal Sinus",
        activity_level="Bed Rest",
        medication_compliance=90.0,
    ),
    ProfileType.ICU_CRITICAL: ArchetypeProfile(
        profile_type=ProfileType.ICU_CRITICAL,
        spo2=VitalRange(91.0, 3.0, 82.0, 96.0),
        heart_rate=VitalRange(108.0, 15.0, 80.0, 140.0),
        bp_sys=VitalRange(88.0, 15.0, 60.0, 120.0),
        bp_dia=VitalRange(52.0, 10.0, 35.0, 70.0),
        respiratory_rate=VitalRange(24.0, 5.0, 14.0, 35.0),
        temperature=VitalRange(100.4, 0.8, 99.0, 103.0),
        etco2=VitalRange(48.0, 6.0, 38.0, 65.0),
        blood_glucose=VitalRange(185.0, 30.0, 130.0, 320.0),
        ecg_rhythm="Sinus Tachycardia",
        activity_level="Immobile",
        medication_compliance=95.0,
    ),
}


def get_archetype(profile_type: str) -> ArchetypeProfile:
    return ARCHETYPES[ProfileType(profile_type)]
