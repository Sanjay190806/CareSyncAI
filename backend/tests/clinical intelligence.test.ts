import { describe, expect, it } from 'vitest';
import { AlertService } from '../src/services/alert.service.js';

describe('clinical intelligence alert suppression', () => {
  it('suppresses duplicate alerts within the cooldown window', () => {
    const service = new AlertService();
    const first = service.evaluate('patient-1', 3, 45);
    const second = service.evaluate('patient-1', 3, 45);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it('allows escalation after a tier change', () => {
    const service = new AlertService();
    service.evaluate('patient-1', 3, 45);
    const escalated = service.evaluate('patient-1', 4, 78);
    expect(escalated).not.toBeNull();
  });
});
