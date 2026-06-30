import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { checkAllAchievements } from './profile'

export function registerMediaHandlers(): void {
  ipcMain.handle('media:list', () => {
    return dbAll('SELECT * FROM media_items ORDER BY created_at DESC')
  })

  ipcMain.handle('media:create', (_e, data: {
    title: string; type: string; author?: string; total_pages?: number; cover_emoji: string; started_at?: string
  }) => {
    const result = dbRun(
      'INSERT INTO media_items (title, type, author, total_pages, cover_emoji, started_at) VALUES (?, ?, ?, ?, ?, ?)',
      [data.title, data.type, data.author || null, data.total_pages || null, data.cover_emoji, data.started_at || null]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('media:update', (_e, id: number, data: {
    title?: string; author?: string; total_pages?: number; current_page?: number;
    current_season?: number; status?: string; finished_at?: string; cover_emoji?: string; rating?: number
  }) => {
    const item = dbGet('SELECT * FROM media_items WHERE id = ?', [id])
    if (!item) return false
    dbRun(
      `UPDATE media_items SET
        title = COALESCE(?, title),
        author = COALESCE(?, author),
        total_pages = COALESCE(?, total_pages),
        current_page = COALESCE(?, current_page),
        current_season = COALESCE(?, current_season),
        status = COALESCE(?, status),
        finished_at = COALESCE(?, finished_at),
        cover_emoji = COALESCE(?, cover_emoji),
        rating = CASE WHEN ? IS NOT NULL THEN ? ELSE rating END
       WHERE id = ?`,
      [
        data.title ?? null, data.author ?? null, data.total_pages ?? null,
        data.current_page ?? null, data.current_season ?? null,
        data.status ?? null, data.finished_at ?? null,
        data.cover_emoji ?? null,
        data.rating ?? null, data.rating ?? null,
        id
      ]
    )
    if (data.status === 'done' && item.status !== 'done') {
      checkAllAchievements()
    }
    save()
    return true
  })

  ipcMain.handle('media:delete', (_e, id: number) => {
    dbRun('DELETE FROM media_logs WHERE media_id = ?', [id])
    dbRun('DELETE FROM media_items WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('media:log-session', (_e, data: {
    media_id: number; date: string; minutes_read: number; pages_read: number
    notes?: string; rating?: number; season?: number; episode?: number
  }) => {
    dbRun(
      'INSERT INTO media_logs (media_id, date, minutes_read, pages_read, notes, rating, season, episode) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.media_id, data.date, data.minutes_read, data.pages_read, data.notes || null, data.rating ?? null, data.season ?? null, data.episode ?? null]
    )
    if (data.pages_read > 0) {
      dbRun('UPDATE media_items SET current_page = current_page + ? WHERE id = ?', [data.pages_read, data.media_id])
    }
    save()
    return true
  })

  ipcMain.handle('media:today-minutes', (_e, date: string) => {
    const row = dbGet(
      'SELECT COALESCE(SUM(minutes_read), 0) as total FROM media_logs WHERE date = ?',
      [date]
    )
    return (row?.total as number) ?? 0
  })

  ipcMain.handle('media:logs', (_e, mediaId: number) => {
    return dbAll('SELECT * FROM media_logs WHERE media_id = ? ORDER BY date DESC LIMIT 30', [mediaId])
  })
}
