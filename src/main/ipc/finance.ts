import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'

export function registerFinanceHandlers(): void {
  ipcMain.handle('finance:categories:list', () => {
    return dbAll('SELECT * FROM finance_categories ORDER BY type ASC, name ASC')
  })

  ipcMain.handle('finance:categories:create', (_e, data: { name: string; type: string; icon: string; color: string }) => {
    const result = dbRun(
      'INSERT INTO finance_categories (name, type, icon, color) VALUES (?, ?, ?, ?)',
      [data.name, data.type, data.icon, data.color]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('finance:categories:delete', (_e, id: number) => {
    dbRun('DELETE FROM finance_transactions WHERE category_id = ?', [id])
    dbRun('DELETE FROM finance_categories WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('finance:transactions:list', (_e, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const rows = dbAll(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM finance_transactions t
       LEFT JOIN finance_categories c ON t.category_id = c.id
       WHERE t.date LIKE ?
       ORDER BY t.date DESC, t.created_at DESC`,
      [`${prefix}%`]
    )
    return rows
  })

  ipcMain.handle('finance:transactions:create', (_e, data: {
    date: string; amount: number; description: string; category_id?: number; type: string
  }) => {
    const result = dbRun(
      'INSERT INTO finance_transactions (date, amount, description, category_id, type) VALUES (?, ?, ?, ?, ?)',
      [data.date, data.amount, data.description, data.category_id || null, data.type]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('finance:transactions:delete', (_e, id: number) => {
    dbRun('DELETE FROM finance_transactions WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('finance:summary', (_e, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const income = dbGet(
      "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE date LIKE ? AND type = 'income'",
      [`${prefix}%`]
    )
    const expense = dbGet(
      "SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE date LIKE ? AND type = 'expense'",
      [`${prefix}%`]
    )
    return {
      income: (income?.total as number) ?? 0,
      expense: (expense?.total as number) ?? 0,
      balance: ((income?.total as number) ?? 0) - ((expense?.total as number) ?? 0)
    }
  })
}
