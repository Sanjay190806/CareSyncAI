import type { AlertTier } from '../types/index.js';
import type {
  ClinicalNarrativeOutput,
  EnrichedClinicalNarrative,
  NarrativeWebSocketPayload,
} from '../types/narrative-intelligence.js';

export function formatNarrativeWebSocketEvent(
  enriched: EnrichedClinicalNarrative,
): NarrativeWebSocketPayload {
  const output: ClinicalNarrativeOutput = {
    patient_id: enriched.patientId,
    narrative: enriched.narrative,
    severity_reasoning: enriched.severityReasoning,
    trend_interpretation: enriched.trendInterpretation,
    risk_explanation: enriched.riskExplanation,
    confidence: enriched.confidence,
    suggested_action: enriched.suggestedAction,
    is_code_red: enriched.isCodeRed,
  };

  return {
    type: enriched.isCodeRed ? 'narrative:code_red' : 'narrative:update',
    patientId: enriched.patientId,
    narrative: output,
    timestamp: enriched.generatedAt,
  };
}

export function formatIntelligenceFeedEvent(
  patientId: string,
  title: string,
  detail: string,
  severity: AlertTier,
): NarrativeWebSocketPayload {
  return {
    type: 'narrative:feed',
    patientId,
    feed: { title, detail, severity, patientId },
    timestamp: new Date().toISOString(),
  };
}

export function formatShiftReportEvent(shiftSummary: string): NarrativeWebSocketPayload {
  return {
    type: 'narrative:shift',
    shiftSummary,
    timestamp: new Date().toISOString(),
  };
}
