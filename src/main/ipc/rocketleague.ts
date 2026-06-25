import { ipcMain, net, BrowserWindow } from 'electron'
import { dbAll, dbRun, save } from '../db'

const TRN_API_KEY = '9f69be4b-32aa-4881-a1ee-443eada0d05c'
const API_BASE = 'https://api.tracker.gg/api/v2/rocket-league/standard'

// ── Direct API call (requires approved key) ───────────────────────────────────

function rlFetchDirect(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'GET', url: `${API_BASE}${path}` })
    request.setHeader('TRN-Api-Key', TRN_API_KEY)
    request.setHeader('Accept', 'application/json')
    request.setHeader('Origin', 'https://tracker.gg')
    request.setHeader('Referer', 'https://tracker.gg/')

    let body = ''
    request.on('response', (response) => {
      const status = response.statusCode ?? 0
      response.on('data', (chunk) => { body += chunk.toString() })
      response.on('end', () => {
        if (status >= 400) { reject(new Error(String(status))); return }
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(e) }
      })
    })
    request.on('error', reject)
    request.end()
  })
}

// ── Web fallback: intercepts the API call the site itself makes (no key needed) ─

function rlFetchViaWeb(platform: string, username: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      show: false,
      width: 1280,
      height: 900,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })

    const apiPrefix = `${API_BASE}/profile/`
    let done = false
    const finish = (fn: () => void) => { if (!done) { done = true; fn() } }

    try {
      win.webContents.debugger.attach('1.3')
    } catch (e) {
      win.destroy()
      reject(e)
      return
    }

    win.webContents.debugger.on('message', async (_ev, method, params) => {
      if (method !== 'Network.responseReceived') return
      const url: string = params.response?.url ?? ''
      if (!url.startsWith(apiPrefix)) return

      if ((params.response.status ?? 0) >= 400) {
        finish(() => { win.destroy(); reject(new Error(String(params.response.status))) })
        return
      }

      try {
        const { body } = await win.webContents.debugger.sendCommand(
          'Network.getResponseBody', { requestId: params.requestId }
        )
        finish(() => { win.destroy(); resolve(JSON.parse(body)) })
      } catch (e) {
        finish(() => { win.destroy(); reject(e) })
      }
    })

    win.webContents.debugger.sendCommand('Network.enable')

    const webUrl = `https://rocketleague.tracker.network/rocket-league/profile/${encodeURIComponent(platform)}/${encodeURIComponent(username)}/overview`
    win.loadURL(webUrl, {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    })

    setTimeout(() => {
      finish(() => { win.destroy(); reject(new Error('timeout')) })
    }, 25000)
  })
}

// ── Unified fetch: tenta direto, cai no web se bloqueado ─────────────────────

async function rlFetchProfile(platform: string, username: string): Promise<unknown> {
  const path = `/profile/${encodeURIComponent(platform)}/${encodeURIComponent(username)}`
  try {
    return await rlFetchDirect(path)
  } catch (e) {
    const code = String(e)
    if (code.includes('403') || code.includes('401') || code.includes('406')) {
      return await rlFetchViaWeb(platform, username)
    }
    throw e
  }
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

export function registerRocketLeagueHandlers(): void {
  ipcMain.handle('rl:get-profile', async (_e, platform: string, username: string) => {
    try {
      const data = await rlFetchProfile(platform, username) as { data?: unknown }
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
