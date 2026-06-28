import { motion } from 'framer-motion';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import { GlassPanel, TierBadge } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { alertEvents } from '@/lib/mockData';
import { TIER_COLORS } from '@/lib/utils';
import type { AlertTier } from '@/types';

export function AlertsPage() {
  const { openDrawer } = useCommandCenter();

  const grouped = ([5, 4, 3, 2, 1] as AlertTier[]).map((tier) => ({
    tier,
    alerts: alertEvents.filter((a) => a.tier === tier),
  }));

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div>
        <h2 className="text-lg font-bold">Alerts</h2>
        <p className="text-sm text-command-muted">Grouped by tier · escalation timeline</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {grouped.map(({ tier, alerts }) => (
          <GlassPanel key={tier} className="p-4" glow={tier >= 4}>
            <div className="flex items-center justify-between mb-3">
              <TierBadge tier={tier} />
              <span className="text-xs text-command-muted">{alerts.length} active</span>
            </div>

            {alerts.length === 0 ? (
              <p className="text-xs text-command-muted py-4 text-center">No alerts at this tier</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert, i) => {
                  return (
                    <motion.button
                      key={alert.id}
                      type="button"
                      onClick={() => openDrawer(alert.patientId)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="w-full text-left p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{alert.patientName ?? alert.patientId}</span>
                        <span className="text-xs font-mono font-bold" style={{ color: TIER_COLORS[tier] }}>
                          {alert.riskScore}
                        </span>
                      </div>
                      <p className="text-xs text-command-muted line-clamp-2">{alert.narrative}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-command-muted">{alert.timestamp}</span>
                        {alert.suppressed && (
                          <span className="flex items-center gap-1 text-[10px] text-tier-3">
                            <ShieldOff className="w-3 h-3" />
                            Suppressed
                          </span>
                        )}
                      </div>
                      {alert.suppressionReason && (
                        <p className="text-[10px] text-tier-3/80 mt-1">{alert.suppressionReason}</p>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </GlassPanel>
        ))}
      </div>

      <GlassPanel className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-tier-4" />
          <h3 className="text-sm font-semibold">Escalation Timeline</h3>
        </div>
        <div className="relative pl-4 border-l border-white/10 space-y-4">
          {alertEvents
            .filter((a) => a.tier >= 3)
            .sort((a, b) => b.tier - a.tier)
            .map((alert) => (
              <div key={alert.id} className="relative">
                <div
                  className="absolute -left-[21px] w-2.5 h-2.5 rounded-full border-2 border-command-bg"
                  style={{ backgroundColor: TIER_COLORS[alert.tier] }}
                />
                <div className="text-xs">
                  <span className="font-medium">{alert.patientName}</span>
                  <span className="text-command-muted"> — Tier {alert.tier} at {alert.timestamp}</span>
                </div>
                <p className="text-[10px] text-command-muted mt-0.5">{alert.narrative}</p>
              </div>
            ))}
        </div>
      </GlassPanel>
    </div>
  );
}
