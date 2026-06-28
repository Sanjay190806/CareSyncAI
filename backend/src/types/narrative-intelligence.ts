import type { AlertTier, ClinicalNarrative, RiskAssessment, VitalReading } from '../types/index.js';

export interface NarrativeIntelligenceInput {
  patientId: string;
  patientName?: string;
  diagnosis?: string;
  vitals: {
    spo2: number;
    heartRate: number;
    bloodPressure: number;
    respiratoryRate: number;
    temperature: number;
    etco2?: number;
  };
  baseline?: NarrativeIntelligenceInput['vitals'];
  deviations?: { vital: string; sigma: number }[];
  trend: 'improving' | 'stable' | 'deteriorating';
  riskScore: number;
  previousRiskScore?: number;
  tier: AlertTier;
  alertStatus?: string[];
  correlationPatterns?: string[];
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

export interface EnrichedClinicalNarrative extends ClinicalNarrative {
  severityReasoning: string;
  trendInterpretation: string;
  riskExplanation: string;
  confidence: number;
  isCodeRed: boolean;
}

export interface NarrativeWebSocketPayload {
  type: 'narrative:update' | 'narrative:code_red' | 'narrative:feed' | 'narrative:shift';
  patientId?: string;
  narrative?: ClinicalNarrativeOutput;
  feed?: { title: string; detail: string; severity: AlertTier; patientId: string };
  shiftSummary?: string;
  timestamp: string;
}

export interface StoryTimelineEntry {
  patientId: string;
  stage: string;
  narrative: string;
  tier: AlertTier;
  riskScore: number;
  timestamp: string;
  eventType: string;
}

export interface ShiftReportOutput {
  totalPatientsMonitored: number;
  criticalEvents: number;
  codeRedEvents: number;
  narrativeReport: string;
  majorIncidentsSummary: string;
}

export type { RiskAssessment, VitalReading };
