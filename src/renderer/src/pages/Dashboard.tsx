import React, { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CheckCircle2, Circle, Dumbbell, Eye, EyeOff, Flame, Focus,
  Moon, ShieldOff, Star, Target, Trophy, Zap, BookOpen, ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'
import CalendarSection from '../components/CalendarSection'

interface Habit {
  id: number; name: string; icon: string; color: string; xp_reward: number; is_active: number
}
interface Addiction {
  id: number; name: string; started_free_at: string; is_hidden_name: number
}
interface Achievement {
  id: number; key: string; name: string; icon: string; unlocked_at: string
}
interface XpFloat { id: number; x: number; y: number; amount: number }
interface SleepLog { date?: string; bedtime: string; wake_time: string; quality: number }
interface GoalTask { id: number; title: string; is_completed: number }
interface GoalToday { id: number; title: string; target_date: string; is_completed: number; tasks: GoalTask[] }

const MOOD_EMOJIS = ['😞', '😕', '😐', '🙂', '😄']

function sleepDuration(bedtime: string, wake_time: string): string {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake_time.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? `${m}m` : ''}`
}

export default function Dashboard(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const navigate = useNavigate()
  const { profile, fetchProfile } = useProfileStore()

  const [habits, setHabits] = useState<Habit[]>([])
  const [allHabitsCount, setAllHabitsCount] = useState(0)
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set())
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [workoutToday, setWorkoutToday] = useState(false)
  const [lastSleep, setLastSleep] = useState<SleepLog | null>(null)
  const [todayReadingMins, setTodayReadingMins] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [goalsToday, setGoalsToday] = useState<GoalToday[]>([])
  const [goalTasks, setGoalTasks] = useState<Map<number, GoalTask[]>>(new Map())
  const [weeklyData, setWeeklyData] = useState<{ date: string; count: number; pct: number; isFuture: boolean }[]>([])

  const [focusMode, setFocusMode] = useState(false)
  const [barsVisible, setBarsVisible] = useState(false)
  const [, setTick] = useState(0)
  const [calendarKey, setCalendarKey] = useState(0)
  const [xpFloats, setXpFloats] = useState<XpFloat[]>([])
  const xpIdRef = useRef(0)
  const buttonRefs = useRef<Record<number, HTMLButtonElement | null>>({})
  const [hiddenSections, setHiddenSections] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]') } catch { return [] }
  })

  // Quick actions
  const [quickAction, setQuickAction] = useState<'journal' | 'sleep' | null>(null)
  const [journalContent, setJournalContent] = useState('')
  const [journalMood, setJournalMood] = useState(3)
  const [journalEntryId, setJournalEntryId] = useState<number | null>(null)
  const [sleepForm, setSleepForm] = useState({ bedtime: '22:00', wake_time: '07:00', quality: 3 })
  const [sleepLoggedToday, setSleepLoggedToday] = useState(false)
  const [savingQuick, setSavingQuick] = useState(false)
  const [quickSaved, setQuickSaved] = useState(false)

  useEffect(() => {
    loadAll()
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    function onSectionsChanged() {
      try { setHiddenSections(JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]')) } catch { setHiddenSections([]) }
    }
    window.addEventListener('habitos_sections_changed', onSectionsChanged)
    return () => { clearInterval(interval); window.removeEventListener('habitos_sections_changed', onSectionsChanged) }
  }, [])

  async function loadAll() {
    await fetchProfile()
    window.api.achievements.check()

    const dow = new Date().getDay()
    const daysFromMon = dow === 0 ? 6 : dow - 1
    const mondayMs = Date.now() - daysFromMon * 86400000
    const mondayStr = format(new Date(mondayMs), 'yyyy-MM-dd')
    const [h, allH, comps, add, ach, workouts, readMins, sleepToday, allGoals, journalEntry, weekComps] = await Promise.all([
      window.api.habits.dueToday(),
      window.api.habits.list(),
      window.api.habits.completionsRange(today, today),
      window.api.addictions.list(),
      window.api.achievements.list(),
      window.api.gym.listWorkouts(10),
      window.api.media.todayMinutes(today),
      window.api.sleep.get(today),
      window.api.goals.list(),
      window.api.journal.get(today),
      window.api.habits.completionsRange(mondayStr, today)
    ])

    const activeHabits = (h as Habit[]).filter(x => x.is_active)
    const allActive = (allH as Habit[]).filter(x => x.is_active)
    setHabits(activeHabits)
    setAllHabitsCount(allActive.length)

    // Weekly summary — use all active habits as denominator so graph shows even on days with no habits due
    const byDate = new Map<string, number>()
    for (const c of weekComps as any[]) {
      const d = c.completed_at as string
      byDate.set(d, (byDate.get(d) ?? 0) + 1)
    }
    const total = allActive.length
    setBarsVisible(false)
    setWeeklyData(Array.from({ length: 7 }, (_, i) => {
      const d = format(new Date(mondayMs + i * 86400000), 'yyyy-MM-dd')
      const count = byDate.get(d) ?? 0
      const isFuture = d > today
      return { date: d, count, pct: total > 0 && !isFuture ? Math.round((count / total) * 100) : 0, isFuture }
    }))
    setTimeout(() => setBarsVisible(true), 120)
    setCompletedToday(new Set((comps as any[]).map(c => c.habit_id)))
    setAddictions(add as Addiction[])
    setAchievements(ach as Achievement[])
    setWorkoutToday((workouts as any[]).some(w => w.date === today))
    setTodayReadingMins(readMins as number)

    const todaySleep = sleepToday as SleepLog | null
    setSleepLoggedToday(!!todaySleep)
    if (todaySleep) {
      setLastSleep(todaySleep)
      setSleepForm({ bedtime: todaySleep.bedtime, wake_time: todaySleep.wake_time, quality: todaySleep.quality })
    } else {
      // get last sleep for the stat card even if not today
      const recent = await window.api.sleep.recent(1)
      const logs = recent as SleepLog[]
      if (logs.length > 0) setLastSleep(logs[0])
    }

    const goals = allGoals as GoalToday[]
    const dueToday = goals.filter(g => g.target_date === today && !g.is_completed)
    setGoalsToday(dueToday)
    const taskMap = new Map<number, GoalTask[]>()
    for (const g of dueToday) taskMap.set(g.id, g.tasks || [])
    setGoalTasks(taskMap)

    const entry = journalEntry as any
    if (entry) {
      setJournalContent(entry.content || '')
      setJournalMood(entry.mood ?? 3)
      setJournalEntryId(entry.id ?? null)
    }

    if (activeHabits.length > 0) {
      const streaks = await Promise.all(activeHabits.map(h => window.api.habits.streak(h.id).then(s => s as number)))
      setMaxStreak(Math.max(0, ...streaks))
    }
  }

  async function toggleHabit(id: number, e: React.MouseEvent) {
    const done = completedToday.has(id)
    if (!done) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const habit = habits.find(h => h.id === id)
      const floatId = ++xpIdRef.current
      setXpFloats(prev => [...prev, { id: floatId, x: rect.left + rect.width / 2, y: rect.top, amount: habit?.xp_reward || 10 }])
      setTimeout(() => setXpFloats(prev => prev.filter(f => f.id !== floatId)), 1000)
    }
    if (done) await window.api.habits.uncomplete(id, today)
    else await window.api.habits.complete(id, today)
    await fetchProfile()
    const comps = await window.api.habits.completionsRange(today, today)
    setCompletedToday(new Set((comps as any[]).map(c => c.habit_id)))
    setCalendarKey(k => k + 1)
  }

  async function toggleGoalTask(taskId: number, goalId: number, current: number) {
    await window.api.goals.completeTask(taskId, !current)
    setGoalTasks(prev => {
      const next = new Map(prev)
      next.set(goalId, (next.get(goalId) || []).map(t => t.id === taskId ? { ...t, is_completed: current ? 0 : 1 } : t))
      return next
    })
  }

  async function saveJournal() {
    setSavingQuick(true)
    await window.api.journal.save({ date: today, content: journalContent, mood: journalMood })
    setSavingQuick(false)
    setQuickSaved(true)
    setTimeout(() => setQuickSaved(false), 2000)
  }

  async function saveSleep() {
    if (!sleepForm.bedtime || !sleepForm.wake_time) return
    setSavingQuick(true)
    await window.api.sleep.save({ date: today, ...sleepForm })
    setSleepLoggedToday(true)
    setLastSleep({ ...sleepForm })
    setSavingQuick(false)
    setQuickSaved(true)
    setTimeout(() => setQuickSaved(false), 2000)
  }

  const showW = (key: string) => !hiddenSections.includes(key)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const completedCount = completedToday.size
  const totalHabits = habits.length
  const progressPct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0

  const xpToday = ((profile as any)?.history as any[] ?? [])
    .filter((h: any) => {
      if (!h.created_at) return false
      const d = new Date(h.created_at.replace(' ', 'T'))
      return format(d, 'yyyy-MM-dd') === today
    })
    .reduce((s: number, h: any) => s + (h.amount as number ?? 0), 0)

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="space-y-5 animate-fadeIn relative">
      {/* XP floating animations */}
      {xpFloats.map(f => (
        <div key={f.id} className="xp-float fixed z-50 pointer-events-none font-bold text-accent-gold text-sm flex items-center gap-0.5" style={{ left: f.x, top: f.y }}>
          <Zap size={12} fill="currentColor" />+{f.amount}
        </div>
      ))}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary animate-slide-down">
            {greeting}, {(profile as any)?.name || 'Herói'}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap animate-slide-in-left" style={{ animationDelay: '80ms' }}>
            <p className="text-text-secondary text-sm">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            {maxStreak >= 3 && (
              <span className="inline-flex items-center gap-1 bg-orange-950/40 border border-orange-700/40 text-orange-400 text-xs font-bold px-2 py-0.5 rounded-full animate-pulse-soft">
                <Flame size={11} />
                {maxStreak} dias em sequência
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setFocusMode(v => !v)}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            focusMode ? 'bg-accent-purple text-white border-accent-purple' : 'border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-border'
          }`}
        >
          <Focus size={14} />
          {focusMode ? 'Sair do foco' : 'Modo foco'}
        </button>
      </div>

      {/* Stats row */}
      {!focusMode && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="flex items-center gap-3 bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
            <Zap size={18} className="text-accent-gold shrink-0 animate-float" />
            <div>
              <p className="text-xs text-text-muted">XP hoje</p>
              <p className="font-bold text-accent-gold text-lg leading-tight animate-count-up" style={{ animationDelay: '230ms' }}>{xpToday}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '165ms' }}>
            <Flame size={18} className="text-orange-400 shrink-0 animate-float" style={{ animationDelay: '0.4s' } as React.CSSProperties} />
            <div>
              <p className="text-xs text-text-muted">Sequência</p>
              <p className="font-bold text-orange-400 text-lg leading-tight animate-count-up" style={{ animationDelay: '315ms' }}>{maxStreak > 0 ? `${maxStreak}d` : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '250ms' }}>
            <CheckCircle2 size={18} className="text-accent-green shrink-0 animate-float" style={{ animationDelay: '0.8s' } as React.CSSProperties} />
            <div>
              <p className="text-xs text-text-muted">Hábitos</p>
              <p className="font-bold text-accent-green text-lg leading-tight animate-count-up" style={{ animationDelay: '400ms' }}>{completedCount}/{totalHabits}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-bg-secondary border border-bg-border rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: '335ms' }}>
            <Moon size={18} className="text-accent-blue shrink-0 animate-float" style={{ animationDelay: '1.2s' } as React.CSSProperties} />
            <div>
              <p className="text-xs text-text-muted">Sono</p>
              <p className="font-bold text-accent-blue text-lg leading-tight animate-count-up" style={{ animationDelay: '485ms' }}>
                {lastSleep ? sleepDuration(lastSleep.bedtime, lastSleep.wake_time) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '430ms' }}>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">Progresso do dia</span>
          <span className="text-sm font-bold text-accent-purple">{progressPct}%</span>
        </div>
        <div className="h-3 bg-bg-border rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct === 100
                ? 'animate-shimmer'
                : 'bg-gradient-to-r from-accent-purple to-accent-green'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {progressPct === 100 && (
          <p className="text-xs text-accent-green font-medium mt-1">🎉 Todos os hábitos concluídos!</p>
        )}
      </div>

      {/* Main grid */}
      <div className={`grid gap-4 items-start ${focusMode ? '' : 'lg:grid-cols-3'}`}>
        {/* Habits + weekly summary */}
        <div className={`space-y-3 ${focusMode ? '' : 'lg:col-span-2'}`}>
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 animate-reveal-left">Hábitos de Hoje</h2>
            {habits.length === 0 && (
              <p className="text-text-muted text-sm">Nenhum hábito cadastrado ainda.</p>
            )}
            <div className="space-y-2">
              {habits.map((habit, i) => {
                const done = completedToday.has(habit.id)
                return (
                  <button
                    key={habit.id}
                    ref={el => { buttonRefs.current[habit.id] = el }}
                    onClick={(e) => toggleHabit(habit.id, e)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150 text-left animate-slide-up
                      ${done
                        ? 'border-accent-green bg-emerald-950/30 text-text-primary'
                        : 'border-bg-border bg-bg-primary hover:border-bg-border/80 hover:bg-bg-border/30 text-text-secondary'
                      }`}
                    style={{ animationDelay: `${80 + i * 60}ms` }}
                  >
                    {done
                      ? <CheckCircle2 key={`chk-${habit.id}-done`} size={18} className="text-accent-green shrink-0 animate-check-pop" />
                      : <Circle size={18} className="shrink-0" />
                    }
                    <span className="text-lg">{habit.icon}</span>
                    <span className="flex-1 text-sm font-medium">{habit.name}</span>
                    {done && (
                      <span className="text-xs text-accent-gold flex items-center gap-0.5 shrink-0">
                        <Zap size={10} fill="currentColor" />+{habit.xp_reward}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Weekly summary */}
          {weeklyData.length > 0 && allHabitsCount > 0 && !focusMode && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '80ms' }}>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-4 animate-reveal-left">Últimos 7 dias</p>
              <div className="flex gap-2 h-12">
                {weeklyData.map((day, i) => {
                  const barH = day.isFuture ? 1 : Math.max(Math.round(day.pct * 0.48), day.count > 0 ? 3 : 1)
                  return (
                    <div
                      key={day.date}
                      title={day.isFuture ? '' : `${day.count}/${totalHabits} hábitos · ${day.pct}%`}
                      className="flex-1 flex flex-col justify-end"
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-700 ${
                          day.isFuture ? 'bg-bg-border opacity-30'
                          : day.pct >= 100 ? 'bg-accent-green'
                          : day.pct >= 60 ? 'bg-accent-purple'
                          : day.pct > 0 ? 'bg-accent-purple/40'
                          : 'bg-bg-border'
                        }`}
                        style={{
                          height: `${barsVisible ? barH : 0}px`,
                          transitionDelay: `${i * 75}ms`
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 mt-1.5">
                {weeklyData.map(day => {
                  const isToday = day.date === today
                  const label = format(new Date(day.date + 'T12:00:00'), 'EEE', { locale: ptBR }).replace('.', '')
                  return (
                    <div key={day.date} className="flex-1 text-center">
                      <span className={`text-xs capitalize ${isToday ? 'text-accent-purple font-bold' : day.isFuture ? 'text-text-muted opacity-40' : 'text-text-muted'}`}>
                        {label.slice(0, 3)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quick actions */}
          {!focusMode && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Registro rápido</h2>
              <div className="flex gap-2 flex-wrap">
                {[
                  { key: 'journal' as const, icon: BookOpen, label: 'Diário', color: '#8b5cf6' },
                  { key: 'sleep' as const, icon: Moon, label: sleepLoggedToday ? 'Sono ✓' : 'Sono', color: '#06b6d4' }
                ].map(({ key, icon: Icon, label, color }) => (
                  <button
                    key={key}
                    onClick={() => setQuickAction(quickAction === key ? null : key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      quickAction === key ? 'text-white border-transparent' : 'border-bg-border text-text-secondary hover:bg-bg-border'
                    }`}
                    style={quickAction === key ? { backgroundColor: color, borderColor: color } : {}}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => navigate('/gym')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-bg-border text-text-secondary hover:bg-bg-border transition-all"
                >
                  <Dumbbell size={14} />
                  Treino
                </button>
              </div>

              {quickAction === 'journal' && (
                <div className="mt-4 space-y-3 border-t border-bg-border pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">Humor:</span>
                    {MOOD_EMOJIS.map((emoji, i) => (
                      <button key={i} onClick={() => setJournalMood(i + 1)}
                        className={`text-xl transition-transform hover:scale-110 ${journalMood === i + 1 ? 'scale-125' : 'opacity-50'}`}>
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={journalContent}
                    onChange={e => setJournalContent(e.target.value)}
                    placeholder="Como foi o seu dia?"
                    rows={4}
                    className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-accent-purple placeholder:text-text-muted"
                  />
                  <button onClick={saveJournal} disabled={savingQuick}
                    className="px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                    {quickSaved ? '✓ Salvo!' : savingQuick ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}

              {quickAction === 'sleep' && (
                <div className="mt-4 space-y-3 border-t border-bg-border pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Dormiu às</label>
                      <input type="time" value={sleepForm.bedtime}
                        onChange={e => setSleepForm(s => ({ ...s, bedtime: e.target.value }))}
                        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-1">Acordou às</label>
                      <input type="time" value={sleepForm.wake_time}
                        onChange={e => setSleepForm(s => ({ ...s, wake_time: e.target.value }))}
                        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                    </div>
                  </div>
                  {sleepForm.bedtime && sleepForm.wake_time && (
                    <p className="text-xs text-text-secondary">
                      Duração: <span className="font-medium text-accent-blue">{sleepDuration(sleepForm.bedtime, sleepForm.wake_time)}</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Qualidade:</span>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button key={i} onClick={() => setSleepForm(s => ({ ...s, quality: i + 1 }))} className="transition-transform hover:scale-110">
                        <Star size={18} className={i < sleepForm.quality ? 'text-accent-gold fill-accent-gold' : 'text-bg-border'} />
                      </button>
                    ))}
                  </div>
                  <button onClick={saveSleep} disabled={savingQuick || !sleepForm.bedtime || !sleepForm.wake_time}
                    className="px-4 py-2 bg-accent-blue hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                    {quickSaved ? '✓ Salvo!' : savingQuick ? 'Salvando...' : 'Salvar sono'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Widgets */}
        {!focusMode && (
          <div className="space-y-3">
            {/* Gym */}
            {showW('gym') && (
              <div
                className={`rounded-xl p-4 border animate-slide-up cursor-pointer transition-colors ${
                  workoutToday ? 'border-accent-green bg-emerald-950/30' : 'border-bg-border bg-bg-secondary hover:bg-bg-border/20'
                }`}
                style={{ animationDelay: '520ms' }}
                onClick={() => navigate('/gym')}
              >
                <div className="flex items-center gap-2">
                  <Dumbbell size={16} className={workoutToday ? 'text-accent-green' : 'text-text-muted'} />
                  <span className="text-sm font-semibold text-text-primary flex-1">Academia</span>
                  <ArrowRight size={13} className="text-text-muted" />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  {workoutToday ? '✅ Treino registrado hoje' : 'Nenhum treino hoje'}
                </p>
              </div>
            )}

            {/* Addictions - compact */}
            {showW('addictions') && addictions.slice(0, 2).map((a, i) => {
              const diffMs = Date.now() - new Date(a.started_free_at).getTime()
              const totalSecs = Math.floor(diffMs / 1000)
              const days = Math.floor(totalSecs / 86400)
              const hours = Math.floor((totalSecs % 86400) / 3600)
              const minutes = Math.floor((totalSecs % 3600) / 60)
              const secs = totalSecs % 60
              const hidden = !!a.is_hidden_name
              return (
                <div key={a.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldOff size={15} className="text-accent-blue shrink-0" />
                    <span className="text-sm font-semibold text-text-primary truncate flex-1">
                      {hidden ? '••••••' : a.name}
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await window.api.addictions.toggleHidden(a.id)
                        setAddictions(prev => prev.map(x => x.id === a.id ? { ...x, is_hidden_name: x.is_hidden_name ? 0 : 1 } : x))
                      }}
                      className="shrink-0 text-text-muted hover:text-text-secondary transition-colors"
                    >
                      {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    </button>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-accent-blue">{days}d {pad(hours)}h {pad(minutes)}m</span>
                    <span className="text-xs font-mono text-accent-blue/60">{pad(secs)}s</span>
                  </div>
                </div>
              )
            })}

            {/* Sleep widget */}
            {showW('sleep') && lastSleep && (
              <div
                className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up cursor-pointer hover:bg-bg-border/20 transition-colors"
                style={{ animationDelay: '80ms' }}
                onClick={() => navigate('/sleep')}
              >
                <div className="flex items-center gap-2">
                  <Moon size={15} className="text-accent-blue" />
                  <span className="text-sm font-semibold text-text-primary flex-1">Sono</span>
                  <ArrowRight size={13} className="text-text-muted" />
                </div>
                <p className="text-lg font-bold text-accent-blue mt-1">{sleepDuration(lastSleep.bedtime, lastSleep.wake_time)}</p>
                <div className="flex items-center gap-0.5 mt-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={10} className={i < lastSleep.quality ? 'text-accent-gold fill-accent-gold' : 'text-bg-border'} />
                  ))}
                </div>
              </div>
            )}

            {/* Reading */}
            {showW('reading') && todayReadingMins > 0 && (
              <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '160ms' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📚</span>
                  <span className="text-sm font-semibold text-text-primary">Leitura</span>
                </div>
                <p className="text-lg font-bold text-text-primary">{todayReadingMins}min</p>
                <p className="text-xs text-text-muted">hoje</p>
              </div>
            )}

            {/* Recent achievements */}
            {showW('achievements') && achievements.length > 0 && (
              <div
                className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-bounce-in cursor-pointer hover:bg-bg-border/20 transition-colors"
                style={{ animationDelay: '240ms' }}
                onClick={() => navigate('/achievements')}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Trophy size={15} className="text-accent-gold animate-glow-pulse" />
                  <span className="text-sm font-semibold text-text-primary flex-1">Conquistas</span>
                  <ArrowRight size={13} className="text-text-muted" />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {achievements.slice(0, 4).map(a => (
                    <span key={a.id} title={a.name} className="text-xl">{a.icon}</span>
                  ))}
                  {achievements.length > 4 && (
                    <span className="text-xs text-text-muted self-center">+{achievements.length - 4}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals today */}
      {!focusMode && goalsToday.length > 0 && (
        <div className="bg-bg-secondary border border-amber-700/30 rounded-xl p-4 animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Target size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-text-primary flex-1">Metas com prazo hoje</h2>
            <span className="bg-amber-400/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">{goalsToday.length}</span>
          </div>
          <div className="space-y-3">
            {goalsToday.map(goal => {
              const tasks = goalTasks.get(goal.id) || []
              const doneTasks = tasks.filter(t => t.is_completed).length
              return (
                <div key={goal.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary flex-1">{goal.title}</span>
                    {tasks.length > 0 && (
                      <span className="text-xs text-text-muted">{doneTasks}/{tasks.length}</span>
                    )}
                  </div>
                  {tasks.length > 0 && (
                    <div className="space-y-1 pl-2">
                      {tasks.map(task => (
                        <button
                          key={task.id}
                          onClick={() => toggleGoalTask(task.id, goal.id, task.is_completed)}
                          className="flex items-center gap-2 w-full text-left group"
                        >
                          {task.is_completed
                            ? <CheckCircle2 size={14} className="text-accent-green shrink-0" />
                            : <Circle size={14} className="text-text-muted shrink-0 group-hover:text-text-secondary" />
                          }
                          <span className={`text-xs transition-colors ${task.is_completed ? 'text-text-muted line-through' : 'text-text-secondary group-hover:text-text-primary'}`}>
                            {task.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar */}
      {!focusMode && <CalendarSection refreshKey={calendarKey} onHabitToggled={loadAll} />}
    </div>
  )
}
