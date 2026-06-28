import type { AlertTier, DiagnosisPrediction } from '../types/index.js';

export type PatientCheckerIntake = {
  patientId?: string;
  demographics?: Record<string, unknown>;
  vitals?: Record<string, unknown>;
  symptoms?: string[];
  clinicalContext?: string[];
  previousRiskScore?: number;
  baseline?: Record<string, unknown>;
};

export type DifferentialDiagnosis = {
  diagnosis: string;
  confidence: number;
  reasoning: string;
};

export type PatientCheckerResponse = Omit<DiagnosisPrediction, 'confidence' | 'reasoning'> & {
  success: true;
  primaryDiagnosis: string;
  primaryCondition: string;
  confidence: number;
  confidenceScore: number;
  modelConfidence: number;
  predictionConfidence: number;
  riskScore: number;
  differentials: DifferentialDiagnosis[];
  reasoning: string;
  reasoningItems: string[];
  recommendations: string[];
  recommendedActions: string[];
  modelUsed: string;
  modelType: string;
  dataQuality: number;
  dataQualityScore: number;
  topPredictions: Array<{ condition: string; probability: number; explanation: string[] }>;
  riskFactors: string[];
  severity: string;
  triageLevel: AlertTier;
  disclaimer: string;
  fallbackReason?: string;
};

type PredictionLike = Partial<DiagnosisPrediction> & Record<string, unknown>;

const DISCLAIMER = 'Suggestive diagnosis only. Not a definitive medical diagnosis.';

export function normalizePatientCheckerResponse(
  rawPrediction: PredictionLike,
  intake: PatientCheckerIntake,
  source: 'ai_engine' | 'backend_fallback' | 'frontend_fallback' = 'ai_engine',
): PatientCheckerResponse {
  const topPredictions = normalizeTopPredictions(rawPrediction);
  const primaryCondition = nonEmptyString(
    rawPrediction.primaryCondition,
    nonEmptyString(rawPrediction.primaryDiagnosis, topPredictions[0]?.condition ?? 'Undifferentiated Clinical Risk'),
  );
  const confidence = toPercent(rawPrediction.confidence ?? rawPrediction.predictionConfidence ?? topPredictions[0]?.probability, 62);
  const confidenceScore = toRatio(rawPrediction.confidenceScore ?? rawPrediction.confidence ?? confidence, confidence / 100);
  const riskScore = clampInt(rawPrediction.riskScore ?? rawPrediction.risk_estimation ?? intake.previousRiskScore ?? confidence, 0, 100);
  const triageLevel = clampInt(rawPrediction.triageLevel ?? rawPrediction.recommended_triage_level ?? triageFromRisk(riskScore), 1, 5) as AlertTier;
  const severity = nonEmptyString(rawPrediction.severity, severityFromTriage(triageLevel));
  const dataQuality = clampInt(rawPrediction.dataQuality ?? rawPrediction.dataQualityScore ?? estimateDataQuality(intake), 0, 100);
  const reasoningItems = normalizeReasoning(rawPrediction, topPredictions[0]?.explanation ?? []);
  const recommendations = normalizeStringList(rawPrediction.recommendations ?? rawPrediction.recommendedActions);
  const modelUsed = nonEmptyString(rawPrediction.modelUsed, nonEmptyString(rawPrediction.modelType, source));
  const riskFactors = normalizeStringList(rawPrediction.riskFactors);
  const disclaimer = nonEmptyString(rawPrediction.disclaimer ?? rawPrediction.note, DISCLAIMER);

  return {
    success: true,
    primaryDiagnosis: primaryCondition,
    primaryCondition,
    confidence,
    confidenceScore,
    modelConfidence: toPercent(rawPrediction.modelConfidence ?? confidence, confidence),
    predictionConfidence: toPercent(rawPrediction.predictionConfidence ?? confidence, confidence),
    riskScore,
    differentials: topPredictions.slice(0, 5).map((item) => ({
      diagnosis: item.condition,
      confidence: toPercent(item.probability, confidence),
      reasoning: item.explanation.join(' '),
    })),
    reasoning: reasoningItems.join(' '),
    reasoningItems,
    recommendations,
    recommendedActions: recommendations,
    severity,
    triageLevel,
    topPredictions,
    riskFactors,
    modelUsed,
    modelType: modelUsed,
    dataQuality,
    dataQualityScore: dataQuality,
    disclaimer,
    fallbackReason: typeof rawPrediction.fallbackReason === 'string' ? rawPrediction.fallbackReason : undefined,
  };
}

