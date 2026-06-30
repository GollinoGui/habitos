-- Coluna usada pelo sync bidirecional com o calendário nativo do celular
-- (src/renderer/src/lib/nativeCalendarSync.ts + mobileApi.ts calendar.linkDevice/createEvent).
-- Sem ela, o link com o evento do calendário do Android falhava silenciosamente.
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS device_event_id TEXT;
