import { supabase } from './supabase'

type Row = Record<string, unknown>
type IdMap = Record<number, number>

const CHUNK = 400

async function batchInsert(table: string, rows: Row[]): Promise<{ id: number }[]> {
  const all: { id: number }[] = []
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { data, error } = await supabase
      .from(table)
      .insert(rows.slice(i, i + CHUNK))
      .select('id')
    if (error) throw new Error(`${table}: ${error.message}`)
    if (data) all.push(...(data as { id: number }[]))
  }
  return all
}

async function bulk(
  table: string,
  sqliteRows: Row[],
  userId: string,
  fkMaps: Record<string, IdMap> = {},
  strip: string[] = []
): Promise<IdMap> {
  if (!sqliteRows.length) return {}

  const stripSet = new Set(strip)
  const oldIds: number[] = []
  const toInsert: Row[] = []

  for (const row of sqliteRows) {
    const { id: oldId, ...rest } = row
    const newRow: Row = { user_id: userId }
    let skip = false

    for (const [col, val] of Object.entries(rest)) {
      if (stripSet.has(col)) continue
      if (col in fkMaps) {
        if (val == null) {
          newRow[col] = null
        } else {
          const mapped = fkMaps[col][val as number]
          if (mapped == null) { skip = true; break }
          newRow[col] = mapped
        }
      } else {
        newRow[col] = val
      }
    }

    if (!skip) {
      oldIds.push(oldId as number)
      toInsert.push(newRow)
    }
  }

  const inserted = await batchInsert(table, toInsert)
  const idMap: IdMap = {}
  oldIds.forEach((oldId, i) => { if (inserted[i]) idMap[oldId] = inserted[i].id })
  return idMap
}

async function deleteUserData(userId: string): Promise<void> {
  const tables = [
    'workout_program_exercises', 'workout_program_days', 'workout_programs',
    'media_logs', 'media_items',
    'finance_transactions', 'finance_bills', 'finance_categories', 'finance_accounts',
    'journal_entries', 'sleep_logs',
    'goal_tasks', 'goals', 'goal_folders',
    'addiction_relapses', 'addictions',
    'exercises', 'workouts', 'bioimpedance',
    'habit_completions', 'habits',
    'calendar_events', 'calendar_notes',
    'xp_history', 'achievements',
  ]
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId)
    if (error) throw new Error(`delete ${table}: ${error.message}`)
  }
}

export interface SyncResult {
  success: boolean
  error?: string
  counts?: Record<string, number>
}

export async function syncDesktopToCloud(userId: string): Promise<SyncResult> {
  try {
    const json = await window.api!.app.exportData()
    const d = JSON.parse(json) as Record<string, Row[]>

    await deleteUserData(userId)

    // Columns that exist in SQLite but not in Supabase (added locally via ALTER TABLE or schema drift)
    const NO_CREATED_AT = ['created_at']

    const habits     = await bulk('habits',     d.habits     ?? [], userId)
    const workouts   = await bulk('workouts',   d.workouts   ?? [], userId)
    const addictions = await bulk('addictions', d.addictions ?? [], userId)
    const folders    = await bulk('goal_folders', d.goal_folders ?? [], userId, {}, NO_CREATED_AT)
    const goals      = await bulk('goals', d.goals ?? [], userId, { folder_id: folders })
    const cats       = await bulk('finance_categories', d.finance_categories ?? [], userId, {}, NO_CREATED_AT)
    const accs       = await bulk('finance_accounts',   d.finance_accounts   ?? [], userId, {}, NO_CREATED_AT)
    const bills      = await bulk('finance_bills', d.finance_bills ?? [], userId, { category_id: cats }, NO_CREATED_AT)
    const media      = await bulk('media_items',   d.media_items  ?? [], userId)
    const programs   = await bulk('workout_programs', d.workout_programs ?? [], userId)
    const pDays      = await bulk('workout_program_days', d.workout_program_days ?? [], userId, { program_id: programs })

    await bulk('habit_completions', d.habit_completions ?? [], userId, { habit_id: habits })
    await bulk('exercises',         d.exercises         ?? [], userId, { workout_id: workouts })
    await bulk('bioimpedance',      d.bioimpedance      ?? [], userId)
    await bulk('addiction_relapses', d.addiction_relapses ?? [], userId, { addiction_id: addictions })
    await bulk('goal_tasks',        d.goal_tasks        ?? [], userId, { goal_id: goals })
    await bulk('journal_entries',   d.journal_entries   ?? [], userId)
    await bulk('sleep_logs',        d.sleep_logs        ?? [], userId)
    await bulk('finance_transactions', d.finance_transactions ?? [], userId, {
      category_id: cats, bill_id: bills, account_id: accs,
    })
    await bulk('media_logs',        d.media_logs        ?? [], userId, { media_id: media }, NO_CREATED_AT)
    await bulk('workout_program_exercises', d.workout_program_exercises ?? [], userId, { program_day_id: pDays })
    await bulk('calendar_events',   d.calendar_events   ?? [], userId, {}, NO_CREATED_AT)
    await bulk('calendar_notes',    d.calendar_notes    ?? [], userId)
    await bulk('xp_history',        d.xp_history        ?? [], userId)
    await bulk('achievements',      d.achievements      ?? [], userId)

    // Sync profile
    const profile = await window.api!.profile.get() as { name?: string; total_xp?: number; level?: number } | null
    if (profile) {
      await supabase.from('user_profile').upsert(
        { user_id: userId, name: profile.name ?? 'Usuário', total_xp: profile.total_xp ?? 0, level: profile.level ?? 1 },
        { onConflict: 'user_id' }
      )
    }

    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(d)) {
      if (k !== 'exported_at' && Array.isArray(v)) counts[k] = v.length
    }

    return { success: true, counts }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}