export function runFallbackPatientChecker(
  intake: PatientCheckerIntake,
  fallbackReason = 'AI engine unavailable',
): PatientCheckerResponse {
  try {
    const symptoms = new Set(normalizeStringList(intake.symptoms).map((item) => item.toLowerCase()));
    const context = new Set(normalizeStringList(intake.clinicalContext).map((item) => item.toLowerCase()));
    const vitals = intake.vitals ?? {};
    const demographics = intake.demographics ?? {};
    const values = {
      spo2: numberValue(vitals.spo2),
      heartRate: numberValue(vitals.heartRate),
      bpSys: numberValue(vitals.bpSys ?? vitals.bloodPressure),
      bpDia: numberValue(vitals.bpDia),
      respiratoryRate: numberValue(vitals.respiratoryRate),
      temperature: numberValue(vitals.temperature),
      glucose: numberValue(vitals.glucose ?? vitals.bloodGlucose),
      age: numberValue(demographics.age),
    };
    const scores = scoreFallbackConditions(symptoms, context, values);
    const total = Object.values(scores).reduce((sum, value) => sum + Math.max(0.01, value), 0);
    const topPredictions = Object.entries(scores)
      .map(([condition, score]) => ({
        condition,
        probability: roundRatio(Math.max(0.03, Math.min(0.96, score / total))),
        explanation: explainFallback(condition, values, symptoms, context),
      }))
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 5);

    const primary = topPredictions[0] ?? {
      condition: 'Undifferentiated Clinical Risk',
      probability: 0.45,
      explanation: ['Insufficient features for a specific diagnostic cluster.'],
    };
    const dataQuality = estimateDataQuality(intake);
    const evidenceCount = primary.explanation.length + symptoms.size + context.size;
    const confidenceScore = Math.min(0.94, Math.max(0.48, primary.probability * 2.2 + evidenceCount * 0.025));
    const riskScore = Math.min(
      100,
      Math.round(
        confidenceScore * 55
          + (values.spo2 > 0 && values.spo2 < 90 ? 20 : 0)
          + (values.bpSys > 0 && (values.bpSys < 90 || values.bpSys >= 180) ? 15 : 0)
          + (values.heartRate > 125 ? 10 : 0),
      ),
    );
    const triageLevel = triageFromRisk(riskScore);
    const response = normalizePatientCheckerResponse(
      {
        primaryCondition: primary.condition,
        confidence: Math.round(confidenceScore * 100),
        confidenceScore,
        modelConfidence: Math.round(Math.min(0.92, confidenceScore + 0.04) * 100),
        predictionConfidence: Math.round(confidenceScore * 100),
        dataQuality,
        topPredictions,
        riskFactors: [...context, values.age > 60 ? 'age > 60' : ''].filter(Boolean),
        reasoning: primary.explanation,
        recommendedActions: actionsFor(primary.condition, triageLevel),
        severity: severityFromTriage(triageLevel),
        triageLevel,
        riskScore,
        modelType: 'backend_fallback_diagnostic_engine',
        disclaimer: DISCLAIMER,
        fallbackReason,
      },
      intake,
      'backend_fallback',
    );
    return response;
  } catch (error) {
    return emergencyPatientCheckerResponse(intake, error instanceof Error ? error.message : fallbackReason);
  }
}

export function emergencyPatientCheckerResponse(intake: PatientCheckerIntake, fallbackReason: string): PatientCheckerResponse {
  const topPredictions = [
    { condition: 'Pneumonia', probability: 0.24, explanation: ['Fallback assessment used because diagnostic scoring failed.'] },
    { condition: 'COPD Exacerbation', probability: 0.22, explanation: ['Respiratory symptoms and vitals should be reviewed at bedside.'] },
    { condition: 'Sepsis', probability: 0.2, explanation: ['Screen for fever, hypotension, tachycardia, and altered mental status.'] },
    { condition: 'Heart Failure', probability: 0.18, explanation: ['Consider cardiac history, oxygenation, and fluid status.'] },
    { condition: 'Asthma', probability: 0.16, explanation: ['Assess wheeze, work of breathing, and bronchodilator response.'] },
  ];

  return normalizePatientCheckerResponse(
    {
      primaryCondition: topPredictions[0].condition,
      confidence: 52,
      confidenceScore: 0.52,
      riskScore: clampInt(intake.previousRiskScore ?? 55, 0, 100),
      topPredictions,
      reasoning: ['Emergency fallback activated after diagnostic failure.'],
      recommendedActions: ['Repeat vitals.', 'Clinician review recommended.', 'Escalate if instability is present.'],
      severity: 'Moderate',
      triageLevel: 3,
      dataQuality: estimateDataQuality(intake),
      modelType: 'emergency_fallback_diagnostic_engine',
      disclaimer: DISCLAIMER,
      fallbackReason,
    },
    intake,
    'backend_fallback',
  );
}

