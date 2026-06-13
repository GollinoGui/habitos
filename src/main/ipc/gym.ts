import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { unlockAchievement, checkAllAchievements } from './profile'

function calcWorkoutXP(durationMin: number | null, exercises: { is_superset?: number }[]): number {
  let xp = 15
  if (durationMin) xp += Math.floor(durationMin / 20) * 5
  xp += exercises.length * 5
  xp += exercises.filter(e => e.is_superset).length * 10
  return Math.min(xp, 150)
}

export function registerGymHandlers(): void {
  ipcMain.handle('gym:list-workouts', (_e, limit = 50) => {
    const workouts = dbAll('SELECT * FROM workouts ORDER BY date DESC LIMIT ?', [limit])
    for (const w of workouts) {
      w.exercises = dbAll('SELECT * FROM exercises WHERE workout_id = ? ORDER BY id ASC', [w.id as number])
    }
    return workouts
  })

  ipcMain.handle('gym:create-workout', (_e, data: {
    date: string; name: string; notes?: string; duration_min?: number;
    exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }[]
  }) => {
    const result = dbRun(
      'INSERT INTO workouts (date, name, notes, duration_min) VALUES (?, ?, ?, ?)',
      [data.date, data.name, data.notes || null, data.duration_min || null]
    )
    const workoutId = result.lastInsertRowid
    for (const ex of data.exercises || []) {
      dbRun(
        'INSERT INTO exercises (workout_id, name, sets, reps, weight_kg, is_superset) VALUES (?, ?, ?, ?, ?, ?)',
        [workoutId, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null, ex.is_superset ?? 0]
      )
    }
    const xp = calcWorkoutXP(data.duration_min || null, data.exercises || [])
    dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [xp])
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [xp, `Treino: ${data.name}`])
    checkAllAchievements()
    save()
    return workoutId
  })

  ipcMain.handle('gym:delete-workout', (_e, id: number) => {
    dbRun('DELETE FROM exercises WHERE workout_id = ?', [id])
    dbRun('DELETE FROM workouts WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('gym:list-bioimpedance', () => {
    return dbAll('SELECT * FROM bioimpedance ORDER BY date DESC')
  })

  ipcMain.handle('gym:add-bioimpedance', (_e, data: {
    date: string; weight_kg?: number; body_fat_pct?: number; muscle_mass_kg?: number; bmr_kcal?: number
  }) => {
    const result = dbRun(
      'INSERT INTO bioimpedance (date, weight_kg, body_fat_pct, muscle_mass_kg, bmr_kcal) VALUES (?, ?, ?, ?, ?)',
      [data.date, data.weight_kg || null, data.body_fat_pct || null, data.muscle_mass_kg || null, data.bmr_kcal || null]
    )
    unlockAchievement('first_bio', 'Primeira Medição', 'Registrou sua primeira bioimpedância', '⚖️')
    save()
    return result.lastInsertRowid
  })

  ipcMain.handle('gym:delete-bioimpedance', (_e, id: number) => {
    dbRun('DELETE FROM bioimpedance WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('gym:programs:list', () => {
    const programs = dbAll('SELECT * FROM workout_programs ORDER BY created_at DESC')
    for (const p of programs) {
      const days = dbAll('SELECT * FROM workout_program_days WHERE program_id = ? ORDER BY id ASC', [p.id as number])
      for (const d of days) {
        d.exercises = dbAll('SELECT * FROM workout_program_exercises WHERE program_day_id = ? ORDER BY id ASC', [d.id as number])
      }
      p.days = days
    }
    return programs
  })

  ipcMain.handle('gym:programs:create', (_e, data: {
    name: string; description?: string;
    days: { name: string; day_label?: string; exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }[] }[]
  }) => {
    const result = dbRun('INSERT INTO workout_programs (name, description) VALUES (?, ?)', [data.name, data.description || null])
    const programId = result.lastInsertRowid
    for (const day of data.days || []) {
      const dayResult = dbRun(
        'INSERT INTO workout_program_days (program_id, day_label, name) VALUES (?, ?, ?)',
        [programId, day.day_label || null, day.name]
      )
      for (const ex of day.exercises || []) {
        dbRun(
          'INSERT INTO workout_program_exercises (program_day_id, name, sets, reps, weight_kg, is_superset) VALUES (?, ?, ?, ?, ?, ?)',
          [dayResult.lastInsertRowid, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null, ex.is_superset ?? 0]
        )
      }
    }
    save()
    return programId
  })

  ipcMain.handle('gym:programs:delete', (_e, id: number) => {
    const days = dbAll('SELECT id FROM workout_program_days WHERE program_id = ?', [id])
    for (const d of days) {
      dbRun('DELETE FROM workout_program_exercises WHERE program_day_id = ?', [d.id as number])
    }
    dbRun('DELETE FROM workout_program_days WHERE program_id = ?', [id])
    dbRun('DELETE FROM workout_programs WHERE id = ?', [id])
    save()
    return true
  })

  ipcMain.handle('gym:exercise-history', (_e, exerciseName: string) => {
    const rows = dbAll(
      `SELECT w.date, e.name, e.sets, e.reps, e.weight_kg
       FROM exercises e
       JOIN workouts w ON w.id = e.workout_id
       WHERE LOWER(e.name) = LOWER(?)
       ORDER BY w.date ASC`,
      [exerciseName]
    )
    return rows
  })

  ipcMain.handle('gym:exercise-names', () => {
    const rows = dbAll('SELECT DISTINCT name FROM exercises ORDER BY name ASC')
    return rows.map(r => r.name as string)
  })

  ipcMain.handle('gym:programs:update', (_e, id: number, data: {
    name: string; description?: string;
    days: { name: string; day_label?: string; exercises: { name: string; sets?: number; reps?: number; weight_kg?: number }[] }[]
  }) => {
    dbRun('UPDATE workout_programs SET name = ?, description = ? WHERE id = ?', [data.name, data.description || null, id])
    const existingDays = dbAll('SELECT id FROM workout_program_days WHERE program_id = ?', [id])
    for (const d of existingDays) {
      dbRun('DELETE FROM workout_program_exercises WHERE program_day_id = ?', [d.id as number])
    }
    dbRun('DELETE FROM workout_program_days WHERE program_id = ?', [id])
    for (const day of data.days || []) {
      const dayResult = dbRun(
        'INSERT INTO workout_program_days (program_id, day_label, name) VALUES (?, ?, ?)',
        [id, day.day_label || null, day.name]
      )
      for (const ex of day.exercises || []) {
        dbRun(
          'INSERT INTO workout_program_exercises (program_day_id, name, sets, reps, weight_kg, is_superset) VALUES (?, ?, ?, ?, ?, ?)',
          [dayResult.lastInsertRowid, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null, 0]
        )
      }
    }
    save()
    return true
  })
}

