import type { AlertTier } from '@/types';
import type { ClinicalNarrativeOutput, DeviationSnapshot, NarrativeInput, TrendDirection } from './types';
import { clinicalImpact, vitalLabel } from './vital-labels';

function normalizeTrend(trend: NarrativeInput['trend']): TrendDirection {
  if (trend === 'up' || trend === 'improving') return 'improving';
  if (trend === 'down' || trend === 'deteriorating') return 'deteriorating';
  return 'stable';
}

function computeDeviations(input: NarrativeInput): DeviationSnapshot[] {
  if (input.deviations?.length) return input.deviations;
  if (!input.baseline) return [];

  const pairs: [keyof typeof input.vitals, string][] = [
    ['spo2', 'spo2'],
    ['heartRate', 'heartRate'],
    ['bloodPressure', 'bloodPressure'],
    ['respiratoryRate', 'respiratoryRate'],
    ['temperature', 'temperature'],
  ];

  return pairs.map(([vitalKey, vitalName]) => {
    const current = input.vitals[vitalKey] as number;
    const mean = input.baseline![vitalKey] as number;
    const stdDev = vitalKey === 'spo2' ? 1.5 : vitalKey === 'heartRate' ? 8 : vitalKey === 'temperature' ? 0.4 : 3;
    const sigma = stdDev > 0 ? (current - mean) / stdDev : 0;
    return { vital: vitalName, sigma: Math.round(sigma * 10) / 10, currentValue: current, baselineMean: mean };
  });
}

function formatSigma(sigma: number): string {
  const sign = sigma >= 0 ? '+' : '';
  return `${sign}${sigma.toFixed(1)}σ`;
}

function describeChange(dev: DeviationSnapshot): string {
  const direction = dev.sigma < 0 ? 'decline' : dev.sigma > 0 ? 'elevation' : 'shift';
  return `${direction} in ${vitalLabel(dev.vital)} (${formatSigma(dev.sigma)} below baseline)`;
}

function buildWhatChanged(deviations: DeviationSnapshot[], input: NarrativeInput): string {
  const significant = deviations
    .filter((d) => Math.abs(d.sigma) >= 1.2)
    .sort((a, b) => Math.abs(b.sigma) - Math.abs(a.sigma));

  if (significant.length === 0) {
    return `Vitals remain near personalized baseline with risk score at ${input.riskScore}.`;
  }

  const primary = significant[0];
  const secondary = significant.slice(1, 2);
  let text = `Patient shows ${describeChange(primary).replace(' below baseline', ' from personalized baseline')}`;
  if (Math.abs(primary.sigma) >= 2.0) {
    text += `, indicating ${clinicalImpact(primary.vital)}`;
  }
  if (secondary.length > 0) {
    text += `. Concurrent ${vitalLabel(secondary[0].vital)} change (${formatSigma(secondary[0].sigma)}) noted`;
  }
  if (input.correlationPatterns?.includes('SpO2_Decrease_HR_Increase')) {
    text += '. Compensatory tachycardia pattern detected alongside hypoxia';
  }
  return `${text}.`;
}

function buildTrendInterpretation(trend: TrendDirection, input: NarrativeInput): string {
  const prev = input.previousRiskScore;
  const delta = prev !== undefined ? input.riskScore - prev : 0;

  if (trend === 'deteriorating') {
    const accel = delta >= 8 ? 'accelerating deterioration' : delta >= 3 ? 'progressive worsening' : 'early deterioration';
    return `Trend analysis shows ${accel} over the monitoring window${delta > 0 ? ` with risk score rising ${delta} points` : ''}.`;
  }
  if (trend === 'improving') {
    return `Trend analysis indicates improving physiology${delta < 0 ? ` with risk score decreasing ${Math.abs(delta)} points` : ''}, consistent with recovery or effective intervention.`;
  }
  return `Trend remains stable with no significant acceleration in deviation magnitude${delta !== 0 ? `; risk score ${delta > 0 ? 'increased' : 'decreased'} marginally (${Math.abs(delta)} pts)` : ''}.`;
}

function buildRiskExplanation(input: NarrativeInput, deviations: DeviationSnapshot[]): string {
  const factors = deviations.filter((d) => Math.abs(d.sigma) >= 2.0).map((d) => vitalLabel(d.vital));
  const factorText = factors.length > 0 ? factors.join(' + ') : 'multi-vital pattern';
  const prev = input.previousRiskScore;
  const delta = prev !== undefined ? input.riskScore - prev : 0;

  let explanation = `Overall risk at ${input.riskScore}/100 (Tier ${input.tier}) driven by combined ${factorText}`;
  if (input.correlationPatterns?.length) {
    explanation += ` with correlation flags: ${input.correlationPatterns.join(', ')}`;
  }
  if (delta !== 0 && prev !== undefined) {
    explanation += `. Risk ${delta > 0 ? 'escalated' : 'decreased'} from ${prev} due to ${delta > 0 ? 'worsening deviation synergy' : 'normalizing vitals'}`;
  }
  return `${explanation}.`;
}

