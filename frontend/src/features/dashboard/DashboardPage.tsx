import { motion } from 'framer-motion';
import { Activity, ArrowUpRight, Gauge } from 'lucide-react';
import { PatientCard } from '@/components/patient/PatientCard';
import { AIIntelligencePanel } from '@/components/ai/AIIntelligencePanel';
import { DemoCrisisPanel } from '@/components/demo/DemoCrisisPanel';
import { GlassPanel } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { TIER_COLORS } from '@/lib/utils';

export function DashboardPage() {
  const { patients, openDrawer } = useCommandCenter();
  const sorted = [...patients].sort((a, b) => (b.triageScore ?? b.riskScore) - (a.triageScore ?? a.riskScore));
  const topQueue = sorted.slice(0, 3);

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-bold">Patient Command Grid</h2>
            <p className="text-[10px] text-command-muted">{patients.length} active monitors · sorted by ICU triage priority</p>
          </div>
          <div className="hidden xl:block w-64">
            <DemoCrisisPanel compact />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <GlassPanel className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-command-glow" />
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-command-glow">ICU Triage Queue</h3>
                  <p className="text-[10px] text-command-muted">Who needs attention first · risk + velocity + forecast</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
              {topQueue.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => openDrawer(patient.id)}
                  className="text-left p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:border-command-glow/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-command-glow/10 text-command-glow">
                        #{patient.urgencyRank ?? '-'}
                      </span>
                      <span className="text-sm font-semibold">{patient.name}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: TIER_COLORS[patient.tier] }}>
                      {patient.triageScore ?? patient.riskScore}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] text-command-muted">
                    <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> Δ {patient.riskVelocity ?? 0}</span>
                    <span>10m risk {patient.prediction10Min?.riskForecast10Min ?? patient.riskScore}</span>
                    <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {patient.trendType ?? 'stable'}</span>
                  </div>
                </button>
              ))}
            </div>
          </GlassPanel>

          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-3"
            layout
          >
            {sorted.map((patient, i) => (
              <motion.div
                key={patient.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <PatientCard patient={patient} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      <AIIntelligencePanel />
    </div>
  );
}
