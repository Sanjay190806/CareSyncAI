import { Router } from 'express';
import * as vitalsController from '../controllers/vitals.controller.js';

export const vitalsRouter = Router();

vitalsRouter.post('/', vitalsController.ingestVital);
vitalsRouter.get('/:patientId/baseline', vitalsController.getPatientBaseline);
vitalsRouter.get('/:patientId', vitalsController.getVitals);
