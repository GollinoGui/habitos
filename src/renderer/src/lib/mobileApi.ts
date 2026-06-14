// Mobile API polyfill: implements the same window.api interface as the Electron
// preload, but backed by Supabase. Installed on Android/Capacitor after login.
import { supabase } from './supabase'

// ── Level system (mirrored from src/main/ipc/profile.ts) ─────────────────────

const LEVELS = [
  { level: 1, rank: 'Iniciante', xp: 0 },
  { level: 2, rank: 'Aprendiz', xp: 100 },
  { level: 3, rank: 'Guerreiro', xp: 300 },
  { level: 4, rank: 'Herói', xp: 700 },
  { level: 5, rank: 'Lendário', xp: 1500 },
  { level: 6, rank: 'Imortal', xp: 3000 },
  { level: 7, rank: 'Ascendente', xp: 6000 },
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
let _electronApi: Window['api'] | undefined  // original Electron IPC API (if on desktop)

export function installMobileApi(userId: string): void {
  _userId = userId
  if (window.api) {
    _electronApi = window.api  // on Electron: window.api is read-only (contextBridge), keep it as-is
    return
  }
  ;(window as unknown as Record<string, unknown>).api = buildApi()
}

// ── Internal helpers ──────────────────────────────────────────────────────────

const uid = () => _userId

async function grantXpInternal(amount: number, reason: string): Promise<void> {
  await supabase.from('xp_history').insert({ user_id: uid(), amount, reason })
  const { data: profile } = await supabase
    .from('user_profile').select('total_xp').eq('user_id', uid()).single()
  const newXp = (profile?.total_xp ?? 0) + amount
  const levelInfo = getLevelInfo(newXp)
  await supabase.from('user_profile')
    .update({ total_xp: newXp, level: levelInfo.current.level })
    .eq('user_id', uid())
}

async function unlockAchievement(key: string, name: string, description: string, icon: string): Promise<boolean> {
  const { error } = await supabase.from('achievements')
    .insert({ user_id: uid(), key, name, description, icon })
  return !error
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
        const profile = profileRes.data ?? { user_id: uid(), name: 'Herói', total_xp: 0, level: 1 }
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
      check: async () => [],
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
        const todayDow = new Date().getDay()
        return (data ?? []).filter(h => {
          if (h.frequency !== 'custom') return true
          if (!h.days_of_week) return true
          return String(h.days_of_week).split(',').map(Number).includes(todayDow)
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
          await supabase.from('user_profile').update({ total_xp: newXp }).eq('user_id', uid())

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
        const { data } = await supabase.from('habit_completions')
          .select('completed_at, habit_id, habits!inner(color)')
          .eq('user_id', uid())
          .gte('completed_at', `${year}-${m}-01`)
          .lte('completed_at', `${year}-${m}-31`)
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
        const { data } = await supabase.from('workouts')
          .select('*, exercises(*)')
          .eq('user_id', uid())
          .order('date', { ascending: false }).limit(limit)
        return data ?? []
      },

      createWorkout: async (data: {
        date: string; name: string; notes?: string; duration_min?: number
        exercises: { name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }[]
      }) => {
        const { data: workout } = await supabase.from('workouts').insert({
          user_id: uid(), date: data.date, name: data.name,
          notes: data.notes ?? null, duration_min: data.duration_min ?? null,
        }).select().single()
        if (!workout) return 0

        if (data.exercises?.length) {
          await supabase.from('exercises').insert(
            data.exercises.map(ex => ({
              user_id: uid(), workout_id: workout.id,
              name: ex.name, sets: ex.sets ?? null, reps: ex.reps ?? null,
              weight_kg: ex.weight_kg ?? null, is_superset: ex.is_superset ?? 0,
            }))
          )
        }

        let xp = 15
        if (data.duration_min) xp += Math.floor(data.duration_min / 20) * 5
        xp += (data.exercises?.length ?? 0) * 5
        xp += (data.exercises ?? []).filter(e => e.is_superset).length * 10
        xp = Math.min(xp, 150)
        await grantXpInternal(xp, `Treino: ${data.name}`)
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

      checkMilestones: async () => [],
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
        return true
      },
    },

    // ── Goal Folders ──────────────────────────────────────────────────────
    goalFolders: {
      list: async () => {
        const { data } = await supabase.from('goal_folders').select('*')
          .eq('user_id', uid()).order('created_at')
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
        const { data } = await supabase.from('calendar_events').select('*')
          .eq('user_id', uid())
          .gte('date', `${year}-${m}-01`)
          .lte('date', `${year}-${m}-31`)
          .order('date').order('created_at')
        return data ?? []
      },

      createEvent: async (data: { title: string; date: string; type: string; color: string }) => {
        const { data: row } = await supabase.from('calendar_events').insert({
          user_id: uid(), title: data.title, date: data.date,
          type: data.type ?? 'event', color: data.color ?? '#7c3aed',
        }).select().single()
        return row
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
        const { data } = await supabase.from('calendar_notes')
          .select('date').eq('user_id', uid())
          .gte('date', `${year}-${m}-01`).lte('date', `${year}-${m}-31`)
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
        const { data } = await supabase.from('journal_entries').select('*')
          .eq('user_id', uid())
          .gte('date', `${year}-${m}-01`).lte('date', `${year}-${m}-31`)
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

      save: async (data: { date: string; bedtime: string; wake_time: string; quality: number; notes?: string }) => {
        await supabase.from('sleep_logs').upsert(
          {
            user_id: uid(), date: data.date, bedtime: data.bedtime,
            wake_time: data.wake_time, quality: data.quality, notes: data.notes ?? null,
          },
          { onConflict: 'user_id,date' }
        )
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
          await supabase.from('finance_categories').delete().eq('id', id).eq('user_id', uid())
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
          await supabase.from('finance_bills').delete().eq('id', id).eq('user_id', uid())
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
          const { data } = await supabase.from('finance_transactions')
            .select('*, finance_categories(name, icon, color), finance_accounts(name, icon, color)')
            .eq('user_id', uid())
            .gte('date', `${prefix}-01`).lte('date', `${prefix}-31`)
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
          await supabase.from('finance_transactions').delete().eq('id', id).eq('user_id', uid())
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
        const { data: txs } = await supabase.from('finance_transactions').select('type, status, amount')
          .eq('user_id', uid())
          .gte('date', `${prefix}-01`).lte('date', `${prefix}-31`)

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
        return true
      },

      delete: async (id: number) => {
        await supabase.from('media_logs').delete().eq('media_id', id).eq('user_id', uid())
        await supabase.from('media_items').delete().eq('id', id).eq('user_id', uid())
        return true
      },

      logSession: async (data: { media_id: number; date: string; minutes_read: number; pages_read: number }) => {
        await supabase.from('media_logs').insert({
          user_id: uid(), media_id: data.media_id, date: data.date,
          minutes_read: data.minutes_read, pages_read: data.pages_read,
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

    // ── Desktop-only features: delegate to Electron IPC when available ────
    notifications: {
      getSettings: async () =>
        _electronApi?.notifications.getSettings() ?? { enabled: false, hour: 20, minute: 0 },
      saveSettings: async (s: { enabled: boolean; hour: number; minute: number }) =>
        _electronApi?.notifications.saveSettings(s) ?? true,
      test: async () =>
        _electronApi?.notifications.test() ?? { sent: false },
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

    demo: { open: async () => {} },

    db: {
      setUser: async (userId: string | null) => {
        if (userId) installMobileApi(userId)
      },
    },
  }
}
