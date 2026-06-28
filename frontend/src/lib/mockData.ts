import type {
  AlertEvent,
  ClinicalNarrative,
  InsightItem,
  PatientSnapshot,
  EventItem,
  RiskAssessment,
  VitalReading,
  NarrativeHistoryEntry,
} from '@/types';

const realProfiles = [
  { name: 'Rajesh Kumar', patientId: 'MGH-ICU-0001', ward: 'Respiratory ICU', bedNumber: 'Bed 12', primaryPhysician: 'Dr. Ananya Rao', baselineStatus: 'Established' as const },
  { name: 'Meera Nair', patientId: 'MGH-ICU-0002', ward: 'Medical ICU', bedNumber: 'Bed 09', primaryPhysician: 'Dr. Vikram Shah', baselineStatus: 'Established' as const },
  { name: 'Aarav Menon', patientId: 'MGH-ICU-0003', ward: 'Surgical ICU', bedNumber: 'Bed 04', primaryPhysician: 'Dr. Kavya Iyer', baselineStatus: 'Learning' as const },
  { name: 'Fatima Khan', patientId: 'MGH-ICU-0004', ward: 'Cardiac ICU', bedNumber: 'Bed 06', primaryPhysician: 'Dr. Rohan Mehta', baselineStatus: 'Needs Review' as const },
  { name: 'Joseph Dsouza', patientId: 'MGH-ICU-0005', ward: 'Neuro ICU', bedNumber: 'Bed 11', primaryPhysician: 'Dr. Neha Kapoor', baselineStatus: 'Established' as const },
  { name: 'Latha Iyer', patientId: 'MGH-ICU-0006', ward: 'Respiratory ICU', bedNumber: 'Bed 03', primaryPhysician: 'Dr. Ananya Rao', baselineStatus: 'Needs Review' as const },
  { name: 'Vikram Singh', patientId: 'MGH-ICU-0007', ward: 'Respiratory ICU', bedNumber: 'Bed 01', primaryPhysician: 'Dr. Sameer Kulkarni', baselineStatus: 'Established' as const },
  { name: 'Nisha Patel', patientId: 'MGH-ICU-0008', ward: 'Renal ICU', bedNumber: 'Bed 07', primaryPhysician: 'Dr. Priya Raman', baselineStatus: 'Established' as const },
  { name: 'Imran Sheikh', patientId: 'MGH-ICU-0009', ward: 'Trauma ICU', bedNumber: 'Bed 08', primaryPhysician: 'Dr. Arjun Bose', baselineStatus: 'Learning' as const },
  { name: 'Mary Thomas', patientId: 'MGH-ICU-0010', ward: 'Cardiac ICU', bedNumber: 'Bed 10', primaryPhysician: 'Dr. Rohan Mehta', baselineStatus: 'Established' as const },
  { name: 'Karan Gupta', patientId: 'MGH-ICU-0011', ward: 'Metabolic ICU', bedNumber: 'Bed 05', primaryPhysician: 'Dr. Priya Raman', baselineStatus: 'Established' as const },
  { name: 'Sunita Reddy', patientId: 'MGH-ICU-0012', ward: 'Medical ICU', bedNumber: 'Bed 02', primaryPhysician: 'Dr. Vikram Shah', baselineStatus: 'Needs Review' as const },
  { name: 'Harish Verma', patientId: 'MGH-ICU-0013', ward: 'Respiratory ICU', bedNumber: 'Bed 13', primaryPhysician: 'Dr. Ananya Rao', baselineStatus: 'Established' as const },
  { name: 'Elena Fernandes', patientId: 'MGH-ICU-0014', ward: 'Allergy Observation', bedNumber: 'Bed 14', primaryPhysician: 'Dr. Kavya Iyer', baselineStatus: 'Learning' as const },
  { name: 'Prakash Das', patientId: 'MGH-ICU-0015', ward: 'Renal ICU', bedNumber: 'Bed 15', primaryPhysician: 'Dr. Priya Raman', baselineStatus: 'Established' as const },
];

