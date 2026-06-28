import { query, withTransaction } from './database.service.js';
import type { CreatePatientInput, Patient, UpdatePatientInput } from '../types/index.js';

interface PatientRow {
  id: string;
  hospital_id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  age: number;
  gender: string;
  height?: number | null;
  weight?: number | null;
  blood_group?: string | null;
  ward?: string | null;
  room?: string | null;
  bed_number?: string | null;
  primary_physician?: string | null;
  contact_person?: string | null;
  contact_number?: string | null;
  room_number: string;
  diagnoses: string[];
  diagnosis?: string | null;
  existing_conditions?: string[];
  medications: string[];
  allergies: string[];
  smoking_status?: string | null;
  alcohol_status?: string | null;
  emergency_contact?: string | null;
  admission_date?: Date | null;
  device_assignments?: string[];
  photo_url?: string | null;
  is_active?: boolean;
  deleted_at?: Date | null;
  deleted_by?: string | null;
  risk_category: string;
  profile_type: string;
  created_at: Date;
}

function mapPatient(row: PatientRow): Patient {
  return {
    id: row.id,
    hospitalId: row.hospital_id,
    patientId: row.hospital_id,
    firstName: row.first_name ?? row.name.split(' ')[0] ?? '',
    lastName: row.last_name ?? row.name.split(' ').slice(1).join(' '),
    name: row.name,
    age: row.age,
    gender: row.gender as Patient['gender'],
    height: row.height ?? null,
    weight: row.weight ?? null,
    bloodGroup: row.blood_group ?? null,
    ward: row.ward ?? null,
    room: row.room ?? row.room_number,
    bedNumber: row.bed_number ?? null,
    primaryPhysician: row.primary_physician ?? null,
    contactPerson: row.contact_person ?? null,
    contactNumber: row.contact_number ?? null,
    roomNumber: row.room_number,
    diagnoses: row.diagnoses ?? [],
    diagnosis: row.diagnosis ?? row.diagnoses?.[0] ?? null,
    existingConditions: row.existing_conditions ?? [],
    medications: row.medications ?? [],
    allergies: row.allergies ?? [],
    smokingStatus: row.smoking_status ?? null,
    alcoholStatus: row.alcohol_status ?? null,
    emergencyContact: row.emergency_contact ?? null,
    admissionDate: row.admission_date?.toISOString() ?? null,
    deviceAssignments: row.device_assignments ?? [],
    photoUrl: row.photo_url ?? null,
    isActive: row.is_active ?? true,
    deletedAt: row.deleted_at?.toISOString() ?? null,
    deletedBy: row.deleted_by ?? null,
    riskCategory: row.risk_category as Patient['riskCategory'],
    profileType: row.profile_type as Patient['profileType'],
    createdAt: row.created_at.toISOString(),
  };
}

const PATIENT_SELECT = `id, hospital_id, name, first_name, last_name, age, gender, height, weight, blood_group,
            ward, room, bed_number, primary_physician, contact_person, contact_number,
            room_number, diagnoses, diagnosis, existing_conditions, medications, allergies, smoking_status, alcohol_status,
            emergency_contact, admission_date, device_assignments, photo_url, is_active, deleted_at, deleted_by,
            risk_category, profile_type, created_at`;

export async function listPatients(): Promise<Patient[]> {
  const result = await query<PatientRow>(
    `SELECT ${PATIENT_SELECT}
     FROM patients
     WHERE COALESCE(is_active, TRUE) = TRUE
     ORDER BY hospital_id`,
  );
  return result.rows.map(mapPatient);
}

