// Bidirectional sync between the app's calendar (Supabase) and the device's
// native calendar, using @ebarooni/capacitor-calendar. Only works inside the
// native Capacitor shell (Android) — no-ops on web/Electron.
import { Capacitor } from '@capacitor/core'
import { CapacitorCalendar } from '@ebarooni/capacitor-calendar'
import { format } from 'date-fns'

const DEVICE_CALENDAR_TITLE = 'Hábitos'

export interface AppCalendarEvent {
  id: number
  title: string
  date: string
  type: string
  color: string
  is_done: number
  device_event_id?: string | null
}

export interface SyncResult {
  exported: number
  imported: number
  removedLocally: number
}

export function isNativeCalendarAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

export async function requestCalendarAccess(): Promise<boolean> {
  const { result } = await CapacitorCalendar.requestFullCalendarAccess()
  return result === 'granted'
}

async function ensureAppCalendar(accountEmail: string): Promise<string> {
  const { result: calendars } = await CapacitorCalendar.listCalendars()
  const existing = calendars.find(c => c.title === DEVICE_CALENDAR_TITLE)
  if (existing) return existing.id
  const { id } = await CapacitorCalendar.createCalendar({
    title: DEVICE_CALENDAR_TITLE,
    color: '#7c3aed',
    accountName: accountEmail,
    ownerAccount: accountEmail,
  })
  return id
}

// Syncs events within [-7 days, +180 days] from now:
// - app events without a linked device event are exported to a dedicated "Hábitos" device calendar
// - device events (outside that dedicated calendar, to avoid re-importing our own exports) are imported as app events
// - app events whose linked device event was deleted on the phone are removed from the app
export async function syncDeviceCalendar(
  events: AppCalendarEvent[],
  accountEmail: string
): Promise<SyncResult> {
  const calendarId = await ensureAppCalendar(accountEmail || 'habitos-app')

  let exported = 0
  let imported = 0
  let removedLocally = 0

  for (const evt of events) {
    if (evt.device_event_id) continue
    const startDate = new Date(`${evt.date}T09:00:00`).getTime()
    const endDate = new Date(`${evt.date}T10:00:00`).getTime()
    const { id } = await CapacitorCalendar.createEvent({
      title: evt.title,
      startDate,
      endDate,
      isAllDay: true,
      calendarId,
      color: evt.color,
    })
    await window.api.calendar.linkDevice?.(evt.id, id)
    exported++
  }

  const now = Date.now()
  const from = now - 7 * 86400000
  const to = now + 180 * 86400000
  const { result: deviceEvents } = await CapacitorCalendar.listEventsInRange({ from, to })
  const linkedDeviceIds = new Set(events.filter(e => e.device_event_id).map(e => e.device_event_id))

  for (const de of deviceEvents) {
    if (de.calendarId === calendarId) continue
    if (linkedDeviceIds.has(de.id)) continue
    const dateStr = format(new Date(de.startDate), 'yyyy-MM-dd')
    await window.api.calendar.createEvent({
      title: de.title, date: dateStr, type: 'event', color: '#0ea5e9',
      device_event_id: de.id,
    })
    imported++
  }

  const deviceIdsNow = new Set(deviceEvents.map(de => de.id))
  for (const evt of events) {
    if (!evt.device_event_id) continue
    if (deviceIdsNow.has(evt.device_event_id)) continue
    const evtTime = new Date(`${evt.date}T12:00:00`).getTime()
    if (evtTime < from || evtTime > to) continue
    await window.api.calendar.deleteEvent(evt.id)
    removedLocally++
  }

  return { exported, imported, removedLocally }
}

export async function deleteDeviceEvent(deviceEventId: string): Promise<void> {
  try {
    await CapacitorCalendar.deleteEvent({ id: deviceEventId })
  } catch {
    // Event may already be gone on the device side — safe to ignore.
  }
}