function scoreFallbackConditions(
  symptoms: Set<string>,
  context: Set<string>,
  values: Record<string, number>,
): Record<string, number> {
  const scores: Record<string, number> = {
    'COPD Exacerbation': 0.08,
    Asthma: 0.08,
    Pneumonia: 0.08,
    Sepsis: 0.08,
    'Respiratory Failure': 0.08,
    'Heart Failure': 0.08,
    Stroke: 0.08,
    Diabetes: 0.08,
    DKA: 0.08,
    'Kidney Injury': 0.08,
  };
  const has = (...items: string[]) => items.filter((item) => symptoms.has(item)).length;

  scores['COPD Exacerbation'] += (values.spo2 < 92 ? 0.22 : 0) + (values.respiratoryRate > 22 ? 0.14 : 0) + has('shortness of breath', 'cough', 'wheezing') * 0.12 + (context.has('copd') ? 0.18 : 0) + (context.has('smoker') ? 0.08 : 0);
  scores.Asthma += has('wheezing', 'shortness of breath', 'cough') * 0.15 + (values.respiratoryRate > 24 ? 0.14 : 0) + (context.has('asthma') ? 0.16 : 0);
  scores.Pneumonia += has('fever', 'cough', 'chills', 'fatigue', 'shortness of breath') * 0.11 + (values.temperature > 100.4 ? 0.18 : 0) + (values.spo2 < 94 ? 0.1 : 0);
  scores.Sepsis += has('fever', 'chills', 'confusion', 'weakness') * 0.13 + (values.heartRate > 110 ? 0.16 : 0) + (values.bpSys > 0 && values.bpSys < 95 ? 0.18 : 0) + (values.respiratoryRate > 22 ? 0.08 : 0);
  scores['Respiratory Failure'] += (values.spo2 < 88 ? 0.34 : 0) + (values.respiratoryRate > 28 || (values.respiratoryRate > 0 && values.respiratoryRate < 10) ? 0.2 : 0) + has('confusion', 'shortness of breath') * 0.12;
  scores['Heart Failure'] += has('shortness of breath', 'fatigue', 'chest pain') * 0.1 + (values.spo2 < 93 ? 0.12 : 0) + (context.has('cardiac history') || context.has('heart failure') ? 0.18 : 0);
  scores.Stroke += has('confusion', 'headache', 'weakness', 'dizziness', 'facial droop', 'neurologic deficit') * 0.12 + (context.has('hypertension') ? 0.08 : 0);
  scores.Diabetes += (context.has('diabetic') ? 0.2 : 0) + (values.glucose > 180 ? 0.16 : 0) + has('excessive thirst', 'excessive urination') * 0.14;
  scores.DKA += (context.has('diabetic') ? 0.13 : 0) + (values.glucose > 250 ? 0.25 : 0) + (values.respiratoryRate > 24 ? 0.08 : 0) + has('excessive thirst', 'excessive urination', 'fatigue') * 0.1;
  scores['Kidney Injury'] += (context.has('kidney disease') || context.has('diabetic') || context.has('hypertension') ? 0.12 : 0) + has('fatigue', 'weakness', 'reduced urine output', 'edema') * 0.09;

  return scores;
}

function explainFallback(
  condition: string,
  values: Record<string, number>,
  symptoms: Set<string>,
  context: Set<string>,
): string[] {
  const reasons: string[] = [];
  if (symptoms.size > 0) reasons.push(`Patient presents with ${[...symptoms].slice(0, 4).join(', ')}.`);
  if (values.spo2 > 0 && values.spo2 < 94) reasons.push(`Low SpO2 (${values.spo2}%) increases probability of ${condition}.`);
  if (values.heartRate > 110) reasons.push(`Tachycardia (${values.heartRate}/min) contributes to acuity.`);
  if (values.respiratoryRate > 22) reasons.push(`Elevated respiratory rate (${values.respiratoryRate}/min) suggests physiologic stress.`);
  if (values.temperature > 100.4) reasons.push(`Fever (${values.temperature}F) supports infectious differential.`);
  if (values.bpSys > 0 && values.bpSys < 95) reasons.push(`Low systolic pressure (${values.bpSys} mmHg) raises perfusion concern.`);
  if (values.glucose > 240) reasons.push(`Marked hyperglycemia (${values.glucose} mg/dL) supports metabolic risk.`);
  if (context.size > 0) reasons.push(`Medical history considered: ${[...context].join(', ')}.`);
  if (reasons.length === 0) reasons.push('Pattern is based on available symptoms, vitals, and medical history.');
  return reasons.slice(0, 6);
}

