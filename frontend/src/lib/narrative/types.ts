import type { AlertTier } from '@/types';

export type TrendDirection = 'improving' | 'stable' | 'deteriorating';

export interface VitalSnapshot {
  spo2: number;
  heartRate: number;
  bloodPressure: number;
  respiratoryRate: number;
  temperature: number;
  etco2?: number;
}

export interface DeviationSnapshot {
  vital: string;
  sigma: number;
  currentValue?: number;
  baselineMean?: number;
}

export interface NarrativeInput {
  patientId: string;
  patientName?: string;
  diagnosis?: string;
  vitals: VitalSnapshot;
  baseline?: VitalSnapshot;
  deviations?: DeviationSnapshot[];
  trend: TrendDirection | 'up' | 'down' | 'flat';
  riskScore: number;
  previousRiskScore?: number;
  tier: AlertTier;
  alertStatus?: string[];
  correlationPatterns?: string[];
  timestamp?: string;
}

export interface ClinicalNarrativeOutput {
  patient_id: string;
  narrative: string;
  severity_reasoning: string;
  trend_interpretation: string;
  risk_explanation: string;
  confidence: number;
  suggested_action?: string;
  is_code_red?: boolean;
}

export interface StoryTimelineEntry {
  id: string;
  patientId: string;
  stage: string;
  narrative: string;
  tier: AlertTier;
  riskScore: number;
  timestamp: string;
  eventType: 'baseline' | 'deviation' | 'warning' | 'critical' | 'code_red' | 'recovery';
}

export interface IntelligenceFeedItem {
  id: string;
  title: string;
  detail: string;
  severity: AlertTier;
  patientId: string;
  narrativeSnippet: string;
  timestamp: string;
}

export interface ShiftReportOutput {
  totalPatientsMonitored: number;
  criticalEvents: number;
  codeRedEvents: number;
  topRiskPatients: { patientId: string; name: string; riskScore: number; tier: AlertTier }[];
  averageResponseTimeMs: number;
  majorIncidentsSummary: string;
  narrativeReport: string;
  recoveryCases: number;
}

export type DemoStage =
  | 'stable_baseline'
  | 'early_deviation'
  | 'worsening_oxygen'
  | 'rapid_deterioration'
  | 'code_red'
  | 'intervention_response';

export interface DemoStagePayload {
  stage: DemoStage;
  stageIndex: number;
  patientId: string;
  vitals: VitalSnapshot;
  riskScore: number;
  tier: AlertTier;
  narrative: ClinicalNarrativeOutput;
  storyBeat: string;
  feedItems: IntelligenceFeedItem[];
}
