type LogCategory = 'alert' | 'risk' | 'system' | 'diagnostic';

export function runtimeLog(category: LogCategory, message: string, meta?: Record<string, unknown>): void {
  const entry = {
    ts: new Date().toISOString(),
    category,
    message,
    ...meta,
  };
  console.info(`[runtime:${category}]`, entry);
}
