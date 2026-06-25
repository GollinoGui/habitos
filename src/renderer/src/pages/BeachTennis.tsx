import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus, Trash2, Trophy, Dumbbell, X, Sun, Info } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface BeachTennisSession {
  id: number
  date: string
  type: string
  duration_min: number | null
  partner: string | null
  opponent_1: string | null
  opponent_2: string | null
  sets_won: number
  sets_lost: number
  result: string | null
  tournament_name: string | null
  position: string | null
  category: string | null
  tournament_stage: string | null
  notes: string | null
}

interface Stats {
  total: number
  games: number
  trainings: number
  wins: number
  losses: number
}

const RESULT_LABEL: Record<string, string> = { vitoria: 'Vitória', derrota: 'Derrota' }
const RESULT_COLOR: Record<string, string> = { vitoria: 'text-green-400', derrota: 'text-red-400' }
const TYPE_LABEL: Record<string, string> = { treino: 'Treino', jogo: 'Jogo', torneio: 'Torneio' }
const POSITION_LABEL: Record<string, string> = { direita: 'Direita', esquerda: 'Esquerda' }
const STAGE_LABEL: Record<string, string> = {
  qualificacao: 'Qualificação',
  dezesseis: '16avos',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semifinal: 'Semifinal',
  final: 'Final',
}

const CATEGORIES = [
  { value: 'D', label: 'D — Iniciante', desc: 'Primeiro contato com o esporte, golpes básicos' },
  { value: 'C', label: 'C — Recreativo', desc: 'Joga regularmente, controla rally e saque' },
  { value: 'B', label: 'B — Intermediário', desc: 'Consistência técnica, participa de torneios locais' },
  { value: 'A', label: 'A — Avançado', desc: 'Alto nível técnico-tático, torneios regionais/nacionais' },
  { value: 'PRO', label: 'PRO — Profissional', desc: 'Atleta profissional, circuito CBT/ITF' },
]

function emptyForm() {
  return {
    date: new Date().toISOString().slice(0, 10),
    type: 'treino',
    duration_min: '',
    partner: '',
    opponent_1: '',
    opponent_2: '',
    sets_won: '',
    sets_lost: '',
    result: '',
    tournament_name: '',
    position: '',
    category: '',
    tournament_stage: '',
    notes: '',
  }
}

const COLOR = '#f59e0b'

