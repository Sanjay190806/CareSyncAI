import cors from 'cors';
import express, { type Express } from 'express';
import { config } from './config/index.js';
import { healthRouter } from './routes/health.routes.js';
import { patientsRouter } from './routes/patients.routes.js';
import { vitalsRouter } from './routes/vitals.routes.js';
import { alertsRouter, diagnosticsRouter, patientCheckerRouter } from './routes/runtime.routes.js';
import { WebSocketGateway } from './websocket/gateway.js';

export function createApp(): Express {
  const app = express();
  const gateway = new WebSocketGateway();
  app.set('gateway', gateway);

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/patients', patientsRouter);
  app.use('/api/vitals', vitalsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/diagnostics', diagnosticsRouter);
  app.use('/api/patient-checker', patientCheckerRouter);

  return app;
}
