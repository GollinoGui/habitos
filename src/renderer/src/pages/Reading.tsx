import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle2, Clock, Plus, Star, Trash2 } from 'lucide-react'
import SectionHelpButton, { HelpTips } from '../components/Help/SectionHelpButton'

interface MediaItem {
  id: number; title: string; type: string; author: string; total_pages: number;
  current_page: number; current_season: number; status: string; started_at: string;
  finished_at: string; cover_emoji: string; rating: number | null
}

const TYPE_CONFIG: Record<string, { label: string; unit: string; unitPlural: string; creator: string; color: string; bgColor: string; emojis: string[] }> = {
  book:    { label: 'Livro',   unit: 'pág',   unitPlural: 'Páginas',   creator: 'Autor',   color: 'text-blue-400',    bgColor: 'bg-blue-950/40',    emojis: ['📚','📖','📕','📗','📘','📙','🔖'] },
  manga:   { label: 'Mangá',   unit: 'cap',   unitPlural: 'Capítulos', creator: 'Autor',   color: 'text-emerald-400', bgColor: 'bg-emerald-950/40', emojis: ['📓','📒','📔','🗒️','🎌','⛩️','🌸'] },
  series:  { label: 'Série',   unit: 'ep',    unitPlural: 'Episódios', creator: 'Criador', color: 'text-amber-400',   bgColor: 'bg-amber-950/40',   emojis: ['📺','🎬','🎥','📡','🎞️','📽️','🎭'] },
  movie:   { label: 'Filme',   unit: 'min',   unitPlural: 'Minutos',   creator: 'Diretor', color: 'text-red-400',     bgColor: 'bg-red-950/40',     emojis: ['🎬','🍿','🎥','🎞️','📽️','🎭','🏆'] },
  article: { label: 'Artigo',  unit: 'min',   unitPlural: 'Min. leit.',creator: 'Fonte',   color: 'text-slate-400',   bgColor: 'bg-slate-800/40',   emojis: ['📰','📄','📃','🗞️','📋','📑','✍️'] },
}

const STATUS_LABELS: Record<string, string> = {
  reading: 'Em andamento', done: 'Concluído', paused: 'Pausado', wishlist: 'Na lista'
}

function progressPct(item: MediaItem): number {
  if (!item.total_pages || item.total_pages === 0) return item.status === 'done' ? 100 : 0
  return Math.min(100, Math.round((item.current_page / item.total_pages) * 100))
}

function cfg(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.book
}

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange?.(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={13}
            className={n <= (hovered || value || 0) ? 'fill-amber-400 text-amber-400' : 'text-text-muted'}
          />
        </button>
      ))}
    </div>
  )
}

