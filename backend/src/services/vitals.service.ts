import { z } from 'zod';
import { query } from './database.service.js';
import { persistBaselines, updateBaseline } from './ai-engine.client.js';
import type { VitalReading } from '../types/index.js';
import type { BaselineUpdateResult } from '../types/index.js';

const vitalInputSchema = z.object({
  patientId: z.string().uuid(),
  timestamp: z.string().datetime(),
  heartRate: z.number().int().min(0).max(300),
  spo2: z.number().min(0).max(100),
  bpSys: z.number().int().min(0).max(300),
  bpDia: z.number().int().min(0).max(200),
  bpMap: z.number().int().min(0).max(250).optional(),
  respiratoryRate: z.number().int().min(0).max(60),
  temperature: z.number().min(90).max(110),
  ecgRhythm: z.string().min(1).max(30),
  etco2: z.number().min(0).max(100),
  bloodGlucose: z.number().min(0).max(600),
  activityLevel: z.string().min(1).max(20),
  fallDetectionStatus: z.string().min(1).max(20),
  ivFlowStatus: z.string().min(1).max(20),
  medicationCompliance: z.number().min(0).max(100),
  correlationPatterns: z.array(z.string()).optional(),
});

interface VitalRow {
  id: string;
  patient_id: string;
  timestamp: Date;
  heart_rate: number;
  spo2: string;
  bp_sys: number;
  bp_dia: number;
  bp_map: number;
  respiratory_rate: number;
  temperature: string;
  ecg_rhythm: string;
  etco2: string;
  blood_glucose: string;
  activity_level: string;
  fall_detection_status: string;
  iv_flow_status: string;
  medication_compliance: string;
}

function computeMap(bpSys: number, bpDia: number): number {
  return Math.round((bpSys + 2 * bpDia) / 3);
}

function mapVital(row: VitalRow): VitalReading {
  return {
    id: row.id,
    patientId: row.patient_id,
    timestamp: row.timestamp.toISOString(),
    heartRate: row.heart_rate,
    spo2: parseFloat(row.spo2),
    bpSys: row.bp_sys,
    bpDia: row.bp_dia,
    bpMap: row.bp_map,
    respiratoryRate: row.respiratory_rate,
    temperature: parseFloat(row.temperature),
    ecgRhythm: row.ecg_rhythm,
    etco2: parseFloat(row.etco2),
    bloodGlucose: parseFloat(row.blood_glucose),
    activityLevel: row.activity_level,
    fallDetectionStatus: row.fall_detection_status,
    ivFlowStatus: row.iv_flow_status,
    medicationCompliance: parseFloat(row.medication_compliance),
  };
}

export function parseVitalInput(data: unknown): VitalReading {
  const parsed = vitalInputSchema.parse(data);
  const bpMap = parsed.bpMap ?? computeMap(parsed.bpSys, parsed.bpDia);
  return { ...parsed, bpMap };
}

export async function insertVital(reading: VitalReading): Promise<VitalReading> {
  const result = await query<VitalRow>(
    `INSERT INTO vitals (
       patient_id, timestamp, heart_rate, spo2, bp_sys, bp_dia, bp_map,
       respiratory_rate, temperature, ecg_rhythm, etco2, blood_glucose,
       activity_level, fall_detection_status, iv_flow_status, medication_compliance
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [
      reading.patientId,
      reading.timestamp,
      reading.heartRate,
      reading.spo2,
      reading.bpSys,
      reading.bpDia,
      reading.bpMap,
      reading.respiratoryRate,
      reading.temperature,
      reading.ecgRhythm,
      reading.etco2,
      reading.bloodGlucose,
      reading.activityLevel,
      reading.fallDetectionStatus,
      reading.ivFlowStatus,
      reading.medicationCompliance,
    ],
  );
  return mapVital(result.rows[0]);
}

export async function getVitalsByPatient(
  patientId: string,
  limit = 50,
): Promise<VitalReading[]> {
  const result = await query<VitalRow>(
    `SELECT * FROM vitals
     WHERE patient_id = $1
     ORDER BY timestamp DESC
     LIMIT $2`,
    [patientId, limit],
  );
  return result.rows.map(mapVital);
}

export async function ingestVital(data: unknown): Promise<{
  vital: VitalReading;
  baseline: BaselineUpdateResult;
}> {
  const reading = parseVitalInput(data);
  const vital = await insertVital(reading);
  const baseline = await updateBaseline(vital);
  await persistBaselines(vital.patientId, baseline.baseline);
  return { vital, baseline };
}
