import { io, type Socket } from 'socket.io-client';
import { resolveWsOrigin } from '@/config/env';

export type SyncEventHandlers = {
  onVitals?: (payload: unknown) => void;
  onRisk?: (payload: unknown) => void;
  onAlert?: (payload: unknown) => void;
  onPatient?: (payload: unknown) => void;
  onNarrative?: (payload: unknown) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
};

export class RealtimeWebSocketClient {
  private socket: Socket | null = null;
  private handlers: SyncEventHandlers = {};

  connect(handlers: SyncEventHandlers): void {
    this.handlers = handlers;
    if (this.socket?.connected) return;

    this.socket = io(resolveWsOrigin(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      timeout: 10000,
    });

    this.socket.on('connect', () => this.handlers.onConnect?.());
    this.socket.on('disconnect', () => this.handlers.onDisconnect?.());
    this.socket.on('vitals:update', (p) => this.handlers.onVitals?.(p));
    this.socket.on('risk:update', (p) => this.handlers.onRisk?.(p));
    this.socket.on('alert:update', (p) => this.handlers.onAlert?.(p));
    this.socket.on('patient:update', (p) => this.handlers.onPatient?.(p));
    this.socket.on('risk:narrative', (p) => this.handlers.onNarrative?.(p));
    this.socket.on('narrative:intelligence', (p) => this.handlers.onNarrative?.(p));
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return Boolean(this.socket?.connected);
  }
}

export const realtimeClient = new RealtimeWebSocketClient();
