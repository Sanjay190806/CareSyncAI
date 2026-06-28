import type { AlertTier } from '@/types';

export interface DiagnosticIntake {
  symptoms: string[];
  durationHours: number;
  age: number;
  gender: 'M' | 'F' | 'Other';
  medicalHistory: string[];
  lifestyleFactors: string[];
  existingConditions: string[];
  vitals?: {
    spo2?: number;
    heartRate?: number;
    bloodPressure?: number;
    respiratoryRate?: number;
    temperature?: number;
  };
  aiRiskScore?: number;
}

export interface DiseasePrediction {
  name: string;
  probability: number;
}

export interface DiagnosticReport {
  symptom_score: number;
  risk_estimation: number;
  possible_conditions: string[];
  recommended_triage_level: AlertTier;
  possible_diseases: DiseasePrediction[];
  model_type: 'hybrid_rules_scoring';
  confidence: number;
  note: string;
}

export interface SymptomRule {
  symptoms: string[];
  conditions: { name: string; weight: number }[];
}
