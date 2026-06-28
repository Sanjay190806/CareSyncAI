-- CareSync AI — Phase 2A schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hospital_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age >= 0 AND age <= 120),
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    room_number VARCHAR(20) NOT NULL,
    diagnoses TEXT[] NOT NULL DEFAULT '{}',
    medications TEXT[] NOT NULL DEFAULT '{}',
    allergies TEXT[] NOT NULL DEFAULT '{}',
    risk_category VARCHAR(20) NOT NULL DEFAULT 'Low'
        CHECK (risk_category IN ('Low', 'Moderate', 'High', 'Critical')),
    profile_type VARCHAR(30) NOT NULL
        CHECK (profile_type IN (
            'Healthy', 'COPD', 'Diabetes', 'Hypertension',
            'Heart Failure', 'Post Surgery', 'ICU Critical'
        )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Vitals (12 clinical parameters)
CREATE TABLE vitals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    heart_rate INT CHECK (heart_rate >= 0 AND heart_rate <= 300),
    spo2 NUMERIC(5,2) CHECK (spo2 >= 0 AND spo2 <= 100),
    bp_sys INT CHECK (bp_sys >= 0 AND bp_sys <= 300),
    bp_dia INT CHECK (bp_dia >= 0 AND bp_dia <= 200),
    bp_map INT CHECK (bp_map >= 0 AND bp_map <= 250),
    respiratory_rate INT CHECK (respiratory_rate >= 0 AND respiratory_rate <= 60),
    temperature NUMERIC(4,2) CHECK (temperature >= 90 AND temperature <= 110),
    ecg_rhythm VARCHAR(30) NOT NULL DEFAULT 'Normal Sinus',
    etco2 NUMERIC(5,2) CHECK (etco2 >= 0 AND etco2 <= 100),
    blood_glucose NUMERIC(6,2) CHECK (blood_glucose >= 0 AND blood_glucose <= 600),
    activity_level VARCHAR(20) NOT NULL DEFAULT 'Resting',
    fall_detection_status VARCHAR(20) NOT NULL DEFAULT 'Normal',
    iv_flow_status VARCHAR(20) NOT NULL DEFAULT 'Normal',
    medication_compliance NUMERIC(5,2) CHECK (medication_compliance >= 0 AND medication_compliance <= 100)
);

CREATE INDEX idx_vitals_patient_time ON vitals(patient_id, timestamp DESC);
CREATE INDEX idx_vitals_time ON vitals(timestamp DESC);

-- 3. Patient baselines (rolling mean/std per vital)
CREATE TABLE patient_baselines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    vital_type VARCHAR(30) NOT NULL
        CHECK (vital_type IN (
            'spo2', 'heart_rate', 'bp_sys', 'bp_dia',
            'respiratory_rate', 'temperature', 'glucose', 'etco2'
        )),
    baseline_mean NUMERIC(10,4) NOT NULL,
    baseline_std_dev NUMERIC(10,4) NOT NULL CHECK (baseline_std_dev > 0),
    sample_count INT NOT NULL DEFAULT 0,
    window_minutes INT NOT NULL DEFAULT 30,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (patient_id, vital_type)
);

CREATE INDEX idx_baselines_patient ON patient_baselines(patient_id);

-- 4. Risk assessments (Phase 2B+)
CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    overall_score INT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('Stable', 'Warning', 'Critical')),
    ai_score NUMERIC(5,2),
    medical_rule_score NUMERIC(5,2),
    trend_score NUMERIC(5,2)
);

-- 5. Alerts (Phase 2B+)
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    risk_assessment_id UUID REFERENCES risk_assessments(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('Info', 'Warning', 'Critical')),
    reason TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_alerts_severity_time ON alerts(severity, timestamp DESC) WHERE is_acknowledged = FALSE;
