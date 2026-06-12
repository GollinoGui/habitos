// Polyfill browser globals used by pdfjs-dist (via pdf-parse) in Node.js
if (typeof (globalThis as Record<string, unknown>).DOMMatrix === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).DOMMatrix = class DOMMatrix {
    static fromMatrix() { return new (globalThis as any).DOMMatrix() }
    multiply() { return this }; translate() { return this }; scale() { return this }
    rotate() { return this }; inverse() { return this }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transformPoint(p: any) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: p?.z ?? 0, w: p?.w ?? 1 } }
  }
}

import { app, shell, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } from 'electron'

// Register custom protocol for Google OAuth deep link
app.setAsDefaultProtocolClient('habitos')

// Single-instance lock so Windows can forward deep links to the running instance
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}
import updaterPkg from 'electron-updater'
const { autoUpdater } = updaterPkg
import { join } from 'path'
import { initDb } from './db'
import { registerHabitsHandlers } from './ipc/habits'
import { registerGymHandlers } from './ipc/gym'
import { registerAddictionsHandlers } from './ipc/addictions'
import { registerGoalsHandlers } from './ipc/goals'
import { registerProfileHandlers } from './ipc/profile'
import { registerCalendarHandlers } from './ipc/calendar'
import { registerNotificationHandlers } from './ipc/notifications'
import { registerJournalHandlers } from './ipc/journal'
import { registerSleepHandlers } from './ipc/sleep'
import { registerFinanceHandlers } from './ipc/finance'
import { registerMediaHandlers } from './ipc/media'
import { registerAppSettingsHandlers } from './ipc/appSettings'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f0f',
      symbolColor: '#f1f5f9',
      height: 32
    },
    backgroundColor: '#0f0f0f',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault()
      mainWindow!.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  try {
    const iconPath = join(app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources'), 'icon.png')
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    tray = new Tray(icon)
    tray.setToolTip('Hábitos')
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Abrir', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Sair', click: () => { tray = null; app.quit() } }
    ])
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      mainWindow?.isVisible() ? mainWindow.hide() : mainWindow?.show()
    })
  } catch (e) {
    console.error('Tray error:', e)
  }
}

function setupAutoLaunch(): void {
  if (app.isPackaged) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const AutoLaunch = require('electron-auto-launch')
      const launcher = new AutoLaunch({ name: 'Hábitos', path: app.getPath('exe') })
      launcher.enable()
    } catch (e) {
      console.error('AutoLaunch error:', e)
    }
  }
}

// Windows/Linux: second-instance receives the deep link as a CLI arg
app.on('second-instance', (_event, commandLine) => {
  const url = commandLine.find(arg => arg.startsWith('habitos://'))
  if (url && mainWindow) {
    mainWindow.webContents.send('auth:deeplink', url)
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// macOS: deep link fires on the running instance via open-url
app.on('open-url', (event, url) => {
  event.preventDefault()
  if (mainWindow) mainWindow.webContents.send('auth:deeplink', url)
})

// Opens Google OAuth in the system browser and captures the callback via a local HTTP server.
// Handles both PKCE (?code=) and implicit (#access_token=) flows.
ipcMain.handle('auth:open-oauth-browser', (_event, oauthUrl: string, port: number) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const http = require('http')
  return new Promise<string | null>((resolve) => {
    let resolved = false
    function done(url: string | null) {
      if (resolved) return
      resolved = true
      server.close()
      resolve(url)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = http.createServer((req: any, res: any) => {
      const reqUrl = req.url as string

      // PKCE flow: code arrives as query param — server receives it directly
      if (reqUrl.startsWith('/auth/callback') && req.method === 'GET') {
        const hasCode = reqUrl.includes('code=')
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        // Page sends full URL (including hash) back via POST so we capture implicit tokens too
        res.end(`<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f0f0f;color:white;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:48px">✅</div><h2>Login realizado!</h2><p>Pode fechar esta janela e voltar ao app.</p></div><script>
          var full = window.location.href;
          fetch('/auth/done',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:full})});
          ${hasCode ? '' : ''}
          setTimeout(()=>window.close(),2000);
        </script></body></html>`)
      }

      // Receives the full URL (with hash if implicit flow) from the page JS
      if (reqUrl === '/auth/done' && req.method === 'POST') {
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          res.writeHead(200); res.end()
          try { done(JSON.parse(body).url) } catch { done(null) }
        })
      }
    })

    server.on('error', () => done(null))
    server.listen(port, () => { shell.openExternal(oauthUrl) })
    setTimeout(() => done(null), 5 * 60 * 1000)
  })
})

app.whenReady().then(async () => {
  app.setAppUserModelId('com.guilherme.habitos')

  await initDb()

  registerProfileHandlers()
  registerHabitsHandlers()
  registerGymHandlers()
  registerAddictionsHandlers()
  registerGoalsHandlers()
  registerCalendarHandlers()
  registerNotificationHandlers()
  registerJournalHandlers()
  registerSleepHandlers()
  registerFinanceHandlers()
  registerMediaHandlers()
  registerAppSettingsHandlers()

  ipcMain.handle('demo:open', () => {
    const demoWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      show: false,
      autoHideMenuBar: true,
      title: 'Hábitos — Modo Demo',
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#0f0f0f',
        symbolColor: '#f1f5f9',
        height: 32
      },
      backgroundColor: '#0f0f0f',
      webPreferences: {
        preload: join(__dirname, '../preload/index.mjs'),
        additionalArguments: ['--habitos-demo'],
        sandbox: false,
        contextIsolation: true
      }
    })
    demoWindow.on('ready-to-show', () => demoWindow.show())
    demoWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })
    if (process.env['ELECTRON_RENDERER_URL']) {
      demoWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      demoWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  })

  createWindow()
  createTray()
  setupAutoLaunch()
  setupAutoUpdater()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function setupAutoUpdater(): void {
  if (!app.isPackaged) return

  autoUpdater.checkForUpdates()

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização disponível',
      message: 'Uma nova versão do Hábitos está sendo baixada em segundo plano.',
      buttons: ['OK']
    })
  })

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização pronta',
      message: 'A nova versão foi baixada. Reinicie o app para instalar.',
      buttons: ['Reiniciar agora', 'Depois']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall(true, true)
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
