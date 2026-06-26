import { ipcMain, dialog } from 'electron'
import { dbAll, dbRun, save } from '../db'

const IMPORT_TABLE_ORDER = [
  'habit_completions', 'habits',
  'exercises', 'workouts', 'bioimpedance',
  'addiction_relapses', 'addictions',
  'goal_tasks', 'goals', 'goal_folders',
  'journal_entries', 'sleep_logs',
  'finance_transactions', 'finance_bills', 'finance_categories', 'finance_accounts',
  'media_logs', 'media_items',
  'workout_program_exercises', 'workout_program_days', 'workout_programs',
  'calendar_events', 'calendar_notes',
  'xp_history', 'achievements'
]

export function registerAppSettingsHandlers(): void {
  ipcMain.handle('app:import-data', (_e, json: string) => {
    const data = JSON.parse(json)
    for (const table of IMPORT_TABLE_ORDER) {
      dbRun(`DELETE FROM ${table}`)
    }
    for (const table of [...IMPORT_TABLE_ORDER].reverse()) {
      const rows = data[table]
      if (!rows || rows.length === 0) continue
      const cols = Object.keys(rows[0])
      if (cols.length === 0) continue
      const placeholders = cols.map(() => '?').join(', ')
      const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
      for (const row of rows) {
        dbRun(sql, cols.map((c: string) => row[c]))
      }
    }
    save()
    return true
  })

  ipcMain.handle('app:export-data', () => {
    const data = {
      exported_at: new Date().toISOString(),
      habits: dbAll('SELECT * FROM habits'),
      habit_completions: dbAll('SELECT * FROM habit_completions'),
      workouts: dbAll('SELECT * FROM workouts'),
      exercises: dbAll('SELECT * FROM exercises'),
      bioimpedance: dbAll('SELECT * FROM bioimpedance'),
      addictions: dbAll('SELECT * FROM addictions'),
      addiction_relapses: dbAll('SELECT * FROM addiction_relapses'),
      goals: dbAll('SELECT * FROM goals'),
      goal_tasks: dbAll('SELECT * FROM goal_tasks'),
      goal_folders: dbAll('SELECT * FROM goal_folders'),
      journal_entries: dbAll('SELECT * FROM journal_entries'),
      sleep_logs: dbAll('SELECT * FROM sleep_logs'),
      finance_categories: dbAll('SELECT * FROM finance_categories'),
      finance_bills: dbAll('SELECT * FROM finance_bills'),
      finance_accounts: dbAll('SELECT * FROM finance_accounts'),
      finance_transactions: dbAll('SELECT * FROM finance_transactions'),
      media_items: dbAll('SELECT * FROM media_items'),
      media_logs: dbAll('SELECT * FROM media_logs'),
      calendar_events: dbAll('SELECT * FROM calendar_events'),
      calendar_notes: dbAll('SELECT * FROM calendar_notes'),
      workout_programs: dbAll('SELECT * FROM workout_programs'),
      workout_program_days: dbAll('SELECT * FROM workout_program_days'),
      workout_program_exercises: dbAll('SELECT * FROM workout_program_exercises'),
      xp_history: dbAll('SELECT * FROM xp_history ORDER BY created_at DESC LIMIT 500'),
      achievements: dbAll('SELECT * FROM achievements'),
      rocket_league_sessions: dbAll('SELECT * FROM rocket_league_sessions ORDER BY date DESC, id DESC'),
      rl_car_presets: dbAll('SELECT * FROM rl_car_presets ORDER BY id DESC'),
    }
    return JSON.stringify(data, null, 2)
  })

  ipcMain.handle('app:export-excel', async (_e, year: number, month: number) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `habitos_${year}_${String(month).padStart(2, '0')}.xlsx`,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    const y = String(year)
    const m = String(month).padStart(2, '0')
    const start = `${y}-${m}-01`
    const end = `${y}-${m}-31`

    // ── Aba Hábitos ──────────────────────────────────────────────────────────
    const habits = dbAll('SELECT * FROM habits WHERE is_active = 1 ORDER BY name ASC')
    const completions = dbAll(
      'SELECT habit_id, completed_at FROM habit_completions WHERE completed_at BETWEEN ? AND ?',
      [start, end]
    )
    const daysInMonth = new Date(year, month, 0).getDate()
    const habitHeader = ['Data', ...habits.map(h => `${h.icon} ${h.name}`)]
    const habitRows = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      const dateStr = `${y}-${m}-${day}`
      return [
        dateStr,
        ...habits.map(h => completions.some(c => c.habit_id === h.id && c.completed_at === dateStr) ? '✓' : '')
      ]
    })
    const wsHabits = XLSX.utils.aoa_to_sheet([habitHeader, ...habitRows])
    XLSX.utils.book_append_sheet(wb, wsHabits, 'Hábitos')

    // ── Aba Sono ─────────────────────────────────────────────────────────────
    const sleepLogs = dbAll('SELECT * FROM sleep_logs WHERE date BETWEEN ? AND ? ORDER BY date ASC', [start, end])
    const sleepRows = sleepLogs.map(s => {
      const [bh, bm] = (s.bedtime as string).split(':').map(Number)
      const [wh, wm] = (s.wake_time as string).split(':').map(Number)
      let mins = (wh * 60 + wm) - (bh * 60 + bm)
      if (mins < 0) mins += 1440
      const dur = `${Math.floor(mins / 60)}h${mins % 60 > 0 ? `${mins % 60}m` : ''}`
      return [s.date, s.bedtime, s.wake_time, dur, s.quality, s.notes || '']
    })
    const wsSleep = XLSX.utils.aoa_to_sheet([
      ['Data', 'Dormiu às', 'Acordou às', 'Duração', 'Qualidade (1-5)', 'Notas'],
      ...sleepRows
    ])
    XLSX.utils.book_append_sheet(wb, wsSleep, 'Sono')

    // ── Aba Academia ─────────────────────────────────────────────────────────
    const workouts = dbAll('SELECT * FROM workouts WHERE date BETWEEN ? AND ? ORDER BY date ASC', [start, end])
    const gymRows: unknown[][] = []
    for (const w of workouts) {
      const exs = dbAll('SELECT * FROM exercises WHERE workout_id = ? ORDER BY id ASC', [w.id as number])
      if (exs.length === 0) {
        gymRows.push([w.date, w.name, w.duration_min || '', '', '', '', '', w.notes || ''])
      } else {
        for (const ex of exs) {
          gymRows.push([w.date, w.name, w.duration_min || '', ex.name, ex.sets || '', ex.reps || '', ex.weight_kg || '', w.notes || ''])
        }
      }
    }
    const wsGym = XLSX.utils.aoa_to_sheet([
      ['Data', 'Treino', 'Duração (min)', 'Exercício', 'Séries', 'Reps', 'Peso (kg)', 'Notas'],
      ...gymRows
    ])
    XLSX.utils.book_append_sheet(wb, wsGym, 'Academia')

    // ── Aba Finanças ─────────────────────────────────────────────────────────
    const txs = dbAll(
      `SELECT t.date, t.description, t.type, t.amount, t.status,
              c.name as category, a.name as account
       FROM finance_transactions t
       LEFT JOIN finance_categories c ON c.id = t.category_id
       LEFT JOIN finance_accounts a ON a.id = t.account_id
       WHERE t.date BETWEEN ? AND ?
       ORDER BY t.date ASC`,
      [start, end]
    )
    const finRows = txs.map(t => [
      t.date,
      t.description || '',
      t.type === 'income' ? 'Receita' : 'Despesa',
      t.category || '',
      t.account || '',
      t.amount,
      t.status === 'paid' || t.status === 'done' ? 'Pago' : 'Pendente'
    ])
    const wsFinance = XLSX.utils.aoa_to_sheet([
      ['Data', 'Descrição', 'Tipo', 'Categoria', 'Conta', 'Valor (R$)', 'Status'],
      ...finRows
    ])
    XLSX.utils.book_append_sheet(wb, wsFinance, 'Finanças')

    // ── Aba Resumo ───────────────────────────────────────────────────────────
    const xpMonth = dbAll(
      `SELECT SUM(amount) as total FROM xp_history WHERE DATE(created_at) BETWEEN ? AND ?`,
      [start, end]
    )
    const totalHabitDays = habits.length * daysInMonth
    const totalCompletions = completions.length
    const sleepAvgQuality = sleepLogs.length
      ? (sleepLogs.reduce((s, l) => s + (l.quality as number), 0) / sleepLogs.length).toFixed(1)
      : '-'
    const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount as number), 0)
    const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount as number), 0)
    const monthName = new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
    const wsResumo = XLSX.utils.aoa_to_sheet([
      ['Relatório Hábitos', monthName],
      [],
      ['XP ganho no mês', (xpMonth[0]?.total as number) || 0],
      ['Conclusões de hábitos', `${totalCompletions} / ${totalHabitDays} possíveis`],
      ['Taxa de conclusão', totalHabitDays > 0 ? `${Math.round((totalCompletions / totalHabitDays) * 100)}%` : '-'],
      ['Treinos registrados', workouts.length],
      ['Noites de sono registradas', sleepLogs.length],
      ['Qualidade média de sono', sleepAvgQuality],
      ['Receitas', totalIncome],
      ['Despesas', totalExpense],
      ['Saldo', totalIncome - totalExpense]
    ])
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo')

    // Mover Resumo para primeira aba
    const sheetOrder = ['Resumo', 'Hábitos', 'Sono', 'Academia', 'Finanças']
    wb.SheetNames = sheetOrder.filter(n => wb.SheetNames.includes(n))

    XLSX.writeFile(wb, result.filePath)
    return { success: true, path: result.filePath }
  })

  ipcMain.handle('app:reset-section', (_e, section: string) => {
    const map: Record<string, string[]> = {
      habits: ['DELETE FROM habit_completions', 'DELETE FROM habits'],
      gym: ['DELETE FROM exercises', 'DELETE FROM workouts', 'DELETE FROM bioimpedance'],
      addictions: ['DELETE FROM addiction_relapses', 'DELETE FROM addictions'],
      goals: ['DELETE FROM goal_tasks', 'DELETE FROM goals', 'DELETE FROM goal_folders'],
      journal: ['DELETE FROM journal_entries'],
      sleep: ['DELETE FROM sleep_logs'],
      finance: ['DELETE FROM finance_transactions', 'DELETE FROM finance_bills', 'DELETE FROM finance_categories', 'DELETE FROM finance_accounts'],
      media: ['DELETE FROM media_logs', 'DELETE FROM media_items'],
      calendar: ['DELETE FROM calendar_events', 'DELETE FROM calendar_notes'],
      gym_programs: ['DELETE FROM workout_program_exercises', 'DELETE FROM workout_program_days', 'DELETE FROM workout_programs'],
      xp: ['DELETE FROM xp_history', 'UPDATE user_profile SET total_xp = 0, level = 1 WHERE id = 1'],
      achievements: ['DELETE FROM achievements']
    }
    const queries = map[section]
    if (!queries) return false
    for (const q of queries) {
      dbRun(q)
    }
    save()
    return true
  })
}
