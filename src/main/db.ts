import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SQL: any = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any = null
let dbPath = ''

export async function initDb(): Promise<void> {
  if (SQL) return
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require('sql.js')
  SQL = await initSqlJs()
}

export async function setActiveUser(userId: string | null): Promise<void> {
  if (db) {
    save()
    db = null
    dbPath = ''
  }

  if (!userId) return

  const userData = app.getPath('userData')
  const userDbPath = join(userData, `habitos_${userId}.db`)
  const legacyDbPath = join(userData, 'habitos.db')

  if (existsSync(userDbPath)) {
    db = new SQL.Database(readFileSync(userDbPath))
  } else if (existsSync(legacyDbPath)) {
    copyFileSync(legacyDbPath, userDbPath)
    db = new SQL.Database(readFileSync(userDbPath))
  } else {
    db = new SQL.Database()
  }

  dbPath = userDbPath
  db.run('PRAGMA foreign_keys = ON')
  createTables()
}

function createTables(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      name TEXT DEFAULT 'Usuário',
      total_xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      frequency TEXT DEFAULT 'daily',
      target_time TEXT,
      xp_reward INTEGER DEFAULT 10,
      color TEXT DEFAULT '#7c3aed',
      icon TEXT DEFAULT '⭐',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      habit_id INTEGER,
      completed_at DATE NOT NULL,
      UNIQUE(habit_id, completed_at)
    );

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      name TEXT NOT NULL,
      notes TEXT,
      duration_min INTEGER
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER,
      name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight_kg REAL
    );

    CREATE TABLE IF NOT EXISTS bioimpedance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      weight_kg REAL,
      body_fat_pct REAL,
      muscle_mass_kg REAL,
      bmr_kcal REAL
    );

    CREATE TABLE IF NOT EXISTS addictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      started_free_at DATETIME NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addiction_relapses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      addiction_id INTEGER,
      relapsed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      target_date DATE,
      xp_reward INTEGER DEFAULT 100,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goal_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER,
      title TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS xp_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date DATE NOT NULL,
      type TEXT DEFAULT 'event',
      color TEXT DEFAULT '#7c3aed',
      is_done INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS calendar_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,
      content TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goal_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📁',
      color TEXT DEFAULT '#7c3aed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,
      content TEXT,
      mood INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sleep_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL UNIQUE,
      bedtime TEXT,
      wake_time TEXT,
      quality INTEGER DEFAULT 3,
      notes TEXT,
      cycles REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finance_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      icon TEXT DEFAULT '💰',
      color TEXT DEFAULT '#7c3aed'
    );

    CREATE TABLE IF NOT EXISTS finance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER,
      type TEXT NOT NULL DEFAULT 'expense',
      status TEXT NOT NULL DEFAULT 'paid',
      bill_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finance_bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      amount REAL NOT NULL,
      due_day INTEGER NOT NULL DEFAULT 5,
      due_month INTEGER DEFAULT NULL,
      category_id INTEGER DEFAULT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      recurrence TEXT NOT NULL DEFAULT 'monthly',
      is_active INTEGER DEFAULT 1,
      icon TEXT DEFAULT '📋',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS finance_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bank TEXT NOT NULL DEFAULT '',
      icon TEXT DEFAULT '🏦',
      color TEXT DEFAULT '#7c3aed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'book',
      author TEXT,
      total_pages INTEGER,
      current_page INTEGER DEFAULT 0,
      status TEXT DEFAULT 'reading',
      started_at DATE,
      finished_at DATE,
      cover_emoji TEXT DEFAULT '📚',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_id INTEGER,
      date DATE NOT NULL,
      minutes_read INTEGER DEFAULT 0,
      pages_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workout_program_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER,
      day_label TEXT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workout_program_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_day_id INTEGER,
      name TEXT NOT NULL,
      sets INTEGER,
      reps INTEGER,
      weight_kg REAL,
      is_superset INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS training_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'personalizado',
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      program_id INTEGER DEFAULT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS focus_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      duration_minutes INTEGER NOT NULL,
      label TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.run('INSERT OR IGNORE INTO user_profile (id) VALUES (1)')
  runMigrations()
  save()
}

