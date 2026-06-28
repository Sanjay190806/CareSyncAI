import { env } from '@/config/env';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<Response> {
  let lastError: unknown;
  let lastResponse: Response | undefined;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { ...options, signal: AbortSignal.timeout(8000) });
      if (res.ok || res.status < 500) return res;
      lastResponse = res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    if (i < retries - 1) {
      await new Promise((r) => globalThis.setTimeout(r, 500 * (i + 1)));
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError;
}

async function parseErrorResponse(res: Response): Promise<never> {
  const contentType = res.headers.get('content-type') ?? '';
  const details = contentType.includes('application/json') ? await res.json().catch(() => undefined) : await res.text().catch(() => undefined);
  const detailMessage = details && typeof details === 'object' && 'message' in details
    ? String((details as { message?: unknown }).message)
    : typeof details === 'string' && details.trim()
      ? details.trim()
      : `HTTP ${res.status}`;
  throw new ApiRequestError(`Request failed: ${detailMessage}`, res.status, details);
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithRetry(`${env.apiBaseUrl}/health`, {}, 1);
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchPatientsSnapshot(): Promise<unknown[]> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/patients`);
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

export async function fetchPatientTimeline(id: string): Promise<unknown[]> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/patients/${id}/timeline`);
  if (!res.ok) throw new Error('Failed to fetch patient timeline');
  return res.json();
}

export async function createPatientRecord(payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create patient');
  return res.json();
}

export async function updatePatientRecord(id: string, payload: Record<string, unknown>): Promise<unknown> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/patients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update patient');
  return res.json();
}

export async function deletePatientRecord(id: string): Promise<void> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/patients/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete patient');
}

export async function acknowledgeAlert(alertId: string, patientId: string): Promise<void> {
  const res = await fetchWithRetry(`${env.apiBaseUrl}/alerts/${alertId}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId }),
  });
  if (!res.ok) throw new Error('Acknowledge failed');
}

export async function submitDiagnosticIntake(payload: Record<string, unknown>): Promise<unknown> {
  const endpoints = [`${env.apiBaseUrl}/patient-checker`, `${env.apiBaseUrl}/diagnostics/check`];
  let lastError: unknown;

  for (const endpoint of endpoints) {
    try {
      const res = await fetchWithRetry(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) await parseErrorResponse(res);
      return res.json();
    } catch (error) {
      lastError = error;
      if (error instanceof ApiRequestError && error.status && error.status !== 404) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new ApiRequestError('Diagnostic check failed');
}
