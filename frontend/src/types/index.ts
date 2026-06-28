/** Five-tier alert system per master spec */
export type AlertTier = 1 | 2 | 3 | 4 | 5;

export type AlertTierLabel =
  | 'Silent Monitoring'
  | 'Advisory'
  | 'Watch Alert'
  | 'Critical'
  | 'CODE RED';

export type OperationMode = 'ICU' | 'Ward' | 'Ambulance' | 'RPM';

export type TrendDirection = 'up' | 'down' | 'flat';

export interface PatientDemographics {
  id: string;
  hospitalId: string;
  patientId?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  height?: number | null;
  weight?: number | null;
  bloodGroup?: string | null;
  ward?: string | null;
  room?: string | null;
  bedNumber?: string | null;
  primaryPhysician?: string | null;
  contactPerson?: string | null;
  contactNumber?: string | null;
  roomNumber?: string;
  diagnosis?: string | null;
  diagnoses: string[];
  existingConditions?: string[];
  medications: string[];
  allergies: string[];
  smokingStatus?: string | null;
  alcoholStatus?: string | null;
  emergencyContact?: string | null;
  admissionDate?: string | null;
  deviceAssignments?: string[];
  photoUrl?: string | null;
  isActive?: boolean;
}

/** Live patient snapshot for command center grid */
export interface PatientSnapshot {
  id: string;
  name: string;
  patientId?: string;
  photoUrl?: string;
  age: number;
  gender: 'M' | 'F';
  ward?: string;
  bedNumber?: string;
  primaryPhysician?: string;
  baselineStatus?: 'Established' | 'Learning' | 'Needs Review';
  room: string;
  diagnosis: string;
  riskScore: number;
  tier: AlertTier;
  spo2: number;
  heartRate: number;
  bloodPressure: number;
  bpDia?: number;
  temperature: number;
  respiratoryRate: number;
  etco2?: number;
  trend: TrendDirection;
  lastUpdated: string;
  narrative: string;
  aiBrief: string;
  suggestedAction?: string;
  alerts: string[];
  medications?: string[];
  history: { label: string; score: number }[];
  baseline?: {
    spo2: number;
    heartRate: number;
    bloodPressure: number;
    respiratoryRate: number;
    temperature: number;
  };
  riskVelocity?: number;
  trendType?: 'stable' | 'worsening' | 'critical_spike' | 'recovering';
  urgencyBoost?: number;
  prediction10Min?: PredictiveForecast;
  urgencyRank?: number;
  triageScore?: number;
  clinicalReasoning?: ClinicalReasoning;
}

export interface VitalReading {
  timestamp: string;
  spo2: number;
  heartRate: number;
  bpSys: number;
  bpDia: number;
  respiratoryRate: number;
  temperature: number;
  etco2?: number;
  glucose?: number;
}

export interface BaselineProfile {
  patientId: string;
  spo2: { mean: number; stdDev: number };
  heartRate: { mean: number; stdDev: number };
  bloodPressure: { mean: number; stdDev: number };
  respiratoryRate: { mean: number; stdDev: number };
  temperature: { mean: number; stdDev: number };
  establishedAt: string;
  windowMinutes: number;
}

export interface DeviationScore {
  vital: keyof Omit<VitalReading, 'timestamp' | 'etco2' | 'glucose'>;
  currentValue: number;
  baselineMean: number;
  baselineStdDev: number;
  sigmaDeviation: number;
}

export interface RiskAssessment {
  patientId: string;
  crisisProbabilityScore: number;
  tier: AlertTier;
  deviationScores: DeviationScore[];
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  timestamp: string;
  riskVelocity?: number;
  trendType?: 'stable' | 'worsening' | 'critical_spike' | 'recovering';
  urgencyBoost?: number;
  prediction10Min?: PredictiveForecast;
  triageScore?: number;
  urgencyRank?: number;
}

export interface PredictiveForecast {
  predictedSpo210Min: number;
  predictedHr10Min: number;
  riskForecast10Min: number;
  confidence: number;
}

export interface ClinicalReasoning {
  basic: string;
  clinical: string;
  criticalReasoning: string;
  icuStyleSummary: string;
}

export interface ClinicalNarrative {
  patientId: string;
  narrative: string;
  tier: AlertTier;
  suggestedAction?: string;
  generatedAt: string;
}

export interface AlertEvent {
  id: string;
  patientId: string;
  patientName?: string;
  tier: AlertTier;
  riskScore: number;
  narrative?: string;
  suppressed: boolean;
  suppressionReason?: string;
  timestamp: string;
}

export interface ShiftReportEntry {
  alertId: string;
  patientId: string;
  tier: AlertTier;
  narrative: string;
  escalated: boolean;
  responseTimeMs?: number;
  timestamp: string;
}

export type EventType = 'vitals' | 'alert' | 'ai' | 'ack' | 'tier';

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  detail: string;
  timestamp: string;
  patientId?: string;
  tier?: AlertTier;
}

export interface InsightItem {
  id: string;
  title: string;
  detail: string;
  severity: AlertTier;
  patientId?: string;
}

export type CrisisScenario =
  | 'copd'
  | 'sepsis'
  | 'cardiac'
  | 'respiratory'
  | 'patient7';

export interface NarrativeHistoryEntry {
  id: string;
  patientId: string;
  narrative: string;
  tier: AlertTier;
  timestamp: string;
}

export interface PatientTimelineItem {
  id: string;
  type: 'admission' | 'audit' | 'alert' | 'risk' | 'vital' | 'diagnosis';
  title: string;
  detail: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
