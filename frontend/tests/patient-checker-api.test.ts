import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, submitDiagnosticIntake } from '../src/runtime/sync/api-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Patient Checker API client', () => {
  it('posts diagnostic intake to the patient-checker endpoint first', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, primaryDiagnosis: 'Pneumonia' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await submitDiagnosticIntake({ symptoms: ['cough'] });

    expect(response).toMatchObject({ success: true, primaryDiagnosis: 'Pneumonia' });
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/patient-checker');
  });

  it('falls back to the legacy diagnostics endpoint on 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: 'missing' }, 404))
      .mockResolvedValueOnce(jsonResponse({ success: true, primaryDiagnosis: 'COPD Exacerbation' }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await submitDiagnosticIntake({ symptoms: ['shortness of breath'] });

    expect(response).toMatchObject({ success: true, primaryDiagnosis: 'COPD Exacerbation' });
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/patient-checker');
    expect(String(fetchMock.mock.calls[1][0])).toBe('/api/diagnostics/check');
  });

  it('throws structured errors with response details', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ message: 'Patient Checker Failed', code: 'PATIENT_CHECKER_FAILED' }, 500));
    vi.stubGlobal('fetch', fetchMock);

    await expect(submitDiagnosticIntake({ symptoms: ['fever'] })).rejects.toMatchObject({
      name: 'ApiRequestError',
      status: 500,
      details: { message: 'Patient Checker Failed', code: 'PATIENT_CHECKER_FAILED' },
    } satisfies Partial<ApiRequestError>);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
