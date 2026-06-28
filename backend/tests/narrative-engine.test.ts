import { describe, expect, it } from 'vitest';
import { NarrativeIntelligenceService } from '../src/services/narrative-intelligence.service.js';

describe('Narrative Intelligence Service', () => {
  const service = new NarrativeIntelligenceService();

  it('generates narrative with deviation trend and risk components', () => {
    const output = service.generate({
      patientId: 'patient-7',
      vitals: { spo2: 82, heartRate: 124, bloodPressure: 88, respiratoryRate: 10, temperature: 99.8, etco2: 56 },
      baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      deviations: [
        { vital: 'spo2', sigma: -2.4 },
        { vital: 'heartRate', sigma: 2.2 },
      ],
      trend: 'deteriorating',
      riskScore: 79,
      previousRiskScore: 58,
      tier: 4,
    });

    expect(output.narrative).toMatch(/σ|baseline|oxygen|heart rate/i);
    expect(output.trend_interpretation).toMatch(/Trend/i);
    expect(output.risk_explanation).toMatch(/79|Tier 4/i);
    expect(output.confidence).toBeGreaterThan(0.5);
  });

  it('activates code red narrative at tier 5', () => {
    const output = service.generateCodeRed({
      patientId: 'patient-7',
      vitals: { spo2: 78, heartRate: 140, bloodPressure: 79, respiratoryRate: 8, temperature: 100.2 },
      baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
      deviations: [{ vital: 'spo2', sigma: -4.1 }],
      trend: 'deteriorating',
      riskScore: 91,
      tier: 5,
    });

    expect(output.is_code_red).toBe(true);
    expect(output.narrative).toMatch(/CODE RED/i);
  });

  it('generates shift report from patient list', () => {
    const report = service.generateShiftReport([
      { id: 'p1', name: 'Patient 01', riskScore: 20, tier: 2, trend: 'stable' },
      { id: 'p7', name: 'Patient 07', riskScore: 91, tier: 5, trend: 'deteriorating', diagnosis: 'Respiratory Failure' },
    ]);

    expect(report.totalPatientsMonitored).toBe(2);
    expect(report.codeRedEvents).toBe(1);
    expect(report.narrativeReport).toMatch(/Patient 07/);
  });
});
