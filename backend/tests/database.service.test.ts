import { describe, expect, it } from 'vitest';
import * as db from '../src/services/database.service.js';

describe('database service persistence helpers', () => {
  it('exports the required persistence functions', () => {
    expect(typeof db.saveVitals).toBe('function');
    expect(typeof db.saveRiskAssessment).toBe('function');
    expect(typeof db.saveAlert).toBe('function');
    expect(typeof db.saveAlertAudit).toBe('function');
    expect(typeof db.saveBaselineProfile).toBe('function');
    expect(typeof db.getPatientHistory).toBe('function');
    expect(typeof db.getPatientBaseline).toBe('function');
  });

  it('exposes transaction support', () => {
    expect(typeof db.withTransaction).toBe('function');
  });
});
