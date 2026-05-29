import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Target, CheckSquare, Square, Trash2, X, CheckCircle2, Pencil } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface GoalTask { id: number; title: string; is_completed: number }
interface Goal {
  id: number; title: string; description?: string; target_date?: string;
  xp_reward: number; is_completed: number; tasks: GoalTask[]; created_at: string
}

function GoalModal({ onClose, onSave, initial }: {
  onClose: () => void
  onSave: (d: object) => void
  initial?: Partial<Goal>
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [targetDate, setTargetDate] = useState(initial?.target_date || '')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">{initial?.id ? 'Editar' : 'Nova'} Meta</h2>
          <button onClick={onClose}><X size={18} className="text-text-muted" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Correr uma maratona"
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-accent-purple" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Prazo</label>
            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button onClick={() => title && onSave({ title, description, target_date: targetDate || null, xp_reward: 100 })}
            className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm">Salvar</button>
        </div>
      </div>
    </div>
  )
}

export default function Goals(): React.JSX.Element {
  const { fetchProfile } = useProfileStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [newTask, setNewTask] = useState<Record<number, string>>({})

  useEffect(() => { load() }, [])

  async function load() {
    setGoals(await window.api.goals.list())
  }

  async function handleSave(data: object) {
    if (editGoal) {
      await window.api.goals.update(editGoal.id, data)
    } else {
      await window.api.goals.create(data)
    }
    setShowModal(false); setEditGoal(null)
    load()
  }

  async function addTask(goalId: number) {
    const title = (newTask[goalId] || '').trim()
    if (!title) return
    await window.api.goals.addTask(goalId, title)
    setNewTask(p => ({ ...p, [goalId]: '' }))
    load()
  }

  async function toggleTask(taskId: number, current: number) {
    await window.api.goals.completeTask(taskId, !current)
    load()
  }

  async function completeGoal(id: number) {
    if (confirm('Marcar esta meta como concluída? Você ganhará XP!')) {
      await window.api.goals.complete(id)
      await fetchProfile()
      load()
    }
  }

  const active = goals.filter(g => !g.is_completed)
  const completed = goals.filter(g => g.is_completed)

  function estimateXP(goal: Goal): number {
    let xp = 50
    xp += goal.tasks.length * 10
    if (goal.tasks.length > 0 && goal.tasks.every(t => t.is_completed)) xp += 25
    if (goal.target_date) xp += 10
    return Math.min(xp, 300)
  }

  function GoalCard({ goal }: { goal: Goal }) {
    const totalTasks = goal.tasks.length
    const doneTasks = goal.tasks.filter(t => t.is_completed).length
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    return (
      <div className={`bg-bg-secondary border rounded-xl overflow-hidden flex ${goal.is_completed ? 'border-accent-green/40 opacity-70' : 'border-bg-border'}`}>
        {/* Main content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {goal.is_completed
                  ? <CheckCircle2 size={18} className="text-accent-green shrink-0" />
                  : <Target size={18} className="text-accent-purple shrink-0" />
                }
                <h3 className={`font-semibold text-text-primary truncate ${goal.is_completed ? 'line-through' : ''}`}>{goal.title}</h3>
              </div>
              {goal.description && <p className="text-xs text-text-secondary mt-1 ml-6">{goal.description}</p>}
              <div className="flex items-center gap-3 mt-1 ml-6 text-xs text-text-muted">
                {goal.target_date && <span>📅 {format(new Date(goal.target_date + 'T00:00:00'), 'dd/MM/yyyy')}</span>}
                <span className="text-accent-gold">
                  {goal.is_completed ? `+${goal.xp_reward} XP` : `~${estimateXP(goal)} XP`}
                </span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0 ml-2">
              {!goal.is_completed && (
                <button onClick={() => { setEditGoal(goal); setShowModal(true) }}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-border rounded-lg">
                  <Pencil size={13} />
                </button>
              )}
              <button onClick={async () => { if (confirm('Excluir meta?')) { await window.api.goals.delete(goal.id); load() } }}
                className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded-lg">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {totalTasks > 0 && (
            <div className="ml-6 mb-3">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>{doneTasks}/{totalTasks} tarefas</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent-purple to-accent-green rounded-full transition-all"
                  style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}

          <div className="ml-6 space-y-1.5">
            {goal.tasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 group">
                <button onClick={() => !goal.is_completed && toggleTask(task.id, task.is_completed)}
                  className="shrink-0 text-text-muted hover:text-accent-purple transition-colors">
                  {task.is_completed ? <CheckSquare size={15} className="text-accent-green" /> : <Square size={15} />}
                </button>
                <span className={`text-sm flex-1 ${task.is_completed ? 'line-through text-text-muted' : 'text-text-secondary'}`}>{task.title}</span>
                {!goal.is_completed && (
                  <button onClick={() => window.api.goals.deleteTask(task.id).then(load)}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-accent-red transition-all">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {!goal.is_completed && (
              <div className="flex gap-2 mt-2">
                <input
                  value={newTask[goal.id] || ''}
                  onChange={e => setNewTask(p => ({ ...p, [goal.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && addTask(goal.id)}
                  placeholder="+ Nova sub-tarefa"
                  className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple"
                />
                <button onClick={() => addTask(goal.id)}
                  className="px-2 py-1 bg-bg-border hover:bg-accent-purple text-text-muted hover:text-white rounded-lg text-xs transition-colors">
                  <Plus size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Big complete button on the right */}
        {!goal.is_completed && (
          <button
            onClick={() => completeGoal(goal.id)}
            className="shrink-0 w-[72px] border-l border-bg-border bg-emerald-950/20 hover:bg-emerald-900/40 flex flex-col items-center justify-center gap-2 text-accent-green/50 hover:text-accent-green transition-all group">
            <CheckCircle2 size={32} className="transition-transform group-hover:scale-110" />
            <span className="text-[10px] font-bold uppercase tracking-wide">Feito!</span>
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fadeIn max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Metas</h1>
          <p className="text-text-secondary text-sm">{active.length} ativa(s) · {completed.length} concluída(s)</p>
        </div>
        <button onClick={() => { setEditGoal(null); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold">
          <Plus size={16} /> Nova meta
        </button>
      </div>

      <div className="space-y-3">
        {goals.length === 0 && (
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
            <Target size={40} className="text-text-muted mx-auto mb-2" />
            <p className="text-text-muted">Nenhuma meta cadastrada.</p>
          </div>
        )}
        {active.map(g => <GoalCard key={g.id} goal={g} />)}
        {completed.length > 0 && (
          <>
            <p className="text-xs text-text-muted font-semibold uppercase tracking-wider pt-2">Concluídas</p>
            {completed.map(g => <GoalCard key={g.id} goal={g} />)}
          </>
        )}
      </div>

      {showModal && (
        <GoalModal
          onClose={() => { setShowModal(false); setEditGoal(null) }}
          onSave={handleSave}
          initial={editGoal || undefined}
        />
      )}
    </div>
  )
}
