import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'

const LEVELS = [
  { level: 1, rank: 'Iniciante', xp: 0 },
  { level: 2, rank: 'Aprendiz', xp: 100 },
  { level: 3, rank: 'Guerreiro', xp: 300 },
  { level: 4, rank: 'Herói', xp: 700 },
  { level: 5, rank: 'Lendário', xp: 1500 },
  { level: 6, rank: 'Imortal', xp: 3000 },
  { level: 7, rank: 'Ascendente', xp: 6000 }
]

export function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  let next: typeof LEVELS[0] | null = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
      break
    }
  }
  return { current, next }
}

export function registerProfileHandlers(): void {
  ipcMain.handle('profile:get', () => {
    const profile = dbGet('SELECT * FROM user_profile WHERE id = 1')
    const history = dbAll('SELECT * FROM xp_history ORDER BY id DESC LIMIT 50')
    const levelInfo = getLevelInfo(profile?.total_xp as number ?? 0)
    return { ...profile, levelInfo, history }
  })

  ipcMain.handle('profile:update-name', (_e, name: string) => {
    dbRun('UPDATE user_profile SET name = ? WHERE id = 1', [name])
    save()
    return true
  })

  ipcMain.handle('profile:grant-xp', (_e, amount: number, reason: string) => {
    dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [amount])
    dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [amount, reason])
    const profile = dbGet('SELECT total_xp, level FROM user_profile WHERE id = 1')
    const total_xp = profile?.total_xp as number ?? 0
    const levelInfo = getLevelInfo(total_xp)
    const newLevel = levelInfo.current.level
    const storedLevel = profile?.level as number ?? 1
    if (newLevel > storedLevel) {
      dbRun('UPDATE user_profile SET level = ? WHERE id = 1', [newLevel])
      unlockAchievement('level_up_' + newLevel, `Nível ${newLevel}`, `Alcançou o rank ${levelInfo.current.rank}`, '⬆️')
    }
    save()
    return { total_xp, levelInfo }
  })

  ipcMain.handle('achievements:list', () => {
    return dbAll('SELECT * FROM achievements ORDER BY id DESC')
  })

  ipcMain.handle('achievements:check', () => {
    return checkAllAchievements()
  })
}

export function unlockAchievement(key: string, name: string, description: string, icon: string): boolean {
  const existing = dbGet('SELECT id FROM achievements WHERE key = ?', [key])
  if (existing) return false
  dbRun('INSERT INTO achievements (key, name, description, icon) VALUES (?, ?, ?, ?)', [key, name, description, icon])
  save()
  return true
}

export function checkAllAchievements(): string[] {
  const unlocked: string[] = []

  const habits = dbAll('SELECT id FROM habits WHERE is_active = 1')
  for (const habit of habits) {
    const streak = getHabitStreak(habit.id as number)
    if (streak >= 7 && unlockAchievement('streak_7', '7 Dias Seguidos', 'Completou um hábito por 7 dias consecutivos', '🔥')) {
      unlocked.push('streak_7')
      grantXpInternal(50, 'Streak de 7 dias')
    }
    if (streak >= 30 && unlockAchievement('streak_30', '30 Dias Seguidos', 'Completou um hábito por 30 dias consecutivos', '💎')) {
      unlocked.push('streak_30')
      grantXpInternal(200, 'Streak de 30 dias')
    }
  }

  const gymCount = (dbGet('SELECT COUNT(*) as c FROM workouts')?.c as number) ?? 0
  if (gymCount >= 10 && unlockAchievement('gym_10', '10 Treinos', 'Registrou 10 treinos', '🏋️')) {
    unlocked.push('gym_10')
    grantXpInternal(50, '10 treinos registrados')
  }
  if (gymCount >= 50 && unlockAchievement('gym_50', '50 Treinos', 'Registrou 50 treinos', '💪')) {
    unlocked.push('gym_50')
    grantXpInternal(200, '50 treinos registrados')
  }

  const addictions = dbAll('SELECT * FROM addictions WHERE is_active = 1')
  for (const a of addictions) {
    const diffMs = Date.now() - new Date(a.started_free_at as string).getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const id = a.id as number
    if (days >= 7 && unlockAchievement(`sober_7d_${id}`, '7 Dias Livre', `7 dias livre de ${a.name}`, '🌱')) {
      unlocked.push('sober_7d')
      grantXpInternal(50, '7 dias livre de vício')
    }
    if (days >= 30 && unlockAchievement(`sober_30d_${id}`, '30 Dias Livre', `30 dias livre de ${a.name}`, '🌿')) {
      unlocked.push('sober_30d')
      grantXpInternal(150, '30 dias livre de vício')
    }
    if (days >= 90 && unlockAchievement(`sober_90d_${id}`, '90 Dias Livre', `90 dias livre de ${a.name}`, '🏆')) {
      unlocked.push('sober_90d')
      grantXpInternal(500, '90 dias livre de vício')
    }
  }

  return unlocked
}

function grantXpInternal(amount: number, reason: string): void {
  dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [amount])
  dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [amount, reason])
  save()
}

function getHabitStreak(habitId: number): number {
  const completions = dbAll(
    'SELECT completed_at FROM habit_completions WHERE habit_id = ? ORDER BY completed_at DESC',
    [habitId]
  )
  if (completions.length === 0) return 0
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const c of completions) {
    const date = new Date(c.completed_at as string)
    date.setHours(0, 0, 0, 0)
    const diff = Math.round((current.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === streak) {
      streak++
      current = date
    } else {
      break
    }
  }
  return streak
}
