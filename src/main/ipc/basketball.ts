import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

interface BasketballSession {
  date: string
  type: string
  duration_min?: number
  points?: number
  rebounds?: number
  assists?: number
  steals?: number
  blocks?: number
  fg_made?: number
  fg_attempted?: number
  three_made?: number
  three_attempted?: number
  result?: string
  notes?: string
}

export function registerBasketballHandlers(): void {
  ipcMain.handle('basketball:list', (_e, limit = 50) => {
    return dbAll('SELECT * FROM basketball_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('basketball:add', (_e, data: BasketballSession) => {
    const result = dbRun(
      `INSERT INTO basketball_sessions
        (date, type, duration_min, points, rebounds, assists, steals, blocks,
         fg_made, fg_attempted, three_made, three_attempted, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date, data.type, data.duration_min ?? null,
        data.points ?? 0, data.rebounds ?? 0, data.assists ?? 0,
        data.steals ?? 0, data.blocks ?? 0,
        data.fg_made ?? 0, data.fg_attempted ?? 0,
        data.three_made ?? 0, data.three_attempted ?? 0,
        data.result ?? null, data.notes ?? null,
      ]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('basketball:delete', (_e, id: number) => {
    dbRun('DELETE FROM basketball_sessions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('basketball:stats', () => {
    const rows = dbAll('SELECT * FROM basketball_sessions') as Array<Record<string, number | string | null>>
    const games = rows.filter(r => r.type === 'jogo')
    const totalPoints = games.reduce((s, r) => s + (Number(r.points) || 0), 0)
    const totalRebounds = games.reduce((s, r) => s + (Number(r.rebounds) || 0), 0)
    const totalAssists = games.reduce((s, r) => s + (Number(r.assists) || 0), 0)
    return {
      total: rows.length,
      games: games.length,
      trainings: rows.filter(r => r.type === 'treino').length,
      wins: games.filter(r => r.result === 'vitoria').length,
      losses: games.filter(r => r.result === 'derrota').length,
      avgPoints: games.length > 0 ? Math.round((totalPoints / games.length) * 10) / 10 : 0,
      avgRebounds: games.length > 0 ? Math.round((totalRebounds / games.length) * 10) / 10 : 0,
      avgAssists: games.length > 0 ? Math.round((totalAssists / games.length) * 10) / 10 : 0,
    }
  })
}
