/** Shared domain types — aligned with database schema and master spec */

export type AlertTier = 1 | 2 | 3 | 4 | 5;

export type ProfileType =
  | 'Healthy'
  | 'COPD'
  | 'Diabetes'
  | 'Hypertension'
  | 'Heart Failure'
  | 'Post Surgery'
  | 'ICU Critical';

export interface Patient {
  id: string;
  hospitalId: string;
  patientId?: string;
  firstName?: string;
  lastName?: string;
  name: string;
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
  roomNumber: string;
  diagnoses: string[];
  diagnosis?: string | null;
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
  deletedAt?: string | null;
  deletedBy?: string | null;
  riskCategory: 'Low' | 'Moderate' | 'High' | 'Critical';
  profileType: ProfileType;
  createdAt: string;
}

export interface CreatePatientInput {
  patientId: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: Patient['gender'];
  height?: number;
  weight?: number;
  bloodGroup?: string;
  ward?: string;
  room?: string;
  bedNumber?: string;
  primaryPhysician?: string;
  contactPerson?: string;
  contactNumber?: string;
  diagnosis?: string;
  existingConditions?: string[];
  allergies?: string[];
  medications?: string[];
  smokingStatus?: string;
  alcoholStatus?: string;
  emergencyContact?: string;
  admissionDate?: string;
  roomNumber: string;
  deviceAssignments?: string[];
  photoUrl?: string;
}

export type UpdatePatientInput = Partial<Omit<CreatePatientInput, 'patientId'>> & {
  patientId?: string;
};

export interface DiagnosisPrediction {
  primaryCondition: string;
  confidence: number;
  topPredictions: Array<{ condition: string; probability: number; explanation: string[] }>;
  riskFactors: string[];
  reasoning: string[];
  recommendedActions: string[];
  severity: string;
  triageLevel: AlertTier;
  riskScore: number;
  modelType: string;
  disclaimer: string;
}

export interface VitalReading {
  id?: string;
  patientId: string;
  timestamp: string;
  heartRate: number;
  spo2: number;
  bpSys: number;
  bpDia: number;
  bpMap: number;
  respiratoryRate: number;
  temperature: number;
  ecgRhythm: string;
  etco2: number;
  bloodGlucose: number;
  activityLevel: string;
  fallDetectionStatus: string;
  ivFlowStatus: string;
  medicationCompliance: number;
  correlationPatterns?: string[];
}

export interface VitalStats {
  mean: number;
  stdDev: number;
  sampleCount: number;
}

export interface BaselineProfile {
  patientId: string;
  spo2: VitalStats;
  heartRate: VitalStats;
  bpSys: VitalStats;
  bpDia: VitalStats;
  respiratoryRate: VitalStats;
  temperature: VitalStats;
  glucose: VitalStats;
  etco2: VitalStats;
  windowMinutes: number;
  updatedAt: string;
}

export interface DeviationScore {
  vital: string;
  currentValue: number;
  baselineMean: number;
  baselineStdDev: number;
  sigmaDeviation: number;
  isCritical: boolean;
}

export interface BaselineUpdateResult {
  patientId: string;
  baseline: BaselineProfile;
  deviations: DeviationScore[];
}

export interface RiskAssessment {
  patientId: string;
  crisisProbabilityScore: number;
  tier: AlertTier;
  trendDirection: 'improving' | 'stable' | 'deteriorating';
  timestamp: string;
  riskVelocity?: number;
  trendType?: 'stable' | 'worsening' | 'critical_spike' | 'recovering';
  urgencyBoost?: number;
  prediction10Min?: PredictiveForecast;
  urgencyRank?: number;
  triageScore?: number;
  clinicalReasoning?: ClinicalReasoning;
}

export interface AlertEvent {
  id: string;
  patientId: string;
  tier: AlertTier;
  riskScore: number;
  suppressed: boolean;
  suppressionReason?: string;
  timestamp: string;
}

export interface ClinicalNarrative {
  patientId: string;
  narrative: string;
  tier: AlertTier;
  suggestedAction?: string;
  generatedAt: string;
  reasoning?: ClinicalReasoning;
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
