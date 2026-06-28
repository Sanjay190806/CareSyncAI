import type {
  AlertTier,
  BaselineUpdateResult,
  ClinicalNarrative,
  RiskAssessment,
  VitalReading,
} from '../types/index.js';
import type {
  ClinicalNarrativeOutput,
  EnrichedClinicalNarrative,
  NarrativeIntelligenceInput,
  ShiftReportOutput,
  StoryTimelineEntry,
} from '../types/narrative-intelligence.js';

const VITAL_LABELS: Record<string, string> = {
  spo2: 'oxygen saturation (SpO₂)',
  heartRate: 'heart rate',
  bloodPressure: 'blood pressure',
  respiratoryRate: 'respiratory rate',
  temperature: 'temperature',
  etco2: 'end-tidal CO₂ (EtCO₂)',
};

const CLINICAL_IMPACT: Record<string, string> = {
  spo2: 'acute respiratory stress and hypoxemia risk',
  heartRate: 'cardiovascular compensation or hemodynamic strain',
  bloodPressure: 'perfusion compromise or shock physiology',
  respiratoryRate: 'respiratory distress or ventilatory failure',
  temperature: 'infectious or inflammatory process',
  etco2: 'ventilatory efficiency and airway patency concern',
};

function formatSigma(sigma: number): string {
  return `${sigma >= 0 ? '+' : ''}${sigma.toFixed(1)}σ`;
}

function suggestAction(tier: AlertTier): string {
  if (tier >= 5) return 'Activate CODE RED protocol — mobilize rapid response and ICU escalation.';
  if (tier >= 4) return 'Notify physician and increase monitoring to continuous.';
  if (tier >= 3) return 'Reassess within 5 minutes and continue close observation.';
  if (tier >= 2) return 'Continue enhanced observation.';
  return 'Continue routine personalized baseline monitoring.';
}

export class NarrativeIntelligenceService {
  private storyTimelines = new Map<string, StoryTimelineEntry[]>();
  private lastTier = new Map<string, AlertTier>();
  private lastScore = new Map<string, number>();

  generate(input: NarrativeIntelligenceInput): ClinicalNarrativeOutput {
    const deviations = input.deviations ?? this.inferDeviations(input);
    const significant = deviations.filter((d) => Math.abs(d.sigma) >= 1.2).sort((a, b) => Math.abs(b.sigma) - Math.abs(a.sigma));

    const primary = significant[0];
    const whatChanged = primary
      ? `Patient shows ${primary.sigma < 0 ? 'decline' : 'elevation'} in ${VITAL_LABELS[primary.vital] ?? primary.vital} (${formatSigma(primary.sigma)} from personalized baseline)${Math.abs(primary.sigma) >= 2 ? `, indicating ${CLINICAL_IMPACT[primary.vital] ?? 'physiologic instability'}` : ''}.`
      : `Vitals remain near personalized baseline with risk score at ${input.riskScore}.`;

    const maxSigma = deviations.reduce((m, d) => Math.max(m, Math.abs(d.sigma)), 0);
    const severityReasoning = input.tier >= 5
      ? `Life-threatening deviation magnitude (${maxSigma.toFixed(1)}σ) with Tier 5 CODE RED threshold breached — immediate intervention required.`
      : input.tier >= 4
        ? `Critical-tier physiology: ${maxSigma.toFixed(1)}σ deviation exceeds personalized warning envelope.`
        : input.tier >= 3
          ? `Watch-tier signal: sustained deviation (${maxSigma.toFixed(1)}σ) warrants increased surveillance.`
          : 'Clinically meaningful change within manageable monitoring parameters.';

    const prev = input.previousRiskScore;
    const delta = prev !== undefined ? input.riskScore - prev : 0;
    const trendInterpretation = input.trend === 'deteriorating'
      ? `Trend analysis shows ${delta >= 8 ? 'accelerating deterioration' : 'progressive worsening'}${delta > 0 ? ` with risk score rising ${delta} points` : ''}.`
      : input.trend === 'improving'
        ? `Trend analysis indicates improving physiology${delta < 0 ? ` with risk score decreasing ${Math.abs(delta)} points` : ''}.`
        : `Trend remains stable${delta !== 0 ? `; risk score changed marginally (${Math.abs(delta)} pts)` : ''}.`;

    const factors = deviations.filter((d) => Math.abs(d.sigma) >= 2).map((d) => VITAL_LABELS[d.vital] ?? d.vital);
    const riskExplanation = `Overall risk at ${input.riskScore}/100 (Tier ${input.tier}) driven by ${factors.length ? factors.join(' + ') : 'multi-vital pattern'}${delta !== 0 && prev !== undefined ? `. Risk ${delta > 0 ? 'escalated' : 'decreased'} from ${prev}` : ''}.`;

    const confidence = Math.min(0.99, 0.55 + significant.length * 0.08 + (input.trend !== 'stable' ? 0.1 : 0) + (input.tier >= 4 ? 0.12 : 0));

    const narrative = [whatChanged, severityReasoning, trendInterpretation, riskExplanation].join(' ');

    return {
      patient_id: input.patientId,
      narrative,
      severity_reasoning: severityReasoning,
      trend_interpretation: trendInterpretation,
      risk_explanation: riskExplanation,
      confidence: Math.round(confidence * 100) / 100,
      suggested_action: suggestAction(input.tier),
      is_code_red: input.tier >= 5,
    };
  }