function actionsFor(condition: string, triageLevel: number): string[] {
  const urgent = triageLevel >= 4 ? ['Increase monitoring frequency.', 'Notify responsible clinician.'] : [];
  const map: Record<string, string[]> = {
    Pneumonia: ['Review oxygen therapy.', 'Consider chest imaging and infectious workup.'],
    Sepsis: ['Screen for sepsis bundle criteria.', 'Review fluids, cultures, lactate, and antimicrobial timing.'],
    'Respiratory Failure': ['Prepare airway and ventilatory support pathway.', 'Notify respiratory specialist.'],
    'COPD Exacerbation': ['Review bronchodilator and oxygen strategy.', 'Notify respiratory specialist.'],
    'Heart Failure': ['Assess fluid balance and cardiac markers.', 'Review diuretic and oxygen plan.'],
    Asthma: ['Assess airway and work of breathing.', 'Review bronchodilator response.'],
    Stroke: ['Perform focused neurologic assessment.', 'Escalate stroke pathway if deficits persist.'],
    Diabetes: ['Review glucose trend and diabetes plan.', 'Repeat glucose monitoring.'],
    DKA: ['Check ketones, anion gap, and acid-base status.', 'Review insulin and fluid protocol.'],
    'Kidney Injury': ['Review urine output and creatinine trend.', 'Assess fluid balance.'],
  };
  return [...urgent, ...(map[condition] ?? ['Repeat vitals.', 'Clinician review if symptoms persist or vitals are abnormal.'])];
}

function normalizeTopPredictions(rawPrediction: PredictionLike): Array<{ condition: string; probability: number; explanation: string[] }> {
  const candidates = rawPrediction.topPredictions ?? rawPrediction.differentials ?? rawPrediction.possible_diseases ?? [];
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((item): { condition: string; probability: number; explanation: string[] } | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const condition = nonEmptyString(record.condition ?? record.diagnosis ?? record.name, '');
      if (!condition) return null;
      const probability = toRatio(record.probability ?? record.confidence, 0.1);
      const explanation = normalizeStringList(record.explanation ?? record.reasoning);
      return { condition, probability, explanation };
    })
    .filter((item): item is { condition: string; probability: number; explanation: string[] } => Boolean(item))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

function normalizeReasoning(rawPrediction: PredictionLike, fallback: string[]): string[] {
  const reasoning = rawPrediction.reasoning as unknown;
  if (typeof reasoning === 'string' && reasoning.trim()) return [reasoning.trim()];
  const list = normalizeStringList(rawPrediction.reasoningItems ?? reasoning);
  return list.length > 0 ? list : fallback;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return typeof value === 'string' && value.trim() ? [value.trim()] : [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function nonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function numberValue(value: unknown, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function toPercent(value: unknown, fallback: number): number {
  const numeric = numberValue(value, fallback);
  if (numeric <= 1) return clampInt(numeric * 100, 0, 100);
  return clampInt(numeric, 0, 100);
}

function toRatio(value: unknown, fallback: number): number {
  const numeric = numberValue(value, fallback);
  if (numeric > 1) return Math.max(0, Math.min(1, numeric / 100));
  return Math.max(0, Math.min(1, numeric));
}

function clampInt(value: unknown, min: number, max: number): number {
  const numeric = Math.round(numberValue(value, min));
  return Math.max(min, Math.min(max, numeric));
}

function roundRatio(value: number): number {
  return Math.round(value * 100) / 100;
}

function triageFromRisk(riskScore: number): AlertTier {
  if (riskScore >= 86) return 5;
  if (riskScore >= 66) return 4;
  if (riskScore >= 41) return 3;
  if (riskScore >= 21) return 2;
  return 1;
}

function severityFromTriage(triageLevel: number): string {
  if (triageLevel >= 5) return 'Critical';
  if (triageLevel >= 4) return 'High';
  if (triageLevel >= 3) return 'Moderate';
  return 'Low';
}

function estimateDataQuality(intake: PatientCheckerIntake): number {
  const vitals = intake.vitals ?? {};
  const symptoms = intake.symptoms ?? [];
  const context = intake.clinicalContext ?? [];
  const demographics = intake.demographics ?? {};
  const vitalScore = Object.values(vitals).filter((value) => Number(value) > 0).length * 7;
  const demographicScore = Object.values(demographics).filter((value) => value !== undefined && value !== null && value !== '').length * 4;
  return Math.min(100, 30 + vitalScore + demographicScore + symptoms.length * 4 + context.length * 3);
}
