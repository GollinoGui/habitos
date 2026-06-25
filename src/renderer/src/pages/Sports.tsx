import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, CircleDot, ChevronRight, Medal, TrendingUp, TrendingDown, CheckCircle, Sun, Trophy, Settings2, X, Swords, Crosshair } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface RLLinkedProfile { platform: string; username: string }
interface RLSession { mmr_gain: number; date: string; end_mmr: number }

const PLATFORM_LABELS: Record<string, string> = {
  epic: 'Epic Games', steam: 'Steam', psn: 'PlayStation', xbl: 'Xbox', switch: 'Switch',
}

// ── Extra stats components ────────────────────────────────────────────────────

function RLCardStats(): React.JSX.Element {
  const [sessions, setSessions] = useState<RLSession[]>([])
  const linked = (() => {
    try { return JSON.parse(localStorage.getItem('habitos_rl_profile') || 'null') as RLLinkedProfile | null }
    catch { return null }
  })()

  useEffect(() => {
    if (!linked || !(window as { api?: { rocketLeague?: unknown } }).api?.rocketLeague) return
    window.api!.rocketLeague!.listSessions(5).then((data) => setSessions((data as RLSession[]) ?? []))
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayGain = sessions.filter(s => s.date === today).reduce((a, s) => a + s.mmr_gain, 0)
  const peak = sessions.length > 0 ? Math.max(...sessions.map(s => s.end_mmr)) : null

  if (!linked) return <p className="text-xs mt-2" style={{ color: '#f97316' }}>Vincular perfil →</p>

  return (
    <div className="mt-2 flex items-center gap-3 flex-wrap">
      <span className="text-xs text-text-muted">
        {linked.username} · {PLATFORM_LABELS[linked.platform] ?? linked.platform}
      </span>
      {sessions.length > 0 && (
        <>
          <span className={`text-xs flex items-center gap-0.5 ${todayGain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {todayGain >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {todayGain >= 0 ? '+' : ''}{todayGain} hoje
          </span>
          {peak && <span className="text-xs text-yellow-400">Peak {peak}</span>}
        </>
      )}
    </div>
  )
}

// ── Sport/Game configs ────────────────────────────────────────────────────────

interface CardConfig {
  key: string
  route: string
  label: string
  description: string
  Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>
  color: string
  available: boolean
  ExtraStats: React.ComponentType | null
}

const ALL_SPORTS: CardConfig[] = [
  {
    key: 'volleyball',
    route: '/sports/volleyball',
    label: 'Vôlei',
    description: 'Treinos, jogos e evolução técnica',
    Icon: CircleDot,
    color: '#10b981',
    available: true,
    ExtraStats: null,
  },
  {
    key: 'beach-tennis',
    route: '/sports/beach-tennis',
    label: 'Beach Tennis',
    description: 'Partidas, treinos e torneios na areia',
    Icon: Sun,
    color: '#f59e0b',
    available: true,
    ExtraStats: null,
  },
  {
    key: 'basketball',
    route: '/sports/basketball',
    label: 'Basquete',
    description: 'Jogos, treinos e estatísticas por partida',
    Icon: Trophy,
    color: '#ef4444',
    available: true,
    ExtraStats: null,
  },
]

const GAMES_CONFIG: CardConfig[] = [
  {
    key: 'rocket-league',
    route: '/sports/rocket-league',
    label: 'Rocket League',
    description: 'MMR, rank, sessões diárias e histórico',
    Icon: Gamepad2,
    color: '#f97316',
    available: true,
    ExtraStats: RLCardStats,
  },
  {
    key: 'cs2',
    route: '',
    label: 'CS2',
    description: 'Rating, partidas e estatísticas por round',
    Icon: Crosshair,
    color: '#facc15',
    available: false,
    ExtraStats: null,
  },
  {
    key: 'valorant',
    route: '',
    label: 'Valorant',
    description: 'Rank, agentes e desempenho por partida',
    Icon: Swords,
    color: '#f43f5e',
    available: false,
    ExtraStats: null,
  },
]

const STORAGE_KEY = 'habitos_sports_active'
const SETUP_KEY = 'habitos_sports_setup_done'

function loadActiveSports(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch { /* noop */ }
  return []
}

function saveActiveSports(keys: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  localStorage.setItem(SETUP_KEY, '1')
}

// ── Sport card ─────────────────────────────────────────────────────────────────

function SportCard({ route, label, description, Icon, color, available, ExtraStats }: Omit<CardConfig, 'key'>) {
  if (!available) {
    return (
      <div className="bg-bg-secondary border border-bg-border border-dashed rounded-xl p-5 opacity-50 cursor-not-allowed">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
            <Icon size={24} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-text-primary">{label}</h3>
              <span className="text-xs px-1.5 py-0.5 rounded bg-bg-border text-text-muted">em breve</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      to={route}
      className="group bg-bg-secondary border border-bg-border rounded-xl p-5 hover:border-opacity-80 transition-all hover:shadow-lg hover:shadow-black/10 block"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105" style={{ backgroundColor: `${color}20` }}>
          <Icon size={24} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-text-primary">{label}</h3>
          <p className="text-xs text-text-muted mt-0.5">{description}</p>
          {ExtraStats && <ExtraStats />}
        </div>
        <ChevronRight size={16} className="text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0" />
      </div>
    </Link>
  )
}

// ── Setup modal ───────────────────────────────────────────────────────────────

function SetupModal({ onDone }: { onDone: (keys: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(ALL_SPORTS.map(s => s.key))

  function toggle(key: string) {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  function handleConfirm() {
    if (selected.length === 0) {
      onDone(ALL_SPORTS.map(s => s.key))
      return
    }
    onDone(selected)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-bg-primary border border-bg-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-accent-purple/10 mb-4">
            <Medal size={24} className="text-accent-purple" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-1">Quais esportes você pratica?</h2>
          <p className="text-sm text-text-muted mb-5">
            Selecione os que quer acompanhar. Você pode mudar isso depois nas configurações desta seção.
          </p>

          <div className="space-y-2">
            {ALL_SPORTS.map(sport => {
              const isSelected = selected.includes(sport.key)
              return (
                <button
                  key={sport.key}
                  onClick={() => toggle(sport.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-opacity-60'
                      : 'border-bg-border bg-bg-secondary opacity-50'
                  }`}
                  style={isSelected ? { borderColor: sport.color, backgroundColor: `${sport.color}10` } : {}}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${sport.color}20` }}>
                    <sport.Icon size={18} style={{ color: sport.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary text-sm">{sport.label}</p>
                    <p className="text-xs text-text-muted truncate">{sport.description}</p>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    isSelected ? 'border-transparent' : 'border-bg-border'
                  }`} style={isSelected ? { backgroundColor: sport.color } : {}}>
                    {isSelected && <CheckCircle size={12} className="text-white" />}
                  </div>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleConfirm}
            className="w-full mt-5 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95 bg-accent-purple"
          >
            Confirmar seleção
          </button>
          <p className="text-center text-xs text-text-muted mt-2">
            {selected.length === 0 ? 'Todos serão exibidos' : `${selected.length} esporte${selected.length > 1 ? 's' : ''} selecionado${selected.length > 1 ? 's' : ''}`}
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Sports(): React.JSX.Element {
  const setupDone = localStorage.getItem(SETUP_KEY) === '1'
  const [showSetup, setShowSetup] = useState(!setupDone)
  const [activeSports, setActiveSports] = useState<string[]>(loadActiveSports)

  function handleSetupDone(keys: string[]) {
    saveActiveSports(keys)
    setActiveSports(keys)
    setShowSetup(false)
  }

  const visibleSports = activeSports.length > 0
    ? ALL_SPORTS.filter(s => activeSports.includes(s.key))
    : ALL_SPORTS

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-purple/10">
          <Medal size={22} className="text-accent-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Esportes & Jogos</h1>
          <p className="text-xs text-text-muted">Acompanhe seu desempenho em cada modalidade</p>
        </div>
        <button
          onClick={() => setShowSetup(true)}
          className="ml-auto p-2 rounded-lg text-text-muted hover:bg-bg-secondary hover:text-text-primary transition-colors"
          title="Configurar esportes"
        >
          <Settings2 size={18} />
        </button>
      </div>

      {/* Esportes */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Esportes</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {visibleSports.map(cfg => <SportCard key={cfg.key} {...cfg} />)}
        </div>
      </section>

      {/* Jogos Steam */}
      <section>
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">Jogos Steam / PC</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {GAMES_CONFIG.map(cfg => <SportCard key={cfg.key} {...cfg} />)}
        </div>
      </section>

      {showSetup && <SetupModal onDone={handleSetupDone} />}
    </div>
  )
}
