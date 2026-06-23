import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Plus, Target, CheckSquare, Square, Trash2, X,
  CheckCircle2, Pencil, ChevronDown, ChevronRight, FolderPlus
} from 'lucide-react'
import { useProfileStore } from '../store/profileStore'
import SectionHelpButton, { GoodBadExample, HelpTips } from '../components/Help/SectionHelpButton'

interface GoalTask { id: number; title: string; is_completed: number }
interface Goal {
  id: number; title: string; description?: string; target_date?: string;
  xp_reward: number; is_completed: number; tasks: GoalTask[]; created_at: string;
  folder_id: number | null
}
interface GoalFolder { id: number; name: string; icon: string; color: string }

interface GoalCallbacks {
  newTask: Record<number, string>
  setNewTask: React.Dispatch<React.SetStateAction<Record<number, string>>>
  toggleTask: (taskId: number, current: number) => Promise<void>
  addTask: (goalId: number) => Promise<void>
  onCompleteGoal: (goal: Goal) => void
  onLoad: () => Promise<void>
  onEditGoal: (goal: Goal) => void
  onDeleteGoal: (goal: Goal) => void
  estimateXP: (goal: Goal) => number
  onMoveToFolder: (goalId: number, folderId: number | null) => Promise<void>
}

const FOLDER_ICONS = ['📁', '🏋️', '🚀', '🎯', '📚', '🎮', '💪', '🏃', '🧘', '🎸', '🏆', '💡', '🌟', '🎨', '🔬']
const FOLDER_COLORS = ['#7c3aed', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#84cc16']

function FolderModal({ onClose, onSave, initial }: {
  onClose: () => void
  onSave: (d: object) => void
  initial?: Partial<GoalFolder>
}) {
  const [name, setName] = useState(initial?.name || '')
  const [icon, setIcon] = useState(initial?.icon || '📁')
  const [color, setColor] = useState(initial?.color || '#7c3aed')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">{initial?.id ? 'Editar' : 'Nova'} Pasta</h2>
          <button onClick={onClose}><X size={18} className="text-text-muted" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Academia"
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {FOLDER_ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`text-lg w-9 h-9 rounded-lg flex items-center justify-center transition-all
                    ${icon === ic ? 'bg-accent-purple ring-2 ring-accent-purple ring-offset-1 ring-offset-bg-secondary' : 'bg-bg-border hover:bg-bg-border/80'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-2 block">Cor</label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-white ring-offset-1 ring-offset-bg-secondary scale-110' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button onClick={() => name && onSave({ name, icon, color })} disabled={!name}
            className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalModal({ onClose, onSave, initial, folders, defaultFolderId }: {
  onClose: () => void
  onSave: (d: object) => void
  initial?: Partial<Goal>
  folders: GoalFolder[]
  defaultFolderId?: number | null
}) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [targetDate, setTargetDate] = useState(initial?.target_date || '')
  const [folderId, setFolderId] = useState<number | null>(
    initial?.id !== undefined ? (initial.folder_id ?? null) : (defaultFolderId ?? null)
  )

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">
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
          <div className={folders.length > 0 ? 'flex gap-3' : ''}>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Prazo</label>
              <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
            </div>
            {folders.length > 0 && (
              <div className="flex-1">
                <label className="text-xs text-text-secondary mb-1 block">Pasta</label>
                <select value={folderId ?? ''} onChange={e => setFolderId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple">
                  <option value="">Sem pasta</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.icon} {f.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button
            onClick={() => title && onSave({ title, description, target_date: targetDate || null, xp_reward: 100, folder_id: folderId })}
            disabled={!title}
            className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm disabled:opacity-50">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function CompleteGoalModal({ goal, xp, onConfirm, onClose }: {
  goal: Goal; xp: number; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center animate-pop-in max-h-[90vh] overflow-y-auto">
        <div className="relative flex justify-center mb-5">
          <span className="absolute -top-4 left-4 text-2xl animate-float" style={{ animationDelay: '0s' }}>✨</span>
          <span className="absolute -top-2 right-4 text-xl animate-float" style={{ animationDelay: '0.35s' }}>🎊</span>
          <span className="absolute top-8 -left-2 text-lg animate-float" style={{ animationDelay: '0.6s' }}>⭐</span>
          <span className="absolute top-8 -right-2 text-lg animate-float" style={{ animationDelay: '0.9s' }}>🏆</span>
          <div className="w-20 h-20 rounded-full bg-accent-green/15 border-2 border-accent-green/40 flex items-center justify-center animate-bounce-in">
            <CheckCircle2 size={40} className="text-accent-green animate-glow-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-text-primary mb-2">Concluir Meta?</h2>
        <p className="text-sm text-text-secondary mb-5 px-2">{goal.title}</p>
        <div className="flex justify-center mb-4">
          <div className="px-6 py-3 bg-accent-gold/10 border border-accent-gold/30 rounded-full animate-bounce-in" style={{ animationDelay: '0.15s' }}>
            <span className="text-accent-gold font-bold text-2xl animate-count-up" style={{ display: 'inline-block', animationDelay: '0.2s' }}>+{xp} XP</span>
          </div>
        </div>
        {goal.tasks.length > 0 && (
          <p className="text-xs text-text-muted mb-5">
            {goal.tasks.filter(t => t.is_completed).length}/{goal.tasks.length} sub-tarefas concluídas
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-bg-border text-text-secondary hover:bg-bg-border text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-accent-green hover:bg-green-500 text-white font-bold text-sm transition-all hover:shadow-lg hover:shadow-green-500/20">
            Concluir! 🎉
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalCard({ goal, cbs, index = 0 }: { goal: Goal; cbs: GoalCallbacks; index?: number }) {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [justChecked, setJustChecked] = useState<Set<number>>(new Set())
  const [displayPct, setDisplayPct] = useState(0)
  const { newTask, setNewTask, toggleTask, addTask, onCompleteGoal, onLoad, onEditGoal, onDeleteGoal, estimateXP } = cbs

  const totalTasks = goal.tasks.length
  const doneTasks = goal.tasks.filter(t => t.is_completed).length
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(pct), 80 + index * 60)
    return () => clearTimeout(t)
  }, [pct, index])

  async function handleToggleTask(taskId: number, current: number) {
    if (!current) {
      setJustChecked(prev => new Set([...prev, taskId]))
      setTimeout(() => setJustChecked(prev => { const s = new Set(prev); s.delete(taskId); return s }), 600)
    }
    await toggleTask(taskId, current)
  }

  function startEditTask(task: GoalTask) {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
  }

  async function saveEditTask(taskId: number) {
    const trimmed = editingTitle.trim()
    const original = goal.tasks.find(t => t.id === taskId)?.title
    if (trimmed && trimmed !== original) {
      await window.api.goals.updateTask(taskId, trimmed)
      onLoad()
    }
    setEditingTaskId(null)
  }

  return (
    <div
      className={`bg-bg-secondary border rounded-xl overflow-hidden flex animate-card-in hover:shadow-lg hover:shadow-accent-purple/5 ${goal.is_completed ? 'border-accent-green/40 opacity-70' : 'border-bg-border'}`}
      style={{ animationDelay: `${index * 70}ms` }}
      draggable={!goal.is_completed}
      onDragStart={e => {
        e.dataTransfer.setData('text/goalid', String(goal.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
    >
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
              <button onClick={() => onEditGoal(goal)}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-border rounded-lg">
                <Pencil size={13} />
              </button>
            )}
            <button onClick={() => onDeleteGoal(goal)}
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
              <div className="h-full bg-gradient-to-r from-accent-purple to-accent-green rounded-full"
                style={{ width: `${displayPct}%`, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
          </div>
        )}

        <div className="ml-6 space-y-1.5">
          {goal.tasks.map(task => (
            <div key={task.id} className="flex items-center gap-2 group">
              <button onClick={() => !goal.is_completed && handleToggleTask(task.id, task.is_completed)}
                className="shrink-0 text-text-muted hover:text-accent-purple transition-colors">
                {task.is_completed
                  ? <CheckSquare size={15} className={`text-accent-green ${justChecked.has(task.id) ? 'animate-check-pop' : ''}`} />
                  : <Square size={15} />}
              </button>
              {editingTaskId === task.id ? (
                <input
                  autoFocus
                  value={editingTitle}
                  onChange={e => setEditingTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') saveEditTask(task.id)
                    if (e.key === 'Escape') setEditingTaskId(null)
                  }}
                  onBlur={() => saveEditTask(task.id)}
                  className="flex-1 bg-bg-primary border border-accent-purple/50 rounded px-2 py-0.5 text-sm text-text-primary focus:outline-none"
                />
              ) : (
                <span
                  onDoubleClick={() => !goal.is_completed && startEditTask(task)}
                  title={!goal.is_completed ? 'Duplo clique para editar' : undefined}
                  className={`text-sm flex-1 ${task.is_completed ? 'line-through text-text-muted' : 'text-text-secondary'} ${!goal.is_completed ? 'cursor-text' : ''}`}>
                  {task.title}
                </span>
              )}
              {!goal.is_completed && editingTaskId !== task.id && (
                <button onClick={() => window.api.goals.deleteTask(task.id).then(onLoad)}
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

      {!goal.is_completed && (
        <button
          onClick={() => onCompleteGoal(goal)}
          className="shrink-0 w-[72px] border-l border-bg-border bg-emerald-950/20 hover:bg-emerald-900/40 flex flex-col items-center justify-center gap-2 text-accent-green/50 hover:text-accent-green transition-all group">
          <CheckCircle2 size={32} className="transition-transform group-hover:scale-110" />
          <span className="text-[10px] font-bold uppercase tracking-wide">Feito!</span>
        </button>
      )}
    </div>
  )
}

function FolderSection({
  folder, active, collapsed, toggleCollapse,
  setEditFolder, setShowFolderModal, deleteFolder, openNewGoal, cbs, index = 0
}: {
  folder: GoalFolder
  active: Goal[]
  collapsed: Record<string, boolean>
  toggleCollapse: (key: string) => void
  setEditFolder: React.Dispatch<React.SetStateAction<GoalFolder | null>>
  setShowFolderModal: React.Dispatch<React.SetStateAction<boolean>>
  deleteFolder: (folder: GoalFolder) => Promise<void>
  openNewGoal: (folderId: number | null) => void
  cbs: GoalCallbacks
  index?: number
}) {
  const [isDragOver, setIsDragOver] = useState(false)
  const folderGoals = active.filter(g => g.folder_id === folder.id)
  const isOpen = !collapsed[`folder-${folder.id}`]

  return (
    <div
      className={`rounded-xl border overflow-hidden animate-card-in transition-all ${isDragOver ? 'border-accent-purple ring-2 ring-accent-purple/30' : 'border-bg-border'}`}
      style={{ animationDelay: `${index * 80}ms` }}
      onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false) }}
      onDrop={async e => {
        e.preventDefault()
        setIsDragOver(false)
        const goalId = Number(e.dataTransfer.getData('text/goalid'))
        if (goalId) await cbs.onMoveToFolder(goalId, folder.id)
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary cursor-pointer select-none"
        onClick={() => toggleCollapse(`folder-${folder.id}`)}>
        <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: folder.color }} />
        <span className="text-xl">{folder.icon}</span>
        <span className="font-semibold text-text-primary flex-1">{folder.name}</span>
        <span className="text-xs text-text-muted">{folderGoals.length} {folderGoals.length === 1 ? 'meta' : 'metas'}</span>
        <button
          onClick={e => { e.stopPropagation(); setEditFolder(folder); setShowFolderModal(true) }}
          className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-border rounded transition-colors">
          <Pencil size={13} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); deleteFolder(folder) }}
          className="p-1 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded transition-colors">
          <Trash2 size={13} />
        </button>
        {isOpen ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
      </div>

      {isOpen && (
        <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3 animate-slide-down">
          {folderGoals.length === 0 && (
            <p className="text-xs text-text-muted text-center py-2">Nenhuma meta nesta pasta ainda.</p>
          )}
          {folderGoals.map((g, i) => <GoalCard key={g.id} goal={g} cbs={cbs} index={i} />)}
          <button
            onClick={() => openNewGoal(folder.id)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-bg-border text-text-muted hover:text-text-primary hover:border-accent-purple/50 text-xs transition-colors">
            <Plus size={13} /> Nova meta em "{folder.name}"
          </button>
        </div>
      )}
    </div>
  )
}

interface UndoToast {
  id: number
  message: string
  onUndo: () => void
}

let undoIdCounter = 0

export default function Goals(): React.JSX.Element {
  const { fetchProfile } = useProfileStore()
  const [goals, setGoals] = useState<Goal[]>([])
  const [folders, setFolders] = useState<GoalFolder[]>([])
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [editGoal, setEditGoal] = useState<Goal | null>(null)
  const [editFolder, setEditFolder] = useState<GoalFolder | null>(null)
  const [defaultFolderId, setDefaultFolderId] = useState<number | null>(null)
  const [newTask, setNewTask] = useState<Record<number, string>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [confirmGoal, setConfirmGoal] = useState<Goal | null>(null)
  const [undoToasts, setUndoToasts] = useState<UndoToast[]>([])
  const [loading, setLoading] = useState(true)
  const [isDragOverUncat, setIsDragOverUncat] = useState(false)

  function showUndo(message: string, onUndo: () => void) {
    const id = ++undoIdCounter
    setUndoToasts(prev => [...prev, { id, message, onUndo }])
    setTimeout(() => setUndoToasts(prev => prev.filter(t => t.id !== id)), 5000)
  }

  function dismissUndo(id: number) {
    setUndoToasts(prev => prev.filter(t => t.id !== id))
  }

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const g = await window.api.goals.list()
      setGoals(g as Goal[])
      try {
        const f = await window.api.goalFolders.list()
        setFolders(f as GoalFolder[])
      } catch {
        setFolders([])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveGoal(data: object) {
    if (editGoal) {
      await window.api.goals.update(editGoal.id, data)
    } else {
      await window.api.goals.create(data)
    }
    setShowGoalModal(false); setEditGoal(null); setDefaultFolderId(null)
    load()
  }

  async function handleSaveFolder(data: object) {
    if (editFolder) {
      await window.api.goalFolders.update(editFolder.id, data)
    } else {
      await window.api.goalFolders.create(data)
    }
    setShowFolderModal(false); setEditFolder(null)
    load()
  }

  async function deleteFolder(folder: GoalFolder) {
    setFolders(prev => prev.filter(f => f.id !== folder.id))
    let undone = false
    showUndo(`Pasta "${folder.name}" excluída`, () => {
      undone = true
      load()
    })
    setTimeout(async () => {
      if (!undone) {
        await window.api.goalFolders.delete(folder.id)
        load()
      }
    }, 5100)
  }

  async function handleConfirmComplete() {
    if (!confirmGoal) return
    await window.api.goals.complete(confirmGoal.id)
    await fetchProfile()
    setConfirmGoal(null)
    load()
  }

  function estimateXP(goal: Goal): number {
    let xp = 50
    xp += goal.tasks.length * 10
    if (goal.tasks.length > 0 && goal.tasks.every(t => t.is_completed)) xp += 25
    if (goal.target_date) xp += 10
    return Math.min(xp, 300)
  }

  function toggleCollapse(key: string) {
    setCollapsed(p => ({ ...p, [key]: !p[key] }))
  }

  function openNewGoal(folderId: number | null = null) {
    setEditGoal(null)
    setDefaultFolderId(folderId)
    setShowGoalModal(true)
  }

  const cbs: GoalCallbacks = {
    newTask,
    setNewTask,
    toggleTask: async (taskId, current) => {
      await window.api.goals.completeTask(taskId, !current)
      load()
    },
    addTask: async (goalId) => {
      const title = (newTask[goalId] || '').trim()
      if (!title) return
      await window.api.goals.addTask(goalId, title)
      setNewTask(p => ({ ...p, [goalId]: '' }))
      load()
    },
    onCompleteGoal: (goal) => setConfirmGoal(goal),
    onLoad: load,
    onEditGoal: (goal) => { setEditGoal(goal); setShowGoalModal(true) },
    onMoveToFolder: async (goalId, folderId) => {
      const goal = goals.find(g => g.id === goalId)
      if (!goal || goal.folder_id === folderId) return
      await window.api.goals.update(goalId, {
        title: goal.title,
        description: goal.description ?? '',
        target_date: goal.target_date ?? null,
        xp_reward: goal.xp_reward,
        folder_id: folderId,
      })
      load()
    },
    onDeleteGoal: (goal) => {
      setGoals(prev => prev.filter(g => g.id !== goal.id))
      let undone = false
      showUndo(`Meta "${goal.title}" excluída`, () => {
        undone = true
        load()
      })
      setTimeout(async () => {
        if (!undone) {
          await window.api.goals.delete(goal.id)
          load()
        }
      }, 5100)
    },
    estimateXP
  }

  const active = goals.filter(g => !g.is_completed)
  const completed = goals.filter(g => g.is_completed)
  const uncategorized = active.filter(g => g.folder_id === null || !folders.find(f => f.id === g.folder_id))
  const showUncategorized = uncategorized.length > 0
  const isUncatOpen = !collapsed['uncategorized']

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 animate-fadeIn max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">Metas</h1>
            <SectionHelpButton sectionId="goals" title="Como usar as Metas" emoji="🎯">
              <p>
                Uma meta funciona melhor quando é <strong className="text-text-primary">específica</strong> e tem um{' '}
                <strong className="text-text-primary">prazo</strong> — não uma atividade genérica do dia a dia.
              </p>
              <GoodBadExample
                bad='"Estudar inglês" — isso é um hábito, não uma meta. Sem prazo nem critério de "pronto".'
                good='"Chegar ao nível B1 de inglês até agosto" — tem um alvo claro e uma data.'
              />
              <p className="text-text-muted text-xs">
                Dica: atividades recorrentes do dia a dia (estudar, treinar, ler) ficam melhor na seção{' '}
                <strong>Hábitos</strong>. Use Metas para objetivos maiores que você quer concluir uma vez.
              </p>
              <HelpTips
                items={[
                  'Quebre a meta em sub-tarefas (ex: "Completar curso A1", "Completar curso A2"...).',
                  'Defina um prazo para criar senso de urgência.',
                  'Organize metas parecidas em pastas (ex: "Carreira", "Saúde").'
                ]}
              />
            </SectionHelpButton>
          </div>
          <p className="text-text-secondary text-sm">Defina objetivos e divida em etapas aqui · {active.length} ativa(s) · {completed.length} concluída(s)</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => { setEditFolder(null); setShowFolderModal(true) }}
            className="flex items-center gap-1.5 px-2.5 py-2 border border-bg-border text-text-secondary hover:bg-bg-border rounded-lg text-sm transition-colors">
            <FolderPlus size={15} /><span className="hidden sm:inline">Nova pasta</span>
          </button>
          <button onClick={() => openNewGoal(null)}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-colors animate-jump-in">
            <Plus size={15} /> Meta
          </button>
        </div>
      </div>

      {goals.length === 0 && folders.length === 0 && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
          <Target size={40} className="text-text-muted mx-auto mb-2 animate-float" />
          <p className="text-text-muted">Nenhuma meta cadastrada.</p>
          <p className="text-xs text-text-muted mt-1">Crie pastas para organizar suas metas por categoria.</p>
        </div>
      )}

      <div className="space-y-3">
        {folders.map((f, i) => (
          <FolderSection
            key={f.id}
            folder={f}
            active={active}
            collapsed={collapsed}
            toggleCollapse={toggleCollapse}
            setEditFolder={setEditFolder}
            setShowFolderModal={setShowFolderModal}
            deleteFolder={deleteFolder}
            openNewGoal={openNewGoal}
            cbs={cbs}
            index={i}
          />
        ))}

        {showUncategorized && (
          <div
            className={`rounded-xl border overflow-hidden transition-all ${isDragOverUncat ? 'border-accent-purple ring-2 ring-accent-purple/30' : 'border-bg-border'}`}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOverUncat(true) }}
            onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOverUncat(false) }}
            onDrop={async e => {
              e.preventDefault()
              setIsDragOverUncat(false)
              const goalId = Number(e.dataTransfer.getData('text/goalid'))
              if (goalId) await cbs.onMoveToFolder(goalId, null)
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary cursor-pointer select-none"
              onClick={() => toggleCollapse('uncategorized')}>
              <span className="text-xl">📌</span>
              <span className="font-semibold text-text-primary flex-1">Sem pasta</span>
              <span className="text-xs text-text-muted">{uncategorized.length} {uncategorized.length === 1 ? 'meta' : 'metas'}</span>
              {isUncatOpen ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
            </div>
            {isUncatOpen && (
              <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3 animate-slide-down">
                {uncategorized.map((g, i) => <GoalCard key={g.id} goal={g} cbs={cbs} index={i} />)}
              </div>
            )}
          </div>
        )}

        {completed.length > 0 && (
          <div className="rounded-xl border border-bg-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary cursor-pointer select-none"
              onClick={() => toggleCollapse('completed')}>
              <span className="text-xl">✅</span>
              <span className="font-semibold text-text-primary flex-1">Concluídas</span>
              <span className="text-xs text-text-muted">{completed.length}</span>
              {!collapsed['completed'] ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
            </div>
            {!collapsed['completed'] && (
              <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3 animate-slide-down">
                {completed.map((g, i) => <GoalCard key={g.id} goal={g} cbs={cbs} index={i} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {showGoalModal && (
        <GoalModal
          onClose={() => { setShowGoalModal(false); setEditGoal(null); setDefaultFolderId(null) }}
          onSave={handleSaveGoal}
          initial={editGoal || undefined}
          folders={folders}
          defaultFolderId={defaultFolderId}
        />
      )}

      {showFolderModal && (
        <FolderModal
          onClose={() => { setShowFolderModal(false); setEditFolder(null) }}
          onSave={handleSaveFolder}
          initial={editFolder || undefined}
        />
      )}

      {confirmGoal && (
        <CompleteGoalModal
          goal={confirmGoal}
          xp={estimateXP(confirmGoal)}
          onConfirm={handleConfirmComplete}
          onClose={() => setConfirmGoal(null)}
        />
      )}

      {/* Undo toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-50 pointer-events-none">
        {undoToasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-bg-secondary border border-bg-border rounded-xl shadow-2xl animate-slide-up text-sm">
            <span className="text-text-primary">{toast.message}</span>
            <button
              onClick={() => { toast.onUndo(); dismissUndo(toast.id) }}
              className="px-3 py-1 bg-accent-purple hover:bg-purple-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Desfazer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
