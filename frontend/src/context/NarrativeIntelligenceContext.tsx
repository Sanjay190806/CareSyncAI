import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useCommandCenter } from '@/context/CommandCenterContext';
import type { PatientSnapshot } from '@/types';
import {
  buildDemoStagePayload,
  generateClinicalNarrative,
  generateCodeRedNarrative,
  generateIntelligenceFeed,
  generateShiftReport,
  getDemoStageCount,
  patientStoryEngine,
  type ClinicalNarrativeOutput,
  type IntelligenceFeedItem,
  type ShiftReportOutput,
  type StoryTimelineEntry,
} from '@/lib/narrative';

function patientToNarrativeInput(patient: PatientSnapshot, previousScore?: number) {
  return {
    patientId: patient.id,
    patientName: patient.name,
    diagnosis: patient.diagnosis,
    vitals: {
      spo2: patient.spo2,
      heartRate: patient.heartRate,
      bloodPressure: patient.bloodPressure,
      respiratoryRate: patient.respiratoryRate,
      temperature: patient.temperature,
      etco2: patient.etco2,
    },
    baseline: patient.baseline,
    trend: patient.trend,
    riskScore: patient.riskScore,
    previousRiskScore: previousScore,
    tier: patient.tier,
    alertStatus: patient.alerts,
  };
}

interface NarrativeIntelligenceState {
  narratives: Record<string, ClinicalNarrativeOutput>;
  storyTimelines: Record<string, StoryTimelineEntry[]>;
  intelligenceFeed: IntelligenceFeedItem[];
  shiftReport: ShiftReportOutput;
  selectedNarrative: ClinicalNarrativeOutput | null;
  demoStageIndex: number;
  demoStageRunning: boolean;
  runPatient7NarrativeDemo: () => void;
  getStoryBeats: (patientId: string) => string[];
}

const NarrativeIntelligenceContext = createContext<NarrativeIntelligenceState | null>(null);

export function NarrativeIntelligenceProvider({ children }: { children: ReactNode }) {
  const {
    patients,
    selectedPatientId,
    selectPatient,
    patchPatient,
    pushEvent,
    pushInsight,
    setDemoActive,
    setCrisisRunning,
  } = useCommandCenter();

  const [narratives, setNarratives] = useState<Record<string, ClinicalNarrativeOutput>>({});
  const [storyTimelines, setStoryTimelines] = useState<Record<string, StoryTimelineEntry[]>>({});
  const [intelligenceFeed, setIntelligenceFeed] = useState<IntelligenceFeedItem[]>([]);
  const [demoStageIndex, setDemoStageIndex] = useState(-1);
  const [demoStageRunning, setDemoStageRunning] = useState(false);
  const prevScores = useRef(new Map<string, number>());
  const demoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const nextNarratives: Record<string, ClinicalNarrativeOutput> = {};
    const nextTimelines: Record<string, StoryTimelineEntry[]> = {};

    for (const patient of patients) {
      const input = patientToNarrativeInput(patient, prevScores.current.get(patient.id));
      const output = patient.tier >= 5
        ? generateCodeRedNarrative(input)
        : generateClinicalNarrative(input);
      nextNarratives[patient.id] = output;
      nextTimelines[patient.id] = patientStoryEngine.record(input);
      prevScores.current.set(patient.id, patient.riskScore);
    }

    setNarratives(nextNarratives);
    setStoryTimelines(nextTimelines);
    setIntelligenceFeed(generateIntelligenceFeed(patients, prevScores.current));
  }, [patients]);

  const shiftReport = useMemo(() => generateShiftReport(patients), [patients]);

  const selectedNarrative = useMemo(() => {
    if (selectedPatientId && narratives[selectedPatientId]) {
      return narratives[selectedPatientId];
    }
    const highRisk = [...patients].sort((a, b) => b.riskScore - a.riskScore)[0];
    return highRisk ? narratives[highRisk.id] ?? null : null;
  }, [narratives, patients, selectedPatientId]);

  const applyDemoStage = useCallback(
    (stageIndex: number) => {
      const payload = buildDemoStagePayload(stageIndex);
      if (!payload) return;

      setDemoStageIndex(stageIndex);
      patchPatient(payload.patientId, {
        riskScore: payload.riskScore,
        tier: payload.tier,
        spo2: payload.vitals.spo2,
        heartRate: payload.vitals.heartRate,
        bloodPressure: payload.vitals.bloodPressure,
        respiratoryRate: payload.vitals.respiratoryRate,
        temperature: payload.vitals.temperature,
        etco2: payload.vitals.etco2,
        trend: payload.stage === 'intervention_response' ? 'up' : 'down',
        narrative: payload.narrative.narrative,
        aiBrief: payload.narrative.severity_reasoning,
        suggestedAction: payload.narrative.suggested_action,
        alerts: payload.tier >= 5 ? ['Code Red'] : payload.tier >= 4 ? ['Critical escalation'] : ['Watch alert'],
        history: [
          { label: '10m', score: Math.max(0, payload.riskScore - 18) },
          { label: '20m', score: Math.max(0, payload.riskScore - 8) },
          { label: '30m', score: payload.riskScore },
        ],
      });

      pushEvent({
        type: payload.tier >= 5 ? 'tier' : 'ai',
        title: payload.tier >= 5 ? 'CODE RED' : `Stage ${stageIndex + 1}: ${payload.storyBeat}`,
        detail: payload.narrative.narrative.slice(0, 120),
        timestamp: 'just now',
        patientId: payload.patientId,
        tier: payload.tier,
      });

      for (const feed of payload.feedItems) {
        pushInsight({
          title: feed.title,
          detail: feed.detail,
          severity: feed.severity,
          patientId: feed.patientId,
        });
      }

      selectPatient(payload.patientId);
    },
    [patchPatient, pushEvent, pushInsight, selectPatient],
  );

  const runPatient7NarrativeDemo = useCallback(() => {
    if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
    setDemoActive(true);
    setCrisisRunning(true);
    setDemoStageRunning(true);
    let stage = 0;

    const run = () => {
      applyDemoStage(stage);
      stage += 1;
      if (stage >= getDemoStageCount()) {
        if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
        setDemoStageRunning(false);
        setCrisisRunning(false);
      }
    };

    run();
    demoTimerRef.current = window.setInterval(run, 3000);
  }, [applyDemoStage, setCrisisRunning, setDemoActive]);

  useEffect(() => () => {
    if (demoTimerRef.current) window.clearInterval(demoTimerRef.current);
  }, []);

  const getStoryBeats = useCallback(
    (patientId: string) => patientStoryEngine.getStoryBeats(patientId),
    [storyTimelines],
  );

  const value = useMemo(
    () => ({
      narratives,
      storyTimelines,
      intelligenceFeed,
      shiftReport,
      selectedNarrative,
      demoStageIndex,
      demoStageRunning,
      runPatient7NarrativeDemo,
      getStoryBeats,
    }),
    [
      narratives,
      storyTimelines,
      intelligenceFeed,
      shiftReport,
      selectedNarrative,
      demoStageIndex,
      demoStageRunning,
      runPatient7NarrativeDemo,
      getStoryBeats,
    ],
  );

  return (
    <NarrativeIntelligenceContext.Provider value={value}>
      {children}
    </NarrativeIntelligenceContext.Provider>
  );
}

export function useNarrativeIntelligence() {
  const ctx = useContext(NarrativeIntelligenceContext);
  if (!ctx) throw new Error('useNarrativeIntelligence must be used within NarrativeIntelligenceProvider');
  return ctx;
}
