import { Router } from 'express';
import * as patientsController from '../controllers/patients.controller.js';

export const patientsRouter = Router();

patientsRouter.get('/', patientsController.listPatients);
patientsRouter.post('/', patientsController.createPatient);
patientsRouter.get('/:id/timeline', patientsController.getPatientTimeline);
patientsRouter.get('/:id', patientsController.getPatient);
patientsRouter.put('/:id', patientsController.updatePatient);
patientsRouter.delete('/:id', patientsController.deletePatient);