export async function getPatientById(id: string): Promise<Patient | null> {
  const result = await query<PatientRow>(
    `SELECT ${PATIENT_SELECT}
     FROM patients
     WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [id],
  );
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}

export async function getPatientByHospitalId(hospitalId: string): Promise<Patient | null> {
  const result = await query<PatientRow>(
    `SELECT ${PATIENT_SELECT}
     FROM patients
     WHERE hospital_id = $1 AND COALESCE(is_active, TRUE) = TRUE`,
    [hospitalId],
  );
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}

export async function createPatient(input: CreatePatientInput): Promise<Patient> {
  const existing = await getPatientByHospitalId(input.patientId);
  if (existing) {
    const error = new Error('Patient ID already exists');
    (error as Error & { status?: number }).status = 409;
    throw error;
  }

  const diagnosis = input.diagnosis?.trim() || 'General Monitoring';
  const roomNumber = input.roomNumber || input.room || input.bedNumber || 'Unassigned';
  const result = await withTransaction(async (client) => {
    const created = await client.query<PatientRow>(
    `INSERT INTO patients (
       hospital_id, name, first_name, last_name, age, gender, height, weight, blood_group,
       ward, room, bed_number, primary_physician, contact_person, contact_number,
       room_number, diagnoses, diagnosis, existing_conditions, medications, allergies, smoking_status, alcohol_status,
       emergency_contact, admission_date, device_assignments, photo_url, risk_category, profile_type, is_active
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9,
       $10, $11, $12, $13, $14, $15, $16, $17,
       $18, $19, $20, $21, $22, $23, $24, $25, $26, TRUE
     )
     RETURNING ${PATIENT_SELECT}`,
    [
      input.patientId,
      `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
      input.firstName.trim(),
      input.lastName.trim(),
      input.age,
      input.gender,
      input.height ?? null,
      input.weight ?? null,
      input.bloodGroup ?? null,
      input.ward ?? null,
      input.room ?? roomNumber,
      input.bedNumber ?? null,
      input.primaryPhysician ?? null,
      input.contactPerson ?? null,
      input.contactNumber ?? null,
      roomNumber,
      [diagnosis],
      diagnosis,
      input.existingConditions ?? [],
      input.medications ?? [],
      input.allergies ?? [],
      input.smokingStatus ?? null,
      input.alcoholStatus ?? null,
      input.emergencyContact ?? null,
      input.admissionDate ?? null,
      input.deviceAssignments ?? [],
      input.photoUrl ?? null,
      'Low',
      profileTypeForDiagnosis(diagnosis),
    ],
  );
    const patient = created.rows[0];
    await syncPatientChildren(client, patient.id, input);
    await insertAudit(client, patient.id, 'created', 'clinician', { patientId: input.patientId, name: patient.name });
    return created;
  });
  return mapPatient(result.rows[0]);
}

export async function updatePatient(id: string, input: UpdatePatientInput): Promise<Patient | null> {
  const current = await getPatientById(id);
  if (!current) return null;
  if (input.patientId && input.patientId !== current.hospitalId) {
    const duplicate = await getPatientByHospitalId(input.patientId);
    if (duplicate) {
      const error = new Error('Patient ID already exists');
      (error as Error & { status?: number }).status = 409;
      throw error;
    }
  }

  const firstName = input.firstName ?? current.firstName ?? current.name.split(' ')[0] ?? '';
  const lastName = input.lastName ?? current.lastName ?? current.name.split(' ').slice(1).join(' ');
  const diagnosis = input.diagnosis ?? current.diagnosis ?? current.diagnoses[0] ?? 'General Monitoring';
  const roomNumber = input.roomNumber ?? input.room ?? current.roomNumber;
  const result = await withTransaction(async (client) => {
    const updated = await client.query<PatientRow>(
    `UPDATE patients SET
       hospital_id = $2,
       first_name = $3,
       last_name = $4,
       name = $5,
       age = $6,
       gender = $7,
       height = $8,
       weight = $9,
       blood_group = $10,
       ward = $11,
       room = $12,
       bed_number = $13,
       primary_physician = $14,
       contact_person = $15,
       contact_number = $16,
       room_number = $17,
       diagnosis = $18,
       diagnoses = $19,
       existing_conditions = $20,
       medications = $21,
       allergies = $22,
       smoking_status = $23,
       alcohol_status = $24,
       emergency_contact = $25,
       admission_date = $26,
       device_assignments = $27,
       photo_url = $28,
       profile_type = $29
     WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE
     RETURNING ${PATIENT_SELECT}`,
    [
      id,
      input.patientId ?? current.hospitalId,
      firstName,
      lastName,
      `${firstName.trim()} ${lastName.trim()}`.trim(),
      input.age ?? current.age,
      input.gender ?? current.gender,
      input.height ?? current.height ?? null,
      input.weight ?? current.weight ?? null,
      input.bloodGroup ?? current.bloodGroup ?? null,
      input.ward ?? current.ward ?? null,
      input.room ?? current.room ?? roomNumber,
      input.bedNumber ?? current.bedNumber ?? null,
      input.primaryPhysician ?? current.primaryPhysician ?? null,
      input.contactPerson ?? current.contactPerson ?? null,
      input.contactNumber ?? current.contactNumber ?? null,
      roomNumber,
      diagnosis,
      [diagnosis],
      input.existingConditions ?? current.existingConditions ?? [],
      input.medications ?? current.medications,
      input.allergies ?? current.allergies,
      input.smokingStatus ?? current.smokingStatus ?? null,
      input.alcoholStatus ?? current.alcoholStatus ?? null,
      input.emergencyContact ?? current.emergencyContact ?? null,
      input.admissionDate ?? current.admissionDate ?? null,
      input.deviceAssignments ?? current.deviceAssignments ?? [],
      input.photoUrl ?? current.photoUrl ?? null,
      profileTypeForDiagnosis(diagnosis),
    ],
  );
    if (updated.rows[0]) {
      await syncPatientChildren(client, id, {
        ...current,
        ...input,
        roomNumber,
        diagnosis,
      } as CreatePatientInput);
      await insertAudit(client, id, 'updated', 'clinician', { changedFields: Object.keys(input) });
    }
    return updated;
  });
  return result.rows[0] ? mapPatient(result.rows[0]) : null;
}