const basePatients: Omit<PatientSnapshot, 'id' | 'name'>[] = [
  {
    age: 68, gender: 'M', room: 'ICU-12', diagnosis: 'COPD Exacerbation',
    riskScore: 22, tier: 2, spo2: 94, heartRate: 82, bloodPressure: 124, bpDia: 78,
    temperature: 98.2, respiratoryRate: 18, trend: 'flat', lastUpdated: 'just now',
    narrative: 'Stable oxygenation with mild tachycardia within personalized baseline.',
    aiBrief: 'Respiratory status remains controlled after bronchodilator therapy.',
    suggestedAction: 'Continue current regimen, monitor SpO₂ q2h',
    alerts: ['Advisory'], medications: ['Albuterol', 'Prednisone'],
    history: [{ label: '10m', score: 20 }, { label: '20m', score: 22 }, { label: '30m', score: 18 }],
    baseline: { spo2: 95, heartRate: 78, bloodPressure: 128, respiratoryRate: 16, temperature: 98.0 },
  },
  {
    age: 71, gender: 'F', room: 'ICU-09', diagnosis: 'Sepsis',
    riskScore: 71, tier: 4, spo2: 89, heartRate: 118, bloodPressure: 88, bpDia: 54,
    temperature: 100.5, respiratoryRate: 24, trend: 'down', lastUpdated: '12s ago',
    narrative: 'Patient shows rapid oxygen decline and warming trend with hemodynamic drift.',
    aiBrief: 'Early sepsis signature with lactate trend and bounding tachycardia.',
    suggestedAction: 'Review fluids, cultures, and sepsis bundle',
    alerts: ['Critical escalation'], medications: ['Vancomycin', 'Norepinephrine'],
    history: [{ label: '10m', score: 55 }, { label: '20m', score: 64 }, { label: '30m', score: 71 }],
    baseline: { spo2: 96, heartRate: 82, bloodPressure: 118, respiratoryRate: 16, temperature: 98.4 },
  },
  {
    age: 54, gender: 'M', room: 'ICU-04', diagnosis: 'Post-op Recovery',
    riskScore: 15, tier: 1, spo2: 97, heartRate: 74, bloodPressure: 132, bpDia: 84,
    temperature: 98.4, respiratoryRate: 14, trend: 'up', lastUpdated: '21s ago',
    narrative: 'Recovery trend observed after extubation with improving vitals.',
    aiBrief: 'Hemodynamics remain stable with improving saturation.',
    suggestedAction: 'Continue weaning protocol',
    alerts: [], medications: ['Acetaminophen', 'Enoxaparin'],
    history: [{ label: '10m', score: 16 }, { label: '20m', score: 15 }, { label: '30m', score: 12 }],
    baseline: { spo2: 96, heartRate: 80, bloodPressure: 130, respiratoryRate: 15, temperature: 98.6 },
  },
  {
    age: 61, gender: 'F', room: 'ICU-06', diagnosis: 'Cardiac Arrhythmia',
    riskScore: 48, tier: 3, spo2: 92, heartRate: 104, bloodPressure: 116, bpDia: 72,
    temperature: 99.1, respiratoryRate: 20, trend: 'down', lastUpdated: '35s ago',
    narrative: 'Atrial tachyarrhythmia with escalating concern above baseline.',
    aiBrief: 'Monitor rhythm and prepare antiarrhythmic support.',
    suggestedAction: '12-lead ECG, consider amiodarone',
    alerts: ['Watch alert'], medications: ['Amiodarone', 'Metoprolol'],
    history: [{ label: '10m', score: 38 }, { label: '20m', score: 44 }, { label: '30m', score: 48 }],
    baseline: { spo2: 97, heartRate: 76, bloodPressure: 122, respiratoryRate: 14, temperature: 98.2 },
  },
  {
    age: 79, gender: 'M', room: 'ICU-11', diagnosis: 'Stroke Recovery',
    riskScore: 31, tier: 2, spo2: 95, heartRate: 88, bloodPressure: 118, bpDia: 70,
    temperature: 98.7, respiratoryRate: 16, trend: 'up', lastUpdated: '44s ago',
    narrative: 'Recovery detected with improving neurology and stable vitals.',
    aiBrief: 'Neuro observations show recovery trend after intervention.',
    suggestedAction: 'Continue neuro checks q1h',
    alerts: ['Advisory'], medications: ['Aspirin', 'Atorvastatin'],
    history: [{ label: '10m', score: 36 }, { label: '20m', score: 33 }, { label: '30m', score: 31 }],
    baseline: { spo2: 95, heartRate: 86, bloodPressure: 120, respiratoryRate: 15, temperature: 98.5 },
  },
  {
    age: 66, gender: 'F', room: 'ICU-03', diagnosis: 'Pulmonary Embolism',
    riskScore: 63, tier: 4, spo2: 87, heartRate: 126, bloodPressure: 92, bpDia: 58,
    temperature: 99.4, respiratoryRate: 28, trend: 'down', lastUpdated: '48s ago',
    narrative: 'Rapid desaturation and elevated respiratory demand detected.',
    aiBrief: 'Pulmonary compromise increasing with oxygenation decline.',
    suggestedAction: 'Anticoagulation review, consider CT angiography',
    alerts: ['Critical escalation'], medications: ['Heparin', 'Alteplase'],
    history: [{ label: '10m', score: 52 }, { label: '20m', score: 58 }, { label: '30m', score: 63 }],
    baseline: { spo2: 96, heartRate: 84, bloodPressure: 124, respiratoryRate: 16, temperature: 98.3 },
  },
  {
    age: 72, gender: 'M', room: 'ICU-01', diagnosis: 'Respiratory Failure',
    riskScore: 92, tier: 5, spo2: 82, heartRate: 132, bloodPressure: 79, bpDia: 48,
    temperature: 100.2, respiratoryRate: 32, etco2: 62, trend: 'down', lastUpdated: 'now',
    narrative: 'Patient shows rapid oxygen decline 2.3σ below baseline with accelerating deterioration pattern.',
    aiBrief: 'Severe respiratory compromise with impending oxygenation failure.',
    suggestedAction: 'Prep airway team, escalate to Code Red protocol',
    alerts: ['Code Red'], medications: ['Fentanyl', 'Propofol', 'Vecuronium'],
    history: [{ label: '10m', score: 74 }, { label: '20m', score: 84 }, { label: '30m', score: 92 }],
    baseline: { spo2: 96, heartRate: 78, bloodPressure: 128, respiratoryRate: 14, temperature: 98.1 },
  },
  {
    age: 58, gender: 'F', room: 'ICU-07', diagnosis: 'Renal Failure',
    riskScore: 27, tier: 2, spo2: 96, heartRate: 84, bloodPressure: 122, bpDia: 76,
    temperature: 98.6, respiratoryRate: 15, trend: 'flat', lastUpdated: '1m ago',
    narrative: 'Electrolytes stable with surveillance required.',
    aiBrief: 'Care remains stable and closely monitored.',
    suggestedAction: 'Continue dialysis schedule',
    alerts: [], medications: ['Furosemide', 'Calcium gluconate'],
    history: [{ label: '10m', score: 26 }, { label: '20m', score: 27 }, { label: '30m', score: 25 }],
    baseline: { spo2: 97, heartRate: 82, bloodPressure: 124, respiratoryRate: 14, temperature: 98.4 },
  },
  {
    age: 45, gender: 'M', room: 'ICU-08', diagnosis: 'Trauma — Blunt Chest',
    riskScore: 38, tier: 3, spo2: 93, heartRate: 98, bloodPressure: 108, bpDia: 68,
    temperature: 99.0, respiratoryRate: 22, trend: 'flat', lastUpdated: '52s ago',
    narrative: 'Chest trauma with moderate respiratory compromise.',
    aiBrief: 'Monitor for pneumothorax progression.',
    suggestedAction: 'Repeat chest X-ray in 4h',
    alerts: ['Watch alert'], medications: ['Morphine', 'Ketorolac'],
    history: [{ label: '10m', score: 36 }, { label: '20m', score: 38 }, { label: '30m', score: 35 }],
    baseline: { spo2: 98, heartRate: 88, bloodPressure: 118, respiratoryRate: 16, temperature: 98.2 },
  },
  {
    age: 83, gender: 'F', room: 'ICU-10', diagnosis: 'Heart Failure',
    riskScore: 55, tier: 3, spo2: 91, heartRate: 112, bloodPressure: 98, bpDia: 62,
    temperature: 98.9, respiratoryRate: 26, trend: 'down', lastUpdated: '1m ago',
    narrative: 'Volume overload with increasing respiratory rate.',
    aiBrief: 'CHF exacerbation pattern with pulmonary edema risk.',
    suggestedAction: 'Diuretic adjustment, BNP trending',
    alerts: ['Watch alert'], medications: ['Furosemide', 'Carvedilol'],
    history: [{ label: '10m', score: 48 }, { label: '20m', score: 52 }, { label: '30m', score: 55 }],
    baseline: { spo2: 94, heartRate: 88, bloodPressure: 112, respiratoryRate: 18, temperature: 98.3 },
  },
  {
    age: 52, gender: 'M', room: 'ICU-05', diagnosis: 'Diabetic Ketoacidosis',
    riskScore: 42, tier: 3, spo2: 94, heartRate: 106, bloodPressure: 102, bpDia: 64,
    temperature: 99.8, respiratoryRate: 28, trend: 'up', lastUpdated: '2m ago',
    narrative: 'Kussmaul breathing resolving with insulin protocol.',
    aiBrief: 'Metabolic acidosis improving on current drip.',
    suggestedAction: 'Continue insulin infusion, q1h glucose',
    alerts: ['Advisory'], medications: ['Insulin drip', 'Potassium chloride'],
    history: [{ label: '10m', score: 52 }, { label: '20m', score: 48 }, { label: '30m', score: 42 }],
    baseline: { spo2: 97, heartRate: 92, bloodPressure: 116, respiratoryRate: 18, temperature: 98.6 },
  },
  {
    age: 67, gender: 'F', room: 'ICU-02', diagnosis: 'GI Bleed',
    riskScore: 58, tier: 3, spo2: 93, heartRate: 102, bloodPressure: 94, bpDia: 56,
    temperature: 98.5, respiratoryRate: 19, trend: 'down', lastUpdated: '1m ago',
    narrative: 'Hemoglobin drop with compensatory tachycardia.',
    aiBrief: 'Active bleeding concern — hemodynamic monitoring critical.',
    suggestedAction: 'Type & cross, consider endoscopy',
    alerts: ['Watch alert'], medications: ['Pantoprazole', 'Octreotide'],
    history: [{ label: '10m', score: 50 }, { label: '20m', score: 54 }, { label: '30m', score: 58 }],
    baseline: { spo2: 97, heartRate: 78, bloodPressure: 122, respiratoryRate: 15, temperature: 98.2 },
  },
  {
    age: 74, gender: 'M', room: 'ICU-13', diagnosis: 'Pneumonia',
    riskScore: 35, tier: 2, spo2: 94, heartRate: 92, bloodPressure: 114, bpDia: 70,
    temperature: 100.1, respiratoryRate: 20, trend: 'flat', lastUpdated: '3m ago',
    narrative: 'Community-acquired pneumonia on antibiotic therapy.',
    aiBrief: 'Fever trending down, oxygenation stable.',
    suggestedAction: 'Continue ceftriaxone, monitor WBC',
    alerts: ['Advisory'], medications: ['Ceftriaxone', 'Azithromycin'],
    history: [{ label: '10m', score: 38 }, { label: '20m', score: 36 }, { label: '30m', score: 35 }],
    baseline: { spo2: 96, heartRate: 86, bloodPressure: 120, respiratoryRate: 16, temperature: 98.4 },
  },
  {
    age: 59, gender: 'F', room: 'ICU-14', diagnosis: 'Anaphylaxis Recovery',
    riskScore: 18, tier: 1, spo2: 98, heartRate: 78, bloodPressure: 126, bpDia: 80,
    temperature: 98.3, respiratoryRate: 14, trend: 'up', lastUpdated: '4m ago',
    narrative: 'Post-anaphylaxis recovery with resolved bronchospasm.',
    aiBrief: 'Excellent response to epinephrine and steroids.',
    suggestedAction: 'Observation 24h, allergy consult',
    alerts: [], medications: ['Epinephrine', 'Methylprednisolone'],
    history: [{ label: '10m', score: 28 }, { label: '20m', score: 22 }, { label: '30m', score: 18 }],
    baseline: { spo2: 98, heartRate: 74, bloodPressure: 128, respiratoryRate: 14, temperature: 98.2 },
  },
  {
    age: 76, gender: 'M', room: 'ICU-15', diagnosis: 'Acute Kidney Injury',
    riskScore: 44, tier: 3, spo2: 95, heartRate: 96, bloodPressure: 104, bpDia: 66,
    temperature: 99.2, respiratoryRate: 18, trend: 'flat', lastUpdated: '2m ago',
    narrative: 'Creatinine rising with fluid balance concern.',
    aiBrief: 'Prerenal AKI pattern — optimize perfusion.',
    suggestedAction: 'Fluid challenge, hold nephrotoxins',
    alerts: ['Advisory'], medications: ['Normal saline', 'Sodium bicarbonate'],
    history: [{ label: '10m', score: 42 }, { label: '20m', score: 43 }, { label: '30m', score: 44 }],
    baseline: { spo2: 97, heartRate: 82, bloodPressure: 118, respiratoryRate: 15, temperature: 98.5 },
  },
];

