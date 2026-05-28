import React, { useEffect, useState, useCallback } from 'react'
import { format, differenceInSeconds } from 'date-fns'
import { Plus, ShieldCheck, AlertTriangle, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react'

interface Addiction {
  id: number; name: string; started_free_at: string; is_active: number
  relapses: { id: number; relapsed_at: string; note: string }[]
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function getMilestones(seconds: number) {
  const days = seconds / 86400
  const milestones = [
    { label: '1 dia', days: 1, icon: '🌱' },
    { label: '7 dias', days: 7, icon: '🌿' },
    { label: '30 dias', days: 30, icon: '🏆' },
    { label: '90 dias', days: 90, icon: '💎' },
    { label: '1 ano', days: 365, icon: '👑' }
  ]
  const next = milestones.find(m => m.days > days)
  const prev = [...milestones].reverse().find(m => m.days <= days)
  return { next, prev, days }
}

function Timer({ startedAt }: { startedAt: string }) {
  const [secs, setSecs] = useState(() => differenceInSeconds(new Date(), new Date(startedAt)))
  useEffect(() => {
    const interval = setInterval(() => setSecs(differenceInSeconds(new Date(), new Date(startedAt))), 1000)
    return () => clearInterval(interval)
  }, [startedAt])
  const { next, prev, days } = getMilestones(secs)
  const pct = next ? Math.min(100, ((days - (prev?.days || 0)) / (next.days - (prev?.days || 0))) * 100) : 100
  return (
    <div>
      <p className="text-3xl font-bold text-accent-blue tabular-nums">{formatDuration(secs)}</p>
      {next && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{prev ? `${prev.icon} ${prev.label}` : 'Início'}</span>
            <span>{next.icon} {next.label}</span>
          </div>
          <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-blue to-accent-purple rounded-full transition-all"
              style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}

function RelapseModal({ addictionId, onClose, onRelapse }: {
  addictionId: number; onClose: () => void; onRelapse: () => void
}) {
  const [note, setNote] = useState('')
  async function handleRelapse() {
    await window.api.addictions.relapse(addictionId, note)
    onRelapse()
    onClose()
  }
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-bg-secondary border border-red-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-bold text-accent-red mb-1">Registrar Recaída</h2>
        <p className="text-text-secondary text-sm mb-4">O contador será reiniciado. Isso é normal — é parte do processo.</p>
        <textarea
          className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-accent-purple"
          rows={3} placeholder="Nota (opcional)..."
          value={note} onChange={e => setNote(e.target.value)}
        />
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button onClick={handleRelapse} className="flex-1 py-2 rounded-lg bg-accent-red hover:bg-red-600 text-white font-semibold text-sm">Confirmar</button>
        </div>
      </div>
    </div>
  )
}

export default function Addictions(): React.JSX.Element {
  const [addictions, setAddictions] = useState<Addiction[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [relapseId, setRelapseId] = useState<number | null>(null)
  const [expandedHistory, setExpandedHistory] = useState<Set<number>>(new Set())

  const load = useCallback(async () => {
    setAddictions(await window.api.addictions.list())
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!newName.trim()) return
    await window.api.addictions.create({
      name: newName.trim(),
      started_free_at: new Date().toISOString()
    })
    setNewName('')
    setShowAdd(false)
    load()
  }

  async function handleDelete(id: number) {
    if (confirm('Excluir este vício do tracker?')) {
      await window.api.addictions.delete(id)
      load()
    }
  }

  return (
    <div className="space-y-4 animate-fadeIn max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vícios & Sobriedade</h1>
          <p className="text-text-secondary text-sm">{addictions.length} monitorado(s)</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold">
          <Plus size={16} /> Adicionar
        </button>
      </div>

      {showAdd && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 flex gap-3 animate-fadeIn">
          <input
            className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple"
            placeholder="Nome do vício (ex: Cigarro, Álcool...)"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <button onClick={handleCreate} className="px-4 py-2 bg-accent-green hover:bg-emerald-600 text-white rounded-lg text-sm font-semibold">Salvar</button>
          <button onClick={() => setShowAdd(false)} className="p-2 text-text-muted hover:text-text-primary"><X size={16} /></button>
        </div>
      )}

      <div className="space-y-4">
        {addictions.length === 0 && (
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
            <ShieldCheck size={40} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-muted">Nenhum vício sendo monitorado.</p>
            <p className="text-xs text-text-muted mt-1">Adicione um para começar a contar sua sobriedade.</p>
          </div>
        )}
        {addictions.map(addiction => {
          const expanded = expandedHistory.has(addiction.id)
          return (
            <div key={addiction.id} className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-lg">{addiction.name}</h3>
                    <p className="text-xs text-text-muted">
                      Desde {format(new Date(addiction.started_free_at), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  </div>
                  <button onClick={() => handleDelete(addiction.id)}
                    className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded-lg">
                    <Trash2 size={14} />
                  </button>
                </div>
                <Timer startedAt={addiction.started_free_at} />
                <div className="flex gap-3 mt-4">
                  <button onClick={() => setRelapseId(addiction.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900 text-accent-red rounded-lg text-xs font-semibold transition-colors">
                    <AlertTriangle size={13} /> Registrar recaída
                  </button>
                  {addiction.relapses.length > 0 && (
                    <button
                      onClick={() => {
                        const next = new Set(expandedHistory)
                        expanded ? next.delete(addiction.id) : next.add(addiction.id)
                        setExpandedHistory(next)
                      }}
                      className="flex items-center gap-1 px-3 py-2 text-text-muted hover:text-text-primary text-xs rounded-lg hover:bg-bg-border transition-colors"
                    >
                      {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      {addiction.relapses.length} recaída(s)
                    </button>
                  )}
                </div>
              </div>
              {expanded && addiction.relapses.length > 0 && (
                <div className="border-t border-bg-border px-5 py-3 space-y-2">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-2">Histórico de recaídas</p>
                  {addiction.relapses.map(r => (
                    <div key={r.id} className="flex gap-3 text-xs">
                      <span className="text-text-muted whitespace-nowrap">{format(new Date(r.relapsed_at), 'dd/MM/yy HH:mm')}</span>
                      {r.note && <span className="text-text-secondary">{r.note}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {relapseId !== null && (
        <RelapseModal
          addictionId={relapseId}
          onClose={() => setRelapseId(null)}
          onRelapse={load}
        />
      )}
    </div>
  )
}
