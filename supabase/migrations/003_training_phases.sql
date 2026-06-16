-- Add training_phases table for gym periodization
CREATE TABLE IF NOT EXISTS training_phases (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'personalizado',
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  program_id  BIGINT DEFAULT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own training_phases" ON training_phases FOR ALL USING (auth.uid() = user_id);
