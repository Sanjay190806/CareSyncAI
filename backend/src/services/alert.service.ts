import { saveAlert, saveAlertAudit } from './database.service.js';
import type { AlertEvent, AlertTier } from '../types/index.js';

export class AlertService {
  private readonly lastAlerts = new Map<string, { tier: AlertTier; score: number; timestamp: number }>();
  private readonly recoveryCache = new Map<string, number>();
  private readonly alertWriteCache = new Map<string, number>();
  private readonly auditWriteCache = new Map<string, number>();

  evaluate(patientId: string, tier: AlertTier, score: number, baseline?: { score: number; tier: AlertTier }): AlertEvent | null {
    const now = Date.now();
    const previous = this.lastAlerts.get(patientId);
    const shouldSuppressDedup = previous && previous.tier === tier && previous.score === score && now - previous.timestamp < 300000;
    const shouldSuppressRecovery = baseline && baseline.tier === 1 && tier === 1 && this.recoveryCache.get(patientId) === 1;
    const shouldSuppressSameTierPersist = previous && previous.tier === tier && now - previous.timestamp < 300000;

    if (shouldSuppressDedup || shouldSuppressRecovery || shouldSuppressSameTierPersist) {
      console.info('[alert] suppressed', { patientId, tier, reason: shouldSuppressRecovery ? 'recovery' : shouldSuppressDedup ? 'duplicate_event' : 'cooldown' });
      return null;
    }

    this.lastAlerts.set(patientId, { tier, score, timestamp: now });
    this.recoveryCache.set(patientId, tier <= 2 ? 1 : 0);

    const event: AlertEvent = {
      id: `${patientId}-${now}`,
      patientId,
      tier,
      riskScore: score,
      suppressed: false,
      timestamp: new Date(now).toISOString(),
    };

    this.persistAlertEvent(event, previous?.tier);
    return event;
  }

  private persistAlertEvent(event: AlertEvent, previousTier?: AlertTier): void {
    const dedupeKey = `${event.patientId}:${event.tier}:${event.riskScore}:${event.timestamp}`;
    if (this.alertWriteCache.has(dedupeKey)) {
      console.info('[db] skipped duplicate alert write', { patientId: event.patientId });
      return;
    }

    this.alertWriteCache.set(dedupeKey, Date.now());
    void saveAlert({
      patientId: event.patientId,
      tier: event.tier,
      severity: event.tier >= 4 ? 'Critical' : event.tier >= 3 ? 'Warning' : 'Info',
      reason: `Tier ${event.tier} alert generated`,
      recommendedAction: `Respond to tier ${event.tier} deterioration`,
    }).then(() => {
      console.info('[db] saved alert', { patientId: event.patientId, tier: event.tier });
    }).catch((error) => {
      console.error('[db] alert persistence failed', { patientId: event.patientId, error });
    });

    if (typeof previousTier === 'number' && previousTier !== event.tier) {
      this.persistAlertAudit(event.patientId, previousTier, event.tier);
    }
  }

  private persistAlertAudit(patientId: string, oldTier: AlertTier, newTier: AlertTier): void {
    const dedupeKey = `${patientId}:${oldTier}:${newTier}`;
    if (this.auditWriteCache.has(dedupeKey)) {
      console.info('[db] skipped duplicate alert audit write', { patientId });
      return;
    }

    this.auditWriteCache.set(dedupeKey, Date.now());
    void saveAlertAudit({
      patientId,
      oldTier,
      newTier,
      reason: 'Tier change detected',
    }).then(() => {
      console.info('[db] saved alert audit', { patientId, oldTier, newTier });
    }).catch((error) => {
      console.error('[db] alert audit persistence failed', { patientId, error });
    });
  }
}
