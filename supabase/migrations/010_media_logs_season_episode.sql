-- Permite que cada sessão de série fique associada à temporada/episódio
-- assistido, em vez de só atualizar um ponteiro único no item (media_items),
-- o que tornava impossível ver o histórico dividido por temporada.
ALTER TABLE media_logs ADD COLUMN IF NOT EXISTS season INTEGER DEFAULT NULL;
ALTER TABLE media_logs ADD COLUMN IF NOT EXISTS episode INTEGER DEFAULT NULL;
