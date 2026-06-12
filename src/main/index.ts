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

// Opens Google OAuth in an Electron window and intercepts the habitos:// callback
ipcMain.handle('auth:open-oauth', (_event, url: string) => {
  return new Promise<string | null>((resolve) => {
    const win = new BrowserWindow({
      width: 520,
      height: 680,
      show: true,
      autoHideMenuBar: true,
      title: 'Entrar com Google',
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    win.loadURL(url)

    function tryCapture(targetUrl: string) {
      if (targetUrl.startsWith('habitos://')) {
        win.destroy()
        resolve(targetUrl)
      }
    }

    win.webContents.on('will-redirect', (_e, u) => tryCapture(u))
    win.webContents.on('will-navigate', (_e, u) => tryCapture(u))
    win.on('closed', () => resolve(null))
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
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
