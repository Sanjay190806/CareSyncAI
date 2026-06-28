export const VITAL_LABELS: Record<string, string> = {
  spo2: 'oxygen saturation (SpO₂)',
  heartRate: 'heart rate',
  heart_rate: 'heart rate',
  bloodPressure: 'blood pressure',
  bp_sys: 'systolic blood pressure',
  bpSys: 'systolic blood pressure',
  respiratoryRate: 'respiratory rate',
  respiratory_rate: 'respiratory rate',
  temperature: 'temperature',
  etco2: 'end-tidal CO₂ (EtCO₂)',
};

export const VITAL_CLINICAL_IMPACT: Record<string, string> = {
  spo2: 'acute respiratory stress and hypoxemia risk',
  heartRate: 'cardiovascular compensation or hemodynamic strain',
  heart_rate: 'cardiovascular compensation or hemodynamic strain',
  bloodPressure: 'perfusion compromise or shock physiology',
  bp_sys: 'perfusion compromise or shock physiology',
  respiratoryRate: 'respiratory distress or ventilatory failure',
  respiratory_rate: 'respiratory distress or ventilatory failure',
  temperature: 'infectious or inflammatory process',
  etco2: 'ventilatory efficiency and airway patency concern',
};

export function vitalLabel(vital: string): string {
  return VITAL_LABELS[vital] ?? vital.replace(/_/g, ' ');
}

export function clinicalImpact(vital: string): string {
  return VITAL_CLINICAL_IMPACT[vital] ?? 'physiologic instability';
}
