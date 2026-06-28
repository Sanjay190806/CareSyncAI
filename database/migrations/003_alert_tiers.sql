-- Phase 2 migration: five-tier alert system and clinical narratives
-- Replaces simplified severity enum with tier-based model from master spec

-- CREATE TABLE clinical_narratives (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
--     alert_id UUID REFERENCES alerts(id),
--     narrative TEXT NOT NULL,
--     suggested_action TEXT,
--     tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
--     generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE alerts ADD COLUMN tier INT CHECK (tier BETWEEN 1 AND 5);
-- ALTER TABLE alerts ADD COLUMN risk_score INT CHECK (risk_score BETWEEN 0 AND 100);
-- ALTER TABLE alerts ADD COLUMN suppressed BOOLEAN DEFAULT FALSE;
-- ALTER TABLE alerts ADD COLUMN suppression_reason TEXT;