  generateCodeRed(input: NarrativeIntelligenceInput): ClinicalNarrativeOutput {
    const base = this.generate({ ...input, tier: 5 });
    const deviations = input.deviations ?? this.inferDeviations(input);
    const worst = deviations.sort((a, b) => Math.abs(b.sigma) - Math.abs(a.sigma))[0];
    const sigmaText = worst ? formatSigma(worst.sigma) : 'critical';
    base.narrative = `CODE RED: Patient demonstrates life-threatening ${worst ? VITAL_LABELS[worst.vital] : 'vital'} depletion (${sigmaText} from personalized baseline) with rapidly deteriorating cardiovascular compensation. ${base.trend_interpretation} Immediate ICU intervention required.`;
    base.is_code_red = true;
    base.suggested_action = 'Activate CODE RED — rapid response team and critical care escalation NOW.';
    return base;
  }

  enrichFromPipeline(
    vital: VitalReading,
    assessment: RiskAssessment,
    baseline: BaselineUpdateResult,
    previousScore?: number,
  ): EnrichedClinicalNarrative {
    const input = this.buildInput(vital, assessment, baseline, previousScore);
    const output = assessment.tier >= 5 ? this.generateCodeRed(input) : this.generate(input);
    this.recordStory(input, output);

    return {
      patientId: vital.patientId,
      narrative: output.narrative,
      tier: assessment.tier,
      suggestedAction: output.suggested_action,
      generatedAt: assessment.timestamp,
      severityReasoning: output.severity_reasoning,
      trendInterpretation: output.trend_interpretation,
      riskExplanation: output.risk_explanation,
      confidence: output.confidence,
      isCodeRed: Boolean(output.is_code_red),
    };
  }

  toLegacyClinicalNarrative(enriched: EnrichedClinicalNarrative): ClinicalNarrative {
    return {
      patientId: enriched.patientId,
      narrative: enriched.narrative,
      tier: enriched.tier,
      suggestedAction: enriched.suggestedAction,
      generatedAt: enriched.generatedAt,
    };
  }

  generateShiftReport(
    patients: { id: string; name: string; riskScore: number; tier: AlertTier; trend: string; diagnosis?: string }[],
  ): ShiftReportOutput {
    const criticalEvents = patients.filter((p) => p.tier >= 4).length;
    const codeRedEvents = patients.filter((p) => p.tier >= 5).length;
    const worst = [...patients].sort((a, b) => b.riskScore - a.riskScore)[0];

    let narrativeReport = `During the shift, ${patients.length} patients were monitored under personalized baseline intelligence. `;
    if (criticalEvents > 0) {
      narrativeReport += `${criticalEvents} patient(s) entered critical distress states. `;
    }
    if (worst) {
      narrativeReport += `${worst.name} exhibited the most severe deterioration pattern (Tier ${worst.tier}, score ${worst.riskScore}). `;
    }
    narrativeReport += `${patients.filter((p) => p.trend === 'improving').length} recovery case(s) noted.`;

    return {
      totalPatientsMonitored: patients.length,
      criticalEvents,
      codeRedEvents,
      narrativeReport: narrativeReport.trim(),
      majorIncidentsSummary: codeRedEvents > 0
        ? `${codeRedEvents} CODE RED event(s) requiring immediate intervention.`
        : criticalEvents > 0
          ? `${criticalEvents} critical-tier patient(s) under active monitoring.`
          : 'No major critical incidents during this shift.',
    };
  }