export default function Reading(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [items, setItems] = useState<MediaItem[]>([])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showSession, setShowSession] = useState<number | null>(null)
  const [sessionMins, setSessionMins] = useState('')
  const [sessionPages, setSessionPages] = useState('')
  const [sessionSeason, setSessionSeason] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionRating, setSessionRating] = useState(0)
  const [todayMins, setTodayMins] = useState(0)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('book')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [emoji, setEmoji] = useState('📚')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [its, mins] = await Promise.all([
        window.api.media.list(),
        window.api.media.todayMinutes(today)
      ])
      const KNOWN_STATUSES = new Set(['reading', 'done', 'paused', 'wishlist'])
      const healed = await Promise.all((its as MediaItem[]).map(async item => {
        if (KNOWN_STATUSES.has(item.status)) return item
        // Heals legacy/stale status values (e.g. old Supabase default 'want_to_read')
        // that block progress tracking since they don't match any known status.
        await window.api.media.update(item.id, { status: 'reading' })
        return { ...item, status: 'reading' }
      }))
      setItems(healed)
      setTodayMins(mins as number)
    } finally {
      setLoading(false)
    }
  }

  async function addItem() {
    if (!title.trim()) return
    await window.api.media.create({
      title, type, author: author || undefined,
      total_pages: totalPages ? Number(totalPages) : undefined,
      cover_emoji: emoji, started_at: today
    })
    setTitle(''); setAuthor(''); setTotalPages('')
    setEmoji(cfg(type).emojis[0])
    setShowForm(false)
    loadAll()
  }

  async function deleteItem(id: number) {
    await window.api.media.delete(id)
    loadAll()
  }

  async function updateStatus(item: MediaItem, status: string) {
    await window.api.media.update(item.id, {
      status,
      finished_at: status === 'done' ? today : undefined
    })
    loadAll()
  }

  async function setRating(item: MediaItem, rating: number) {
    await window.api.media.update(item.id, { rating })
    loadAll()
  }

  async function logSession(id: number, itemType: string) {
    const mins = parseInt(sessionMins) || 0
    const notes = sessionNotes.trim() || undefined
    const rating = sessionRating || undefined
    if (itemType === 'series') {
      const season = parseInt(sessionSeason) || 1
      const episode = parseInt(sessionPages) || 0
      if (episode === 0 && mins === 0 && !notes && !rating) return
      await window.api.media.update(id, { current_season: season, current_page: episode })
      if (mins > 0 || notes || rating) {
        await window.api.media.logSession({ media_id: id, date: today, minutes_read: mins, pages_read: 0, notes, rating })
      }
    } else {
      const pages = parseInt(sessionPages) || 0
      if (mins === 0 && pages === 0 && !notes && !rating) return
      await window.api.media.logSession({ media_id: id, date: today, minutes_read: mins, pages_read: pages, notes, rating })
    }
    setSessionMins(''); setSessionPages(''); setSessionSeason(''); setSessionNotes(''); setSessionRating(0); setShowSession(null)
    loadAll()
  }

  function handleTypeChange(t: string) {
    setType(t)
    setEmoji(cfg(t).emojis[0])
  }

  const filtered = items.filter(i => {
    const matchType = typeFilter === 'all' || i.type === typeFilter
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchType && matchStatus
  })

  const inProgress = items.filter(i => i.status === 'reading').length
  const done = items.filter(i => i.status === 'done').length

  const TYPE_TABS = [
    { value: 'all',     label: '🌐 Todos' },
    { value: 'book',    label: '📚 Livros' },
    { value: 'series',  label: '📺 Séries' },
    { value: 'movie',   label: '🎬 Filmes' },
    { value: 'manga',   label: '📓 Mangás' },
    { value: 'article', label: '📰 Artigos' },
  ]

  const STATUS_TABS = [
    { value: 'all',      label: 'Todos' },
    { value: 'reading',  label: 'Em andamento' },
    { value: 'done',     label: 'Concluídos' },
    { value: 'paused',   label: 'Pausados' },
    { value: 'wishlist', label: 'Lista de desejos' },
  ]

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary">Mídia</h1>
            <SectionHelpButton sectionId="reading" title="Como usar a Mídia" emoji="📚">
              <p>
                Cadastre livros, séries, filmes ou mangás que está consumindo e registre{' '}
                <strong className="text-text-primary">sessões</strong> (páginas lidas, episódios assistidos) para
                acompanhar seu progresso.
              </p>
              <HelpTips
                items={[
                  'Defina o total de páginas/episódios para ver a barra de progresso.',
                  'Avalie com estrelas quando finalizar para guardar seu histórico de avaliações.',
                  'Registrar sessões com frequência também desbloqueia conquistas.'
                ]}
              />
            </SectionHelpButton>
          </div>
          <p className="text-text-secondary text-sm mt-1">Livros, filmes, séries, mangás e mais</p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-3 text-center">
          <span className="text-xl">▶️</span>
          <p className="text-lg font-bold text-text-primary mt-0.5">{inProgress}</p>
          <p className="text-[10px] text-text-muted leading-tight">Em andamento</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-3 text-center">
          <span className="text-xl">✅</span>
          <p className="text-lg font-bold text-text-primary mt-0.5">{done}</p>
          <p className="text-[10px] text-text-muted leading-tight">Concluídos</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-3 text-center">
          <span className="text-xl">⏱️</span>
          <p className="text-lg font-bold text-text-primary mt-0.5">{todayMins}min</p>
          <p className="text-[10px] text-text-muted leading-tight">Hoje</p>
        </div>
      </div>

      {/* Type filter — horizontal scroll */}
      <div className="scroll-x flex gap-2 pb-1">
        {TYPE_TABS.map(({ value, label }) => (
          <button key={value} onClick={() => setTypeFilter(value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === value
                ? 'bg-accent-purple text-white'
                : 'bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Status filter — horizontal scroll */}
      <div className="scroll-x flex gap-2 pb-1">
        {STATUS_TABS.map(({ value, label }) => (
          <button key={value} onClick={() => setStatusFilter(value)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === value
                ? 'bg-bg-border text-text-primary'
                : 'text-text-muted hover:text-text-secondary'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
          {/* Type selector */}
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TYPE_CONFIG).map(([v, c]) => (
              <button key={v} onClick={() => handleTypeChange(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  type === v
                    ? 'border-accent-purple bg-accent-purple/10 text-accent-purple'
                    : 'border-bg-border text-text-muted hover:text-text-secondary'
                }`}>
                {c.emojis[0]} {c.label}
              </button>
            ))}
          </div>

          {/* Emoji picker filtered by type */}
          <div className="flex flex-wrap gap-2">
            {cfg(type).emojis.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? 'bg-accent-purple/20 ring-2 ring-accent-purple' : 'hover:bg-bg-border'}`}>
                {e}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Título *"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
            <input
              value={author} onChange={e => setAuthor(e.target.value)}
              placeholder={`${cfg(type).creator} (opcional)`}
              className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
            <input
              value={totalPages} onChange={e => setTotalPages(e.target.value)}
              placeholder={cfg(type).unitPlural}
              type="number"
              className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
          </div>

          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
              Adicionar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Items grid */}
      {filtered.length === 0 && (
        <p className="text-text-muted text-sm">Nenhum item nesta categoria.</p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(item => {
          const pct = progressPct(item)
          const tc = cfg(item.type)
          const hasProgress = item.total_pages > 0 && item.type !== 'movie'
          return (
            <div key={item.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{item.cover_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">{item.title}</p>
                  {item.author && <p className="text-xs text-text-muted">{item.author}</p>}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${tc.bgColor} ${tc.color}`}>
                      {tc.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.status === 'done'     ? 'bg-emerald-950/40 text-accent-green' :
                      item.status === 'reading'  ? 'bg-purple-950/40 text-accent-purple' :
                      item.status === 'wishlist' ? 'bg-amber-950/40 text-amber-400' :
                      'bg-bg-border text-text-muted'
                    }`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-text-muted hover:text-accent-red transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>

              {item.type === 'series' && item.status !== 'wishlist' && (item.current_page > 0 || item.current_season > 1) && (
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <span className="font-semibold text-text-secondary text-sm">
                    T{item.current_season ?? 1} E{item.current_page ?? 0}
                  </span>
                </div>
              )}
              {hasProgress && (
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>{item.current_page}/{item.total_pages} {tc.unit}</span>
                    <span>
                      {pct}%
                      {item.total_pages > item.current_page && ` · faltam ${item.total_pages - item.current_page} ${tc.unit}`}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {item.status === 'done' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Avaliação:</span>
                  <StarRating value={item.rating} onChange={r => setRating(item, r)} />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {item.status === 'reading' && (
                  <button
                    onClick={() => {
                      setShowSession(showSession === item.id ? null : item.id)
                      setSessionMins(''); setSessionPages(''); setSessionSeason(''); setSessionNotes(''); setSessionRating(0)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-bg-border hover:bg-bg-border/70 text-text-secondary text-xs font-medium rounded-lg transition-colors"
                  >
                    <Clock size={12} /> Registrar sessão
                  </button>
                )}
                {item.status !== 'done' && (
                  <button
                    onClick={() => updateStatus(item, 'done')}
                    className="flex items-center gap-1 py-1.5 px-3 bg-emerald-950/30 hover:bg-emerald-950/50 text-accent-green text-xs font-medium rounded-lg transition-colors"
                  >
                    <CheckCircle2 size={12} /> Concluir
                  </button>
                )}
                {item.status === 'reading' && (
                  <button
                    onClick={() => updateStatus(item, 'paused')}
                    className="py-1.5 px-3 bg-bg-border text-text-muted text-xs rounded-lg hover:bg-bg-border/70 transition-colors"
                  >
                    Pausar
                  </button>
                )}
                {item.status === 'paused' && (
                  <button
                    onClick={() => updateStatus(item, 'reading')}
                    className="flex-1 py-1.5 bg-accent-purple/20 text-accent-purple text-xs font-medium rounded-lg hover:bg-accent-purple/30 transition-colors"
                  >
                    Retomar
                  </button>
                )}
                {item.status === 'wishlist' && (
                  <button
                    onClick={() => updateStatus(item, 'reading')}
                    className="flex-1 py-1.5 bg-accent-purple/20 text-accent-purple text-xs font-medium rounded-lg hover:bg-accent-purple/30 transition-colors"
                  >
                    Iniciar
                  </button>
                )}
              </div>

              {showSession === item.id && item.type === 'series' && (
                <div className="pt-1 border-t border-bg-border space-y-2">
                  <p className="text-xs text-text-muted">Atualizar posição</p>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="text-xs text-text-muted block mb-0.5">Temporada</label>
                      <input
                        type="number" min="1" value={sessionSeason || (item.current_season ?? 1)}
                        onChange={e => setSessionSeason(e.target.value)}
                        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-text-muted block mb-0.5">Episódio</label>
                      <input
                        type="number" min="0" value={sessionPages || (item.current_page > 0 ? item.current_page : '')}
                        onChange={e => setSessionPages(e.target.value)}
                        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-text-muted block mb-0.5">Minutos</label>
                      <input
                        type="number" min="0" value={sessionMins} onChange={e => setSessionMins(e.target.value)}
                        placeholder="opcional"
                        className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
                      />
                    </div>
                    <button onClick={() => logSession(item.id, item.type)} className="mt-4 px-3 py-1.5 bg-accent-purple text-white text-xs rounded-lg hover:bg-purple-600 transition-colors">
                      OK
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted">Nota do episódio (opcional)</span>
                    <StarRating value={sessionRating || null} onChange={setSessionRating} />
                  </div>
                  <textarea
                    value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                    placeholder="O que achou deste episódio? (opcional)"
                    rows={2}
                    className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple resize-none"
                  />
                </div>
              )}

              {showSession === item.id && item.type !== 'series' && (
                <div className="pt-1 border-t border-bg-border space-y-2">
                  <div className="flex gap-2 items-center">
                    <input
                      type="number" value={sessionMins} onChange={e => setSessionMins(e.target.value)}
                      placeholder="Minutos"
                      className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
                    />
                    {hasProgress && (
                      <input
                        type="number" value={sessionPages} onChange={e => setSessionPages(e.target.value)}
                        placeholder={tc.unitPlural}
                        className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple"
                      />
                    )}
                    <button onClick={() => logSession(item.id, item.type)} className="px-3 py-1.5 bg-accent-purple text-white text-xs rounded-lg hover:bg-purple-600 transition-colors">
                      OK
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-text-muted">Nota desta sessão (opcional)</span>
                    <StarRating value={sessionRating || null} onChange={setSessionRating} />
                  </div>
                  <textarea
                    value={sessionNotes} onChange={e => setSessionNotes(e.target.value)}
                    placeholder="Dissertar sobre esta sessão (opcional)"
                    rows={2}
                    className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple resize-none"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
