import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { unlockAchievement } from './profile'

export function registerGoalsHandlers(): void {
  ipcMain.handle('goals:list', () => {
    const goals = dbAll('SELECT * FROM goals ORDER BY is_completed ASC, created_at DESC')
    for (const g of goals) {
      g.tasks = dbAll('SELECT * FROM goal_tasks WHERE goal_id = ? ORDER BY id ASC', [g.id as number])
    }
    return goals
  })

  ipcMain.handle('goals:create', (_e, data: {
    title: string; description?: string; target_date?: string; xp_reward: number
  }) => {
    const result = dbRun(
      'INSERT INTO goals (title, description, target_date, xp_reward) VALUES (?, ?, ?, ?)',
      [data.title, data.description || null, data.target_date || null, data.xp_reward]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('goals:update', (_e, id: number, data: {
    title: string; description?: string; target_date?: string; xp_reward: number
  }) => {
    dbRun(
      'UPDATE goals SET title=?, description=?, target_date=?, xp_reward=? WHERE id=?',
      [data.title, data.description || null, data.target_date || null, data.xp_reward, id]
    )
    save()
    return true
  })

  ipcMain.handle('goals:delete', (_e, id: number) => {
    dbRun('DELETE FROM goal_tasks WHERE goal_id = ?', [id])
    dbRun('DELETE FROM goals WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('goals:add-task', (_e, goalId: number, title: string) => {
    const result = dbRun('INSERT INTO goal_tasks (goal_id, title) VALUES (?, ?)', [goalId, title])
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('goals:complete-task', (_e, taskId: number, completed: boolean) => {
    dbRun('UPDATE goal_tasks SET is_completed = ? WHERE id = ?', [completed ? 1 : 0, taskId])
    save()
    return true
  })

  ipcMain.handle('goals:delete-task', (_e, taskId: number) => {
    dbRun('DELETE FROM goal_tasks WHERE id = ?', [taskId])
    save()
    return true
  })

  ipcMain.handle('goals:complete', (_e, id: number) => {
    const goal = dbGet('SELECT * FROM goals WHERE id = ?', [id])
    if (!goal || goal.is_completed) return false
    dbRun('UPDATE goals SET is_completed = 1 WHERE id = ?', [id])
    dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [goal.xp_reward])
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [goal.xp_reward, `Meta: ${goal.title}`])
    const completedCount = (dbGet('SELECT COUNT(*) as c FROM goals WHERE is_completed = 1')?.c as number) ?? 0
    if (completedCount === 1) {
      unlockAchievement('goal_first', 'Primeira Meta!', 'Completou sua primeira meta', '🎯')
    }
    unlockAchievement('goal_' + id, `Meta: ${goal.title}`, 'Completou uma meta', '✅')
    save()
    return true
  })
}
