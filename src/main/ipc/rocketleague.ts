import { ipcMain, net, BrowserWindow, shell } from 'electron'
import { dbAll, dbRun, save } from '../db'
import { TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, STARTGG_TOKEN } from '../twitchSecrets'

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

    // Track requests that match our API prefix so we can read body after loading finishes
    const pendingRequests = new Map<string, number>() // requestId → status

    win.webContents.debugger.on('message', async (_ev, method, params) => {
      if (method === 'Network.responseReceived') {
        const url: string = params.response?.url ?? ''
        if (!url.startsWith(apiPrefix)) return
        const status: number = params.response?.status ?? 0
        if (status >= 400) {
          finish(() => { win.destroy(); reject(new Error(String(status))) })
        } else {
          pendingRequests.set(params.requestId, status)
        }
        return
      }

      if (method === 'Network.loadingFinished') {
        if (!pendingRequests.has(params.requestId)) return
        pendingRequests.delete(params.requestId)
        try {
          const { body } = await win.webContents.debugger.sendCommand(
            'Network.getResponseBody', { requestId: params.requestId }
          )
          finish(() => { win.destroy(); resolve(JSON.parse(body)) })
        } catch (e) {
          finish(() => { win.destroy(); reject(e) })
        }
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

// ── Twitch helpers ────────────────────────────────────────────────────────────

let twitchTokenCache: { token: string; expires: number } | null = null

async function twitchGetToken(): Promise<string> {
  if (twitchTokenCache && Date.now() < twitchTokenCache.expires) {
    return twitchTokenCache.token
  }
  const url = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(TWITCH_CLIENT_SECRET)}&grant_type=client_credentials`
  const resp = await net.fetch(url, { method: 'POST' })
  const data = await resp.json() as { access_token?: string; expires_in?: number; message?: string }
  if (!data.access_token) throw new Error(data.message ?? 'no token')
  twitchTokenCache = { token: data.access_token, expires: Date.now() + ((data.expires_in ?? 3600) - 300) * 1000 }
  return data.access_token
}

async function twitchFetch(path: string, token: string): Promise<unknown> {
  const resp = await net.fetch(`https://api.twitch.tv/helix${path}`, {
    headers: {
      'Client-Id': TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  })
  if (!resp.ok) throw new Error(String(resp.status))
  return resp.json()
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
    matches: number; wins: number; notes?: string; preset_id?: number; tags?: string
  }) => {
    const gain = data.end_mmr - data.start_mmr
    const result = dbRun(
      'INSERT INTO rocket_league_sessions (date, start_mmr, end_mmr, mmr_gain, matches, wins, notes, preset_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [data.date, data.start_mmr, data.end_mmr, gain, data.matches || 0, data.wins || 0, data.notes || null, data.preset_id ?? null, data.tags || null]
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

  ipcMain.handle('rl:update-session', (_e, id: number, data: {
    date: string; start_mmr: number; end_mmr: number
    matches: number; wins: number; notes?: string; preset_id?: number | null; tags?: string
  }) => {
    const gain = data.end_mmr - data.start_mmr
    dbRun(
      'UPDATE rocket_league_sessions SET date=?, start_mmr=?, end_mmr=?, mmr_gain=?, matches=?, wins=?, notes=?, preset_id=?, tags=? WHERE id=?',
      [data.date, data.start_mmr, data.end_mmr, gain, data.matches || 0, data.wins || 0, data.notes || null, data.preset_id ?? null, data.tags || null, id]
    )
    save()
    return true
  })

  ipcMain.handle('rl:save-preset', (_e, data: { name: string; slots: string }) => {
    const result = dbRun(
      'INSERT INTO rl_car_presets (name, slots) VALUES (?, ?)',
      [data.name, data.slots]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('rl:list-presets', () => {
    return dbAll('SELECT * FROM rl_car_presets ORDER BY id DESC')
  })

  ipcMain.handle('rl:delete-preset', (_e, id: number) => {
    dbRun('DELETE FROM rl_car_presets WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('rl:twitch-live', async (_e, logins: string[]) => {
    if (!logins.length) return { ok: true, data: [] }
    if (!TWITCH_CLIENT_ID || TWITCH_CLIENT_ID.startsWith('SEU_')) {
      return { ok: false, error: 'credentials-not-configured' }
    }
    try {
      const token = await twitchGetToken()
      const query = logins.map(l => `user_login=${encodeURIComponent(l)}`).join('&')
      const data = await twitchFetch(`/streams?${query}&first=100`, token) as { data?: unknown[] }
      return { ok: true, data: data.data ?? [] }
    } catch (e) {
      if (String(e).includes('401')) twitchTokenCache = null
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('rl:open-url', (_e, url: string) => {
    if (url.startsWith('https://')) shell.openExternal(url)
  })

  ipcMain.handle('rl:twitch-oauth', (_e) => {
    return new Promise((resolve, reject) => {
      const REDIRECT = 'http://localhost:31337/callback'
      const authUrl  = `https://id.twitch.tv/oauth2/authorize?client_id=${encodeURIComponent(TWITCH_CLIENT_ID)}&redirect_uri=${encodeURIComponent(REDIRECT)}&response_type=code&scope=user%3Aread%3Afollows&force_verify=false`

      const authWin = new BrowserWindow({
        width: 580, height: 680, title: 'Entrar com Twitch',
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      })

      let done = false
      const finish = (fn: () => void) => { if (!done) { done = true; fn() } }

      async function handleCallback(url: string) {
        finish(() => { try { authWin.destroy() } catch { /* already closed */ } })
        try {
          const u    = new URL(url)
          const code = u.searchParams.get('code')
          const err  = u.searchParams.get('error')
          if (err || !code) { reject(new Error(err ?? 'cancelled')); return }

          // Exchange code → tokens
          const tokenUrl = `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(TWITCH_CLIENT_ID)}&client_secret=${encodeURIComponent(TWITCH_CLIENT_SECRET)}&code=${encodeURIComponent(code)}&grant_type=authorization_code&redirect_uri=${encodeURIComponent(REDIRECT)}`
          const tokenRaw = await new Promise<string>((res, rej) => {
            const r = net.request({ method: 'POST', url: tokenUrl })
            let b = ''
            r.on('response', rsp => { rsp.on('data', c => { b += c }); rsp.on('end', () => res(b)) })
            r.on('error', rej); r.end()
          })
          const token = JSON.parse(tokenRaw) as { access_token?: string; refresh_token?: string; expires_in?: number; message?: string }
          if (!token.access_token) { reject(new Error(token.message ?? 'no access_token')); return }

          // Fetch user info
          const userRaw = await new Promise<string>((res, rej) => {
            const r = net.request({ method: 'GET', url: 'https://api.twitch.tv/helix/users' })
            r.setHeader('Client-Id', TWITCH_CLIENT_ID)
            r.setHeader('Authorization', `Bearer ${token.access_token}`)
            r.setHeader('Accept', 'application/json')
            let b = ''
            r.on('response', rsp => { rsp.on('data', c => { b += c }); rsp.on('end', () => res(b)) })
            r.on('error', rej); r.end()
          })
          const user = (JSON.parse(userRaw) as { data?: Array<{ id: string; login: string; display_name: string; profile_image_url: string }> }).data?.[0]

          resolve({
            access_token: token.access_token,
            refresh_token: token.refresh_token ?? '',
            expires_in: token.expires_in ?? 14400,
            user_id: user?.id ?? '',
            user_login: user?.login ?? '',
            user_name: user?.display_name ?? '',
            profile_image_url: user?.profile_image_url ?? '',
          })
        } catch (e) { reject(e) }
      }

      authWin.webContents.on('will-redirect', (ev, url) => {
        if (!url.startsWith('http://localhost:31337')) return
        ev.preventDefault(); handleCallback(url)
      })
      authWin.webContents.on('will-navigate', (ev, url) => {
        if (!url.startsWith('http://localhost:31337')) return
        ev.preventDefault(); handleCallback(url)
      })
      authWin.on('closed', () => finish(() => reject(new Error('cancelled'))))
      authWin.loadURL(authUrl)
      setTimeout(() => finish(() => { try { authWin.destroy() } catch { /* closed */ } reject(new Error('timeout')) }), 5 * 60 * 1000)
    })
  })

  ipcMain.handle('rl:startgg', async (_e, query: string, variables?: Record<string, unknown>) => {
    if (!STARTGG_TOKEN) return { ok: false, error: 'token-not-configured' }
    try {
      const resp = await net.fetch('https://api.start.gg/gql/alpha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${STARTGG_TOKEN}`,
        },
        body: JSON.stringify({ query, variables: variables ?? {} }),
      })
      if (!resp.ok) return { ok: false, error: `HTTP ${resp.status}` }
      const data = await resp.json()
      return { ok: true, data }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

  ipcMain.handle('rl:twitch-followed', async (_e, userToken: string, userId: string) => {
    try {
      const raw = await twitchFetch(
        `/channels/followed?user_id=${encodeURIComponent(userId)}&first=100`,
        userToken
      ) as { data?: Array<{ broadcaster_id: string; broadcaster_login: string; broadcaster_name: string }> }

      const followed = raw.data ?? []
      if (!followed.length) return { ok: true, followed: [], streams: [] }

      const logins = followed.map(c => c.broadcaster_login)
      const streams: unknown[] = []
      for (let i = 0; i < logins.length; i += 20) {
        const q = logins.slice(i, i + 20).map(l => `user_login=${encodeURIComponent(l)}`).join('&')
        try {
          const s = await twitchFetch(`/streams?${q}&first=20`, userToken) as { data?: unknown[] }
          streams.push(...(s.data ?? []))
        } catch { /* skip chunk */ }
      }
      return { ok: true, followed, streams }
    } catch (e) {
      return { ok: false, error: String(e) }
    }
  })

}
