/**
 * Design tokens — Clinical Command Center theme (Phase 6).
 */
export const theme = {
  colors: {
    background: '#050816',
    surface: '#0A0F1E',
    surfaceElevated: '#121A2B',
    border: 'rgba(255,255,255,0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: '#94A3B8',
    aiGlow: '#22D3EE',
    tier1: '#00CC66',
    tier2: '#0EA5E9',
    tier3: '#FBBF24',
    tier4: '#F97316',
    tier5: '#EF4444',
  },
  typography: {
    sans: 'Inter, system-ui, sans-serif',
    mono: 'JetBrains Mono, ui-monospace, monospace',
  },
  tierColors: {
    1: '#00CC66',
    2: '#0EA5E9',
    3: '#FBBF24',
    4: '#F97316',
    5: '#EF4444',
  } as const,
} as const;
