-- Phase 2 migration: extend vitals for high-acuity devices

-- ALTER TABLE vitals ADD COLUMN etco2 NUMERIC(5,2) CHECK (etco2 >= 0 AND etco2 <= 100);
-- ALTER TABLE vitals ADD COLUMN glucose NUMERIC(6,2) CHECK (glucose >= 0 AND glucose <= 600);
