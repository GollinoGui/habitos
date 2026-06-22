// Local (on-device) notifications for Android/Capacitor. Desktop uses Electron's
// native Notification API instead (see src/main/ipc/notifications.ts) — this file
// is the mobile equivalent for the same "Lembrete diário" setting in Settings.
import { LocalNotifications } from '@capacitor/local-notifications'
import { Capacitor } from '@capacitor/core'

const SETTINGS_KEY = 'habitos_mobile_notif_settings'
const DAILY_NOTIF_ID = 1001
const TEST_NOTIF_ID = 1002
const TITLE = 'Hábitos — Lembrete diário'
const BODY = 'Hora de anotar o dia e completar seus hábitos!'

export interface MobileNotifSettings {
  enabled: boolean
  hour: number
  minute: number
}

export interface SaveResult {
  ok: boolean
  reason?: 'unsupported' | 'denied'
}

function isNative(): boolean {
  return Capacitor.isNativePlatform()
}

export function loadMobileNotifSettings(): MobileNotifSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return { enabled: false, hour: 20, minute: 0 }
}

function persist(settings: MobileNotifSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

async function ensurePermission(): Promise<'granted' | 'denied'> {
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return 'granted'
  const requested = await LocalNotifications.requestPermissions()
  return requested.display === 'granted' ? 'granted' : 'denied'
}

export async function saveMobileNotifSettings(settings: MobileNotifSettings): Promise<SaveResult> {
  persist(settings)
  if (!isNative()) return { ok: false, reason: 'unsupported' }

  if (!settings.enabled) {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIF_ID }] })
    return { ok: true }
  }

  const perm = await ensurePermission()
  if (perm !== 'granted') return { ok: false, reason: 'denied' }

  await LocalNotifications.cancel({ notifications: [{ id: DAILY_NOTIF_ID }] })
  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_NOTIF_ID,
      title: TITLE,
      body: BODY,
      schedule: { on: { hour: settings.hour, minute: settings.minute }, allowWhileIdle: true }
    }]
  })
  return { ok: true }
}

export async function testMobileNotification(): Promise<{ sent: boolean }> {
  if (!isNative()) return { sent: false }
  const perm = await ensurePermission()
  if (perm !== 'granted') return { sent: false }
  await LocalNotifications.schedule({
    notifications: [{
      id: TEST_NOTIF_ID,
      title: TITLE,
      body: BODY,
      schedule: { at: new Date(Date.now() + 1000) }
    }]
  })
  return { sent: true }
}

// Re-applies the saved schedule on app start. Covers cases where the OS cleared
// pending alarms (e.g. after an app update) but the user's saved preference is
// still "enabled" — without this the reminder would silently stop firing.
export async function ensureMobileNotificationsScheduled(): Promise<void> {
  if (!isNative()) return
  const settings = loadMobileNotifSettings()
  if (!settings.enabled) return
  const current = await LocalNotifications.checkPermissions()
  if (current.display !== 'granted') return
  const pending = await LocalNotifications.getPending()
  if (pending.notifications.some(n => n.id === DAILY_NOTIF_ID)) return
  await LocalNotifications.schedule({
    notifications: [{
      id: DAILY_NOTIF_ID,
      title: TITLE,
      body: BODY,
      schedule: { on: { hour: settings.hour, minute: settings.minute }, allowWhileIdle: true }
    }]
  })
}
