import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Trophy, Dumbbell, X } from 'lucide-react'
import SportNotes from '../components/SportNotes'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BasketballSession {
  id: number
  date: string
  type: string
  duration_min: number | null
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fg_made: number
  fg_attempted: number
  three_made: number
  three_attempted: number
  result: string | null
  notes: string | null
}

interface Stats {
  total: number
  games: number
  trainings: number
  wins: number
  losses: number
  avgPoints: number
  avgRebounds: number
  avgAssists: number
}

const RESULT_LABEL: Record<string, string> = { vitoria: 'Vitória', derrota: 'Derrota' }
const RESULT_COLOR: Record<string, string> = { vitoria: 'text-green-400', derrota: 'text-red-400' }

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: 'treino',
    duration_min: '',
    points: '',
    rebounds: '',
    assists: '',
    steals: '',
    blocks: '',
    fg_made: '',
    fg_attempted: '',
    three_made: '',
    three_attempted: '',
    result: '',
    notes: '',
  }
}

const COLOR = '#f97316'

export default function Basketball(): React.JSX.Element {
  const [sessions, setSessions] = useState<BasketballSession[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0, games: 0, trainings: 0, wins: 0, losses: 0,
    avgPoints: 0, avgRebounds: 0, avgAssists: 0,
  })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    const api = window.api
    if (!api?.basketball) return
    const [s, st] = await Promise.all([api.basketball.list(30), api.basketball.stats()])
    setSessions((s as BasketballSession[]) ?? [])
    setStats((st as Stats) ?? {
      total: 0, games: 0, trainings: 0, wins: 0, losses: 0,
      avgPoints: 0, avgRebounds: 0, avgAssists: 0,
    })
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!window.api?.basketball) return
    setSaving(true)
    await window.api.basketball.add({
      date: form.date,
      type: form.type,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      points: Number(form.points) || 0,
      rebounds: Number(form.rebounds) || 0,
      assists: Number(form.assists) || 0,
      steals: Number(form.steals) || 0,
      blocks: Number(form.blocks) || 0,
      fg_made: Number(form.fg_made) || 0,
      fg_attempted: Number(form.fg_attempted) || 0,
      three_made: Number(form.three_made) || 0,
      three_attempted: Number(form.three_attempted) || 0,
      result: form.result || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm())
    load()
  }

  async function handleDelete(id: number) {
    if (!window.api?.basketball) return
    await window.api.basketball.delete(id)
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
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${COLOR}20` }}>
          <Trophy size={22} style={{ color: COLOR }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Basquete</h1>
          <p className="text-xs text-text-muted">Jogos, treinos e estatísticas</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: COLOR }}
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      <SportNotes sportKey="basketball" color="#ef4444" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sessões', value: stats.total },
          { label: 'Jogos', value: stats.games },
          { label: 'Média de pontos', value: stats.avgPoints > 0 ? stats.avgPoints : '—' },
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
            <Trophy size={32} className="mx-auto mb-3 opacity-30" style={{ color: COLOR }} />
            <p className="text-text-muted text-sm">Nenhuma sessão registrada ainda</p>
            <p className="text-text-muted text-xs mt-1">Adicione seu primeiro treino ou jogo</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLOR}15` }}>
                  {s.type === 'jogo' ? <Trophy size={18} style={{ color: COLOR }} /> : <Dumbbell size={18} style={{ color: COLOR }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary capitalize">{s.type}</span>
                    {s.result && (
                      <span className={`text-xs font-medium ${RESULT_COLOR[s.result] ?? ''}`}>
                        {RESULT_LABEL[s.result] ?? s.result}
                      </span>
                    )}
                    {s.duration_min && <span className="text-xs text-text-muted">{s.duration_min} min</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {format(parseISO(s.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  {s.type === 'jogo' && (s.points > 0 || s.rebounds > 0 || s.assists > 0 || s.steals > 0 || s.blocks > 0) && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      {s.points > 0 && <span className="text-xs text-text-muted">Pts: <strong className="text-text-primary">{s.points}</strong></span>}
                      {s.rebounds > 0 && <span className="text-xs text-text-muted">Reb: <strong className="text-text-primary">{s.rebounds}</strong></span>}
                      {s.assists > 0 && <span className="text-xs text-text-muted">Ast: <strong className="text-text-primary">{s.assists}</strong></span>}
                      {s.steals > 0 && <span className="text-xs text-text-muted">Rou: <strong className="text-text-primary">{s.steals}</strong></span>}
                      {s.blocks > 0 && <span className="text-xs text-text-muted">Blo: <strong className="text-text-primary">{s.blocks}</strong></span>}
                    </div>
                  )}
                  {s.type === 'jogo' && s.fg_attempted > 0 && (
                    <p className="text-xs text-text-muted mt-0.5">
                      Arremessos: {s.fg_made}/{s.fg_attempted}
                      {s.three_attempted > 0 && ` · 3pts: ${s.three_made}/${s.three_attempted}`}
                    </p>
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-bg-primary border border-bg-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-bg-border">
              <h3 className="font-bold text-text-primary">Nova sessão de basquete</h3>
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

              <div>
                <label className="text-xs text-text-muted mb-1 block">Duração (min)</label>
                <input type="number" placeholder="60" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                  className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={1} />
              </div>

              {form.type === 'jogo' && (
                <>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Resultado</label>
                    <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                      className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                      <option value="">—</option>
                      <option value="vitoria">Vitória</option>
                      <option value="derrota">Derrota</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted mb-2 block">Estatísticas</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'points', label: 'Pontos' },
                        { key: 'rebounds', label: 'Rebotes' },
                        { key: 'assists', label: 'Assistências' },
                        { key: 'steals', label: 'Roubos' },
                        { key: 'blocks', label: 'Bloqueios' },
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

                  <div>
                    <label className="text-xs text-text-muted mb-2 block">Arremessos</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Convertidos</label>
                        <input type="number" value={form.fg_made} onChange={e => setForm(f => ({ ...f, fg_made: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Tentados</label>
                        <input type="number" value={form.fg_attempted} onChange={e => setForm(f => ({ ...f, fg_attempted: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">3pts conv.</label>
                        <input type="number" value={form.three_made} onChange={e => setForm(f => ({ ...f, three_made: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">3pts tent.</label>
                        <input type="number" value={form.three_attempted} onChange={e => setForm(f => ({ ...f, three_attempted: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={0} />
                      </div>
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
                  style={{ backgroundColor: COLOR }}>
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
