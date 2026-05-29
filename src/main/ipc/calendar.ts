import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'

export function registerCalendarHandlers(): void {
  ipcMain.handle('calendar:events-by-month', (_e, year: number, month: number) => {
    const y = String(year)
    const m = String(month).padStart(2, '0')
    return dbAll(
      'SELECT * FROM calendar_events WHERE date >= ? AND date <= ? ORDER BY date, created_at',
      [`${y}-${m}-01`, `${y}-${m}-31`]
    )
  })

  ipcMain.handle('calendar:create-event', (_e, data: { title: string; date: string; type: string; color: string }) => {
    const result = dbRun(
      'INSERT INTO calendar_events (title, date, type, color) VALUES (?, ?, ?, ?)',
      [data.title, data.date, data.type || 'event', data.color || '#7c3aed']
    )
    save()
    return dbGet('SELECT * FROM calendar_events WHERE id = ?', [result.lastInsertRowid])
  })

  ipcMain.handle('calendar:toggle-done', (_e, id: number) => {
    dbRun('UPDATE calendar_events SET is_done = 1 - is_done WHERE id = ?', [id])
    save()
  })

  ipcMain.handle('calendar:delete-event', (_e, id: number) => {
    dbRun('DELETE FROM calendar_events WHERE id = ?', [id])
    save()
  })

  ipcMain.handle('calendar:get-note', (_e, date: string) => {
    return dbGet('SELECT * FROM calendar_notes WHERE date = ?', [date])
  })

  ipcMain.handle('calendar:save-note', (_e, date: string, content: string) => {
    dbRun(
      `INSERT INTO calendar_notes (date, content, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = CURRENT_TIMESTAMP`,
      [date, content]
    )
    save()
  })

  ipcMain.handle('calendar:notes-by-month', (_e, year: number, month: number) => {
    const y = String(year)
    const m = String(month).padStart(2, '0')
    return dbAll(
      "SELECT date FROM calendar_notes WHERE date >= ? AND date <= ? AND content != ''",
      [`${y}-${m}-01`, `${y}-${m}-31`]
    )
  })
}
