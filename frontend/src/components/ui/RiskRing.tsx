import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface RiskRingProps {
  score: number;
  tier: 1 | 2 | 3 | 4 | 5;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const TIER_RING: Record<number, string> = {
  1: '#00CC66',
  2: '#0EA5E9',
  3: '#FBBF24',
  4: '#F97316',
  5: '#EF4444',
};

export function RiskRing({ score, tier, size = 52, strokeWidth = 4, className }: RiskRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = TIER_RING[tier];

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }}>
      {tier >= 4 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `0 0 20px ${color}40` }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className="absolute text-xs font-bold font-mono" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
