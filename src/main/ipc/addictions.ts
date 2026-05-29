import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { checkAllAchievements } from './profile'

export function registerAddictionsHandlers(): void {
  ipcMain.handle('addictions:list', () => {
    const addictions = dbAll('SELECT * FROM addictions ORDER BY created_at DESC')
    for (const a of addictions) {
      a.relapses = dbAll(
        'SELECT * FROM addiction_relapses WHERE addiction_id = ? ORDER BY relapsed_at DESC',
        [a.id as number]
      )
    }
    return addictions
  })

  ipcMain.handle('addictions:create', (_e, data: { name: string; started_free_at: string }) => {
    const result = dbRun(
      'INSERT INTO addictions (name, started_free_at) VALUES (?, ?)',
      [data.name, data.started_free_at]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('addictions:relapse', (_e, id: number, note?: string) => {
    const now = new Date().toISOString()
    dbRun('INSERT INTO addiction_relapses (addiction_id, relapsed_at, note) VALUES (?, ?, ?)', [id, now, note || null])
    dbRun('UPDATE addictions SET started_free_at = ? WHERE id = ?', [now, id])
    save()
    return true
  })

  ipcMain.handle('addictions:delete', (_e, id: number) => {
    dbRun('DELETE FROM addiction_relapses WHERE addiction_id = ?', [id])
    dbRun('DELETE FROM addictions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('addictions:toggle-hidden', (_e, id: number) => {
    dbRun('UPDATE addictions SET is_hidden_name = 1 - is_hidden_name WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('addictions:check-milestones', () => {
    return checkAllAchievements()
  })
}

