import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'
import { unlockAchievement, checkAllAchievements } from './profile'

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
    exercises: { name: string; sets?: number; reps?: number; weight_kg?: number }[]
  }) => {
    const result = dbRun(
      'INSERT INTO workouts (date, name, notes, duration_min) VALUES (?, ?, ?, ?)',
      [data.date, data.name, data.notes || null, data.duration_min || null]
    )
    const workoutId = result.lastInsertRowid
    for (const ex of data.exercises || []) {
      dbRun(
        'INSERT INTO exercises (workout_id, name, sets, reps, weight_kg) VALUES (?, ?, ?, ?, ?)',
        [workoutId, ex.name, ex.sets || null, ex.reps || null, ex.weight_kg || null]
      )
    }
    dbRun('UPDATE user_profile SET total_xp = total_xp + 15 WHERE id = 1')
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [15, `Treino: ${data.name}`])
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
}

