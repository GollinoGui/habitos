import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { BookOpen, CheckCircle2, Clock, Plus, Trash2 } from 'lucide-react'

interface MediaItem {
  id: number; title: string; type: string; author: string; total_pages: number;
  current_page: number; status: string; started_at: string; finished_at: string; cover_emoji: string
}

const COVER_EMOJIS = ['📚', '📖', '📕', '📗', '📘', '📙', '🎬', '📺', '🎮', '🎵', '📰', '📓']
const TYPES = [
  { value: 'book', label: 'Livro' },
  { value: 'series', label: 'Série' },
  { value: 'movie', label: 'Filme' },
  { value: 'manga', label: 'Mangá' },
  { value: 'article', label: 'Artigo' }
]
const STATUS_LABELS: Record<string, string> = {
  reading: 'Lendo', done: 'Concluído', paused: 'Pausado', wishlist: 'Na lista'
}

function progressPct(item: MediaItem): number {
  if (!item.total_pages || item.total_pages === 0) return item.status === 'done' ? 100 : 0
  return Math.min(100, Math.round((item.current_page / item.total_pages) * 100))
}

export default function Reading(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [items, setItems] = useState<MediaItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null)
  const [showSession, setShowSession] = useState<number | null>(null)
  const [sessionMins, setSessionMins] = useState('')
  const [sessionPages, setSessionPages] = useState('')
  const [todayMins, setTodayMins] = useState(0)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('book')
  const [author, setAuthor] = useState('')
  const [totalPages, setTotalPages] = useState('')
  const [emoji, setEmoji] = useState('📚')

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [its, mins] = await Promise.all([
      window.api.media.list(),
      window.api.media.todayMinutes(today)
    ])
    setItems(its as MediaItem[])
    setTodayMins(mins as number)
  }

  async function addItem() {
    if (!title.trim()) return
    await window.api.media.create({
      title, type, author: author || undefined,
      total_pages: totalPages ? Number(totalPages) : undefined,
      cover_emoji: emoji, started_at: type === 'wishlist' ? undefined : today
    })
    setTitle(''); setAuthor(''); setTotalPages(''); setEmoji('📚'); setShowForm(false)
    loadAll()
  }

  async function deleteItem(id: number) {
    await window.api.media.delete(id)
    if (selectedItem?.id === id) setSelectedItem(null)
    loadAll()
  }

  async function updateStatus(item: MediaItem, status: string) {
    await window.api.media.update(item.id, {
      status,
      finished_at: status === 'done' ? today : undefined
    })
    loadAll()
  }

  async function logSession(id: number) {
    const mins = parseInt(sessionMins) || 0
    const pages = parseInt(sessionPages) || 0
    if (mins === 0 && pages === 0) return
    await window.api.media.logSession({ media_id: id, date: today, minutes_read: mins, pages_read: pages })
    setSessionMins(''); setSessionPages(''); setShowSession(null)
    loadAll()
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter)
  const reading = items.filter(i => i.status === 'reading')
  const done = items.filter(i => i.status === 'done')

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leitura & Mídia</h1>
        <p className="text-text-secondary text-sm mt-1">Livros, séries, filmes e mais</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <span className="text-2xl">📖</span>
          <p className="text-xl font-bold text-text-primary mt-1">{reading.length}</p>
          <p className="text-xs text-text-muted">Em andamento</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <span className="text-2xl">✅</span>
          <p className="text-xl font-bold text-text-primary mt-1">{done.length}</p>
          <p className="text-xs text-text-muted">Concluídos</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <span className="text-2xl">⏱️</span>
          <p className="text-xl font-bold text-text-primary mt-1">{todayMins}min</p>
          <p className="text-xs text-text-muted">Lidos hoje</p>
        </div>
      </div>

      {/* Filter + Add */}
      <div className="flex gap-2 flex-wrap">
        {[['all', 'Todos'], ['reading', 'Lendo'], ['done', 'Concluídos'], ['paused', 'Pausados'], ['wishlist', 'Lista']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === v ? 'bg-accent-purple text-white' : 'bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary'
            }`}>
            {l}
          </button>
        ))}
        <button onClick={() => setShowForm(v => !v)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {COVER_EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? 'bg-accent-purple/20 ring-2 ring-accent-purple' : 'hover:bg-bg-border'}`}>
                {e}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título *"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor / Criador"
              className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={totalPages} onChange={e => setTotalPages(e.target.value)} placeholder="Total de páginas/eps"
              type="number" className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
            {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={addItem} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
              Adicionar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
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
          return (
            <div key={item.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-3xl leading-none">{item.cover_emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary truncate">{item.title}</p>
                  {item.author && <p className="text-xs text-text-muted">{item.author}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                    item.status === 'done' ? 'bg-emerald-950/40 text-accent-green' :
                    item.status === 'reading' ? 'bg-purple-950/40 text-accent-purple' :
                    'bg-bg-border text-text-muted'
                  }`}>
                    {STATUS_LABELS[item.status] || item.status}
                  </span>
                </div>
                <button onClick={() => deleteItem(item.id)} className="text-text-muted hover:text-accent-red transition-colors shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>

              {item.total_pages > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>{item.current_page}/{item.total_pages}</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2 bg-bg-border rounded-full overflow-hidden">
                    <div className="h-full bg-accent-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {item.status === 'reading' && (
                  <button
                    onClick={() => setShowSession(showSession === item.id ? null : item.id)}
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
              </div>

              {showSession === item.id && (
                <div className="flex gap-2 items-center pt-1 border-t border-bg-border">
                  <input type="number" value={sessionMins} onChange={e => setSessionMins(e.target.value)} placeholder="Minutos"
                    className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  {item.total_pages > 0 && (
                    <input type="number" value={sessionPages} onChange={e => setSessionPages(e.target.value)} placeholder="Páginas"
                      className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  )}
                  <button onClick={() => logSession(item.id)} className="px-3 py-1.5 bg-accent-purple text-white text-xs rounded-lg hover:bg-purple-600 transition-colors">
                    OK
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedItem && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <BookOpen size={12} />
          <span>Dica: registre suas sessões de leitura para acompanhar o progresso diário.</span>
        </div>
      )}
    </div>
  )
}
