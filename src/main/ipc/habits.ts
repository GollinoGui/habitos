import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { unlockAchievement, checkAllAchievements } from './profile'

export function registerHabitsHandlers(): void {
  ipcMain.handle('habits:list', () => {
    return dbAll('SELECT * FROM habits ORDER BY created_at ASC')
  })

  ipcMain.handle('habits:create', (_e, data: {
    name: string; description?: string; frequency: string;
    target_time?: string; color: string; icon: string
  }) => {
    const xp = data.frequency === 'weekly' ? 25 : 10
    const result = dbRun(
      'INSERT INTO habits (name, description, frequency, target_time, xp_reward, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.description || '', data.frequency, data.target_time || null, xp, data.color, data.icon]
    )
    unlockAchievement('first_habit', 'Primeiro Hábito', 'Criou seu primeiro hábito', '🌟')
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('habits:update', (_e, id: number, data: {
    name: string; description?: string; frequency: string;
    target_time?: string; color: string; icon: string
  }) => {
    const xp = data.frequency === 'weekly' ? 25 : 10
    dbRun(
      'UPDATE habits SET name=?, description=?, frequency=?, target_time=?, xp_reward=?, color=?, icon=? WHERE id=?',
      [data.name, data.description || '', data.frequency, data.target_time || null, xp, data.color, data.icon, id]
    )
    save()
    return true
  })

  ipcMain.handle('habits:delete', (_e, id: number) => {
    dbRun('DELETE FROM habits WHERE id = ?', [id])
    dbRun('DELETE FROM habit_completions WHERE habit_id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('habits:toggle-active', (_e, id: number, active: boolean) => {
    dbRun('UPDATE habits SET is_active = ? WHERE id = ?', [active ? 1 : 0, id])
    save()
    return true
  })

  ipcMain.handle('habits:complete', (_e, habitId: number, date: string) => {
    try {
      const existing = dbGet('SELECT id FROM habit_completions WHERE habit_id = ? AND completed_at = ?', [habitId, date])
      if (existing) return false
      dbRun('INSERT INTO habit_completions (habit_id, completed_at) VALUES (?, ?)', [habitId, date])
      const habit = dbGet('SELECT xp_reward, name FROM habits WHERE id = ?', [habitId])
      if (habit) {
        dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [habit.xp_reward])
        dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [habit.xp_reward, `Hábito: ${habit.name}`])
      }
      checkAllAchievements()
      save()
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle('habits:uncomplete', (_e, habitId: number, date: string) => {
    const existing = dbGet('SELECT id FROM habit_completions WHERE habit_id = ? AND completed_at = ?', [habitId, date])
    if (!existing) return false
    dbRun('DELETE FROM habit_completions WHERE habit_id = ? AND completed_at = ?', [habitId, date])
    const habit = dbGet('SELECT xp_reward FROM habits WHERE id = ?', [habitId])
    if (habit) {
      dbRun('UPDATE user_profile SET total_xp = MAX(0, total_xp - ?) WHERE id = 1', [habit.xp_reward])
    }
    save()
    return true
  })

  ipcMain.handle('habits:completions', (_e, habitId: number) => {
    return dbAll('SELECT completed_at FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC', [habitId])
  })

  ipcMain.handle('habits:completions-range', (_e, startDate: string, endDate: string) => {
    return dbAll(
      'SELECT habit_id, completed_at FROM habit_completions WHERE completed_at BETWEEN ? AND ?',
      [startDate, endDate]
    )
  })

  ipcMain.handle('habits:streak', (_e, habitId: number) => {
    const completions = dbAll(
      'SELECT completed_at FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC',
      [habitId]
    )
    return computeStreak(completions)
  })
}

function computeStreak(completions: Record<string, unknown>[]): number {
  if (completions.length === 0) return 0
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const c of completions) {
    const date = new Date(c.completed_at as string)
    date.setHours(0, 0, 0, 0)
    const diff = Math.round((current.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === streak) {
      streak++
      current = date
    } else {
      break
    }
  }
  return streak
}