function runMigrations(): void {
  const cols = dbAll('PRAGMA table_info(exercises)')
  if (!cols.find((c: Record<string, unknown>) => c.name === 'is_superset')) {
    db.run('ALTER TABLE exercises ADD COLUMN is_superset INTEGER DEFAULT 0')
  }
  const workoutCols = dbAll('PRAGMA table_info(workouts)')
  if (!workoutCols.find((c: Record<string, unknown>) => c.name === 'cardio_type')) {
    db.run('ALTER TABLE workouts ADD COLUMN cardio_type TEXT DEFAULT NULL')
  }
  if (!workoutCols.find((c: Record<string, unknown>) => c.name === 'cardio_minutes')) {
    db.run('ALTER TABLE workouts ADD COLUMN cardio_minutes INTEGER DEFAULT NULL')
  }
  const goalCols = dbAll('PRAGMA table_info(goals)')
  if (!goalCols.find((c: Record<string, unknown>) => c.name === 'folder_id')) {
    db.run('ALTER TABLE goals ADD COLUMN folder_id INTEGER DEFAULT NULL')
  }
  const addictionCols = dbAll('PRAGMA table_info(addictions)')
  if (!addictionCols.find((c: Record<string, unknown>) => c.name === 'is_hidden_name')) {
    db.run('ALTER TABLE addictions ADD COLUMN is_hidden_name INTEGER DEFAULT 0')
  }
  const habitCols = dbAll('PRAGMA table_info(habits)')
  if (!habitCols.find((c: Record<string, unknown>) => c.name === 'days_of_week')) {
    db.run('ALTER TABLE habits ADD COLUMN days_of_week TEXT DEFAULT NULL')
  }
  const mediaCols = dbAll('PRAGMA table_info(media_items)')
  if (!mediaCols.find((c: Record<string, unknown>) => c.name === 'rating')) {
    db.run('ALTER TABLE media_items ADD COLUMN rating INTEGER DEFAULT NULL')
  }
  if (!mediaCols.find((c: Record<string, unknown>) => c.name === 'current_season')) {
    db.run('ALTER TABLE media_items ADD COLUMN current_season INTEGER DEFAULT 1')
  }
  const txCols = dbAll('PRAGMA table_info(finance_transactions)')
  if (!txCols.find((c: Record<string, unknown>) => c.name === 'status')) {
    db.run("ALTER TABLE finance_transactions ADD COLUMN status TEXT NOT NULL DEFAULT 'paid'")
  }
  if (!txCols.find((c: Record<string, unknown>) => c.name === 'bill_id')) {
    db.run('ALTER TABLE finance_transactions ADD COLUMN bill_id INTEGER DEFAULT NULL')
  }
  if (!txCols.find((c: Record<string, unknown>) => c.name === 'account_id')) {
    db.run('ALTER TABLE finance_transactions ADD COLUMN account_id INTEGER DEFAULT NULL')
  }
  const sleepCols = dbAll('PRAGMA table_info(sleep_logs)')
  if (!sleepCols.find((c: Record<string, unknown>) => c.name === 'cycles')) {
    db.run('ALTER TABLE sleep_logs ADD COLUMN cycles REAL DEFAULT NULL')
  }
}

export function save(): void {
  if (!db) return
  try {
    const data = db.export()
    writeFileSync(dbPath, Buffer.from(data))
  } catch (e) {
    console.error('DB save error:', e)
  }
}

export function dbAll(sql: string, params: unknown[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const rows: Record<string, unknown>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

export function dbGet(sql: string, params: unknown[] = []): Record<string, unknown> | null {
  return dbAll(sql, params)[0] ?? null
}

export function dbRun(sql: string, params: unknown[] = []): { lastInsertRowid: number } {
  db.run(sql, params)
  const row = dbAll('SELECT last_insert_rowid() as id')
  return { lastInsertRowid: (row[0]?.id as number) ?? 0 }
}
