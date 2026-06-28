-- Patient management and clinical diagnosis upgrade

ALTER TABLE patients ADD COLUMN IF NOT EXISTS first_name VARCHAR(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_name VARCHAR(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS height NUMERIC(6,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS weight NUMERIC(6,2);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS blood_group VARCHAR(8);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS diagnosis TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS smoking_status VARCHAR(40);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS alcohol_status VARCHAR(40);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS admission_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS device_assignments TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS ward VARCHAR(80);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS room VARCHAR(40);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS bed_number VARCHAR(40);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS primary_physician VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_person VARCHAR(120);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_number VARCHAR(40);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS existing_conditions TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_url TEXT;

UPDATE patients
SET
  room = COALESCE(room, room_number),
  ward = COALESCE(ward, 'ICU'),
  bed_number = COALESCE(bed_number, NULLIF(room_number, ''))
WHERE room IS NULL OR ward IS NULL OR bed_number IS NULL;

UPDATE patients
SET
  first_name = COALESCE(first_name, split_part(name, ' ', 1)),
  last_name = COALESCE(last_name, NULLIF(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), '')),
  diagnosis = COALESCE(diagnosis, diagnoses[1])
WHERE first_name IS NULL OR diagnosis IS NULL;

CREATE INDEX IF NOT EXISTS idx_patients_active_hospital_id ON patients(hospital_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS patient_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    action VARCHAR(40) NOT NULL,
    actor VARCHAR(120) NOT NULL DEFAULT 'system',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    contact_type VARCHAR(40) NOT NULL DEFAULT 'primary',
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(40),
    relationship VARCHAR(80),
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    condition_type VARCHAR(40) NOT NULL DEFAULT 'existing',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    ward VARCHAR(80) NOT NULL,
    room VARCHAR(40) NOT NULL,
    bed_number VARCHAR(40) NOT NULL,
    primary_physician VARCHAR(120),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS patient_devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    device_id VARCHAR(120) NOT NULL,
    device_type VARCHAR(80) NOT NULL DEFAULT 'monitor',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    unassigned_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS diagnosis_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    primary_condition TEXT NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    triage_level INT NOT NULL CHECK (triage_level BETWEEN 1 AND 5),
    payload JSONB NOT NULL,
    prediction JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_audit_log_patient_created ON patient_audit_log(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_contacts_patient ON patient_contacts(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_conditions_patient ON patient_conditions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_assignments_patient ON patient_assignments(patient_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_devices_patient ON patient_devices(patient_id, assigned_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnosis_assessments_patient_created ON diagnosis_assessments(patient_id, created_at DESC);
