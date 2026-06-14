import React, { useEffect, useState } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Flame, CheckCircle2, Circle, Pencil, Trash2, X, Check, BarChart2 } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useProfileStore } from '../store/profileStore'

interface Habit {
  id: number; name: string; description: string; frequency: string; target_time: string;
  xp_reward: number; color: string; icon: string; is_active: number; created_at: string; days_of_week?: string
}

const ICONS = ['⭐', '💪', '🏃', '🛏', '📚', '🥗', '💧', '🧘', '🎯', '🎸', '✍️', '🌅', '🚿', '🧹', '🏋️']
const COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']
const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function parseDaysOfWeek(val?: string): number[] {
  if (!val) return [1, 2, 3, 4, 5]
  return val.split(',').map(Number).filter(n => !isNaN(n))
}

function Modal({ onClose, onSave, initial, error }: {
  onClose: () => void
  onSave: (data: object) => void
  initial?: Partial<Habit>
  error?: string | null
}) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [frequency, setFrequency] = useState(initial?.frequency || 'daily')
  const [targetTime, setTargetTime] = useState(initial?.target_time || '')
  const [color, setColor] = useState(initial?.color || '#7c3aed')
  const [icon, setIcon] = useState(initial?.icon || '⭐')
  const [selectedDays, setSelectedDays] = useState<number[]>(() => parseDaysOfWeek(initial?.days_of_week))

  function toggleDay(dow: number) {
    setSelectedDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow].sort())
  }

  const xpPreview = frequency === 'weekly' ? 25 : frequency === 'custom' ? 15 : 10

  function handleSave() {
    if (!name) return
    const days_of_week = frequency === 'custom' ? selectedDays.join(',') : undefined
    onSave({ name, description, frequency, target_time: targetTime, color, icon, days_of_week })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-5 w-full max-w-md shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">{initial?.id ? 'Editar' : 'Novo'} Hábito</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Nome *</label>
            <input
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Arrumar a cama"
            />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Descrição</label>
            <input
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
              value={description} onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Frequência</label>
              <select
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                value={frequency} onChange={e => setFrequency(e.target.value)}
              >
                <option value="daily">Diário (todos os dias)</option>
                <option value="weekly">Semanal (1× por semana)</option>
                <option value="custom">Dias específicos</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">
                Horário alvo <span className="text-text-muted">(opcional)</span>
              </label>
              <div className="flex gap-1">
                <input type="time"
                  className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
                  value={targetTime} onChange={e => setTargetTime(e.target.value)}
                />
                {targetTime && (
                  <button
                    type="button"
                    onClick={() => setTargetTime('')}
                    className="px-2 rounded-lg border border-bg-border text-text-muted hover:text-text-primary hover:bg-bg-border transition-colors"
                    title="Remover horário"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {frequency === 'custom' && (
            <div>
              <label className="text-xs text-text-secondary mb-2 block">Dias da semana</label>
              <div className="flex gap-1.5 flex-wrap">
                {DOW_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                      selectedDays.includes(i)
                        ? 'bg-accent-purple border-accent-purple text-white'
                        : 'border-bg-border text-text-secondary hover:border-accent-purple/50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-accent-red mt-1">Selecione pelo menos um dia.</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-bg-border/60 rounded-lg">
            <span className="text-accent-gold text-sm">⚡</span>
            <span className="text-xs text-text-muted">
              XP automático: <span className="text-accent-gold font-semibold">{xpPreview} XP</span> por conclusão
            </span>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center transition-all
                    ${icon === ic ? 'bg-accent-purple ring-2 ring-accent-purple ring-offset-1 ring-offset-bg-secondary' : 'bg-bg-border hover:bg-bg-border/80'}`}
                >{ic}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Cor</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-bg-secondary scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        {error && (
          <p className="text-xs text-accent-red mt-3 bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            disabled={!name || (frequency === 'custom' && selectedDays.length === 0)}
          >Salvar</button>
        </div>
      </div>
    </div>
  )
}

function HeatmapRow({ habitId, rangeDays = 30 }: { habitId: number; rangeDays?: number }) {
  const [completions, setCompletions] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.api.habits.completions(habitId).then((c: any[]) => {
      setCompletions(new Set(c.map(x => x.completed_at)))
    })
  }, [habitId])

  const days = eachDayOfInterval({ start: subDays(new Date(), rangeDays - 1), end: new Date() })

  return (
    <div className="flex gap-0.5 mt-2 flex-nowrap overflow-x-auto pb-0.5">
      {days.map((d, idx) => {
        const key = format(d, 'yyyy-MM-dd')
        const done = completions.has(key)
        return (
          <div key={key} title={key}
            className={`w-3 h-3 rounded-sm animate-slide-up-tiny ${done ? 'bg-accent-purple' : 'bg-bg-border'}`}
            style={{ animationDelay: `${idx * 16}ms` }}
          />
        )
      })}
    </div>
  )
}

interface Completion { habit_id: number; completed_at: string }

function Analytics({ habits, streaks, rangeDays }: { habits: Habit[]; streaks: Record<number, number>; rangeDays: number }) {
  const [completions, setCompletions] = useState<Completion[]>([])
  const today = format(new Date(), 'yyyy-MM-dd')
  const start = format(subDays(new Date(), rangeDays - 1), 'yyyy-MM-dd')

  useEffect(() => {
    window.api.habits.completionsRange(start, today).then((c) => setCompletions(c as Completion[]))
  }, [rangeDays])

  const active = habits.filter(h => h.is_active)
  const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const dowCounts = Array(7).fill(0)
  completions.forEach(c => {
    const d = new Date(c.completed_at + 'T12:00:00')
    dowCounts[d.getDay()]++
  })
  const maxDow = Math.max(...dowCounts, 1)

  const habitStats = active.map(h => {
    const count = completions.filter(c => c.habit_id === h.id).length
    return { habit: h, count, rate: Math.round((count / rangeDays) * 100) }
  }).sort((a, b) => b.rate - a.rate)

  const totalDays = rangeDays
  const perfectDays = (() => {
    if (active.length === 0) return 0
    const days = eachDayOfInterval({ start: subDays(new Date(), rangeDays - 1), end: new Date() })
    return days.filter(d => {
      const key = format(d, 'yyyy-MM-dd')
      const done = completions.filter(c => c.completed_at === key)
      return done.length >= active.length
    }).length
  })()

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center animate-pop-in" style={{ animationDelay: '0ms' }}>
          <p className="text-2xl font-bold text-accent-purple animate-count-up" style={{ animationDelay: '100ms' }}>{completions.length}</p>
          <p className="text-xs text-text-muted">Conclusões em {rangeDays} dias</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center animate-pop-in" style={{ animationDelay: '80ms' }}>
          <p className="text-2xl font-bold text-accent-green animate-count-up" style={{ animationDelay: '180ms' }}>{perfectDays}</p>
          <p className="text-xs text-text-muted">Dias perfeitos</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center animate-pop-in" style={{ animationDelay: '160ms' }}>
          <p className="text-2xl font-bold text-accent-gold animate-count-up" style={{ animationDelay: '260ms' }}>{Math.max(...Object.values(streaks), 0)}</p>
          <p className="text-xs text-text-muted">Melhor sequência</p>
        </div>
      </div>

      {/* Day of week chart */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '80ms' }}>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 animate-reveal-left">Conclusões por dia da semana</h3>
        <div className="flex items-end gap-2 h-24">
          {DOW_LABELS.map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <div
                  className="w-full rounded-t-md bg-accent-purple animate-slide-up"
                  style={{
                    height: `${Math.max(4, (dowCounts[i] / maxDow) * 80)}px`,
                    opacity: dowCounts[i] === 0 ? 0.2 : 1,
                    animationDelay: `${120 + i * 70}ms`
                  }}
                />
              </div>
              <span className="text-xs text-text-muted">{label}</span>
              <span className="text-xs text-text-secondary font-medium animate-count-up" style={{ animationDelay: `${200 + i * 70}ms` }}>{dowCounts[i]}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">
          Melhor dia: <span className="text-text-primary font-medium">{DOW_LABELS[dowCounts.indexOf(Math.max(...dowCounts))]}</span>
        </p>
      </div>

      {/* Per-habit rates */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 animate-slide-up" style={{ animationDelay: '160ms' }}>
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4 animate-reveal-left" style={{ animationDelay: '200ms' }}>Taxa de conclusão por hábito ({rangeDays} dias)</h3>
        <div className="space-y-3">
          {habitStats.map(({ habit, count, rate }, idx) => (
            <div key={habit.id} className="animate-slide-in-left" style={{ animationDelay: `${240 + idx * 55}ms` }}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-text-primary flex items-center gap-2">
                  <span>{habit.icon}</span> {habit.name}
                  {streaks[habit.id] > 0 && (
                    <span className="text-xs text-orange-400 flex items-center gap-0.5">
                      <Flame size={11} fill="currentColor" />{streaks[habit.id]}
                    </span>
                  )}
                </span>
                <span className="text-sm font-bold" style={{ color: habit.color }}>{rate}%</span>
              </div>
              <div className="h-2 bg-bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${rate}%`, backgroundColor: habit.color }} />
              </div>
              <p className="text-xs text-text-muted mt-0.5">{count} de {totalDays} dias</p>
            </div>
          ))}
          {habitStats.length === 0 && <p className="text-text-muted text-sm">Nenhum hábito ativo.</p>}
        </div>
      </div>
    </div>
  )
}

