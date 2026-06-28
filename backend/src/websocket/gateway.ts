import { Server as SocketIOServer, type Socket } from 'socket.io';
import type { AlertEvent, ClinicalNarrative, RiskAssessment, VitalReading } from '../types/index.js';
import type { NarrativeWebSocketPayload } from '../types/narrative-intelligence.js';

export class WebSocketGateway {
  private io: SocketIOServer | null = null;

  attach(server: any): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
      },
    });

    this.io.on('connection', (socket: Socket) => {
      socket.emit('connected', { status: 'ok' });
      socket.on('disconnect', () => undefined);
    });
  }

  emitVitalUpdate(payload: VitalReading): void {
    this.io?.emit('vitals:update', payload);
  }

  emitRiskUpdate(payload: RiskAssessment): void {
    this.io?.emit('risk:update', payload);
  }

  emitAlertUpdate(payload: AlertEvent): void {
    this.io?.emit('alert:update', payload);
  }

  emitPatientUpdate(payload: Record<string, unknown>): void {
    this.io?.emit('patient:update', payload);
  }

  emitDiagnosisUpdate(payload: Record<string, unknown>): void {
    this.io?.emit('diagnosis:update', payload);
  }

  emitNarrative(payload: ClinicalNarrative): void {
    this.io?.emit('risk:narrative', payload);
  }

  emitNarrativeIntelligence(payload: NarrativeWebSocketPayload): void {
    this.io?.emit('narrative:intelligence', payload);
  }

  status(): { status: 'attached' | 'not_attached'; connectedClients: number } {
    return {
      status: this.io ? 'attached' : 'not_attached',
      connectedClients: this.io?.engine.clientsCount ?? 0,
    };
  }
}
