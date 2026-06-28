import { Router } from 'express';
import { checkAiEngineHealth } from '../services/ai-engine.client.js';
import { query } from '../services/database.service.js';
import type { WebSocketGateway } from '../websocket/gateway.js';

export const healthRouter = Router();

healthRouter.get('/', async (req, res) => {
  const [aiEngine, databaseStatus] = await Promise.all([checkAiEngineHealth(), checkDatabaseStatus()]);
  const gateway = req.app.get('gateway') as WebSocketGateway | undefined;
  const webSocketStatus = gateway?.status() ?? { status: 'not_attached', connectedClients: 0 };

  res.json({
    service: 'caresync-backend',
    status: databaseStatus.status === 'ok' ? 'ok' : 'degraded',
    phase: 'patient-checker-stabilized',
    aiStatus: aiEngine.status === 'ok' ? 'ok' : 'fallback_available',
    databaseStatus,
    webSocketStatus,
    patientChecker: {
      status: 'ok',
      fallbackStatus: 'available',
      modelStatus: modelStatusFromAi(aiEngine),
    },
  });
});

async function checkDatabaseStatus(): Promise<Record<string, unknown>> {
  try {
    await query('SELECT 1');
    return { status: 'ok' };
  } catch (error) {
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function modelStatusFromAi(aiEngine: Record<string, unknown>): Record<string, unknown> {
  const direct = aiEngine.modelStatus;
  if (direct && typeof direct === 'object') return direct as Record<string, unknown>;
  const patientChecker = aiEngine.patientChecker;
  if (patientChecker && typeof patientChecker === 'object') {
    const modelStatus = (patientChecker as Record<string, unknown>).modelStatus;
    if (modelStatus && typeof modelStatus === 'object') return modelStatus as Record<string, unknown>;
  }
  return { status: aiEngine.status === 'ok' ? 'unknown' : 'fallback_available' };
}
