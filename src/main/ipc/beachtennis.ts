import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

interface BeachTennisSession {
  date: string
  type: string
  duration_min?: number
  partner?: string
  opponent_1?: string
  opponent_2?: string
  sets_won?: number
  sets_lost?: number
  result?: string
  tournament_name?: string
  position?: string
  category?: string
  tournament_stage?: string
  notes?: string
}

export function registerBeachTennisHandlers(): void {
  ipcMain.handle('beachtennis:list', (_e, limit = 50) => {
    return dbAll('SELECT * FROM beach_tennis_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('beachtennis:add', (_e, data: BeachTennisSession) => {
    const result = dbRun(
      `INSERT INTO beach_tennis_sessions
        (date, type, duration_min, partner, opponent_1, opponent_2, sets_won, sets_lost, result, tournament_name, position, category, tournament_stage, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date, data.type, data.duration_min ?? null, data.partner ?? null,
        data.opponent_1 ?? null, data.opponent_2 ?? null,
        data.sets_won ?? 0, data.sets_lost ?? 0,
        data.result ?? null, data.tournament_name ?? null,
        data.position ?? null, data.category ?? null,
        data.tournament_stage ?? null, data.notes ?? null,
      ]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('beachtennis:delete', (_e, id: number) => {
    dbRun('DELETE FROM beach_tennis_sessions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('beachtennis:stats', () => {
    const rows = dbAll('SELECT * FROM beach_tennis_sessions') as Array<Record<string, number | string | null>>
    const games = rows.filter(r => r.type === 'jogo' || r.type === 'torneio')
    return {
      total: rows.length,
      games: games.length,
      trainings: rows.filter(r => r.type === 'treino').length,
      wins: games.filter(r => r.result === 'vitoria').length,
      losses: games.filter(r => r.result === 'derrota').length,
    }
  })
}
