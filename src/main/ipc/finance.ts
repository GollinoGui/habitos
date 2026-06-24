import { ipcMain, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dbAll, dbGet, dbRun, save } from '../db'

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function registerFinanceHandlers(): void {
  // ── CATEGORIES ──────────────────────────────────────────────────────────────

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
    dbRun('UPDATE finance_bills SET category_id = NULL WHERE category_id = ?', [id])
    dbRun('DELETE FROM finance_categories WHERE id = ?', [id])
    save()
    return true
  })

  // ── BILLS (contas fixas) ────────────────────────────────────────────────────

  ipcMain.handle('finance:bills:list', () => {
    return dbAll(
      `SELECT b.*, c.name as category_name, c.icon as category_icon
       FROM finance_bills b
       LEFT JOIN finance_categories c ON b.category_id = c.id
       ORDER BY b.type ASC, b.due_day ASC, b.name ASC`
    )
  })

  ipcMain.handle('finance:bills:create', (_e, data: {
    name: string; amount: number; due_day: number; due_month?: number
    category_id?: number; type: string; recurrence: string; icon: string
  }) => {
    const result = dbRun(
      'INSERT INTO finance_bills (name, amount, due_day, due_month, category_id, type, recurrence, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [data.name, data.amount, data.due_day, data.due_month ?? null, data.category_id ?? null, data.type, data.recurrence, data.icon]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('finance:bills:delete', (_e, id: number) => {
    dbRun("DELETE FROM finance_transactions WHERE bill_id = ? AND status = 'pending'", [id])
    dbRun('DELETE FROM finance_bills WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('finance:bills:toggle-active', (_e, id: number) => {
    dbRun('UPDATE finance_bills SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id])
    save()
    return true
  })

  // Generates pending transactions for the given month from active bills.
  // Idempotent: skips bills that already have a transaction in that month.
  ipcMain.handle('finance:bills:generate-month', (_e, year: number, month: number) => {
    const bills = dbAll("SELECT * FROM finance_bills WHERE is_active = 1")
    const monthStr = String(month).padStart(2, '0')
    const days = daysInMonth(year, month)
    let generated = 0

    for (const bill of bills) {
      if (bill.recurrence === 'yearly' && bill.due_month !== month) continue

      const existing = dbGet(
        'SELECT id FROM finance_transactions WHERE bill_id = ? AND date LIKE ?',
        [bill.id, `${year}-${monthStr}%`]
      )
      if (existing) continue

      const day = Math.min(bill.due_day as number, days)
      const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`

      dbRun(
        "INSERT INTO finance_transactions (date, amount, description, category_id, type, status, bill_id) VALUES (?, ?, ?, ?, ?, 'pending', ?)",
        [dateStr, bill.amount, bill.name, bill.category_id ?? null, bill.type, bill.id]
      )
      generated++
    }

    if (generated > 0) save()
    return generated
  })

  // ── TRANSACTIONS ────────────────────────────────────────────────────────────

  ipcMain.handle('finance:transactions:list', (_e, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return dbAll(
      `SELECT t.*, c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name, a.icon as account_icon, a.color as account_color
       FROM finance_transactions t
       LEFT JOIN finance_categories c ON t.category_id = c.id
       LEFT JOIN finance_accounts a ON t.account_id = a.id
       WHERE t.date LIKE ? AND t.status != 'cancelled'
       ORDER BY t.date DESC, t.created_at DESC`,
      [`${prefix}%`]
    )
  })

  ipcMain.handle('finance:transactions:create', (_e, data: {
    date: string; amount: number; description: string
    category_id?: number; type: string; status?: string; account_id?: number
  }) => {
    const result = dbRun(
      'INSERT INTO finance_transactions (date, amount, description, category_id, type, status, account_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [data.date, data.amount, data.description, data.category_id ?? null, data.type, data.status ?? 'paid', data.account_id ?? null]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('finance:transactions:delete', (_e, id: number) => {
    const tx = dbGet('SELECT bill_id FROM finance_transactions WHERE id = ?', [id]) as { bill_id: number | null } | null
    if (tx?.bill_id) {
      // Soft-delete: mark as cancelled so generateMonth doesn't recreate it
      dbRun("UPDATE finance_transactions SET status = 'cancelled' WHERE id = ?", [id])
    } else {
      dbRun('DELETE FROM finance_transactions WHERE id = ?', [id])
    }
    save()
    return true
  })

  ipcMain.handle('finance:transactions:update-status', (_e, id: number, status: string) => {
    dbRun('UPDATE finance_transactions SET status = ? WHERE id = ?', [status, id])
    save()
    return true
  })

  ipcMain.handle('finance:transactions:update-amount', (_e, id: number, amount: number) => {
    dbRun('UPDATE finance_transactions SET amount = ? WHERE id = ?', [amount, id])
    save()
    return true
  })

  // ── SUMMARY (with paid/pending breakdown + next-month estimate) ─────────────

  ipcMain.handle('finance:summary', (_e, year: number, month: number) => {
    const prefix = `${year}-${String(month).padStart(2, '0')}`

    const q = (type: string, status: string) =>
      (dbGet(
        `SELECT COALESCE(SUM(amount), 0) as total FROM finance_transactions WHERE date LIKE ? AND type = ? AND status = ?`,
        [`${prefix}%`, type, status]
      )?.total as number) ?? 0

    const paidIncome    = q('income',  'paid')
    const pendingIncome = q('income',  'pending')
    const paidExpense   = q('expense', 'paid')
    const pendingExpense = q('expense', 'pending')

    // Next month bills estimate
    const nextMonth = month === 12 ? 1 : month + 1
    const nextExpense = (dbGet(
      `SELECT COALESCE(SUM(amount), 0) as total FROM finance_bills
       WHERE is_active = 1 AND type = 'expense'
       AND (recurrence = 'monthly' OR (recurrence = 'yearly' AND due_month = ?))`,
      [nextMonth]
    )?.total as number) ?? 0
    const nextIncome = (dbGet(
      `SELECT COALESCE(SUM(amount), 0) as total FROM finance_bills
       WHERE is_active = 1 AND type = 'income'
       AND (recurrence = 'monthly' OR (recurrence = 'yearly' AND due_month = ?))`,
      [nextMonth]
    )?.total as number) ?? 0

    return {
      paidIncome,
      pendingIncome,
      paidExpense,
      pendingExpense,
      income: paidIncome + pendingIncome,
      expense: paidExpense + pendingExpense,
      balance: (paidIncome + pendingIncome) - (paidExpense + pendingExpense),
      currentBalance: paidIncome - paidExpense,
      projectedBalance: (paidIncome + pendingIncome) - (paidExpense + pendingExpense),
      nextMonthIncome: nextIncome,
      nextMonthExpense: nextExpense,
      nextMonthBalance: nextIncome - nextExpense
    }
  })

  // ── ACCOUNTS (contas bancárias) ─────────────────────────────────────────────

  ipcMain.handle('finance:accounts:list', () => {
    return dbAll('SELECT * FROM finance_accounts ORDER BY name ASC')
  })

  ipcMain.handle('finance:accounts:create', (_e, data: { name: string; bank: string; icon: string; color: string }) => {
    const result = dbRun(
      'INSERT INTO finance_accounts (name, bank, icon, color) VALUES (?, ?, ?, ?)',
      [data.name, data.bank, data.icon, data.color]
    )
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('finance:accounts:delete', (_e, id: number) => {
    dbRun('UPDATE finance_transactions SET account_id = NULL WHERE account_id = ?', [id])
    dbRun('DELETE FROM finance_accounts WHERE id = ?', [id])
    save()
    return true
  })

  // ── OFX IMPORT ──────────────────────────────────────────────────────────────

  ipcMain.handle('finance:ofx:import', (_e, content: string, accountId?: number) => {
    const transactions = parseOFX(content)
    let imported = 0
    for (const tx of transactions) {
      const existing = dbGet(
        'SELECT id FROM finance_transactions WHERE date = ? AND amount = ? AND description = ?',
        [tx.date, tx.amount, tx.description]
      )
      if (existing) continue
      dbRun(
        'INSERT INTO finance_transactions (date, amount, description, type, status, account_id) VALUES (?, ?, ?, ?, ?, ?)',
        [tx.date, tx.amount, tx.description, tx.type, 'paid', accountId ?? null]
      )
      imported++
    }
    if (imported > 0) save()
    return { imported, total: transactions.length }
  })

  // ── RECEIPT PARSE (local, sem API externa) ───────────────────────────────────

  ipcMain.handle('finance:receipt:parse', async (_e, base64: string, mimeType: string) => {
    try {
      const buffer = Buffer.from(base64, 'base64')
      let text = ''

      if (mimeType === 'application/pdf') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse')
        const parser = new PDFParse({ data: buffer })
        const data = await parser.getText()
        await parser.destroy()
        text = data.text as string
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { createWorker } = require('tesseract.js')
        const worker = await createWorker('por', 1, { logger: () => {} })
        const result = await (worker as { recognize: (b: Buffer) => Promise<{ data: { text: string } }> }).recognize(buffer)
        text = result.data.text
        await (worker as { terminate: () => Promise<void> }).terminate()
      }

      return parseReceiptText(text)
    } catch (e: unknown) {
      return { error: (e as Error).message }
    }
  })

  // ── BACKUP REMINDER ─────────────────────────────────────────────────────────

  const backupFile = join(app.getPath('userData'), 'backup-reminder.json')

  ipcMain.handle('finance:backup:check', () => {
    const today = new Date()
    if (today.getDate() < 20) return { shouldRemind: false }

    let last = { year: 0, month: 0 }
    if (existsSync(backupFile)) {
      try { last = JSON.parse(readFileSync(backupFile, 'utf-8')) } catch { /* ignore */ }
    }

    const shouldRemind = last.year !== today.getFullYear() || last.month !== today.getMonth() + 1
    return { shouldRemind }
  })

  ipcMain.handle('finance:backup:dismiss', () => {
    const today = new Date()
    writeFileSync(backupFile, JSON.stringify({ year: today.getFullYear(), month: today.getMonth() + 1 }))
    return true
  })
}

function parseReceiptText(text: string): { amount: number | null; date: string | null; description: string | null; type: string } {
  // Amount — tenta padrões do mais específico ao mais genérico
  let amount: number | null = null
  const amountPatterns = [
    /valor\s+pago[^R\n]*R\$\s*([\d.]+,\d{2})/i,
    /valor[^R\n]*R\$\s*([\d.]+,\d{2})/i,
    /R\$\s*([\d.]+,\d{2})/,
    /([\d]{1,3}(?:\.\d{3})*,\d{2})/,
  ]
  for (const p of amountPatterns) {
    const m = text.match(p)
    if (m) { amount = parseFloat(m[1].replace(/\./g, '').replace(',', '.')); break }
  }

  // Date — DD/MM/YYYY ou YYYY-MM-DD
  let date: string | null = null
  const dmyMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  const ymdMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (dmyMatch) date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`
  else if (ymdMatch) date = `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`

  // Description — labels comuns em comprovantes brasileiros
  let description: string | null = null
  const descPatterns = [
    /(?:para|favorecido|destinatário|beneficiário)\s*[:\-]?\s*\n?\s*([^\n\d]{3,60})/i,
    /(?:nome do favorecido|nome)\s*[:\-]\s*([^\n]{3,60})/i,
    /(?:empresa|estabelecimento|loja)\s*[:\-]\s*([^\n]{3,60})/i,
    /(?:descrição|descrição do pagamento)\s*[:\-]\s*([^\n]{3,60})/i,
  ]
  for (const p of descPatterns) {
    const m = text.match(p)
    const candidate = m?.[1]?.trim()
    if (candidate && !/^\d+$/.test(candidate)) {
      description = candidate.substring(0, 60)
      break
    }
  }

  return { amount, date, description, type: 'expense' }
}

function parseOFX(content: string): Array<{ date: string; amount: number; description: string; type: string }> {
  const results: Array<{ date: string; amount: number; description: string; type: string }> = []

  // Split by <STMTTRN> — works for both SGML (no closing tags) and XML OFX
  const blocks = content.split(/<STMTTRN>/i).slice(1)

  for (const block of blocks) {
    const dtPosted = block.match(/<DTPOSTED>\s*([^\n<\r]+)/i)?.[1]?.trim()
    const trnAmt   = block.match(/<TRNAMT>\s*([^\n<\r]+)/i)?.[1]?.trim()
    const name     = block.match(/<NAME>\s*([^\n<\r]+)/i)?.[1]?.trim()
    const memo     = block.match(/<MEMO>\s*([^\n<\r]+)/i)?.[1]?.trim()

    if (!dtPosted || trnAmt === undefined) continue

    // Parse YYYYMMDD (may have time + timezone suffix)
    const dateRaw = dtPosted.replace(/\D/g, '').substring(0, 8)
    if (dateRaw.length < 8) continue
    const date = `${dateRaw.substring(0, 4)}-${dateRaw.substring(4, 6)}-${dateRaw.substring(6, 8)}`

    const amountRaw = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(amountRaw)) continue

    results.push({
      date,
      amount: Math.abs(amountRaw),
      description: name || memo || 'Importado OFX',
      type: amountRaw >= 0 ? 'income' : 'expense'
    })
  }

  return results
}
