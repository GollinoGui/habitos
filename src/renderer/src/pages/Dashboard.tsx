import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CheckCircle2, Circle, Dumbbell, ShieldOff, Target, Trophy, Zap } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface Habit {
  id: number; name: string; icon: string; color: string; xp_reward: number; is_active: number
}
interface Addiction {
  id: number; name: string; started_free_at: string
}
interface Achievement {
  id: number; key: string; name: string; description: string; icon: string; unlocked_at: string
}

export default function Dashboard(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { profile, fetchProfile } = useProfileStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set())
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [workoutToday, setWorkoutToday] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  async function loadAll() {
    const [h, comps, add, ach, workouts] = await Promise.all([
      window.api.habits.list(),
      window.api.habits.completionsRange(today, today),
      window.api.addictions.list(),
      window.api.achievements.list(),
      window.api.gym.listWorkouts(10)
    ])
    setHabits((h as Habit[]).filter(x => x.is_active))
    setCompletedToday(new Set((comps as any[]).map(c => c.habit_id)))
    setAddictions(add as Addiction[])
    setAchievements(ach as Achievement[])
    setWorkoutToday((workouts as any[]).some(w => w.date === today))
  }

  async function toggleHabit(id: number) {
    const done = completedToday.has(id)
    if (done) {
      await window.api.habits.uncomplete(id, today)
    } else {
      await window.api.habits.complete(id, today)
    }
    await fetchProfile()
    const comps = await window.api.habits.completionsRange(today, today)
    setCompletedToday(new Set((comps as any[]).map(c => c.habit_id)))
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const completedCount = completedToday.size
  const totalHabits = habits.length
  const progressPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {greeting}, {profile?.name || 'Herói'}! 👋
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Progresso do dia</span>
          <span className="text-sm font-bold text-accent-purple">{completedCount}/{totalHabits} hábitos</span>
        </div>
        <div className="h-3 bg-bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent-purple to-accent-green rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-text-muted mt-1">{progressPct}% concluído</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Habits today */}
        <div className="lg:col-span-2 bg-bg-secondary border border-bg-border rounded-xl p-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Hábitos de Hoje
          </h2>
          {habits.length === 0 && (
            <p className="text-text-muted text-sm">Nenhum hábito cadastrado ainda.</p>
          )}
          <div className="space-y-2">
            {habits.map(habit => {
              const done = completedToday.has(habit.id)
              return (
                <button
                  key={habit.id}
                  onClick={() => toggleHabit(habit.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left
                    ${done
                      ? 'border-accent-green bg-emerald-950/30 text-text-primary'
                      : 'border-bg-border bg-bg-primary hover:border-bg-border/80 hover:bg-bg-border/30 text-text-secondary'
                    }`}
                >
                  {done
                    ? <CheckCircle2 size={18} className="text-accent-green shrink-0" />
                    : <Circle size={18} className="shrink-0" />
                  }
                  <span className="text-lg">{habit.icon}</span>
                  <span className="flex-1 text-sm font-medium">{habit.name}</span>
                  {done && (
                    <span className="text-xs text-accent-gold flex items-center gap-0.5">
                      <Zap size={10} fill="currentColor" />+{habit.xp_reward}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Widgets */}
        <div className="space-y-3">
          {/* Gym widget */}
          <div className={`rounded-xl p-4 border ${workoutToday ? 'border-accent-green bg-emerald-950/30' : 'border-bg-border bg-bg-secondary'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell size={16} className={workoutToday ? 'text-accent-green' : 'text-text-muted'} />
              <span className="text-sm font-semibold text-text-primary">Academia</span>
            </div>
            <p className="text-xs text-text-secondary">
              {workoutToday ? '✅ Treino registrado hoje!' : 'Nenhum treino hoje'}
            </p>
          </div>

          {/* Addictions widget */}
          {addictions.slice(0, 3).map(a => {
            const diffMs = Date.now() - new Date(a.started_free_at).getTime()
            const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
            return (
              <div key={a.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldOff size={16} className="text-accent-blue" />
                  <span className="text-sm font-semibold text-text-primary truncate">{a.name}</span>
                </div>
                <p className="text-xl font-bold text-accent-blue">{days}d</p>
                <p className="text-xs text-text-muted">livre</p>
              </div>
            )
          })}

          {/* Recent achievements */}
          {achievements.length > 0 && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={16} className="text-accent-gold" />
                <span className="text-sm font-semibold text-text-primary">Conquistas</span>
              </div>
              <div className="space-y-1">
                {achievements.slice(0, 3).map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <span className="text-base">{a.icon}</span>
                    <span className="text-xs text-text-secondary truncate">{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
