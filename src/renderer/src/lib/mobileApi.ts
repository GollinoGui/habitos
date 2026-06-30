// Mobile API polyfill: implements the same window.api interface as the Electron
// preload, but backed by Supabase. Installed on Android/Capacitor after login.
import { supabase } from './supabase'
import { loadMobileNotifSettings, saveMobileNotifSettings, testMobileNotification, ensureMobileNotificationsScheduled } from './mobileNotifications'

// ── Level system (mirrored from src/main/ipc/profile.ts) ─────────────────────

const LEVELS = [
  { level: 1, rank: 'Iniciante', xp: 0 },
  { level: 2, rank: 'Aprendiz', xp: 100 },
  { level: 3, rank: 'Persistente', xp: 300 },
  { level: 4, rank: 'Consistente', xp: 700 },
  { level: 5, rank: 'Exemplar', xp: 1500 },
  { level: 6, rank: 'Imparável', xp: 3000 },
  { level: 7, rank: 'Lenda', xp: 6000 },
]

function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  let next: (typeof LEVELS)[0] | null = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
      break
    }
  }
  return { current, next }
}

function computeStreak(completions: { completed_at: string }[]): number {
  if (completions.length === 0) return 0
  let streak = 0
  let current = new Date()
  current.setHours(0, 0, 0, 0)
  for (const c of completions) {
    // Parse as local date to avoid UTC-offset shifting the date by one day in UTC-N timezones
    const [y, m, d] = c.completed_at.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const diff = Math.round((current.getTime() - date.getTime()) / 86400000)
    if (diff === streak) { streak++; current = date } else break
  }
  return streak
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ── Install ───────────────────────────────────────────────────────────────────

let _userId = ''
let _electronApi: Window['electronApi'] | undefined  // Electron IPC API for desktop-only features
let _userMeta: { full_name?: string; name?: string; email?: string } = {}

function getDisplayName(): string {
  const meta = _userMeta
  const name = meta.full_name || meta.name
  if (name && name !== 'Usuário') return name
  if (meta.email) {
    const local = meta.email.split('@')[0]
    return local.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  }
  return 'Usuário'
}

export function installMobileApi(
  userId: string,
  userMeta?: { full_name?: string; name?: string; email?: string }
): void {
  _userId = userId
  if (userMeta) _userMeta = userMeta
  // On desktop, save the Electron IPC API for desktop-only features (notifications, file export,
  // OFX import, exportData for migration) used inside buildApi() via _electronApi fallbacks.
  if (window.electronApi) {
    _electronApi = window.electronApi
  }
  // Always install Supabase as window.api (desktop and mobile share the same data source).
  // Desktop-only IPC calls are forwarded through _electronApi fallbacks inside buildApi().
  ;(window as unknown as Record<string, unknown>).api = buildApi()

  // Restore today's challenge states from cloud into localStorage (handles fresh installs).
  void hydrateChallengesFromCloud(userId)

  // Background: sync recent local habit completions to Supabase so the 7-day chart is accurate
  // after switching computers. Runs silently; errors are ignored.
  if (_electronApi) {
    void syncLocalHabitCompletions(userId)
  } else {
    // Real Android device: re-apply the saved daily reminder schedule in case the
    // OS dropped pending alarms (e.g. after an app update). No-ops on web/desktop.
    void ensureMobileNotificationsScheduled()
  }
}

async function hydrateChallengesFromCloud(userId: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  try {
    const { data } = await supabase.from('daily_challenges')
      .select('challenge_key, state').eq('user_id', userId).eq('date', today)
    if (!data?.length) return
    for (const row of data) {
      const lsKey = `habitos_${row.challenge_key}_${today}`
      if (!localStorage.getItem(lsKey)) {
        localStorage.setItem(lsKey, JSON.stringify(row.state))
      }
    }
  } catch { /* ignore */ }
}

async function syncLocalHabitCompletions(userId: string): Promise<void> {
  try {
    if (!_electronApi?.habits) return
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const localHabits = (await _electronApi.habits.list()) as { id: number; name: string }[]
    const localComps = (await _electronApi.habits.completionsRange(fmt(thirtyDaysAgo), fmt(now))) as { habit_id: number; completed_at: string }[]
    if (!localComps.length) return

    const { data: cloudHabits } = await supabase.from('habits').select('id, name').eq('user_id', userId)
    if (!cloudHabits?.length) return

    const localNameById = new Map(localHabits.map(h => [h.id, h.name]))
    const cloudIdByName = new Map(cloudHabits.map(h => [h.name as string, h.id as number]))

    const toInsert = localComps
      .map(c => {
        const name = localNameById.get(c.habit_id)
        if (!name) return null
        const cloudId = cloudIdByName.get(name)
        if (!cloudId) return null
        return { user_id: userId, habit_id: cloudId, completed_at: c.completed_at }
      })
      .filter((r): r is { user_id: string; habit_id: number; completed_at: string } => r !== null)

    if (!toInsert.length) return
    await supabase.from('habit_completions').upsert(toInsert, {
      onConflict: 'user_id,habit_id,completed_at',
      ignoreDuplicates: true,
    })
  } catch {
    // Silently ignore
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const uid = () => _userId

async function grantXpInternal(amount: number, reason: string): Promise<void> {
  await supabase.from('xp_history').insert({ user_id: uid(), amount, reason })
  const { data: profile } = await supabase
    .from('user_profile').select('total_xp, level').eq('user_id', uid()).single()
  const newXp = (profile?.total_xp ?? 0) + amount
  const storedLevel = profile?.level ?? 1
  const levelInfo = getLevelInfo(newXp)
  const newLevel = levelInfo.current.level
  await supabase.from('user_profile')
    .upsert({ user_id: uid(), total_xp: newXp, level: newLevel }, { onConflict: 'user_id' })
  if (newLevel > storedLevel) {
    await unlockAchievement('level_up_' + newLevel, `Nível ${newLevel}: ${levelInfo.current.rank}`, `Alcançou o rank ${levelInfo.current.rank}`, '⬆️')
  }
}

async function unlockAchievement(key: string, name: string, description: string, icon: string): Promise<boolean> {
  const { error } = await supabase.from('achievements')
    .insert({ user_id: uid(), key, name, description, icon })
  return !error
}

async function unlockWithXp(key: string, name: string, description: string, icon: string, xp: number, xpReason: string): Promise<string | null> {
  if (await unlockAchievement(key, name, description, icon)) {
    await grantXpInternal(xp, xpReason)
    return key
  }
  return null
}

async function checkAllAchievementsMobile(): Promise<string[]> {
  const unlocked: string[] = []
  const push = (key: string | null) => { if (key) unlocked.push(key) }

  // Hábitos
  const { data: habits } = await supabase.from('habits')
    .select('id').eq('user_id', uid()).eq('is_active', 1)
  if ((habits?.length ?? 0) >= 1) {
    push(await unlockWithXp('first_habit', 'Primeiro Hábito', 'Criou seu primeiro hábito', '🌟', 25, 'Primeiro hábito criado'))
  }
  for (const h of habits ?? []) {
    const { data: completions } = await supabase.from('habit_completions')
      .select('completed_at').eq('habit_id', h.id as number).eq('user_id', uid())
      .order('completed_at', { ascending: false })
    const streak = computeStreak((completions ?? []) as { completed_at: string }[])
    if (streak >= 7) push(await unlockWithXp('streak_7', '7 Dias Seguidos', 'Completou um hábito por 7 dias consecutivos', '🔥', 50, 'Streak de 7 dias'))
    if (streak >= 30) push(await unlockWithXp('streak_30', '30 Dias Seguidos', 'Completou um hábito por 30 dias consecutivos', '💎', 200, 'Streak de 30 dias'))
    if (streak >= 100) push(await unlockWithXp('streak_100', '100 Dias Seguidos', 'Completou um hábito por 100 dias consecutivos', '🚀', 500, 'Streak de 100 dias'))
  }

  // Academia
  const { count: gymCount } = await supabase.from('workouts')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid())
  if ((gymCount ?? 0) >= 10) push(await unlockWithXp('gym_10', '10 Treinos', 'Registrou 10 treinos', '🏋️', 50, '10 treinos registrados'))
  if ((gymCount ?? 0) >= 50) push(await unlockWithXp('gym_50', '50 Treinos', 'Registrou 50 treinos', '💪', 200, '50 treinos registrados'))
  if ((gymCount ?? 0) >= 100) push(await unlockWithXp('gym_100', '100 Treinos', 'Registrou 100 treinos', '🥇', 500, '100 treinos registrados'))

  const { count: bioCount } = await supabase.from('bioimpedance')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid())
  if ((bioCount ?? 0) >= 1) push(await unlockWithXp('first_bio', 'Primeira Medição', 'Registrou sua primeira bioimpedância', '⚖️', 30, 'Primeira bioimpedância'))

  // Sobriedade
  const { data: addictionRows } = await supabase.from('addictions')
    .select('started_free_at').eq('user_id', uid()).eq('is_active', 1)
  for (const a of addictionRows ?? []) {
    const days = Math.floor((Date.now() - new Date(a.started_free_at as string).getTime()) / 86400000)
    if (days >= 7) push(await unlockWithXp('sober_7d', '7 Dias Livre', '7 dias livre de um vício', '🌱', 50, '7 dias livre de vício'))
    if (days >= 30) push(await unlockWithXp('sober_30d', '30 Dias Livre', '30 dias livre de um vício', '🌿', 150, '30 dias livre de vício'))
    if (days >= 90) push(await unlockWithXp('sober_90d', '90 Dias Livre', '90 dias livre de um vício', '🏆', 500, '90 dias livre de vício'))
    if (days >= 365) push(await unlockWithXp('sober_365d', '1 Ano Livre', '365 dias livre de um vício', '👑', 1000, '1 ano livre de vício'))
  }

  // Metas
  const { count: completedGoals } = await supabase.from('goals')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid()).eq('is_completed', 1)
  if ((completedGoals ?? 0) >= 1) push(await unlockWithXp('goal_first', 'Primeira Meta!', 'Completou sua primeira meta', '🎯', 50, 'Primeira meta concluída'))
  if ((completedGoals ?? 0) >= 5) push(await unlockWithXp('goal_5', '5 Metas Concluídas', 'Completou 5 metas', '🎊', 150, '5 metas concluídas'))

  // Diário
  const { data: journalRows } = await supabase.from('journal_entries')
    .select('date').eq('user_id', uid()).order('date', { ascending: false })
  const journalStreak = computeStreak((journalRows ?? []).map(r => ({ completed_at: r.date as string })))
  if (journalStreak >= 7) push(await unlockWithXp('journal_7', 'Diário da Semana', 'Escreveu no diário por 7 dias', '📔', 50, '7 dias de diário'))
  if (journalStreak >= 30) push(await unlockWithXp('journal_30', 'Diário do Mês', 'Escreveu no diário por 30 dias', '📗', 200, '30 dias de diário'))

  // Sono
  const { data: sleepRows } = await supabase.from('sleep_logs')
    .select('date').eq('user_id', uid()).order('date', { ascending: false })
  const sleepStreak = computeStreak((sleepRows ?? []).map(r => ({ completed_at: r.date as string })))
  if (sleepStreak >= 7) push(await unlockWithXp('sleep_7', 'Sono Registrado', 'Registrou o sono por 7 dias seguidos', '🌙', 50, '7 dias de sono registrado'))
  const { data: perfectSleep } = await supabase.from('sleep_logs')
    .select('id').eq('user_id', uid()).eq('quality', 5).limit(1).maybeSingle()
  if (perfectSleep) push(await unlockWithXp('sleep_quality', 'Sono de Qualidade', 'Registrou 5/5 de qualidade no sono', '⭐', 30, 'Sono com qualidade máxima'))

  // Leitura
  const { count: completedMedia } = await supabase.from('media_items')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid()).eq('status', 'done')
  if ((completedMedia ?? 0) >= 1) push(await unlockWithXp('reading_first', 'Primeiro Livro', 'Concluiu sua primeira leitura', '📚', 50, 'Primeira leitura concluída'))
  if ((completedMedia ?? 0) >= 5) push(await unlockWithXp('reading_5', 'Leitor Dedicado', 'Concluiu 5 livros', '🔖', 150, '5 leituras concluídas'))

  // Foco
  const { count: focusCount } = await supabase.from('focus_sessions')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid())
  if ((focusCount ?? 0) >= 1) push(await unlockWithXp('focus_first', 'Primeira Sessão de Foco', 'Completou sua primeira sessão de foco', '🎯', 25, 'Primeira sessão de foco'))
  if ((focusCount ?? 0) >= 10) push(await unlockWithXp('focus_10', '10 Sessões de Foco', 'Completou 10 sessões de foco', '🧠', 100, '10 sessões de foco'))
  if ((focusCount ?? 0) >= 50) push(await unlockWithXp('focus_50', 'Mestre do Foco', 'Completou 50 sessões de foco', '🧘', 300, '50 sessões de foco'))
  const { data: focusRows } = await supabase.from('focus_sessions')
    .select('date').eq('user_id', uid()).order('date', { ascending: false })
  const focusDatesUnique = Array.from(new Set((focusRows ?? []).map(r => r.date as string)))
  const focusStreak = computeStreak(focusDatesUnique.map(d => ({ completed_at: d })))
  if (focusStreak >= 7) push(await unlockWithXp('focus_streak_7', 'Semana Focada', 'Fez pelo menos uma sessão de foco por 7 dias seguidos', '🔥', 75, '7 dias seguidos de foco'))

  // Finanças
  const { count: financeCount } = await supabase.from('finance_transactions')
    .select('id', { count: 'exact', head: true }).eq('user_id', uid())
  if ((financeCount ?? 0) >= 1) push(await unlockWithXp('finance_first', 'Financeiro', 'Registrou sua primeira transação', '💰', 25, 'Primeira transação registrada'))
  const { data: financeRows } = await supabase.from('finance_transactions')
    .select('type, amount, date').eq('user_id', uid())
  const byMonth: Record<string, number> = {}
  for (const t of financeRows ?? []) {
    const ym = String(t.date).slice(0, 7)
    const delta = t.type === 'income' ? ((t.amount as number) ?? 0) : -((t.amount as number) ?? 0)
    byMonth[ym] = (byMonth[ym] ?? 0) + delta
  }
  if (Object.values(byMonth).some(v => v > 0)) {
    push(await unlockWithXp('finance_positive', 'Saldo Positivo', 'Terminou um mês com saldo positivo', '📈', 75, 'Mês com saldo positivo'))
  }

  return unlocked
}

