import { ipcMain, Notification, app } from 'electron'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { dbAll, dbGet } from '../db'

interface NotificationSettings {
  enabled: boolean
  hour: number
  minute: number
}

let schedulerInterval: ReturnType<typeof setInterval> | null = null
let lastGlobalReminderDate = ''
let habitNotifiedDate = ''
const notifiedHabitsToday = new Set<number>()

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'notification-settings.json')
}

function loadSettings(): NotificationSettings {
  const path = getSettingsPath()
  if (existsSync(path)) {
    try {
      return JSON.parse(readFileSync(path, 'utf-8'))
    } catch {
      // ignore
    }
  }
  return { enabled: false, hour: 20, minute: 0 }
}

function saveSettings(settings: NotificationSettings): void {
  writeFileSync(getSettingsPath(), JSON.stringify(settings), 'utf-8')
}

function sendDailyReminder(): void {
  try {
    new Notification({
      title: 'Hábitos — Lembrete diário',
      body: 'Hora de anotar o dia e completar seus hábitos!',
      silent: false
    }).show()
  } catch (err) {
    console.error('[notifications] falha ao mostrar lembrete diário:', err)
  }
}

function checkHabitNotifications(): void {
  try {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    if (habitNotifiedDate !== today) {
      notifiedHabitsToday.clear()
      habitNotifiedDate = today
    }

    const currentMins = now.getHours() * 60 + now.getMinutes()

    const habits = dbAll(
      "SELECT id, name, target_time FROM habits WHERE is_active = 1 AND target_time IS NOT NULL AND target_time != ''"
    )

    for (const habit of habits) {
      const habitId = habit.id as number
      if (notifiedHabitsToday.has(habitId)) continue

      const [targetHour, targetMinute] = (habit.target_time as string).split(':').map(Number)
      const targetMins = targetHour * 60 + targetMinute

      if (currentMins < targetMins) continue

      const completion = dbGet(
        'SELECT id FROM habit_completions WHERE habit_id = ? AND completed_at = ?',
        [habitId, today]
      )

      if (!completion) {
        new Notification({
          title: 'Hábitos — Lembrete',
          body: `Você ainda não fez: ${habit.name as string}`,
          silent: false
        }).show()
        notifiedHabitsToday.add(habitId)
      }
    }
  } catch (err) {
    console.error('[notifications] falha ao checar lembretes de hábitos:', err)
  }
}

function startScheduler(): void {
  if (schedulerInterval) clearInterval(schedulerInterval)

  schedulerInterval = setInterval(() => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const settings = loadSettings()

    if (
      settings.enabled &&
      now.getHours() === settings.hour &&
      now.getMinutes() === settings.minute &&
      lastGlobalReminderDate !== today
    ) {
      lastGlobalReminderDate = today
      sendDailyReminder()
    }

    checkHabitNotifications()
  }, 60_000)
}

export function registerNotificationHandlers(): void {
  ipcMain.handle('notifications:get-settings', () => loadSettings())

  ipcMain.handle('notifications:save-settings', (_e, settings: NotificationSettings) => {
    saveSettings(settings)
    return true
  })

  ipcMain.handle('notifications:test', () => {
    try {
      if (!Notification.isSupported()) {
        console.error('[notifications] Notification API não suportada neste sistema')
        return { sent: false }
      }
      new Notification({
        title: 'Hábitos — Lembrete diário',
        body: 'Hora de anotar o dia e completar seus hábitos!',
        silent: false
      }).show()
      return { sent: true }
    } catch (err) {
      console.error('[notifications] falha ao enviar notificação de teste:', err)
      return { sent: false }
    }
  })

  startScheduler()
}
