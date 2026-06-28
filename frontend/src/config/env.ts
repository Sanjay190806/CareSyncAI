/** Runtime environment configuration — dev/prod switching */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  wsUrl: import.meta.env.VITE_WS_URL ?? '',
  pollIntervalMs: Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 15000),
  mockFallback: import.meta.env.VITE_MOCK_FALLBACK !== 'false',
  isProd: import.meta.env.PROD,
} as const;

export function resolveWsOrigin(): string {
  if (env.wsUrl) return env.wsUrl.replace(/\/ws.*$/, '').replace(/^ws/, 'http');
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3001';
}
