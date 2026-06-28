import type { Request, Response } from 'express';
import { checkAiEngineHealth, predictDiagnosis } from '../services/ai-engine.client.js';
import { appendPatientAudit, query, saveDiagnosisAssessment } from '../services/database.service.js';
import {
  normalizePatientCheckerResponse,
  runFallbackPatientChecker,
  type PatientCheckerIntake,
  type PatientCheckerResponse,
} from '../services/patient-checker.service.js';
import { runtimeLog } from '../services/runtime-logger.service.js';
import type { WebSocketGateway } from '../websocket/gateway.js';

const acknowledgements = new Map<string, { patientId: string; acknowledgedAt: string }>();

export async function acknowledgeAlert(req: Request, res: Response): Promise<void> {
  const alertId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const patientId = String(req.body?.patientId ?? 'unknown');
  const acknowledgedAt = new Date().toISOString();
  acknowledgements.set(alertId, { patientId, acknowledgedAt });
  runtimeLog('alert', 'Alert acknowledged', { alertId, patientId, acknowledgedAt });
  try {
    await appendPatientAudit(patientId, 'acknowledgement', 'clinician', { alertId, acknowledgedAt });
  } catch (err) {
    console.error('[alerts] acknowledgement audit skipped:', err);
  }
  res.json({ ok: true, alertId, patientId, acknowledgedAt });
}

