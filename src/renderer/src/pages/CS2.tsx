import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Crosshair, Plus, Trash2, Trophy, Dumbbell, X } from 'lucide-react'
import SportNotes from '../components/SportNotes'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface CS2Session {
  id: number
  date: string
  type: string
  map: string | null
  kills: number
  deaths: number
  assists: number
  hs_pct: number
  adr: number
  mvps: number
  score: number
  result: string | null
  notes: string | null
}

interface Stats {
  total: number
  competitive: number
  wins: number
  losses: number
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgAdr: number
  kd: number
}

const MAPS = ['Mirage', 'Inferno', 'Dust2', 'Nuke', 'Ancient', 'Anubis', 'Vertigo', 'Overpass', 'Cache', 'Train']

const RESULT_COLOR: Record<string, string> = {
  vitoria: 'text-green-400',
  derrota: 'text-red-400',
  empate: 'text-yellow-400',
}

const RESULT_LABEL: Record<string, string> = {
  vitoria: 'Vitória',
  derrota: 'Derrota',
  empate: 'Empate',
}

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: 'competitivo',
    map: '',
    kills: '',
    deaths: '',
    assists: '',
    hs_pct: '',
    adr: '',
    mvps: '',
    score: '',
    result: '',
    notes: '',
  }
}

export default function CS2(): React.JSX.Element {
  const [sessions, setSessions] = useState<CS2Session[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, competitive: 0, wins: 0, losses: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0, avgAdr: 0, kd: 0 })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    const api = window.api
    if (!api?.cs2) return
    const [s, st] = await Promise.all([api.cs2.list(30), api.cs2.stats()])
    setSessions((s as CS2Session[]) ?? [])
    setStats((st as Stats) ?? { total: 0, competitive: 0, wins: 0, losses: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0, avgAdr: 0, kd: 0 })
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!window.api?.cs2) return
    setSaving(true)
    await window.api.cs2.add({
      date: form.date,
      type: form.type,
      map: form.map || null,
      kills: Number(form.kills) || 0,
      deaths: Number(form.deaths) || 0,
      assists: Number(form.assists) || 0,
      hs_pct: Number(form.hs_pct) || 0,
      adr: Number(form.adr) || 0,
      mvps: Number(form.mvps) || 0,
      score: Number(form.score) || 0,
      result: form.result || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm())
    load()
  }

  async function handleDelete(id: number) {
    if (!window.api?.cs2) return
    await window.api.cs2.delete(id)
    load()
  }

  const winRate = stats.competitive > 0 ? Math.round((stats.wins / stats.competitive) * 100) : null

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/sports" className="p-1.5 rounded-lg hover:bg-bg-secondary transition-colors text-text-muted">
          <ChevronLeft size={20} />
        </Link>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#facc1520' }}>
          <Crosshair size={22} style={{ color: '#facc15' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CS2</h1>
          <p className="text-xs text-text-muted">Partidas, estatísticas e evolução</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
          style={{ backgroundColor: '#facc15', color: '#000' }}
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      <SportNotes sportKey="cs2" color="#facc15" />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Partidas', value: stats.total },
          { label: 'Competitivo', value: stats.competitive },
          { label: 'Win rate', value: winRate !== null ? `${winRate}%` : '—' },
          { label: 'K/D', value: stats.kd > 0 ? stats.kd : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="bg-bg-secondary border border-bg-border rounded-xl p-4">
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* Médias (só se tiver dados) */}
      {stats.competitive > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Média kills', value: stats.avgKills },
            { label: 'Média mortes', value: stats.avgDeaths },
            { label: 'ADR médio', value: stats.avgAdr },
          ].map(({ label, value }) => (
            <div key={label} className="bg-bg-secondary border border-bg-border rounded-xl p-3">
              <p className="text-xs text-text-muted mb-1">{label}</p>
              <p className="text-xl font-bold text-text-primary">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sessions list */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Histórico</h2>
        {sessions.length === 0 ? (
          <div className="bg-bg-secondary border border-dashed border-bg-border rounded-xl p-10 text-center">
            <Crosshair size={32} className="mx-auto mb-3 opacity-30" style={{ color: '#facc15' }} />
            <p className="text-text-muted text-sm">Nenhuma partida registrada ainda</p>
            <p className="text-text-muted text-xs mt-1">Adicione sua primeira partida de CS2</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#facc1515' }}>
                  {s.type === 'competitivo' ? <Trophy size={18} style={{ color: '#facc15' }} /> : <Dumbbell size={18} style={{ color: '#facc15' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary capitalize">{s.type}</span>
                    {s.result && (
                      <span className={`text-xs font-medium ${RESULT_COLOR[s.result] ?? ''}`}>
                        {RESULT_LABEL[s.result] ?? s.result}
                      </span>
                    )}
                    {s.map && <span className="text-xs text-text-muted">{s.map}</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {format(parseISO(s.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  {(s.kills > 0 || s.deaths > 0 || s.assists > 0) && (
                    <div className="flex gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-text-muted">K/D/A: <strong className="text-text-primary">{s.kills}/{s.deaths}/{s.assists}</strong></span>
                      {s.hs_pct > 0 && <span className="text-xs text-text-muted">HS: <strong className="text-text-primary">{s.hs_pct}%</strong></span>}
                      {s.adr > 0 && <span className="text-xs text-text-muted">ADR: <strong className="text-text-primary">{s.adr}</strong></span>}
                      {s.mvps > 0 && <span className="text-xs text-text-muted">MVPs: <strong className="text-text-primary">{s.mvps}</strong></span>}
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

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-bg-primary border border-bg-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-bg-border">
              <h3 className="font-bold text-text-primary">Nova partida de CS2</h3>
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
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="competitivo">Competitivo</option>
                    <option value="premier">Premier</option>
                    <option value="casual">Casual</option>
                    <option value="deathmatch">Deathmatch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Mapa</label>
                  <select value={form.map} onChange={e => setForm(f => ({ ...f, map: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="">Selecionar</option>
                    {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Resultado</label>
                  <select value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="">—</option>
                    <option value="vitoria">Vitória</option>
                    <option value="derrota">Derrota</option>
                    <option value="empate">Empate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-text-muted mb-2 block">Estatísticas</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'kills', label: 'Kills' },
                    { key: 'deaths', label: 'Mortes' },
                    { key: 'assists', label: 'Assistências' },
                    { key: 'hs_pct', label: 'HS %' },
                    { key: 'adr', label: 'ADR' },
                    { key: 'mvps', label: 'MVPs' },
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
                <label className="text-xs text-text-muted mb-1 block">Observações</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Como foi a partida?" rows={2}
                  className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 rounded-xl border border-bg-border text-sm text-text-muted hover:bg-bg-secondary transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#facc15', color: '#000' }}>
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
