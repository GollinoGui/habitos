import React, { useEffect, useState } from 'react'
import { format, subDays, eachDayOfInterval } from 'date-fns'
import { Plus, Flame, CheckCircle2, Circle, Pencil, Trash2, X, Check } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface Habit {
  id: number; name: string; description: string; frequency: string; target_time: string;
  xp_reward: number; color: string; icon: string; is_active: number; created_at: string
}

const ICONS = ['⭐', '💪', '🏃', '🛏', '📚', '🥗', '💧', '🧘', '🎯', '🎸', '✍️', '🌅', '🚿', '🧹', '🏋️']
const COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-md shadow-2xl">
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
                <option value="daily">Diário</option>
                <option value="weekly">Semanal</option>
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
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary border border-bg-border/60 rounded-lg">
            <span className="text-accent-gold text-sm">⚡</span>
            <span className="text-xs text-text-muted">
              XP automático: <span className="text-accent-gold font-semibold">{frequency === 'weekly' ? '25 XP' : '10 XP'}</span> por conclusão
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
            onClick={() => name && onSave({ name, description, frequency, target_time: targetTime, color, icon })}
            className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm transition-colors disabled:opacity-50"
            disabled={!name}
          >Salvar</button>
        </div>
      </div>
    </div>
  )
}

function HeatmapRow({ habitId }: { habitId: number }) {
  const [completions, setCompletions] = useState<Set<string>>(new Set())

  useEffect(() => {
    window.api.habits.completions(habitId).then((c: any[]) => {
      setCompletions(new Set(c.map(x => x.completed_at)))
    })
  }, [habitId])

  const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() })

  return (
    <div className="flex gap-0.5 mt-2 flex-wrap">
      {days.map(d => {
        const key = format(d, 'yyyy-MM-dd')
        const done = completions.has(key)
        return (
          <div key={key} title={key}
            className={`w-3 h-3 rounded-sm transition-colors ${done ? 'bg-accent-purple' : 'bg-bg-border'}`}
          />
        )
      })}
    </div>
  )
}

export default function Habits(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { fetchProfile } = useProfileStore()
  const [habits, setHabits] = useState<Habit[]>([])
  const [completedToday, setCompletedToday] = useState<Set<number>>(new Set())
  const [streaks, setStreaks] = useState<Record<number, number>>({})
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { loadHabits() }, [])

  async function loadHabits() {
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
    const done = completedToday.has(id)
    if (done) await window.api.habits.uncomplete(id, today)
    else await window.api.habits.complete(id, today)
    await fetchProfile()
    loadHabits()
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

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Hábitos</h1>
          <p className="text-text-secondary text-sm">{active.length} ativos · {completedToday.size} concluídos hoje</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className="px-3 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm"
          >
            {showInactive ? 'Ver ativos' : 'Ver inativos'}
          </button>
          <button
            onClick={() => { setEditingHabit(null); setShowModal(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Novo hábito
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {displayed.length === 0 && (
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-8 text-center">
            <p className="text-text-muted">Nenhum hábito {showInactive ? 'inativo' : 'ativo'}.</p>
          </div>
        )}
        {displayed.map(habit => {
          const done = completedToday.has(habit.id)
          const streak = streaks[habit.id] || 0
          return (
            <div key={habit.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-fadeIn">
              <div className="flex items-start gap-3">
                <button onClick={() => toggleHabit(habit.id)} className="mt-0.5">
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
                    <span>{habit.frequency === 'daily' ? 'Diário' : 'Semanal'}</span>
                    {habit.target_time && <span>⏰ {habit.target_time}</span>}
                    <span style={{ color: habit.color }}>+{habit.xp_reward} XP</span>
                  </div>
                  <HeatmapRow habitId={habit.id} />
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
      </div>

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
