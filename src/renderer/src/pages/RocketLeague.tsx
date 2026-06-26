import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2, Search, RefreshCw, Unlink, TrendingUp, TrendingDown,
  Trophy, Target, Swords, Trash2, Plus, ChevronDown, ChevronUp,
  BookOpen, ChevronRight, Zap, Tv, Star, ExternalLink,
} from 'lucide-react'
import RLGarage, { type RLCarPreset } from './RLGarage'

// ── Styles ────────────────────────────────────────────────────────────────────

const RL_STYLES = `
  @keyframes rl-fade-up {
    from { opacity: 0; transform: translateY(28px) scale(0.98); }
    to   { opacity: 1; transform: translateY(0)   scale(1);    }
  }
  @keyframes rl-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  .rl-quote-enter {
    animation: rl-fade-up 0.75s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .rl-stat-card {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .rl-stat-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 32px rgba(0,0,0,0.22);
  }
  .rl-session-row {
    transition: background-color 0.12s ease;
  }
  .rl-session-row:hover {
    background-color: rgba(249,115,22,0.05);
  }
  .rl-session-row:hover .rl-session-bar {
    transform: scaleY(1.12);
  }
  .rl-session-bar {
    transition: transform 0.15s ease;
    transform-origin: center;
  }
  .rl-search-result {
    transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
  }
  .rl-search-result:hover {
    transform: translateX(2px);
  }
  .rl-tab {
    position: relative;
    transition: color 0.18s ease;
  }
  .rl-btn-sync {
    transition: all 0.15s ease;
  }
  .rl-btn-sync:hover {
    transform: translateY(-1px);
  }
  .rl-hero-glow {
    background: radial-gradient(ellipse 60% 80% at 90% 50%, rgba(249,115,22,0.18) 0%, transparent 70%);
  }
`

// ── Types ─────────────────────────────────────────────────────────────────────

interface RLStat {
  value: number
  displayValue?: string
  metadata?: { name?: string; iconUrl?: string }
}

interface RLSegment {
  type: string
  attributes: { playlistId?: number }
  metadata: { name: string }
  stats: {
    tier?: RLStat
    division?: RLStat
    matchesPlayed?: RLStat
    wins?: RLStat
    rating?: RLStat
    peakRating?: RLStat
    winPercentage?: RLStat
    winStreak?: RLStat
  }
}

interface RLProfile {
  platformInfo: {
    platformSlug: string
    platformUserHandle: string
    avatarUrl?: string
  }
  segments: RLSegment[]
}

interface RLLinkedProfile {
  platform: string
  username: string
}

interface RLSession {
  id: number
  date: string
  start_mmr: number
  end_mmr: number
  mmr_gain: number
  matches: number
  wins: number
  notes?: string
  preset_id?: number | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAYLISTS = [
  { id: 11, label: '2v2', fullName: 'Ranked Doubles 2v2' },
  { id: 13, label: '3v3', fullName: 'Ranked Standard 3v3' },
  { id: 10, label: '1v1', fullName: 'Ranked Duel 1v1' },
]

const PLATFORM_LABELS: Record<string, string> = {
  epic: 'Epic Games',
  steam: 'Steam',
  psn: 'PlayStation',
  xbl: 'Xbox',
  switch: 'Nintendo Switch',
}

function getRankColor(tierName?: string): string {
  const name = (tierName ?? '').toLowerCase()
  if (name.includes('supersonic'))     return '#ff0000'
  if (name.includes('grand champion')) return '#ec4899'
  if (name.includes('champion'))       return '#7c3aed'
  if (name.includes('diamond'))        return '#3b82f6'
  if (name.includes('platinum'))       return '#06b6d4'
  if (name.includes('gold'))           return '#f59e0b'
  if (name.includes('silver'))         return '#94a3b8'
  if (name.includes('bronze'))         return '#cd7f32'
  return '#6b7280'
}

// ── Quotes (40 — 20 bíblicas + 20 pensadores) ────────────────────────────────

const QUOTES = [
  // Bíblicas
  { text: 'Tudo posso naquele que me fortalece.', source: 'Filipenses 4:13', type: 'bible' },
  { text: 'Combati o bom combate, terminei a corrida, guardei a fé.', source: '2 Timóteo 4:7', type: 'bible' },
  { text: 'Os que esperam no Senhor renovarão as suas forças; subirão com asas como águias.', source: 'Isaías 40:31', type: 'bible' },
  { text: 'Se Deus é por nós, quem será contra nós?', source: 'Romanos 8:31', type: 'bible' },
  { text: 'Correi de tal maneira que possais alcançar o prêmio.', source: '1 Coríntios 9:24', type: 'bible' },
  { text: 'Corramos com perseverança a corrida que nos é proposta.', source: 'Hebreus 12:1', type: 'bible' },
  { text: 'O que planeja com afinco terá vantagem, mas o impaciente sem dúvida fracassará.', source: 'Provérbios 21:5', type: 'bible' },
  { text: 'Sede fortes e corajosos. Não tenham medo nem fiquem aterrorizados.', source: 'Josué 1:9', type: 'bible' },
  { text: 'Tudo o que fizerdes, fazei-o de todo o coração, como ao Senhor.', source: 'Colossenses 3:23', type: 'bible' },
  { text: 'Entrega o teu caminho ao Senhor; confia nele, e ele agirá.', source: 'Salmos 37:5', type: 'bible' },
  { text: 'O Senhor é a minha luz e a minha salvação; a quem temerei?', source: 'Salmos 27:1', type: 'bible' },
  { text: 'Consagra ao Senhor tudo o que fazes, e teus projetos serão bem-sucedidos.', source: 'Provérbios 16:3', type: 'bible' },
  { text: 'Sede fortalecidos no Senhor e no poder da sua força.', source: 'Efésios 6:10', type: 'bible' },
  { text: 'Prossigo para o alvo, para o prêmio da soberana vocação de Deus em Cristo Jesus.', source: 'Filipenses 3:14', type: 'bible' },
  { text: 'Pois eu sei os planos que tenho para vocês: planos de prosperidade e não de calamidade.', source: 'Jeremias 29:11', type: 'bible' },
  { text: 'É Deus quem me cinge de força e aplaina o meu caminho.', source: 'Salmos 18:32', type: 'bible' },
  { text: 'Em todos os teus caminhos, reconhece-o, e ele endireitará as tuas veredas.', source: 'Provérbios 3:6', type: 'bible' },
  { text: 'O Senhor é a minha força e o meu escudo; o meu coração nele confiou.', source: 'Salmos 28:7', type: 'bible' },
  { text: 'Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.', source: 'Isaías 41:10', type: 'bible' },
  { text: 'Que ele te conceda o desejo do teu coração e realize todos os teus projetos.', source: 'Salmos 20:4', type: 'bible' },
  // Pensadores
  { text: 'A disciplina é a ponte entre as metas e a realização.', source: 'Jim Rohn', type: 'thinker' },
  { text: 'O talento vence jogos, mas trabalho em equipe e inteligência vencem campeonatos.', source: 'Michael Jordan', type: 'thinker' },
  { text: 'Você erra 100% dos arremessos que não tenta.', source: 'Wayne Gretzky', type: 'thinker' },
  { text: 'O sucesso é a soma de pequenos esforços repetidos dia após dia.', source: 'Robert Collier', type: 'thinker' },
  { text: 'A dor é temporária. Desistir é para sempre.', source: 'Lance Armstrong', type: 'thinker' },
  { text: 'Quanto mais você treina no silêncio, mais barulho fará no sucesso.', source: 'Anônimo', type: 'thinker' },
  { text: 'Não é a montanha que conquistamos, mas a nós mesmos.', source: 'Edmund Hillary', type: 'thinker' },
  { text: 'Campeões continuam jogando até acertarem.', source: 'Billie Jean King', type: 'thinker' },
  { text: 'A vitória ama a preparação.', source: 'Vince Lombardi', type: 'thinker' },
  { text: 'Impossível é apenas uma palavra grande que os fracos usam para justificar o que não alcançam.', source: 'Muhammad Ali', type: 'thinker' },
  { text: 'Heróis vêm e vão, mas lendas ficam para sempre.', source: 'Kobe Bryant', type: 'thinker' },
  { text: 'Na derrota, aprendo mais do que na vitória.', source: 'Roger Federer', type: 'thinker' },
  { text: 'O sucesso é a capacidade de ir de falha em falha sem perder o entusiasmo.', source: 'Winston Churchill', type: 'thinker' },
  { text: 'O que a mente do homem pode conceber e acreditar, ele pode alcançar.', source: 'Napoleon Hill', type: 'thinker' },
  { text: 'Somos o que repetidamente fazemos. A excelência, portanto, não é um ato, mas um hábito.', source: 'Aristóteles', type: 'thinker' },
  { text: 'Não é o que acontece com você, mas como você reage que importa.', source: 'Epicteto', type: 'thinker' },
  { text: 'Cada momento desperdiçado é um inimigo que não percebemos que nos ataca.', source: 'Sêneca', type: 'thinker' },
  { text: 'Conhecer os outros é sabedoria; conhecer a si mesmo é iluminação.', source: 'Lao-Tzu', type: 'thinker' },
  { text: 'O superior não é aquele que nunca falhou, mas aquele que nunca desistiu.', source: 'Confúcio', type: 'thinker' },
  { text: 'Quanto mais suamos no treino, menos sangramos na batalha.', source: 'General Patton', type: 'thinker' },
]

function getDailyQuote() {
  const days = Math.floor(Date.now() / 86400000)
  const bibles = QUOTES.filter(q => q.type === 'bible')
  const thinkers = QUOTES.filter(q => q.type === 'thinker')
  if (days % 2 === 0) return bibles[Math.floor(days / 2) % bibles.length]
  return thinkers[Math.floor(days / 2) % thinkers.length]
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentStreak(sessions: RLSession[]): number {
  if (!sessions.length) return 0
  const isPos = sessions[0].mmr_gain >= 0
  let count = 0
  for (const s of sessions) {
    if ((s.mmr_gain >= 0) === isPos) count++
    else break
  }
  return isPos ? count : -count
}

// ── Esports Types ─────────────────────────────────────────────────────────────

interface OctaneEvent {
  _id: string
  name: string
  tier: string
  region: string
  startDate?: string
  endDate?: string
  prize?: { amount: number; currency: string }
  image?: string
}

interface OctanePlayer {
  _id: string
  tag: string
  name?: string
  country?: string
  team?: { team?: { name?: string } }
}

interface TwitchStream {
  user_login: string
  user_name: string
  game_name: string
  title: string
  viewer_count: number
}

interface RLStreamer {
  name: string
  login: string
}

// ── Esports Constants ─────────────────────────────────────────────────────────

const DEFAULT_STREAMERS: RLStreamer[] = [
  { name: 'jstn', login: 'jstn_rl' },
  { name: 'Musty', login: 'amustycow' },
  { name: 'Squishy', login: 'squishymuffinz' },
  { name: 'GarrettG', login: 'garrett_g' },
  { name: 'Firstkiller', login: 'firstkiller' },
  { name: 'Lethamyr', login: 'lethamyr' },
  { name: 'Sunless Khan', login: 'sunlesskhan' },
  { name: 'Klassux', login: 'klassux' },
  { name: 'Rizzo', login: 'rizzo' },
  { name: 'Monkey Moon', login: 'monkeymoon' },
  { name: 'Arsenal', login: 'arsenalrl' },
  { name: 'ViolentPanda', login: 'violentpanda' },
  { name: 'Kaydop', login: 'kaydop' },
  { name: 'Fairy Peak', login: 'fairypeak' },
  { name: 'Crispy', login: 'crispymcpuffin' },
]

const TIER_STYLE: Record<string, { label: string; color: string }> = {
  S: { label: 'S-Tier', color: '#f59e0b' },
  A: { label: 'A-Tier', color: '#94a3b8' },
  B: { label: 'B-Tier', color: '#cd7f32' },
  C: { label: 'C-Tier', color: '#6b7280' },
}

const REGION_LABEL: Record<string, string> = {
  INT: 'Mundial', NA: 'América do Norte', EU: 'Europa',
  SAM: 'América do Sul', MENA: 'Oriente Médio',
  APAC: 'Ásia-Pacífico', OCE: 'Oceania', SSA: 'África',
}

function countryFlag(code?: string): string {
  if (!code || code.length < 2) return '🌍'
  const base = 0x1F1E6 - 65
  return String.fromCodePoint(...code.toUpperCase().slice(0, 2).split('').map(c => base + c.charCodeAt(0)))
}

function formatPrize(amount?: number): string {
  if (!amount) return ''
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1).replace('.0', '')}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${amount}`
}

function fmtDate(iso?: string): string {
  if (!iso) return ''
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function fmtViewers(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}k` : String(n)
}