export const initialPatients: PatientSnapshot[] = basePatients.map((p, i) => ({
  ...p,
  id: `p${i + 1}`,
  ...realProfiles[i],
}));

export const eventFeed: EventItem[] = [
  { id: 'e1', type: 'tier', title: 'Tier 5 escalation', detail: 'Patient 07 — respiratory failure event', timestamp: 'just now', patientId: 'p7', tier: 5 },
  { id: 'e2', type: 'vitals', title: 'SpO₂ drop', detail: 'Patient 02 dropped to 89%', timestamp: '12s ago', patientId: 'p2' },
  { id: 'e3', type: 'ai', title: 'AI narrative update', detail: 'Patient 04 arrhythmia pattern increasing', timestamp: '24s ago', patientId: 'p4' },
  { id: 'e4', type: 'ack', title: 'Nurse acknowledgement', detail: 'Patient 06 response team mobilized', timestamp: '41s ago', patientId: 'p6' },
  { id: 'e5', type: 'alert', title: 'Watch alert triggered', detail: 'Patient 10 CHF exacerbation detected', timestamp: '1m ago', patientId: 'p10', tier: 3 },
  { id: 'e6', type: 'vitals', title: 'HR spike', detail: 'Patient 06 heart rate 126 bpm', timestamp: '1m ago', patientId: 'p6' },
];

