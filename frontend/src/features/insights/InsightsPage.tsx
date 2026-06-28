import { Brain, Sparkles } from 'lucide-react';
import { AIIntelligencePanel } from '@/components/ai/AIIntelligencePanel';
import { GlassPanel, TypingText } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { useNarrativeIntelligence } from '@/context/NarrativeIntelligenceContext';
import { TIER_COLORS } from '@/lib/utils';

export function InsightsPage() {
  const { openDrawer, patients } = useCommandCenter();
  const { narratives, storyTimelines, intelligenceFeed } = useNarrativeIntelligence();

  const narrativeList = patients
    .filter((p) => narratives[p.id] && p.tier >= 2)
    .sort((a, b) => b.tier - a.tier)
    .map((p) => ({ patientId: p.id, tier: p.tier, ...narratives[p.id]! }));

  return (
    <div className="h-full flex">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-lg font-bold">AI Insights</h2>
          <p className="text-sm text-command-muted">Clinical reasoning & narrative intelligence</p>
        </div>

        <GlassPanel className="p-4" glow>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-command-glow" />
            <h3 className="text-sm font-semibold">Active Clinical Narratives</h3>
          </div>
          <div className="space-y-3">
            {narrativeList.map((n) => (
              <button
                key={n.patientId}
                type="button"
                onClick={() => openDrawer(n.patientId)}
                className="w-full text-left p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:border-command-glow/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-command-glow" />
                  <span className="text-xs font-medium">{n.patientId.toUpperCase()}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${TIER_COLORS[n.tier as 1|2|3|4|5]}20`, color: TIER_COLORS[n.tier as 1|2|3|4|5] }}>
                    Tier {n.tier}
                  </span>
                  <span className="text-[9px] text-command-muted ml-auto">{Math.round(n.confidence * 100)}% conf.</span>
                </div>
                <TypingText text={n.narrative} className="text-xs text-white/85 leading-relaxed" speed={12} />
                {n.suggested_action && (
                  <p className="mt-2 text-[10px] text-tier-2">→ {n.suggested_action}</p>
                )}
              </button>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-3">Insight Stream</h3>
          <div className="space-y-2">
            {intelligenceFeed.map((insight) => (
              <div key={insight.id} className="p-3 rounded-lg border border-white/[0.05] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TIER_COLORS[insight.severity] }} />
                  <span className="text-sm font-medium">{insight.title}</span>
                </div>
                <p className="text-xs text-command-muted pl-4">{insight.detail}</p>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-command-muted mb-3">Patient Story Timelines</h3>
          {Object.entries(storyTimelines)
            .filter(([, entries]) => entries.length > 1)
            .slice(0, 5)
            .map(([patientId, entries]) => (
              <div key={patientId} className="mb-3 last:mb-0">
                <div className="text-xs font-medium mb-1">{patientId.toUpperCase()}</div>
                <ol className="text-[10px] text-command-muted space-y-0.5 list-decimal list-inside">
                  {entries.map((e) => (
                    <li key={e.id}>{e.narrative.slice(0, 90)}…</li>
                  ))}
                </ol>
              </div>
            ))}
        </GlassPanel>
      </div>

      <AIIntelligencePanel />
    </div>
  );
}