export async function runDiagnosticCheck(req: Request, res: Response): Promise<void> {
  const intake = normalizeIntake(req.body ?? {});
  const symptoms = intake.symptoms ?? [];
  const requestId = req.header('x-request-id') ?? `pc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  runtimeLog('diagnostic', 'Patient Checker Request Received', {
    requestId,
    route: req.originalUrl,
    patientId: intake.patientId ?? null,
    symptomCount: symptoms.length,
  });

  try {
    const prediction = await predictDiagnosis(intake as Record<string, unknown>);
    const responseBody = withLegacyAliases(
      normalizePatientCheckerResponse(prediction as unknown as Record<string, unknown>, intake, 'ai_engine'),
      symptoms.length,
    );
    const gateway = req.app.get('gateway') as WebSocketGateway | undefined;
    gateway?.emitDiagnosisUpdate({
      patientId: intake.patientId,
      primaryDiagnosis: responseBody.primaryDiagnosis,
      primaryCondition: responseBody.primaryCondition,
      confidence: responseBody.confidence,
      severity: responseBody.severity,
      triageLevel: responseBody.triageLevel,
      createdAt: new Date().toISOString(),
    });
    try {
      await saveDiagnosisAssessment({
        patientId: typeof intake.patientId === 'string' ? intake.patientId : null,
        primaryCondition: responseBody.primaryCondition,
        confidence: responseBody.confidenceScore,
        severity: responseBody.severity,
        triageLevel: responseBody.triageLevel,
        payload: intake as Record<string, unknown>,
        prediction: responseBody as unknown as Record<string, unknown>,
      });
    } catch (persistErr) {
      console.error('[diagnostics] assessment persistence skipped:', persistErr);
    }
    runtimeLog('diagnostic', 'Patient Checker Request Completed', {
      requestId,
      modelUsed: responseBody.modelUsed,
      primaryDiagnosis: responseBody.primaryDiagnosis,
      riskScore: responseBody.riskScore,
    });
    res.json(responseBody);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('[diagnostics] Patient Checker Failed, using backend fallback:', err);
    runtimeLog('diagnostic', 'Patient Checker Failed', {
      requestId,
      stage: 'ai_engine',
      error: errorMessage,
    });

    const fallback = withLegacyAliases(runFallbackPatientChecker(intake, errorMessage), symptoms.length);
    runtimeLog('diagnostic', 'Patient Checker Request Completed', {
      requestId,
      modelUsed: fallback.modelUsed,
      primaryDiagnosis: fallback.primaryDiagnosis,
      riskScore: fallback.riskScore,
      fallbackReason: fallback.fallbackReason ?? errorMessage,
    });
    res.json(fallback);
  }
}

export async function patientCheckerHealth(req: Request, res: Response): Promise<void> {
  const [aiEngine, database] = await Promise.all([checkAiEngineHealth(), checkDatabaseHealth()]);
  const gateway = req.app.get('gateway') as WebSocketGateway | undefined;
  const webSocket = typeof gateway?.status === 'function'
    ? gateway.status()
    : { status: gateway ? 'initialized' : 'not_initialized' };
  const aiStatus = aiEngine.status === 'ok' ? 'ok' : 'fallback_available';

  res.json({
    service: 'patient-checker',
    status: database.status === 'ok' ? 'ok' : 'degraded',
    aiStatus,
    modelStatus: modelStatusFromAi(aiEngine),
    databaseStatus: database,
    webSocketStatus: webSocket,
    fallbackStatus: 'available',
    aiEngine,
  });
}

function normalizeIntake(input: unknown): PatientCheckerIntake {
  const record = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    patientId: typeof record.patientId === 'string' ? record.patientId : undefined,
    demographics: objectValue(record.demographics),
    vitals: objectValue(record.vitals),
    symptoms: stringList(record.symptoms),
    clinicalContext: stringList(record.clinicalContext ?? record.clinical_context ?? record.medicalHistory),
    previousRiskScore: numberValue(record.previousRiskScore),
    baseline: objectValue(record.baseline),
  };
}

function withLegacyAliases(response: PatientCheckerResponse, symptomCount: number): PatientCheckerResponse & Record<string, unknown> {
  return {
    ...response,
    symptom_score: symptomCount * 10,
    risk_estimation: response.riskScore,
    possible_conditions: response.topPredictions.map((item) => item.condition),
    recommended_triage_level: response.triageLevel,
    possible_diseases: response.topPredictions.map((item) => ({
      name: item.condition,
      probability: item.probability,
      explanation: item.explanation,
    })),
    model_type: response.modelType,
    note: response.disclaimer,
  };
}

async function checkDatabaseHealth(): Promise<Record<string, unknown>> {
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
  const nested = aiEngine.patientChecker;
  if (nested && typeof nested === 'object' && 'modelStatus' in nested) {
    return (nested as Record<string, unknown>).modelStatus as Record<string, unknown>;
  }
  return { status: aiEngine.status === 'ok' ? 'unknown' : 'fallback_available' };
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function numberValue(value: unknown): number | undefined {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function runEmbeddedPatientChecker(intake: any) {
  const symptoms = new Set<string>((intake.symptoms ?? []).map((item: string) => item.toLowerCase()));
  const context = new Set<string>((intake.clinicalContext ?? []).map((item: string) => item.toLowerCase()));
  const vitals = intake.vitals ?? {};
  const demographics = intake.demographics ?? {};
  const scores: Record<string, number> = {
    'COPD Exacerbation': 0.08,
    Asthma: 0.08,
    Pneumonia: 0.08,
    Sepsis: 0.08,
    'Respiratory Failure': 0.08,
    Diabetes: 0.05,
    DKA: 0.05,
    Hypertension: 0.05,
    Hypotension: 0.05,
    'Cardiac Arrhythmia': 0.06,
    'Heart Failure': 0.06,
    Stroke: 0.05,
    'COVID-like Infection': 0.05,
    Anemia: 0.05,
    'Kidney Injury': 0.05,
  };
  const has = (...items: string[]) => items.filter((item) => symptoms.has(item)).length;
  const spo2 = Number(vitals.spo2 ?? 0);
  const hr = Number(vitals.heartRate ?? 0);
  const bpSys = Number(vitals.bpSys ?? vitals.bloodPressure ?? 0);
  const rr = Number(vitals.respiratoryRate ?? 0);
  const temp = Number(vitals.temperature ?? 0);
  const glucose = Number(vitals.glucose ?? vitals.bloodGlucose ?? 0);

  scores['COPD Exacerbation'] += (spo2 < 92 ? 0.22 : 0) + (rr > 22 ? 0.14 : 0) + has('shortness of breath', 'cough', 'wheezing') * 0.12 + (context.has('copd') ? 0.18 : 0) + (context.has('smoker') ? 0.08 : 0);
  scores.Asthma += has('wheezing', 'shortness of breath', 'cough') * 0.15 + (rr > 24 ? 0.14 : 0);
  scores.Pneumonia += has('fever', 'cough', 'chills', 'fatigue', 'shortness of breath') * 0.11 + (temp > 100.4 ? 0.18 : 0) + (spo2 < 94 ? 0.1 : 0);
  scores.Sepsis += has('fever', 'chills', 'confusion', 'weakness') * 0.13 + (hr > 110 ? 0.16 : 0) + (bpSys > 0 && bpSys < 95 ? 0.18 : 0) + (rr > 22 ? 0.08 : 0);
  scores['Respiratory Failure'] += (spo2 < 88 ? 0.34 : 0) + (rr > 28 || (rr > 0 && rr < 10) ? 0.2 : 0) + has('confusion', 'shortness of breath') * 0.12;
  scores.Diabetes += (context.has('diabetic') ? 0.2 : 0) + (glucose > 180 ? 0.16 : 0) + has('excessive thirst', 'excessive urination') * 0.14;
  scores.DKA += (context.has('diabetic') ? 0.13 : 0) + (glucose > 250 ? 0.25 : 0) + (rr > 24 ? 0.08 : 0) + has('excessive thirst', 'excessive urination', 'fatigue') * 0.1;
  scores.Hypertension += (bpSys >= 180 ? 0.35 : bpSys >= 150 ? 0.16 : 0) + (context.has('hypertension') ? 0.14 : 0) + has('headache', 'chest pain', 'dizziness') * 0.09;
  scores.Hypotension += (bpSys > 0 && bpSys < 90 ? 0.4 : 0) + has('dizziness', 'weakness', 'confusion') * 0.1;
  scores['Cardiac Arrhythmia'] += has('palpitations', 'dizziness', 'chest pain') * 0.16 + (hr > 125 || (hr > 0 && hr < 50) ? 0.2 : 0) + (context.has('cardiac history') ? 0.1 : 0);
  scores['Heart Failure'] += has('shortness of breath', 'fatigue', 'chest pain') * 0.1 + (spo2 < 93 ? 0.12 : 0) + (context.has('cardiac history') ? 0.18 : 0);
  scores.Stroke += has('confusion', 'headache', 'weakness', 'dizziness') * 0.12 + (context.has('hypertension') ? 0.08 : 0);
  scores['COVID-like Infection'] += has('fever', 'cough', 'fatigue', 'headache', 'chills') * 0.1 + (spo2 < 94 ? 0.08 : 0);
  scores.Anemia += has('fatigue', 'weakness', 'dizziness') * 0.1 + (hr > 105 ? 0.08 : 0);
  scores['Kidney Injury'] += (context.has('diabetic') || context.has('hypertension') ? 0.08 : 0) + has('fatigue', 'weakness') * 0.06;

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  const topPredictions = Object.entries(scores)
    .map(([condition, score]) => ({
      condition,
      probability: Number(Math.max(0.03, Math.min(0.96, score / total)).toFixed(2)),
      explanation: explainEmbedded(condition, { spo2, hr, bpSys, rr, temp, glucose }, symptoms, context),
    }))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
  const primary = topPredictions[0];
  const evidenceCount = primary.explanation.length + symptoms.size + context.size;
  const dataQualityScore = Math.min(100, 45 + Object.values(vitals).filter((value) => Number(value) > 0).length * 7 + symptoms.size * 4 + context.size * 3);
  const confidence = Math.min(0.94, Math.max(0.48, primary.probability * 2.2 + evidenceCount * 0.025));
  const riskScore = Math.min(100, Math.round(confidence * 55 + (spo2 && spo2 < 90 ? 20 : 0) + (bpSys && (bpSys < 90 || bpSys >= 180) ? 15 : 0) + (hr > 125 ? 10 : 0)));
  const triageLevel = riskScore >= 86 ? 5 : riskScore >= 66 ? 4 : riskScore >= 41 ? 3 : riskScore >= 21 ? 2 : 1;
  return {
    primaryCondition: primary.condition,
    confidence: Number(confidence.toFixed(2)),
    modelConfidence: Number(Math.min(0.92, confidence + 0.04).toFixed(2)),
    predictionConfidence: Number(confidence.toFixed(2)),
    dataQualityScore,
    topPredictions,
    riskFactors: [...context, Number(demographics.age ?? 0) > 60 ? 'age > 60' : ''].filter(Boolean),
    reasoning: primary.explanation,
    recommendedActions: actionsFor(primary.condition, triageLevel),
    severity: triageLevel >= 5 ? 'Critical' : triageLevel >= 4 ? 'High' : triageLevel >= 3 ? 'Moderate' : 'Low',
    triageLevel,
    riskScore,
    modelType: 'embedded_hybrid_patient_checker',
    disclaimer: 'Suggestive diagnosis only. Not a definitive medical diagnosis.',
  };
}

function explainEmbedded(condition: string, vitals: Record<string, number>, symptoms: Set<string>, context: Set<string>): string[] {
  const reasons: string[] = [];
  if (symptoms.size > 0) reasons.push(`Patient presents with ${[...symptoms].slice(0, 4).join(', ')}.`);
  if (vitals.spo2 && vitals.spo2 < 94) reasons.push(`Low SpO2 (${vitals.spo2}%) increases probability of ${condition}.`);
  if (vitals.hr > 110) reasons.push(`Tachycardia (${vitals.hr}/min) contributes to acuity.`);
  if (vitals.rr > 22) reasons.push(`Elevated respiratory rate (${vitals.rr}/min) suggests physiologic stress.`);
  if (vitals.temp > 100.4) reasons.push(`Fever (${vitals.temp}F) supports infectious differential.`);
  if (vitals.bpSys && vitals.bpSys < 95) reasons.push(`Low systolic pressure (${vitals.bpSys} mmHg) raises perfusion concern.`);
  if (vitals.glucose > 240) reasons.push(`Marked hyperglycemia (${vitals.glucose} mg/dL) supports metabolic risk.`);
  if (context.size > 0) reasons.push(`Medical history considered: ${[...context].join(', ')}.`);
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
    'Cardiac Arrhythmia': ['Obtain ECG rhythm strip.', 'Review electrolytes and hemodynamic stability.'],
  };
  return [...urgent, ...(map[condition] ?? ['Repeat vitals.', 'Clinician review if symptoms persist or vitals are abnormal.'])];
}
