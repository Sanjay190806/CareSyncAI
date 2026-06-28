import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { criticalAlertManager, type ActiveCodeRedAlert } from '@/runtime/alert-manager';
import { acknowledgeAlert } from '@/runtime/sync/api-client';

interface AlertResponseState {
  activeAlert: ActiveCodeRedAlert | null;
  alarmLevel: 1 | 2 | 3;
  emergencyMode: boolean;
  acknowledge: () => Promise<void>;
}

const AlertResponseContext = createContext<AlertResponseState | null>(null);
const ACKNOWLEDGED_ALARM_COOLDOWN_MS = 60_000;
const GLOBAL_ALARM_HANDOFF_COOLDOWN_MS = 60_000;

export function AlertResponseProvider({ children }: { children: ReactNode }) {
  const { patients, pushEvent } = useCommandCenter();
  const [activeAlert, setActiveAlert] = useState<ActiveCodeRedAlert | null>(null);
  const [alarmLevel, setAlarmLevel] = useState<1 | 2 | 3>(1);

  const acknowledgedUntilRef = useRef<Map<string, number>>(new Map());
  const globalAlarmMutedUntilRef = useRef(0);

  useEffect(() => {
    return criticalAlertManager.subscribe((alert) => {
      setActiveAlert(alert);
      setAlarmLevel(criticalAlertManager.getLevel());
    });
  }, []);

  useEffect(() => {
    const now = Date.now();
    if (globalAlarmMutedUntilRef.current > now) return;
    const codeRed = patients.filter((p) => {
      if (p.tier < 5) return false;
      const acknowledgedUntil = acknowledgedUntilRef.current.get(p.id) ?? 0;
      if (acknowledgedUntil > now) return false;
      acknowledgedUntilRef.current.delete(p.id);
      return true;
    });
    if (codeRed.length === 0) return;
    const worst = [...codeRed].sort((a, b) => (b.triageScore ?? b.riskScore) - (a.triageScore ?? a.riskScore))[0];
    const key = `${worst.id}-${worst.riskScore}`;
    if (criticalAlertManager.getActive()) return;
    criticalAlertManager.trigger({
      alertId: `code-red-${key}`,
      patientId: worst.id,
      patientName: worst.name,
      tier: 5,
    });
  }, [patients]);

  useEffect(() => {
    if (!activeAlert) return;
    const t = window.setInterval(() => setAlarmLevel(criticalAlertManager.getLevel()), 500);
    return () => window.clearInterval(t);
  }, [activeAlert]);

  const acknowledge = useCallback(async () => {
    const prev = criticalAlertManager.acknowledge();
    if (!prev) return;
    const now = Date.now();
    acknowledgedUntilRef.current.set(prev.patientId, now + ACKNOWLEDGED_ALARM_COOLDOWN_MS);
    globalAlarmMutedUntilRef.current = now + GLOBAL_ALARM_HANDOFF_COOLDOWN_MS;
    try {
      await acknowledgeAlert(prev.alertId, prev.patientId);
    } catch {
      /* offline ack still stops alarm locally */
    }
    pushEvent({
      type: 'ack',
      title: 'CODE RED acknowledged',
      detail: `${prev.patientName} — alert resolved by clinician`,
      timestamp: 'just now',
      patientId: prev.patientId,
      tier: 5,
    });
  }, [pushEvent]);

  const value = useMemo(
    () => ({ activeAlert, alarmLevel, emergencyMode: Boolean(activeAlert), acknowledge }),
    [activeAlert, alarmLevel, acknowledge],
  );

  return (
    <AlertResponseContext.Provider value={value}>
      {children}
      <CodeRedOverlay />
    </AlertResponseContext.Provider>
  );
}

export function useAlertResponse() {
  const ctx = useContext(AlertResponseContext);
  if (!ctx) throw new Error('useAlertResponse must be used within AlertResponseProvider');
  return ctx;
}

function CodeRedOverlay() {
  const { activeAlert, alarmLevel, acknowledge } = useAlertResponse();
  if (!activeAlert) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="absolute inset-0 bg-tier-5/20"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: alarmLevel === 3 ? 0.6 : 1.2, repeat: Infinity }}
        />
        <div className="absolute top-0 inset-x-0 pointer-events-auto">
          <motion.div
            className="bg-tier-5 text-white px-6 py-3 flex items-center justify-between shadow-glow-red"
            animate={{ opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
              <div>
                <div className="text-sm font-bold tracking-wider">CODE RED ACTIVE</div>
                <div className="text-xs opacity-90">
                  {activeAlert.patientName} · Alarm Level {alarmLevel}/3 · Acknowledge to silence
                </div>
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={() => void acknowledge()}>
              ACKNOWLEDGE ALERT
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