export const insights: InsightItem[] = [
  { id: 'i1', title: 'Respiratory distress pattern', detail: 'Patient 07 showing accelerating respiratory distress pattern', severity: 5, patientId: 'p7' },
  { id: 'i2', title: 'Recovery detected', detail: 'Recovery detected in Patient 05 — neuro status improving', severity: 2, patientId: 'p5' },
  { id: 'i3', title: 'Hemodynamic drift', detail: 'Patient 02 blood pressure trending down — sepsis concern', severity: 4, patientId: 'p2' },
  { id: 'i4', title: 'Early warning signal', detail: 'Patient 12 hemoglobin drop correlates with HR elevation', severity: 3, patientId: 'p12' },
  { id: 'i5', title: 'Baseline deviation', detail: 'Patient 04 SpO₂ 1.8σ below personalized baseline', severity: 3, patientId: 'p4' },
];

export const riskAssessments: RiskAssessment[] = initialPatients
  .sort((a, b) => b.riskScore - a.riskScore)
  .slice(0, 5)
  .map((p) => ({
    patientId: p.id,
    crisisProbabilityScore: p.riskScore,
    tier: p.tier,
    deviationScores: [],
    trendDirection: p.trend === 'up' ? 'improving' : p.trend === 'down' ? 'deteriorating' : 'stable',
    timestamp: p.lastUpdated,
  }));

