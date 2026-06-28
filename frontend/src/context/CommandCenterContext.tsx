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
import type {
  CrisisScenario,
  EventItem,
  InsightItem,
  OperationMode,
  PatientSnapshot,
} from '@/types';
import {
  crisisScenarios,
  eventFeed,
  initialPatients,
  insights as initialInsights,
  patient7CrisisSteps,
} from '@/lib/mockData';
import { enrichPatientsWithIcuIntelligence } from '@/lib/icu-intelligence';
import { scoreToTier } from '@/lib/utils';

interface CommandCenterState {
  patients: PatientSnapshot[];
  events: EventItem[];
  insights: InsightItem[];
  selectedPatientId: string | null;
  drawerOpen: boolean;
  wsStatus: 'LIVE' | 'DISCONNECTED';
  operationMode: OperationMode;
  demoActive: boolean;
  crisisRunning: boolean;
  selectPatient: (id: string | null) => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  setOperationMode: (mode: OperationMode) => void;
  triggerCrisis: (scenario: CrisisScenario) => void;
  patchPatient: (id: string, patch: Partial<PatientSnapshot>) => void;
  pushEvent: (event: Omit<EventItem, 'id'>) => void;
  pushInsight: (insight: Omit<InsightItem, 'id'>) => void;
  setDemoActive: (active: boolean) => void;
  setCrisisRunning: (running: boolean) => void;
  setWsStatus: (status: 'LIVE' | 'DISCONNECTED') => void;
  activeAlertsCount: number;
}

const CommandCenterContext = createContext<CommandCenterState | null>(null);

function randomVitalDelta() {
  return Math.random() > 0.5 ? 1 : -1;
}

