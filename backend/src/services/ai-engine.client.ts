import { config } from '../config/index.js';
import type { BaselineProfile, BaselineUpdateResult, DiagnosisPrediction, VitalReading } from '../types/index.js';

const AI_ENGINE_TIMEOUT_MS = 8000;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(AI_ENGINE_TIMEOUT_MS);
}

export async function updateBaseline(reading: VitalReading): Promise<BaselineUpdateResult> {
  const response = await fetch(`${config.aiEngineUrl}/api/baseline/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patientId: reading.patientId,
      timestamp: reading.timestamp,
      heartRate: reading.heartRate,
      spo2: reading.spo2,
      bpSys: reading.bpSys,
      bpDia: reading.bpDia,
      respiratoryRate: reading.respiratoryRate,
      temperature: reading.temperature,
      etco2: reading.etco2,
      bloodGlucose: reading.bloodGlucose,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI engine baseline update failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<BaselineUpdateResult>;
}

export async function getBaseline(patientId: string): Promise<BaselineProfile> {
  const response = await fetch(`${config.aiEngineUrl}/api/baseline/${patientId}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI engine baseline fetch failed: ${response.status} ${body}`);
  }
  return response.json() as Promise<BaselineProfile>;
}

export async function persistBaselines(
  patientId: string,
  baseline: BaselineProfile,
): Promise<void> {
  const { query } = await import('./database.service.js');

  const entries: Array<[string, number, number, number]> = [
    ['spo2', baseline.spo2.mean, baseline.spo2.stdDev, baseline.spo2.sampleCount],
    ['heart_rate', baseline.heartRate.mean, baseline.heartRate.stdDev, baseline.heartRate.sampleCount],
    ['bp_sys', baseline.bpSys.mean, baseline.bpSys.stdDev, baseline.bpSys.sampleCount],
    ['bp_dia', baseline.bpDia.mean, baseline.bpDia.stdDev, baseline.bpDia.sampleCount],
    ['respiratory_rate', baseline.respiratoryRate.mean, baseline.respiratoryRate.stdDev, baseline.respiratoryRate.sampleCount],
    ['temperature', baseline.temperature.mean, baseline.temperature.stdDev, baseline.temperature.sampleCount],
    ['glucose', baseline.glucose.mean, baseline.glucose.stdDev, baseline.glucose.sampleCount],
    ['etco2', baseline.etco2.mean, baseline.etco2.stdDev, baseline.etco2.sampleCount],
  ];

  for (const [vitalType, mean, stdDev, sampleCount] of entries) {
    await query(
      `INSERT INTO patient_baselines
         (patient_id, vital_type, baseline_mean, baseline_std_dev, sample_count, window_minutes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (patient_id, vital_type)
       DO UPDATE SET
         baseline_mean = EXCLUDED.baseline_mean,
         baseline_std_dev = EXCLUDED.baseline_std_dev,
         sample_count = EXCLUDED.sample_count,
         updated_at = NOW()`,
      [patientId, vitalType, mean, stdDev, sampleCount, baseline.windowMinutes],
    );
  }
}

export async function predictDiagnosis(payload: Record<string, unknown>): Promise<DiagnosisPrediction> {
  const response = await fetch(`${config.aiEngineUrl}/api/diagnosis/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: timeoutSignal(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI engine diagnosis failed: ${response.status} ${body}`);
  }

  return response.json() as Promise<DiagnosisPrediction>;
}

export async function checkAiEngineHealth(): Promise<Record<string, unknown>> {
  const endpoints = ['/api/patient-checker/health', '/api/health'];
  let lastError = 'AI engine did not respond';

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${config.aiEngineUrl}${endpoint}`, { signal: timeoutSignal() });
      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        return {
          status: 'ok',
          endpoint,
          ...body,
        };
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    status: 'unavailable',
    endpoint: config.aiEngineUrl,
    error: lastError,
  };
}
