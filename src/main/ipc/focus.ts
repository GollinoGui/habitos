import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { checkAllAchievements } from './profile'

const XP_PER_MINUTE = 1

export function registerFocusHandlers(): void {
  ipcMain.handle('focus:log-session', (_e, data: { date: string; duration_minutes: number; label?: string }) => {
    const xp = Math.max(1, Math.round(data.duration_minutes * XP_PER_MINUTE))
    dbRun(
      'INSERT INTO focus_sessions (date, duration_minutes, label) VALUES (?, ?, ?)',
      [data.date, data.duration_minutes, data.label || null]
    )
    dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [xp])
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [xp, `Foco: ${data.duration_minutes}min`])
    checkAllAchievements()
    save()
    return { xp }
  })

  ipcMain.handle('focus:today-stats', (_e, date: string) => {
    const row = dbGet(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes), 0) as minutes FROM focus_sessions WHERE date = ?',
      [date]
    )
    return { sessions: (row?.sessions as number) ?? 0, minutes: (row?.minutes as number) ?? 0 }
  })

  ipcMain.handle('focus:week-stats', (_e, startDate: string, endDate: string) => {
    const row = dbGet(
      'SELECT COUNT(*) as sessions, COALESCE(SUM(duration_minutes), 0) as minutes FROM focus_sessions WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    )
    return { sessions: (row?.sessions as number) ?? 0, minutes: (row?.minutes as number) ?? 0 }
  })

  ipcMain.handle('focus:streak', () => {
    const dates = dbAll('SELECT DISTINCT date FROM focus_sessions ORDER BY date DESC').map(r => r.date as string)
    return computeDateStreak(dates)
  })

  ipcMain.handle('focus:history', (_e, limit = 20) => {
    return dbAll('SELECT * FROM focus_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })
}

function computeDateStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const dateStr of sortedDatesDesc) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const diff = Math.round((current.getTime() - date.getTime()) / 86400000)
    if (diff === streak) {
      streak++
      current = date
    } else {
      break
    }
  }
  return streak
}
