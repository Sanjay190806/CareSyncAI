import type {
  AlertEvent,
  PatientDemographics,
  RiskAssessment,
  ShiftReportEntry,
  VitalReading,
} from '@/types';

/** REST client contract — implementation in Phase 2+ */
export interface ApiClient {
  getPatients(): Promise<PatientDemographics[]>;
  getPatient(id: string): Promise<PatientDemographics>;
  getVitals(patientId: string, limit?: number): Promise<VitalReading[]>;
  getAlerts(): Promise<AlertEvent[]>;
  getShiftReport(): Promise<ShiftReportEntry[]>;
  acknowledgeAlert(alertId: string): Promise<void>;
}

/** WebSocket event contract — implementation in Phase 2+ */
export interface VitalsStreamEvents {
  'vitals:update': (payload: { patientId: string; reading: VitalReading }) => void;
  'risk:update': (payload: RiskAssessment) => void;
  'alert:triggered': (payload: AlertEvent) => void;
  'alert:escalated': (payload: AlertEvent) => void;
  'tier:changed': (payload: { patientId: string; tier: number; score: number }) => void;
}

export interface WebSocketClient {
  connect(): void;
  disconnect(): void;
  on<K extends keyof VitalsStreamEvents>(event: K, handler: VitalsStreamEvents[K]): void;
  off<K extends keyof VitalsStreamEvents>(event: K, handler: VitalsStreamEvents[K]): void;
}