function buildSeverityReasoning(input: NarrativeInput, deviations: DeviationSnapshot[]): string {
  const maxSigma = deviations.reduce((max, d) => Math.max(max, Math.abs(d.sigma)), 0);
  if (input.tier >= 5) {
    return `Life-threatening deviation magnitude (${maxSigma.toFixed(1)}σ) with Tier 5 CODE RED threshold breached — immediate intervention required.`;
  }
  if (input.tier >= 4) {
    return `Critical-tier physiology: ${maxSigma.toFixed(1)}σ deviation exceeds personalized warning envelope; hemodynamic or respiratory compromise likely.`;
  }
  if (input.tier >= 3) {
    return `Watch-tier signal: sustained deviation (${maxSigma.toFixed(1)}σ) warrants increased surveillance and reassessment within minutes.`;
  }
  if (input.tier >= 2) {
    return `Advisory-level change detected; clinically meaningful but within manageable monitoring parameters.`;
  }
  return `Vitals align with established baseline profile; no acute escalation indicated.`;
}

function suggestAction(tier: AlertTier): string {
  switch (tier) {
    case 5:
      return 'Activate CODE RED protocol — mobilize rapid response, secure airway, and prepare ICU escalation.';
    case 4:
      return 'Notify physician and increase monitoring to continuous; prepare escalation pathway.';
    case 3:
      return 'Reassess within 5 minutes; consider diagnostic workup for underlying cause.';
    case 2:
      return 'Continue enhanced observation; document trend for next shift handoff.';
    default:
      return 'Continue routine personalized baseline monitoring.';
  }
}

function computeConfidence(input: NarrativeInput, deviations: DeviationSnapshot[]): number {
  const sigCount = deviations.filter((d) => Math.abs(d.sigma) >= 2.0).length;
  const trend = normalizeTrend(input.trend);
  let confidence = 0.55 + sigCount * 0.08;
  if (trend !== 'stable') confidence += 0.1;
  if (input.tier >= 4) confidence += 0.12;
  if (input.correlationPatterns?.length) confidence += 0.05;
  return Math.min(0.99, Math.round(confidence * 100) / 100);
}

export function generateClinicalNarrative(input: NarrativeInput): ClinicalNarrativeOutput {
  const deviations = computeDeviations(input);
  const trend = normalizeTrend(input.trend);
  const whatChanged = buildWhatChanged(deviations, input);
  const severityReasoning = buildSeverityReasoning(input, deviations);
  const trendInterpretation = buildTrendInterpretation(trend, input);
  const riskExplanation = buildRiskExplanation(input, deviations);

  const narrative = [whatChanged, severityReasoning, trendInterpretation, riskExplanation].join(' ');

  return {
    patient_id: input.patientId,
    narrative,
    severity_reasoning: severityReasoning,
    trend_interpretation: trendInterpretation,
    risk_explanation: riskExplanation,
    confidence: computeConfidence(input, deviations),
    suggested_action: suggestAction(input.tier),
    is_code_red: input.tier >= 5,
  };
}

export function generateCodeRedNarrative(input: NarrativeInput): ClinicalNarrativeOutput {
  const base = generateClinicalNarrative({ ...input, tier: 5 });
  const deviations = computeDeviations(input);
  const worst = deviations.sort((a, b) => Math.abs(b.sigma) - Math.abs(a.sigma))[0];
  const sigmaText = worst ? formatSigma(worst.sigma) : 'critical';

  base.narrative = [
    `CODE RED: Patient demonstrates life-threatening ${worst ? vitalLabel(worst.vital) : 'vital'} depletion (${sigmaText} from personalized baseline)`,
    'with rapidly deteriorating cardiovascular compensation.',
    base.trend_interpretation,
    'Immediate ICU intervention required.',
  ].join(' ');

  base.severity_reasoning = `Emergency escalation justified: Tier 5 threshold crossed with ${sigmaText} deviation and active deterioration pattern.`;
  base.is_code_red = true;
  base.suggested_action = 'Activate CODE RED — rapid response team, airway management, and critical care escalation NOW.';
  base.confidence = Math.min(0.99, base.confidence + 0.05);

  return base;
}
