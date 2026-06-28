import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  BellOff,
  Pill,
  AlertTriangle,
  Brain,
  Activity,
  History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button, TierBadge, GlassPanel, TypingText } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useAlertResponse } from '@/runtime/AlertResponseProvider';
import { generateVitalsHistory, narrativeHistory } from '@/lib/mockData';
import { fetchPatientTimeline } from '@/runtime/sync/api-client';
import { TIER_COLORS } from '@/lib/utils';
import type { PatientSnapshot, PatientTimelineItem } from '@/types';

export function PatientDetailDrawer() {
  const { patients, selectedPatientId, drawerOpen, closeDrawer } = useCommandCenter();
  const patient = patients.find((p) => p.id === selectedPatientId);

  return (
    <AnimatePresence>
      {drawerOpen && patient && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
          />
          <motion.aside
            className="fixed top-0 right-0 h-full w-full max-w-xl z-50 flex flex-col bg-command-bg/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <DrawerContent patient={patient} onClose={closeDrawer} />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function DrawerContent({ patient, onClose }: { patient: PatientSnapshot; onClose: () => void }) {
  const { activeAlert, acknowledge } = useAlertResponse();
  const vitalsHistory = generateVitalsHistory(patient);
  const riskHistory = patient.history.map((h) => ({ time: h.label, score: h.score }));
  const patientNarratives = narrativeHistory.filter((n) => n.patientId === patient.id);
  const [timeline, setTimeline] = useState<PatientTimelineItem[]>([]);
  const tierColor = TIER_COLORS[patient.tier];
  const baseline = patient.baseline;
  const isActiveCodeRedPatient = activeAlert?.patientId === patient.id;

  useEffect(() => {
    let cancelled = false;
    void fetchPatientTimeline(patient.id)
      .then((items) => {
        if (!cancelled) setTimeline(items as PatientTimelineItem[]);
      })
      .catch(() => {
        if (!cancelled) setTimeline(mockTimeline(patient));
      });
    return () => {
      cancelled = true;
    };
  }, [patient]);

  return (
    <>
      <div className="p-4 border-b border-white/[0.08] flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-bold">{patient.name}</h2>
            <TierBadge tier={patient.tier} />
          </div>
          <p className="text-sm text-command-muted">
            {patient.age}yo {patient.gender === 'M' ? 'Male' : 'Female'} · {patient.room} · {patient.diagnosis}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isActiveCodeRedPatient && (
            <Button
              variant="danger"
              size="sm"
              className="bg-tier-5 text-white hover:bg-tier-5/90 border-tier-5 shadow-glow-red"
              onClick={() => void acknowledge()}
            >
              <BellOff className="w-3.5 h-3.5" />
              Turn off alarm
            </Button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/5 text-command-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <GlassPanel className="p-4" glow={patient.tier >= 4}>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-command-glow" />
            <span className="text-xs font-semibold uppercase tracking-wider text-command-glow">AI Briefing</span>
          </div>
          <TypingText text={patient.narrative} className="text-sm leading-relaxed text-white/90" />
          {patient.suggestedAction && (
            <p className="mt-3 text-xs text-tier-2 border-l-2 border-tier-2/50 pl-3">
              Suggested: {patient.suggestedAction}
            </p>
          )}
        </GlassPanel>

        {patient.clinicalReasoning && (
          <Section title="Predictive ICU Reasoning" icon={Brain}>
            <div className="grid grid-cols-1 gap-2">
              <ReasoningRow label="Basic" value={patient.clinicalReasoning.basic} />
              <ReasoningRow label="Clinical" value={patient.clinicalReasoning.clinical} />
              <ReasoningRow label="Critical" value={patient.clinicalReasoning.criticalReasoning} highlight />
              <ReasoningRow label="ICU Summary" value={patient.clinicalReasoning.icuStyleSummary} highlight={patient.tier >= 4} />
            </div>
            {patient.prediction10Min && (
              <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                <Metric label="Rank" value={`#${patient.urgencyRank ?? '-'}`} />
                <Metric label="Velocity" value={`${patient.riskVelocity != null && patient.riskVelocity >= 0 ? '+' : ''}${patient.riskVelocity ?? 0}`} />
                <Metric label="10m Risk" value={`${patient.prediction10Min.riskForecast10Min}`} />
                <Metric label="Confidence" value={`${Math.round(patient.prediction10Min.confidence * 100)}%`} />
              </div>
            )}
          </Section>
        )}

        <Section title="Vitals History" icon={Activity}>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vitalsHistory}>
                <defs>
                  <linearGradient id="spo2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="timestamp" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} domain={[70, 100]} />
                <Tooltip
                  contentStyle={{ background: '#121A2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                />
                <Area type="monotone" dataKey="spo2" stroke="#22D3EE" fill="url(#spo2Grad)" strokeWidth={2} name="SpO₂" />
                <Line type="monotone" dataKey="heartRate" stroke="#F97316" strokeWidth={1.5} dot={false} name="HR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {baseline && (
          <Section title="Baseline vs Current">
            <div className="grid grid-cols-2 gap-2">
              <CompareRow label="SpO₂" baseline={baseline.spo2} current={patient.spo2} unit="%" />
              <CompareRow label="Heart Rate" baseline={baseline.heartRate} current={patient.heartRate} unit=" bpm" />
              <CompareRow label="Blood Pressure" baseline={baseline.bloodPressure} current={patient.bloodPressure} unit=" mmHg" />
              <CompareRow label="Resp. Rate" baseline={baseline.respiratoryRate} current={patient.respiratoryRate} unit="/min" />
              <CompareRow label="Temperature" baseline={baseline.temperature} current={patient.temperature} unit="°F" />
            </div>
          </Section>
        )}

        <Section title="Patient Detail Timeline" icon={History}>
          <div className="space-y-2">
            {timeline.map((item) => (
              <div key={item.id} className="grid grid-cols-[80px_1fr] gap-3 p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="text-[10px] text-command-muted">{formatTimelineTime(item.timestamp)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wider text-command-glow">{item.type}</span>
                    <span className="text-xs font-semibold">{item.title}</span>
                  </div>
                  <p className="text-[11px] text-command-muted mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Risk Trend">
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="time" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: '#121A2B', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="score" stroke={tierColor} strokeWidth={2} dot={{ fill: tierColor, r: 4 }} name="Risk Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Section>

        {patientNarratives.length > 0 && (
          <Section title="AI Narrative History" icon={Brain}>
            <div className="space-y-2">
              {patientNarratives.map((n) => (
                <div key={n.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center justify-between mb-1">
                    <TierBadge tier={n.tier} />
                    <span className="text-[10px] text-command-muted">{n.timestamp}</span>
                  </div>
                  <p className="text-xs text-white/80">{n.narrative}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {patient.alerts.length > 0 && (
          <Section title="Alerts History" icon={AlertTriangle}>
            {patient.alerts.map((alert) => (
              <div key={alert} className="flex items-center gap-2 p-2 rounded-lg bg-tier-4/10 border border-tier-4/20 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-tier-4 shrink-0" />
                {alert}
              </div>
            ))}
          </Section>
        )}

        <Section title="Medications & Diagnosis" icon={Pill}>
          <p className="text-xs text-command-muted mb-2">Primary: {patient.diagnosis}</p>
          <div className="flex flex-wrap gap-1.5">
            {(patient.medications ?? []).map((med) => (
              <span key={med} className="text-[10px] px-2 py-1 rounded-md bg-tier-2/10 text-tier-2 border border-tier-2/20">
                {med}
              </span>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}

function ReasoningRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`p-2.5 rounded-lg border text-xs ${highlight ? 'bg-command-glow/10 border-command-glow/20 text-white' : 'bg-white/[0.03] border-white/[0.05] text-white/80'}`}>
      <div className="text-[9px] uppercase tracking-wider text-command-muted mb-1">{label}</div>
      {value}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <div className="text-[9px] uppercase tracking-wider text-command-muted">{label}</div>
      <div className="text-sm font-mono font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <GlassPanel className="p-4">
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 text-command-muted" />}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted">{title}</h3>
      </div>
      {children}
    </GlassPanel>
  );
}

function CompareRow({
  label,
  baseline,
  current,
  unit,
}: {
  label: string;
  baseline: number;
  current: number;
  unit: string;
}) {
  const delta = current - baseline;
  const worsening =
    (label.includes('SpO') || label.includes('Blood Pressure')) ? delta < 0 : delta > 0;

  return (
    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
      <div className="text-[10px] text-command-muted uppercase tracking-wider">{label}</div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-sm font-mono font-semibold">{current}{unit}</span>
        <span className="text-[10px] text-command-muted">base {baseline}{unit}</span>
        {Math.abs(delta) > 0.5 && (
          <span className={`text-[10px] font-medium ${worsening ? 'text-tier-5' : 'text-tier-1'}`}>
            {delta > 0 ? '+' : ''}{label.includes('Temp') ? delta.toFixed(1) : Math.round(delta)}
          </span>
        )}
      </div>
    </div>
  );
}

function mockTimeline(patient: PatientSnapshot): PatientTimelineItem[] {
  const base = new Date();
  const iso = (minutesAgo: number) => new Date(base.getTime() - minutesAgo * 60_000).toISOString();
  return [
    { id: `${patient.id}-admit`, type: 'admission', title: 'Admission created', detail: `${patient.ward ?? 'ICU'} · ${patient.room} · ${patient.bedNumber ?? 'Bed --'}`, timestamp: iso(240) },
    { id: `${patient.id}-risk`, type: 'risk', title: `Risk changed to ${patient.riskScore}`, detail: `Current tier ${patient.tier} with ${patient.baselineStatus ?? 'baseline'} status`, timestamp: iso(30) },
    ...patient.alerts.map((alert, index) => ({ id: `${patient.id}-alert-${index}`, type: 'alert' as const, title: alert, detail: patient.narrative, timestamp: iso(10 - index) })),
    { id: `${patient.id}-vital`, type: 'vital', title: 'Vital event', detail: `SpO2 ${patient.spo2}%, HR ${patient.heartRate}, RR ${patient.respiratoryRate}`, timestamp: iso(3) },
  ];
}

function formatTimelineTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
