import { saveRiskAssessment } from './database.service.js';
import { IcuIntelligenceService } from './intelligence.service.js';
import type { AlertTier, BaselineUpdateResult, ClinicalNarrative, RiskAssessment } from '../types/index.js';

export class RiskAssessmentService {
  private readonly riskWriteCache = new Map<string, number>();
  private readonly intelligence = new IcuIntelligenceService();

  async evaluate(reading: { patientId: string; timestamp: string; correlationPatterns?: string[]; baseline: BaselineUpdateResult }): Promise<{ assessment: RiskAssessment; narrative: ClinicalNarrative }> {
    const deviations = reading.baseline.deviations;
    const score = this.computeWeightedScore(deviations);
    const tier = this.tierForScore(score);
    const trend = this.trendForScore(score, deviations);
    const velocity = this.intelligence.evaluateVelocity(reading.patientId, score);
    const prediction = this.intelligence.forecast(score, velocity.riskVelocity, deviations);
    const triageScore = this.intelligence.triageScore(score, velocity, prediction);
    const reasoning = this.intelligence.reasoning(reading.patientId, score, tier, velocity, prediction, deviations);
    const narrative = this.buildNarrative(reading.patientId, score, tier, deviations, trend, reasoning);

    const assessment: RiskAssessment = {
      patientId: reading.patientId,
      crisisProbabilityScore: score,
      tier,
      trendDirection: trend,
      timestamp: reading.timestamp,
      riskVelocity: velocity.riskVelocity,
      trendType: velocity.trendType,
      urgencyBoost: velocity.urgencyBoost,
      prediction10Min: prediction,
      triageScore,
      clinicalReasoning: reasoning,
    };

    this.persistRiskAssessment(reading.patientId, reading.timestamp, score, tier, trend);

    return { assessment, narrative };
  }

  private computeWeightedScore(deviations: BaselineUpdateResult['deviations']): number {
    const severity = deviations.reduce((total, item) => total + Math.min(30, Math.abs(item.sigmaDeviation) * 6), 0) / Math.max(1, deviations.length);
    const trendFactor = deviations.some((item) => Math.abs(item.sigmaDeviation) >= 3.0) ? 18 : 0;
    const thresholdFactor = deviations.filter((item) => Math.abs(item.sigmaDeviation) >= 2.0).length * 6;
    const anomalyFactor = deviations.filter((item) => item.isCritical).length * 8;
    return Math.min(100, Math.max(0, Math.round(severity * 0.4 + trendFactor * 0.3 + thresholdFactor * 0.2 + anomalyFactor * 0.1)));
  }

  private persistRiskAssessment(patientId: string, timestamp: string, score: number, tier: AlertTier, trend: 'improving' | 'stable' | 'deteriorating'): void {
    const dedupeKey = `${patientId}:${timestamp}:${score}:${tier}`;
    if (this.riskWriteCache.has(dedupeKey)) {
      console.info('[db] skipped duplicate risk write', { patientId, timestamp });
      return;
    }

    this.riskWriteCache.set(dedupeKey, Date.now());
    void saveRiskAssessment({ patientId, timestamp, score, tier, trend }).then(() => {
      console.info('[db] saved risk assessment', { patientId, score, tier });
    }).catch((error) => {
      console.error('[db] risk persistence failed', { patientId, error });
    });
  }

  private tierForScore(score: number): AlertTier {
    if (score >= 86) return 5;
    if (score >= 66) return 4;
    if (score >= 41) return 3;
    if (score >= 21) return 2;
    return 1;
  }

  private trendForScore(score: number, deviations: BaselineUpdateResult['deviations']): 'improving' | 'stable' | 'deteriorating' {
    const maxDeviation = Math.max(...deviations.map((item) => Math.abs(item.sigmaDeviation)), 0);
    if (score >= 70 || maxDeviation >= 3.5) return 'deteriorating';
    if (maxDeviation >= 1.2) return 'stable';
    return 'improving';
  }

  private buildNarrative(
    patientId: string,
    score: number,
    tier: AlertTier,
    deviations: BaselineUpdateResult['deviations'],
    trend: 'improving' | 'stable' | 'deteriorating',
    reasoning?: ClinicalNarrative['reasoning'],
  ): ClinicalNarrative {
    const factors = deviations.filter((item) => Math.abs(item.sigmaDeviation) >= 2.0).map((item) => item.vital).slice(0, 3);
    const summary = factors.length > 0 ? factors.join(', ') : 'multi-vital deviation';
    const trendSummary = trend === 'deteriorating' ? 'rapidly worsening' : trend === 'stable' ? 'stable' : 'improving';
    return {
      patientId,
      narrative: `Patient ${patientId} shows a ${score}% crisis probability with ${summary} deviating from baseline and a ${trendSummary} trend.`,
      tier,
      suggestedAction: this.suggestAction(tier),
      generatedAt: new Date().toISOString(),
      reasoning,
    };
  }

  private suggestAction(tier: AlertTier): string {
    switch (tier) {
      case 5:
        return 'Escalate to rapid response and review airway, breathing, circulation.';
      case 4:
        return 'Notify the care team and increase monitoring frequency.';
      case 3:
        return 'Reassess within 5 minutes and continue close observation.';
      default:
        return 'Continue routine monitoring.';
    }
  }

  private toRiskLevel(tier: AlertTier): 'Stable' | 'Warning' | 'Critical' {
    return tier >= 4 ? 'Critical' : tier >= 3 ? 'Warning' : 'Stable';
  }
}
