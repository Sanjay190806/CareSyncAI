import type { AlertTier } from '@/types';
import type { NarrativeInput, StoryTimelineEntry } from './types';
import { generateClinicalNarrative, generateCodeRedNarrative } from './engine';

const STAGE_THRESHOLDS: { minTier: AlertTier; eventType: StoryTimelineEntry['eventType']; stage: string }[] = [
  { minTier: 1, eventType: 'baseline', stage: 'normal_state' },
  { minTier: 2, eventType: 'deviation', stage: 'early_deviation' },
  { minTier: 3, eventType: 'warning', stage: 'warning_state' },
  { minTier: 4, eventType: 'critical', stage: 'critical_escalation' },
  { minTier: 5, eventType: 'code_red', stage: 'code_red' },
];

export class PatientStoryEngine {
  private timelines = new Map<string, StoryTimelineEntry[]>();
  private lastTier = new Map<string, AlertTier>();

  record(input: NarrativeInput, timestamp = new Date().toISOString()): StoryTimelineEntry[] {
    const narrative = input.tier >= 5
      ? generateCodeRedNarrative(input)
      : generateClinicalNarrative(input);

    const prevTier = this.lastTier.get(input.patientId) ?? 1;
    const timeline = this.timelines.get(input.patientId) ?? [];

    if (timeline.length === 0) {
      timeline.push(this.entry(input, 1, 'baseline', 'normal_state', 'Baseline stable vitals recorded within personalized profile.', timestamp));
    }

    const trend = input.trend === 'up' || input.trend === 'improving' ? 'improving' : input.trend === 'down' || input.trend === 'deteriorating' ? 'deteriorating' : 'stable';

    if (trend === 'improving' && input.tier < prevTier) {
      timeline.push(this.entry(input, input.tier, 'recovery', 'recovery', narrative.narrative, timestamp));
    } else if (input.tier > prevTier) {
      const threshold = STAGE_THRESHOLDS.filter((t) => input.tier >= t.minTier).pop()!;
      timeline.push(this.entry(input, input.tier, threshold.eventType, threshold.stage, narrative.narrative, timestamp));
    } else if (Math.abs((input.previousRiskScore ?? input.riskScore) - input.riskScore) >= 5) {
      timeline.push(this.entry(input, input.tier, 'deviation', 'ongoing_change', narrative.narrative, timestamp));
    }

    this.lastTier.set(input.patientId, input.tier);
    this.timelines.set(input.patientId, timeline.slice(-20));
    return [...timeline];
  }

  getTimeline(patientId: string): StoryTimelineEntry[] {
    return [...(this.timelines.get(patientId) ?? [])];
  }

  getStoryBeats(patientId: string): string[] {
    return this.getTimeline(patientId).map((e) => this.beatLabel(e));
  }

  private beatLabel(entry: StoryTimelineEntry): string {
    switch (entry.eventType) {
      case 'baseline':
        return 'Baseline stable vitals recorded';
      case 'deviation':
        return 'Mild physiologic deviation detected';
      case 'warning':
        return 'Watch-tier escalation triggered';
      case 'critical':
        return 'Critical escalation — rapid deterioration detected';
      case 'code_red':
        return 'CODE RED escalation triggered';
      case 'recovery':
        return 'Recovery trend detected — risk stabilizing';
      default:
        return entry.narrative.slice(0, 80);
    }
  }

  private entry(
    input: NarrativeInput,
    tier: AlertTier,
    eventType: StoryTimelineEntry['eventType'],
    stage: string,
    narrative: string,
    timestamp: string,
  ): StoryTimelineEntry {
    return {
      id: `${input.patientId}-${timestamp}-${eventType}`,
      patientId: input.patientId,
      stage,
      narrative,
      tier,
      riskScore: input.riskScore,
      timestamp,
      eventType,
    };
  }
}

export const patientStoryEngine = new PatientStoryEngine();
