import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, CircleDot, Plus, Trash2, Trophy, Dumbbell, X } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface VolleyballSession {
  id: number
  date: string
  type: string
  duration_min: number | null
  position: string | null
  sets_won: number
  sets_lost: number
  aces: number
  digs: number
  blocks: number
  spikes: number
  result: string | null
  notes: string | null
}

interface Stats {
  total: number
  games: number
  trainings: number
  wins: number
  losses: number
}

const POSITIONS = ['Levantador', 'Líbero', 'Ponteiro', 'Oposto', 'Central', 'Ponta']

const RESULT_LABEL: Record<string, string> = {
  vitoria: 'Vitória',
  derrota: 'Derrota',
}

const RESULT_COLOR: Record<string, string> = {
  vitoria: 'text-green-400',
  derrota: 'text-red-400',
}

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: 'treino',
    duration_min: '',
    position: '',
    sets_won: '',
    sets_lost: '',
    aces: '',
    digs: '',
    blocks: '',
    spikes: '',
    result: '',
    notes: '',
  }
}

export default function Volleyball(): React.JSX.Element {
  const [sessions, setSessions] = useState<VolleyballSession[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, games: 0, trainings: 0, wins: 0, losses: 0 })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    const api = window.api
    if (!api?.volleyball) return
    const [s, st] = await Promise.all([api.volleyball.list(30), api.volleyball.stats()])
    setSessions((s as VolleyballSession[]) ?? [])
    setStats((st as Stats) ?? { total: 0, games: 0, trainings: 0, wins: 0, losses: 0 })
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!window.api?.volleyball) return
    setSaving(true)
    await window.api.volleyball.add({
      date: form.date,
      type: form.type,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      position: form.position || null,
      sets_won: Number(form.sets_won) || 0,
      sets_lost: Number(form.sets_lost) || 0,
      aces: Number(form.aces) || 0,
      digs: Number(form.digs) || 0,
      blocks: Number(form.blocks) || 0,
      spikes: Number(form.spikes) || 0,
      result: form.result || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm())
    load()
  }

  async function handleDelete(id: number) {
    if (!window.api?.volleyball) return
    await window.api.volleyball.delete(id)
    load()
  }

  const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : null

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/sports" className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-muted">
          <ChevronLeft size={20} />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#10b98120' }}>
          <CircleDot size={22} style={{ color: '#10b981' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Vôlei</h1>
          <p className="text-xs text-text-muted">Treinos, jogos e evolução técnica</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#10b981' }}
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sessões', value: stats.total },
          { label: 'Jogos', value: stats.games },
          { label: 'Vitórias', value: stats.wins },
          { label: 'Taxa de vitória', value: winRate !== null ? `${winRate}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-secondary border border-bg-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Sessions list */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Histórico</h2>
        {sessions.length === 0 ? (
          <div className="bg-bg-secondary border border-dashed border-bg-border rounded-xl p-10 text-center">
            <CircleDot size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#10b981' }} />
            <p className="text-text-muted text-sm">Nenhuma sessão registrada ainda</p>
            <p className="text-text-muted text-xs mt-1">Adicione seu primeiro treino ou jogo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#10b98115' }}>
                  {s.type === 'jogo' ? <Trophy size={18} style={{ color: '#10b981' }} /> : <Dumbbell size={18} style={{ color: '#10b981' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary capitalize">{s.type}</span>
                    {s.result && (
                      <span className={`text-xs font-medium ${RESULT_COLOR[s.result] ?? ''}`}>
                        {RESULT_LABEL[s.result] ?? s.result}
                      </span>
                    )}
                    {s.type === 'jogo' && (s.sets_won > 0 || s.sets_lost > 0) && (
                      <span className="text-xs text-text-muted">{s.sets_won}×{s.sets_lost} sets</span>
                    )}
                    {s.position && <span className="text-xs text-text-muted">{s.position}</span>}
                    {s.duration_min && <span className="text-xs text-text-muted">{s.duration_min} min</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {format(parseISO(s.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  {(s.aces > 0 || s.digs > 0 || s.blocks > 0 || s.spikes > 0) && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {s.aces > 0 && <span className="text-xs text-text-muted">Aces: <strong className="text-text-primary">{s.aces}</strong></span>}
                      {s.digs > 0 && <span className="text-xs text-text-muted">Defesas: <strong className="text-text-primary">{s.digs}</strong></span>}
                      {s.blocks > 0 && <span className="text-xs text-text-muted">Bloqueios: <strong className="text-text-primary">{s.blocks}</strong></span>}
                      {s.spikes > 0 && <span className="text-xs text-text-muted">Ataques: <strong className="text-text-primary">{s.spikes}</strong></span>}
                    </div>
                  )}
                  {s.notes && <p className="text-xs text-text-muted mt-1 italic">"{s.notes}"</p>}
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de adicionar sessão */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-bg-primary border border-bg-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-bg-border">
              <h3 className="font-bold text-text-primary">Nova sessão de vôlei</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-bg-secondary text-text-muted">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" required />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Tipo</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, result: '' }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="treino">Treino</option>
                    <option value="jogo">Jogo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Duração (min)</label>
                  <input type="number" placeholder="90" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={1} />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Posição</label>
                  <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="">Selecionar</option>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {form.type === 'jogo' && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Sets ganhos</label>
                      <input type="number" value={form.sets_won} onChange={e => setForm(f => ({ ...f, sets_won: e.target.value }))}
                        className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Sets perdidos</label>
                      <input type="number" value={form.sets_lost} onChange={e => setForm(f => ({ ...f, sets_lost: e.target.value }))}
                        className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Resultado</label>
                      <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                        className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                        <option value="">—</option>
                        <option value="vitoria">Vitória</option>
                        <option value="derrota">Derrota</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted mb-2 block">Estatísticas do jogo</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'aces', label: 'Aces' },
                        { key: 'digs', label: 'Defesas' },
                        { key: 'blocks', label: 'Bloqueios' },
                        { key: 'spikes', label: 'Ataques' },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs text-text-muted mb-1 block">{label}</label>
                          <input type="number"
                            value={(form as Record<string, string>)[key]}
                            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-text-muted mb-1 block">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Como foi a sessão?" rows={2}
                  className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-bg-border text-sm text-text-muted hover:bg-bg-secondary transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#10b981' }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
