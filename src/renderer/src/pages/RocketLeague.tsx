import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2, Search, RefreshCw, Unlink, TrendingUp, TrendingDown,
  Trophy, Target, Swords, Trash2, Plus, ChevronDown, ChevronUp,
  BookOpen, ChevronRight, Zap,
} from 'lucide-react'

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

interface RLSearchPlayer {
  platformSlug: string
  platformUserHandle: string
  platformUserIdentifier: string
  avatarUrl?: string
}

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
  return QUOTES[days % QUOTES.length]
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RocketLeague(): React.JSX.Element {
  const [searchQuery, setSearchQuery]     = useState('')
  const [searchResults, setSearchResults] = useState<RLSearchPlayer[]>([])
  const [searching, setSearching]         = useState(false)
  const [searchError, setSearchError]     = useState('')

  const [linkedProfile, setLinkedProfile] = useState<RLLinkedProfile | null>(null)
  const [profileData, setProfileData]     = useState<RLProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError]   = useState('')
  const [selectedPlaylist, setSelectedPlaylist] = useState(11)

  const [sessions, setSessions]         = useState<RLSession[]>([])
  const [form, setForm]                 = useState({
    date: new Date().toISOString().slice(0, 10),
    start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '',
  })
  const [saving, setSaving]             = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)

  const [rankHovered, setRankHovered]   = useState(false)

  // Detecta primeira visita do dia para a animação da frase
  const [isFirstTimeToday] = useState(() => {
    const key = `habitos_rl_quote_${getTodayKey()}`
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, '1')
      return true
    }
    return false
  })

  const hasApi = !!(window as { electronApi?: { rocketLeague?: unknown } }).electronApi?.rocketLeague

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
  }, [])

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
        setProfileError(res.error?.includes('404') ? 'Jogador não encontrado.' : 'Erro ao carregar perfil.')
      }
    } catch {
      setProfileError('Erro ao carregar perfil.')
    } finally {
      setLoadingProfile(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim() || !hasApi) return
    setSearching(true)
    setSearchError('')
    setSearchResults([])
    try {
      const res = await window.api!.rocketLeague!.search(searchQuery) as { ok: boolean; data?: RLSearchPlayer[]; error?: string }
      if (res.ok) {
        setSearchResults(res.data ?? [])
        if (!res.data?.length) setSearchError('Nenhum jogador encontrado.')
      } else {
        setSearchError('Erro na busca. Tente novamente.')
      }
    } catch {
      setSearchError('Erro na busca.')
    } finally {
      setSearching(false)
    }
  }

  function linkProfile(player: RLSearchPlayer) {
    const p: RLLinkedProfile = { platform: player.platformSlug, username: player.platformUserHandle }
    localStorage.setItem('habitos_rl_profile', JSON.stringify(p))
    setLinkedProfile(p)
    setSearchResults([])
    setSearchQuery('')
    fetchProfile(p.platform, p.username)
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
    })
    setSaving(false)
    setForm(f => ({ ...f, start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '' }))
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
          <p className="text-sm font-medium text-text-secondary mb-1">Disponível no app desktop</p>
          <p className="text-xs">Abra o aplicativo no Windows para acessar esta seção.</p>
        </div>
      )}

      {hasApi && (
        <>
          {/* ── Search ──────────────────────────────────────────────────────── */}
          {!linkedProfile && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-text-primary">Vincular perfil</h2>
                <p className="text-xs text-text-muted mt-1">Busque pelo nome do jogador para importar estatísticas via RLTracker.</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="Nome do jogador..."
                  className="flex-1 px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-all hover:brightness-110 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 2px 10px rgba(249,115,22,0.35)' }}
                >
                  {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                  Buscar
                </button>
              </div>
              {searchError && <p className="text-sm text-red-400">{searchError}</p>}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((player, i) => (
                    <button
                      key={i}
                      onClick={() => linkProfile(player)}
                      className="rl-search-result w-full flex items-center gap-3 p-3 rounded-lg border border-bg-border hover:border-orange-400/60 bg-bg-primary hover:bg-orange-500/5 text-left"
                    >
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 ring-1 ring-orange-400/30" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-bg-border flex items-center justify-center shrink-0">
                          <Gamepad2 size={15} className="text-text-muted" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">{player.platformUserHandle}</p>
                        <p className="text-xs text-text-muted">{PLATFORM_LABELS[player.platformSlug] ?? player.platformSlug}</p>
                      </div>
                      <span className="text-xs font-medium text-orange-400 shrink-0">Vincular →</span>
                    </button>
                  ))}
                </div>
              )}
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
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Rank */}
                      <div
                        className="bg-bg-primary rounded-xl p-4 col-span-2 sm:col-span-1 flex flex-col gap-1"
                        style={{
                          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                          transform: rankHovered ? 'translateY(-3px)' : 'translateY(0)',
                          boxShadow: rankHovered
                            ? `0 0 24px ${rankColor}50, 0 10px 32px rgba(0,0,0,0.2)`
                            : `0 0 0px transparent`,
                        }}
                        onMouseEnter={() => setRankHovered(true)}
                        onMouseLeave={() => setRankHovered(false)}
                      >
                        <p className="text-xs text-text-muted">Rank atual</p>
                        {activeSegment.stats.tier?.metadata?.iconUrl && (
                          <img
                            src={activeSegment.stats.tier.metadata.iconUrl}
                            alt=""
                            className="w-10 h-10 object-contain"
                            style={{ filter: `drop-shadow(0 0 6px ${rankColor}60)` }}
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

                      {/* Matches */}
                      <div className="rl-stat-card bg-bg-primary rounded-xl p-4 flex flex-col gap-1">
                        <p className="text-xs text-text-muted">Partidas</p>
                        <Swords size={18} className="text-blue-400" />
                        <p className="text-xl font-bold text-text-primary">
                          {activeSegment.stats.matchesPlayed?.value?.toLocaleString('pt-BR') ?? '—'}
                        </p>
                        <p className="text-xs text-text-muted">jogadas</p>
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
            <div className="grid grid-cols-3 gap-3">
              <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                <p className="text-xs text-text-muted mb-1">MMR hoje</p>
                <p className={`text-2xl font-bold ${totalMMRToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalMMRToday > 0 ? '+' : ''}{totalMMRToday}
                </p>
              </div>
              <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                <p className="text-xs text-text-muted mb-1">Peak local</p>
                <p className="text-2xl font-bold text-yellow-400">{peakMMR ?? '—'}</p>
              </div>
              <div className="rl-stat-card bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
                <p className="text-xs text-text-muted mb-1">Sessões</p>
                <p className="text-2xl font-bold text-text-primary">{sessions.length}</p>
              </div>
            </div>
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
                      <div className="flex items-center gap-3 mt-0.5">
                        {session.matches > 0 && (
                          <span className="text-xs text-text-muted">
                            {session.wins}W / {session.matches - session.wins}L
                            {` · ${Math.round((session.wins / session.matches) * 100)}% win`}
                          </span>
                        )}
                        {session.notes && <span className="text-xs text-text-muted truncate">{session.notes}</span>}
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