// ── API builder ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildApi(): any {
  return {
    // ── Profile ────────────────────────────────────────────────────────────
    profile: {
      get: async () => {
        const [profileRes, historyRes] = await Promise.all([
          supabase.from('user_profile').select('*').eq('user_id', uid()).single(),
          supabase.from('xp_history').select('*').eq('user_id', uid())
            .order('id', { ascending: false }).limit(50),
        ])
        let profile = profileRes.data
        // Auto-fix name when it's the placeholder default or profile doesn't exist yet
        if (!profile || profile.name === 'Usuário') {
          const displayName = getDisplayName()
          await supabase.from('user_profile')
            .upsert({ user_id: uid(), name: displayName, total_xp: profile?.total_xp ?? 0, level: profile?.level ?? 1 }, { onConflict: 'user_id' })
          profile = { ...(profile ?? { total_xp: 0, level: 1 }), user_id: uid(), name: displayName }
        }
        const history = historyRes.data ?? []
        const levelInfo = getLevelInfo(profile.total_xp ?? 0)
        return { ...profile, id: 1, levelInfo, history }
      },

      updateName: async (name: string) => {
        await supabase.from('user_profile').upsert({ user_id: uid(), name }, { onConflict: 'user_id' })
        return true
      },

      grantXP: async (amount: number, reason: string) => {
        await grantXpInternal(amount, reason)
        const { data } = await supabase.from('user_profile').select('total_xp').eq('user_id', uid()).single()
        const total_xp = data?.total_xp ?? 0
        return { total_xp, levelInfo: getLevelInfo(total_xp) }
      },
    },

    // ── Achievements ───────────────────────────────────────────────────────
    achievements: {
      list: async () => {
        const { data } = await supabase.from('achievements').select('*')
          .eq('user_id', uid()).order('id', { ascending: false })
        return data ?? []
      },
      check: async () => checkAllAchievementsMobile(),
    },

    // ── Habits ────────────────────────────────────────────────────────────
    habits: {
      list: async () => {
        const { data } = await supabase.from('habits').select('*')
          .eq('user_id', uid()).order('created_at')
        return data ?? []
      },

      dueToday: async () => {
        const { data } = await supabase.from('habits').select('*')
          .eq('user_id', uid()).eq('is_active', 1).order('created_at')
        const now = new Date()
        const todayDow = now.getDay()
        const daysFromMonday = todayDow === 0 ? 6 : todayDow - 1
        const monday = new Date(now)
        monday.setDate(monday.getDate() - daysFromMonday)
        const mondayStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

        const weekly = (data ?? []).filter(h => h.frequency === 'weekly')
        let doneThisWeekIds = new Set<number>()
        if (weekly.length) {
          const { data: comps } = await supabase.from('habit_completions')
            .select('habit_id').eq('user_id', uid())
            .in('habit_id', weekly.map(h => h.id as number))
            .gte('completed_at', mondayStr)
          doneThisWeekIds = new Set((comps ?? []).map(c => c.habit_id as number))
        }

        return (data ?? []).filter(h => {
          if (h.frequency === 'custom') {
            if (!h.days_of_week) return true
            return String(h.days_of_week).split(',').map(Number).includes(todayDow)
          }
          if (h.frequency === 'weekly') return !doneThisWeekIds.has(h.id as number)
          return true
        })
      },

      create: async (data: {
        name: string; description?: string; frequency: string
        target_time?: string; color: string; icon: string; days_of_week?: string
      }) => {
        const xp = data.frequency === 'weekly' ? 25 : data.frequency === 'custom' ? 15 : 10
        const { data: row } = await supabase.from('habits').insert({
          user_id: uid(), name: data.name, description: data.description ?? '',
          frequency: data.frequency, target_time: data.target_time ?? null,
          xp_reward: xp, color: data.color, icon: data.icon,
          days_of_week: data.days_of_week ?? null,
        }).select().single()
        await unlockAchievement('first_habit', 'Primeiro Hábito', 'Criou seu primeiro hábito', '🌟')
        return row?.id ?? 0
      },

      update: async (id: number, data: {
        name: string; description?: string; frequency: string
        target_time?: string; color: string; icon: string; days_of_week?: string
      }) => {
        const xp = data.frequency === 'weekly' ? 25 : data.frequency === 'custom' ? 15 : 10
        await supabase.from('habits').update({
          name: data.name, description: data.description ?? '',
          frequency: data.frequency, target_time: data.target_time ?? null,
          xp_reward: xp, color: data.color, icon: data.icon,
          days_of_week: data.days_of_week ?? null,
        }).eq('id', id).eq('user_id', uid())
        return true
      },

      delete: async (id: number) => {
        await supabase.from('habit_completions').delete().eq('habit_id', id).eq('user_id', uid())
        await supabase.from('habits').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      toggleActive: async (id: number, active: boolean) => {
        await supabase.from('habits').update({ is_active: active ? 1 : 0 })
          .eq('id', id).eq('user_id', uid())
        return true
      },

      complete: async (habitId: number, date: string) => {
        const { error } = await supabase.from('habit_completions')
          .insert({ user_id: uid(), habit_id: habitId, completed_at: date })
        if (error) return false

        const { data: habit } = await supabase.from('habits')
          .select('xp_reward, name, icon').eq('id', habitId).single()
        if (habit) {
          await grantXpInternal(habit.xp_reward ?? 10, `Hábito: ${habit.name}`)

          // Update calendar note with completion
          const { data: completions } = await supabase.from('habit_completions')
            .select('completed_at').eq('habit_id', habitId)
            .order('completed_at', { ascending: false })
          const streak = computeStreak(completions ?? [])
          const streakText = streak > 1 ? ` (${streak} dias seguidos)` : ''
          const line = `✅ ${habit.icon} ${habit.name}${streakText}`

          const { data: note } = await supabase.from('calendar_notes')
            .select('content').eq('user_id', uid()).eq('date', date).single()
          const current = note?.content ?? ''
          const newContent = current.trim() ? `${current}\n${line}` : line
          await supabase.from('calendar_notes').upsert(
            { user_id: uid(), date, content: newContent, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,date' }
          )
        }
        await checkAllAchievementsMobile()
        return true
      },

      uncomplete: async (habitId: number, date: string) => {
        const { data: existing } = await supabase.from('habit_completions')
          .select('id').eq('habit_id', habitId).eq('completed_at', date)
          .eq('user_id', uid()).single()
        if (!existing) return false

        await supabase.from('habit_completions').delete()
          .eq('habit_id', habitId).eq('completed_at', date).eq('user_id', uid())

        const { data: habit } = await supabase.from('habits')
          .select('xp_reward, name, icon').eq('id', habitId).single()
        if (habit) {
          const { data: profile } = await supabase.from('user_profile')
            .select('total_xp').eq('user_id', uid()).single()
          const newXp = Math.max(0, (profile?.total_xp ?? 0) - (habit.xp_reward ?? 10))
          const newLevelInfo = getLevelInfo(newXp)
          await supabase.from('user_profile').upsert(
            { user_id: uid(), total_xp: newXp, level: newLevelInfo.current.level },
            { onConflict: 'user_id' }
          )

          // Delete the most recent xp_history entry for this habit (mirrors desktop behavior)
          const { data: histEntry } = await supabase.from('xp_history')
            .select('id')
            .eq('user_id', uid())
            .eq('reason', `Hábito: ${habit.name}`)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (histEntry) {
            await supabase.from('xp_history').delete().eq('id', histEntry.id).eq('user_id', uid())
          }

          // Remove habit line from calendar note
          const prefix = `✅ ${habit.icon} ${habit.name}`
          const { data: note } = await supabase.from('calendar_notes')
            .select('content').eq('user_id', uid()).eq('date', date).single()
          if (note?.content) {
            const filtered = String(note.content).split('\n')
              .filter(l => !l.startsWith(prefix)).join('\n')
            await supabase.from('calendar_notes').upsert(
              { user_id: uid(), date, content: filtered, updated_at: new Date().toISOString() },
              { onConflict: 'user_id,date' }
            )
          }
        }
        return true
      },

      completions: async (habitId: number) => {
        const { data } = await supabase.from('habit_completions')
          .select('completed_at').eq('habit_id', habitId).eq('user_id', uid())
          .order('completed_at', { ascending: false })
        return data ?? []
      },

      completionsRange: async (startDate: string, endDate: string) => {
        const { data } = await supabase.from('habit_completions')
          .select('habit_id, completed_at').eq('user_id', uid())
          .gte('completed_at', startDate).lte('completed_at', endDate)
        return data ?? []
      },

      completionsByMonth: async (year: number, month: number) => {
        const m = String(month).padStart(2, '0')
        const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
        const { data } = await supabase.from('habit_completions')
          .select('completed_at, habit_id, habits!inner(color)')
          .eq('user_id', uid())
          .gte('completed_at', `${year}-${m}-01`)
          .lte('completed_at', `${year}-${m}-${lastDay}`)
        return (data ?? []).map((c) => ({
          completed_at: c.completed_at,
          habit_id: c.habit_id,
          color: (c.habits as unknown as { color: string } | null)?.color ?? '#7c3aed',
        }))
      },

      streak: async (habitId: number) => {
        const { data } = await supabase.from('habit_completions')
          .select('completed_at').eq('habit_id', habitId).eq('user_id', uid())
          .order('completed_at', { ascending: false })
        return computeStreak(data ?? [])
      },
    },

    // ── Gym ───────────────────────────────────────────────────────────────
    gym: {
      listWorkouts: async (limit = 50) => {
        const { data: ws } = await supabase.from('workouts')
          .select('*').eq('user_id', uid())
          .order('date', { ascending: false }).limit(limit)
        if (!ws?.length) return []
        const ids = ws.map(w => w.id as number)
        const { data: exs } = await supabase.from('exercises')
          .select('*').eq('user_id', uid()).in('workout_id', ids)
        const byWid: Record<number, unknown[]> = {}
        for (const ex of exs ?? []) {
          const wid = ex.workout_id as number
          if (!byWid[wid]) byWid[wid] = []
          byWid[wid].push(ex)
        }
        return ws.map(w => ({ ...w, exercises: byWid[w.id as number] ?? [] }))
      },

      createWorkout: async (data: {
        date: string; name: string; notes?: string; duration_min?: number
        cardio_type?: string; cardio_minutes?: number
        exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }[]
      }) => {
        const { data: workout, error: workoutError } = await supabase.from('workouts').insert({
          user_id: uid(), date: data.date, name: data.name,
          notes: data.notes ?? null, duration_min: data.duration_min ?? null,
          cardio_type: data.cardio_type ?? null, cardio_minutes: data.cardio_minutes ?? null,
        }).select().single()
        if (workoutError) {
          console.error('workout insert error:', workoutError)
          throw new Error('Erro ao salvar treino: ' + workoutError.message)
        }
        if (!workout) return 0

        if (data.exercises?.length) {
          const { error: exError } = await supabase.from('exercises').insert(
            data.exercises.map(ex => ({
              user_id: uid(), workout_id: workout.id,
              name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null,
              weight_kg: ex.weight_kg ?? null, is_superset: !!ex.is_superset,
            }))
          )
          if (exError) {
            console.error('exercises insert error:', exError)
            throw new Error('Erro ao salvar exercícios: ' + exError.message)
          }
        }

        let xp = 15
        if (data.duration_min) xp += Math.floor(data.duration_min / 20) * 5
        xp += (data.exercises?.length ?? 0) * 5
        xp += (data.exercises ?? []).filter(e => e.is_superset).length * 10
        xp = Math.min(xp, 150)
        await grantXpInternal(xp, `Treino: ${data.name}`)
        await checkAllAchievementsMobile()
        return workout.id
      },

      deleteWorkout: async (id: number) => {
        await supabase.from('exercises').delete().eq('workout_id', id).eq('user_id', uid())
        await supabase.from('workouts').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      listBioimpedance: async () => {
        const { data } = await supabase.from('bioimpedance').select('*')
          .eq('user_id', uid()).order('date', { ascending: false })
        return data ?? []
      },

      addBioimpedance: async (data: {
        date: string; weight_kg?: number; body_fat_pct?: number
        muscle_mass_kg?: number; bmr_kcal?: number
      }) => {
        const { data: row } = await supabase.from('bioimpedance').insert({
          user_id: uid(), date: data.date,
          weight_kg: data.weight_kg ?? null, body_fat_pct: data.body_fat_pct ?? null,
          muscle_mass_kg: data.muscle_mass_kg ?? null, bmr_kcal: data.bmr_kcal ?? null,
        }).select().single()
        await unlockAchievement('first_bio', 'Primeira Medição', 'Registrou sua primeira bioimpedância', '⚖️')
        return row?.id ?? 0
      },

      deleteBioimpedance: async (id: number) => {
        await supabase.from('bioimpedance').delete().eq('id', id).eq('user_id', uid())
        return true
      },
    },

    // ── Gym Programs ──────────────────────────────────────────────────────
    gymPrograms: {
      list: async () => {
        const { data } = await supabase.from('workout_programs')
          .select('*, workout_program_days(*, workout_program_exercises(*))')
          .eq('user_id', uid()).order('created_at', { ascending: false })
        return (data ?? []).map(({ workout_program_days: wdays, ...p }) => ({
          ...p,
          days: (wdays ?? []).map((dayRow: Record<string, unknown>) => {
            const { workout_program_exercises: wexs, ...d } = dayRow
            return { ...d, exercises: (wexs as unknown[]) ?? [] }
          }),
        }))
      },

      create: async (data: {
        name: string; description?: string
        days: { name: string; day_label?: string; exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }[] }[]
      }) => {
        const { data: program } = await supabase.from('workout_programs').insert({
          user_id: uid(), name: data.name, description: data.description ?? null,
        }).select().single()
        if (!program) return 0

        for (const day of data.days ?? []) {
          const { data: dayRow } = await supabase.from('workout_program_days').insert({
            user_id: uid(), program_id: program.id,
            day_label: day.day_label ?? null, name: day.name,
          }).select().single()
          if (dayRow && day.exercises?.length) {
            await supabase.from('workout_program_exercises').insert(
              day.exercises.map(ex => ({
                user_id: uid(), program_day_id: dayRow.id,
                name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null,
                weight_kg: ex.weight_kg ?? null, is_superset: ex.is_superset ?? 0,
              }))
            )
          }
        }
        return program.id
      },

      delete: async (id: number) => {
        const { data: days } = await supabase.from('workout_program_days')
          .select('id').eq('program_id', id).eq('user_id', uid())
        for (const d of days ?? []) {
          await supabase.from('workout_program_exercises').delete()
            .eq('program_day_id', d.id).eq('user_id', uid())
        }
        await supabase.from('workout_program_days').delete().eq('program_id', id).eq('user_id', uid())
        await supabase.from('workout_programs').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      update: async (id: number, data: {
        name: string; description?: string
        days: { name: string; day_label?: string; exercises: { name: string; sets?: number; reps?: number; weight_kg?: number }[] }[]
      }) => {
        await supabase.from('workout_programs').update({
          name: data.name, description: data.description ?? null,
        }).eq('id', id).eq('user_id', uid())

        const { data: existing } = await supabase.from('workout_program_days')
          .select('id').eq('program_id', id).eq('user_id', uid())
        for (const d of existing ?? []) {
          await supabase.from('workout_program_exercises').delete()
            .eq('program_day_id', d.id).eq('user_id', uid())
        }
        await supabase.from('workout_program_days').delete().eq('program_id', id).eq('user_id', uid())

        for (const day of data.days ?? []) {
          const { data: dayRow } = await supabase.from('workout_program_days').insert({
            user_id: uid(), program_id: id,
            day_label: day.day_label ?? null, name: day.name,
          }).select().single()
          if (dayRow && day.exercises?.length) {
            await supabase.from('workout_program_exercises').insert(
              day.exercises.map(ex => ({
                user_id: uid(), program_day_id: dayRow.id,
                name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null,
                weight_kg: ex.weight_kg ?? null, is_superset: 0,
              }))
            )
          }
        }
        return true
      },

      exerciseHistory: async (exerciseName: string) => {
        const { data } = await supabase.from('exercises')
          .select('name, sets, reps, weight_kg, workouts!inner(date)')
          .eq('user_id', uid())
          .ilike('name', exerciseName)
          .order('workouts(date)', { ascending: true })
        return (data ?? []).map(e => ({
          ...e,
          date: (e.workouts as unknown as { date: string } | null)?.date,
        }))
      },

      exerciseNames: async () => {
        const { data } = await supabase.from('exercises')
          .select('name').eq('user_id', uid())
        const names = [...new Set((data ?? []).map(e => e.name))].sort()
        return names
      },
    },

    // ── Training Phases ───────────────────────────────────────────────────
    gymPhases: {
      list: async () => {
        const { data } = await supabase.from('training_phases')
          .select('*').eq('user_id', uid()).order('start_date', { ascending: false })
        return data ?? []
      },

      create: async (data: {
        name: string; type: string; start_date: string; end_date: string; program_id?: number; notes?: string
      }) => {
        const { data: row } = await supabase.from('training_phases').insert({
          user_id: uid(), name: data.name, type: data.type,
          start_date: data.start_date, end_date: data.end_date,
          program_id: data.program_id ?? null, notes: data.notes ?? null,
        }).select().single()
        return row?.id ?? 0
      },

      update: async (id: number, data: {
        name: string; type: string; start_date: string; end_date: string; program_id?: number; notes?: string
      }) => {
        await supabase.from('training_phases').update({
          name: data.name, type: data.type,
          start_date: data.start_date, end_date: data.end_date,
          program_id: data.program_id ?? null, notes: data.notes ?? null,
        }).eq('id', id).eq('user_id', uid())
        return true
      },

      delete: async (id: number) => {
        await supabase.from('training_phases').delete().eq('id', id).eq('user_id', uid())
        return true
      },
    },

    // ── Addictions ────────────────────────────────────────────────────────
    addictions: {
      list: async () => {
        const { data } = await supabase.from('addictions')
          .select('*, addiction_relapses(*)')
          .eq('user_id', uid()).order('created_at', { ascending: false })
        return (data ?? []).map(({ addiction_relapses, ...a }) => ({
          ...a, relapses: addiction_relapses ?? [],
        }))
      },

      create: async (data: { name: string; started_free_at: string }) => {
        const { data: row } = await supabase.from('addictions').insert({
          user_id: uid(), name: data.name, started_free_at: data.started_free_at,
        }).select().single()
        return row?.id ?? 0
      },

      relapse: async (id: number, note?: string, relapseAt?: string) => {
        const now = relapseAt ?? new Date().toISOString()
        await supabase.from('addiction_relapses').insert({
          user_id: uid(), addiction_id: id, relapsed_at: now, note: note ?? null,
        })
        await supabase.from('addictions').update({ started_free_at: now })
          .eq('id', id).eq('user_id', uid())
        return true
      },

      delete: async (id: number) => {
        await supabase.from('addiction_relapses').delete().eq('addiction_id', id).eq('user_id', uid())
        await supabase.from('addictions').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      toggleHidden: async (id: number) => {
        const { data } = await supabase.from('addictions')
          .select('is_hidden_name').eq('id', id).eq('user_id', uid()).single()
        await supabase.from('addictions')
          .update({ is_hidden_name: (data?.is_hidden_name ?? 0) ? 0 : 1 })
          .eq('id', id).eq('user_id', uid())
        return true
      },

      checkMilestones: async () => checkAllAchievementsMobile(),
    },

    // ── Goals ─────────────────────────────────────────────────────────────
    goals: {
      list: async () => {
        const { data } = await supabase.from('goals')
          .select('*, goal_tasks(*)')
          .eq('user_id', uid())
          .order('is_completed').order('created_at', { ascending: false })
        return (data ?? []).map(({ goal_tasks, ...g }) => ({
          ...g, tasks: goal_tasks ?? [],
        }))
      },

      create: async (data: {
        title: string; description?: string; target_date?: string
        xp_reward: number; folder_id?: number | null
      }) => {
        const { data: row } = await supabase.from('goals').insert({
          user_id: uid(), title: data.title, description: data.description ?? null,
          target_date: data.target_date ?? null, xp_reward: data.xp_reward,
          folder_id: data.folder_id ?? null,
        }).select().single()
        return row?.id ?? 0
      },

      update: async (id: number, data: {
        title: string; description?: string; target_date?: string
        xp_reward: number; folder_id?: number | null
      }) => {
        await supabase.from('goals').update({
          title: data.title, description: data.description ?? null,
          target_date: data.target_date ?? null, xp_reward: data.xp_reward,
          folder_id: data.folder_id ?? null,
        }).eq('id', id).eq('user_id', uid())
        return true
      },

      delete: async (id: number) => {
        await supabase.from('goal_tasks').delete().eq('goal_id', id).eq('user_id', uid())
        await supabase.from('goals').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      addTask: async (goalId: number, title: string) => {
        const { data: row } = await supabase.from('goal_tasks').insert({
          user_id: uid(), goal_id: goalId, title,
        }).select().single()
        return row?.id ?? 0
      },

      completeTask: async (taskId: number, completed: boolean) => {
        await supabase.from('goal_tasks').update({ is_completed: completed ? 1 : 0 })
          .eq('id', taskId).eq('user_id', uid())
        return true
      },

      deleteTask: async (taskId: number) => {
        await supabase.from('goal_tasks').delete().eq('id', taskId).eq('user_id', uid())
        return true
      },

      updateTask: async (taskId: number, title: string) => {
        await supabase.from('goal_tasks').update({ title }).eq('id', taskId).eq('user_id', uid())
        return true
      },

      complete: async (id: number) => {
        const { data: goal } = await supabase.from('goals').select('*, goal_tasks(*)')
          .eq('id', id).eq('user_id', uid()).single()
        if (!goal || goal.is_completed) return false

        const tasks = (goal.goal_tasks ?? []) as { is_completed: number }[]
        let xp = 50 + tasks.length * 10
        if (tasks.length > 0 && tasks.every(t => t.is_completed)) xp += 25
        if (goal.target_date) xp += 10
        xp = Math.min(xp, 300)

        await supabase.from('goals').update({ is_completed: 1, xp_reward: xp })
          .eq('id', id).eq('user_id', uid())
        await grantXpInternal(xp, `Meta: ${goal.title}`)
        await checkAllAchievementsMobile()
        return true
      },
    },

    // ── Goal Folders ──────────────────────────────────────────────────────
    goalFolders: {
      list: async () => {
        const { data } = await supabase.from('goal_folders').select('*')
          .eq('user_id', uid()).order('id')
        return data ?? []
      },

      create: async (data: { name: string; icon: string; color: string }) => {
        const { data: row } = await supabase.from('goal_folders').insert({
          user_id: uid(), ...data,
        }).select().single()
        return row?.id ?? 0
      },

      update: async (id: number, data: { name: string; icon: string; color: string }) => {
        await supabase.from('goal_folders').update(data).eq('id', id).eq('user_id', uid())
        return true
      },

      delete: async (id: number) => {
        await supabase.from('goals').update({ folder_id: null })
          .eq('folder_id', id).eq('user_id', uid())
        await supabase.from('goal_folders').delete().eq('id', id).eq('user_id', uid())
        return true
      },
    },

    // ── Calendar ──────────────────────────────────────────────────────────
    calendar: {
      eventsByMonth: async (year: number, month: number) => {
        const m = String(month).padStart(2, '0')
        const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
        const { data } = await supabase.from('calendar_events').select('*')
          .eq('user_id', uid())
          .gte('date', `${year}-${m}-01`)
          .lte('date', `${year}-${m}-${lastDay}`)
          .order('date').order('id')
        return data ?? []
      },

      eventsByRange: async (from: string, to: string) => {
        const { data } = await supabase.from('calendar_events').select('*')
          .eq('user_id', uid())
          .gte('date', from).lte('date', to)
          .order('date').order('id')
        return data ?? []
      },

      createEvent: async (data: { title: string; date: string; type: string; color: string; device_event_id?: string | null }) => {
        const { data: row, error } = await supabase.from('calendar_events').insert({
          user_id: uid(), title: data.title, date: data.date,
          type: data.type ?? 'event', color: data.color ?? '#7c3aed',
          device_event_id: data.device_event_id ?? null,
        }).select().single()
        if (error) throw error
        return row
      },

      linkDevice: async (id: number, deviceEventId: string) => {
        const { error } = await supabase.from('calendar_events')
          .update({ device_event_id: deviceEventId })
          .eq('id', id).eq('user_id', uid())
        if (error) throw error
      },

      toggleDone: async (id: number) => {
        const { data } = await supabase.from('calendar_events')
          .select('is_done').eq('id', id).eq('user_id', uid()).single()
        await supabase.from('calendar_events')
          .update({ is_done: (data?.is_done ?? 0) ? 0 : 1 })
          .eq('id', id).eq('user_id', uid())
      },

      deleteEvent: async (id: number) => {
        await supabase.from('calendar_events').delete().eq('id', id).eq('user_id', uid())
      },

      getNote: async (date: string) => {
        const { data } = await supabase.from('calendar_notes')
          .select('*').eq('user_id', uid()).eq('date', date).single()
        return data ?? null
      },

      saveNote: async (date: string, content: string) => {
        await supabase.from('calendar_notes').upsert(
          { user_id: uid(), date, content, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date' }
        )
      },

      notesByMonth: async (year: number, month: number) => {
        const m = String(month).padStart(2, '0')
        const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
        const { data } = await supabase.from('calendar_notes')
          .select('date').eq('user_id', uid())
          .gte('date', `${year}-${m}-01`).lte('date', `${year}-${m}-${lastDay}`)
          .neq('content', '')
        return data ?? []
      },
    },

    // ── Journal ───────────────────────────────────────────────────────────
    journal: {
      get: async (date: string) => {
        const { data } = await supabase.from('journal_entries')
          .select('*').eq('user_id', uid()).eq('date', date).single()
        return data ?? null
      },

      recent: async (limit = 30) => {
        const { data } = await supabase.from('journal_entries').select('*')
          .eq('user_id', uid()).order('date', { ascending: false }).limit(limit)
        return data ?? []
      },

      save: async (data: { date: string; content: string; mood: number }) => {
        await supabase.from('journal_entries').upsert(
          { user_id: uid(), date: data.date, content: data.content, mood: data.mood },
          { onConflict: 'user_id,date' }
        )
        return true
      },

      delete: async (id: number) => {
        await supabase.from('journal_entries').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      byMonth: async (year: number, month: number) => {
        const m = String(month).padStart(2, '0')
        const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
        const { data } = await supabase.from('journal_entries').select('*')
          .eq('user_id', uid())
          .gte('date', `${year}-${m}-01`).lte('date', `${year}-${m}-${lastDay}`)
          .order('date', { ascending: false })
        return data ?? []
      },
    },

    // ── Sleep ─────────────────────────────────────────────────────────────
    sleep: {
      get: async (date: string) => {
        const { data } = await supabase.from('sleep_logs')
          .select('*').eq('user_id', uid()).eq('date', date).single()
        return data ?? null
      },

      recent: async (limit = 30) => {
        const { data } = await supabase.from('sleep_logs').select('*')
          .eq('user_id', uid()).order('date', { ascending: false }).limit(limit)
        return data ?? []
      },

      save: async (data: { date: string; bedtime: string; wake_time: string; quality: number; notes?: string; cycles?: number | null }) => {
        const payload = {
          user_id: uid(), date: data.date, bedtime: data.bedtime,
          wake_time: data.wake_time, quality: data.quality,
          notes: data.notes ?? null, cycles: data.cycles ?? null,
        }
        const { data: existing } = await supabase.from('sleep_logs')
          .select('id').eq('user_id', uid()).eq('date', data.date).maybeSingle()
        const { error } = existing
          ? await supabase.from('sleep_logs').update(payload).eq('id', existing.id)
          : await supabase.from('sleep_logs').insert(payload)
        if (error) {
          console.error('sleep save error:', error)
          throw new Error('Erro ao salvar sono: ' + error.message)
        }
        await checkAllAchievementsMobile()
        return true
      },

      delete: async (id: number) => {
        await supabase.from('sleep_logs').delete().eq('id', id).eq('user_id', uid())
        return true
      },
    },

    // ── Finance ───────────────────────────────────────────────────────────
    finance: {
      categories: {
        list: async () => {
          const { data } = await supabase.from('finance_categories').select('*')
            .eq('user_id', uid()).order('type').order('name')
          return data ?? []
        },

        create: async (data: { name: string; type: string; icon: string; color: string }) => {
          const { data: row } = await supabase.from('finance_categories').insert({
            user_id: uid(), ...data,
          }).select().single()
          return row?.id ?? 0
        },

        delete: async (id: number) => {
          await supabase.from('finance_transactions').delete().eq('category_id', id).eq('user_id', uid())
          await supabase.from('finance_bills').update({ category_id: null })
            .eq('category_id', id).eq('user_id', uid())
          const { error } = await supabase.from('finance_categories').delete().eq('id', id).eq('user_id', uid())
          if (error) throw new Error('Erro ao excluir categoria: ' + error.message)
          return true
        },
      },

      bills: {
        list: async () => {
          const { data } = await supabase.from('finance_bills')
            .select('*, finance_categories(name, icon)')
            .eq('user_id', uid()).order('type').order('due_day').order('name')
          return (data ?? []).map(({ finance_categories: cat, ...b }) => ({
            ...b,
            category_name: (cat as { name: string } | null)?.name ?? null,
            category_icon: (cat as { icon: string } | null)?.icon ?? null,
          }))
        },

        create: async (data: {
          name: string; amount: number; due_day: number; due_month?: number
          category_id?: number; type: string; recurrence: string; icon: string
        }) => {
          const { data: row } = await supabase.from('finance_bills').insert({
            user_id: uid(), name: data.name, amount: data.amount, due_day: data.due_day,
            due_month: data.due_month ?? null, category_id: data.category_id ?? null,
            type: data.type, recurrence: data.recurrence, icon: data.icon,
          }).select().single()
          return row?.id ?? 0
        },

        delete: async (id: number) => {
          await supabase.from('finance_transactions').delete()
            .eq('bill_id', id).eq('status', 'pending').eq('user_id', uid())
          const { error } = await supabase.from('finance_bills').delete().eq('id', id).eq('user_id', uid())
          if (error) throw new Error('Erro ao excluir conta fixa: ' + error.message)
          return true
        },

        toggleActive: async (id: number) => {
          const { data } = await supabase.from('finance_bills')
            .select('is_active').eq('id', id).eq('user_id', uid()).single()
          await supabase.from('finance_bills')
            .update({ is_active: (data?.is_active ?? 1) ? 0 : 1 })
            .eq('id', id).eq('user_id', uid())
          return true
        },

        generateMonth: async (year: number, month: number) => {
          const { data: bills } = await supabase.from('finance_bills').select('*')
            .eq('user_id', uid()).eq('is_active', 1)
          if (!bills) return 0

          const monthStr = String(month).padStart(2, '0')
          const days = daysInMonth(year, month)
          let generated = 0

          for (const bill of bills) {
            if (bill.recurrence === 'yearly' && bill.due_month !== month) continue

            const { data: existing } = await supabase.from('finance_transactions')
              .select('id').eq('user_id', uid()).eq('bill_id', bill.id)
              .gte('date', `${year}-${monthStr}-01`)
              .lte('date', `${year}-${monthStr}-${String(days).padStart(2, '0')}`)
              .limit(1).single()
            if (existing) continue

            const day = Math.min(bill.due_day, days)
            const dateStr = `${year}-${monthStr}-${String(day).padStart(2, '0')}`
            await supabase.from('finance_transactions').insert({
              user_id: uid(), date: dateStr, amount: bill.amount,
              description: bill.name, category_id: bill.category_id ?? null,
              type: bill.type, status: 'pending', bill_id: bill.id,
            })
            generated++
          }
          return generated
        },
      },

      accounts: {
        list: async () => {
          const { data } = await supabase.from('finance_accounts').select('*')
            .eq('user_id', uid()).order('name')
          return data ?? []
        },

        create: async (data: { name: string; bank: string; icon: string; color: string }) => {
          const { data: row } = await supabase.from('finance_accounts').insert({
            user_id: uid(), ...data,
          }).select().single()
          return row?.id ?? 0
        },

        delete: async (id: number) => {
          await supabase.from('finance_transactions').update({ account_id: null })
            .eq('account_id', id).eq('user_id', uid())
          await supabase.from('finance_accounts').delete().eq('id', id).eq('user_id', uid())
          return true
        },
      },

      transactions: {
        list: async (year: number, month: number) => {
          const prefix = `${year}-${String(month).padStart(2, '0')}`
          const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
          const { data } = await supabase.from('finance_transactions')
            .select('*, finance_categories(name, icon, color), finance_accounts(name, icon, color)')
            .eq('user_id', uid())
            .neq('status', 'cancelled')
            .gte('date', `${prefix}-01`).lte('date', `${prefix}-${lastDay}`)
            .order('date', { ascending: false }).order('created_at', { ascending: false })
          return (data ?? []).map(({ finance_categories: cat, finance_accounts: acc, ...t }) => ({
            ...t,
            category_name: (cat as { name: string } | null)?.name ?? null,
            category_icon: (cat as { icon: string } | null)?.icon ?? null,
            category_color: (cat as { color: string } | null)?.color ?? null,
            account_name: (acc as { name: string } | null)?.name ?? null,
            account_icon: (acc as { icon: string } | null)?.icon ?? null,
            account_color: (acc as { color: string } | null)?.color ?? null,
          }))
        },

        create: async (data: {
          date: string; amount: number; description: string
          category_id?: number; type: string; status?: string; account_id?: number
        }) => {
          const { data: row } = await supabase.from('finance_transactions').insert({
            user_id: uid(), date: data.date, amount: data.amount,
            description: data.description, category_id: data.category_id ?? null,
            type: data.type, status: data.status ?? 'paid', account_id: data.account_id ?? null,
          }).select().single()
          return row?.id ?? 0
        },

        delete: async (id: number) => {
          const { data: tx } = await supabase.from('finance_transactions')
            .select('bill_id').eq('id', id).eq('user_id', uid()).single()
          if (tx?.bill_id) {
            await supabase.from('finance_transactions').update({ status: 'cancelled' })
              .eq('id', id).eq('user_id', uid())
          } else {
            await supabase.from('finance_transactions').delete().eq('id', id).eq('user_id', uid())
          }
          return true
        },

        updateStatus: async (id: number, status: string) => {
          await supabase.from('finance_transactions').update({ status }).eq('id', id).eq('user_id', uid())
          return true
        },

        updateAmount: async (id: number, amount: number) => {
          await supabase.from('finance_transactions').update({ amount }).eq('id', id).eq('user_id', uid())
          return true
        },
      },

      summary: async (year: number, month: number) => {
        const prefix = `${year}-${String(month).padStart(2, '0')}`
        const lastDay = String(daysInMonth(year, month)).padStart(2, '0')
        const { data: txs } = await supabase.from('finance_transactions').select('type, status, amount')
          .eq('user_id', uid())
          .gte('date', `${prefix}-01`).lte('date', `${prefix}-${lastDay}`)

        const sum = (type: string, status: string) =>
          (txs ?? []).filter(t => t.type === type && t.status === status)
            .reduce((s, t) => s + (t.amount ?? 0), 0)

        const paidIncome = sum('income', 'paid')
        const pendingIncome = sum('income', 'pending')
        const paidExpense = sum('expense', 'paid')
        const pendingExpense = sum('expense', 'pending')

        const nextMonth = month === 12 ? 1 : month + 1
        const { data: nextBills } = await supabase.from('finance_bills').select('type, amount, recurrence, due_month')
          .eq('user_id', uid()).eq('is_active', 1)
        const nextExpense = (nextBills ?? [])
          .filter(b => b.type === 'expense' && (b.recurrence === 'monthly' || (b.recurrence === 'yearly' && b.due_month === nextMonth)))
          .reduce((s, b) => s + (b.amount ?? 0), 0)
        const nextIncome = (nextBills ?? [])
          .filter(b => b.type === 'income' && (b.recurrence === 'monthly' || (b.recurrence === 'yearly' && b.due_month === nextMonth)))
          .reduce((s, b) => s + (b.amount ?? 0), 0)

        return {
          paidIncome, pendingIncome, paidExpense, pendingExpense,
          income: paidIncome + pendingIncome,
          expense: paidExpense + pendingExpense,
          balance: (paidIncome + pendingIncome) - (paidExpense + pendingExpense),
          currentBalance: paidIncome - paidExpense,
          projectedBalance: (paidIncome + pendingIncome) - (paidExpense + pendingExpense),
          nextMonthIncome: nextIncome,
          nextMonthExpense: nextExpense,
          nextMonthBalance: nextIncome - nextExpense,
        }
      },

      // Delegate to Electron IPC when on desktop, stub on mobile
      ofx: {
        import: async (content: string, accountId?: number) =>
          _electronApi?.finance.ofx.import(content, accountId) ?? { imported: 0, total: 0 },
      },
      receipt: {
        parse: async (base64: string, mimeType: string) =>
          _electronApi?.finance.receipt.parse(base64, mimeType) ?? null,
      },
      backup: {
        check: async () => _electronApi?.finance.backup.check() ?? { shouldRemind: false },
        dismiss: async () => _electronApi?.finance.backup.dismiss() ?? true,
      },
    },

    // ── Media ─────────────────────────────────────────────────────────────
    media: {
      list: async () => {
        const { data } = await supabase.from('media_items').select('*')
          .eq('user_id', uid()).order('created_at', { ascending: false })
        return data ?? []
      },

      create: async (data: {
        title: string; type: string; author?: string; total_pages?: number
        cover_emoji: string; started_at?: string
      }) => {
        const { data: row } = await supabase.from('media_items').insert({
          user_id: uid(), title: data.title, type: data.type,
          author: data.author ?? null, total_pages: data.total_pages ?? null,
          cover_emoji: data.cover_emoji, started_at: data.started_at ?? null,
          status: 'reading',
        }).select().single()
        return row?.id ?? 0
      },

      update: async (id: number, data: {
        title?: string; author?: string; total_pages?: number; current_page?: number
        current_season?: number; status?: string; finished_at?: string
        cover_emoji?: string; rating?: number
      }) => {
        const update: Record<string, unknown> = {}
        if (data.title !== undefined) update.title = data.title
        if (data.author !== undefined) update.author = data.author
        if (data.total_pages !== undefined) update.total_pages = data.total_pages
        if (data.current_page !== undefined) update.current_page = data.current_page
        if (data.current_season !== undefined) update.current_season = data.current_season
        if (data.status !== undefined) update.status = data.status
        if (data.finished_at !== undefined) update.finished_at = data.finished_at
        if (data.cover_emoji !== undefined) update.cover_emoji = data.cover_emoji
        if (data.rating !== undefined) update.rating = data.rating
        await supabase.from('media_items').update(update).eq('id', id).eq('user_id', uid())
        if (data.status === 'done') await checkAllAchievementsMobile()
        return true
      },

      delete: async (id: number) => {
        await supabase.from('media_logs').delete().eq('media_id', id).eq('user_id', uid())
        await supabase.from('media_items').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      logSession: async (data: {
        media_id: number; date: string; minutes_read: number; pages_read: number
        notes?: string; rating?: number; season?: number; episode?: number
      }) => {
        await supabase.from('media_logs').insert({
          user_id: uid(), media_id: data.media_id, date: data.date,
          minutes_read: data.minutes_read, pages_read: data.pages_read,
          notes: data.notes ?? null, rating: data.rating ?? null,
          season: data.season ?? null, episode: data.episode ?? null,
        })
        if (data.pages_read > 0) {
          const { data: item } = await supabase.from('media_items')
            .select('current_page').eq('id', data.media_id).single()
          await supabase.from('media_items')
            .update({ current_page: (item?.current_page ?? 0) + data.pages_read })
            .eq('id', data.media_id).eq('user_id', uid())
        }
        return true
      },

      todayMinutes: async (date: string) => {
        const { data } = await supabase.from('media_logs').select('minutes_read')
          .eq('user_id', uid()).eq('date', date)
        return (data ?? []).reduce((s, r) => s + (r.minutes_read ?? 0), 0)
      },

      logs: async (mediaId: number) => {
        const { data } = await supabase.from('media_logs').select('*')
          .eq('media_id', mediaId).eq('user_id', uid())
          .order('date', { ascending: false }).limit(30)
        return data ?? []
      },
    },

    // ── Focus (Pomodoro) ─────────────────────────────────────────────────────
    focus: {
      logSession: async (data: { date: string; duration_minutes: number; label?: string }) => {
        const xp = Math.max(1, Math.round(data.duration_minutes))
        await supabase.from('focus_sessions').insert({
          user_id: uid(), date: data.date, duration_minutes: data.duration_minutes, label: data.label ?? null,
        })
        await grantXpInternal(xp, `Foco: ${data.duration_minutes}min`)

        const { count } = await supabase.from('focus_sessions')
          .select('id', { count: 'exact', head: true }).eq('user_id', uid())
        if ((count ?? 0) >= 1) await unlockAchievement('focus_first', 'Primeira Sessão de Foco', 'Completou sua primeira sessão de foco', '🎯')
        if ((count ?? 0) >= 10) await unlockAchievement('focus_10', '10 Sessões de Foco', 'Completou 10 sessões de foco', '🧠')
        if ((count ?? 0) >= 50) await unlockAchievement('focus_50', 'Mestre do Foco', 'Completou 50 sessões de foco', '🧘')

        const { data: dateRows } = await supabase.from('focus_sessions')
          .select('date').eq('user_id', uid()).order('date', { ascending: false })
        const uniqueDates = Array.from(new Set((dateRows ?? []).map(d => d.date as string)))
        const streak = computeStreak(uniqueDates.map(d => ({ completed_at: d })))
        if (streak >= 7) await unlockAchievement('focus_streak_7', 'Semana Focada', 'Fez pelo menos uma sessão de foco por 7 dias seguidos', '🔥')

        return { xp }
      },

      todayStats: async (date: string) => {
        const { data } = await supabase.from('focus_sessions')
          .select('duration_minutes').eq('user_id', uid()).eq('date', date)
        const rows = data ?? []
        return { sessions: rows.length, minutes: rows.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) }
      },

      weekStats: async (start: string, end: string) => {
        const { data } = await supabase.from('focus_sessions')
          .select('duration_minutes').eq('user_id', uid()).gte('date', start).lte('date', end)
        const rows = data ?? []
        return { sessions: rows.length, minutes: rows.reduce((s, r) => s + (r.duration_minutes ?? 0), 0) }
      },

      streak: async () => {
        const { data } = await supabase.from('focus_sessions')
          .select('date').eq('user_id', uid()).order('date', { ascending: false })
        const uniqueDates = Array.from(new Set((data ?? []).map(d => d.date as string)))
        return computeStreak(uniqueDates.map(d => ({ completed_at: d })))
      },

      history: async (limit = 20) => {
        const { data } = await supabase.from('focus_sessions')
          .select('*').eq('user_id', uid())
          .order('date', { ascending: false }).order('id', { ascending: false }).limit(limit)
        return data ?? []
      },
    },

    // ── Notifications: Electron native on desktop, local notifications on Android ──
    notifications: {
      getSettings: async () =>
        _electronApi?.notifications.getSettings() ?? loadMobileNotifSettings(),
      saveSettings: async (s: { enabled: boolean; hour: number; minute: number }) => {
        if (_electronApi) {
          const ok = await _electronApi.notifications.saveSettings(s)
          return { ok }
        }
        return saveMobileNotifSettings(s)
      },
      test: async () =>
        _electronApi?.notifications.test() ?? testMobileNotification(),
    },

    app: {
      exportData: async () =>
        _electronApi?.app.exportData() ?? JSON.stringify({}),
      importData: async (json: string) =>
        _electronApi?.app.importData(json) ?? false,
      resetSection: async (section: string) =>
        _electronApi?.app.resetSection(section) ?? false,
      exportExcel: async (year: number, month: number) =>
        _electronApi?.app.exportExcel(year, month) ?? { success: false },
    },

    // ── Daily Challenges ──────────────────────────────────────────────────
    challenges: {
      get: async (date: string, key: string) => {
        const { data } = await supabase.from('daily_challenges')
          .select('state').eq('user_id', uid()).eq('date', date).eq('challenge_key', key).maybeSingle()
        return data?.state ?? null
      },
      save: async (date: string, key: string, state: object) => {
        await supabase.from('daily_challenges').upsert(
          { user_id: uid(), date, challenge_key: key, state, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,date,challenge_key' }
        )
      },
    },

    // ── Rocket League ─────────────────────────────────────────────────────
    rocketLeague: {
      search: async (query: string) =>
        _electronApi?.rocketLeague.search(query) ?? { ok: false, error: 'Desktop only' },
      getProfile: async (platform: string, username: string) =>
        _electronApi?.rocketLeague.getProfile(platform, username) ?? { ok: false, error: 'Desktop only' },
      // Sessions and presets: use Electron/SQLite on desktop (preserves existing data),
      // fall back to Supabase on mobile (requires migration 007_rocket_league.sql).
      addSession: async (data: object) => {
        if (_electronApi) return _electronApi.rocketLeague.addSession(data)
        const row = data as Record<string, unknown>
        const { error } = await supabase.from('rocket_league_sessions').insert({
          user_id: uid(),
          date: row.date,
          start_mmr: row.start_mmr,
          end_mmr: row.end_mmr,
          mmr_gain: (row.end_mmr as number) - (row.start_mmr as number),
          matches: row.matches ?? 0,
          wins: row.wins ?? 0,
          notes: row.notes ?? null,
          preset_id: row.preset_id ?? null,
        })
        if (error) throw new Error(error.message)
      },
      listSessions: async (limit?: number) => {
        if (_electronApi) return _electronApi.rocketLeague.listSessions(limit)
        let q = supabase.from('rocket_league_sessions')
          .select('*').eq('user_id', uid()).order('date', { ascending: false }).order('id', { ascending: false })
        if (limit) q = q.limit(limit)
        const { data } = await q
        return data ?? []
      },
      deleteSession: async (id: number) => {
        if (_electronApi) return _electronApi.rocketLeague.deleteSession(id)
        await supabase.from('rocket_league_sessions').delete().eq('id', id).eq('user_id', uid())
      },
      savePreset: async (data: object) => {
        if (_electronApi) return _electronApi.rocketLeague.savePreset(data)
        const row = data as { name: string; slots: string }
        const { data: inserted, error } = await supabase.from('rl_car_presets')
          .insert({ user_id: uid(), name: row.name, slots: row.slots })
          .select('id').single()
        if (error) throw new Error(error.message)
        return inserted?.id
      },
      listPresets: async () => {
        if (_electronApi) return _electronApi.rocketLeague.listPresets()
        const { data } = await supabase.from('rl_car_presets')
          .select('*').eq('user_id', uid()).order('id', { ascending: false })
        return data ?? []
      },
      deletePreset: async (id: number) => {
        if (_electronApi) return _electronApi.rocketLeague.deletePreset(id)
        await supabase.from('rl_car_presets').delete().eq('id', id).eq('user_id', uid())
        return true
      },
      twitchLive: async (logins: string[]) =>
        _electronApi?.rocketLeague.twitchLive(logins) ?? { ok: false, error: 'Desktop only' },
      twitchOAuth: async () =>
        _electronApi?.rocketLeague.twitchOAuth() ?? Promise.reject(new Error('Desktop only')),
      twitchFollowed: async (userToken: string, userId: string) =>
        _electronApi?.rocketLeague.twitchFollowed(userToken, userId) ?? { ok: false, error: 'Desktop only' },
      openUrl: async (url: string) =>
        _electronApi?.rocketLeague.openUrl(url),
      startggQuery: async (query: string, variables?: Record<string, unknown>) =>
        _electronApi?.rocketLeague.startggQuery(query, variables) ?? { ok: false, error: 'Desktop only' },
    },

    volleyball: {
      list: async (limit?: number) => _electronApi?.volleyball.list(limit) ?? [],
      add: async (data: object) => _electronApi?.volleyball.add(data),
      delete: async (id: number) => _electronApi?.volleyball.delete(id),
      stats: async () => _electronApi?.volleyball.stats() ?? { total: 0, games: 0, trainings: 0, wins: 0, losses: 0 },
    },

    beachTennis: {
      list: async (limit?: number) => _electronApi?.beachTennis.list(limit) ?? [],
      add: async (data: object) => _electronApi?.beachTennis.add(data),
      delete: async (id: number) => _electronApi?.beachTennis.delete(id),
      stats: async () => _electronApi?.beachTennis.stats() ?? { total: 0, games: 0, trainings: 0, wins: 0, losses: 0 },
    },

    basketball: {
      list: async (limit?: number) => _electronApi?.basketball.list(limit) ?? [],
      add: async (data: object) => _electronApi?.basketball.add(data),
      delete: async (id: number) => _electronApi?.basketball.delete(id),
      stats: async () => _electronApi?.basketball.stats() ?? { total: 0, games: 0, trainings: 0, wins: 0, losses: 0, avgPoints: 0, avgRebounds: 0, avgAssists: 0 },
    },

    // ── User Settings ──────────────────────────────────────────────────────
    settings: {
      get: async (key: string) => {
        const { data } = await supabase.from('user_settings')
          .select('value').eq('user_id', uid()).eq('key', key).maybeSingle()
        return data?.value ?? null
      },
      set: async (key: string, value: unknown) => {
        if (value === null || value === undefined) {
          await supabase.from('user_settings').delete().eq('user_id', uid()).eq('key', key)
          return
        }
        await supabase.from('user_settings').upsert(
          { user_id: uid(), key, value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' }
        )
      },
    },

    demo: { open: async () => {} },

    db: {
      setUser: async (userId: string | null) => {
        if (userId) installMobileApi(userId)
      },
    },
  }
}
