import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'

export function registerJournalHandlers(): void {
  ipcMain.handle('journal:get', (_e, date: string) => {
    return dbGet('SELECT * FROM journal_entries WHERE date = ?', [date])
  })

  ipcMain.handle('journal:recent', (_e, limit = 30) => {
    return dbAll('SELECT * FROM journal_entries ORDER BY date DESC LIMIT ?', [limit])
  })

  ipcMain.handle('journal:save', (_e, data: { date: string; content: string; mood: number }) => {
    const existing = dbGet('SELECT id FROM journal_entries WHERE date = ?', [data.date])
    if (existing) {
      dbRun('UPDATE journal_entries SET content = ?, mood = ? WHERE date = ?', [data.content, data.mood, data.date])
    } else {
      dbRun('INSERT INTO journal_entries (date, content, mood) VALUES (?, ?, ?)', [data.date, data.content, data.mood])
    }
    save()
    return true
  })

  ipcMain.handle('journal:delete', (_e, id: number) => {
    dbRun('DELETE FROM journal_entries WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('journal:by-month', (_e, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return dbAll("SELECT * FROM journal_entries WHERE date LIKE ? ORDER BY date DESC", [`${prefix}%`])
  })
}
