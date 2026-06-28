import { cn, TIER_COLORS, TIER_LABELS } from '@/lib/utils';
import type { AlertTier } from '@/types';

interface BadgeProps {
  tier?: AlertTier;
  label?: string;
  className?: string;
  pulse?: boolean;
}

export function TierBadge({ tier = 1, label, className, pulse }: BadgeProps) {
  const color = TIER_COLORS[tier];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border',
        pulse && tier >= 4 && 'animate-pulse',
        className,
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}15`,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label ?? `Tier ${tier}`} · {TIER_LABELS[tier]}
    </span>
  );
}

export function DiagnosisTag({ label, className }: { label: string; className?: string }) {
  return (
    <span className={cn('text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-command-muted border border-white/5', className)}>
      {label}
    </span>
  );
}
