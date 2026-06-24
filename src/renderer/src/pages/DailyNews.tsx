import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Newspaper, ExternalLink, CheckCircle, Key, RefreshCw, Loader2 } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface Article {
  title: string
  description: string | null
  link: string
  source_name: string
  pubDate: string
  image_url: string | null
}

interface SavedNews {
  articles: Article[]
  readIndices: number[]
  fetchedDate: string
  xpGranted?: boolean
}

const STORAGE_KEY_NEWS = (d: string) => `habitos_news_${d}`
const STORAGE_KEY_APIKEY = 'habitos_newsdata_api_key'
const ARTICLES_NEEDED = 5
// Built-in key (injected at build time from .env, never stored in git)
const BUILT_IN_KEY = import.meta.env.VITE_NEWSDATA_API_KEY as string | undefined

function loadSaved(today: string): SavedNews | null {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY_NEWS(today)) || 'null') as SavedNews | null
    if (s?.fetchedDate === today && s.articles?.length) return s
  } catch { /* empty */ }
  return null
}

function saveSaved(today: string, data: SavedNews) {
  localStorage.setItem(STORAGE_KEY_NEWS(today), JSON.stringify(data))
  // also update read count for Challenges hub
  const count = data.readIndices.length
  // stored count under the same key is readCount
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY_NEWS(today)) || '{}')
  localStorage.setItem(STORAGE_KEY_NEWS(today), JSON.stringify({ ...existing, readCount: count }))
}

