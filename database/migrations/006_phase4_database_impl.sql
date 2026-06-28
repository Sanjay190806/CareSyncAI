-- Phase 4 database implementation for CareSync AI

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS baseline_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    spo2_mean NUMERIC(8,4) NOT NULL,
    spo2_std NUMERIC(8,4) NOT NULL,
    hr_mean NUMERIC(8,4) NOT NULL,
    hr_std NUMERIC(8,4) NOT NULL,
    bp_mean NUMERIC(8,4) NOT NULL,
    bp_std NUMERIC(8,4) NOT NULL,
    rr_mean NUMERIC(8,4) NOT NULL,
    rr_std NUMERIC(8,4) NOT NULL,
    temp_mean NUMERIC(8,4) NOT NULL,
    temp_std NUMERIC(8,4) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (patient_id)
);

CREATE TABLE IF NOT EXISTS shift_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shift_start TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_end TIMESTAMP WITH TIME ZONE NOT NULL,
    total_alerts INT NOT NULL DEFAULT 0,
    tier1_count INT NOT NULL DEFAULT 0,
    tier2_count INT NOT NULL DEFAULT 0,
    tier3_count INT NOT NULL DEFAULT 0,
    tier4_count INT NOT NULL DEFAULT 0,
    tier5_count INT NOT NULL DEFAULT 0,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinical_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    diagnosis TEXT[] NOT NULL DEFAULT '{}',
    medications TEXT[] NOT NULL DEFAULT '{}',
    allergies TEXT[] NOT NULL DEFAULT '{}',
    copd BOOLEAN NOT NULL DEFAULT FALSE,
    diabetic BOOLEAN NOT NULL DEFAULT FALSE,
    ventilator BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (patient_id)
);

CREATE TABLE IF NOT EXISTS alert_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    old_tier INT NOT NULL CHECK (old_tier BETWEEN 1 AND 5),
    new_tier INT NOT NULL CHECK (new_tier BETWEEN 1 AND 5),
    reason TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_baseline_profiles_patient_id ON baseline_profiles(patient_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_generated_at ON shift_reports(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_context_patient_id ON clinical_context(patient_id);
CREATE INDEX IF NOT EXISTS idx_alert_audit_patient_id ON alert_audit(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient_timestamp ON vitals(patient_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON vitals(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_tier_time ON alerts(tier, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity_time ON alerts(severity, timestamp DESC);
