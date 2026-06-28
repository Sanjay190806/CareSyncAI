import type { SymptomRule } from './types';

export const SYMPTOM_RULES: SymptomRule[] = [
  {
    symptoms: ['shortness of breath', 'cough', 'fatigue'],
    conditions: [
      { name: 'COPD Exacerbation', weight: 0.35 },
      { name: 'Pneumonia', weight: 0.3 },
      { name: 'Respiratory Failure', weight: 0.25 },
    ],
  },
  {
    symptoms: ['chest pain', 'palpitations', 'shortness of breath'],
    conditions: [
      { name: 'Acute Coronary Syndrome', weight: 0.4 },
      { name: 'Cardiac Arrhythmia', weight: 0.3 },
      { name: 'Pulmonary Embolism', weight: 0.2 },
    ],
  },
  {
    symptoms: ['fever', 'confusion', 'low blood pressure'],
    conditions: [
      { name: 'Sepsis', weight: 0.45 },
      { name: 'Severe Infection', weight: 0.25 },
    ],
  },
  {
    symptoms: ['chest pain', 'high heart rate', 'sweating'],
    conditions: [
      { name: 'Cardiac Event', weight: 0.42 },
      { name: 'Anxiety/Panic (rule-out)', weight: 0.15 },
    ],
  },
  {
    symptoms: ['low spo2', 'cough', 'fever'],
    conditions: [
      { name: 'Pneumonia', weight: 0.38 },
      { name: 'COVID/Respiratory Infection', weight: 0.28 },
    ],
  },
];

export const CHECKLIST_SYMPTOMS = [
  'shortness of breath',
  'chest pain',
  'fatigue',
  'cough',
  'fever',
  'confusion',
  'palpitations',
  'low blood pressure',
  'high heart rate',
  'sweating',
  'low spo2',
  'abdominal pain',
];

export const MEDICAL_HISTORY_OPTIONS = [
  'COPD',
  'Diabetes',
  'Hypertension',
  'Heart Failure',
  'Stroke',
  'Renal Disease',
  'Immunocompromised',
];

export const LIFESTYLE_OPTIONS = ['Smoker', 'Sedentary', 'Recent Surgery', 'Travel History', 'Alcohol Use'];
