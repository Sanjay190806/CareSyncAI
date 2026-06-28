import type { Request, Response } from 'express';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let runDiagnosticCheck: typeof import('../src/controllers/runtime.controller.js').runDiagnosticCheck;
let diagnosticsRouter: typeof import('../src/routes/runtime.routes.js').diagnosticsRouter;
let patientCheckerRouter: typeof import('../src/routes/runtime.routes.js').patientCheckerRouter;

beforeAll(async () => {
  process.env.AI_ENGINE_URL = 'http://127.0.0.1:9';
  const controller = await import('../src/controllers/runtime.controller.js');
  const routes = await import('../src/routes/runtime.routes.js');
  runDiagnosticCheck = controller.runDiagnosticCheck;
  diagnosticsRouter = routes.diagnosticsRouter;
  patientCheckerRouter = routes.patientCheckerRouter;
});

describe('Patient Checker route', () => {
  it('returns a structured fallback diagnosis when the AI engine is unavailable', async () => {
    const json = vi.fn();
    const req = {
      body: {
        demographics: { age: 72, gender: 'Male', height: 170, weight: 78 },
        vitals: { spo2: 86, heartRate: 112, bpSys: 124, bpDia: 78, respiratoryRate: 30, temperature: 99, glucose: 120 },
        symptoms: ['shortness of breath', 'cough', 'wheezing'],
        clinicalContext: ['smoker', 'copd'],
      },
      header: () => undefined,
      originalUrl: '/api/patient-checker',
      app: { get: () => undefined },
    } as unknown as Request;
    const res = { json } as unknown as Response;

    await runDiagnosticCheck(req, res);

    expect(json).toHaveBeenCalledOnce();
    const body = json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.primaryDiagnosis).toBeTruthy();
    expect(body.confidence).toBeGreaterThan(0);
    expect(body.riskScore).toBeGreaterThan(0);
    expect(body.differentials).toHaveLength(5);
    expect(body.reasoning).toMatch(/Patient presents|SpO2|respiratory/i);
    expect(body.recommendations.length).toBeGreaterThan(0);
    expect(body.modelUsed).toBe('backend_fallback_diagnostic_engine');
    expect(body.disclaimer).toMatch(/Suggestive diagnosis only/i);
  });

  it('registers the patient-checker route and legacy diagnostics route', () => {
    expect(routerPaths(patientCheckerRouter)).toContain('/');
    expect(routerPaths(patientCheckerRouter)).toContain('/health');
    expect(routerPaths(diagnosticsRouter)).toContain('/check');
    expect(routerPaths(diagnosticsRouter)).toContain('/patient-checker');
  });
});

function routerPaths(router: { stack: Array<{ route?: { path: string } }> }): string[] {
  return router.stack.map((layer) => layer.route?.path).filter((path): path is string => Boolean(path));
}
