"""Physiological correlation engine — vitals are never independent."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class CorrelationPattern(str, Enum):
    SPO2_HR_COMPENSATION = "SpO2_Decrease_HR_Increase"
    SHOCK_PATTERN = "Shock_Pattern_BP_Drop_HR_Rise"
    RESPIRATORY_DEPRESSION = "Respiratory_Depression_EtCO2_RR"
    SEPSIS_RISK = "Sepsis_Risk_Glucose_HR"
    INFECTION_PATTERN = "Infection_Pattern_Temp_HR"
    RESPIRATORY_DISTRESS = "Respiratory_Distress_RR_SpO2"


@dataclass
class CorrelatedVitals:
    spo2: float
    heart_rate: float
    bp_sys: float
    bp_dia: float
    respiratory_rate: float
    etco2: float
    temperature: float
    blood_glucose: float
    active_patterns: list[CorrelationPattern]


class CorrelationEngine:
    """Apply medically correlated adjustments to vital readings."""

    SPO2_HR_FACTOR = 1.8
    SHOCK_BP_DROP = 12.0
    SHOCK_HR_RISE = 18.0
    RESP_ETCO2_RISE = 8.0
    RESP_RR_DROP = 4.0
    SEPSIS_GLUCOSE_THRESHOLD = 200.0
    SEPSIS_HR_RISE = 12.0
    INFECTION_TEMP_THRESHOLD = 100.0
    DISTRESS_RR_THRESHOLD = 24.0

    def apply(
        self,
        spo2: float,
        heart_rate: float,
        bp_sys: float,
        bp_dia: float,
        respiratory_rate: float,
        etco2: float,
        blood_glucose: float,
        temperature: float = 98.6,
    ) -> CorrelatedVitals:
        patterns: list[CorrelationPattern] = []

        if spo2 < 92.0:
            deficit = 92.0 - spo2
            heart_rate += deficit * self.SPO2_HR_FACTOR
            patterns.append(CorrelationPattern.SPO2_HR_COMPENSATION)

        if bp_sys < 95.0 and heart_rate > 90.0:
            bp_sys = max(55.0, bp_sys - self.SHOCK_BP_DROP * 0.3)
            bp_dia = max(35.0, bp_dia - self.SHOCK_BP_DROP * 0.2)
            heart_rate = min(160.0, heart_rate + self.SHOCK_HR_RISE * 0.4)
            spo2 = max(70.0, spo2 - 1.5)
            patterns.append(CorrelationPattern.SHOCK_PATTERN)

        if respiratory_rate > self.DISTRESS_RR_THRESHOLD and spo2 < 94.0:
            respiratory_rate = min(42.0, respiratory_rate + 1.5)
            spo2 = max(70.0, spo2 - 1.2)
            heart_rate = min(165.0, heart_rate + 4.0)
            patterns.append(CorrelationPattern.RESPIRATORY_DISTRESS)

        if etco2 > 45.0 and respiratory_rate < 14.0:
            etco2 = min(70.0, etco2 + self.RESP_ETCO2_RISE * 0.3)
            respiratory_rate = max(8.0, respiratory_rate - self.RESP_RR_DROP * 0.5)
            patterns.append(CorrelationPattern.RESPIRATORY_DEPRESSION)

        if blood_glucose > self.SEPSIS_GLUCOSE_THRESHOLD and heart_rate > 85.0:
            heart_rate = min(150.0, heart_rate + self.SEPSIS_HR_RISE * 0.5)
            patterns.append(CorrelationPattern.SEPSIS_RISK)

        if temperature >= self.INFECTION_TEMP_THRESHOLD and heart_rate > 90.0:
            temperature = min(104.0, temperature + 0.15)
            heart_rate = min(165.0, heart_rate + 3.0)
            respiratory_rate = min(40.0, respiratory_rate + 0.8)
            patterns.append(CorrelationPattern.INFECTION_PATTERN)

        return CorrelatedVitals(
            spo2=spo2,
            heart_rate=heart_rate,
            bp_sys=bp_sys,
            bp_dia=bp_dia,
            respiratory_rate=respiratory_rate,
            etco2=etco2,
            temperature=temperature,
            blood_glucose=blood_glucose,
            active_patterns=patterns,
        )
