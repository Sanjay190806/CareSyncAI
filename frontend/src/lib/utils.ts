import { clsx, type ClassValue } from 'clsx';
import type { AlertTier } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const TIER_COLORS: Record<AlertTier, string> = {
  1: '#00CC66',
  2: '#0EA5E9',
  3: '#FBBF24',
  4: '#F97316',
  5: '#EF4444',
};

export const TIER_LABELS: Record<AlertTier, string> = {
  1: 'Stable',
  2: 'Advisory',
  3: 'Watch',
  4: 'Critical',
  5: 'Code Red',
};

export function scoreToTier(score: number): AlertTier {
  if (score >= 85) return 5;
  if (score >= 65) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function getShift(): 'Morning' | 'Night' | 'Emergency' {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 19) return 'Morning';
  return 'Night';
}

export function trendIcon(trend: 'up' | 'down' | 'flat') {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
}
