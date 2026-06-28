import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gamepad2, Search, RefreshCw, Unlink, TrendingUp, TrendingDown,
  Trophy, Target, Swords, Trash2, Plus, ChevronDown, ChevronUp,
  BookOpen, ChevronRight, Zap, Tv, Star, ExternalLink, Pencil, Check, X,
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
  tags?: string | null
}

const RL_TAGS = [
  { id: 'focado',     label: 'Focado',      color: '#4ade80' },
  { id: 'tilted',     label: 'Tilted',      color: '#f87171' },
  { id: 'duo',        label: 'Duo',         color: '#60a5fa' },
  { id: 'aquecimento',label: 'Aquecimento', color: '#fb923c' },
  { id: 'treino',     label: 'Treino',      color: '#a78bfa' },
  { id: 'solo',       label: 'Solo',        color: '#facc15' },
]

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

type ProPlayer = { tag: string; name: string; country: string; team: string; earnings?: string; titles?: string[] }
type RLTournament = { name: string; region: string; startDate: string; endDate: string; prize: string; link: string }

// Dados atualizados: RLCS 2025-2026  (earnings = career aprox.; títulos = maiores conquistas)
const DEFAULT_PRO_PLAYERS: ProPlayer[] = [
  // NRG — Campeões Mundiais 2025
  { tag: 'Atomic',      name: 'Atomic',             country: 'US', team: 'NRG',
    earnings: '~$350k', titles: ['RLCS 2025 World Championship'] },
  { tag: 'BeastMode',   name: 'BeastMode',          country: 'US', team: 'NRG',
    earnings: '~$320k', titles: ['RLCS 2025 World Championship'] },
  { tag: 'Daniel',      name: 'Daniel',             country: 'US', team: 'NRG',
    earnings: '~$280k', titles: ['RLCS 2025 World Championship'] },
  // Gen.G Mobil1 Racing (NA)
  { tag: 'jstn.',       name: 'Justin Morales',     country: 'US', team: 'Gen.G Mobil1',
    earnings: '~$600k', titles: ['RLCS Season 9 World Champion', 'RLCS X World Champion'] },
  { tag: 'rise.',       name: 'rise.',              country: 'GB', team: 'Gen.G Mobil1',
    earnings: '~$250k' },
  { tag: 'MajicBear',   name: 'MajicBear',          country: 'US', team: 'Gen.G Mobil1',
    earnings: '~$150k' },
  // Karmine Corp
  { tag: 'Vatira',      name: 'Vatira',             country: 'FR', team: 'Karmine Corp',
    earnings: '~$380k', titles: ['RLCS 2026 Paris Major', 'RLCS 2025 Birmingham Major', 'RLCS 2026 Kick-Off'] },
  { tag: 'Atow',        name: 'Atow',               country: 'FR', team: 'Karmine Corp',
    earnings: '~$200k', titles: ['RLCS 2026 Paris Major', 'RLCS 2025 Birmingham Major', 'RLCS 2026 Kick-Off'] },
  { tag: 'juicy',       name: 'juicy',              country: 'FR', team: 'Karmine Corp',
    earnings: '~$160k', titles: ['RLCS 2026 Paris Major', 'RLCS 2025 Birmingham Major', 'RLCS 2026 Kick-Off'] },
  // Team Vitality (EU)
  { tag: 'ExoTiiK',     name: 'Brice Bigeard',      country: 'FR', team: 'Vitality',
    earnings: '~$140k' },
  { tag: 'zen',         name: 'zen',                country: 'FR', team: 'Vitality',
    earnings: '~$120k' },
  { tag: 'stizzy',      name: 'stizzy',             country: 'ES', team: 'Vitality',
    earnings: '~$100k' },
  // Gentle Mates Alpine (EU)
  { tag: 'Oski',        name: 'Oski',               country: 'AT', team: 'Gentle Mates',
    earnings: '~$130k' },
  { tag: 'nass',        name: 'Nassim Donamel',     country: 'FR', team: 'Gentle Mates',
    earnings: '~$180k' },
  { tag: 'Radosin',     name: 'Radosin',            country: 'RS', team: 'Gentle Mates',
    earnings: '~$90k' },
  // Team Falcons — Raleigh Major 2025 Champions (MENA)
  { tag: 'Kiileerrz',   name: 'Kiileerrz',          country: 'SA', team: 'Team Falcons',
    earnings: '~$250k', titles: ['RLCS 2025 Raleigh Major'] },
  { tag: 'Rw9',         name: 'Rw9',                country: 'SA', team: 'Team Falcons',
    earnings: '~$200k', titles: ['RLCS 2025 Raleigh Major'] },
  { tag: 'dralii',      name: 'dralii',             country: 'FR', team: 'Team Falcons',
    earnings: '~$150k', titles: ['RLCS 2025 Raleigh Major'] },
  // Twisted Minds (MENA)
  { tag: 'M0nkey M00n', name: 'M0nkey M00n',        country: 'FR', team: 'Twisted Minds',
    earnings: '~$480k' },
  { tag: 'Nwpo',        name: 'Nwpo',               country: 'BR', team: 'Twisted Minds',
    earnings: '~$150k' },
  { tag: 'trk511',      name: 'trk511',             country: 'SA', team: 'Twisted Minds',
    earnings: '~$80k' },
  // Free agents
  { tag: 'Fairy Peak',  name: 'Victor Locquet',     country: 'FR', team: 'Free Agent',
    earnings: '~$700k', titles: ['RLCS Season 8 World Champion'] },
  { tag: 'Alpha54',     name: 'Yacine Benjaa',      country: 'FR', team: 'Free Agent',
    earnings: '~$200k' },
  { tag: 'AztraL',      name: 'AztraL',             country: 'FR', team: 'Free Agent',
    earnings: '~$300k' },
  { tag: 'Arsenal',     name: 'Jacob Morrow',       country: 'US', team: 'Free Agent',
    earnings: '~$200k' },
  { tag: 'Firstkiller', name: 'Marcelino Nunez',    country: 'US', team: 'Free Agent',
    earnings: '~$180k' },
  { tag: 'Scrub Killa', name: 'Brandon Morais',     country: 'GB', team: 'Free Agent',
    earnings: '~$250k' },
  // Aposentados
  { tag: 'Kaydop',      name: 'Alexandre Courant',  country: 'FR', team: 'Retired',
    earnings: '~$850k', titles: ['3× RLCS World Champion'] },
  { tag: 'Squishy',     name: 'Mariano Arruda',     country: 'US', team: 'Retired',
    earnings: '~$500k', titles: ['RLCS Season 5 World Champion', 'RLCS Season 6 World Champion'] },
  { tag: 'GarrettG',    name: 'Garrett Gordon',     country: 'US', team: 'Retired',
    earnings: '~$700k', titles: ['RLCS Season 5 World Champion', 'RLCS Season 6 World Champion'] },
  { tag: 'ViolentPanda',name: 'Remco den Boer',     country: 'NL', team: 'Retired',
    earnings: '~$550k', titles: ['RLCS Season 3 World Champion'] },
  { tag: 'Turbopolsa',  name: 'Pierre Silfver',     country: 'SE', team: 'Retired',
    earnings: '~$700k', titles: ['5× RLCS World Champion'] },
  // Content Creators
  { tag: 'Musty',       name: 'Musty',              country: 'US', team: 'Content Creator' },
  { tag: 'Lethamyr',    name: 'Wyatt Troutt',       country: 'US', team: 'Content Creator' },
  { tag: 'Sunless Khan',name: 'Sunless Khan',       country: 'US', team: 'Content Creator' },
  { tag: 'Klassux',     name: 'Klassux',            country: 'US', team: 'Content Creator' },
  { tag: 'Rizzo',       name: 'Rizzo',              country: 'CA', team: 'Content Creator' },
]

