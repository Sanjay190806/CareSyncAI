import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Brain,
  Clock,
  Users,
  Activity,
} from 'lucide-react';
import { AnimatedCounter, GlassPanel, TierBadge } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useNarrativeIntelligence } from '@/context/NarrativeIntelligenceContext';
import { shiftReportData } from '@/lib/mockData';
import { TIER_COLORS } from '@/lib/utils';

export function ShiftReportPage() {
  const { patients, activeAlertsCount } = useCommandCenter();
  const { shiftReport } = useNarrativeIntelligence();
  const data = shiftReportData;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Shift Report</h2>
        <p className="text-sm text-command-muted">Executive hospital view · current shift summary</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard icon={Users} label="Total Patients" value={shiftReport.totalPatientsMonitored} color="#22D3EE" />
        <MetricCard icon={AlertTriangle} label="Critical Cases" value={shiftReport.criticalEvents} color="#F97316" />
        <MetricCard icon={Activity} label="Code Red" value={shiftReport.codeRedEvents} color="#EF4444" />
        <MetricCard icon={Clock} label="Avg Response" value={Math.round(shiftReport.averageResponseTimeMs / 1000)} suffix="s" color="#FBBF24" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlassPanel className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-3">Alert Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(data.alertsByTier).map(([tier, count]) => {
              const t = Number(tier) as 1|2|3|4|5;
              const pct = (count / data.totalPatients) * 100;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <TierBadge tier={t} />
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: TIER_COLORS[t] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: t * 0.1 }}
                    />
                  </div>
                  <span className="text-xs font-mono w-6 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4" glow>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-command-glow" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-command-glow">AI Shift Summary</h3>
          </div>
          <p className="text-sm leading-relaxed text-white/90">{shiftReport.narrativeReport}</p>
          <p className="text-xs text-command-muted mt-3 border-t border-white/[0.06] pt-3">{shiftReport.majorIncidentsSummary}</p>
        </GlassPanel>
      </div>

      <GlassPanel className="p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-3">Live Unit Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold font-mono text-tier-1"><AnimatedCounter value={patients.filter((p) => p.tier <= 2).length} /></div>
            <div className="text-[10px] text-command-muted uppercase">Stable / Advisory</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-tier-3"><AnimatedCounter value={patients.filter((p) => p.tier === 3).length} /></div>
            <div className="text-[10px] text-command-muted uppercase">Watch</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-tier-4"><AnimatedCounter value={patients.filter((p) => p.tier === 4).length} /></div>
            <div className="text-[10px] text-command-muted uppercase">Critical</div>
          </div>
          <div>
            <div className="text-2xl font-bold font-mono text-tier-5"><AnimatedCounter value={activeAlertsCount} /></div>
            <div className="text-[10px] text-command-muted uppercase">Active Alerts (T3+)</div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  suffix?: string;
  color: string;
}) {
  return (
    <GlassPanel className="p-4">
      <Icon className="w-4 h-4 mb-2" style={{ color }} />
      <div className="text-2xl font-bold font-mono" style={{ color }}>
        <AnimatedCounter value={value} suffix={suffix} />
      </div>
      <div className="text-[10px] text-command-muted uppercase tracking-wider mt-1">{label}</div>
    </GlassPanel>
  );
}
