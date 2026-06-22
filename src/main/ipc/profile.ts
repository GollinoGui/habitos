import { ipcMain } from 'electron'
import { dbAll, dbGet, dbRun, save } from '../db'

const LEVELS = [
  { level: 1, rank: 'Iniciante', xp: 0 },
  { level: 2, rank: 'Aprendiz', xp: 100 },
  { level: 3, rank: 'Persistente', xp: 300 },
  { level: 4, rank: 'Consistente', xp: 700 },
  { level: 5, rank: 'Exemplar', xp: 1500 },
  { level: 6, rank: 'Imparável', xp: 3000 },
  { level: 7, rank: 'Lenda', xp: 6000 }
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

  // Hábitos
  const habitCount = (dbGet('SELECT COUNT(*) as c FROM habits WHERE is_active = 1')?.c as number) ?? 0
  if (habitCount >= 1 && unlockAchievement('first_habit', 'Primeiro Hábito', 'Criou seu primeiro hábito', '🌟')) {
    unlocked.push('first_habit')
    grantXpInternal(25, 'Primeiro hábito criado')
  }

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
    if (streak >= 100 && unlockAchievement('streak_100', '100 Dias Seguidos', 'Completou um hábito por 100 dias consecutivos', '🚀')) {
      unlocked.push('streak_100')
      grantXpInternal(500, 'Streak de 100 dias')
    }
  }

  // Academia
  const gymCount = (dbGet('SELECT COUNT(*) as c FROM workouts')?.c as number) ?? 0
  if (gymCount >= 10 && unlockAchievement('gym_10', '10 Treinos', 'Registrou 10 treinos', '🏋️')) {
    unlocked.push('gym_10')
    grantXpInternal(50, '10 treinos registrados')
  }
  if (gymCount >= 50 && unlockAchievement('gym_50', '50 Treinos', 'Registrou 50 treinos', '💪')) {
    unlocked.push('gym_50')
    grantXpInternal(200, '50 treinos registrados')
  }
  if (gymCount >= 100 && unlockAchievement('gym_100', '100 Treinos', 'Registrou 100 treinos', '🥇')) {
    unlocked.push('gym_100')
    grantXpInternal(500, '100 treinos registrados')
  }

  const bioCount = (dbGet('SELECT COUNT(*) as c FROM bioimpedance')?.c as number) ?? 0
  if (bioCount >= 1 && unlockAchievement('first_bio', 'Primeira Medição', 'Registrou sua primeira bioimpedância', '⚖️')) {
    unlocked.push('first_bio')
    grantXpInternal(30, 'Primeira bioimpedância')
  }

  // Sobriedade
  const addictions = dbAll('SELECT * FROM addictions WHERE is_active = 1')
  for (const a of addictions) {
    const diffMs = Date.now() - new Date(a.started_free_at as string).getTime()
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (days >= 7 && unlockAchievement('sober_7d', '7 Dias Livre', '7 dias livre de um vício', '🌱')) {
      unlocked.push('sober_7d')
      grantXpInternal(50, '7 dias livre de vício')
    }
    if (days >= 30 && unlockAchievement('sober_30d', '30 Dias Livre', '30 dias livre de um vício', '🌿')) {
      unlocked.push('sober_30d')
      grantXpInternal(150, '30 dias livre de vício')
    }
    if (days >= 90 && unlockAchievement('sober_90d', '90 Dias Livre', '90 dias livre de um vício', '🏆')) {
      unlocked.push('sober_90d')
      grantXpInternal(500, '90 dias livre de vício')
    }
    if (days >= 365 && unlockAchievement('sober_365d', '1 Ano Livre', '365 dias livre de um vício', '👑')) {
      unlocked.push('sober_365d')
      grantXpInternal(1000, '1 ano livre de vício')
    }
  }

  // Metas
  const completedGoals = (dbGet('SELECT COUNT(*) as c FROM goals WHERE is_completed = 1')?.c as number) ?? 0
  if (completedGoals >= 1 && unlockAchievement('goal_first', 'Primeira Meta!', 'Completou sua primeira meta', '🎯')) {
    unlocked.push('goal_first')
    grantXpInternal(50, 'Primeira meta concluída')
  }
  if (completedGoals >= 5 && unlockAchievement('goal_5', '5 Metas Concluídas', 'Completou 5 metas', '🎊')) {
    unlocked.push('goal_5')
    grantXpInternal(150, '5 metas concluídas')
  }

  // Diário
  const journalDates = dbAll('SELECT date FROM journal_entries ORDER BY date DESC').map(r => r.date as string)
  const journalStreak = getDateStreak(journalDates)
  if (journalStreak >= 7 && unlockAchievement('journal_7', 'Diário da Semana', 'Escreveu no diário por 7 dias', '📔')) {
    unlocked.push('journal_7')
    grantXpInternal(50, '7 dias de diário')
  }
  if (journalStreak >= 30 && unlockAchievement('journal_30', 'Diário do Mês', 'Escreveu no diário por 30 dias', '📗')) {
    unlocked.push('journal_30')
    grantXpInternal(200, '30 dias de diário')
  }

  // Sono
  const sleepDates = dbAll('SELECT date FROM sleep_logs ORDER BY date DESC').map(r => r.date as string)
  const sleepStreak = getDateStreak(sleepDates)
  if (sleepStreak >= 7 && unlockAchievement('sleep_7', 'Sono Registrado', 'Registrou o sono por 7 dias seguidos', '🌙')) {
    unlocked.push('sleep_7')
    grantXpInternal(50, '7 dias de sono registrado')
  }
  const perfectSleep = dbGet('SELECT id FROM sleep_logs WHERE quality = 5 LIMIT 1')
  if (perfectSleep && unlockAchievement('sleep_quality', 'Sono de Qualidade', 'Registrou 5/5 de qualidade no sono', '⭐')) {
    unlocked.push('sleep_quality')
    grantXpInternal(30, 'Sono com qualidade máxima')
  }

  // Leitura
  const completedMedia = (dbGet("SELECT COUNT(*) as c FROM media_items WHERE status = 'done'")?.c as number) ?? 0
  if (completedMedia >= 1 && unlockAchievement('reading_first', 'Primeiro Livro', 'Concluiu sua primeira leitura', '📚')) {
    unlocked.push('reading_first')
    grantXpInternal(50, 'Primeira leitura concluída')
  }
  if (completedMedia >= 5 && unlockAchievement('reading_5', 'Leitor Dedicado', 'Concluiu 5 livros', '🔖')) {
    unlocked.push('reading_5')
    grantXpInternal(150, '5 leituras concluídas')
  }

  // Foco
  const focusCount = (dbGet('SELECT COUNT(*) as c FROM focus_sessions')?.c as number) ?? 0
  if (focusCount >= 1 && unlockAchievement('focus_first', 'Primeira Sessão de Foco', 'Completou sua primeira sessão de foco', '🎯')) {
    unlocked.push('focus_first')
    grantXpInternal(25, 'Primeira sessão de foco')
  }
  if (focusCount >= 10 && unlockAchievement('focus_10', '10 Sessões de Foco', 'Completou 10 sessões de foco', '🧠')) {
    unlocked.push('focus_10')
    grantXpInternal(100, '10 sessões de foco')
  }
  if (focusCount >= 50 && unlockAchievement('focus_50', 'Mestre do Foco', 'Completou 50 sessões de foco', '🧘')) {
    unlocked.push('focus_50')
    grantXpInternal(300, '50 sessões de foco')
  }
  const focusDates = dbAll('SELECT DISTINCT date FROM focus_sessions ORDER BY date DESC').map(r => r.date as string)
  const focusStreak = getDateStreak(focusDates)
  if (focusStreak >= 7 && unlockAchievement('focus_streak_7', 'Semana Focada', 'Fez pelo menos uma sessão de foco por 7 dias seguidos', '🔥')) {
    unlocked.push('focus_streak_7')
    grantXpInternal(75, '7 dias seguidos de foco')
  }

  // Finanças
  const financeCount = (dbGet('SELECT COUNT(*) as c FROM finance_transactions')?.c as number) ?? 0
  if (financeCount >= 1 && unlockAchievement('finance_first', 'Financeiro', 'Registrou sua primeira transação', '💰')) {
    unlocked.push('finance_first')
    grantXpInternal(25, 'Primeira transação registrada')
  }
  const positiveMonth = dbGet(`
    SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) as balance
    FROM finance_transactions
    GROUP BY strftime('%Y-%m', date)
    HAVING balance > 0
    LIMIT 1
  `)
  if (positiveMonth && unlockAchievement('finance_positive', 'Saldo Positivo', 'Terminou um mês com saldo positivo', '📈')) {
    unlocked.push('finance_positive')
    grantXpInternal(75, 'Mês com saldo positivo')
  }

  return unlocked
}

function getDateStreak(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const dateStr of sortedDatesDesc) {
    const date = new Date(dateStr)
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

function grantXpInternal(amount: number, reason: string): void {
  dbRun('UPDATE user_profile SET total_xp = total_xp + ? WHERE id = 1', [amount])
  dbRun('INSERT INTO xp_history (amount, reason) VALUES (?, ?)', [amount, reason])
  const profile = dbGet('SELECT total_xp, level FROM user_profile WHERE id = 1')
  const total_xp = profile?.total_xp as number ?? 0
  const storedLevel = profile?.level as number ?? 1
  const levelInfo = getLevelInfo(total_xp)
  const newLevel = levelInfo.current.level
  if (newLevel > storedLevel) {
    dbRun('UPDATE user_profile SET level = ? WHERE id = 1', [newLevel])
    unlockAchievement('level_up_' + newLevel, `Nível ${newLevel}: ${levelInfo.current.rank}`, `Alcançou o rank ${levelInfo.current.rank}`, '⬆️')
  }
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
