import type { AlertEvent, AlertTier, RiskAssessment } from '../types/index.js';

interface AlertMemory {
  tier: AlertTier;
  riskScore: number;
  timestamp: number;
}

export class AlertSuppressionService {
  private readonly lastAlertByPatient = new Map<string, AlertMemory>();
  private readonly tierCooldownMs = 60_000;
  private readonly escalationWindowMs = 5 * 60_000;

  evaluate(assessment: RiskAssessment): AlertEvent {
    const now = Date.now();
    const previous = this.lastAlertByPatient.get(assessment.patientId);
    const riskVelocity = assessment.riskVelocity ?? 0;
    const worsened = !previous || assessment.tier > previous.tier || assessment.crisisProbabilityScore >= previous.riskScore + 10;
    const spike = riskVelocity >= 15 || assessment.trendType === 'critical_spike';
    const recovering = assessment.trendDirection === 'improving' || assessment.trendType === 'recovering';
    const inCooldown = previous ? now - previous.timestamp < this.tierCooldownMs && assessment.tier <= previous.tier : false;
    const duplicateEscalation = previous ? now - previous.timestamp < this.escalationWindowMs && !worsened && !spike : false;

    let suppressed = false;
    let suppressionReason: string | undefined;

    if (recovering) {
      suppressed = true;
      suppressionReason = 'Recovery suppression: patient trend is improving.';
    } else if (inCooldown) {
      suppressed = true;
      suppressionReason = 'Cooldown suppression: same patient/tier already alerted.';
    } else if (duplicateEscalation) {
      suppressed = true;
      suppressionReason = 'Duplicate clustering: no meaningful worsening since prior alert.';
    }

    if (!suppressed) {
      this.lastAlertByPatient.set(assessment.patientId, {
        tier: assessment.tier,
        riskScore: assessment.crisisProbabilityScore,
        timestamp: now,
      });
    }

    return {
      id: `alert-${assessment.patientId}-${assessment.tier}-${assessment.timestamp}`,
      patientId: assessment.patientId,
      tier: assessment.tier,
      riskScore: assessment.crisisProbabilityScore,
      suppressed,
      suppressionReason,
      timestamp: assessment.timestamp,
    };
  }
}
