-- Optional per-session review text and rating for media logs (e.g. thoughts on
-- a reading session or a rating for a specific episode watched).
ALTER TABLE media_logs ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
ALTER TABLE media_logs ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT NULL;