export async function softDeletePatient(id: string, actor = 'system'): Promise<boolean> {
  const result = await query<{ id: string }>(
    `UPDATE patients
     SET is_active = FALSE, deleted_at = NOW(), deleted_by = $2
     WHERE id = $1 AND COALESCE(is_active, TRUE) = TRUE
     RETURNING id`,
    [id, actor],
  );
  if (!result.rows[0]) return false;

  await query(
    `INSERT INTO patient_audit_log (patient_id, action, actor, details, created_at)
     VALUES ($1, 'delete', $2, $3, NOW())`,
    [id, actor, { reason: 'Soft delete via patient management API' }],
  );
  return true;
}

export interface PatientTimelineItem {
  id: string;
  type: 'admission' | 'audit' | 'alert' | 'risk' | 'vital' | 'diagnosis';
  title: string;
  detail: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function getPatientTimeline(id: string): Promise<PatientTimelineItem[]> {
  const [audit, alerts, risk, vitals, diagnoses] = await Promise.all([
    query(`SELECT id, action, actor, details, created_at FROM patient_audit_log WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
    query(`SELECT id, severity, reason, recommended_action, timestamp FROM alerts WHERE patient_id = $1 ORDER BY timestamp DESC LIMIT 25`, [id]),
    query(`SELECT id, overall_score, risk_level, timestamp FROM risk_assessments WHERE patient_id = $1 ORDER BY timestamp DESC LIMIT 25`, [id]),
    query(`SELECT id, spo2, heart_rate, bp_sys, respiratory_rate, temperature, timestamp FROM vitals WHERE patient_id = $1 ORDER BY timestamp DESC LIMIT 25`, [id]),
    query(`SELECT id, primary_condition, confidence, severity, triage_level, created_at FROM diagnosis_assessments WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 25`, [id]),
  ]);

  const items: PatientTimelineItem[] = [
    ...audit.rows.map((row: any) => ({
      id: row.id,
      type: (row.action === 'created' ? 'admission' : 'audit') as PatientTimelineItem['type'],
      title: auditTitle(row.action),
      detail: `${row.action} by ${row.actor}`,
      timestamp: row.created_at.toISOString(),
      metadata: row.details,
    })),
    ...alerts.rows.map((row: any) => ({
      id: row.id,
      type: 'alert' as const,
      title: `${row.severity} alert`,
      detail: row.reason || row.recommended_action,
      timestamp: row.timestamp.toISOString(),
      metadata: row,
    })),
    ...risk.rows.map((row: any) => ({
      id: row.id,
      type: 'risk' as const,
      title: `Risk ${row.overall_score}`,
      detail: `Risk level ${row.risk_level}`,
      timestamp: row.timestamp.toISOString(),
      metadata: row,
    })),
    ...vitals.rows.map((row: any) => ({
      id: row.id,
      type: 'vital' as const,
      title: 'Vital event',
      detail: `SpO2 ${row.spo2 ?? '-'}%, HR ${row.heart_rate ?? '-'}, BP ${row.bp_sys ?? '-'}`,
      timestamp: row.timestamp.toISOString(),
      metadata: row,
    })),
    ...diagnoses.rows.map((row: any) => ({
      id: row.id,
      type: 'diagnosis' as const,
      title: row.primary_condition,
      detail: `${Math.round(Number(row.confidence) * 100)}% confidence, triage tier ${row.triage_level}`,
      timestamp: row.created_at.toISOString(),
      metadata: row,
    })),
  ];

  return items.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, 80);
}

async function syncPatientChildren(client: { query: typeof query }, patientId: string, input: CreatePatientInput): Promise<void> {
  await client.query(`DELETE FROM patient_contacts WHERE patient_id = $1`, [patientId]);
  const contacts = [
    input.contactPerson ? { type: 'primary', name: input.contactPerson, phone: input.contactNumber ?? null, emergency: false } : null,
    input.emergencyContact ? { type: 'emergency', name: input.emergencyContact, phone: input.contactNumber ?? null, emergency: true } : null,
  ].filter(Boolean) as Array<{ type: string; name: string; phone: string | null; emergency: boolean }>;
  for (const contact of contacts) {
    await client.query(
      `INSERT INTO patient_contacts (patient_id, contact_type, name, phone, is_emergency) VALUES ($1, $2, $3, $4, $5)`,
      [patientId, contact.type, contact.name, contact.phone, contact.emergency],
    );
  }

  await client.query(`DELETE FROM patient_conditions WHERE patient_id = $1`, [patientId]);
  const conditions = [...(input.existingConditions ?? []), input.diagnosis ? `Diagnosis: ${input.diagnosis}` : ''].filter(Boolean);
  for (const condition of conditions) {
    await client.query(
      `INSERT INTO patient_conditions (patient_id, condition_name, condition_type) VALUES ($1, $2, $3)`,
      [patientId, condition, condition.startsWith('Diagnosis:') ? 'diagnosis' : 'existing'],
    );
  }

  await client.query(`UPDATE patient_assignments SET released_at = NOW() WHERE patient_id = $1 AND released_at IS NULL`, [patientId]);
  await client.query(
    `INSERT INTO patient_assignments (patient_id, ward, room, bed_number, primary_physician) VALUES ($1, $2, $3, $4, $5)`,
    [patientId, input.ward ?? 'ICU', input.room ?? input.roomNumber, input.bedNumber ?? input.roomNumber, input.primaryPhysician ?? null],
  );

  await client.query(`UPDATE patient_devices SET unassigned_at = NOW(), status = 'inactive' WHERE patient_id = $1 AND unassigned_at IS NULL`, [patientId]);
  for (const deviceId of input.deviceAssignments ?? []) {
    await client.query(
      `INSERT INTO patient_devices (patient_id, device_id, device_type) VALUES ($1, $2, $3)`,
      [patientId, deviceId, inferDeviceType(deviceId)],
    );
  }
}

async function insertAudit(client: { query: typeof query }, patientId: string, action: string, actor: string, details: Record<string, unknown>): Promise<void> {
  await client.query(
    `INSERT INTO patient_audit_log (patient_id, action, actor, details, created_at) VALUES ($1, $2, $3, $4, NOW())`,
    [patientId, action, actor, details],
  );
}

function auditTitle(action: string): string {
  if (action === 'created') return 'Admission created';
  if (action === 'updated') return 'Patient profile updated';
  if (action === 'delete') return 'Patient soft deleted';
  return action;
}

function inferDeviceType(deviceId: string): string {
  const normalized = deviceId.toLowerCase();
  if (normalized.includes('vent')) return 'ventilator';
  if (normalized.includes('ecg')) return 'ecg';
  if (normalized.includes('pump')) return 'infusion_pump';
  if (normalized.includes('spo2') || normalized.includes('pulse')) return 'pulse_oximeter';
  return 'monitor';
}

function profileTypeForDiagnosis(diagnosis: string): Patient['profileType'] {
  const normalized = diagnosis.toLowerCase();
  if (normalized.includes('copd')) return 'COPD';
  if (normalized.includes('diabetes') || normalized.includes('diabetic')) return 'Diabetes';
  if (normalized.includes('hypertension')) return 'Hypertension';
  if (normalized.includes('heart')) return 'Heart Failure';
  if (normalized.includes('surgery')) return 'Post Surgery';
  if (normalized.includes('icu') || normalized.includes('critical')) return 'ICU Critical';
  return 'Healthy';
}
