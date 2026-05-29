import { app, shell, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { initDb } from './db'
import { registerHabitsHandlers } from './ipc/habits'
import { registerGymHandlers } from './ipc/gym'
import { registerAddictionsHandlers } from './ipc/addictions'
import { registerGoalsHandlers } from './ipc/goals'
import { registerProfileHandlers } from './ipc/profile'
import { registerCalendarHandlers } from './ipc/calendar'

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
    const icon = nativeImage.createEmpty()
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

  createWindow()
  createTray()
  setupAutoLaunch()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