const DEFAULT_TOURNAMENTS: RLTournament[] = [
  {
    name: 'RLCS 2026 Paris Major',
    region: 'INT', startDate: '2026-05-20', endDate: '2026-05-24', prize: '$102k',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2026/Paris_Major',
  },
  {
    name: 'RLCS 2026 Boston Major',
    region: 'INT', startDate: '2026-02-27', endDate: '2026-03-02', prize: '$150k',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2026/Boston_Major',
  },
  {
    name: 'RLCS 2026 Kick-Off Weekend',
    region: 'INT', startDate: '2025-12-05', endDate: '2025-12-07', prize: '$75k',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2026/Kick-Off_Weekend',
  },
  {
    name: 'RLCS 2025 World Championship',
    region: 'INT', startDate: '2025-09-10', endDate: '2025-09-14', prize: '$1M',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2025',
  },
  {
    name: 'RLCS 2025 Raleigh Major',
    region: 'INT', startDate: '2025-06-26', endDate: '2025-06-29', prize: '$150k',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2025/Raleigh_Major',
  },
  {
    name: 'RLCS 2025 Birmingham Major',
    region: 'INT', startDate: '2025-03-27', endDate: '2025-03-30', prize: '$150k',
    link: 'https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/2025/Birmingham_Major',
  },
]

function countryFlag(code: string): string {
  const base = 0x1F1E6 - 65
  return String.fromCodePoint(...code.toUpperCase().slice(0, 2).split('').map(c => base + c.charCodeAt(0)))
}

const COUNTRY_NAMES: Record<string, string> = {
  US: 'Estados Unidos', FR: 'França',     GB: 'Reino Unido',
  SA: 'Arábia Saudita', BR: 'Brasil',     AT: 'Áustria',
  RS: 'Sérvia',         NL: 'Holanda',    SE: 'Suécia',
  CA: 'Canadá',         ES: 'Espanha',    DE: 'Alemanha',
  IT: 'Itália',         PT: 'Portugal',   AU: 'Austrália',
  RU: 'Rússia',         KR: 'Coreia do Sul',
}

function getTeamColor(team: string): string {
  const c: Record<string, string> = {
    'NRG': '#ef4444',
    'Gen.G Mobil1': '#f59e0b',
    'Karmine Corp': '#3b82f6',
    'Vitality': '#eab308',
    'Gentle Mates': '#a855f7',
    'Team Falcons': '#22c55e',
    'Twisted Minds': '#ec4899',
    'Free Agent': '#6b7280',
    'Retired': '#4b5563',
    'Content Creator': '#9147ff',
  }
  return c[team] ?? '#f97316'
}