// ── Esports Tab ───────────────────────────────────────────────────────────────

function normalizeLogin(input: string): string {
  const match = input.match(/twitch\.tv\/([a-zA-Z0-9_]+)/)
  if (match) return match[1].toLowerCase()
  return input.trim().toLowerCase().replace(/^@/, '')
}

function RLEsportsTab(): React.JSX.Element {
  const hasApi = !!(window.api?.rocketLeague)

  // ── OAuth user ────────────────────────────────────────────────────────────
  const [userToken, setUserToken]         = useState(() => localStorage.getItem('rl_twitch_user_token') ?? '')
  const [userId, setUserId]               = useState(() => localStorage.getItem('rl_twitch_user_id') ?? '')
  const [userName, setUserName]           = useState(() => localStorage.getItem('rl_twitch_user_name') ?? '')
  const [loadingOAuth, setLoadingOAuth]   = useState(false)
  const [oauthError, setOauthError]       = useState('')
  const [followed, setFollowed]           = useState<Array<{ broadcaster_login: string; broadcaster_name: string }>>([])
  const [followedStreams, setFollowedStreams] = useState<TwitchStream[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(false)
  const [followedError, setFollowedError]     = useState('')

  // ── Curated / custom list ─────────────────────────────────────────────────
  const [selectedLogins, setSelectedLogins] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('rl_streamers_selected')
      return saved ? new Set(JSON.parse(saved) as string[]) : new Set(DEFAULT_STREAMERS.map(s => s.login))
    } catch { return new Set(DEFAULT_STREAMERS.map(s => s.login)) }
  })
  const [customStreamers, setCustomStreamers] = useState<RLStreamer[]>(() => {
    try { return JSON.parse(localStorage.getItem('rl_streamers_custom') ?? '[]') } catch { return [] }
  })
  const [showManage, setShowManage] = useState(false)
  const [addInput, setAddInput]     = useState('')
  const [liveStreams,     setLiveStreams]     = useState<TwitchStream[]>([])
  const [loadingLive,    setLoadingLive]    = useState(false)
  const [liveError,      setLiveError]      = useState('')
  const [twitchNotSetup, setTwitchNotSetup] = useState(false)

  // ── Octane ────────────────────────────────────────────────────────────────
  const [events, setEvents]   = useState<OctaneEvent[]>([])
  const [players, setPlayers] = useState<OctanePlayer[]>([])
  const [loadingEv, setLoadingEv] = useState(false)
  const [loadingPl, setLoadingPl] = useState(false)
  const [evError, setEvError] = useState('')
  const [plError, setPlError] = useState('')

  const fetchLiveRef     = useRef<(() => Promise<void>) | null>(null)
  const fetchFollowedRef = useRef<(() => Promise<void>) | null>(null)

  const allStreamers  = [...DEFAULT_STREAMERS, ...customStreamers]
  const activeLogins  = allStreamers.filter(s => selectedLogins.has(s.login))

  async function fetchEvents() {
    if (!hasApi) return
    setLoadingEv(true); setEvError('')
    try {
      const res = await window.api!.rocketLeague!.esportsEvents() as { ok: boolean; data?: { events?: OctaneEvent[] } }
      if (res.ok && res.data?.events) setEvents(res.data.events)
      else setEvError('Não foi possível carregar torneios.')
    } catch { setEvError('Erro ao buscar torneios.') }
    finally { setLoadingEv(false) }
  }

  async function fetchPlayers() {
    if (!hasApi) return
    setLoadingPl(true); setPlError('')
    try {
      const res = await window.api!.rocketLeague!.esportsPlayers() as { ok: boolean; data?: { players?: OctanePlayer[] } }
      if (res.ok && res.data?.players) setPlayers(res.data.players)
      else setPlError('Não foi possível carregar jogadores.')
    } catch { setPlError('Erro ao buscar jogadores.') }
    finally { setLoadingPl(false) }
  }

  async function fetchLive(logins = activeLogins.map(s => s.login)) {
    if (!hasApi || !logins.length) return
    setLoadingLive(true); setLiveError('')
    try {
      const res = await window.api!.rocketLeague!.twitchLive(logins) as { ok: boolean; data?: unknown[]; error?: string }
      if (res.ok) { setLiveStreams((res.data ?? []) as TwitchStream[]); setTwitchNotSetup(false) }
      else if (res.error === 'credentials-not-configured') setTwitchNotSetup(true)
      else setLiveError('Erro Twitch: ' + res.error)
    } catch { setLiveError('Erro ao verificar streams.') }
    finally { setLoadingLive(false) }
  }

  async function fetchFollowed(tok = userToken, uid = userId) {
    if (!hasApi || !tok || !uid) return
    setLoadingFollowed(true); setFollowedError('')
    try {
      const res = await window.api!.rocketLeague!.twitchFollowed(tok, uid) as {
        ok: boolean
        followed?: Array<{ broadcaster_login: string; broadcaster_name: string }>
        streams?: TwitchStream[]
        error?: string
      }
      if (res.ok) { setFollowed(res.followed ?? []); setFollowedStreams((res.streams ?? []) as TwitchStream[]) }
      else {
        if (res.error?.includes('401')) { clearUserSession(); setFollowedError('Sessão expirada. Faça login novamente.') }
        else setFollowedError('Erro: ' + res.error)
      }
    } catch { setFollowedError('Erro ao buscar canais seguidos.') }
    finally { setLoadingFollowed(false) }
  }

  fetchLiveRef.current     = () => fetchLive()
  fetchFollowedRef.current = () => fetchFollowed()

  useEffect(() => {
    fetchEvents(); fetchPlayers()
    fetchLive()
    if (userToken && userId) fetchFollowed()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setInterval(() => {
      fetchLiveRef.current?.()
      if (userToken && userId) fetchFollowedRef.current?.()
    }, 2 * 60 * 1000)
    return () => clearInterval(id)
  }, [userToken, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth actions ──────────────────────────────────────────────────────────

  async function handleLogin() {
    setLoadingOAuth(true); setOauthError('')
    try {
      const res = await window.api!.rocketLeague!.twitchOAuth()
      localStorage.setItem('rl_twitch_user_token', res.access_token)
      localStorage.setItem('rl_twitch_user_refresh', res.refresh_token)
      localStorage.setItem('rl_twitch_user_id', res.user_id)
      localStorage.setItem('rl_twitch_user_name', res.user_name)
      setUserToken(res.access_token); setUserId(res.user_id); setUserName(res.user_name)
      fetchFollowed(res.access_token, res.user_id)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('cancelled')) setOauthError('Erro ao fazer login: ' + msg)
    } finally { setLoadingOAuth(false) }
  }

  function clearUserSession() {
    ['rl_twitch_user_token','rl_twitch_user_refresh','rl_twitch_user_id','rl_twitch_user_name']
      .forEach(k => localStorage.removeItem(k))
    setUserToken(''); setUserId(''); setUserName('')
    setFollowed([]); setFollowedStreams([])
  }

  // ── List helpers ──────────────────────────────────────────────────────────

  function toggleLogin(login: string) {
    const next = new Set(selectedLogins)
    if (next.has(login)) next.delete(login); else next.add(login)
    setSelectedLogins(next)
    localStorage.setItem('rl_streamers_selected', JSON.stringify([...next]))
    const newLogins = [...DEFAULT_STREAMERS, ...customStreamers].filter(s => next.has(s.login)).map(s => s.login)
    if (newLogins.length) fetchLive(newLogins)
  }

  function addCustomStreamer() {
    const login = normalizeLogin(addInput)
    if (!login || allStreamers.some(s => s.login === login)) return
    const updated = [...customStreamers, { name: login, login }]
    setCustomStreamers(updated); localStorage.setItem('rl_streamers_custom', JSON.stringify(updated))
    const next = new Set(selectedLogins); next.add(login)
    setSelectedLogins(next); localStorage.setItem('rl_streamers_selected', JSON.stringify([...next]))
    setAddInput('')
  }

  function removeCustom(login: string) {
    const updated = customStreamers.filter(s => s.login !== login)
    setCustomStreamers(updated); localStorage.setItem('rl_streamers_custom', JSON.stringify(updated))
    const next = new Set(selectedLogins); next.delete(login)
    setSelectedLogins(next); localStorage.setItem('rl_streamers_selected', JSON.stringify([...next]))
  }

  const getManualLive   = (login: string) => liveStreams.find(s => s.user_login.toLowerCase() === login.toLowerCase())
  const getFollowedLive = (login: string) => followedStreams.find(s => s.user_login.toLowerCase() === login.toLowerCase())

  const sortedActive = [...activeLogins].sort((a, b) => {
    const al = !!getManualLive(a.login), bl = !!getManualLive(b.login)
    if (al !== bl) return al ? -1 : 1
    return (getManualLive(b.login)?.viewer_count ?? 0) - (getManualLive(a.login)?.viewer_count ?? 0)
  })

  const sortedFollowed = [...followed].sort((a, b) => {
    const al = !!getFollowedLive(a.broadcaster_login), bl = !!getFollowedLive(b.broadcaster_login)
    if (al !== bl) return al ? -1 : 1
    return (getFollowedLive(b.broadcaster_login)?.viewer_count ?? 0) - (getFollowedLive(a.broadcaster_login)?.viewer_count ?? 0)
  })
  const shownFollowed = [
    ...sortedFollowed.filter(f => !!getFollowedLive(f.broadcaster_login)),
    ...sortedFollowed.filter(f => !getFollowedLive(f.broadcaster_login)).slice(0, 10),
  ]
  const hiddenOffline     = Math.max(0, followed.length - shownFollowed.length)
  const manualLiveCount   = liveStreams.length
  const followedLiveCount = followedStreams.length

  return (
    <div className="space-y-5">

      {/* ── Twitch Ao Vivo ───────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
          <Tv size={14} style={{ color: '#9147ff' }} />
          <span className="text-sm font-semibold text-text-primary">Twitch Ao Vivo</span>
          {(followedLiveCount + manualLiveCount) > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(145,71,255,0.15)', color: '#9147ff' }}>
              {followedLiveCount + manualLiveCount} ao vivo
            </span>
          )}
        </div>

        <>
          {/* spacer */}
            {/* ── Seguindo no Twitch (OAuth) ──────────────────────────────── */}
            <div className="border-b border-bg-border">
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(145,71,255,0.05)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: '#9147ff' }}>
                    {userName ? `Seguindo · ${userName}` : 'Seguindo no Twitch'}
                  </span>
                  {followedLiveCount > 0 && (
                    <span className="text-xs" style={{ color: '#9147ff' }}>({followedLiveCount} ao vivo)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {loadingFollowed && <RefreshCw size={11} className="animate-spin text-text-muted" />}
                  {userName ? (
                    <>
                      <button onClick={() => fetchFollowed()} className="text-xs text-text-muted hover:text-text-primary transition-colors">Atualizar</button>
                      <button onClick={clearUserSession} className="text-xs text-red-400 hover:text-red-300 transition-colors">Sair</button>
                    </>
                  ) : (
                    <button onClick={handleLogin} disabled={loadingOAuth}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white disabled:opacity-60 hover:brightness-110 transition-all"
                      style={{ background: 'linear-gradient(135deg, #9147ff, #6c35c8)' }}>
                      {loadingOAuth ? <RefreshCw size={11} className="animate-spin" /> : <Tv size={11} />}
                      {loadingOAuth ? 'Aguardando login…' : 'Entrar com Twitch'}
                    </button>
                  )}
                </div>
              </div>

              {oauthError    && <p className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-b border-bg-border">{oauthError}</p>}
              {followedError && <p className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-b border-bg-border">{followedError}</p>}

              {!userName && !loadingOAuth && !oauthError && (
                <p className="px-4 py-3 text-xs text-text-muted text-center">
                  Entre com sua conta Twitch para ver os canais que você segue em tempo real.
                </p>
              )}
              {userName && loadingFollowed && !shownFollowed.length && (
                <div className="p-6 flex justify-center"><RefreshCw size={16} className="animate-spin text-text-muted" /></div>
              )}
              {shownFollowed.map(ch => {
                const stream = getFollowedLive(ch.broadcaster_login)
                const live   = !!stream
                return (
                  <div key={ch.broadcaster_login} className="flex items-center gap-3 px-4 py-2.5 border-b border-bg-border last:border-b-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${live ? 'bg-red-500' : 'bg-bg-border'}`}
                      style={live ? { boxShadow: '0 0 6px rgba(239,68,68,0.9)' } : {}} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${live ? 'text-text-primary' : 'text-text-muted'}`}>
                          {stream?.user_name ?? ch.broadcaster_name}
                        </span>
                        {live && stream && (
                          <>
                            <span className="text-xs text-text-muted truncate max-w-[140px]">{stream.game_name}</span>
                            <span className="text-xs font-semibold shrink-0" style={{ color: '#9147ff' }}>{fmtViewers(stream.viewer_count)} viewers</span>
                          </>
                        )}
                        {!live && <span className="text-xs text-text-muted opacity-40">offline</span>}
                      </div>
                      {live && stream?.title && <p className="text-xs text-text-muted truncate mt-0.5 opacity-60">{stream.title}</p>}
                    </div>
                    {live ? (
                      <button onClick={() => window.api!.rocketLeague!.openUrl(`https://twitch.tv/${ch.broadcaster_login}`)}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white hover:brightness-110"
                        style={{ background: 'linear-gradient(135deg, #9147ff, #6c35c8)' }}>
                        ASSISTIR <ExternalLink size={10} />
                      </button>
                    ) : (
                      <button onClick={() => window.api!.rocketLeague!.openUrl(`https://twitch.tv/${ch.broadcaster_login}`)}
                        className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-bg-border/40 transition-colors">
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                )
              })}
              {hiddenOffline > 0 && (
                <p className="px-4 py-2 text-xs text-text-muted text-center opacity-50">+ {hiddenOffline} outros offline</p>
              )}
            </div>

            {/* ── Lista personalizada ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between px-4 py-2.5" style={{ background: 'rgba(249,115,22,0.03)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-text-secondary">Lista personalizada</span>
                  {manualLiveCount > 0 && <span className="text-xs font-medium text-orange-400">{manualLiveCount} ao vivo</span>}
                </div>
                <div className="flex items-center gap-2">
                  {loadingLive && <RefreshCw size={11} className="animate-spin text-text-muted" />}
                  <button onClick={() => fetchLive()} className="text-xs text-text-muted hover:text-text-primary transition-colors">Atualizar</button>
                </div>
              </div>

              {liveError && <p className="px-4 py-2 text-xs text-red-400 bg-red-400/5 border-b border-bg-border">{liveError}</p>}
              {twitchNotSetup && (
                <div className="px-4 py-3 border-b border-bg-border" style={{ background: 'rgba(249,115,22,0.05)' }}>
                  <p className="text-xs text-orange-400 font-medium">Credenciais Twitch não configuradas</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Preencha <span className="font-mono text-[11px]">src/main/twitchSecrets.ts</span> com seu Client ID e Client Secret do{' '}
                    <button onClick={() => window.api!.rocketLeague!.openUrl('https://dev.twitch.tv/console')}
                      className="underline text-orange-300 hover:text-orange-200 transition-colors">
                      dev.twitch.tv/console
                    </button>
                    {' '}e reinicie o app.
                  </p>
                </div>
              )}

              <div className="divide-y divide-bg-border">
                {sortedActive.map(s => {
                  const stream = getManualLive(s.login)
                  const live   = !!stream
                  return (
                    <div key={s.login} className="flex items-center gap-3 px-4 py-2.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${live ? 'bg-red-500' : 'bg-bg-border'}`}
                        style={live ? { boxShadow: '0 0 6px rgba(239,68,68,0.9)' } : {}} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${live ? 'text-text-primary' : 'text-text-muted'}`}>{s.name}</span>
                          {live && stream && (
                            <>
                              <span className="text-xs text-text-muted">{stream.game_name}</span>
                              <span className="text-xs font-semibold" style={{ color: '#9147ff' }}>{fmtViewers(stream.viewer_count)} viewers</span>
                            </>
                          )}
                          {!live && <span className="text-xs text-text-muted opacity-40">offline</span>}
                        </div>
                        {live && stream?.title && <p className="text-xs text-text-muted truncate mt-0.5 opacity-60">{stream.title}</p>}
                      </div>
                      {live ? (
                        <button onClick={() => window.api!.rocketLeague!.openUrl(`https://twitch.tv/${s.login}`)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg, #9147ff, #6c35c8)' }}>
                          ASSISTIR <ExternalLink size={10} />
                        </button>
                      ) : (
                        <button onClick={() => window.api!.rocketLeague!.openUrl(`https://twitch.tv/${s.login}`)}
                          className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-bg-border/40 transition-colors">
                          <ExternalLink size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {activeLogins.length === 0 && (
                  <p className="px-4 py-4 text-xs text-text-muted text-center">Nenhum streamer selecionado.</p>
                )}
              </div>

              {/* Manage panel */}
              <div className="border-t border-bg-border">
                <button onClick={() => setShowManage(v => !v)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-border/20 transition-colors">
                  <Plus size={12} />
                  Gerenciar lista
                  {showManage ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
                </button>

                {showManage && (
                  <div className="px-4 pb-4 space-y-3 border-t border-bg-border">
                    {/* Add by URL or username */}
                    <div className="flex gap-2 pt-3">
                      <input type="text" value={addInput}
                        onChange={e => setAddInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCustomStreamer()}
                        placeholder="twitch.tv/usuario  ou  nome de usuário"
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-purple-500/60 placeholder:text-text-muted transition-colors" />
                      <button onClick={addCustomStreamer} disabled={!addInput.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110"
                        style={{ background: 'rgba(145,71,255,0.7)' }}>
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Curated list checkboxes */}
                    <p className="text-xs font-medium text-text-muted">Lista curada de pros</p>
                    <div className="grid grid-cols-2 gap-1 max-h-52 overflow-y-auto">
                      {DEFAULT_STREAMERS.map(s => (
                        <button key={s.login} onClick={() => toggleLogin(s.login)}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors"
                          style={selectedLogins.has(s.login)
                            ? { background: 'rgba(145,71,255,0.15)', color: '#c084fc' }
                            : { color: 'var(--color-text-muted)' }}>
                          <div className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${selectedLogins.has(s.login) ? 'border-purple-400 bg-purple-500/30' : 'border-bg-border'}`}>
                            {selectedLogins.has(s.login) && <span className="text-[9px] leading-none font-bold">✓</span>}
                          </div>
                          {s.name}
                        </button>
                      ))}
                    </div>

                    {/* Custom streamers */}
                    {customStreamers.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-text-muted">Adicionados por você</p>
                        <div className="space-y-1">
                          {customStreamers.map(s => (
                            <div key={s.login} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-primary/50 text-xs">
                              <button onClick={() => toggleLogin(s.login)}
                                className={`w-3 h-3 rounded-sm border shrink-0 flex items-center justify-center ${selectedLogins.has(s.login) ? 'border-purple-400 bg-purple-500/30' : 'border-bg-border'}`}>
                                {selectedLogins.has(s.login) && <span className="text-[9px] leading-none font-bold">✓</span>}
                              </button>
                              <span className="flex-1 text-text-secondary truncate">{s.login}</span>
                              <button onClick={() => removeCustom(s.login)}
                                className="text-text-muted hover:text-red-400 transition-colors shrink-0">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
        </>
      </div>

      {/* ── Torneios RLCS ────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Trophy size={14} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold text-text-primary">Torneios RLCS</span>
            <span className="text-xs text-text-muted">via Octane.gg</span>
          </div>
          <button onClick={fetchEvents}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={12} className={loadingEv ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loadingEv && (
          <div className="p-10 flex justify-center">
            <RefreshCw size={20} className="animate-spin text-text-muted" />
          </div>
        )}
        {evError && !loadingEv && (
          <p className="p-4 text-sm text-red-400 text-center">{evError}</p>
        )}
        {!loadingEv && events.length > 0 && (
          <div className="divide-y divide-bg-border">
            {events.map(ev => {
              const tier = TIER_STYLE[ev.tier] ?? { label: ev.tier, color: '#6b7280' }
              return (
                <div key={ev._id} className="flex items-center gap-3 px-4 py-3">
                  {ev.image ? (
                    <img src={ev.image} alt="" className="w-10 h-10 rounded-lg object-contain bg-bg-primary shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-bg-primary flex items-center justify-center shrink-0">
                      <Trophy size={16} style={{ color: tier.color }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-text-primary truncate">{ev.name}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-bold shrink-0"
                        style={{ background: `${tier.color}22`, color: tier.color }}>
                        {tier.label}
                      </span>
                      {ev.prize?.amount ? (
                        <span className="text-xs font-semibold text-green-400 shrink-0">
                          {formatPrize(ev.prize.amount)}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted flex-wrap">
                      <span>{REGION_LABEL[ev.region] ?? ev.region}</span>
                      {ev.startDate && (
                        <span>· {fmtDate(ev.startDate)}{ev.endDate && ev.endDate !== ev.startDate ? ` – ${fmtDate(ev.endDate)}` : ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!loadingEv && !evError && events.length === 0 && (
          <p className="p-8 text-center text-xs text-text-muted">Nenhum torneio encontrado.</p>
        )}
      </div>

      {/* ── Pro Players ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
          <div className="flex items-center gap-2">
            <Star size={14} style={{ color: '#f97316' }} />
            <span className="text-sm font-semibold text-text-primary">Pro Players</span>
            <span className="text-xs text-text-muted">via Octane.gg</span>
          </div>
          <button onClick={fetchPlayers}
            className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors">
            <RefreshCw size={12} className={loadingPl ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {loadingPl && (
          <div className="p-10 flex justify-center">
            <RefreshCw size={20} className="animate-spin text-text-muted" />
          </div>
        )}
        {plError && !loadingPl && (
          <p className="p-4 text-sm text-red-400 text-center">{plError}</p>
        )}
        {!loadingPl && players.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-bg-border">
            {players.map(p => (
              <div key={p._id} className="bg-bg-secondary px-4 py-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base leading-none shrink-0">{countryFlag(p.country)}</span>
                  <span className="text-sm font-bold text-text-primary truncate">{p.tag}</span>
                </div>
                {p.name && <p className="text-xs text-text-muted truncate">{p.name}</p>}
                {p.team?.team?.name && (
                  <p className="text-xs font-medium truncate mt-0.5" style={{ color: '#f97316' }}>
                    {p.team.team.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {!loadingPl && !plError && players.length === 0 && (
          <p className="p-8 text-center text-xs text-text-muted">Nenhum jogador encontrado.</p>
        )}
      </div>
    </div>
  )
}

// ── MMR Chart ─────────────────────────────────────────────────────────────────

function MMRChart({ sessions }: { sessions: RLSession[] }): React.JSX.Element | null {
  if (sessions.length < 2) return null
  const recent = [...sessions].reverse().slice(-12)
  const vals = recent.map(s => s.end_mmr)
  const minV = Math.min(...vals) - 20
  const maxV = Math.max(...vals) + 20
  const range = maxV - minV || 50
  const W = 100
  const H = 48
  const pts = vals.map((v, i) => ({
    x: (i / (vals.length - 1)) * W,
    y: H - ((v - minV) / range) * H
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H}Z`
  const trend = vals[vals.length - 1] - vals[0]
  const col = trend >= 0 ? '#4ade80' : '#f87171'

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {trend >= 0
            ? <TrendingUp size={14} className="text-green-400" />
            : <TrendingDown size={14} className="text-red-400" />}
          <span className="text-sm font-semibold text-text-primary">Progressão MMR</span>
          <span className="text-xs text-text-muted">últimas {recent.length} sessões</span>
        </div>
        <span className={`text-sm font-bold ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '+' : ''}{trend} no período
        </span>
      </div>
      <div className="w-full" style={{ height: 56 }}>
        <svg width="100%" height="56" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="rl-chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={col} stopOpacity="0.25" />
              <stop offset="100%" stopColor={col} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#rl-chart-grad)" />
          <path d={line} fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={col} />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-text-muted">{recent[0].date.slice(5)}</span>
        <span className="text-xs text-text-muted">{recent[recent.length - 1].date.slice(5)}</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RocketLeague(): React.JSX.Element {
  const [linkPlatform, setLinkPlatform] = useState('epic')
  const [linkUsername, setLinkUsername] = useState('')
  const [linking, setLinking]           = useState(false)
  const [linkError, setLinkError]       = useState('')

  const [linkedProfile, setLinkedProfile] = useState<RLLinkedProfile | null>(null)
  const [profileData, setProfileData]     = useState<RLProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError]   = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState(11)

  const [sessions, setSessions]         = useState<RLSession[]>([])
  const [form, setForm]                 = useState({
    date: new Date().toISOString().slice(0, 10),
    start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '', preset_id: '',
  })
  const [saving, setSaving]             = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)

  const [rankHovered, setRankHovered]   = useState(false)
  const [activeTab, setActiveTab]       = useState<'overview' | 'garage' | 'esports'>('overview')
  const [garagePresets, setGaragePresets] = useState<RLCarPreset[]>([])

  // Detecta primeira visita do dia para a animação da frase
  const [isFirstTimeToday] = useState(() => {
    const key = `habitos_rl_quote_${getTodayKey()}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      return true
    }
    return false
  })

  const hasApi = !!(window.api?.rocketLeague)

  useEffect(() => {
    const saved = localStorage.getItem('habitos_rl_profile')
    if (saved) {
      try {
        const p: RLLinkedProfile = JSON.parse(saved)
        setLinkedProfile(p)
        fetchProfile(p.platform, p.username)
      } catch { /* ignore */ }
    }
    loadSessions()
    loadGaragePresets()
  }, [])

  async function loadGaragePresets() {
    if (!hasApi) return
    const raw = await window.api!.rocketLeague!.listPresets() as Array<{
      id: number; name: string; slots: string; created_at: string
    }>
    setGaragePresets(raw.map(p => ({
      ...p,
      slots: (() => { try { return JSON.parse(p.slots) } catch { return {} } })(),
    })))
  }

  async function loadSessions() {
    if (!hasApi) return
    const data = await window.api!.rocketLeague!.listSessions()
    setSessions((data as RLSession[]) ?? [])
  }

  async function fetchProfile(platform: string, username: string) {
    if (!hasApi) return
    setLoadingProfile(true)
    setProfileError('')
    try {
      const res = await window.api!.rocketLeague!.getProfile(platform, username) as { ok: boolean; data?: RLProfile; error?: string }
      if (res.ok && res.data) {
        setProfileData(res.data)
      } else {
        const e = res.error ?? ''
        if (e.includes('404')) setProfileError('Jogador não encontrado.')
        else if (e.includes('406')) setProfileError(`Perfil recusado pelo tracker.gg (406).`)
        else if (e.includes('401') || e.includes('403')) setProfileError(`Sem permissão para carregar perfil (${e.match(/\d{3}/)?.[0] ?? '40x'}).`)
        else setProfileError(`Erro ao carregar perfil (${e || 'desconhecido'}).`)
      }
    } catch {
      setProfileError('Erro ao carregar perfil.')
    } finally {
      setLoadingProfile(false)
    }
  }

  async function handleLinkProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!linkUsername.trim() || !hasApi) return
    setLinking(true)
    setLinkError('')
    try {
      const res = await window.api!.rocketLeague!.getProfile(linkPlatform, linkUsername.trim()) as { ok: boolean; data?: RLProfile; error?: string }
      if (res.ok && res.data) {
        const p: RLLinkedProfile = { platform: linkPlatform, username: linkUsername.trim() }
        localStorage.setItem('habitos_rl_profile', JSON.stringify(p))
        setLinkedProfile(p)
        setProfileData(res.data)
        setLinkUsername('')
      } else {
        const err = res.error ?? ''
        if (err.includes('404')) setLinkError('Jogador não encontrado. Verifique o nome e a plataforma.')
        else if (err.includes('429')) setLinkError('Muitas requisições. Aguarde alguns segundos e tente de novo.')
        else if (err.includes('406') || err.includes('403') || err.includes('401')) setLinkError(`Erro de acesso à API (${err.match(/\d{3}/)?.[0] ?? 'desconhecido'}). Tente novamente em breve.`)
        else setLinkError(`Erro ao vincular (${err || 'desconhecido'}).`)
      }
    } catch {
      setLinkError('Erro ao conectar com o tracker.gg.')
    } finally {
      setLinking(false)
    }
  }

  function unlinkProfile() {
    localStorage.removeItem('habitos_rl_profile')
    setLinkedProfile(null)
    setProfileData(null)
    setProfileError('')
  }

  async function handleAddSession(e: React.FormEvent) {
    e.preventDefault()
    if (!form.start_mmr || !form.end_mmr || !hasApi) return
    setSaving(true)
    await window.api!.rocketLeague!.addSession({
      date: form.date,
      start_mmr: parseInt(form.start_mmr),
      end_mmr: parseInt(form.end_mmr),
      matches: parseInt(form.matches) || 0,
      wins: parseInt(form.wins) || 0,
      notes: form.notes,
      preset_id: form.preset_id ? parseInt(form.preset_id) : undefined,
    })
    setSaving(false)
    setForm(f => ({ ...f, start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '', preset_id: '' }))
    setShowSessionForm(false)
    loadSessions()
  }

  async function handleDeleteSession(id: number) {
    if (!hasApi) return
    await window.api!.rocketLeague!.deleteSession(id)
    loadSessions()
  }

  const activeSegment = profileData?.segments.find(
    s => s.type === 'playlist' && s.attributes.playlistId === selectedPlaylist
  )

  const mmrGain = form.start_mmr && form.end_mmr
    ? parseInt(form.end_mmr) - parseInt(form.start_mmr)
    : null

  const totalMMRToday = sessions
    .filter(s => s.date === getTodayKey())
    .reduce((acc, s) => acc + s.mmr_gain, 0)

  const peakMMR = sessions.length > 0 ? Math.max(...sessions.map(s => s.end_mmr)) : null

  const streak = getCurrentStreak(sessions)
  const totalMMRAll = sessions.reduce((acc, s) => acc + s.mmr_gain, 0)
  const avgMMRPerSession = sessions.length ? Math.round(totalMMRAll / sessions.length) : 0
  const sessionsThisWeek = sessions.filter(s => {
    const d = new Date(s.date + 'T12:00:00')
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    return d >= weekStart
  }).length

  const rankColor = getRankColor(activeSegment?.stats.tier?.metadata?.name)
  const dailyQuote = getDailyQuote()
  const isBible = dailyQuote.type === 'bible'

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <style>{RL_STYLES}</style>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link to="/sports" className="hover:text-text-primary transition-colors">Esportes & Jogos</Link>
        <ChevronRight size={12} />
        <span className="text-text-primary font-medium">Rocket League</span>
      </nav>

      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-bg-border" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0.03) 60%, transparent 100%)' }}>
        <div className="rl-hero-glow absolute inset-0 pointer-events-none" />
        {/* subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #f97316 0px, #f97316 1px, transparent 1px, transparent 32px), repeating-linear-gradient(90deg, #f97316 0px, #f97316 1px, transparent 1px, transparent 32px)' }} />

        <div className="relative flex items-center justify-between flex-wrap gap-3 p-5">
          <div className="flex items-center gap-4">
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 20px rgba(249,115,22,0.45)', width: 52, height: 52 }}
            >
              <Gamepad2 size={26} className="text-white" />
            </div>
            <div>
              <h1
                className="text-2xl font-extrabold tracking-tight"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #fb923c 60%, #fdba74 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                Rocket League
              </h1>
              <p className="text-xs text-text-muted mt-0.5">
                {linkedProfile
                  ? `${linkedProfile.username} · ${PLATFORM_LABELS[linkedProfile.platform] ?? linkedProfile.platform}`
                  : 'Rastreie seu progresso e evolução'}
              </p>
            </div>
          </div>

          {linkedProfile && (
            <div className="flex gap-2">
              <button
                onClick={() => fetchProfile(linkedProfile.platform, linkedProfile.username)}
                className="rl-btn-sync flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-bg-border text-text-secondary hover:text-text-primary hover:border-orange-400/50 transition-colors"
              >
                <RefreshCw size={13} className={loadingProfile ? 'animate-spin' : ''} />
                Sincronizar
              </button>
              <button
                onClick={unlinkProfile}
                className="rl-btn-sync flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-bg-border text-text-secondary hover:text-red-400 hover:border-red-400/50 transition-colors"
              >
                <Unlink size={13} />
                Desvincular
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop only notice ──────────────────────────────────────────────── */}
      {!hasApi && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-8 text-center text-text-muted">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: 'rgba(249,115,22,0.1)' }}>
            <Gamepad2 size={28} style={{ color: '#f97316', opacity: 0.6 }} />
          </div>
          <p className="text-sm font-medium text-text-secondary mb-1">Faça login para continuar</p>
          <p className="text-xs">Entre na sua conta para acessar a seção de Rocket League.</p>
        </div>
      )}

      {hasApi && (
        <>
          {/* ── Tab switcher ──────────────────────────────────────────────────── */}
          <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 w-fit">
            {([
              { key: 'overview', label: 'Visão Geral' },
              { key: 'garage',   label: '🚗 Garagem'  },
              { key: 'esports',  label: '🏆 Esports'  },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                style={activeTab === tab.key
                  ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', boxShadow: '0 2px 10px rgba(249,115,22,0.38)' }
                  : { color: 'var(--color-text-muted)' }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── Garagem Tab ───────────────────────────────────────────────────── */}
          {activeTab === 'garage' && (
            <RLGarage onPresetsChange={p => setGaragePresets(p)} />
          )}

          {/* ── Esports Tab ───────────────────────────────────────────────────── */}
          {activeTab === 'esports' && <RLEsportsTab />}

          {activeTab === 'overview' && (
          <>
          {/* ── Link Profile ─────────────────────────────────────────────────── */}
          {!linkedProfile && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-text-primary">Vincular perfil</h2>
                <p className="text-xs text-text-muted mt-1">
                  Selecione sua plataforma e informe seu nome de usuário exato para importar estatísticas via RLTracker.
                </p>
              </div>
              <form onSubmit={handleLinkProfile} className="space-y-3">
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                  <select
                    value={linkPlatform}
                    onChange={e => setLinkPlatform(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 transition-colors shrink-0"
                  >
                    <option value="epic">Epic Games</option>
                    <option value="steam">Steam</option>
                    <option value="psn">PlayStation</option>
                    <option value="xbl">Xbox</option>
                    <option value="switch">Switch</option>
                  </select>
                  <input
                    type="text"
                    value={linkUsername}
                    onChange={e => setLinkUsername(e.target.value)}
                    placeholder="Seu nome de usuário exato..."
                    className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={linking || !linkUsername.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all hover:brightness-110 active:scale-95 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 2px 10px rgba(249,115,22,0.35)' }}
                  >
                    {linking ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                    {linking ? 'Carregando...' : 'Vincular'}
                  </button>
                </div>
                {linking && (
                  <p className="text-xs text-text-muted">Buscando perfil no tracker.gg, aguarde alguns segundos...</p>
                )}
                {linkError && <p className="text-sm text-red-400">{linkError}</p>}
              </form>
              <p className="text-xs text-text-muted">
                Dica: o nome deve ser idêntico ao que aparece no tracker.gg — incluindo letras maiúsculas e caracteres especiais.
              </p>
            </div>
          )}

          {/* ── Profile stats ────────────────────────────────────────────────── */}
          {linkedProfile && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
              {/* Player header */}
              <div
                className="flex items-center gap-4 p-5 border-b border-bg-border"
                style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.08), rgba(249,115,22,0.02))' }}
              >
                {profileData?.platformInfo.avatarUrl ? (
                  <img
                    src={profileData.platformInfo.avatarUrl}
                    alt=""
                    className="w-14 h-14 rounded-full object-cover ring-2 ring-orange-400/40"
                    style={{ boxShadow: '0 0 16px rgba(249,115,22,0.25)' }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-bg-primary border-2 border-bg-border flex items-center justify-center">
                    <Gamepad2 size={22} className="text-text-muted" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-text-primary truncate">{linkedProfile.username}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-bg-border text-text-muted">
                    {PLATFORM_LABELS[linkedProfile.platform] ?? linkedProfile.platform}
                  </span>
                </div>
                {loadingProfile && <RefreshCw size={16} className="animate-spin text-text-muted shrink-0" />}
              </div>

              {profileError && (
                <div className="p-4 text-sm text-red-400 text-center">{profileError}</div>
              )}

              {profileData && !loadingProfile && (
                <div className="p-5 space-y-5">
                  {/* Playlist tabs */}
                  <div className="flex gap-1 bg-bg-primary rounded-lg p-1 w-fit">
                    {PLAYLISTS.map(pl => (
                      <button
                        key={pl.id}
                        onClick={() => setSelectedPlaylist(pl.id)}
                        className={`rl-tab px-4 py-1.5 rounded-md text-sm font-medium ${
                          selectedPlaylist === pl.id ? 'text-white' : 'text-text-muted hover:text-text-secondary'
                        }`}
                        style={selectedPlaylist === pl.id
                          ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }
                          : {}}
                      >
                        {pl.label}
                      </button>
                    ))}
                  </div>

                  {activeSegment ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {/* Rank */}
                      <div
                        className="bg-bg-primary rounded-xl p-4 col-span-2 sm:col-span-1 flex flex-col gap-1"
                        style={{
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          transform: rankHovered ? 'translateY(-3px)' : 'translateY(0)',
                          boxShadow: rankHovered
                            ? `0 0 28px ${rankColor}55, 0 10px 32px rgba(0,0,0,0.22)`
                            : `0 0 0px transparent`,
                          border: `1px solid ${rankColor}20`,
                        }}
                        onMouseEnter={() => setRankHovered(true)}
                        onMouseLeave={() => setRankHovered(false)}
                      >
                        <p className="text-xs text-text-muted">Rank atual</p>
                        {activeSegment.stats.tier?.metadata?.iconUrl && (
                          <img
                            src={activeSegment.stats.tier.metadata.iconUrl}
                            alt=""
                            className="w-12 h-12 object-contain"
                            style={{ filter: `drop-shadow(0 0 8px ${rankColor}70)` }}
                          />
                        )}
                        <p className="font-bold text-text-primary text-sm leading-tight">
                          {activeSegment.stats.tier?.metadata?.name ?? '—'}
                          {activeSegment.stats.division?.metadata?.name
                            ? ` ${activeSegment.stats.division.metadata.name}`
                            : ''}
                        </p>
                        <p className="text-lg font-bold" style={{ color: rankColor }}>
                          {activeSegment.stats.rating?.value ?? '—'} MMR
                        </p>
                      </div>

                      {/* Peak */}
                      <div className="rl-stat-card bg-bg-primary rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-xs text-text-muted">Peak rating</p>
                        <Trophy size={18} className="text-yellow-400" />
                        <p className="text-xl font-bold text-yellow-400">
                          {activeSegment.stats.peakRating?.value ?? '—'}
                        </p>
                        <p className="text-xs text-text-muted">MMR</p>
                      </div>

                      {/* Win Streak */}
                      <div className="rl-stat-card bg-bg-primary rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-xs text-text-muted">Sequência</p>
                        {(() => {
                          const ws = activeSegment.stats.winStreak?.value ?? 0
                          const isWin = ws >= 0
                          return (
                            <>
                              {isWin
                                ? <TrendingUp size={18} className="text-green-400" />
                                : <TrendingDown size={18} className="text-red-400" />}
                              <p className={`text-xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                                {ws > 0 ? '+' : ''}{ws}
                              </p>
                              <p className="text-xs text-text-muted">{isWin ? 'vitórias' : 'derrotas'}</p>
                            </>
                          )
                        })()}
                      </div>

                      {/* Matches */}
                      <div className="rl-stat-card bg-bg-primary rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-xs text-text-muted">Partidas</p>
                        <Swords size={18} className="text-blue-400" />
                        <p className="text-xl font-bold text-text-primary">
                          {activeSegment.stats.matchesPlayed?.value?.toLocaleString('pt-BR') ?? '—'}
                        </p>
                        <p className="text-xs text-text-muted">
                          {activeSegment.stats.wins?.value?.toLocaleString('pt-BR') ?? '—'} vitórias
                        </p>
                      </div>

                      {/* Winrate */}
                      <div className="rl-stat-card bg-bg-primary rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-xs text-text-muted">Winrate</p>
                        <Target size={18} className="text-green-400" />
                        <p className="text-xl font-bold text-green-400">
                          {activeSegment.stats.winPercentage?.displayValue
                            ?? (activeSegment.stats.wins?.value && activeSegment.stats.matchesPlayed?.value
                              ? `${((activeSegment.stats.wins.value / activeSegment.stats.matchesPlayed.value) * 100).toFixed(1)}%`
                              : '—')}
                        </p>
                        <p className="text-xs text-text-muted">vitórias</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-4">
                      Sem dados para {PLAYLISTS.find(p => p.id === selectedPlaylist)?.fullName ?? 'esta playlist'}.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Session summary ──────────────────────────────────────────────── */}
          {sessions.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                  <p className="text-xs text-text-muted mb-1">MMR hoje</p>
                  <p className={`text-2xl font-bold ${totalMMRToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalMMRToday > 0 ? '+' : ''}{totalMMRToday}
                  </p>
                </div>
                <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                  <p className="text-xs text-text-muted mb-1">Esta semana</p>
                  <p className="text-2xl font-bold text-orange-400">{sessionsThisWeek}</p>
                  <p className="text-xs text-text-muted">sessões</p>
                </div>
                <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                  <p className="text-xs text-text-muted mb-1">Média/sessão</p>
                  <p className={`text-2xl font-bold ${avgMMRPerSession >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {avgMMRPerSession > 0 ? '+' : ''}{avgMMRPerSession}
                  </p>
                  <p className="text-xs text-text-muted">MMR</p>
                </div>
                <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                  <p className="text-xs text-text-muted mb-1">Peak local</p>
                  <p className="text-2xl font-bold text-yellow-400">{peakMMR ?? '—'}</p>
                  <p className="text-xs text-text-muted">MMR</p>
                </div>
                <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                  <p className="text-xs text-text-muted mb-1">Total sessões</p>
                  <p className="text-2xl font-bold text-text-primary">{sessions.length}</p>
                </div>
              </div>

              {/* Streak banner */}
              {Math.abs(streak) >= 2 && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-semibold ${
                  streak > 0
                    ? 'bg-green-400/10 border-green-400/30 text-green-400'
                    : 'bg-red-400/10 border-red-400/30 text-red-400'
                }`}>
                  {streak > 0
                    ? <TrendingUp size={16} />
                    : <TrendingDown size={16} />}
                  <span>
                    {streak > 0
                      ? `${streak} sessões de ganho seguidas!`
                      : `${Math.abs(streak)} sessões de queda seguidas`}
                  </span>
                  <span className="ml-auto text-xs opacity-60 font-normal">baseado nas sessões locais</span>
                </div>
              )}

              {/* MMR Chart */}
              <MMRChart sessions={sessions} />
            </>
          )}

          {/* ── Session logger ───────────────────────────────────────────────── */}
          <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSessionForm(v => !v)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-bg-border/20 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                  <Plus size={14} style={{ color: '#f97316' }} />
                </div>
                <span className="font-semibold text-text-primary text-sm">Registrar sessão do dia</span>
              </div>
              {showSessionForm
                ? <ChevronUp size={16} className="text-text-muted" />
                : <ChevronDown size={16} className="text-text-muted" />}
            </button>

            {showSessionForm && (
              <form onSubmit={handleAddSession} className="p-4 pt-0 space-y-3 border-t border-bg-border">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Data</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">MMR inicial</label>
                    <input
                      type="number"
                      value={form.start_mmr}
                      onChange={e => setForm(f => ({ ...f, start_mmr: e.target.value }))}
                      placeholder="ex: 1900"
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">MMR final</label>
                    <input
                      type="number"
                      value={form.end_mmr}
                      onChange={e => setForm(f => ({ ...f, end_mmr: e.target.value }))}
                      placeholder="ex: 1920"
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Partidas</label>
                    <input
                      type="number"
                      value={form.matches}
                      onChange={e => setForm(f => ({ ...f, matches: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted block mb-1">Vitórias</label>
                    <input
                      type="number"
                      value={form.wins}
                      onChange={e => setForm(f => ({ ...f, wins: e.target.value }))}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-text-muted block mb-1">Notas (opcional)</label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Como foi a sessão?"
                      className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                    />
                  </div>
                  {garagePresets.length > 0 && (
                    <div className="sm:col-span-3">
                      <label className="text-xs text-text-muted block mb-1">Preset usado (opcional)</label>
                      <select
                        value={form.preset_id}
                        onChange={e => setForm(f => ({ ...f, preset_id: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 transition-colors"
                      >
                        <option value="">Nenhum preset</option>
                        {garagePresets.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {mmrGain !== null && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold ${mmrGain >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'}`}>
                    {mmrGain >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    {mmrGain >= 0 ? '+' : ''}{mmrGain} MMR nesta sessão
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-medium text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 2px 10px rgba(249,115,22,0.35)' }}
                >
                  {saving ? 'Salvando...' : 'Salvar sessão'}
                </button>
              </form>
            )}
          </div>

          {/* ── Session history ──────────────────────────────────────────────── */}
          {/* ── Session history ──────────────────────────────────────────────── */}
          {sessions.length > 0 && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-4 border-b border-bg-border">
                <Zap size={14} style={{ color: '#f97316' }} />
                <h3 className="font-semibold text-text-primary text-sm">Histórico de sessões</h3>
                <span className="ml-auto text-xs text-text-muted">{sessions.length} sessões</span>
              </div>
              <div className="divide-y divide-bg-border max-h-80 overflow-y-auto">
                {sessions.map(session => (
                  <div key={session.id} className="rl-session-row flex items-center gap-3 px-4 py-3">
                    <div className={`rl-session-bar w-1 h-10 rounded-full shrink-0 ${session.mmr_gain >= 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-text-primary">
                          {new Date(session.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className={`text-sm font-bold ${session.mmr_gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {session.mmr_gain >= 0 ? '+' : ''}{session.mmr_gain} MMR
                        </span>
                        <span className="text-xs text-text-muted">
                          {session.start_mmr} → {session.end_mmr}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {session.matches > 0 && (
                          <span className="text-xs text-text-muted">
                            {session.wins}W / {session.matches - session.wins}L
                            {` · ${Math.round((session.wins / session.matches) * 100)}% win`}
                          </span>
                        )}
                        {session.notes && <span className="text-xs text-text-muted truncate">{session.notes}</span>}
                        {session.preset_id && garagePresets.find(p => p.id === session.preset_id) && (
                          <span className="text-xs text-text-muted flex items-center gap-1">
                            🚗 {garagePresets.find(p => p.id === session.preset_id)!.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* ── Frase do Dia ─────────────────────────────────────────────────────── */}
      <div
        className={`rounded-2xl overflow-hidden border ${isFirstTimeToday ? 'rl-quote-enter' : ''}`}
        style={{
          borderColor: isBible ? 'rgba(249,115,22,0.25)' : 'var(--color-bg-border, #2a2a2a)',
          background: isBible
            ? 'linear-gradient(135deg, rgba(249,115,22,0.09) 0%, rgba(249,115,22,0.03) 100%)'
            : 'var(--color-bg-secondary, #161616)',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: isBible ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <BookOpen size={14} style={{ color: '#f97316' }} />
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#f97316' }}>
              {isBible ? 'Palavra do Dia' : 'Pensamento do Dia'}
            </span>
          </div>
          <span className="text-xs text-text-muted">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* Quote body */}
        <div className="relative px-6 py-10">
          {/* Decorative large quote mark */}
          <span
            className="absolute top-3 left-5 font-serif leading-none select-none pointer-events-none"
            style={{ fontSize: 96, color: 'rgba(249,115,22,0.10)', lineHeight: 1 }}
          >
            "
          </span>
          <span
            className="absolute bottom-3 right-5 font-serif leading-none select-none pointer-events-none"
            style={{ fontSize: 96, color: 'rgba(249,115,22,0.10)', lineHeight: 1 }}
          >
            "
          </span>

          <blockquote className="relative z-10 text-center max-w-2xl mx-auto space-y-5">
            <p className="text-lg sm:text-xl font-medium text-text-primary leading-relaxed italic">
              {dailyQuote.text}
            </p>
            <footer className="flex items-center justify-center gap-2">
              <span className="text-text-muted text-sm">—</span>
              {isBible && <span style={{ color: '#f97316', fontSize: 14 }}>✝</span>}
              <span
                className="text-sm font-semibold"
                style={{ color: isBible ? '#f97316' : 'var(--color-text-secondary, #a0a0a0)' }}
              >
                {dailyQuote.source}
              </span>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  )
}
