-- Phase 2 migration: shift report and incident timeline

-- CREATE TABLE shift_events (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     event_type VARCHAR(30) NOT NULL,
--     patient_id UUID REFERENCES patients(id),
--     alert_id UUID REFERENCES alerts(id),
--     tier INT CHECK (tier BETWEEN 1 AND 5),
--     risk_score INT,
--     narrative TEXT,
--     escalated BOOLEAN DEFAULT FALSE,
--     response_time_ms INT,
--     timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- CREATE INDEX idx_shift_events_time ON shift_events(timestamp DESC);
