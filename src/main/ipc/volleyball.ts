import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

interface VolleyballSession {
  date: string
  type: string
  duration_min?: number
  position?: string
  sets_won?: number
  sets_lost?: number
  aces?: number
  digs?: number
  blocks?: number
  spikes?: number
  result?: string
  notes?: string
}

export function registerVolleyballHandlers(): void {
  ipcMain.handle('volleyball:list', (_e, limit = 50) => {
    return dbAll('SELECT * FROM volleyball_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('volleyball:add', (_e, data: VolleyballSession) => {
    const result = dbRun(
      `INSERT INTO volleyball_sessions
        (date, type, duration_min, position, sets_won, sets_lost, aces, digs, blocks, spikes, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date, data.type, data.duration_min ?? null, data.position ?? null,
        data.sets_won ?? 0, data.sets_lost ?? 0, data.aces ?? 0,
        data.digs ?? 0, data.blocks ?? 0, data.spikes ?? 0,
        data.result ?? null, data.notes ?? null,
      ]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('volleyball:delete', (_e, id: number) => {
    dbRun('DELETE FROM volleyball_sessions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('volleyball:stats', () => {
    const rows = dbAll('SELECT * FROM volleyball_sessions') as Array<Record<string, number | string | null>>
    const games = rows.filter(r => r.type === 'jogo')
    return {
      total: rows.length,
      games: games.length,
      trainings: rows.filter(r => r.type === 'treino').length,
      wins: games.filter(r => r.result === 'vitoria').length,
      losses: games.filter(r => r.result === 'derrota').length,
    }
  })
}
