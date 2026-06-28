import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.databaseUrl });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveVitals(input: {
  patientId: string;
  timestamp: string;
  heartRate: number;
  spo2: number;
  bpSys: number;
  bpDia: number;
  bpMap: number;
  respiratoryRate: number;
  temperature: number;
  ecgRhythm: string;
  etco2: number;
  bloodGlucose: number;
  activityLevel: string;
  fallDetectionStatus: string;
  ivFlowStatus: string;
  medicationCompliance: number;
  correlationPatterns?: string[];
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO vitals (
      patient_id, timestamp, heart_rate, spo2, bp_sys, bp_dia, bp_map,
      respiratory_rate, temperature, ecg_rhythm, etco2, blood_glucose,
      activity_level, fall_detection_status, iv_flow_status, medication_compliance
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING id`,
    [
      input.patientId,
      input.timestamp,
      input.heartRate,
      input.spo2,
      input.bpSys,
      input.bpDia,
      input.bpMap,
      input.respiratoryRate,
      input.temperature,
      input.ecgRhythm,
      input.etco2,
      input.bloodGlucose,
      input.activityLevel,
      input.fallDetectionStatus,
      input.ivFlowStatus,
      input.medicationCompliance,
    ],
  );

  return { id: result.rows[0].id };
}

export async function saveRiskAssessment(input: {
  patientId: string;
  timestamp: string;
  score: number;
  tier: number;
  trend: string;
  narrative?: string;
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO risk_assessments (
      patient_id, timestamp, overall_score, risk_level, ai_score, medical_rule_score, trend_score
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id`,
    [
      input.patientId,
      input.timestamp,
      input.score,
      input.tier >= 4 ? 'Critical' : input.tier >= 3 ? 'Warning' : 'Stable',
      input.score,
      input.score * 0.7,
      input.score * 0.3,
    ],
  );

  await safeAppendPatientAudit(input.patientId, 'risk_escalation', 'risk-engine', {
    score: input.score,
    tier: input.tier,
    trend: input.trend,
  });

  return { id: result.rows[0].id };
}

export async function saveAlert(input: {
  patientId: string;
  tier: number;
  severity: string;
  reason: string;
  recommendedAction: string;
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO alerts (
      patient_id, timestamp, severity, reason, recommended_action, is_acknowledged, tier, risk_score, suppressed, suppression_reason
    ) VALUES ($1, NOW(), $2, $3, $4, FALSE, $5, $6, FALSE, NULL)
    RETURNING id`,
    [input.patientId, input.severity, input.reason, input.recommendedAction, input.tier, input.tier * 20],
  );

  await safeAppendPatientAudit(input.patientId, 'alert_event', 'alert-engine', {
    tier: input.tier,
    severity: input.severity,
    reason: input.reason,
    recommendedAction: input.recommendedAction,
  });

  return { id: result.rows[0].id };
}

export async function saveAlertAudit(input: {
  patientId: string;
  oldTier: number;
  newTier: number;
  reason: string;
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO alert_audit (patient_id, old_tier, new_tier, reason, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id`,
    [input.patientId, input.oldTier, input.newTier, input.reason],
  );

  return { id: result.rows[0].id };
}

export async function appendPatientAudit(
  patientId: string,
  action: string,
  actor: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  await query(
    `INSERT INTO patient_audit_log (patient_id, action, actor, details, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [patientId, action, actor, details],
  );
}

async function safeAppendPatientAudit(
  patientId: string,
  action: string,
  actor: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await appendPatientAudit(patientId, action, actor, details);
  } catch (err) {
    console.error(`[audit] ${action} audit skipped:`, err);
  }
}

export async function saveDiagnosisAssessment(input: {
  patientId?: string | null;
  primaryCondition: string;
  confidence: number;
  severity: string;
  triageLevel: number;
  payload: Record<string, unknown>;
  prediction: Record<string, unknown>;
}): Promise<{ id: string }> {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const patientId = input.patientId && uuidPattern.test(input.patientId) ? input.patientId : null;
  const result = await query<{ id: string }>(
    `INSERT INTO diagnosis_assessments (
       patient_id, primary_condition, confidence, severity, triage_level, payload, prediction
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      patientId,
      input.primaryCondition,
      input.confidence,
      input.severity,
      input.triageLevel,
      input.payload,
      input.prediction,
    ],
  );

  if (patientId) {
    await safeAppendPatientAudit(patientId, 'diagnostic_check', 'patient-checker', {
      primaryCondition: input.primaryCondition,
      confidence: input.confidence,
      severity: input.severity,
      triageLevel: input.triageLevel,
    });
  }

  return { id: result.rows[0].id };
}

export async function saveBaselineProfile(input: {
  patientId: string;
  spo2Mean: number;
  spo2Std: number;
  hrMean: number;
  hrStd: number;
  bpMean: number;
  bpStd: number;
  rrMean: number;
  rrStd: number;
  tempMean: number;
  tempStd: number;
}): Promise<{ id: string }> {
  const result = await query<{ id: string }>(
    `INSERT INTO baseline_profiles (
      patient_id, spo2_mean, spo2_std, hr_mean, hr_std,
      bp_mean, bp_std, rr_mean, rr_std, temp_mean, temp_std, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
    ON CONFLICT (patient_id) DO UPDATE SET
      spo2_mean = EXCLUDED.spo2_mean,
      spo2_std = EXCLUDED.spo2_std,
      hr_mean = EXCLUDED.hr_mean,
      hr_std = EXCLUDED.hr_std,
      bp_mean = EXCLUDED.bp_mean,
      bp_std = EXCLUDED.bp_std,
      rr_mean = EXCLUDED.rr_mean,
      rr_std = EXCLUDED.rr_std,
      temp_mean = EXCLUDED.temp_mean,
      temp_std = EXCLUDED.temp_std,
      updated_at = NOW()
    RETURNING id`,
    [
      input.patientId,
      input.spo2Mean,
      input.spo2Std,
      input.hrMean,
      input.hrStd,
      input.bpMean,
      input.bpStd,
      input.rrMean,
      input.rrStd,
      input.tempMean,
      input.tempStd,
    ],
  );

  return { id: result.rows[0].id };
}

export async function getPatientHistory(patientId: string, limit = 50): Promise<unknown[]> {
  const result = await query(
    `SELECT * FROM vitals
     WHERE patient_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [patientId, limit],
  );

  return result.rows;
}

export async function getPatientBaseline(patientId: string): Promise<unknown | null> {
  const result = await query(
    `SELECT * FROM baseline_profiles
     WHERE patient_id = $1
     ORDER BY updated_at DESC
     LIMIT 1`,
    [patientId],
  );

  return result.rows[0] ?? null;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
