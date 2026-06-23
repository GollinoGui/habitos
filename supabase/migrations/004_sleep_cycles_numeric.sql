-- The cycles column was added out-of-band as INTEGER, but the app computes
-- decimal cycle counts (e.g. 5.4), which Postgres rejects with
-- "invalid input syntax for type integer". Widen it to numeric(3,1).
ALTER TABLE sleep_logs ADD COLUMN IF NOT EXISTS cycles numeric(3,1) DEFAULT NULL;
ALTER TABLE sleep_logs ALTER COLUMN cycles TYPE numeric(3,1) USING cycles::numeric;