export function CommandCenterProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<PatientSnapshot[]>(() => enrichPatientsWithIcuIntelligence(initialPatients));
  const [events, setEvents] = useState<EventItem[]>(eventFeed);
  const [insights, setInsights] = useState<InsightItem[]>(initialInsights);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>('p7');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wsStatus, setWsStatus] = useState<'LIVE' | 'DISCONNECTED'>('LIVE');
  const [operationMode, setOperationMode] = useState<OperationMode>('ICU');
  const [demoActive, setDemoActive] = useState(false);
  const [crisisRunning, setCrisisRunning] = useState(false);
  const crisisTimerRef = useRef<number | null>(null);

  const pushEvent = useCallback((event: Omit<EventItem, 'id'>) => {
    setEvents((prev) => [{ ...event, id: `e-${Date.now()}-${Math.random()}` }, ...prev.slice(0, 19)]);
  }, []);

  const pushInsight = useCallback((insight: Omit<InsightItem, 'id'>) => {
    setInsights((prev) => [{ ...insight, id: `i-${Date.now()}` }, ...prev.slice(0, 9)]);
  }, []);

  const updatePatient = useCallback((id: string, patch: Partial<PatientSnapshot>) => {
    setPatients((prev) =>
      enrichPatientsWithIcuIntelligence(
        prev.map((p) => {
          if (p.id !== id) return p;
          const nextScore = patch.riskScore ?? p.riskScore;
          const nextHistory =
            patch.history
            ?? (patch.riskScore != null && patch.riskScore !== p.riskScore
              ? [...p.history.slice(-2), { label: 'now', score: nextScore }]
              : p.history);
          return { ...p, ...patch, history: nextHistory, lastUpdated: 'just now' };
        }),
      ),
    );
  }, []);

  const triggerCrisis = useCallback(
    (scenario: CrisisScenario) => {
      if (crisisTimerRef.current) window.clearInterval(crisisTimerRef.current);

      const config = crisisScenarios[scenario];
      setDemoActive(true);
      setCrisisRunning(true);

      if ('useSequence' in config && config.useSequence) {
        let step = 0;
        const patientId = initialPatients[config.patientIndex].id;

        const runStep = () => {
          if (step >= patient7CrisisSteps.length) {
            setCrisisRunning(false);
            return;
          }
          const s = patient7CrisisSteps[step];
          updatePatient(patientId, {
            riskScore: s.riskScore,
            tier: s.tier,
            spo2: s.spo2,
            etco2: s.etco2,
            respiratoryRate: s.respiratoryRate,
            heartRate: s.heartRate,
            bloodPressure: Math.max(70, 128 - step * 12),
            trend: 'down',
            narrative: s.narrative,
            aiBrief: s.aiBrief,
            alerts: s.tier >= 5 ? ['Code Red'] : s.tier >= 4 ? ['Critical escalation'] : ['Watch alert'],
            history: [
              { label: '10m', score: Math.max(0, s.riskScore - 18) },
              { label: '20m', score: Math.max(0, s.riskScore - 8) },
              { label: '30m', score: s.riskScore },
            ],
          });

          pushEvent({
            type: step === patient7CrisisSteps.length - 1 ? 'tier' : 'alert',
            title: step === patient7CrisisSteps.length - 1 ? 'CODE RED' : `Tier ${s.tier} escalation`,
            detail: `Patient 07 — ${s.narrative}`,
            timestamp: 'just now',
            patientId,
            tier: s.tier,
          });

          pushInsight({
            title: step === patient7CrisisSteps.length - 1 ? 'Critical respiratory failure' : 'Deterioration detected',
            detail: s.aiBrief,
            severity: s.tier,
            patientId,
          });

          setSelectedPatientId(patientId);
          step += 1;
        };

        runStep();
        crisisTimerRef.current = window.setInterval(() => {
          if (step >= patient7CrisisSteps.length) {
            if (crisisTimerRef.current) window.clearInterval(crisisTimerRef.current);
            setCrisisRunning(false);
            return;
          }
          runStep();
        }, 3000);
        return;
      }

      const crisisConfig = config as { patientIndex: number; label: string; spo2Delta: number; hrDelta: number; scoreDelta: number };
      const idx = crisisConfig.patientIndex;
      const patient = initialPatients[idx];
      setPatients((prev) =>
        enrichPatientsWithIcuIntelligence(prev.map((p, i) => {
          if (i !== idx) return p;
          const newScore = Math.min(100, p.riskScore + crisisConfig.scoreDelta);
          const newTier = scoreToTier(newScore);
          return {
            ...p,
            riskScore: newScore,
            tier: newTier,
            spo2: Math.max(70, p.spo2 + crisisConfig.spo2Delta),
            heartRate: p.heartRate + crisisConfig.hrDelta,
            respiratoryRate: p.respiratoryRate + Math.abs(crisisConfig.hrDelta / 5),
            trend: 'down' as const,
            lastUpdated: 'just now',
            narrative: `${crisisConfig.label} simulated — rapid deterioration detected.`,
            aiBrief: `Crisis simulation: ${crisisConfig.label} pattern activated.`,
            alerts: newTier >= 5 ? ['Code Red'] : newTier >= 4 ? ['Critical escalation'] : ['Watch alert'],
          };
        })),
      );

      pushEvent({
        type: 'alert',
        title: `${crisisConfig.label} triggered`,
        detail: `${patient.name} — simulated crisis event`,
        timestamp: 'just now',
        patientId: patient.id,
        tier: scoreToTier(Math.min(100, patient.riskScore + crisisConfig.scoreDelta)),
      });

      setSelectedPatientId(patient.id);
      setTimeout(() => setCrisisRunning(false), 2000);
    },
    [pushEvent, pushInsight, updatePatient],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (demoActive && crisisRunning) return;

      setPatients((current) =>
        enrichPatientsWithIcuIntelligence(current.map((patient, index) => {
          if (Math.random() > 0.35) return patient;
          const hrDelta = randomVitalDelta();
          const spo2Delta = index === 6 && Math.random() > 0.4 ? -1 : randomVitalDelta() * (Math.random() > 0.7 ? 1 : 0);
          const newHr = Math.max(55, Math.min(160, patient.heartRate + hrDelta));
          const newSpo2 = Math.max(75, Math.min(100, patient.spo2 + spo2Delta));
          let scoreDelta = 0;
          if (spo2Delta < 0) scoreDelta += 2;
          if (hrDelta > 0 && patient.tier >= 3) scoreDelta += 1;
          const newScore = Math.max(5, Math.min(100, patient.riskScore + scoreDelta - (scoreDelta === 0 ? 1 : 0)));
          return {
            ...patient,
            heartRate: newHr,
            spo2: newSpo2,
            riskScore: newScore,
            tier: scoreToTier(newScore),
            lastUpdated: 'just now',
          };
        })),
      );

      if (Math.random() > 0.6) {
        const randomPatient = initialPatients[Math.floor(Math.random() * initialPatients.length)];
        pushEvent({
          type: 'vitals',
          title: 'Vitals update',
          detail: `${randomPatient.name} — live stream`,
          timestamp: 'now',
          patientId: randomPatient.id,
        });
      }
    }, 2000);

    return () => window.clearInterval(interval);
  }, [demoActive, crisisRunning, pushEvent]);

  useEffect(() => {
    return () => {
      if (crisisTimerRef.current) window.clearInterval(crisisTimerRef.current);
    };
  }, []);

  const activeAlertsCount = useMemo(
    () => patients.filter((p) => p.tier >= 3).length,
    [patients],
  );

  const value = useMemo<CommandCenterState>(
    () => ({
      patients,
      events,
      insights,
      selectedPatientId,
      drawerOpen,
      wsStatus,
      operationMode,
      demoActive,
      crisisRunning,
      activeAlertsCount,
      selectPatient: setSelectedPatientId,
      openDrawer: (id) => {
        setSelectedPatientId(id);
        setDrawerOpen(true);
      },
      closeDrawer: () => setDrawerOpen(false),
      setOperationMode,
      triggerCrisis,
      patchPatient: updatePatient,
      pushEvent,
      pushInsight,
      setDemoActive,
      setCrisisRunning,
      setWsStatus,
    }),
    [
      patients,
      events,
      insights,
      selectedPatientId,
      drawerOpen,
      wsStatus,
      operationMode,
      demoActive,
      crisisRunning,
      activeAlertsCount,
      triggerCrisis,
      updatePatient,
      pushEvent,
      pushInsight,
    ],
  );

  return (
    <CommandCenterContext.Provider value={value}>{children}</CommandCenterContext.Provider>
  );
}

export function useCommandCenter() {
  const ctx = useContext(CommandCenterContext);
  if (!ctx) throw new Error('useCommandCenter must be used within CommandCenterProvider');
  return ctx;
}
