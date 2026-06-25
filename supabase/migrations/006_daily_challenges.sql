-- Persists daily challenge state (Wordle, Sudoku, News) in the cloud so it
-- survives app reinstalls and is shared across devices.
CREATE TABLE IF NOT EXISTS daily_challenges (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  challenge_key TEXT NOT NULL,  -- 'wordle' | 'sudoku' | 'news'
  state       JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, date, challenge_key)
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own daily challenges"
  ON daily_challenges
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
