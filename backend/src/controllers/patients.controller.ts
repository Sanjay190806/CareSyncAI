import type { Request, Response } from 'express';
import { z } from 'zod';
import * as patientsService from '../services/patients.service.js';

const patientPayloadSchema = z.object({
  patientId: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().default(''),
  age: z.number().int().min(0).max(120),
  gender: z.enum(['Male', 'Female', 'Other']),
  height: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  bloodGroup: z.string().optional(),
  ward: z.string().optional(),
  room: z.string().optional(),
  bedNumber: z.string().optional(),
  primaryPhysician: z.string().optional(),
  contactPerson: z.string().optional(),
  contactNumber: z.string().optional(),
  diagnosis: z.string().optional(),
  existingConditions: z.array(z.string()).default([]),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  smokingStatus: z.string().optional(),
  alcoholStatus: z.string().optional(),
  emergencyContact: z.string().optional(),
  admissionDate: z.string().optional(),
  roomNumber: z.string().min(1),
  deviceAssignments: z.array(z.string()).default([]),
  photoUrl: z.string().optional(),
});

const patientUpdateSchema = patientPayloadSchema.partial();

export async function listPatients(_req: Request, res: Response): Promise<void> {
  try {
    const patients = await patientsService.listPatients();
    res.json(patients);
  } catch (err) {
    console.error('[patients] list error:', err);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
}

export async function createPatient(req: Request, res: Response): Promise<void> {
  try {
    const payload = patientPayloadSchema.parse(req.body);
    const patient = await patientsService.createPatient(payload);
    res.status(201).json(patient);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid patient payload', details: err.flatten() });
      return;
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    console.error('[patients] create error:', err);
    res.status(status).json({ error: status === 409 ? 'Patient ID already exists' : 'Failed to create patient' });
  }
}

export async function updatePatient(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const payload = patientUpdateSchema.parse(req.body);
    const patient = await patientsService.updatePatient(patientId, payload);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid patient payload', details: err.flatten() });
      return;
    }
    const status = (err as Error & { status?: number }).status ?? 500;
    console.error('[patients] update error:', err);
    res.status(status).json({ error: status === 409 ? 'Patient ID already exists' : 'Failed to update patient' });
  }
}

export async function deletePatient(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const actor = String(req.header('x-user-id') ?? 'clinician');
    const deleted = await patientsService.softDeletePatient(patientId, actor);
    if (!deleted) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('[patients] delete error:', err);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
}

export async function getPatient(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const patient = await patientsService.getPatientById(patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (err) {
    console.error('[patients] get error:', err);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
}

export async function getPatientTimeline(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const patient = await patientsService.getPatientById(patientId);
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    const timeline = await patientsService.getPatientTimeline(patientId);
    res.json(timeline);
  } catch (err) {
    console.error('[patients] timeline error:', err);
    res.status(500).json({ error: 'Failed to fetch patient timeline' });
  }
}
