import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

interface CS2Session {
  date: string
  type: string
  map?: string
  kills?: number
  deaths?: number
  assists?: number
  hs_pct?: number
  adr?: number
  mvps?: number
  score?: number
  result?: string
  notes?: string
}

export function registerCS2Handlers(): void {
  ipcMain.handle('cs2:list', (_e, limit = 50) => {
    return dbAll('SELECT * FROM cs2_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('cs2:add', (_e, data: CS2Session) => {
    const result = dbRun(
      `INSERT INTO cs2_sessions
        (date, type, map, kills, deaths, assists, hs_pct, adr, mvps, score, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date, data.type, data.map ?? null,
        data.kills ?? 0, data.deaths ?? 0, data.assists ?? 0,
        data.hs_pct ?? 0, data.adr ?? 0, data.mvps ?? 0, data.score ?? 0,
        data.result ?? null, data.notes ?? null,
      ]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('cs2:delete', (_e, id: number) => {
    dbRun('DELETE FROM cs2_sessions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('cs2:stats', () => {
    const rows = dbAll('SELECT * FROM cs2_sessions') as Array<Record<string, number | string | null>>
    const competitive = rows.filter(r => r.type === 'competitivo')
    const totalKills = competitive.reduce((s, r) => s + (Number(r.kills) || 0), 0)
    const totalDeaths = competitive.reduce((s, r) => s + (Number(r.deaths) || 0), 0)
    const totalAssists = competitive.reduce((s, r) => s + (Number(r.assists) || 0), 0)
    const totalAdr = competitive.reduce((s, r) => s + (Number(r.adr) || 0), 0)
    return {
      total: rows.length,
      competitive: competitive.length,
      wins: competitive.filter(r => r.result === 'vitoria').length,
      losses: competitive.filter(r => r.result === 'derrota').length,
      avgKills: competitive.length > 0 ? Math.round((totalKills / competitive.length) * 10) / 10 : 0,
      avgDeaths: competitive.length > 0 ? Math.round((totalDeaths / competitive.length) * 10) / 10 : 0,
      avgAssists: competitive.length > 0 ? Math.round((totalAssists / competitive.length) * 10) / 10 : 0,
      avgAdr: competitive.length > 0 ? Math.round((totalAdr / competitive.length) * 10) / 10 : 0,
      kd: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
    }
  })
}