export default function DailyNews(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const { grantXP } = useProfileStore()

  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY_APIKEY) || BUILT_IN_KEY || '')
  const [keyInput, setKeyInput] = useState('')
  const [saved, setSaved] = useState<SavedNews | null>(() => loadSaved(today))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // persist read-count-compatible save
  function updateSaved(next: SavedNews) {
    setSaved(next)
    localStorage.setItem(STORAGE_KEY_NEWS(today), JSON.stringify({
      ...next,
      readCount: next.readIndices.length,
    }))
  }

  const fetchNews = useCallback(async (key: string) => {
    setLoading(true)
    setError('')
    try {
      const url = `https://newsdata.io/api/1/latest?country=br&language=pt&apikey=${key}&size=${ARTICLES_NEEDED}`
      const res = await fetch(url)
      const json = await res.json() as { status: string; results?: Article[]; message?: string }
      if (json.status !== 'success' || !json.results?.length) {
        throw new Error(json.message || 'Erro ao buscar notícias')
      }
      const next: SavedNews = {
        articles: json.results.slice(0, ARTICLES_NEEDED),
        readIndices: saved?.readIndices ?? [],
        fetchedDate: today,
      }
      updateSaved(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [today, saved?.readIndices])

  // Auto-fetch if we have a key but no articles yet
  useEffect(() => {
    if (apiKey && !saved) fetchNews(apiKey)
  }, [apiKey])

  function saveApiKey() {
    const k = keyInput.trim()
    if (!k) return
    localStorage.setItem(STORAGE_KEY_APIKEY, k)
    setApiKey(k)
    setKeyInput('')
    fetchNews(k)
  }

  function markRead(idx: number) {
    if (!saved) return
    if (saved.readIndices.includes(idx)) return
    const next: SavedNews = { ...saved, readIndices: [...saved.readIndices, idx] }
    updateSaved(next)

    // XP: 10 per article
    grantXP(10, 'Notícia lida')

    // Bonus XP when all done (first time only)
    if (next.readIndices.length >= ARTICLES_NEEDED && !saved.xpGranted) {
      grantXP(0, '') // grant was already given per-article; mark done
      updateSaved({ ...next, xpGranted: true })
    }
  }

  const readCount = saved?.readIndices.length ?? 0
  const allRead = readCount >= ARTICLES_NEEDED

  // ── No API key ──────────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Header dateLabel={dateLabel} />
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-blue-500/15 flex items-center justify-center mx-auto">
            <Key size={24} className="text-blue-400" />
          </div>
          <div>
            <p className="font-semibold text-text-primary mb-1">Configure sua chave de API</p>
            <p className="text-sm text-text-muted">
              Use o <span className="text-blue-400 font-medium">NewsData.io</span> (gratuito)
              para buscar notícias brasileiras em tempo real.
            </p>
          </div>
          <ol className="text-left text-sm text-text-muted space-y-1.5">
            <li>1. Acesse <span className="text-blue-400">newsdata.io</span> e crie uma conta grátis</li>
            <li>2. Copie sua API Key no dashboard</li>
            <li>3. Cole abaixo e salve</li>
          </ol>
          <div className="flex gap-2">
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveApiKey()}
              placeholder="pub_xxxxxxxxxxxxxxxxxxxxxxxx"
              className="flex-1 px-3 py-2 bg-bg-primary border border-bg-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-blue-500/50"
            />
            <button
              onClick={saveApiKey}
              disabled={!keyInput.trim()}
              className="px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Header dateLabel={dateLabel} />
        <div className="flex items-center justify-center py-16 gap-3 text-text-muted">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Buscando notícias...</span>
        </div>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Header dateLabel={dateLabel} />
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <div className="flex gap-2">
            <button
              onClick={() => fetchNews(apiKey)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition-colors"
            >
              <RefreshCw size={12} /> Tentar novamente
            </button>
            <button
              onClick={() => { localStorage.removeItem(STORAGE_KEY_APIKEY); setApiKey('') }}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-border rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              <Key size={12} /> Trocar chave
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── No articles ─────────────────────────────────────────────────────────────
  if (!saved?.articles.length) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Header dateLabel={dateLabel} />
        <button
          onClick={() => fetchNews(apiKey)}
          className="w-full flex items-center justify-center gap-2 py-10 border border-dashed border-bg-border rounded-xl text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors"
        >
          <RefreshCw size={16} />
          <span className="text-sm">Buscar notícias de hoje</span>
        </button>
      </div>
    )
  }

  // ── Articles ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <Header dateLabel={dateLabel} inline />
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-xs text-text-muted">{readCount}/{ARTICLES_NEEDED} lidas</span>
          <button
            onClick={() => fetchNews(apiKey)}
            title="Atualizar"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-border transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {allRead && (
        <div className="px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-sm font-semibold text-blue-400">✓ Todas as notícias lidas! +50 XP</p>
        </div>
      )}

      <div className="space-y-3">
        {saved.articles.map((article, i) => {
          const isRead = saved.readIndices.includes(i)
          return (
            <div
              key={i}
              className={`bg-bg-secondary border rounded-xl overflow-hidden transition-all ${
                isRead ? 'border-blue-500/30 opacity-75' : 'border-bg-border hover:border-blue-500/20'
              }`}
            >
              {article.image_url && !isRead && (
                <img
                  src={article.image_url}
                  alt=""
                  className="w-full h-36 object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <div className="p-4">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xs px-1.5 py-0.5 bg-bg-border rounded text-text-muted shrink-0">
                    {article.source_name}
                  </span>
                  {isRead && <CheckCircle size={14} className="text-blue-400 shrink-0 mt-0.5 ml-auto" />}
                </div>
                <h3 className={`text-sm font-semibold mb-1 leading-snug ${isRead ? 'text-text-muted' : 'text-text-primary'}`}>
                  {article.title}
                </h3>
                {article.description && !isRead && (
                  <p className="text-xs text-text-muted line-clamp-2 mb-3">{article.description}</p>
                )}
                <div className="flex items-center gap-2">
                  {!isRead && (
                    <button
                      onClick={() => markRead(i)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 border border-blue-500/25 rounded-lg text-xs text-blue-400 hover:bg-blue-500/25 transition-colors font-medium"
                    >
                      <CheckCircle size={11} /> Marcar como lida · +10 XP
                    </button>
                  )}
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => !isRead && markRead(i)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-border transition-colors"
                  >
                    <ExternalLink size={11} /> Ler completo
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {!BUILT_IN_KEY && (
        <button
          onClick={() => { localStorage.removeItem(STORAGE_KEY_APIKEY); setApiKey('') }}
          className="text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          Trocar chave de API
        </button>
      )}
    </div>
  )
}

function Header({ dateLabel, inline }: { dateLabel: string; inline?: boolean }) {
  if (inline) return null
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
        <Newspaper size={20} className="text-blue-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-text-primary">Notícias do Dia</h1>
        <p className="text-xs text-text-muted capitalize">{dateLabel}</p>
      </div>
    </div>
  )
}
