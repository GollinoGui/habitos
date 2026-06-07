import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { checkAllAchievements } from './profile'

export function registerGoalsHandlers(): void {
  ipcMain.handle('goals:list', () => {
    const goals = dbAll('SELECT * FROM goals ORDER BY is_completed ASC, created_at DESC')
    for (const g of goals) {
      g.tasks = dbAll('SELECT * FROM goal_tasks WHERE goal_id = ? ORDER BY id ASC', [g.id as number])
    }
    return goals
  })

  ipcMain.handle('goals:create', (_e, data: {
    title: string; description?: string; target_date?: string; xp_reward: number; folder_id?: number | null
  }) => {
    const result = dbRun(
      'INSERT INTO goals (title, description, target_date, xp_reward, folder_id) VALUES (?, ?, ?, ?, ?)',
      [data.title, data.description || null, data.target_date || null, data.xp_reward, data.folder_id || null]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('goals:update', (_e, id: number, data: {
    title: string; description?: string; target_date?: string; xp_reward: number; folder_id?: number | null
  }) => {
    dbRun(
      'UPDATE goals SET title=?, description=?, target_date=?, xp_reward=?, folder_id=? WHERE id=?',
      [data.title, data.description || null, data.target_date || null, data.xp_reward, data.folder_id || null, id]
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

  ipcMain.handle('goals:update-task', (_e, taskId: number, title: string) => {
    dbRun('UPDATE goal_tasks SET title = ? WHERE id = ?', [title, taskId])
    save()
    return true
  })

  ipcMain.handle('goals:folders:list', () => {
    return dbAll('SELECT * FROM goal_folders ORDER BY created_at ASC')
  })

  ipcMain.handle('goals:folders:create', (_e, data: { name: string; icon: string; color: string }) => {
    const result = dbRun(
      'INSERT INTO goal_folders (name, icon, color) VALUES (?, ?, ?)',
      [data.name, data.icon, data.color]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('goals:folders:update', (_e, id: number, data: { name: string; icon: string; color: string }) => {
    dbRun('UPDATE goal_folders SET name=?, icon=?, color=? WHERE id=?', [data.name, data.icon, data.color, id])
    save()
    return true
  })

  ipcMain.handle('goals:folders:delete', (_e, id: number) => {
    dbRun('UPDATE goals SET folder_id = NULL WHERE folder_id = ?', [id])
    dbRun('DELETE FROM goal_folders WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('goals:complete', (_e, id: number) => {
    const goal = dbGet('SELECT * FROM goals WHERE id = ?', [id])
    if (!goal || goal.is_completed) return false
    const tasks = dbAll('SELECT * FROM goal_tasks WHERE goal_id = ?', [id])
    let xp = 50
    xp += tasks.length * 10
    if (tasks.length > 0 && tasks.every(t => t.is_completed)) xp += 25
    if (goal.target_date) xp += 10
    xp = Math.min(xp, 300)
    dbRun('UPDATE goals SET is_completed = 1, xp_reward = ? WHERE id = ?', [xp, id])
    dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [xp])
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [xp, `Meta: ${goal.title}`])
    checkAllAchievements()
    save()
    return true
  })
}