  getStoryTimeline(patientId: string): StoryTimelineEntry[] {
    return [...(this.storyTimelines.get(patientId) ?? [])];
  }

  private buildInput(
    vital: VitalReading,
    assessment: RiskAssessment,
    baseline: BaselineUpdateResult,
    previousScore?: number,
  ): NarrativeIntelligenceInput {
    return {
      patientId: vital.patientId,
      vitals: {
        spo2: vital.spo2,
        heartRate: vital.heartRate,
        bloodPressure: vital.bpSys,
        respiratoryRate: vital.respiratoryRate,
        temperature: vital.temperature,
        etco2: vital.etco2,
      },
      baseline: {
        spo2: baseline.baseline.spo2.mean,
        heartRate: baseline.baseline.heartRate.mean,
        bloodPressure: baseline.baseline.bpSys.mean,
        respiratoryRate: baseline.baseline.respiratoryRate.mean,
        temperature: baseline.baseline.temperature.mean,
        etco2: baseline.baseline.etco2.mean,
      },
      deviations: baseline.deviations.map((d) => ({
        vital: d.vital,
        sigma: d.sigmaDeviation,
      })),
      trend: assessment.trendDirection,
      riskScore: assessment.crisisProbabilityScore,
      previousRiskScore: previousScore ?? this.lastScore.get(vital.patientId),
      tier: assessment.tier,
      correlationPatterns: vital.correlationPatterns,
    };
  }

  private inferDeviations(input: NarrativeIntelligenceInput) {
    if (!input.baseline) return [];
    const keys: (keyof NarrativeIntelligenceInput['vitals'])[] = ['spo2', 'heartRate', 'bloodPressure', 'respiratoryRate', 'temperature'];
    return keys.map((key) => {
      const std = key === 'spo2' ? 1.5 : key === 'heartRate' ? 8 : 3;
      const current = input.vitals[key] as number;
      const mean = input.baseline![key] as number;
      return { vital: key, sigma: std > 0 ? (current - mean) / std : 0 };
    });
  }

  private recordStory(input: NarrativeIntelligenceInput, output: ClinicalNarrativeOutput): void {
    const prevTier = this.lastTier.get(input.patientId) ?? 1;
    const timeline = this.storyTimelines.get(input.patientId) ?? [];

    if (timeline.length === 0) {
      timeline.push({
        patientId: input.patientId,
        stage: 'normal_state',
        narrative: 'Baseline stable vitals recorded within personalized profile.',
        tier: 1,
        riskScore: input.riskScore,
        timestamp: new Date().toISOString(),
        eventType: 'baseline',
      });
    }

    if (input.tier > prevTier) {
      timeline.push({
        patientId: input.patientId,
        stage: input.tier >= 5 ? 'code_red' : input.tier >= 4 ? 'critical_escalation' : 'warning_state',
        narrative: output.narrative,
        tier: input.tier,
        riskScore: input.riskScore,
        timestamp: new Date().toISOString(),
        eventType: input.tier >= 5 ? 'code_red' : 'critical',
      });
    } else if (input.trend === 'improving' && input.tier < prevTier) {
      timeline.push({
        patientId: input.patientId,
        stage: 'recovery',
        narrative: output.narrative,
        tier: input.tier,
        riskScore: input.riskScore,
        timestamp: new Date().toISOString(),
        eventType: 'recovery',
      });
    }

    this.lastTier.set(input.patientId, input.tier);
    this.lastScore.set(input.patientId, input.riskScore);
    this.storyTimelines.set(input.patientId, timeline.slice(-20));
  }
}

export const narrativeIntelligenceService = new NarrativeIntelligenceService();
