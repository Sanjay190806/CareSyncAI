import { Router } from 'express';
import * as runtimeController from '../controllers/runtime.controller.js';

export const alertsRouter = Router();
export const diagnosticsRouter = Router();
export const patientCheckerRouter = Router();

alertsRouter.post('/:id/acknowledge', runtimeController.acknowledgeAlert);
diagnosticsRouter.post('/check', runtimeController.runDiagnosticCheck);
diagnosticsRouter.post('/patient-checker', runtimeController.runDiagnosticCheck);
diagnosticsRouter.get('/health', runtimeController.patientCheckerHealth);
patientCheckerRouter.post('/', runtimeController.runDiagnosticCheck);
patientCheckerRouter.get('/health', runtimeController.patientCheckerHealth);
