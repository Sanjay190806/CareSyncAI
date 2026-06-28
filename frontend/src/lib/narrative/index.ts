export type {
  ClinicalNarrativeOutput,
  DemoStage,
  DemoStagePayload,
  IntelligenceFeedItem,
  NarrativeInput,
  ShiftReportOutput,
  StoryTimelineEntry,
  VitalSnapshot,
} from './types';

export { generateClinicalNarrative, generateCodeRedNarrative } from './engine';
export { PatientStoryEngine, patientStoryEngine } from './patient-story';
export { generateShiftReport } from './shift-report';
export { generateIntelligenceFeed, feedItemFromNarrative } from './intelligence-feed';
export {
  PATIENT_7_DEMO_STAGES,
  buildDemoStagePayload,
  getDemoStageCount,
} from './demo-story';
