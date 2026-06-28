import type { PatientSnapshot } from '@/types';
import type { ShiftReportOutput } from './types';
import { generateClinicalNarrative } from './engine';

export function generateShiftReport(
  patients: PatientSnapshot[],
  options: { averageResponseTimeMs?: number } = {},
): ShiftReportOutput {
  const criticalEvents = patients.filter((p) => p.tier >= 4).length;
  const codeRedEvents = patients.filter((p) => p.tier >= 5).length;
  const recoveryCases = patients.filter((p) => p.trend === 'up').length;

  const topRiskPatients = [...patients]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((p) => ({
      patientId: p.id,
      name: p.name,
      riskScore: p.riskScore,
      tier: p.tier,
    }));

  const criticalList = patients
    .filter((p) => p.tier >= 4)
    .map((p) => p.name)
    .join(', ');

  const respiratoryCases = patients.filter(
    (p) => p.tier >= 4 && /respiratory|copd|pe|pneumonia|embolism/i.test(p.diagnosis),
  );

  const worstPatient = topRiskPatients[0];

  const majorIncidentsSummary =
    codeRedEvents > 0
      ? `${codeRedEvents} CODE RED event(s) requiring immediate intervention. ${criticalList || 'No additional critical cases'}.`
      : criticalEvents > 0
        ? `${criticalEvents} patient(s) in critical tier: ${criticalList}.`
        : 'No major critical incidents during this shift.';

  let narrativeReport = `During the shift, ${patients.length} patients were monitored under personalized baseline intelligence. `;

  if (respiratoryCases.length > 0) {
    narrativeReport += `${respiratoryCases.length} patient(s) entered critical respiratory distress states. `;
  }

  if (worstPatient) {
    const narrative = generateClinicalNarrative({
      patientId: worstPatient.patientId,
      patientName: worstPatient.name,
      vitals: patients.find((p) => p.id === worstPatient.patientId)!,
      baseline: patients.find((p) => p.id === worstPatient.patientId)?.baseline,
      trend: patients.find((p) => p.id === worstPatient.patientId)?.trend ?? 'stable',
      riskScore: worstPatient.riskScore,
      tier: worstPatient.tier,
    });
    narrativeReport += `${worstPatient.name} exhibited the most severe deterioration pattern (Tier ${worstPatient.tier}, score ${worstPatient.riskScore}). `;
    narrativeReport += narrative.severity_reasoning + ' ';
  }

  if (recoveryCases > 0) {
    narrativeReport += `${recoveryCases} recovery case(s) demonstrated improving trends. `;
  }

  narrativeReport += `Average simulated response time: ${Math.round((options.averageResponseTimeMs ?? 142000) / 1000)} seconds.`;

  return {
    totalPatientsMonitored: patients.length,
    criticalEvents,
    codeRedEvents,
    topRiskPatients,
    averageResponseTimeMs: options.averageResponseTimeMs ?? 142000,
    majorIncidentsSummary,
    narrativeReport: narrativeReport.trim(),
    recoveryCases,
  };
}
