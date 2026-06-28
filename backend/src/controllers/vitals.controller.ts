import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import * as vitalsService from '../services/vitals.service.js';
import { getBaseline } from '../services/ai-engine.client.js';
import { IntegrationService } from '../services/integration.service.js';

const integrationService = new IntegrationService();

export async function ingestVital(req: Request, res: Response): Promise<void> {
  try {
    const parsed = vitalsService.parseVitalInput(req.body);
    const result = await integrationService.processVital(parsed);
    res.status(201).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Invalid vital reading', details: err.errors });
      return;
    }
    console.error('[vitals] ingest error:', err);
    res.status(500).json({ error: 'Failed to ingest vital reading' });
  }
}

export async function getVitals(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const vitals = await vitalsService.getVitalsByPatient(patientId, limit);
    res.json(vitals);
  } catch (err) {
    console.error('[vitals] get error:', err);
    res.status(500).json({ error: 'Failed to fetch vitals' });
  }
}

export async function getPatientBaseline(req: Request, res: Response): Promise<void> {
  try {
    const patientId = Array.isArray(req.params.patientId) ? req.params.patientId[0] : req.params.patientId;
    const baseline = await getBaseline(patientId);
    res.json(baseline);
  } catch (err) {
    console.error('[vitals] baseline error:', err);
    res.status(500).json({ error: 'Failed to fetch baseline' });
  }
}
