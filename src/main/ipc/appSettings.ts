import { ipcMain } from 'electron'
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
      achievements: dbAll('SELECT * FROM achievements')
    }
    return JSON.stringify(data, null, 2)
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
