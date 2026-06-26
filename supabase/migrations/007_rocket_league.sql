-- Sessões do Rocket League
CREATE TABLE IF NOT EXISTS rocket_league_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_mmr INTEGER NOT NULL,
  end_mmr INTEGER NOT NULL,
  mmr_gain INTEGER NOT NULL,
  matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  notes TEXT,
  preset_id BIGINT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Presets da garagem
CREATE TABLE IF NOT EXISTS rl_car_presets (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slots TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE rocket_league_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rl_car_presets        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rl_sessions_user" ON rocket_league_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "rl_presets_user" ON rl_car_presets
  FOR ALL USING (auth.uid() = user_id);
