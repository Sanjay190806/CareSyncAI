import { describe, expect, it } from 'vitest';
import { runHybridDiseasePrediction } from '../src/lib/disease-prediction';

describe('Hybrid Disease Prediction', () => {
  it('returns structured report with confidence scores', () => {
    const report = runHybridDiseasePrediction({
      symptoms: ['shortness of breath', 'chest pain', 'fatigue'],
      durationHours: 12,
      age: 68,
      gender: 'M',
      medicalHistory: ['COPD'],
      lifestyleFactors: ['Smoker'],
      existingConditions: ['COPD'],
      vitals: { spo2: 88, heartRate: 118, bloodPressure: 95, respiratoryRate: 26, temperature: 100.1 },
    });

    expect(report.symptom_score).toBeGreaterThan(0);
    expect(report.risk_estimation).toBeGreaterThan(0);
    expect(report.possible_diseases.length).toBeGreaterThan(0);
    expect(report.model_type).toBe('hybrid_rules_scoring');
    expect(report.confidence).toBeGreaterThan(0.5);
    expect(report.note).toMatch(/Suggestive/i);
  });

  it('falls back cleanly when symptoms do not match a disease cluster', () => {
    const report = runHybridDiseasePrediction({
      symptoms: ['abdominal pain'],
      durationHours: 2,
      age: 40,
      gender: 'F',
      medicalHistory: [],
      lifestyleFactors: [],
      existingConditions: [],
    });

    expect(report.possible_diseases).toEqual([]);
    expect(report.possible_conditions).toEqual([]);
    expect(report.recommended_triage_level).toBe(1);
  });

  it('escalates critical vital patterns even with limited symptoms', () => {
    const report = runHybridDiseasePrediction({
      symptoms: ['confusion'],
      durationHours: 8,
      age: 78,
      gender: 'M',
      medicalHistory: ['Heart Failure'],
      lifestyleFactors: [],
      existingConditions: ['Heart Failure'],
      vitals: { spo2: 84, heartRate: 132, bloodPressure: 82, respiratoryRate: 28, temperature: 101.2 },
      aiRiskScore: 90,
    });

    expect(report.risk_estimation).toBeGreaterThanOrEqual(85);
    expect(report.recommended_triage_level).toBe(5);
  });
});
