import type { AlertTier } from '@/types';
import type { DemoStage, DemoStagePayload, NarrativeInput, VitalSnapshot } from './types';
import { generateClinicalNarrative, generateCodeRedNarrative } from './engine';
import { feedItemFromNarrative } from './intelligence-feed';

export interface DemoStageDefinition {
  stage: DemoStage;
  riskScore: number;
  tier: AlertTier;
  vitals: VitalSnapshot;
  trend: NarrativeInput['trend'];
  storyBeat: string;
  alertLabel: string;
}

/** Patient 7 crisis — 6-stage scripted demo sequence */
export const PATIENT_7_DEMO_STAGES: DemoStageDefinition[] = [
  {
    stage: 'stable_baseline',
    riskScore: 12,
    tier: 1,
    vitals: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1, etco2: 38 },
    trend: 'stable',
    storyBeat: 'Baseline stable vitals recorded within personalized profile',
    alertLabel: 'Silent monitoring',
  },
  {
    stage: 'early_deviation',
    riskScore: 32,
    tier: 2,
    vitals: { spo2: 90, heartRate: 96, bloodPressure: 118, respiratoryRate: 18, temperature: 98.4, etco2: 44 },
    trend: 'deteriorating',
    storyBeat: 'Mild oxygen deviation detected — early respiratory compromise',
    alertLabel: 'Advisory',
  },
  {
    stage: 'worsening_oxygen',
    riskScore: 58,
    tier: 3,
    vitals: { spo2: 86, heartRate: 110, bloodPressure: 104, respiratoryRate: 14, temperature: 99.0, etco2: 49 },
    trend: 'deteriorating',
    storyBeat: 'Worsening oxygen levels with rising EtCO₂ — Watch tier escalation',
    alertLabel: 'Watch alert',
  },
  {
    stage: 'rapid_deterioration',
    riskScore: 79,
    tier: 4,
    vitals: { spo2: 82, heartRate: 124, bloodPressure: 88, respiratoryRate: 10, temperature: 99.8, etco2: 56 },
    trend: 'deteriorating',
    storyBeat: 'Rapid deterioration in SpO₂ trend with respiratory depression pattern',
    alertLabel: 'Critical escalation',
  },
  {
    stage: 'code_red',
    riskScore: 91,
    tier: 5,
    vitals: { spo2: 78, heartRate: 140, bloodPressure: 79, respiratoryRate: 8, temperature: 100.2, etco2: 62 },
    trend: 'deteriorating',
    storyBeat: 'CODE RED — acute respiratory failure progression',
    alertLabel: 'Code Red',
  },
  {
    stage: 'intervention_response',
    riskScore: 45,
    tier: 3,
    vitals: { spo2: 92, heartRate: 98, bloodPressure: 102, respiratoryRate: 16, temperature: 99.2, etco2: 46 },
    trend: 'improving',
    storyBeat: 'System recovery — intervention response stabilizing oxygenation',
    alertLabel: 'Post-intervention watch',
  },
];

const BASELINE: VitalSnapshot = {
  spo2: 96,
  heartRate: 78,
  bloodPressure: 128,
  respiratoryRate: 14,
  temperature: 98.1,
  etco2: 38,
};

export function buildDemoStagePayload(
  stageIndex: number,
  patientId = 'p7',
  patientName = 'Patient 07',
): DemoStagePayload | null {
  const def = PATIENT_7_DEMO_STAGES[stageIndex];
  if (!def) return null;

  const previousScore = stageIndex > 0 ? PATIENT_7_DEMO_STAGES[stageIndex - 1].riskScore : def.riskScore;

  const input: NarrativeInput = {
    patientId,
    patientName,
    diagnosis: 'Respiratory Failure',
    vitals: def.vitals,
    baseline: BASELINE,
    trend: def.trend,
    riskScore: def.riskScore,
    previousRiskScore: previousScore,
    tier: def.tier,
    alertStatus: [def.alertLabel],
    correlationPatterns: def.stage !== 'stable_baseline' ? ['SpO2_Decrease_HR_Increase'] : [],
  };

  const narrative = def.tier >= 5
    ? generateCodeRedNarrative(input)
    : generateClinicalNarrative(input);

  const feedItems = [
    feedItemFromNarrative(input, def.stage === 'code_red' ? 'CODE RED' : 'Demo stage update'),
  ];

  if (def.stage === 'intervention_response') {
    feedItems.push({
      id: `feed-recovery-${patientId}`,
      title: 'Recovery detected',
      detail: `${patientName} responding to intervention — risk decreasing`,
      severity: 2,
      patientId,
      narrativeSnippet: narrative.narrative.slice(0, 160),
      timestamp: 'just now',
    });
  }

  return {
    stage: def.stage,
    stageIndex,
    patientId,
    vitals: def.vitals,
    riskScore: def.riskScore,
    tier: def.tier,
    narrative,
    storyBeat: def.storyBeat,
    feedItems,
  };
}

export function getDemoStageCount(): number {
  return PATIENT_7_DEMO_STAGES.length;
}