export default function Habits(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { fetchProfile } = useProfileStore()
  const location = useLocation()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set())
  const [streaks, setStreaks] = useState<Record<number, number>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [togglingHabits, setTogglingHabits] = useState<Set<number>>(new Set())
  const [showInactive, setShowInactive] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'habits' | 'analytics'>('habits')
  const [rangeDays, setRangeDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((location.state as any)?.trayAction === 'new') setShowModal(true)
  }, [location.state])

  useEffect(() => { loadHabits() }, [])

  async function loadHabits() {
    try {
      const [h, comps] = await Promise.all([
        window.api.habits.list(),
        window.api.habits.completionsRange(today, today)
      ])
      setHabits(h as Habit[])
      setCompletedToday(new Set((comps as any[]).map(c => c.habit_id)))
      const streakMap: Record<number, number> = {}
      await Promise.all((h as Habit[]).map(async habit => {
        streakMap[habit.id] = await window.api.habits.streak(habit.id)
      }))
      setStreaks(streakMap)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(data: object) {
    setSaveError(null)
    try {
      if (editingHabit) {
        await window.api.habits.update(editingHabit.id, data)
      } else {
        await window.api.habits.create(data)
      }
      setShowModal(false)
      setEditingHabit(null)
      await loadHabits()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar hábito')
    }
  }

  async function toggleHabit(id: number) {
    if (togglingHabits.has(id)) return
    setTogglingHabits(prev => new Set(prev).add(id))
    try {
      const done = completedToday.has(id)
      if (done) await window.api.habits.uncomplete(id, today)
      else await window.api.habits.complete(id, today)
      await fetchProfile()
      await loadHabits()
    } finally {
      setTogglingHabits(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function deleteHabit(id: number) {
    if (confirm('Excluir este hábito?')) {
      await window.api.habits.delete(id)
      loadHabits()
    }
  }

  const active = habits.filter(h => h.is_active)
  const inactive = habits.filter(h => !h.is_active)
  const displayed = showInactive ? inactive : active

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary">Hábitos</h1>
          <p className="text-text-secondary text-sm">{active.length} ativos · {completedToday.size} concluídos hoje</p>
        </div>
        {activeTab === 'habits' && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowInactive(!showInactive)}
              className="px-3 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm"
            >
              {showInactive ? 'Ativos' : 'Inativos'}
            </button>
            <button
              onClick={() => { setEditingHabit(null); setShowModal(true) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-colors animate-jump-in"
            >
              <Plus size={15} /> Novo
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('habits')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'habits' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <CheckCircle2 size={14} /> Hábitos
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}
        >
          <BarChart2 size={14} /> Analytics
        </button>
      </div>

      {activeTab === 'analytics' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Período:</span>
            {[30, 60, 90].map(n => (
              <button key={n} onClick={() => setRangeDays(n)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${rangeDays === n ? 'bg-accent-purple text-white' : 'bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary'}`}>
                {n}d
              </button>
            ))}
          </div>
          <Analytics habits={habits} streaks={streaks} rangeDays={rangeDays} />
        </>
      )}

      {activeTab === 'habits' && <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-8 text-center">
            <p className="text-text-muted">Nenhum hábito {showInactive ? 'inativo' : 'ativo'}.</p>
          </div>
        )}
        {displayed.map((habit, i) => {
          const done = completedToday.has(habit.id)
          const streak = streaks[habit.id] || 0
          return (
            <div key={habit.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${i * 65}ms` }}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleHabit(habit.id)} disabled={togglingHabits.has(habit.id)} className="mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  {done
                    ? <CheckCircle2 size={22} className="text-accent-green" />
                    : <Circle size={22} className="text-text-muted hover:text-text-primary transition-colors" />
                  }
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{habit.icon}</span>
                    <span className={`text-sm font-semibold ${done ? 'line-through text-text-muted' : 'text-text-primary'}`}>{habit.name}</span>
                    {streak > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-orange-400 font-bold">
                        <Flame size={12} fill="currentColor" />{streak}
                      </span>
                    )}
                  </div>
                  {habit.description && <p className="text-xs text-text-muted mt-0.5">{habit.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                    <span>{habit.frequency === 'daily' ? 'Diário' : habit.frequency === 'weekly' ? 'Semanal' : habit.days_of_week ? habit.days_of_week.split(',').map(d => DOW_LABELS[Number(d)]).join(', ') : 'Personalizado'}</span>
                    {habit.target_time && <span>⏰ {habit.target_time}</span>}
                    <span style={{ color: habit.color }}>+{habit.xp_reward} XP</span>
                  </div>
                  <HeatmapRow habitId={habit.id} rangeDays={rangeDays} />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingHabit(habit); setShowModal(true) }}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-border">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => window.api.habits.toggleActive(habit.id, !habit.is_active).then(loadHabits)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-border">
                    {habit.is_active ? <X size={14} /> : <Check size={14} />}
                  </button>
                  <button onClick={() => deleteHabit(habit.id)}
                    className="p-1.5 rounded-lg text-text-muted hover:text-accent-red hover:bg-red-950/30">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>}

      {showModal && (
        <Modal
          onClose={() => { setShowModal(false); setEditingHabit(null); setSaveError(null) }}
          onSave={handleSave}
          initial={editingHabit || undefined}
          error={saveError}
        />
      )}
    </div>
  )
}
