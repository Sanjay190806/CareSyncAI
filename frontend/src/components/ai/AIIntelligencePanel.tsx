import { motion } from 'framer-motion';
import { Brain, ChevronRight, Sparkles, TrendingUp } from 'lucide-react';
import { GlassPanel, TierBadge, TypingText } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useNarrativeIntelligence } from '@/context/NarrativeIntelligenceContext';
import { useAlertResponse } from '@/runtime/AlertResponseProvider';
import { TIER_COLORS } from '@/lib/utils';

export function AIIntelligencePanel() {
  const { patients, selectedPatientId, openDrawer } = useCommandCenter();
  const { selectedNarrative, intelligenceFeed, narratives } = useNarrativeIntelligence();
  const { emergencyMode } = useAlertResponse();

  const selected = patients.find((p) => p.id === selectedPatientId) ?? patients.find((p) => p.tier >= 4);
  const narrative = selected ? narratives[selected.id] ?? selectedNarrative : selectedNarrative;
  const topRisk = [...patients].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);
  const feed = intelligenceFeed.length > 0 ? intelligenceFeed : [];

  return (
    <aside className={`w-80 shrink-0 border-l border-white/[0.08] bg-command-surface/30 backdrop-blur-xl flex flex-col overflow-hidden ${emergencyMode ? 'ring-2 ring-tier-5/50' : ''}`}>
      <div className={`p-4 border-b border-white/[0.06] ${emergencyMode ? 'bg-tier-5/10' : ''}`}>
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${emergencyMode ? 'bg-tier-5/20 border-tier-5/40' : 'bg-command-glow/10 border-command-glow/20'}`}>
            <Brain className={`w-4 h-4 ${emergencyMode ? 'text-tier-5' : 'text-command-glow'}`} />
          </div>
          <div>
            <h2 className="text-sm font-bold">{emergencyMode ? 'EMERGENCY MODE' : 'AI Intelligence'}</h2>
            <p className="text-[10px] text-command-muted">{emergencyMode ? 'Code Red active — priority briefing' : 'Clinical reasoning engine'}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selected && narrative && (
          <GlassPanel className="p-3" glow={selected.tier >= 4}>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-command-glow" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-command-glow">AI Briefing</span>
              <TierBadge tier={selected.tier} pulse={narrative.is_code_red} />
              {narrative.is_code_red && (
                <span className="text-[9px] font-bold text-tier-5 uppercase animate-pulse">Code Red</span>
              )}
            </div>
            <p className="text-xs text-command-muted mb-1">{selected.name} · {selected.room}</p>
            <TypingText
              key={`${selected.id}-${narrative.narrative.slice(0, 40)}`}
              text={narrative.narrative}
              className="text-xs leading-relaxed text-white/90"
            />
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
              <InsightLine label="Severity" value={narrative.severity_reasoning.slice(0, 100)} />
              <InsightLine label="Trend" value={narrative.trend_interpretation.slice(0, 100)} />
              <InsightLine label="Risk" value={narrative.risk_explanation.slice(0, 100)} />
              <InsightLine label="Confidence" value={`${Math.round(narrative.confidence * 100)}%`} />
              {narrative.suggested_action && (
                <InsightLine label="Action" value={narrative.suggested_action} highlight />
              )}
            </div>
          </GlassPanel>
        )}

        <GlassPanel className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-tier-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-command-muted">Top Risk Patients</span>
          </div>
          <div className="space-y-1">
            {topRisk.map((p, i) => (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => openDrawer(p.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
                whileHover={{ x: 2 }}
              >
                <span className="text-[10px] font-mono text-command-muted w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{p.name}</div>
                  <div className="text-[10px] text-command-muted">{p.diagnosis}</div>
                </div>
                <span className="text-xs font-mono font-bold" style={{ color: TIER_COLORS[p.tier] }}>
                  {p.riskScore}
                </span>
                <ChevronRight className="w-3 h-3 text-command-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-command-glow" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-command-muted">Clinical Insights Feed</span>
          </div>
          <div className="space-y-2">
            {feed.map((insight, i) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: TIER_COLORS[insight.severity] }} />
                  <span className="text-[10px] font-semibold text-white/90">{insight.title}</span>
                </div>
                <p className="text-[10px] text-command-muted leading-relaxed pl-3.5">{insight.detail}</p>
                <p className="text-[9px] text-command-glow/70 pl-3.5 mt-1 italic line-clamp-2">{insight.narrativeSnippet}</p>
              </motion.div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </aside>
  );
}

function InsightLine({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2 text-[10px]">
      <span className="text-command-muted shrink-0 w-10">{label}</span>
      <span className={highlight ? 'text-tier-2' : 'text-white/80'}>{value}</span>
    </div>
  );
}
