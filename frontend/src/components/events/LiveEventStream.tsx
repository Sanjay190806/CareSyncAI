import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Radio,
  TrendingUp,
} from 'lucide-react';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { cn, TIER_COLORS } from '@/lib/utils';
import type { EventType } from '@/types';

const EVENT_ICONS: Record<EventType, typeof Activity> = {
  vitals: Activity,
  alert: AlertTriangle,
  ai: Brain,
  ack: CheckCircle2,
  tier: TrendingUp,
};

const EVENT_COLORS: Record<EventType, string> = {
  vitals: '#0EA5E9',
  alert: '#F97316',
  ai: '#22D3EE',
  ack: '#00CC66',
  tier: '#EF4444',
};

export function LiveEventStream() {
  const { events } = useCommandCenter();

  return (
    <div className="h-16 shrink-0 border-t border-white/[0.08] bg-command-surface/50 backdrop-blur-xl overflow-hidden">
      <div className="h-full flex items-center">
        <div className="shrink-0 px-4 flex items-center gap-2 border-r border-white/[0.06] h-full">
          <Radio className="w-3.5 h-3.5 text-tier-1 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-command-muted whitespace-nowrap">
            Live Feed
          </span>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <motion.div
            className="flex gap-3 px-4 py-2"
            animate={{ x: [0, -8, 0] }}
            transition={{ duration: 0.3 }}
            key={events[0]?.id}
          >
            {events.slice(0, 8).map((event, i) => {
              const Icon = EVENT_ICONS[event.type];
              const color = event.tier ? TIER_COLORS[event.tier] : EVENT_COLORS[event.type];
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1 - i * 0.08, scale: 1 }}
                  className={cn(
                    'shrink-0 flex items-center gap-2.5 px-3 py-1.5 rounded-lg border bg-command-elevated/60 min-w-[220px]',
                  )}
                  style={{ borderColor: `${color}25` }}
                >
                  <div className="p-1 rounded-md" style={{ backgroundColor: `${color}15` }}>
                    <Icon className="w-3 h-3" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium truncate">{event.title}</div>
                    <div className="text-[10px] text-command-muted truncate">{event.detail}</div>
                  </div>
                  <span className="text-[9px] text-command-muted whitespace-nowrap shrink-0">{event.timestamp}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
