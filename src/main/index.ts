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
import { autoUpdater } from 'electron-updater'
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
    // 16x16 white circle icon encoded as 1x1 PNG scaled — a simple dot works as placeholder
    const icon = nativeImage.createFromDataURL(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABMSURBVDiNY2AYBfQBExMT0////xm0XJL+z8DAMJqBgYGBhZmZGcXIyMiAYoCRkREmn5CQgGKAiYkJJp+UlIRigKmpKSaflJSEYgAAiPAHnXvCM3AAAAAASUVORK5CYII='
    )
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
