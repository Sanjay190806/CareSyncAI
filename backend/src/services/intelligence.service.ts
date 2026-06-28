import type { AlertTier, ClinicalReasoning, DeviationScore, PredictiveForecast } from '../types/index.js';

export interface RiskVelocityState {
  riskVelocity: number;
  trendType: 'stable' | 'worsening' | 'critical_spike' | 'recovering';
  urgencyBoost: number;
}

export class IcuIntelligenceService {
  private readonly previousRiskByPatient = new Map<string, number>();

  evaluateVelocity(patientId: string, currentRiskScore: number): RiskVelocityState {
    const previous = this.previousRiskByPatient.get(patientId) ?? currentRiskScore;
    const riskVelocity = currentRiskScore - previous;
    this.previousRiskByPatient.set(patientId, currentRiskScore);

    const trendType =
      riskVelocity >= 15
        ? 'critical_spike'
        : riskVelocity >= 5
          ? 'worsening'
          : riskVelocity <= -5
            ? 'recovering'
            : 'stable';

    const urgencyBoost = Math.max(
      0,
      Math.min(
        100,
        trendType === 'critical_spike'
          ? 100
          : trendType === 'worsening'
            ? 45 + riskVelocity * 3
            : trendType === 'recovering'
              ? 0
              : riskVelocity * 2,
      ),
    );

    return { riskVelocity, trendType, urgencyBoost };
  }

  forecast(
    currentRiskScore: number,
    riskVelocity: number,
    deviations: DeviationScore[],
  ): PredictiveForecast {
    const byVital = new Map(deviations.map((item) => [item.vital, item]));
    const spo2 = byVital.get('spo2');
    const hr = byVital.get('heartRate') ?? byVital.get('heart_rate');
    const predictedSpo2 = spo2 ? spo2.currentValue - Math.max(0, riskVelocity) * 0.12 - Math.max(0, -spo2.sigmaDeviation) * 0.4 : 96;
    const predictedHr = hr ? hr.currentValue + Math.max(0, riskVelocity) * 0.4 + Math.max(0, hr.sigmaDeviation) * 1.5 : 82;
    const riskForecast = Math.max(0, Math.min(100, currentRiskScore + riskVelocity * 0.9));
    const confidence = Math.max(0.45, Math.min(0.94, 0.58 + Math.abs(riskVelocity) / 85 + deviations.length * 0.03));

    return {
      predictedSpo210Min: Math.round(Math.max(70, Math.min(100, predictedSpo2))),
      predictedHr10Min: Math.round(Math.max(45, Math.min(170, predictedHr))),
      riskForecast10Min: Math.round(riskForecast),
      confidence: Number(confidence.toFixed(2)),
    };
  }

  triageScore(currentRiskScore: number, velocity: RiskVelocityState, prediction: PredictiveForecast): number {
    return Math.round(
      currentRiskScore * 0.5
        + Math.max(0, velocity.riskVelocity) * 1.5 * 0.3
        + prediction.riskForecast10Min * 0.2
        + velocity.urgencyBoost * 0.15,
    );
  }

  reasoning(
    patientId: string,
    riskScore: number,
    tier: AlertTier,
    velocity: RiskVelocityState,
    prediction: PredictiveForecast,
    deviations: DeviationScore[],
  ): ClinicalReasoning {
    const primary = [...deviations].sort((a, b) => Math.abs(b.sigmaDeviation) - Math.abs(a.sigmaDeviation))[0];
    const vital = primary?.vital ?? 'multi-vital pattern';
    const sigma = primary ? `${primary.sigmaDeviation.toFixed(1)}σ` : 'baseline unavailable';
    return {
      basic: `Patient ${patientId} is Tier ${tier} with risk ${riskScore}/100.`,
      clinical: `${vital} is deviating ${sigma} from the personalized baseline.`,
      criticalReasoning: `${velocity.trendType} risk velocity (${velocity.riskVelocity >= 0 ? '+' : ''}${velocity.riskVelocity}) suggests ${velocity.trendType === 'critical_spike' ? 'rapid deterioration' : velocity.trendType === 'recovering' ? 'treatment response' : 'ongoing ICU surveillance need'}.`,
      icuStyleSummary: `10-minute forecast: risk ${prediction.riskForecast10Min}/100, SpO2 ${prediction.predictedSpo210Min}%, HR ${prediction.predictedHr10Min}; ${prediction.riskForecast10Min >= 66 ? 'pre-alert escalation recommended' : 'continue prioritized monitoring'}.`,
    };
  }
}