export const narratives: ClinicalNarrative[] = initialPatients
  .filter((p) => p.tier >= 3)
  .map((p) => ({
    patientId: p.id,
    narrative: p.narrative,
    tier: p.tier,
    suggestedAction: p.suggestedAction,
    generatedAt: p.lastUpdated,
  }));

export const alertEvents: AlertEvent[] = initialPatients
  .filter((p) => p.alerts.length > 0)
  .map((p, i) => ({
    id: `alert-${p.id}`,
    patientId: p.id,
    patientName: p.name,
    tier: p.tier,
    riskScore: p.riskScore,
    narrative: p.narrative,
    suppressed: i === 2,
    suppressionReason: i === 2 ? 'Duplicate alert within 5min window' : undefined,
    timestamp: p.lastUpdated,
  }));

export function generateVitalsHistory(patient: PatientSnapshot): VitalReading[] {
  const points = 12;
  const base = patient.baseline ?? {
    spo2: 96, heartRate: 80, bloodPressure: 120, respiratoryRate: 16, temperature: 98.4,
  };
  return Array.from({ length: points }, (_, i) => {
    const progress = i / (points - 1);
    const drift = patient.trend === 'down' ? progress : patient.trend === 'up' ? -progress * 0.5 : 0;
    return {
      timestamp: `${String(i * 5).padStart(2, '0')}:00`,
      spo2: Math.round(base.spo2 + (patient.spo2 - base.spo2) * progress),
      heartRate: Math.round(base.heartRate + (patient.heartRate - base.heartRate) * progress),
      bpSys: Math.round(base.bloodPressure + (patient.bloodPressure - base.bloodPressure) * progress),
      bpDia: Math.round((patient.bpDia ?? 70) + drift * 4),
      respiratoryRate: Math.round(base.respiratoryRate + (patient.respiratoryRate - base.respiratoryRate) * progress),
      temperature: +(base.temperature + (patient.temperature - base.temperature) * progress).toFixed(1),
      etco2: patient.etco2 ? Math.round(40 + (patient.etco2 - 40) * progress) : undefined,
    };
  });
}

