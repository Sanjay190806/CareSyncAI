import { updateBaseline, persistBaselines } from './ai-engine.client.js';
import { saveBaselineProfile, saveVitals } from './database.service.js';
import type { BaselineProfile, BaselineUpdateResult, VitalReading } from '../types/index.js';

export class VitalIngestionService {
  private readonly vitalWriteCache = new Map<string, number>();
  private readonly baselineWriteCache = new Map<string, number>();

  async ingest(reading: VitalReading): Promise<{ vital: VitalReading; baseline: BaselineUpdateResult }> {
    const inserted = await this.insert(reading);
    const baseline = await updateBaseline(inserted);
    await persistBaselines(inserted.patientId, baseline.baseline);
    this.scheduleBaselinePersist(inserted.patientId, baseline.baseline);
    return { vital: inserted, baseline };
  }

  async insert(reading: VitalReading): Promise<VitalReading> {
    const dedupeKey = this.buildVitalDedupeKey(reading);
    if (this.vitalWriteCache.has(dedupeKey)) {
      console.info('[db] skipped duplicate vital write', { patientId: reading.patientId, timestamp: reading.timestamp });
      return { ...reading };
    }

    this.vitalWriteCache.set(dedupeKey, Date.now());

    try {
      const persisted = await saveVitals({
        patientId: reading.patientId,
        timestamp: reading.timestamp,
        heartRate: reading.heartRate,
        spo2: reading.spo2,
        bpSys: reading.bpSys,
        bpDia: reading.bpDia,
        bpMap: reading.bpMap,
        respiratoryRate: reading.respiratoryRate,
        temperature: reading.temperature,
        ecgRhythm: reading.ecgRhythm,
        etco2: reading.etco2,
        bloodGlucose: reading.bloodGlucose,
        activityLevel: reading.activityLevel,
        fallDetectionStatus: reading.fallDetectionStatus,
        ivFlowStatus: reading.ivFlowStatus,
        medicationCompliance: reading.medicationCompliance,
        correlationPatterns: reading.correlationPatterns,
      });

      console.info('[db] saved vitals', { patientId: reading.patientId, vitalId: persisted.id });
      return { ...reading, id: persisted.id };
    } catch (error) {
      console.error('[db] vital persistence failed', { patientId: reading.patientId, error });
      return { ...reading };
    }
  }

  private scheduleBaselinePersist(patientId: string, baseline: BaselineProfile): void {
    const dedupeKey = `${patientId}:${baseline.windowMinutes}`;
    const now = Date.now();
    const lastPersisted = this.baselineWriteCache.get(dedupeKey) ?? 0;

    if (now - lastPersisted < 30000) {
      console.info('[db] baseline persist throttled', { patientId });
      return;
    }

    this.baselineWriteCache.set(dedupeKey, now);
    void this.persistBaseline(patientId, baseline).catch((error) => {
      console.error('[db] baseline persistence failed', { patientId, error });
    });
  }

  private async persistBaseline(patientId: string, baseline: BaselineProfile): Promise<void> {
    await saveBaselineProfile({
      patientId,
      spo2Mean: baseline.spo2.mean,
      spo2Std: baseline.spo2.stdDev,
      hrMean: baseline.heartRate.mean,
      hrStd: baseline.heartRate.stdDev,
      bpMean: baseline.bpSys.mean,
      bpStd: baseline.bpSys.stdDev,
      rrMean: baseline.respiratoryRate.mean,
      rrStd: baseline.respiratoryRate.stdDev,
      tempMean: baseline.temperature.mean,
      tempStd: baseline.temperature.stdDev,
    });

    console.info('[db] baseline updated', { patientId });
  }

  private buildVitalDedupeKey(reading: VitalReading): string {
    return [reading.patientId, reading.timestamp, reading.heartRate, reading.spo2, reading.bpSys, reading.bpDia, reading.respiratoryRate, reading.temperature].join(':');
  }
}