function getTeamAbbr(team: string): string {
  const a: Record<string, string> = {
    'NRG': 'NRG',
    'Gen.G Mobil1': 'GEN.G',
    'Karmine Corp': 'KC',
    'Vitality': 'VIT',
    'Gentle Mates': 'GM',
    'Team Falcons': 'FAL',
    'Twisted Minds': 'TM',
    'Free Agent': 'FA',
    'Retired': 'RET',
    'Content Creator': 'CC',
  }
  return a[team] ?? team.slice(0, 3).toUpperCase()
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
  const [userToken, setUserToken]         = useState('')
  const [userId, setUserId]               = useState('')
  const [userName, setUserName]           = useState('')
  const [loadingOAuth, setLoadingOAuth]   = useState(false)
  const [oauthError, setOauthError]       = useState('')
  const [followed, setFollowed]           = useState<Array<{ broadcaster_login: string; broadcaster_name: string }>>([])
  const [followedStreams, setFollowedStreams] = useState<TwitchStream[]>([])
  const [loadingFollowed, setLoadingFollowed] = useState(false)
  const [followedError, setFollowedError]     = useState('')

  // ── Curated / custom list ─────────────────────────────────────────────────
  const [selectedLogins, setSelectedLogins] = useState<Set<string>>(new Set(DEFAULT_STREAMERS.map(s => s.login)))
  const [customStreamers, setCustomStreamers] = useState<RLStreamer[]>([])
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [addInput, setAddInput]     = useState('')

  // ── Pro Players ───────────────────────────────────────────────────────────
  const [proPlayers, setProPlayers] = useState<ProPlayer[]>(DEFAULT_PRO_PLAYERS)
  const [showManagePros, setShowManagePros] = useState(false)
  const [editingPro, setEditingPro] = useState<string | null>(null)
  const [editProForm, setEditProForm] = useState<ProPlayer>({ tag: '', name: '', country: '', team: '', earnings: '' })
  const [addingPro, setAddingPro] = useState(false)
  const [newProForm, setNewProForm] = useState<ProPlayer>({ tag: '', name: '', country: '', team: '', earnings: '' })
  const [selectedPro, setSelectedPro] = useState<ProPlayer | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  // ── Start.gg ──────────────────────────────────────────────────────────────
  const [syncingTourneys, setSyncingTourneys] = useState(false)
  const [syncingPros, setSyncingPros] = useState(false)
  const [startggError, setStartggError] = useState('')
  const [prosTourneySlug, setProsTourneySlug] = useState('rlcs-2026-paris-major')

  // ── Tournaments ───────────────────────────────────────────────────────────
  const [tournaments, setTournaments] = useState<RLTournament[]>(DEFAULT_TOURNAMENTS)
  const [showManageTourneys, setShowManageTourneys] = useState(false)
  const [editingTourney, setEditingTourney] = useState<string | null>(null)
  const [editTourneyForm, setEditTourneyForm] = useState<RLTournament>({ name: '', region: '', startDate: '', endDate: '', prize: '', link: '' })
  const [addingTourney, setAddingTourney] = useState(false)
  const [newTourneyForm, setNewTourneyForm] = useState<RLTournament>({ name: '', region: '', startDate: '', endDate: '', prize: '', link: '' })

  const [liveStreams,     setLiveStreams]     = useState<TwitchStream[]>([])
  const [loadingLive,    setLoadingLive]    = useState(false)
  const [liveError,      setLiveError]      = useState('')
  const [twitchNotSetup, setTwitchNotSetup] = useState(false)

  const fetchLiveRef     = useRef<(() => Promise<void>) | null>(null)
  const fetchFollowedRef = useRef<(() => Promise<void>) | null>(null)

  const allStreamers  = [...DEFAULT_STREAMERS, ...customStreamers]
  const activeLogins  = allStreamers.filter(s => selectedLogins.has(s.login))

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

  // Load all persisted settings from Supabase on mount
  useEffect(() => {
    if (!window.api?.settings) { setSettingsLoaded(true); return }
    Promise.all([
      window.api.settings.get('rl_twitch_user'),
      window.api.settings.get('rl_streamers_selected'),
      window.api.settings.get('rl_streamers_custom'),
      window.api.settings.get('rl_pro_players'),
      window.api.settings.get('rl_tournaments'),
    ]).then(([twitchUser, selected, custom, proPlayersData, tourneysData]) => {
      if (twitchUser) {
        const u = twitchUser as { token: string; userId: string; userName: string }
        setUserToken(u.token ?? '')
        setUserId(u.userId ?? '')
        setUserName(u.userName ?? '')
      }
      if (selected) setSelectedLogins(new Set(selected as string[]))
      if (custom) setCustomStreamers(custom as RLStreamer[])
      if (proPlayersData) {
        const defMap = new Map(DEFAULT_PRO_PLAYERS.map(p => [p.tag, p]))
        setProPlayers((proPlayersData as ProPlayer[]).map(p => {
          const def = defMap.get(p.tag)
          return {
            ...p,
            earnings: p.earnings ?? def?.earnings,
            titles:   p.titles   ?? def?.titles,
          }
        }))
      }
      if (tourneysData) setTournaments(tourneysData as RLTournament[])
      setSettingsLoaded(true)
    }).catch(() => setSettingsLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch after settings are loaded from Supabase
  useEffect(() => {
    if (!settingsLoaded) return
    fetchLive()
    if (userToken && userId) fetchFollowed()
  }, [settingsLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

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
      window.api?.settings?.set('rl_twitch_user', {
        token: res.access_token, refresh: res.refresh_token,
        userId: res.user_id, userName: res.user_name,
      })
      setUserToken(res.access_token); setUserId(res.user_id); setUserName(res.user_name)
      fetchFollowed(res.access_token, res.user_id)
    } catch (e) {
      const msg = String(e)
      if (!msg.includes('cancelled')) setOauthError('Erro ao fazer login: ' + msg)
    } finally { setLoadingOAuth(false) }
  }

  function clearUserSession() {
    window.api?.settings?.set('rl_twitch_user', null)
    setUserToken(''); setUserId(''); setUserName('')
    setFollowed([]); setFollowedStreams([])
  }

  // ── List helpers ──────────────────────────────────────────────────────────

  function toggleLogin(login: string) {
    const next = new Set(selectedLogins)
    if (next.has(login)) next.delete(login); else next.add(login)
    setSelectedLogins(next)
    window.api?.settings?.set('rl_streamers_selected', [...next])
    const newLogins = [...DEFAULT_STREAMERS, ...customStreamers].filter(s => next.has(s.login)).map(s => s.login)
    if (newLogins.length) fetchLive(newLogins)
  }

  function addCustomStreamer() {
    const login = normalizeLogin(addInput)
    if (!login || allStreamers.some(s => s.login === login)) return
    const updated = [...customStreamers, { name: login, login }]
    setCustomStreamers(updated)
    window.api?.settings?.set('rl_streamers_custom', updated)
    const next = new Set(selectedLogins); next.add(login)
    setSelectedLogins(next)
    window.api?.settings?.set('rl_streamers_selected', [...next])
    setAddInput('')
  }

  function removeCustom(login: string) {
    const updated = customStreamers.filter(s => s.login !== login)
    setCustomStreamers(updated)
    window.api?.settings?.set('rl_streamers_custom', updated)
    const next = new Set(selectedLogins); next.delete(login)
    setSelectedLogins(next)
    window.api?.settings?.set('rl_streamers_selected', [...next])
  }

  // ── Pro Players helpers ───────────────────────────────────────────────────

  function saveProPlayers(players: ProPlayer[]) {
    setProPlayers(players)
    window.api?.settings?.set('rl_pro_players', players)
  }

  function removeProPlayer(tag: string) {
    saveProPlayers(proPlayers.filter(p => p.tag !== tag))
  }

  function startEditPro(p: ProPlayer) {
    setEditingPro(p.tag)
    setEditProForm({ ...p })
  }

  function saveEditPro() {
    if (!editingPro || !editProForm.tag.trim()) return
    saveProPlayers(proPlayers.map(p => p.tag === editingPro ? { ...editProForm } : p))
    setEditingPro(null)
  }

  function addProPlayer() {
    if (!newProForm.tag.trim()) return
    saveProPlayers([...proPlayers, { ...newProForm }])
    setNewProForm({ tag: '', name: '', country: '', team: '', earnings: '' })
    setAddingPro(false)
  }

  function handleProDrop(toIdx: number) {
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const updated = [...proPlayers]
    const [moved] = updated.splice(dragIdx, 1)
    updated.splice(toIdx, 0, moved)
    saveProPlayers(updated)
    setDragIdx(null)
    setDragOverIdx(null)
  }

  // ── Tournament helpers ─────────────────────────────────────────────────────

  function saveTournaments(t: RLTournament[]) {
    setTournaments(t)
    window.api?.settings?.set('rl_tournaments', t)
  }

  function removeTourney(name: string) { saveTournaments(tournaments.filter(t => t.name !== name)) }

  function startEditTourney(t: RLTournament) { setEditingTourney(t.name); setEditTourneyForm({ ...t }) }

  function saveEditTourney() {
    if (!editingTourney || !editTourneyForm.name.trim()) return
    saveTournaments(tournaments.map(t => t.name === editingTourney ? { ...editTourneyForm } : t))
    setEditingTourney(null)
  }

  function addTourney() {
    if (!newTourneyForm.name.trim()) return
    saveTournaments([{ ...newTourneyForm }, ...tournaments])
    setNewTourneyForm({ name: '', region: '', startDate: '', endDate: '', prize: '', link: '' })
    setAddingTourney(false)
  }

  // ── Start.gg sync ─────────────────────────────────────────────────────────

  const STARTGG_LEAGUE_QUERY = `
    query LeagueEvents($slug: String!) {
      league(slug: $slug) {
        events(query: { page: 1, perPage: 100 }) {
          nodes {
            slug
            name
            startAt
            endAt
            numEntrants
          }
        }
      }
    }
  `

  const STARTGG_ENTRANTS_QUERY = `
    query TournamentEntrants($slug: String!) {
      tournament(slug: $slug) {
        name
        events {
          name
          numEntrants
          entrants(query: { page: 1, perPage: 50 }) {
            nodes {
              name
              participants {
                gamerTag
                user {
                  location { country }
                }
              }
            }
          }
        }
      }
    }
  `

  async function syncTourneysFromStartgg() {
    if (!window.api?.rocketLeague?.startggQuery) return
    setSyncingTourneys(true); setStartggError('')
    try {
      const res = await window.api.rocketLeague.startggQuery(
        STARTGG_LEAGUE_QUERY,
        { slug: 'rocket-league-championship-series-2026' }
      )
      if (!res.ok) { setStartggError('Erro Start.gg: ' + res.error); return }

      type SGGEvent = { slug: string; name: string; startAt: number; endAt: number; numEntrants: number }
      const nodes: SGGEvent[] = (res.data as { data?: { league?: { events?: { nodes: SGGEvent[] } } } })
        ?.data?.league?.events?.nodes ?? []

      const majorKw = ['major', 'world', 'kick-off', 'kickoff', 'championship']
      const majors = nodes.filter(e => majorKw.some(kw => e.name.toLowerCase().includes(kw)))

      if (!majors.length) { setStartggError('Nenhum Major encontrado. Verifique a liga.'); return }

      const newTourneys: RLTournament[] = majors.map(e => ({
        name: e.name,
        region: 'INT',
        startDate: e.startAt ? new Date(e.startAt * 1000).toISOString().slice(0, 10) : '',
        endDate: e.endAt ? new Date(e.endAt * 1000).toISOString().slice(0, 10) : '',
        prize: '',
        link: `https://www.start.gg/league/rocket-league-championship-series-2026/event/${e.slug}`,
      }))
      newTourneys.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''))
      saveTournaments(newTourneys)
    } catch (e) {
      setStartggError('Erro: ' + String(e))
    } finally {
      setSyncingTourneys(false)
    }
  }

  async function syncProsFromStartgg() {
    if (!prosTourneySlug.trim() || !window.api?.rocketLeague?.startggQuery) return
    setSyncingPros(true); setStartggError('')
    try {
      const res = await window.api.rocketLeague.startggQuery(
        STARTGG_ENTRANTS_QUERY,
        { slug: prosTourneySlug.trim() }
      )
      if (!res.ok) { setStartggError('Erro Start.gg: ' + res.error); return }

      type SGGParticipant = { gamerTag: string; user?: { location?: { country?: string } } }
      type SGGEntrant = { name: string; participants: SGGParticipant[] }
      type SGGEvent = { name: string; numEntrants: number; entrants: { nodes: SGGEntrant[] } }
      type SGGTournament = { name: string; events: SGGEvent[] }
      const tData: SGGTournament | undefined = (res.data as { data?: { tournament?: SGGTournament } })?.data?.tournament

      if (!tData) { setStartggError('Torneio não encontrado. Verifique o slug.'); return }

      const event3v3 = tData.events.find(e => e.name.toLowerCase().includes('3v3'))
        ?? tData.events.reduce((a, b) => (a.numEntrants ?? 0) >= (b.numEntrants ?? 0) ? a : b, tData.events[0])

      if (!event3v3) { setStartggError('Nenhum evento 3v3 encontrado no torneio.'); return }

      const newPros: ProPlayer[] = []
      for (const entrant of event3v3.entrants.nodes) {
        const teamName = entrant.name
        for (const p of entrant.participants) {
          if (!p.gamerTag) continue
          newPros.push({
            tag: p.gamerTag,
            name: p.gamerTag,
            country: p.user?.location?.country ?? 'US',
            team: teamName,
          })
        }
      }
      if (!newPros.length) { setStartggError('Nenhum jogador encontrado no evento.'); return }
      saveProPlayers(newPros)
    } catch (e) {
      setStartggError('Erro: ' + String(e))
    } finally {
      setSyncingPros(false)
    }
  }

  function tourneyStatus(t: RLTournament): 'upcoming' | 'ongoing' | 'done' {
    const today = new Date().toISOString().slice(0, 10)
    if (t.endDate && today > t.endDate) return 'done'
    if (t.startDate && today >= t.startDate) return 'ongoing'
    return 'upcoming'
  }

  function daysUntil(dateStr: string): number {
    const target = new Date(dateStr + 'T12:00:00')
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return Math.ceil((target.getTime() - now.getTime()) / 86400000)
  }

  const nextTourney = tournaments
    .filter(t => tourneyStatus(t) === 'upcoming' && t.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null

  const ongoingTourney = tournaments.find(t => tourneyStatus(t) === 'ongoing') ?? null

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
        <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
          <Trophy size={14} style={{ color: '#f59e0b' }} />
          <span className="text-sm font-semibold text-text-primary">Torneios RLCS</span>
          <span className="text-xs text-text-muted">{tournaments.length} eventos</span>
        </div>

        {/* ── Countdown banner ─────────────────────────────────────────────── */}
        {ongoingTourney ? (
          <div className="mx-4 my-3 flex items-center gap-3 px-4 py-3 rounded-xl border animate-pulse"
            style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="w-2 h-2 rounded-full shrink-0 bg-red-500" style={{ boxShadow: '0 0 6px rgba(239,68,68,0.9)' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-400 leading-tight truncate">{ongoingTourney.name}</p>
              <p className="text-xs text-text-muted mt-0.5">Acontecendo agora · termina {new Date(ongoingTourney.endDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</p>
            </div>
            {ongoingTourney.link && (
              <button onClick={() => window.api!.rocketLeague!.openUrl(ongoingTourney.link)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-white hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
                AO VIVO <ExternalLink size={10} />
              </button>
            )}
          </div>
        ) : nextTourney ? (
          (() => {
            const days = daysUntil(nextTourney.startDate)
            const pct  = Math.max(0, Math.min(100, 100 - (days / 90) * 100))
            return (
              <div className="mx-4 my-3 px-4 py-3 rounded-xl border"
                style={{ background: 'rgba(245,158,11,0.07)', borderColor: 'rgba(245,158,11,0.25)' }}>
                <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-text-primary leading-tight truncate">{nextTourney.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {new Date(nextTourney.startDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                      {nextTourney.prize ? ` · ${nextTourney.prize}` : ''}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black" style={{ color: '#f59e0b' }}>{days}</p>
                    <p className="text-[10px] text-text-muted leading-none">dias</p>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f59e0b, #fb923c)' }} />
                </div>
              </div>
            )
          })()
        ) : null}

        {/* Tournament list */}
        <div className="divide-y divide-bg-border">
          {tournaments.map(t => {
            const status = tourneyStatus(t)
            const fmtDate = (d: string) => d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
            const regionColors: Record<string, string> = { INT: '#f59e0b', NA: '#3b82f6', EU: '#8b5cf6', SAM: '#f97316', MENA: '#ef4444', APAC: '#10b981', OCE: '#06b6d4' }
            const rColor = regionColors[t.region] ?? '#6b7280'
            return (
              <div key={t.name} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-text-primary truncate">{t.name}</p>
                    {status === 'ongoing' && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded animate-pulse" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>AO VIVO</span>
                    )}
                    {status === 'upcoming' && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>PRÓXIMO</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {t.region && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: `${rColor}20`, color: rColor }}>{t.region}</span>
                    )}
                    {(t.startDate || t.endDate) && (
                      <span className="text-xs text-text-muted">
                        {fmtDate(t.startDate)}{t.endDate && t.endDate !== t.startDate ? ` – ${fmtDate(t.endDate)}` : ''}
                      </span>
                    )}
                    {t.prize && <span className="text-xs font-semibold" style={{ color: '#f59e0b' }}>{t.prize}</span>}
                  </div>
                </div>
                {t.link ? (
                  <button onClick={() => window.api!.rocketLeague!.openUrl(t.link)}
                    className="shrink-0 p-1.5 rounded-lg text-text-muted hover:text-yellow-400 hover:bg-bg-border/40 transition-colors" title="Abrir Liquipedia">
                    <ExternalLink size={12} />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        {/* External links footer */}
        <div className="px-4 py-3 border-t border-bg-border flex flex-wrap gap-2">
          <button onClick={() => window.api!.rocketLeague!.openUrl('https://liquipedia.net/rocketleague/Rocket_League_Championship_Series')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-bg-border text-text-secondary hover:text-text-primary hover:border-yellow-400/50 transition-colors">
            <Trophy size={10} style={{ color: '#f59e0b' }} /> Liquipedia <ExternalLink size={9} className="opacity-50" />
          </button>
          <button onClick={() => window.api!.rocketLeague!.openUrl('https://blast.tv/rl/tournaments')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-bg-border text-text-secondary hover:text-text-primary hover:border-orange-400/50 transition-colors">
            <Zap size={10} style={{ color: '#f97316' }} /> BLAST.tv <ExternalLink size={9} className="opacity-50" />
          </button>
          <button onClick={() => window.api!.rocketLeague!.openUrl('https://start.gg/league/rocket-league-championship-series-2026/details')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-bg-border text-text-secondary hover:text-text-primary hover:border-blue-400/50 transition-colors">
            <BookOpen size={10} className="text-blue-400" /> Start.gg <ExternalLink size={9} className="opacity-50" />
          </button>
        </div>

        {/* Manage panel */}
        <div className="border-t border-bg-border">
          <button onClick={() => setShowManageTourneys(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-border/20 transition-colors">
            <Plus size={12} /> Gerenciar torneios
            {showManageTourneys ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {showManageTourneys && (
            <div className="px-4 pb-4 space-y-3 border-t border-bg-border">
              {/* Add / restore / Start.gg sync */}
              {!addingTourney ? (
                <div className="space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setAddingTourney(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">
                      <Plus size={12} /> Adicionar torneio
                    </button>
                    <button onClick={() => saveTournaments(DEFAULT_TOURNAMENTS)}
                      className="text-xs text-text-muted hover:text-yellow-400 transition-colors">
                      Restaurar padrão
                    </button>
                  </div>
                  {/* Start.gg sync */}
                  <div className="flex items-center gap-2 pt-1 border-t border-bg-border/40">
                    <span className="text-xs text-text-muted flex-1">Buscar Majors da temporada via Start.gg</span>
                    <button onClick={syncTourneysFromStartgg} disabled={syncingTourneys}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110 shrink-0"
                      style={{ background: 'rgba(245,158,11,0.7)' }}>
                      <RefreshCw size={11} className={syncingTourneys ? 'animate-spin' : ''} />
                      {syncingTourneys ? 'Buscando…' : 'Start.gg'}
                    </button>
                  </div>
                  {startggError && <p className="text-xs text-red-400">{startggError}</p>}
                </div>
              ) : (
                <div className="pt-3 space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['name', 'region', 'prize'] as const).map(f => (
                      <input key={f} type="text"
                        placeholder={f === 'name' ? 'Nome do torneio' : f === 'region' ? 'Região (INT)' : 'Prize ($150k)'}
                        value={newTourneyForm[f]}
                        onChange={e => setNewTourneyForm(p => ({ ...p, [f]: e.target.value }))}
                        className="px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60 placeholder:text-text-muted transition-colors" />
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input type="date" value={newTourneyForm.startDate}
                      onChange={e => setNewTourneyForm(p => ({ ...p, startDate: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60" />
                    <input type="date" value={newTourneyForm.endDate}
                      onChange={e => setNewTourneyForm(p => ({ ...p, endDate: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60" />
                    <input type="text" placeholder="Link (Liquipedia)" value={newTourneyForm.link}
                      onChange={e => setNewTourneyForm(p => ({ ...p, link: e.target.value }))}
                      className="px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60 placeholder:text-text-muted" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addTourney} disabled={!newTourneyForm.name.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110"
                      style={{ background: 'rgba(245,158,11,0.7)' }}>
                      <Check size={11} /> Adicionar
                    </button>
                    <button onClick={() => { setAddingTourney(false); setNewTourneyForm({ name: '', region: '', startDate: '', endDate: '', prize: '', link: '' }) }}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Tournaments list */}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {tournaments.map(t =>
                  editingTourney === t.name ? (
                    <div key={t.name} className="space-y-1.5 p-2 rounded-lg bg-bg-primary/50 border border-yellow-500/20">
                      <div className="grid grid-cols-3 gap-1">
                        {(['name', 'region', 'prize'] as const).map(f => (
                          <input key={f} type="text"
                            placeholder={f === 'name' ? 'Nome' : f === 'region' ? 'Região' : 'Prize'}
                            value={editTourneyForm[f]}
                            onChange={e => setEditTourneyForm(v => ({ ...v, [f]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveEditTourney()}
                            className="px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60 placeholder:text-text-muted" />
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <input type="date" value={editTourneyForm.startDate}
                          onChange={e => setEditTourneyForm(v => ({ ...v, startDate: e.target.value }))}
                          className="px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60" />
                        <input type="date" value={editTourneyForm.endDate}
                          onChange={e => setEditTourneyForm(v => ({ ...v, endDate: e.target.value }))}
                          className="px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60" />
                        <input type="text" placeholder="Link" value={editTourneyForm.link}
                          onChange={e => setEditTourneyForm(v => ({ ...v, link: e.target.value }))}
                          className="px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-yellow-500/60 placeholder:text-text-muted" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEditTourney}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white hover:brightness-110"
                          style={{ background: 'rgba(245,158,11,0.7)' }}>
                          <Check size={10} /> Salvar
                        </button>
                        <button onClick={() => setEditingTourney(null)}
                          className="px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={t.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-primary/50 text-xs hover:bg-bg-primary/70 transition-colors">
                      <span className="font-semibold text-text-primary truncate flex-1 min-w-0">{t.name}</span>
                      {t.region && <span className="text-xs px-1 py-0.5 rounded shrink-0" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>{t.region}</span>}
                      {t.prize && <span className="text-xs text-yellow-400 shrink-0">{t.prize}</span>}
                      <button onClick={() => startEditTourney(t)}
                        className="text-text-muted hover:text-text-primary transition-colors shrink-0">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => removeTourney(t.name)}
                        className="text-text-muted hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Pro Players ──────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-bg-border">
          <Star size={14} style={{ color: '#f97316' }} />
          <span className="text-sm font-semibold text-text-primary">Pro Players</span>
          <span className="text-xs text-text-muted">{proPlayers.length} jogadores</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-4 gap-2">
            {proPlayers.map((p, idx) => (
              <div
                key={p.tag}
                draggable
                onDragStart={e => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                onDrop={e => { e.preventDefault(); handleProDrop(idx) }}
                onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
                onClick={() => setSelectedPro(p)}
                className="relative flex flex-col items-center justify-between gap-0 p-2.5 rounded-xl select-none transition-all duration-100 aspect-square"
                style={{
                  background: dragOverIdx === idx && dragIdx !== idx
                    ? 'rgba(249,115,22,0.1)'
                    : idx === 0 ? 'rgba(245,158,11,0.08)'
                    : idx === 1 ? 'rgba(148,163,184,0.06)'
                    : idx === 2 ? 'rgba(180,115,45,0.06)'
                    : 'var(--color-bg-primary)',
                  border: dragOverIdx === idx && dragIdx !== idx
                    ? '2px dashed rgba(249,115,22,0.55)'
                    : idx === 0 ? '1px solid rgba(245,158,11,0.45)'
                    : idx === 1 ? '1px solid rgba(148,163,184,0.3)'
                    : idx === 2 ? '1px solid rgba(180,115,45,0.3)'
                    : '1px solid var(--color-bg-border)',
                  opacity: dragIdx === idx ? 0.3 : 1,
                  cursor: dragIdx !== null ? 'grabbing' : 'grab',
                }}
              >
                {/* Rank */}
                <div
                  className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black leading-none"
                  style={{
                    background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b87333' : 'rgba(255,255,255,0.07)',
                    color: idx < 3 ? '#000' : 'rgba(255,255,255,0.22)',
                  }}
                >
                  {idx + 1}
                </div>

                {/* Team icon */}
                <div
                  className="w-full flex items-center justify-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-black"
                  style={{ background: `${getTeamColor(p.team)}22`, color: getTeamColor(p.team) }}
                >
                  <div className="w-1 h-1 rounded-full shrink-0" style={{ background: getTeamColor(p.team) }} />
                  {getTeamAbbr(p.team)}
                </div>

                {/* Tag */}
                <span className="text-sm font-black text-text-primary text-center leading-tight w-full truncate px-1">{p.tag}</span>

                {/* Flag + country */}
                <span className="text-[11px] text-text-muted leading-none">{countryFlag(p.country)} {p.country}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Manage panel */}
        <div className="border-t border-bg-border">
          <button onClick={() => setShowManagePros(v => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-text-muted hover:text-text-primary hover:bg-bg-border/20 transition-colors">
            <Plus size={12} />
            Gerenciar jogadores
            {showManagePros ? <ChevronUp size={12} className="ml-auto" /> : <ChevronDown size={12} className="ml-auto" />}
          </button>

          {showManagePros && (
            <div className="px-4 pb-4 space-y-3 border-t border-bg-border">
              {/* Add / restore / Start.gg import */}
              {!addingPro ? (
                <div className="space-y-2.5 pt-3">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setAddingPro(true)}
                      className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text-primary transition-colors">
                      <Plus size={12} /> Adicionar jogador
                    </button>
                    <button onClick={() => saveProPlayers(DEFAULT_PRO_PLAYERS)}
                      className="text-xs text-text-muted hover:text-orange-400 transition-colors">
                      Restaurar padrão
                    </button>
                  </div>
                  {/* Start.gg import */}
                  <div className="space-y-1.5 pt-1 border-t border-bg-border/40">
                    <div className="flex gap-1.5">
                      <input type="text" placeholder="Slug do torneio (ex: rlcs-2026-paris-major)" value={prosTourneySlug}
                        onChange={e => setProsTourneySlug(e.target.value)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-text-muted" />
                      <button onClick={syncProsFromStartgg} disabled={!prosTourneySlug.trim() || syncingPros}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110 shrink-0"
                        style={{ background: 'rgba(249,115,22,0.7)' }}>
                        <RefreshCw size={11} className={syncingPros ? 'animate-spin' : ''} />
                        {syncingPros ? 'Buscando…' : 'Start.gg'}
                      </button>
                    </div>
                    {startggError && <p className="text-xs text-red-400">{startggError}</p>}
                  </div>
                </div>
              ) : (
                <div className="pt-3 space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['tag', 'name', 'country', 'team'] as const).map(f => (
                      <input key={f} type="text"
                        placeholder={f === 'tag' ? 'Tag' : f === 'name' ? 'Nome real' : f === 'country' ? 'País (US)' : 'Time'}
                        value={newProForm[f]}
                        onChange={e => setNewProForm(p => ({ ...p, [f]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && addProPlayer()}
                        className="px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-text-muted transition-colors" />
                    ))}
                  </div>
                  <input type="text"
                    placeholder="Earnings (ex: ~$500k)"
                    value={newProForm.earnings ?? ''}
                    onChange={e => setNewProForm(p => ({ ...p, earnings: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addProPlayer()}
                    className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-text-muted transition-colors" />
                  <div className="flex gap-2">
                    <button onClick={addProPlayer} disabled={!newProForm.tag.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110"
                      style={{ background: 'rgba(249,115,22,0.7)' }}>
                      <Check size={11} /> Adicionar
                    </button>
                    <button onClick={() => { setAddingPro(false); setNewProForm({ tag: '', name: '', country: '', team: '', earnings: '' }) }}
                      className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Players list */}
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {proPlayers.map(p =>
                  editingPro === p.tag ? (
                    <div key={p.tag} className="space-y-1.5 p-2 rounded-lg bg-bg-primary/50 border border-orange-500/20">
                      <div className="grid grid-cols-4 gap-1">
                        {(['tag', 'name', 'country', 'team'] as const).map(f => (
                          <input key={f} type="text"
                            placeholder={f === 'tag' ? 'Tag' : f === 'name' ? 'Nome real' : f === 'country' ? 'País' : 'Time'}
                            value={editProForm[f]}
                            onChange={e => setEditProForm(v => ({ ...v, [f]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && saveEditPro()}
                            className="px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-text-muted" />
                        ))}
                      </div>
                      <input type="text"
                        placeholder="Earnings (ex: ~$500k)"
                        value={editProForm.earnings ?? ''}
                        onChange={e => setEditProForm(v => ({ ...v, earnings: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveEditPro()}
                        className="w-full px-2 py-1 rounded bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-500/60 placeholder:text-text-muted" />
                      <div className="flex gap-2">
                        <button onClick={saveEditPro}
                          className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-white hover:brightness-110"
                          style={{ background: 'rgba(249,115,22,0.7)' }}>
                          <Check size={10} /> Salvar
                        </button>
                        <button onClick={() => setEditingPro(null)}
                          className="px-2.5 py-1 rounded text-xs text-text-muted hover:text-text-primary transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={p.tag} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bg-primary/50 text-xs hover:bg-bg-primary/70 transition-colors">
                      <span className="text-base leading-none shrink-0">{countryFlag(p.country)}</span>
                      <span className="font-bold text-text-primary truncate w-24 shrink-0">{p.tag}</span>
                      <span className="text-text-muted truncate flex-1 min-w-0">{p.name}</span>
                      <span className="font-medium shrink-0 mr-1" style={{ color: '#f97316' }}>{p.team}</span>
                      <button onClick={() => startEditPro(p)}
                        className="text-text-muted hover:text-text-primary transition-colors shrink-0">
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => removeProPlayer(p.tag)}
                        className="text-text-muted hover:text-red-400 transition-colors shrink-0">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Player Detail Modal ──────────────────────────────────────────────── */}
      {selectedPro && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSelectedPro(null)}
        >
          <div
            className="relative w-96 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-bg-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* ── Header com gradiente do time ── */}
            <div className="relative px-6 pt-6 pb-5"
              style={{ background: `linear-gradient(135deg, ${getTeamColor(selectedPro.team)}2e 0%, ${getTeamColor(selectedPro.team)}08 100%)` }}>

              <button
                onClick={() => setSelectedPro(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <X size={15} />
              </button>

              <div className="flex items-start gap-4 pr-8">
                <span className="text-5xl leading-none mt-1 shrink-0">{countryFlag(selectedPro.country)}</span>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black text-text-primary leading-none tracking-tight">{selectedPro.tag}</h2>
                  {selectedPro.name && selectedPro.name !== selectedPro.tag && (
                    <p className="text-sm text-text-muted mt-1 leading-tight">{selectedPro.name}</p>
                  )}
                  <div className="inline-flex items-center gap-1.5 mt-2.5 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `${getTeamColor(selectedPro.team)}28`, color: getTeamColor(selectedPro.team) }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getTeamColor(selectedPro.team) }} />
                    {selectedPro.team}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Stats em cards ── */}
            <div className="px-5 py-4 border-t border-bg-border space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">

                <div className="rounded-xl p-3.5" style={{ background: 'var(--color-bg-primary)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">País</p>
                  <p className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                    <span className="text-base leading-none">{countryFlag(selectedPro.country)}</span>
                    <span className="truncate">{COUNTRY_NAMES[selectedPro.country] ?? selectedPro.country}</span>
                  </p>
                </div>

                <div className="rounded-xl p-3.5" style={{ background: 'var(--color-bg-primary)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Career Earnings</p>
                  {selectedPro.earnings ? (
                    <p className="text-sm font-black" style={{ color: '#4ade80' }}>{selectedPro.earnings}</p>
                  ) : (
                    <p className="text-sm text-text-muted opacity-30">—</p>
                  )}
                </div>

                {selectedPro.name && selectedPro.name !== selectedPro.tag && (
                  <div className="col-span-2 rounded-xl p-3.5" style={{ background: 'var(--color-bg-primary)' }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1.5">Nome Real</p>
                    <p className="text-sm font-semibold text-text-primary">{selectedPro.name}</p>
                  </div>
                )}
              </div>

              {/* Títulos */}
              {selectedPro.titles && selectedPro.titles.length > 0 && (
                <div className="rounded-xl p-3.5" style={{ background: 'var(--color-bg-primary)' }}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Trophy size={11} style={{ color: '#f59e0b' }} />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Títulos</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {selectedPro.titles.map((t, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#f59e0b' }} />
                        <span className="text-xs font-semibold text-text-primary">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 pb-4 flex gap-2">
              <button
                onClick={() => window.api?.rocketLeague?.openUrl(
                  `https://liquipedia.net/rocketleague/${selectedPro.tag.replace(/\s+/g, '_')}`
                )}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors"
                style={{ borderColor: 'var(--color-bg-border)', color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${getTeamColor(selectedPro!.team)}80`
                  e.currentTarget.style.color = 'var(--color-text-primary)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-bg-border)'
                  e.currentTarget.style.color = 'var(--color-text-secondary)'
                }}
              >
                <ExternalLink size={11} /> Liquipedia
              </button>
            </div>
          </div>
        </div>
      )}
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

// ── Session heatmap ───────────────────────────────────────────────────────────

function SessionHeatmap({ sessions }: { sessions: RLSession[] }): React.JSX.Element | null {
  if (!sessions.length) return null

  // Build date → gain map
  const dayMap = new Map<string, number>()
  for (const s of sessions) {
    dayMap.set(s.date, (dayMap.get(s.date) ?? 0) + s.mmr_gain)
  }

  // Build 52-week grid starting from last Sunday
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const startDay = new Date(today)
  startDay.setDate(today.getDate() - today.getDay() - 51 * 7) // 52 weeks back, start on Sunday

  const weeks: { date: string; gain: number | null }[][] = []
  let cur = new Date(startDay)
  for (let w = 0; w < 52; w++) {
    const week: { date: string; gain: number | null }[] = []
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0, 10)
      const future = cur > today
      week.push({ date: key, gain: future ? null : (dayMap.has(key) ? dayMap.get(key)! : 0) })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  // Month labels
  const monthLabels: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const m = new Date(week[0].date + 'T12:00:00').getMonth()
    if (m !== lastMonth) { monthLabels.push({ label: new Date(week[0].date + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }), col: wi }); lastMonth = m }
  })

  function cellColor(gain: number | null): string {
    if (gain === null) return 'rgba(255,255,255,0.03)'
    if (gain === 0)    return 'rgba(255,255,255,0.05)'
    if (gain > 0)      return gain >= 30 ? '#ea580c' : gain >= 15 ? '#f97316' : '#fb923c80'
    return gain <= -30 ? '#dc2626' : gain <= -15 ? '#ef4444' : '#f8717180'
  }

  const totalSessions = sessions.length
  const daysWithSessions = dayMap.size
  const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Target size={14} className="text-orange-400" />
        <span className="text-sm font-semibold text-text-primary">Consistência</span>
        <span className="text-xs text-text-muted ml-auto">{daysWithSessions} dias jogados · {totalSessions} sessões</span>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 680 }}>
          {/* Month labels */}
          <div className="flex mb-1" style={{ paddingLeft: 20 }}>
            {weeks.map((_, wi) => {
              const ml = monthLabels.find(m => m.col === wi)
              return <div key={wi} style={{ width: 13, flexShrink: 0 }} className="text-[9px] text-text-muted">{ml?.label ?? ''}</div>
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-0">
            {/* Day-of-week labels */}
            <div className="flex flex-col mr-1" style={{ gap: 2 }}>
              {DAY_LABELS.map((l, i) => (
                <div key={i} style={{ width: 12, height: 11, fontSize: 8 }}
                  className="text-text-muted flex items-center justify-center opacity-40">{i % 2 === 1 ? l : ''}</div>
              ))}
            </div>
            {/* Weeks */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col" style={{ gap: 2, marginRight: 2 }}>
                {week.map((day, di) => (
                  <div key={di} title={`${day.date}${day.gain !== null && day.gain !== 0 ? ` · ${day.gain > 0 ? '+' : ''}${day.gain} MMR` : ''}`}
                    style={{
                      width: 11, height: 11,
                      borderRadius: 2,
                      background: cellColor(day.gain),
                      flexShrink: 0,
                    }} />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-[10px] text-text-muted">Menos</span>
            {[null, 0, 1, 15, 30].map((v, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: cellColor(v), flexShrink: 0 }} />
            ))}
            <span className="text-[10px] text-text-muted">Mais ganho</span>
            <div style={{ width: 1, height: 12, background: 'var(--color-bg-border)', margin: '0 4px' }} />
            {[-1, -15, -30].map((v, i) => (
              <div key={i} style={{ width: 11, height: 11, borderRadius: 2, background: cellColor(v), flexShrink: 0 }} />
            ))}
            <span className="text-[10px] text-text-muted">Perda</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Day-of-week chart ─────────────────────────────────────────────────────────

function DayOfWeekChart({ sessions }: { sessions: RLSession[] }): React.JSX.Element | null {
  if (sessions.length < 3) return null

  const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  // Group by weekday
  const groups: { sum: number; count: number }[] = Array.from({ length: 7 }, () => ({ sum: 0, count: 0 }))
  for (const s of sessions) {
    const d = new Date(s.date + 'T12:00:00').getDay()
    groups[d].sum += s.mmr_gain
    groups[d].count++
  }

  const avgs = groups.map(g => (g.count > 0 ? g.sum / g.count : null))
  const defined = avgs.filter(v => v !== null) as number[]
  if (!defined.length) return null

  const maxAbs = Math.max(...defined.map(Math.abs), 1)
  const bestIdx = avgs.reduce<number | null>((best, v, i) => {
    if (v === null) return best
    if (best === null || v > (avgs[best] ?? -Infinity)) return i
    return best
  }, null)

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={14} className="text-orange-400" />
        <span className="text-sm font-semibold text-text-primary">MMR médio por dia da semana</span>
        {bestIdx !== null && avgs[bestIdx] !== null && (
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
            Melhor: {DAY_LABELS[bestIdx]} ({avgs[bestIdx]! > 0 ? '+' : ''}{avgs[bestIdx]!.toFixed(0)})
          </span>
        )}
      </div>
      <div className="space-y-2">
        {DAY_LABELS.map((label, i) => {
          const avg  = avgs[i]
          const cnt  = groups[i].count
          const pct  = avg !== null ? (Math.abs(avg) / maxAbs) * 100 : 0
          const pos  = avg !== null && avg >= 0
          const col  = avg === null ? '#4b5563' : pos ? '#4ade80' : '#f87171'
          const isBest = i === bestIdx && avg !== null
          return (
            <div key={label} className="flex items-center gap-3">
              <span className={`text-xs w-7 shrink-0 font-medium ${isBest ? 'text-green-400' : 'text-text-muted'}`}>{label}</span>
              <div className="flex-1 flex items-center gap-1.5 h-5">
                {avg === null ? (
                  <span className="text-[10px] text-text-muted opacity-40">sem dados</span>
                ) : (
                  <>
                    <div className="flex-1 relative h-4 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                      <div className="absolute inset-y-0 rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: isBest
                            ? `linear-gradient(90deg, ${col}, #86efac)`
                            : col,
                          opacity: 0.85,
                        }} />
                    </div>
                    <span className={`text-xs font-bold w-12 text-right shrink-0 ${pos ? 'text-green-400' : 'text-red-400'}`}>
                      {avg > 0 ? '+' : ''}{avg.toFixed(0)}
                    </span>
                    <span className="text-[10px] text-text-muted w-8 shrink-0">({cnt})</span>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-text-muted mt-3 opacity-50">MMR médio por sessão · número entre parênteses = sessões registradas</p>
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
    start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '', preset_id: '', tags: '',
  })
  const [saving, setSaving]             = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)

  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editSessionForm, setEditSessionForm]   = useState({
    date: '', start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '', preset_id: '', tags: '',
  })

  const [rankHovered, setRankHovered]   = useState(false)
  const [activeTab, setActiveTab]       = useState<'overview' | 'garage' | 'esports'>('overview')
  const [garagePresets, setGaragePresets] = useState<RLCarPreset[]>([])

  const [mmrGoal, setMmrGoal]           = useState<number | null>(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalInput, setGoalInput]       = useState('')

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
    async function init() {
      if (window.api?.settings) {
        try {
          const [savedProfile, savedGoal] = await Promise.all([
            window.api.settings.get('rl_linked_profile'),
            window.api.settings.get('rl_mmr_goal'),
          ])
          if (savedProfile) {
            const p = savedProfile as RLLinkedProfile
            setLinkedProfile(p)
            fetchProfile(p.platform, p.username)
          }
          if (typeof savedGoal === 'number') setMmrGoal(savedGoal)
        } catch { /* ignore */ }
      }
      loadSessions()
      loadGaragePresets()
    }
    init()
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
        window.api?.settings?.set('rl_linked_profile', p)
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
    window.api?.settings?.set('rl_linked_profile', null)
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
      tags: form.tags || undefined,
    })
    setSaving(false)
    setForm(f => ({ ...f, start_mmr: '', end_mmr: '', matches: '', wins: '', notes: '', preset_id: '', tags: '' }))
    setShowSessionForm(false)
    loadSessions()
  }

  async function handleDeleteSession(id: number) {
    if (!hasApi) return
    await window.api!.rocketLeague!.deleteSession(id)
    loadSessions()
  }

  function startEditSession(s: RLSession) {
    setEditingSessionId(s.id)
    setEditSessionForm({
      date: s.date,
      start_mmr: String(s.start_mmr),
      end_mmr: String(s.end_mmr),
      matches: String(s.matches),
      wins: String(s.wins),
      notes: s.notes ?? '',
      preset_id: s.preset_id != null ? String(s.preset_id) : '',
      tags: s.tags ?? '',
    })
  }

  async function handleSaveEditSession(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSessionId || !editSessionForm.start_mmr || !editSessionForm.end_mmr || !hasApi) return
    await window.api!.rocketLeague!.updateSession(editingSessionId, {
      date: editSessionForm.date,
      start_mmr: parseInt(editSessionForm.start_mmr),
      end_mmr: parseInt(editSessionForm.end_mmr),
      matches: parseInt(editSessionForm.matches) || 0,
      wins: parseInt(editSessionForm.wins) || 0,
      notes: editSessionForm.notes,
      preset_id: editSessionForm.preset_id ? parseInt(editSessionForm.preset_id) : null,
      tags: editSessionForm.tags || undefined,
    })
    setEditingSessionId(null)
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

  function saveGoal() {
    const val = parseInt(goalInput)
    if (!val || val < 100) return
    setMmrGoal(val)
    window.api?.settings?.set('rl_mmr_goal', val)
    setShowGoalForm(false)
    setGoalInput('')
  }

  function removeGoal() {
    setMmrGoal(null)
    window.api?.settings?.set('rl_mmr_goal', null)
    setShowGoalForm(false)
  }

  function toggleTag(tagId: string, current: string, setter: (v: string) => void) {
    const tags = current ? current.split(',') : []
    const next = tags.includes(tagId) ? tags.filter(t => t !== tagId) : [...tags, tagId]
    setter(next.join(','))
  }

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

              {/* ── Meta de MMR ────────────────────────────────────────────── */}
              {(() => {
                const currentMMR = sessions[0]?.end_mmr ?? null
                const pct = (mmrGoal && currentMMR)
                  ? Math.min(100, Math.max(0, Math.round((currentMMR / mmrGoal) * 100)))
                  : 0
                const remaining = mmrGoal && currentMMR ? mmrGoal - currentMMR : null
                const done = remaining !== null && remaining <= 0

                return (
                  <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-bg-border">
                      <div className="flex items-center gap-2">
                        <Trophy size={14} className="text-yellow-400" />
                        <span className="text-sm font-semibold text-text-primary">Meta de MMR</span>
                        {done && <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>✓ Atingida!</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        {mmrGoal && (
                          <button onClick={removeGoal} className="text-xs text-text-muted hover:text-red-400 transition-colors">Remover</button>
                        )}
                        <button onClick={() => { setShowGoalForm(v => !v); setGoalInput(mmrGoal ? String(mmrGoal) : '') }}
                          className="text-xs text-text-muted hover:text-orange-400 transition-colors">
                          {mmrGoal ? 'Editar' : 'Definir meta'}
                        </button>
                      </div>
                    </div>

                    {showGoalForm && (
                      <div className="px-4 py-3 border-b border-bg-border flex items-center gap-2">
                        <input type="number" value={goalInput} min={100} max={9999}
                          onChange={e => setGoalInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveGoal()}
                          placeholder="Ex: 1500"
                          className="flex-1 px-3 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors" />
                        <button onClick={saveGoal} disabled={!goalInput || parseInt(goalInput) < 100}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40 hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                          <Check size={12} /> Salvar
                        </button>
                        <button onClick={() => setShowGoalForm(false)}
                          className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors">
                          Cancelar
                        </button>
                      </div>
                    )}

                    <div className="px-4 py-4">
                      {!mmrGoal ? (
                        <p className="text-xs text-text-muted text-center py-1">
                          Defina uma meta de MMR para acompanhar seu progresso rumo ao próximo rank.
                        </p>
                      ) : currentMMR === null ? (
                        <p className="text-xs text-text-muted text-center py-1">
                          Registre uma sessão para ver o progresso em relação à meta.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">MMR atual</p>
                              <p className="text-xl font-black text-text-primary">{currentMMR}</p>
                            </div>
                            <div className="text-center px-3">
                              {remaining !== null && !done && (
                                <p className="text-xs text-text-muted">faltam <span className="font-bold text-orange-400">{remaining}</span> MMR</p>
                              )}
                              {done && <p className="text-xs font-bold text-green-400">Meta superada! 🎉</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-0.5">Meta</p>
                              <p className="text-xl font-black" style={{ color: '#f59e0b' }}>{mmrGoal}</p>
                            </div>
                          </div>
                          <div className="relative w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-primary)' }}>
                            <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                              style={{
                                width: `${pct}%`,
                                background: done
                                  ? 'linear-gradient(90deg, #4ade80, #86efac)'
                                  : 'linear-gradient(90deg, #f97316, #f59e0b)',
                              }} />
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] text-text-muted">0</span>
                            <span className="text-[10px] font-bold" style={{ color: done ? '#4ade80' : '#f97316' }}>{pct}%</span>
                            <span className="text-[10px] text-text-muted">{mmrGoal}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

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

              {/* Session heatmap */}
              <SessionHeatmap sessions={sessions} />

              {/* Day-of-week analysis */}
              <DayOfWeekChart sessions={sessions} />
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

                {/* Tag picker */}
                <div>
                  <label className="text-xs text-text-muted block mb-1.5">Tags (opcional)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {RL_TAGS.map(tag => {
                      const active = form.tags.split(',').includes(tag.id)
                      return (
                        <button key={tag.id} type="button"
                          onClick={() => toggleTag(tag.id, form.tags, v => setForm(f => ({ ...f, tags: v })))}
                          className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                          style={active
                            ? { background: `${tag.color}28`, color: tag.color, border: `1px solid ${tag.color}80` }
                            : { background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-bg-border)' }}>
                          {tag.label}
                        </button>
                      )
                    })}
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
                  editingSessionId === session.id ? (
                    <form key={session.id} onSubmit={handleSaveEditSession}
                      className="px-4 py-3 space-y-2 bg-bg-primary/40">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">Data</label>
                          <input type="date" value={editSessionForm.date}
                            onChange={e => setEditSessionForm(f => ({ ...f, date: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">MMR inicial</label>
                          <input type="number" value={editSessionForm.start_mmr} required
                            onChange={e => setEditSessionForm(f => ({ ...f, start_mmr: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">MMR final</label>
                          <input type="number" value={editSessionForm.end_mmr} required
                            onChange={e => setEditSessionForm(f => ({ ...f, end_mmr: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">Partidas</label>
                          <input type="number" value={editSessionForm.matches}
                            onChange={e => setEditSessionForm(f => ({ ...f, matches: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">Vitórias</label>
                          <input type="number" value={editSessionForm.wins}
                            onChange={e => setEditSessionForm(f => ({ ...f, wins: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors" />
                        </div>
                        <div>
                          <label className="text-[10px] text-text-muted block mb-0.5">Notas</label>
                          <input type="text" value={editSessionForm.notes}
                            onChange={e => setEditSessionForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 placeholder:text-text-muted transition-colors" />
                        </div>
                      </div>
                      {garagePresets.length > 0 && (
                        <select value={editSessionForm.preset_id}
                          onChange={e => setEditSessionForm(f => ({ ...f, preset_id: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-xs focus:outline-none focus:border-orange-400 transition-colors">
                          <option value="">Nenhum preset</option>
                          {garagePresets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {RL_TAGS.map(tag => {
                          const active = editSessionForm.tags.split(',').includes(tag.id)
                          return (
                            <button key={tag.id} type="button"
                              onClick={() => toggleTag(tag.id, editSessionForm.tags, v => setEditSessionForm(f => ({ ...f, tags: v })))}
                              className="px-2 py-0.5 rounded-full text-[11px] font-semibold transition-all"
                              style={active
                                ? { background: `${tag.color}28`, color: tag.color, border: `1px solid ${tag.color}80` }
                                : { background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-bg-border)' }}>
                              {tag.label}
                            </button>
                          )
                        })}
                      </div>
                      <div className="flex gap-2">
                        <button type="submit"
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                          <Check size={11} /> Salvar
                        </button>
                        <button type="button" onClick={() => setEditingSessionId(null)}
                          className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-text-primary transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
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
                        {session.tags && session.tags.split(',').filter(Boolean).map(tagId => {
                          const tag = RL_TAGS.find(t => t.id === tagId)
                          if (!tag) return null
                          return (
                            <span key={tagId} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: `${tag.color}20`, color: tag.color }}>
                              {tag.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() => startEditSession(session)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-orange-400 hover:bg-orange-400/10 transition-colors shrink-0"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  )
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
