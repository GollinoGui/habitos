import { ipcMain } from 'electron'
import { dbAll, dbRun, save } from '../db'

const TRN_API_KEY = '32e5241a-13f1-40f7-a150-c4d4adb940f7'
const BASE = 'https://api.tracker.gg/api/v2/rocket-league/standard'

async function rlFetch(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'TRN-Api-Key': TRN_API_KEY,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export function registerRocketLeagueHandlers(): void {
  ipcMain.handle('rl:search', async (_e, query: string) => {
    try {
      const data = await rlFetch(
        `/search?autocomplete=true&query=${encodeURIComponent(query)}`
      ) as { data?: unknown[] }
      return { ok: true, data: data.data ?? [] }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('rl:get-profile', async (_e, platform: string, username: string) => {
    try {
      const data = await rlFetch(
        `/profile/${encodeURIComponent(platform)}/${encodeURIComponent(username)}`
      ) as { data?: unknown }
      return { ok: true, data: data.data ?? null }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('rl:add-session', (_e, data: {
    date: string; start_mmr: number; end_mmr: number
    matches: number; wins: number; notes?: string
  }) => {
    const gain = data.end_mmr - data.start_mmr
    const result = dbRun(
      'INSERT INTO rocket_league_sessions (date, start_mmr, end_mmr, mmr_gain, matches, wins, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.date, data.start_mmr, data.end_mmr, gain, data.matches || 0, data.wins || 0, data.notes || null]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('rl:list-sessions', (_e, limit = 50) => {
    return dbAll('SELECT * FROM rocket_league_sessions ORDER BY date DESC, id DESC LIMIT ?', [limit])
  })

  ipcMain.handle('rl:delete-session', (_e, id: number) => {
    dbRun('DELETE FROM rocket_league_sessions WHERE id = ?', [id])
    save()
    return true
  })
}
