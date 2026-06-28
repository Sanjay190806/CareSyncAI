import type { AlertTier } from '@/types';
import type { DiagnosticIntake, DiagnosticReport, DiseasePrediction } from './types';
import { SYMPTOM_RULES } from './rules';
import { scoreToTier } from '@/lib/utils';

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function symptomScore(intake: DiagnosticIntake): number {
  const base = Math.min(60, intake.symptoms.length * 12);
  const durationBoost = intake.durationHours >= 24 ? 15 : intake.durationHours >= 6 ? 10 : 5;
  const historyBoost = Math.min(15, intake.medicalHistory.length * 4);
  return Math.min(100, base + durationBoost + historyBoost);
}

function ruleBasedDiseases(intake: DiagnosticIntake): Map<string, number> {
  const scores = new Map<string, number>();
  const selected = new Set(intake.symptoms.map(normalize));

  for (const rule of SYMPTOM_RULES) {
    const matches = rule.symptoms.filter((s) => selected.has(normalize(s))).length;
    if (matches === 0) continue;
    const matchRatio = matches / rule.symptoms.length;
    for (const condition of rule.conditions) {
      const prev = scores.get(condition.name) ?? 0;
      scores.set(condition.name, prev + condition.weight * matchRatio);
    }
  }

  for (const condition of intake.existingConditions) {
    scores.set(condition, (scores.get(condition) ?? 0) + 0.2);
  }

  return scores;
}

function vitalsBoost(intake: DiagnosticIntake): number {
  let boost = 0;
  const v = intake.vitals;
  if (!v) return 0;
  if (v.spo2 !== undefined && v.spo2 < 90) boost += 20;
  if (v.heartRate !== undefined && v.heartRate > 120) boost += 15;
  if (v.bloodPressure !== undefined && v.bloodPressure < 90) boost += 15;
  if (v.respiratoryRate !== undefined && v.respiratoryRate > 24) boost += 10;
  if (v.temperature !== undefined && v.temperature > 100.4) boost += 8;
  return boost;
}

function toRankedList(scores: Map<string, number>): DiseasePrediction[] {
  const max = Math.max(...scores.values(), 0.01);
  return [...scores.entries()]
    .map(([name, raw]) => ({ name, probability: Math.min(0.99, Math.round((raw / max) * 100) / 100) }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

export function runHybridDiseasePrediction(intake: DiagnosticIntake): DiagnosticReport {
  const sScore = symptomScore(intake);
  const vitals = vitalsBoost(intake);
  const aiBoost = intake.aiRiskScore ? intake.aiRiskScore * 0.25 : 0;
  const riskEstimation = Math.min(100, Math.round(sScore * 0.5 + vitals + aiBoost));

  const diseaseScores = ruleBasedDiseases(intake);
  const possibleDiseases = toRankedList(diseaseScores);
  const triageScore = Math.max(riskEstimation, possibleDiseases[0] ? Math.round(possibleDiseases[0].probability * 100) : 0);
  const recommendedTriageLevel = scoreToTier(triageScore) as AlertTier;

  const confidence = Math.min(
    0.92,
    0.45 + possibleDiseases.length * 0.08 + (intake.symptoms.length > 2 ? 0.1 : 0) + (intake.vitals ? 0.08 : 0),
  );

  return {
    symptom_score: sScore,
    risk_estimation: riskEstimation,
    possible_conditions: possibleDiseases.map((d) => d.name),
    recommended_triage_level: recommendedTriageLevel,
    possible_diseases: possibleDiseases,
    model_type: 'hybrid_rules_scoring',
    confidence: Math.round(confidence * 100) / 100,
    note: 'Suggestive diagnosis only, not definitive. Clinical judgment required.',
  };
}
