import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, Brain, ClipboardCheck, RefreshCw, ShieldAlert, Stethoscope } from 'lucide-react';
import { Button, GlassPanel, TierBadge } from '@/components/ui';
import { useCommandCenter } from '@/context/CommandCenterContext';
import { ApiRequestError, submitDiagnosticIntake } from '@/runtime/sync/api-client';
import { runHybridDiseasePrediction } from '@/lib/disease-prediction';
import type { AlertTier } from '@/types';

type Demographics = {
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  height: number;
  weight: number;
};

type Vitals = {
  spo2: number;
  heartRate: number;
  bpSys: number;
  bpDia: number;
  respiratoryRate: number;
  temperature: number;
  glucose: number;
};

type DiagnosisResult = {
  success: boolean;
  primaryDiagnosis: string;
  primaryCondition: string;
  confidence: number;
  confidenceScore?: number;
  modelConfidence?: number;
  predictionConfidence?: number;
  dataQuality?: number;
  dataQualityScore?: number;
  differentials: Array<{ diagnosis: string; confidence: number; reasoning: string }>;
  topPredictions: Array<{ condition: string; probability: number; explanation: string[] }>;
  riskFactors: string[];
  reasoning: string;
  reasoningItems: string[];
  recommendations: string[];
  recommendedActions: string[];
  severity: string;
  triageLevel: 1 | 2 | 3 | 4 | 5;
  riskScore: number;
  modelUsed: string;
  modelType: string;
  disclaimer: string;
  fallbackReason?: string;
};

type PatientCheckerPayload = {
  patientId?: string;
  demographics: Demographics;
  vitals: Vitals;
  symptoms: string[];
  clinicalContext: string[];
  previousRiskScore?: number;
  baseline?: unknown;
};

const symptomGroups = {
  Respiratory: ['shortness of breath', 'cough', 'wheezing'],
  Cardiac: ['chest pain', 'palpitations', 'dizziness'],
  Infection: ['fever', 'chills', 'fatigue'],
  Neurological: ['confusion', 'headache', 'weakness'],
  Metabolic: ['excessive thirst', 'excessive urination'],
};

const contextOptions = ['smoker', 'copd', 'diabetic', 'hypertension', 'cardiac history'];