export default function BeachTennis(): React.JSX.Element {
  const [sessions, setSessions] = useState<BeachTennisSession[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, games: 0, trainings: 0, wins: 0, losses: 0 })
  const [showForm, setShowForm] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)

  async function load() {
    const api = window.api
    if (!api?.beachTennis) return
    const [s, st] = await Promise.all([api.beachTennis.list(30), api.beachTennis.stats()])
    setSessions((s as BeachTennisSession[]) ?? [])
    setStats((st as Stats) ?? { total: 0, games: 0, trainings: 0, wins: 0, losses: 0 })
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!window.api?.beachTennis) return
    setSaving(true)
    await window.api.beachTennis.add({
      date: form.date,
      type: form.type,
      duration_min: form.duration_min ? Number(form.duration_min) : null,
      partner: form.partner || null,
      opponent_1: form.opponent_1 || null,
      opponent_2: form.opponent_2 || null,
      sets_won: Number(form.sets_won) || 0,
      sets_lost: Number(form.sets_lost) || 0,
      result: form.result || null,
      tournament_name: form.tournament_name || null,
      position: form.position || null,
      category: form.category || null,
      tournament_stage: form.tournament_stage || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setShowForm(false)
    setForm(emptyForm())
    load()
  }

  async function handleDelete(id: number) {
    if (!window.api?.beachTennis) return
    await window.api.beachTennis.delete(id)
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
          <Sun size={22} style={{ color: COLOR }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Beach Tennis</h1>
          <p className="text-xs text-text-muted">Partidas, treinos e torneios</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowRanking(v => !v)}
            className="p-2 rounded-xl border border-bg-border text-text-muted hover:bg-bg-secondary transition-colors"
            title="Categorias e ranking"
          >
            <Info size={16} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: COLOR }}
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      {/* Ranking reference card */}
      {showRanking && (
        <div className="bg-bg-secondary border border-bg-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-text-primary">Categorias — Sistema CBT/ITF</h2>
            <button onClick={() => setShowRanking(false)} className="text-text-muted hover:text-text-primary">
              <X size={14} />
            </button>
          </div>
          <div className="space-y-2">
            {CATEGORIES.map(cat => (
              <div key={cat.value} className="flex items-start gap-3">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md shrink-0 mt-0.5"
                  style={{ backgroundColor: `${COLOR}20`, color: COLOR }}
                >
                  {cat.value}
                </span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{cat.label.split(' — ')[1]}</p>
                  <p className="text-xs text-text-muted">{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-bg-border pt-3 space-y-1">
            <p className="text-xs font-semibold text-text-primary">Posições em quadra</p>
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text-primary">Direita</span> — defende o lado direito da quadra; recebe bolas centrais e dificeis, geralmente perfil mais agressivo no overhead.
            </p>
            <p className="text-xs text-text-muted">
              <span className="font-medium text-text-primary">Esquerda</span> — cobre o lado esquerdo; lida com bolas na linha e na diagonal, exige forehand sólido e boa cobertura de lob.
            </p>
          </div>
          <div className="border-t border-bg-border pt-3 space-y-1">
            <p className="text-xs font-semibold text-text-primary">Pontuação em sets</p>
            <p className="text-xs text-text-muted">Sets disputados em 6 games com tie-break a 7 pontos em 6/6. Match em melhor de 3 sets (ou super tie-break no 3º set — 10 pontos). No saque, a bola pode ser servida apenas uma vez.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sessões', value: stats.total },
          { label: 'Partidas', value: stats.games },
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
            <Sun size={32} className="mx-auto mb-3 opacity-30" style={{ color: COLOR }} />
            <p className="text-text-muted text-sm">Nenhuma sessão registrada ainda</p>
            <p className="text-text-muted text-xs mt-1">Adicione seu primeiro treino ou partida</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${COLOR}15` }}>
                  {s.type === 'treino' ? <Dumbbell size={18} style={{ color: COLOR }} /> : <Trophy size={18} style={{ color: COLOR }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-text-primary">{TYPE_LABEL[s.type] ?? s.type}</span>
                    {s.category && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${COLOR}20`, color: COLOR }}>
                        {s.category}
                      </span>
                    )}
                    {s.result && (
                      <span className={`text-xs font-medium ${RESULT_COLOR[s.result] ?? ''}`}>
                        {RESULT_LABEL[s.result] ?? s.result}
                      </span>
                    )}
                    {(s.type === 'jogo' || s.type === 'torneio') && (s.sets_won > 0 || s.sets_lost > 0) && (
                      <span className="text-xs text-text-muted">{s.sets_won}×{s.sets_lost} sets</span>
                    )}
                    {s.tournament_stage && (
                      <span className="text-xs text-text-muted">{STAGE_LABEL[s.tournament_stage] ?? s.tournament_stage}</span>
                    )}
                    {s.duration_min && <span className="text-xs text-text-muted">{s.duration_min} min</span>}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {format(parseISO(s.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {s.position && <span className="text-xs text-text-muted">Posição: <strong className="text-text-primary">{POSITION_LABEL[s.position] ?? s.position}</strong></span>}
                    {s.partner && <span className="text-xs text-text-muted">Parceiro: <strong className="text-text-primary">{s.partner}</strong></span>}
                    {s.tournament_name && <span className="text-xs text-text-muted">Torneio: <strong className="text-text-primary">{s.tournament_name}</strong></span>}
                  </div>
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
              <h3 className="font-bold text-text-primary">Nova sessão de beach tennis</h3>
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
                    <option value="torneio">Torneio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Posição</label>
                  <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="">—</option>
                    <option value="direita">Direita</option>
                    <option value="esquerda">Esquerda</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Categoria</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                    <option value="">—</option>
                    <option value="D">D — Iniciante</option>
                    <option value="C">C — Recreativo</option>
                    <option value="B">B — Intermediário</option>
                    <option value="A">A — Avançado</option>
                    <option value="PRO">PRO — Profissional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Duração (min)</label>
                  <input type="number" placeholder="60" value={form.duration_min} onChange={e => setForm(f => ({ ...f, duration_min: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" min={1} />
                </div>
                <div>
                  <label className="text-xs text-text-muted mb-1 block">Parceiro(a)</label>
                  <input type="text" placeholder="Nome" value={form.partner} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))}
                    className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                </div>
              </div>

              {form.type !== 'treino' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Adversário 1</label>
                      <input type="text" placeholder="Nome" value={form.opponent_1} onChange={e => setForm(f => ({ ...f, opponent_1: e.target.value }))}
                        className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Adversário 2</label>
                      <input type="text" placeholder="Nome" value={form.opponent_2} onChange={e => setForm(f => ({ ...f, opponent_2: e.target.value }))}
                        className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                    </div>
                  </div>

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

                  {form.type === 'torneio' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Nome do torneio</label>
                        <input type="text" placeholder="Ex: Open Verão 2026" value={form.tournament_name}
                          onChange={e => setForm(f => ({ ...f, tournament_name: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary" />
                      </div>
                      <div>
                        <label className="text-xs text-text-muted mb-1 block">Fase</label>
                        <select value={form.tournament_stage} onChange={e => setForm(f => ({ ...f, tournament_stage: e.target.value }))}
                          className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary">
                          <option value="">—</option>
                          <option value="qualificacao">Qualificação</option>
                          <option value="dezesseis">16avos</option>
                          <option value="oitavas">Oitavas</option>
                          <option value="quartas">Quartas</option>
                          <option value="semifinal">Semifinal</option>
                          <option value="final">Final</option>
                        </select>
                      </div>
                    </div>
                  )}
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
