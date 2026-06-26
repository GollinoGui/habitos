-- Configurações de usuário (key-value genérico por usuário)
CREATE TABLE IF NOT EXISTS user_settings (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  value       JSONB,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_user" ON user_settings
  FOR ALL USING (auth.uid() = user_id);
