import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { env } from '@/config/env';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { scoreToTier } from '@/lib/utils';
import type { PatientSnapshot } from '@/types';
import { checkBackendHealth, fetchPatientsSnapshot } from '@/runtime/sync/api-client';
import { realtimeClient } from '@/runtime/sync/websocket-client';

type SyncMode = 'websocket' | 'polling' | 'mock';

interface RealtimeSyncState {
  mode: SyncMode;
  lastSync: string | null;
  backendOnline: boolean;
}

const RealtimeSyncContext = createContext<RealtimeSyncState | null>(null);

export function RealtimeSyncProvider({ children }: { children: ReactNode }) {
  const { patchPatient, pushEvent, setWsStatus } = useCommandCenter();
  const [mode, setMode] = useState<SyncMode>('mock');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);
  const seenAlerts = useRef(new Set<string>());

  useEffect(() => {
    let pollTimer: number | null = null;
    let mounted = true;

    const applyVitalPatch = (payload: Record<string, unknown>) => {
      const patientId = String(payload.patientId ?? '');
      if (!patientId) return;
      const patch: Partial<PatientSnapshot> = { lastUpdated: 'just now' };
      if (payload.spo2 != null) patch.spo2 = Number(payload.spo2);
      if (payload.heartRate != null) patch.heartRate = Number(payload.heartRate);
      if (payload.bpSys != null) patch.bloodPressure = Number(payload.bpSys);
      if (payload.respiratoryRate != null) patch.respiratoryRate = Number(payload.respiratoryRate);
      if (payload.temperature != null) patch.temperature = Number(payload.temperature);
      if (payload.riskVelocity != null) patch.riskVelocity = Number(payload.riskVelocity);
      if (payload.risk_velocity != null) patch.riskVelocity = Number(payload.risk_velocity);
      if (payload.triageScore != null) patch.triageScore = Number(payload.triageScore);
      if (payload.triage_score != null) patch.triageScore = Number(payload.triage_score);
      if (payload.urgencyRank != null) patch.urgencyRank = Number(payload.urgencyRank);
      if (payload.urgency_rank != null) patch.urgencyRank = Number(payload.urgency_rank);
      if (payload.clinicalReasoning && typeof payload.clinicalReasoning === 'object') {
        patch.clinicalReasoning = payload.clinicalReasoning as PatientSnapshot['clinicalReasoning'];
      }
      patchPatient(patientId, patch);
    };

    const applyRiskPatch = (payload: Record<string, unknown>) => {
      const patientId = String(payload.patientId ?? '');
      const score = Number(payload.crisisProbabilityScore ?? payload.riskScore ?? 0);
      if (!patientId || !score) return;
      patchPatient(patientId, {
        riskScore: score,
        tier: scoreToTier(score),
        trend: payload.trendDirection === 'deteriorating' ? 'down' : payload.trendDirection === 'improving' ? 'up' : 'flat',
        riskVelocity: payload.riskVelocity != null ? Number(payload.riskVelocity) : payload.risk_velocity != null ? Number(payload.risk_velocity) : undefined,
        trendType: String(payload.trendType ?? payload.trend_type ?? 'stable') as PatientSnapshot['trendType'],
        urgencyBoost: payload.urgencyBoost != null ? Number(payload.urgencyBoost) : payload.urgency_boost != null ? Number(payload.urgency_boost) : undefined,
        prediction10Min: (payload.prediction10Min ?? payload.prediction_10min) as PatientSnapshot['prediction10Min'],
        triageScore: payload.triageScore != null ? Number(payload.triageScore) : payload.triage_score != null ? Number(payload.triage_score) : undefined,
        urgencyRank: payload.urgencyRank != null ? Number(payload.urgencyRank) : payload.urgency_rank != null ? Number(payload.urgency_rank) : undefined,
        clinicalReasoning: (payload.clinicalReasoning ?? payload.clinical_reasoning) as PatientSnapshot['clinicalReasoning'],
        lastUpdated: 'just now',
      });
    };

    const applyAlert = (payload: Record<string, unknown>) => {
      const id = String(payload.id ?? `${payload.patientId}-${payload.tier}-${payload.timestamp}`);
      if (seenAlerts.current.has(id)) return;
      seenAlerts.current.add(id);
      if (Number(payload.tier) >= 5) {
        pushEvent({
          type: 'tier',
          title: 'CODE RED triggered',
          detail: `Patient ${payload.patientId} — Tier 5 alert`,
          timestamp: 'just now',
          patientId: String(payload.patientId),
          tier: 5,
        });
      }
    };

    const poll = async () => {
      try {
        await fetchPatientsSnapshot();
        setLastSync(new Date().toLocaleTimeString());
      } catch {
        if (env.mockFallback) setMode('mock');
      }
    };

    const start = async () => {
      const online = await checkBackendHealth();
      if (!mounted) return;
      setBackendOnline(online);
      if (!online) {
        setMode('mock');
        setWsStatus('DISCONNECTED');
        return;
      }

      realtimeClient.connect({
        onConnect: () => {
          setMode('websocket');
          setWsStatus('LIVE');
          setLastSync(new Date().toLocaleTimeString());
        },
        onDisconnect: () => {
          setMode('polling');
          setWsStatus('DISCONNECTED');
        },
        onVitals: (p) => applyVitalPatch(p as Record<string, unknown>),
        onRisk: (p) => applyRiskPatch(p as Record<string, unknown>),
        onAlert: (p) => applyAlert(p as Record<string, unknown>),
      });

      pollTimer = window.setInterval(() => {
        if (!realtimeClient.isConnected()) {
          setMode('polling');
          void poll();
        }
      }, env.pollIntervalMs);
    };

    void start();

    return () => {
      mounted = false;
      realtimeClient.disconnect();
      if (pollTimer) window.clearInterval(pollTimer);
    };
  }, [patchPatient, pushEvent, setWsStatus]);

  const value = useMemo(
    () => ({ mode, lastSync, backendOnline }),
    [mode, lastSync, backendOnline],
  );

  return <RealtimeSyncContext.Provider value={value}>{children}</RealtimeSyncContext.Provider>;
}

export function useRealtimeSync() {
  const ctx = useContext(RealtimeSyncContext);
  if (!ctx) throw new Error('useRealtimeSync must be used within RealtimeSyncProvider');
  return ctx;
}