export const narrativeHistory: NarrativeHistoryEntry[] = [
  { id: 'n1', patientId: 'p7', narrative: 'Early respiratory compromise detected — SpO₂ trending below baseline.', tier: 2, timestamp: '15m ago' },
  { id: 'n2', patientId: 'p7', narrative: 'Oxygenation worsens and EtCO₂ rises — escalation to Watch tier.', tier: 3, timestamp: '10m ago' },
  { id: 'n3', patientId: 'p7', narrative: 'Respiratory depression with escalating tachycardia — Critical tier.', tier: 4, timestamp: '5m ago' },
  { id: 'n4', patientId: 'p7', narrative: 'Patient shows rapid oxygen decline 2.3σ below baseline with accelerating deterioration pattern.', tier: 5, timestamp: 'just now' },
];

/** Patient 7 crisis demo sequence (matches simulator) */
export const patient7CrisisSteps = [
  { riskScore: 32, tier: 2 as const, spo2: 90, etco2: 44, respiratoryRate: 18, heartRate: 96, narrative: 'Early respiratory compromise detected.', aiBrief: 'SpO₂ trending below personalized baseline.' },
  { riskScore: 58, tier: 3 as const, spo2: 86, etco2: 49, respiratoryRate: 14, heartRate: 110, narrative: 'Oxygenation worsens and EtCO₂ rises.', aiBrief: 'Watch tier — respiratory pattern deteriorating.' },
  { riskScore: 79, tier: 4 as const, spo2: 82, etco2: 56, respiratoryRate: 10, heartRate: 124, narrative: 'Respiratory depression and escalating tachycardia.', aiBrief: 'Critical — prepare escalation team.' },
  { riskScore: 91, tier: 5 as const, spo2: 78, etco2: 62, respiratoryRate: 8, heartRate: 140, narrative: 'Critical respiratory failure — CODE RED.', aiBrief: 'Severe respiratory compromise with impending oxygenation failure.' },
];

export const crisisScenarios = {
  copd: { patientIndex: 0, label: 'COPD Event', spo2Delta: -8, hrDelta: 20, scoreDelta: 35 },
  sepsis: { patientIndex: 1, label: 'Sepsis Event', spo2Delta: -6, hrDelta: 30, scoreDelta: 25 },
  cardiac: { patientIndex: 3, label: 'Cardiac Arrest', spo2Delta: -15, hrDelta: 50, scoreDelta: 45 },
  respiratory: { patientIndex: 5, label: 'Respiratory Failure', spo2Delta: -10, hrDelta: 25, scoreDelta: 30 },
  patient7: { patientIndex: 6, label: 'Patient 7 Crisis', useSequence: true },
};

export const shiftReportData = {
  totalPatients: 15,
  criticalCases: 3,
  codeRedCases: 1,
  avgResponseTimeMs: 142000,
  alertsByTier: { 1: 2, 2: 4, 3: 5, 4: 3, 5: 1 },
  aiSummary: 'Shift characterized by one Code Red respiratory event (Patient 07) with successful rapid response. Sepsis protocol activated for Patient 02. Overall unit occupancy at 94% with 3 critical cases under active monitoring. AI detected 12 early warning signals, 8 resolved without escalation.',
};
