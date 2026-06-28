import { AlertService } from './alert.service.js';
import { RiskAssessmentService } from './risk-assessment.service.js';
import { VitalIngestionService } from './vital-ingestion.service.js';
import { narrativeIntelligenceService } from './narrative-intelligence.service.js';
import { formatIntelligenceFeedEvent, formatNarrativeWebSocketEvent } from './narrative-websocket.formatter.js';
import { WebSocketGateway } from '../websocket/gateway.js';
import type { AlertEvent, ClinicalNarrative, Patient, RiskAssessment, VitalReading } from '../types/index.js';
import type { EnrichedClinicalNarrative } from '../types/narrative-intelligence.js';

export class IntegrationService {
  constructor(
    private readonly vitals: VitalIngestionService = new VitalIngestionService(),
    private readonly risk: RiskAssessmentService = new RiskAssessmentService(),
    private readonly alerts: AlertService = new AlertService(),
    private readonly gateway: WebSocketGateway = new WebSocketGateway(),
    private readonly narratives = narrativeIntelligenceService,
  ) {}

  async processVital(reading: VitalReading, patient?: Patient): Promise<{ vital: VitalReading; assessment: RiskAssessment; narrative: ClinicalNarrative; enrichedNarrative: EnrichedClinicalNarrative; alert: AlertEvent | null }> {
    const { vital, baseline } = await this.vitals.ingest(reading);
    const { assessment, narrative: _legacyNarrative } = await this.risk.evaluate({
      patientId: vital.patientId,
      timestamp: vital.timestamp,
      correlationPatterns: vital.correlationPatterns,
      baseline,
    });

    const enrichedNarrative = this.narratives.enrichFromPipeline(vital, assessment, baseline);
    const narrative = this.narratives.toLegacyClinicalNarrative(enrichedNarrative);

    const alert = this.alerts.evaluate(vital.patientId, assessment.tier, assessment.crisisProbabilityScore, {
      score: assessment.crisisProbabilityScore,
      tier: assessment.tier,
    });

    this.gateway.emitVitalUpdate(vital);
    this.gateway.emitRiskUpdate(assessment);
    if (alert) {
      this.gateway.emitAlertUpdate(alert);
    }
    this.gateway.emitNarrative(narrative);
    this.gateway.emitNarrativeIntelligence(formatNarrativeWebSocketEvent(enrichedNarrative));
    if (assessment.tier >= 3) {
      this.gateway.emitNarrativeIntelligence(
        formatIntelligenceFeedEvent(
          vital.patientId,
          enrichedNarrative.isCodeRed ? 'CODE RED' : `Tier ${assessment.tier} clinical update`,
          enrichedNarrative.severityReasoning,
          assessment.tier,
        ),
      );
    }
    if (patient) {
      this.gateway.emitPatientUpdate({ patientId: patient.id, patient });
    }

    return { vital, assessment, narrative, enrichedNarrative, alert };
  }
}
