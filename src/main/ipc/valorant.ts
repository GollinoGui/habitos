import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

interface ValorantSession {
  date: string
  type: string
  map?: string
  agent?: string
  kills?: number
  deaths?: number
  assists?: number
  acs?: number
  first_bloods?: number
  rr_change?: number
  result?: string
  notes?: string
}

export function registerValorantHandlers(): void {
  ipcMain.handle('valorant:list', (_e, limit = 50) => {
    return dbAll('SELECT * FROM valorant_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('valorant:add', (_e, data: ValorantSession) => {
    const result = dbRun(
      `INSERT INTO valorant_sessions
        (date, type, map, agent, kills, deaths, assists, acs, first_bloods, rr_change, result, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.date, data.type, data.map ?? null, data.agent ?? null,
        data.kills ?? 0, data.deaths ?? 0, data.assists ?? 0,
        data.acs ?? 0, data.first_bloods ?? 0, data.rr_change ?? 0,
        data.result ?? null, data.notes ?? null,
      ]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('valorant:delete', (_e, id: number) => {
    dbRun('DELETE FROM valorant_sessions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('valorant:stats', () => {
    const rows = dbAll('SELECT * FROM valorant_sessions') as Array<Record<string, number | string | null>>
    const competitive = rows.filter(r => r.type === 'competitivo')
    const totalKills = competitive.reduce((s, r) => s + (Number(r.kills) || 0), 0)
    const totalDeaths = competitive.reduce((s, r) => s + (Number(r.deaths) || 0), 0)
    const totalAcs = competitive.reduce((s, r) => s + (Number(r.acs) || 0), 0)
    const totalRr = rows.reduce((s, r) => s + (Number(r.rr_change) || 0), 0)
    return {
      total: rows.length,
      competitive: competitive.length,
      wins: competitive.filter(r => r.result === 'vitoria').length,
      losses: competitive.filter(r => r.result === 'derrota').length,
      avgKills: competitive.length > 0 ? Math.round((totalKills / competitive.length) * 10) / 10 : 0,
      avgAcs: competitive.length > 0 ? Math.round((totalAcs / competitive.length) * 10) / 10 : 0,
      kd: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
      totalRr,
    }
  })
}
