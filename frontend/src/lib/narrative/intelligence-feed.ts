import type { PatientSnapshot } from '@/types';
import type { IntelligenceFeedItem, NarrativeInput } from './types';
import { generateClinicalNarrative } from './engine';

const FEED_TEMPLATES = {
  respiratory_distress: (name: string) => ({
    title: 'Respiratory distress pattern',
    detail: `${name} showing early respiratory distress pattern with SpO₂ deviation from baseline`,
  }),
  recovery: (name: string) => ({
    title: 'Recovery detected',
    detail: `Recovery trend detected in ${name} — risk stabilizing with improving vitals`,
  }),
  hemodynamic: (name: string) => ({
    title: 'Hemodynamic drift',
    detail: `${name} blood pressure trending down — perfusion concern under surveillance`,
  }),
  stabilization: (name: string) => ({
    title: 'Risk stabilization',
    detail: `Risk stabilization observed for ${name} — deviation returning toward baseline envelope`,
  }),
  escalation: (name: string, tier: number) => ({
    title: `Tier ${tier} escalation`,
    detail: `${name} crossed Tier ${tier} threshold — clinical narrative updated`,
  }),
  code_red: (name: string) => ({
    title: 'CODE RED',
    detail: `${name} — life-threatening deterioration detected. Immediate intervention required.`,
  }),
};

export function generateIntelligenceFeed(
  patients: PatientSnapshot[],
  previousScores: Map<string, number> = new Map(),
): IntelligenceFeedItem[] {
  const items: IntelligenceFeedItem[] = [];
  const now = new Date().toISOString();

  for (const patient of patients) {
    const prev = previousScores.get(patient.id);
    const input: NarrativeInput = {
      patientId: patient.id,
      patientName: patient.name,
      diagnosis: patient.diagnosis,
      vitals: patient,
      baseline: patient.baseline,
      trend: patient.trend,
      riskScore: patient.riskScore,
      previousRiskScore: prev,
      tier: patient.tier,
      alertStatus: patient.alerts,
    };

    const narrative = generateClinicalNarrative(input);
    let template: { title: string; detail: string } | null = null;

    if (patient.tier >= 5) {
      template = FEED_TEMPLATES.code_red(patient.name);
    } else if (prev !== undefined && patient.tier > (prev >= 85 ? 5 : prev >= 65 ? 4 : 3)) {
      template = FEED_TEMPLATES.escalation(patient.name, patient.tier);
    } else if (patient.trend === 'up') {
      template = FEED_TEMPLATES.recovery(patient.name);
    } else if (patient.trend === 'down' && patient.tier >= 3) {
      if (/respiratory|copd|pe|pneumonia/i.test(patient.diagnosis)) {
        template = FEED_TEMPLATES.respiratory_distress(patient.name);
      } else if (patient.bloodPressure < 95) {
        template = FEED_TEMPLATES.hemodynamic(patient.name);
      } else {
        template = FEED_TEMPLATES.escalation(patient.name, patient.tier);
      }
    } else if (prev !== undefined && patient.riskScore < prev - 5) {
      template = FEED_TEMPLATES.stabilization(patient.name);
    }

    if (template && (patient.tier >= 3 || patient.trend !== 'flat')) {
      items.push({
        id: `feed-${patient.id}-${now}`,
        title: template.title,
        detail: template.detail,
        severity: patient.tier,
        patientId: patient.id,
        narrativeSnippet: narrative.narrative.slice(0, 160),
        timestamp: 'just now',
      });
    }
  }

  return items
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 8);
}

export function feedItemFromNarrative(
  input: NarrativeInput,
  title: string,
): IntelligenceFeedItem {
  const narrative = generateClinicalNarrative(input);
  return {
    id: `feed-${input.patientId}-${Date.now()}`,
    title,
    detail: narrative.severity_reasoning,
    severity: input.tier,
    patientId: input.patientId,
    narrativeSnippet: narrative.narrative.slice(0, 160),
    timestamp: 'just now',
  };
}