export function PatientCheckerPage() {
  const { patients, openDrawer } = useCommandCenter();
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id ?? '');
  const [demographics, setDemographics] = useState<Demographics>({ age: 62, gender: 'Male', height: 170, weight: 78 });
  const [vitals, setVitals] = useState<Vitals>({ spo2: 92, heartRate: 104, bpSys: 128, bpDia: 78, respiratoryRate: 24, temperature: 99.4, glucose: 128 });
  const [symptoms, setSymptoms] = useState<string[]>(['shortness of breath']);
  const [clinicalContext, setClinicalContext] = useState<string[]>([]);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [lastPayload, setLastPayload] = useState<PatientCheckerPayload | null>(null);

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
  const bmi = useMemo(() => demographics.weight / ((demographics.height / 100) ** 2), [demographics]);

  const toggle = (value: string, list: string[], setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const loadSelectedPatient = () => {
    if (!selectedPatient) return;
    setDemographics({
      age: selectedPatient.age,
      gender: selectedPatient.gender === 'F' ? 'Female' : 'Male',
      height: 170,
      weight: 78,
    });
    setVitals({
      spo2: selectedPatient.spo2,
      heartRate: selectedPatient.heartRate,
      bpSys: selectedPatient.bloodPressure,
      bpDia: selectedPatient.bpDia ?? 78,
      respiratoryRate: selectedPatient.respiratoryRate,
      temperature: selectedPatient.temperature,
      glucose: 120,
    });
    setClinicalContext((prev) => [...new Set([...prev, normalizeDiagnosis(selectedPatient.diagnosis)])].filter(Boolean));
  };

  const runAssessment = async () => {
    const payload: PatientCheckerPayload = {
      patientId: selectedPatientId || undefined,
      demographics,
      vitals,
      symptoms,
      clinicalContext,
      previousRiskScore: selectedPatient?.riskScore,
      baseline: selectedPatient?.baseline,
    };
    setLastPayload(payload);
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const response = await submitDiagnosticIntake(payload);
      const normalized = normalizeDiagnosisResult(response, payload);
      setResult(normalized);
      if (normalized.fallbackReason) {
        setWarning(`Fallback diagnostic engine used. Details: ${normalized.fallbackReason}`);
      }
    } catch (err) {
      const message = errorMessage(err);
      const fallback = runBrowserFallbackDiagnosis(payload, message);
      setResult(fallback);
      setWarning(`Backend request failed; browser fallback diagnostic engine used. Details: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const retryAssessment = async () => {
    if (!lastPayload) {
      await runAssessment();
      return;
    }
    setLoading(true);
    setError('');
    setWarning('');
    try {
      const response = await submitDiagnosticIntake(lastPayload);
      const normalized = normalizeDiagnosisResult(response, lastPayload);
      setResult(normalized);
      if (normalized.fallbackReason) {
        setWarning(`Fallback diagnostic engine used. Details: ${normalized.fallbackReason}`);
      }
    } catch (err) {
      const message = errorMessage(err);
      setResult(runBrowserFallbackDiagnosis(lastPayload, message));
      setWarning(`Retry failed; browser fallback diagnostic engine remains active. Details: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-command-glow" />
            Patient Checker Pro
          </h2>
          <p className="text-sm text-command-muted">Clinical assessment workflow with explainable differential diagnosis.</p>
        </div>
        <div className="text-[11px] px-3 py-2 rounded border border-command-glow/30 bg-command-glow/10 text-command-glow">
          Suggestive diagnosis only.
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-4">
        <div className="space-y-4">
          <GlassPanel className="p-4">
            <SectionHeader icon={ClipboardCheck} title="Patient Information" />
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 mb-3">
              <select
                value={selectedPatientId}
                onChange={(event) => setSelectedPatientId(event.target.value)}
                className="bg-command-elevated border border-white/10 rounded px-3 py-2 text-sm"
              >
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} · {patient.room} · Risk {patient.riskScore}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="glow" disabled={!selectedPatient} onClick={loadSelectedPatient}>Load Live Patient</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <NumberField label="Age" value={demographics.age} onChange={(age) => setDemographics({ ...demographics, age })} />
              <label className="text-xs text-command-muted">Gender
                <select value={demographics.gender} onChange={(e) => setDemographics({ ...demographics, gender: e.target.value as Demographics['gender'] })} className="mt-1 w-full bg-command-elevated border border-white/10 rounded px-3 py-2 text-white">
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </label>
              <NumberField label="Height cm" value={demographics.height} onChange={(height) => setDemographics({ ...demographics, height })} />
              <NumberField label="Weight kg" value={demographics.weight} onChange={(weight) => setDemographics({ ...demographics, weight })} />
              <div className="p-2 rounded bg-white/[0.03] border border-white/[0.05]">
                <div className="text-[10px] text-command-muted">BMI</div>
                <div className="font-mono text-lg">{Number.isFinite(bmi) ? bmi.toFixed(1) : '0.0'}</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <SectionHeader icon={Activity} title="Vitals Input" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <NumberField label="SpO2" value={vitals.spo2} onChange={(spo2) => setVitals({ ...vitals, spo2 })} />
              <NumberField label="HR" value={vitals.heartRate} onChange={(heartRate) => setVitals({ ...vitals, heartRate })} />
              <NumberField label="BP Sys" value={vitals.bpSys} onChange={(bpSys) => setVitals({ ...vitals, bpSys })} />
              <NumberField label="BP Dia" value={vitals.bpDia} onChange={(bpDia) => setVitals({ ...vitals, bpDia })} />
              <NumberField label="RR" value={vitals.respiratoryRate} onChange={(respiratoryRate) => setVitals({ ...vitals, respiratoryRate })} />
              <NumberField label="Temp F" value={vitals.temperature} onChange={(temperature) => setVitals({ ...vitals, temperature })} />
              <NumberField label="Glucose" value={vitals.glucose} onChange={(glucose) => setVitals({ ...vitals, glucose })} />
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <SectionHeader icon={Brain} title="Symptom Selection" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(symptomGroups).map(([group, options]) => (
                <div key={group}>
                  <div className="text-[10px] uppercase text-command-muted mb-1">{group}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {options.map((option) => (
                      <Chip key={option} active={symptoms.includes(option)} onClick={() => toggle(option, symptoms, setSymptoms)}>{option}</Chip>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel className="p-4">
            <SectionHeader icon={AlertTriangle} title="Medical History" />
            <div className="flex flex-wrap gap-1.5 mb-4">
              {contextOptions.map((option) => (
                <Chip key={option} active={clinicalContext.includes(option)} onClick={() => toggle(option, clinicalContext, setClinicalContext)}>{option}</Chip>
              ))}
            </div>
            <Button variant="glow" className="w-full gap-2" disabled={loading || symptoms.length === 0} onClick={() => void runAssessment()}>
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {loading ? 'Analyzing clinical pattern...' : 'Generate Differential Diagnosis'}
            </Button>
            {(warning || error) && (
              <div className="mt-3 rounded border border-tier-4/30 bg-tier-4/10 p-3 text-xs text-white/85">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-tier-4" />
                  <div className="min-w-0">
                    <p className="leading-relaxed">{warning || error}</p>
                    <Button size="sm" variant="outline" className="mt-2 gap-2" disabled={loading} onClick={() => void retryAssessment()}>
                      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Retry Backend
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>
        </div>

        <GlassPanel className="p-4">
          <SectionHeader icon={Stethoscope} title="Prediction Results" />
          {!result ? (
            <div className="rounded border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-command-muted leading-relaxed">
              Enter demographics, vitals, symptoms, and clinical context to generate an explainable differential diagnosis.
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="rounded border border-tier-4/30 bg-tier-4/10 p-3 text-xs text-white/85">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-tier-4" />
                  <p>Suggestive diagnosis only. Not a definitive medical diagnosis.</p>
                </div>
              </div>

              <div className="p-3 rounded bg-command-glow/10 border border-command-glow/20">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] uppercase text-command-muted">Primary Diagnosis</div>
                    <div className="text-lg font-bold">{result.primaryDiagnosis || result.primaryCondition}</div>
                  </div>
                  <TierBadge tier={result.triageLevel} label={result.severity} />
                </div>
                <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <Metric label="Confidence" value={`${percentValue(result.confidence)}%`} />
                  <Metric label="Risk Score" value={String(result.riskScore)} />
                  <Metric label="Data Quality" value={`${result.dataQuality ?? result.dataQualityScore ?? 72}%`} />
                  <Metric label="Model Used" value={result.modelUsed || result.modelType} compact />
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Metric label="Model Confidence" value={`${percentValue(result.modelConfidence ?? result.confidence)}%`} />
                  <Metric label="Prediction Confidence" value={`${percentValue(result.predictionConfidence ?? result.confidence)}%`} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-command-muted mb-2">Top 5 Diagnoses</div>
                {result.topPredictions.slice(0, 5).map((prediction, index) => (
                  <div key={prediction.condition} className="py-2 border-b border-white/[0.05]">
                    <div className="flex justify-between gap-2 text-xs">
                      <span>{index + 1}. {prediction.condition}</span>
                      <span className="font-mono text-command-glow">{Math.round(prediction.probability * 100)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full bg-command-glow" style={{ width: `${Math.round(prediction.probability * 100)}%` }} />
                    </div>
                    {prediction.explanation[0] && <p className="text-[11px] text-command-muted mt-1">{prediction.explanation[0]}</p>}
                  </div>
                ))}
              </div>

              <Detail title="Clinical Reasoning" items={result.reasoningItems.length ? result.reasoningItems : [result.reasoning].filter(Boolean)} />
              <Detail title="Risk indicators" items={result.riskFactors} empty="No extra risk indicators selected." />
              <Detail title="Recommended Actions" items={result.recommendations.length ? result.recommendations : result.recommendedActions} />
              <p className="text-[11px] text-command-muted italic">{result.disclaimer}</p>
              <p className="text-[10px] text-command-muted">Model: {result.modelUsed || result.modelType}</p>
              {selectedPatient && (
                <Button variant="outline" className="w-full" onClick={() => openDrawer(selectedPatient.id)}>
                  Open {selectedPatient.name} Detail Drawer
                </Button>
              )}
            </motion.div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Stethoscope; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-command-glow" />
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="text-xs text-command-muted">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full bg-command-elevated border border-white/10 rounded px-3 py-2 text-white"
      />
    </label>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2 py-1 rounded border transition-colors ${
        active ? 'border-command-glow text-command-glow bg-command-glow/10' : 'border-white/10 text-command-muted hover:border-white/25'
      }`}
    >
      {children}
    </button>
  );
}

function Metric({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="p-2 rounded bg-white/[0.04] border border-white/[0.06]">
      <div className="text-[10px] text-command-muted">{label}</div>
      <div className={`font-mono ${compact ? 'text-xs leading-snug break-words' : 'text-lg'}`}>{value}</div>
    </div>
  );
}

function Detail({ title, items, empty = 'No details available.' }: { title: string; items: string[]; empty?: string }) {
  return (
    <div className="p-3 rounded bg-white/[0.03] border border-white/[0.05]">
      <div className="text-xs font-semibold text-command-muted mb-2">{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-command-muted">{empty}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item} className="text-xs text-white/85 leading-relaxed">{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function normalizeDiagnosisResult(raw: unknown, payload: PatientCheckerPayload): DiagnosisResult {
  const record = toRecord(raw);
  const topPredictions = normalizeTopPredictions(record);
  const primaryCondition = stringValue(record.primaryCondition ?? record.primaryDiagnosis, topPredictions[0]?.condition ?? 'Undifferentiated Clinical Risk');
  const confidence = percentValue(record.confidence ?? record.predictionConfidence ?? topPredictions[0]?.probability ?? 62);
  const confidenceScore = ratioValue(record.confidenceScore ?? record.confidence ?? confidence, confidence / 100);
  const riskScore = clampInt(record.riskScore ?? record.risk_estimation ?? payload.previousRiskScore ?? confidence, 0, 100);
  const triageLevel = clampInt(record.triageLevel ?? record.recommended_triage_level ?? triageFromRisk(riskScore), 1, 5) as DiagnosisResult['triageLevel'];
  const reasoningItems = normalizeReasoning(record, topPredictions[0]?.explanation ?? []);
  const recommendations = stringList(record.recommendations ?? record.recommendedActions);
  const modelUsed = stringValue(record.modelUsed ?? record.modelType ?? record.model_type, 'patient_checker');
  const dataQuality = clampInt(record.dataQuality ?? record.dataQualityScore ?? estimateDataQuality(payload), 0, 100);

  return {
    success: record.success !== false,
    primaryDiagnosis: stringValue(record.primaryDiagnosis, primaryCondition),
    primaryCondition,
    confidence,
    confidenceScore,
    modelConfidence: percentValue(record.modelConfidence ?? confidence),
    predictionConfidence: percentValue(record.predictionConfidence ?? confidence),
    dataQuality,
    dataQualityScore: dataQuality,
    differentials: topPredictions.map((item) => ({
      diagnosis: item.condition,
      confidence: percentValue(item.probability),
      reasoning: item.explanation.join(' '),
    })),
    topPredictions,
    riskFactors: stringList(record.riskFactors),
    reasoning: typeof record.reasoning === 'string' ? record.reasoning : reasoningItems.join(' '),
    reasoningItems,
    recommendations,
    recommendedActions: recommendations,
    severity: stringValue(record.severity, severityFromTriage(triageLevel)),
    triageLevel,
    riskScore,
    modelUsed,
    modelType: modelUsed,
    disclaimer: stringValue(record.disclaimer ?? record.note, 'Suggestive diagnosis only. Not a definitive medical diagnosis.'),
    fallbackReason: typeof record.fallbackReason === 'string' ? record.fallbackReason : undefined,
  };
}

function runBrowserFallbackDiagnosis(payload: PatientCheckerPayload, fallbackReason: string): DiagnosisResult {
  const report = runHybridDiseasePrediction({
    symptoms: payload.symptoms,
    durationHours: 12,
    age: payload.demographics.age,
    gender: payload.demographics.gender === 'Male' ? 'M' : payload.demographics.gender === 'Female' ? 'F' : 'Other',
    medicalHistory: payload.clinicalContext,
    lifestyleFactors: payload.clinicalContext.filter((item) => item.toLowerCase().includes('smoker')),
    existingConditions: payload.clinicalContext,
    vitals: {
      spo2: payload.vitals.spo2,
      heartRate: payload.vitals.heartRate,
      bloodPressure: payload.vitals.bpSys,
      respiratoryRate: payload.vitals.respiratoryRate,
      temperature: payload.vitals.temperature,
    },
    aiRiskScore: payload.previousRiskScore,
  });
  const topPredictions = ensureTopFive(
    report.possible_diseases.map((item) => ({
      condition: item.name,
      probability: ratioValue(item.probability, 0.15),
      explanation: explainLocal(item.name, payload),
    })),
    payload,
  );
  const primary = topPredictions[0];
  const riskScore = Math.max(report.risk_estimation, payload.previousRiskScore ?? 0, payload.vitals.spo2 < 90 ? 74 : 0);
  const triageLevel = triageFromRisk(riskScore);
  const confidence = Math.max(52, percentValue(report.confidence));
  const reasoningItems = primary.explanation.length ? primary.explanation : explainLocal(primary.condition, payload);
  const recommendations = localActionsFor(primary.condition, triageLevel);
  return {
    success: true,
    primaryDiagnosis: primary.condition,
    primaryCondition: primary.condition,
    confidence,
    confidenceScore: confidence / 100,
    modelConfidence: confidence,
    predictionConfidence: confidence,
    dataQuality: estimateDataQuality(payload),
    dataQualityScore: estimateDataQuality(payload),
    differentials: topPredictions.map((item) => ({
      diagnosis: item.condition,
      confidence: percentValue(item.probability),
      reasoning: item.explanation.join(' '),
    })),
    topPredictions,
    riskFactors: [...payload.clinicalContext, payload.demographics.age > 60 ? 'age > 60' : ''].filter(Boolean),
    reasoning: reasoningItems.join(' '),
    reasoningItems,
    recommendations,
    recommendedActions: recommendations,
    severity: severityFromTriage(triageLevel),
    triageLevel,
    riskScore,
    modelUsed: 'browser_fallback_diagnostic_engine',
    modelType: 'browser_fallback_diagnostic_engine',
    disclaimer: 'Suggestive diagnosis only. Not a definitive medical diagnosis.',
    fallbackReason,
  };
}

function normalizeTopPredictions(record: Record<string, unknown>): DiagnosisResult['topPredictions'] {
  const candidates = record.topPredictions ?? record.differentials ?? record.possible_diseases ?? [];
  if (!Array.isArray(candidates)) return [];
  return candidates
    .map((item) => {
      const itemRecord = toRecord(item);
      const condition = stringValue(itemRecord.condition ?? itemRecord.diagnosis ?? itemRecord.name, '');
      if (!condition) return null;
      return {
        condition,
        probability: ratioValue(itemRecord.probability ?? itemRecord.confidence, 0.1),
        explanation: stringList(itemRecord.explanation ?? itemRecord.reasoning),
      };
    })
    .filter((item): item is DiagnosisResult['topPredictions'][number] => Boolean(item))
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 5);
}

function normalizeReasoning(record: Record<string, unknown>, fallback: string[]): string[] {
  if (Array.isArray(record.reasoning)) return stringList(record.reasoning);
  if (typeof record.reasoning === 'string' && record.reasoning.trim()) return [record.reasoning.trim()];
  const items = stringList(record.reasoningItems ?? record.reasoningText);
  return items.length ? items : fallback;
}

function ensureTopFive(topPredictions: DiagnosisResult['topPredictions'], payload: PatientCheckerPayload): DiagnosisResult['topPredictions'] {
  const defaults = ['COPD Exacerbation', 'Pneumonia', 'Sepsis', 'Heart Failure', 'Asthma'];
  const merged = [...topPredictions];
  for (const condition of defaults) {
    if (merged.length >= 5) break;
    if (merged.some((item) => item.condition === condition)) continue;
    merged.push({
      condition,
      probability: Math.max(0.1, 0.28 - merged.length * 0.03),
      explanation: explainLocal(condition, payload),
    });
  }
  return merged.slice(0, 5);
}

function explainLocal(condition: string, payload: PatientCheckerPayload): string[] {
  const reasons: string[] = [];
  if (payload.symptoms.length) reasons.push(`Symptoms reported: ${payload.symptoms.slice(0, 4).join(', ')}.`);
  if (payload.vitals.spo2 < 94) reasons.push(`SpO2 ${payload.vitals.spo2}% is below expected range.`);
  if (payload.vitals.heartRate > 110) reasons.push(`Heart rate ${payload.vitals.heartRate}/min is elevated.`);
  if (payload.vitals.respiratoryRate > 22) reasons.push(`Respiratory rate ${payload.vitals.respiratoryRate}/min is elevated.`);
  if (payload.vitals.temperature > 100.4) reasons.push(`Temperature ${payload.vitals.temperature}F supports infectious concern.`);
  if (payload.clinicalContext.length) reasons.push(`History considered: ${payload.clinicalContext.join(', ')}.`);
  if (!reasons.length) reasons.push(`Fallback ranking includes ${condition} based on available clinical inputs.`);
  return reasons.slice(0, 5);
}

function localActionsFor(condition: string, triageLevel: AlertTier): string[] {
  const urgent = triageLevel >= 4 ? ['Increase monitoring frequency.', 'Notify responsible clinician.'] : [];
  const map: Record<string, string[]> = {
    'COPD Exacerbation': ['Review bronchodilator and oxygen strategy.', 'Notify respiratory specialist.'],
    Pneumonia: ['Review oxygen therapy.', 'Consider chest imaging and infectious workup.'],
    Sepsis: ['Screen for sepsis bundle criteria.', 'Review fluids, cultures, lactate, and antimicrobial timing.'],
    'Heart Failure': ['Assess fluid balance and cardiac markers.', 'Review diuretic and oxygen plan.'],
    Asthma: ['Assess airway and work of breathing.', 'Review bronchodilator response.'],
  };
  return [...urgent, ...(map[condition] ?? ['Repeat vitals.', 'Clinician review if symptoms persist or vitals are abnormal.'])];
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiRequestError) {
    const suffix = err.status ? ` (HTTP ${err.status})` : '';
    return `${err.message}${suffix}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function percentValue(value: unknown): number {
  const numeric = numberValue(value, 0);
  const percent = numeric <= 1 ? numeric * 100 : numeric;
  return clampInt(percent, 0, 100);
}

function ratioValue(value: unknown, fallback = 0): number {
  const numeric = numberValue(value, fallback);
  if (numeric > 1) return Math.max(0, Math.min(1, numeric / 100));
  return Math.max(0, Math.min(1, numeric));
}

function estimateDataQuality(payload: PatientCheckerPayload): number {
  const vitalScore = Object.values(payload.vitals).filter((value) => Number(value) > 0).length * 7;
  const demographicScore = Object.values(payload.demographics).filter((value) => value !== undefined && value !== null && String(value).trim() !== '').length * 4;
  return Math.min(100, 30 + vitalScore + demographicScore + payload.symptoms.length * 4 + payload.clinicalContext.length * 3);
}

function triageFromRisk(riskScore: number): AlertTier {
  if (riskScore >= 86) return 5;
  if (riskScore >= 66) return 4;
  if (riskScore >= 41) return 3;
  if (riskScore >= 21) return 2;
  return 1;
}

function severityFromTriage(tier: number): string {
  if (tier >= 5) return 'Critical';
  if (tier >= 4) return 'High';
  if (tier >= 3) return 'Moderate';
  return 'Low';
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return typeof value === 'string' && value.trim() ? [value.trim()] : [];
}

function numberValue(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clampInt(value: unknown, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(numberValue(value, min))));
}

function normalizeDiagnosis(diagnosis: string): string {
  const value = diagnosis.toLowerCase();
  if (value.includes('copd')) return 'copd';
  if (value.includes('diabetes')) return 'diabetic';
  if (value.includes('hypertension')) return 'hypertension';
  if (value.includes('heart')) return 'cardiac history';
  return '';
}
