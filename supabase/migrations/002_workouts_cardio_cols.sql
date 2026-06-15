-- Add cardio columns to workouts (missing from initial schema)
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS cardio_type TEXT;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS cardio_minutes INTEGER;
