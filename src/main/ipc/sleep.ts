import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { checkAllAchievements } from './profile'

export function registerSleepHandlers(): void {
  ipcMain.handle('sleep:get', (_e, date: string) => {
    return dbGet('SELECT * FROM sleep_logs WHERE date = ?', [date])
  })

  ipcMain.handle('sleep:recent', (_e, limit = 30) => {
    return dbAll('SELECT * FROM sleep_logs ORDER BY date DESC LIMIT ?', [limit])
  })

  ipcMain.handle('sleep:save', (_e, data: {
    date: string; bedtime: string; wake_time: string; quality: number; notes?: string; cycles?: number | null
  }) => {
    const existing = dbGet('SELECT id FROM sleep_logs WHERE date = ?', [data.date])
    if (existing) {
      dbRun(
        'UPDATE sleep_logs SET bedtime = ?, wake_time = ?, quality = ?, notes = ?, cycles = ? WHERE date = ?',
        [data.bedtime, data.wake_time, data.quality, data.notes || null, data.cycles ?? null, data.date]
      )
    } else {
      dbRun(
        'INSERT INTO sleep_logs (date, bedtime, wake_time, quality, notes, cycles) VALUES (?, ?, ?, ?, ?, ?)',
        [data.date, data.bedtime, data.wake_time, data.quality, data.notes || null, data.cycles ?? null]
      )
      checkAllAchievements()
    }
    save()
    return true
  })

  ipcMain.handle('sleep:delete', (_e, id: number) => {
    dbRun('DELETE FROM sleep_logs WHERE id = ?', [id])
    save()
    return true
  })
}
