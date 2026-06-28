import { describe, expect, it, vi, beforeEach } from 'vitest';
import { VitalIngestionService } from '../src/services/vital-ingestion.service.js';
import { RiskAssessmentService } from '../src/services/risk-assessment.service.js';
import { AlertService } from '../src/services/alert.service.js';
import * as db from '../src/services/database.service.js';

vi.mock('../src/services/database.service.js', async () => {
  const actual = await vi.importActual<typeof import('../src/services/database.service.js')>('../src/services/database.service.js');
  return {
    ...actual,
    saveVitals: vi.fn(),
    saveRiskAssessment: vi.fn(),
    saveAlert: vi.fn(),
    saveAlertAudit: vi.fn(),
    saveBaselineProfile: vi.fn(),
  };
});

describe('live backend persistence integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists vitals during ingestion flow', async () => {
    vi.mocked(db.saveVitals).mockResolvedValue({ id: 'vital-123' });
    const service = new VitalIngestionService();
    const reading = {
      patientId: '11111111-1111-4111-8111-111111111111',
      timestamp: '2026-06-15T00:00:00.000Z',
      heartRate: 80,
      spo2: 96,
      bpSys: 120,
      bpDia: 80,
      bpMap: 93,
      respiratoryRate: 16,
      temperature: 98.4,
      ecgRhythm: 'Normal Sinus',
      etco2: 39,
      bloodGlucose: 100,
      activityLevel: 'Resting',
      fallDetectionStatus: 'Normal',
      ivFlowStatus: 'Normal',
      medicationCompliance: 100,
    };

    await service.insert(reading as any);

    expect(db.saveVitals).toHaveBeenCalled();
  });

  it('persists risk assessments after risk evaluation', async () => {
    vi.mocked(db.saveRiskAssessment).mockResolvedValue({ id: 'risk-1' });
    const service = new RiskAssessmentService();
    await service.evaluate({
      patientId: '11111111-1111-4111-8111-111111111111',
      timestamp: '2026-06-15T00:00:00.000Z',
      baseline: {
        patientId: '11111111-1111-4111-8111-111111111111',
        baseline: undefined as any,
        deviations: [
          { vital: 'spo2', currentValue: 82, baselineMean: 89, baselineStdDev: 1.2, sigmaDeviation: -5.83, isCritical: true },
        ],
      } as any,
    });

    expect(db.saveRiskAssessment).toHaveBeenCalled();
  });

  it('persists alert and audit on escalation', async () => {
    vi.mocked(db.saveAlert).mockResolvedValue({ id: 'alert-1' });
    vi.mocked(db.saveAlertAudit).mockResolvedValue({ id: 'audit-1' });
    const service = new AlertService();
    const first = service.evaluate('11111111-1111-4111-8111-111111111111', 2, 25);
    const second = service.evaluate('11111111-1111-4111-8111-111111111111', 4, 82, { score: 25, tier: 2 });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(db.saveAlert).toHaveBeenCalled();
    expect(db.saveAlertAudit).toHaveBeenCalled();
  });
});
