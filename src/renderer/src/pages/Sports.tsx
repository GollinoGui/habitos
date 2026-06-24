import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Gamepad2, CircleDot, ChevronRight, Medal, Plus, TrendingUp, TrendingDown } from 'lucide-react'

interface RLLinkedProfile { platform: string; username: string }
interface RLSession { mmr_gain: number; date: string; end_mmr: number }

const PLATFORM_LABELS: Record<string, string> = {
  epic: 'Epic Games', steam: 'Steam', psn: 'PlayStation', xbl: 'Xbox', switch: 'Switch',
}

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

  if (!linked) {
    return <p className="text-xs mt-2" style={{ color: '#f97316' }}>Vincular perfil →</p>
  }

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

const SPORTS_CONFIG = [
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
    key: 'volleyball',
    route: '/sports/volleyball',
    label: 'Vôlei',
    description: 'Treinos, jogos e evolução técnica',
    Icon: CircleDot,
    color: '#10b981',
    available: false,
    ExtraStats: null,
  },
]

export default function Sports(): React.JSX.Element {
  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent-purple/10">
          <Medal size={22} className="text-accent-purple" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Esportes & Jogos</h1>
          <p className="text-xs text-text-muted">Acompanhe seu desempenho em cada modalidade</p>
        </div>
      </div>

      {/* Sport cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {SPORTS_CONFIG.map(({ key, route, label, description, Icon, color, available, ExtraStats }) => (
          available ? (
            <Link
              key={key}
              to={route}
              className="group bg-bg-secondary border border-bg-border rounded-xl p-5 hover:border-opacity-80 transition-all hover:shadow-lg hover:shadow-black/10 block"
              style={{ '--hover-color': color } as React.CSSProperties}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${color}20` }}
                >
                  <Icon size={24} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text-primary">{label}</h3>
                  <p className="text-xs text-text-muted mt-0.5">{description}</p>
                  {ExtraStats && <ExtraStats />}
                </div>
                <ChevronRight
                  size={16}
                  className="text-text-muted group-hover:text-text-primary group-hover:translate-x-0.5 transition-all mt-1 shrink-0"
                />
              </div>
            </Link>
          ) : (
            <div
              key={key}
              className="bg-bg-secondary border border-bg-border border-dashed rounded-xl p-5 opacity-50 cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
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
        ))}

        {/* Placeholder "add more" */}
        <div className="border border-dashed border-bg-border rounded-xl p-5 flex items-center gap-3 opacity-40">
          <div className="w-12 h-12 rounded-xl bg-bg-border flex items-center justify-center shrink-0">
            <Plus size={20} className="text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-text-muted text-sm">Mais em breve</p>
            <p className="text-xs text-text-muted">Steam, outros esportes...</p>
          </div>
        </div>
      </div>
    </div>
  )
}
