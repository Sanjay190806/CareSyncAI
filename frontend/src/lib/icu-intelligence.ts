import type { ClinicalReasoning, PatientSnapshot, PredictiveForecast } from '@/types';
import { scoreToTier } from '@/lib/utils';

export type TrendType = 'stable' | 'worsening' | 'critical_spike' | 'recovering';

export interface RiskVelocityResult {
  riskVelocity: number;
  trendType: TrendType;
  urgencyBoost: number;
}

export interface RankedPatient extends PatientSnapshot {
  riskVelocity: number;
  trendType: TrendType;
  urgencyBoost: number;
  prediction10Min: PredictiveForecast;
  clinicalReasoning: ClinicalReasoning;
  triageScore: number;
  urgencyRank: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function latestRiskDelta(patient: PatientSnapshot): number {
  const history = patient.history;
  if (history.length < 2) return 0;
  return history[history.length - 1].score - history[history.length - 2].score;
}

export function calculateRiskVelocity(patient: PatientSnapshot): RiskVelocityResult {
  const riskVelocity = patient.riskVelocity ?? latestRiskDelta(patient);
  const trendType: TrendType =
    riskVelocity >= 15
      ? 'critical_spike'
      : riskVelocity >= 5
        ? 'worsening'
        : riskVelocity <= -5
          ? 'recovering'
          : 'stable';

  const urgencyBoost = clamp(
    trendType === 'critical_spike'
      ? 100
      : trendType === 'worsening'
        ? 45 + riskVelocity * 3
        : trendType === 'recovering'
          ? 0
          : Math.max(0, riskVelocity * 2),
    0,
    100,
  );

  return { riskVelocity, trendType, urgencyBoost };
}

export function forecastPatient(patient: PatientSnapshot, velocity = latestRiskDelta(patient)): PredictiveForecast {
  const trendMultiplier = patient.trend === 'down' ? 1 : patient.trend === 'up' ? -0.65 : 0.25;
  const scoreProjection = clamp(patient.riskScore + velocity * 0.9 + (patient.tier >= 4 ? 4 : 0), 0, 100);
  const predictedSpo2 = clamp(patient.spo2 - Math.max(0, velocity) * 0.12 * (patient.trend === 'down' ? 1.4 : 0.7), 70, 100);
  const predictedHr = clamp(patient.heartRate + velocity * 0.45 + (patient.respiratoryRate > 24 ? 4 : 0), 45, 170);
  const confidence = clamp(0.55 + Math.abs(velocity) / 80 + (patient.history.length >= 3 ? 0.14 : 0), 0.45, 0.94);

  return {
    predictedSpo210Min: Math.round(predictedSpo2 + trendMultiplier * -1),
    predictedHr10Min: Math.round(predictedHr),
    riskForecast10Min: Math.round(scoreProjection),
    confidence: Number(confidence.toFixed(2)),
  };
}

export function buildClinicalReasoning(
  patient: PatientSnapshot,
  velocity: RiskVelocityResult,
  prediction: PredictiveForecast,
): ClinicalReasoning {
  const baseline = patient.baseline;
  const spo2Delta = baseline ? patient.spo2 - baseline.spo2 : 0;
  const hrDelta = baseline ? patient.heartRate - baseline.heartRate : 0;
  const bpDelta = baseline ? patient.bloodPressure - baseline.bloodPressure : 0;
  const sigmaText = baseline ? `${(spo2Delta / 1.5).toFixed(1)}σ` : 'baseline deviation unavailable';
  const coupling =
    patient.spo2 < 90 && patient.heartRate > 110
      ? 'hypoxemia with compensatory tachycardia'
      : patient.bloodPressure < 95 && patient.heartRate > 105
        ? 'possible shock physiology'
        : patient.temperature >= 100 && patient.heartRate > 100
          ? 'infectious stress pattern'
          : 'multi-vital surveillance pattern';

  return {
    basic: `${patient.name} is Tier ${patient.tier} with risk ${patient.riskScore}/100.`,
    clinical: `SpO2 is ${spo2Delta >= 0 ? '+' : ''}${spo2Delta}% from baseline (${sigmaText}); HR is ${hrDelta >= 0 ? '+' : ''}${hrDelta} bpm and BP is ${bpDelta} mmHg from baseline.`,
    criticalReasoning: `${velocity.trendType === 'critical_spike' ? 'Rapid risk spike' : velocity.trendType === 'worsening' ? 'Worsening risk velocity' : 'Current risk velocity'} (${velocity.riskVelocity >= 0 ? '+' : ''}${velocity.riskVelocity}) with ${coupling}.`,
    icuStyleSummary: `Projected 10-min risk ${prediction.riskForecast10Min}/100, SpO2 ${prediction.predictedSpo210Min}%, HR ${prediction.predictedHr10Min}; ${scoreToTier(prediction.riskForecast10Min) >= 4 ? 'pre-alert escalation recommended' : 'continue prioritized surveillance'}.`,
  };
}

export function calculateTriageScore(
  patient: PatientSnapshot,
  velocity: RiskVelocityResult,
  prediction: PredictiveForecast,
): number {
  return Math.round(
    patient.riskScore * 0.5
      + Math.max(0, velocity.riskVelocity) * 1.5 * 0.3
      + prediction.riskForecast10Min * 0.2
      + velocity.urgencyBoost * 0.15,
  );
}

export function enrichPatientsWithIcuIntelligence(patients: PatientSnapshot[]): RankedPatient[] {
  const enriched = patients.map((patient) => {
    const velocity = calculateRiskVelocity(patient);
    const prediction = forecastPatient(patient, velocity.riskVelocity);
    const triageScore = calculateTriageScore(patient, velocity, prediction);
    return {
      ...patient,
      ...velocity,
      prediction10Min: prediction,
      clinicalReasoning: buildClinicalReasoning(patient, velocity, prediction),
      triageScore,
    };
  });

  return enriched
    .sort((a, b) => b.triageScore - a.triageScore)
    .map((patient, index) => ({ ...patient, urgencyRank: index + 1 }));
}
