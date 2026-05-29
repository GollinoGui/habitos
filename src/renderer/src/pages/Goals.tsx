import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  Plus, Target, CheckSquare, Square, Trash2, X,
  CheckCircle2, Pencil, ChevronDown, ChevronRight, FolderPlus
} from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface GoalTask { id: number; title: string; is_completed: number }
interface Goal {
  id: number; title: string; description?: string; target_date?: string;
  xp_reward: number; is_completed: number; tasks: GoalTask[]; created_at: string;
  folder_id: number | null
}
interface GoalFolder { id: number; name: string; icon: string; color: string }

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
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

  useEffect(() => { load() }, [])

  async function load() {
    const g = await window.api.goals.list()
    setGoals(g as Goal[])
    try {
      const f = await window.api.goalFolders.list()
      setFolders(f as GoalFolder[])
    } catch {
      setFolders([])
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
    if (confirm(`Excluir a pasta "${folder.name}"? As metas dentro dela ficarão sem pasta.`)) {
      await window.api.goalFolders.delete(folder.id)
      load()
    }
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

  function toggleCollapse(key: string) {
    setCollapsed(p => ({ ...p, [key]: !p[key] }))
  }

  function estimateXP(goal: Goal): number {
    let xp = 50
    xp += goal.tasks.length * 10
    if (goal.tasks.length > 0 && goal.tasks.every(t => t.is_completed)) xp += 25
    if (goal.target_date) xp += 10
    return Math.min(xp, 300)
  }

  function openNewGoal(folderId: number | null = null) {
    setEditGoal(null)
    setDefaultFolderId(folderId)
    setShowGoalModal(true)
  }

  const active = goals.filter(g => !g.is_completed)
  const completed = goals.filter(g => g.is_completed)

  function GoalCard({ goal }: { goal: Goal }) {
    const totalTasks = goal.tasks.length
    const doneTasks = goal.tasks.filter(t => t.is_completed).length
    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

    return (
      <div className={`bg-bg-secondary border rounded-xl overflow-hidden flex ${goal.is_completed ? 'border-accent-green/40 opacity-70' : 'border-bg-border'}`}>
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
                <button onClick={() => { setEditGoal(goal); setShowGoalModal(true) }}
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

  function FolderSection({ folder }: { folder: GoalFolder }) {
    const folderGoals = active.filter(g => g.folder_id === folder.id)
    const isOpen = !collapsed[`folder-${folder.id}`]

    return (
      <div className="rounded-xl border border-bg-border overflow-hidden">
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
          <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3">
            {folderGoals.length === 0 && (
              <p className="text-xs text-text-muted text-center py-2">Nenhuma meta nesta pasta ainda.</p>
            )}
            {folderGoals.map(g => <GoalCard key={g.id} goal={g} />)}
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

  const uncategorized = active.filter(g => g.folder_id === null || !folders.find(f => f.id === g.folder_id))
  const showUncategorized = uncategorized.length > 0
  const isUncatOpen = !collapsed['uncategorized']

  return (
    <div className="space-y-4 animate-fadeIn max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Metas</h1>
          <p className="text-text-secondary text-sm">{active.length} ativa(s) · {completed.length} concluída(s)</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditFolder(null); setShowFolderModal(true) }}
            className="flex items-center gap-2 px-3 py-2 border border-bg-border text-text-secondary hover:bg-bg-border rounded-lg text-sm transition-colors">
            <FolderPlus size={15} /> Nova pasta
          </button>
          <button onClick={() => openNewGoal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold transition-colors">
            <Plus size={16} /> Nova meta
          </button>
        </div>
      </div>

      {goals.length === 0 && folders.length === 0 && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
          <Target size={40} className="text-text-muted mx-auto mb-2" />
          <p className="text-text-muted">Nenhuma meta cadastrada.</p>
          <p className="text-xs text-text-muted mt-1">Crie pastas para organizar suas metas por categoria.</p>
        </div>
      )}

      <div className="space-y-3">
        {folders.map(f => <FolderSection key={f.id} folder={f} />)}

        {showUncategorized && (
          <div className="rounded-xl border border-bg-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 bg-bg-secondary cursor-pointer select-none"
              onClick={() => toggleCollapse('uncategorized')}>
              <span className="text-xl">📌</span>
              <span className="font-semibold text-text-primary flex-1">Sem pasta</span>
              <span className="text-xs text-text-muted">{uncategorized.length} {uncategorized.length === 1 ? 'meta' : 'metas'}</span>
              {isUncatOpen ? <ChevronDown size={16} className="text-text-muted" /> : <ChevronRight size={16} className="text-text-muted" />}
            </div>
            {isUncatOpen && (
              <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3">
                {uncategorized.map(g => <GoalCard key={g.id} goal={g} />)}
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
              <div className="border-t border-bg-border bg-bg-primary/30 p-3 space-y-3">
                {completed.map(g => <GoalCard key={g.id} goal={g} />)}
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
    </div>
  )
}
