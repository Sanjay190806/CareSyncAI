import { describe, expect, it } from 'vitest';
import {
  generateClinicalNarrative,
  generateCodeRedNarrative,
  generateShiftReport,
  buildDemoStagePayload,
  getDemoStageCount,
  PatientStoryEngine,
  PATIENT_7_DEMO_STAGES,
} from '../src/lib/narrative';
import { initialPatients } from '../src/lib/mockData';

describe('Clinical Narrative Engine', () => {
  it('includes deviation, trend, and risk reason in narrative output', () => {
    const output = generateClinicalNarrative({
      patientId: 'p7',
      patientName: 'Patient 07',
      vitals: { spo2: 82, heartRate: 132, bloodPressure: 79, respiratoryRate: 32, temperature: 100.2, etco2: 62 },
      baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      trend: 'deteriorating',
      riskScore: 92,
      previousRiskScore: 74,
      tier: 5,
      correlationPatterns: ['SpO2_Decrease_HR_Increase'],
    });

    expect(output.narrative.length).toBeGreaterThan(50);
    expect(output.severity_reasoning).toMatch(/σ|Tier|CODE RED|Critical/i);
    expect(output.trend_interpretation).toMatch(/Trend|deteriorat|worsen|improv/i);
    expect(output.risk_explanation).toMatch(/risk|Tier|92/i);
    expect(output.confidence).toBeGreaterThan(0.5);
    expect(output.narrative).toMatch(/σ|baseline|oxygen|SpO/i);
  });

  it('generates CODE RED narrative at tier 5', () => {
    const output = generateCodeRedNarrative({
      patientId: 'p7',
      vitals: { spo2: 78, heartRate: 140, bloodPressure: 79, respiratoryRate: 8, temperature: 100.2 },
      baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      trend: 'deteriorating',
      riskScore: 91,
      tier: 5,
    });

    expect(output.is_code_red).toBe(true);
    expect(output.narrative).toMatch(/CODE RED/i);
    expect(output.suggested_action).toMatch(/CODE RED/i);
  });
});

describe('Patient Story Engine', () => {
  it('maintains ordered continuous timeline', () => {
    const engine = new PatientStoryEngine();
    const base = {
      patientId: 'p7',
      vitals: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      trend: 'stable' as const,
      riskScore: 12,
      tier: 1 as const,
    };

    engine.record(base);
    engine.record({ ...base, riskScore: 32, tier: 2, trend: 'deteriorating', vitals: { ...base.vitals, spo2: 90 } });
    engine.record({ ...base, riskScore: 58, tier: 3, trend: 'deteriorating', vitals: { ...base.vitals, spo2: 86 } });
    engine.record({ ...base, riskScore: 91, tier: 5, trend: 'deteriorating', vitals: { ...base.vitals, spo2: 78, heartRate: 140 } });

    const timeline = engine.getTimeline('p7');
    expect(timeline.length).toBeGreaterThanOrEqual(4);
    expect(timeline[0].eventType).toBe('baseline');
    expect(timeline.at(-1)?.tier).toBeGreaterThanOrEqual(3);
  });
});

describe('Shift Report Generator', () => {
  it('reflects actual simulated patient data', () => {
    const report = generateShiftReport(initialPatients);
    expect(report.totalPatientsMonitored).toBe(initialPatients.length);
    expect(report.criticalEvents).toBe(initialPatients.filter((p) => p.tier >= 4).length);
    expect(report.codeRedEvents).toBe(initialPatients.filter((p) => p.tier >= 5).length);
    expect(report.narrativeReport).toMatch(/shift|monitored/i);
  });
});

describe('Patient 7 Demo Flow', () => {
  it('progresses through all 6 stages with narratives', () => {
    expect(getDemoStageCount()).toBe(6);
    expect(PATIENT_7_DEMO_STAGES.length).toBe(6);

    const stages = Array.from({ length: 6 }, (_, i) => buildDemoStagePayload(i));
    expect(stages.every(Boolean)).toBe(true);
    expect(stages[0]?.stage).toBe('stable_baseline');
    expect(stages[4]?.tier).toBe(5);
    expect(stages[4]?.narrative.is_code_red).toBe(true);
    expect(stages[5]?.stage).toBe('intervention_response');
    expect(stages[5]?.narrative.trend_interpretation).toMatch(/improv/i);
  });
});
