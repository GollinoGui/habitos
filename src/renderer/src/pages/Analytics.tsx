import React, { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts'
import { BarChart2, Moon, Dumbbell, CheckSquare } from 'lucide-react'

interface Habit { id: number; name: string; icon: string; color: string; is_active: number }
interface SleepLog { date: string; bedtime: string; wake_time: string; quality: number }
interface ExerciseEntry { date: string; name: string; sets: number; reps: number; weight_kg: number }

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function sleepMinutes(bedtime: string, wake_time: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake_time.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 1440
  return mins
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-secondary border border-bg-border rounded-lg p-2 text-xs shadow-lg">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

// ── Tab Hábitos ───────────────────────────────────────────────────────────────
function HabitsAnalytics() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [monthlyData, setMonthlyData] = useState<{ month: string; pct: number; total: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const h = await window.api.habits.list() as Habit[]
    setHabits(h.filter(x => x.is_active))
    const active = h.filter(x => x.is_active)

    const now = new Date()
    const months: { month: string; pct: number; total: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i)
      const start = format(startOfMonth(d), 'yyyy-MM-dd')
      const end = format(endOfMonth(d), 'yyyy-MM-dd')
      const comps = await window.api.habits.completionsRange(start, end) as any[]
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
      const possible = active.length * daysInMonth
      const pct = possible > 0 ? Math.round((comps.length / possible) * 100) : 0
      months.push({
        month: MONTH_LABELS[d.getMonth()],
        pct,
        total: comps.length
      })
    }

    setMonthlyData(months)
    setLoading(false)
  }

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  const best = monthlyData.reduce((b, m) => m.pct > b.pct ? m : b, monthlyData[0] || { month: '-', pct: 0, total: 0 })
  const avg = monthlyData.length ? Math.round(monthlyData.reduce((s, m) => s + m.pct, 0) / monthlyData.length) : 0

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-purple">{habits.length}</p>
          <p className="text-xs text-text-muted">Hábitos ativos</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-green">{avg}%</p>
          <p className="text-xs text-text-muted">Média últimos 12 meses</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-gold">{best.month}</p>
          <p className="text-xs text-text-muted">Melhor mês ({best.pct}%)</p>
        </div>
      </div>

      <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Taxa de conclusão por mês</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} formatter={(v: number) => [`${v}%`, 'Conclusão']} />
            <Bar dataKey="pct" name="Conclusão" fill="#7c3aed" radius={[4, 4, 0, 0]}
              label={{ position: 'top', fontSize: 10, fill: '#94a3b8', formatter: (v: number) => v > 0 ? `${v}%` : '' }} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Tab Sono ──────────────────────────────────────────────────────────────────
function SleepAnalytics() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.sleep.recent(60).then(l => {
      setLogs((l as SleepLog[]).slice().reverse())
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" /></div>
  if (logs.length === 0) return <p className="text-text-muted text-sm">Nenhum registro de sono encontrado.</p>

  const chartData = logs.map(l => ({
    date: format(new Date(l.date + 'T12:00:00'), 'dd/MM'),
    Duração: Math.round(sleepMinutes(l.bedtime, l.wake_time) / 6) / 10,
    Qualidade: l.quality
  }))

  const avgDur = logs.reduce((s, l) => s + sleepMinutes(l.bedtime, l.wake_time), 0) / logs.length
  const avgQual = logs.reduce((s, l) => s + l.quality, 0) / logs.length
  const goodNights = logs.filter(l => l.quality >= 4).length

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-blue">{Math.floor(avgDur / 60)}h{Math.round(avgDur % 60)}m</p>
          <p className="text-xs text-text-muted">Duração média</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-gold">{avgQual.toFixed(1)}</p>
          <p className="text-xs text-text-muted">Qualidade média (1-5)</p>
        </div>
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent-green">{goodNights}</p>
          <p className="text-xs text-text-muted">Noites com qualidade ≥4</p>
        </div>
      </div>

      <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Duração (h) e qualidade — últimos {logs.length} registros</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.floor(chartData.length / 8)} />
            <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 12]} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line yAxisId="left" type="monotone" dataKey="Duração" stroke="#06b6d4" strokeWidth={2} dot={false} name="Duração (h)" />
            <Line yAxisId="right" type="monotone" dataKey="Qualidade" stroke="#f59e0b" strokeWidth={2} dot={false} name="Qualidade" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1.5 text-xs text-text-muted"><span className="w-3 h-0.5 bg-accent-blue inline-block" /> Duração (h)</span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted"><span className="w-3 h-0.5 bg-accent-gold inline-block" /> Qualidade</span>
        </div>
      </div>
    </div>
  )
}

// ── Tab Academia ──────────────────────────────────────────────────────────────
function GymAnalytics() {
  const [exerciseNames, setExerciseNames] = useState<string[]>([])
  const [selected, setSelected] = useState<string>('')
  const [history, setHistory] = useState<ExerciseEntry[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    window.api.gymPrograms.exerciseNames().then(names => {
      setExerciseNames(names as string[])
    })
  }, [])

  useEffect(() => {
    if (!selected) { setHistory([]); return }
    setLoading(true)
    window.api.gymPrograms.exerciseHistory(selected).then(h => {
      setHistory(h as ExerciseEntry[])
      setLoading(false)
    })
  }, [selected])

  const filtered = exerciseNames.filter(n => n.toLowerCase().includes(search.toLowerCase()))

  const chartData = history.map(e => ({
    date: format(new Date(e.date + 'T12:00:00'), 'dd/MM'),
    Peso: e.weight_kg || 0,
    Volume: (e.sets || 0) * (e.reps || 0) * (e.weight_kg || 0)
  }))

  const maxWeight = history.length ? Math.max(...history.map(e => e.weight_kg || 0)) : 0
  const lastEntry = history[history.length - 1]

  return (
    <div className="space-y-5">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar exercício..."
            className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-purple placeholder:text-text-muted"
          />
          {search && filtered.length > 0 && !selected && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-bg-secondary border border-bg-border rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
              {filtered.slice(0, 10).map(name => (
                <button
                  key={name}
                  onClick={() => { setSelected(name); setSearch(name) }}
                  className="w-full text-left px-3 py-2 text-sm text-text-primary hover:bg-bg-border transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
        {selected && (
          <button
            onClick={() => { setSelected(''); setSearch(''); setHistory([]) }}
            className="px-3 py-2 text-xs border border-bg-border rounded-lg text-text-secondary hover:bg-bg-border"
          >
            Limpar
          </button>
        )}
      </div>

      {exerciseNames.length === 0 && (
        <p className="text-text-muted text-sm">Nenhum exercício registrado ainda.</p>
      )}

      {selected && !loading && history.length === 0 && (
        <p className="text-text-muted text-sm">Nenhum registro para "{selected}".</p>
      )}

      {loading && <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>}

      {selected && history.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent-purple">{history.length}</p>
              <p className="text-xs text-text-muted">Registros</p>
            </div>
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent-green">{maxWeight}kg</p>
              <p className="text-xs text-text-muted">Máximo histórico</p>
            </div>
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-accent-gold">{lastEntry?.weight_kg || 0}kg</p>
              <p className="text-xs text-text-muted">Último registro</p>
            </div>
          </div>

          <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Progressão de peso — {selected}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(chartData.length / 8) - 1)} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="Peso" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} name="Peso (kg)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Histórico de registros</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {[...history].reverse().map((e, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-text-muted text-xs w-14 shrink-0">{format(new Date(e.date + 'T12:00:00'), 'dd/MM/yy')}</span>
                  {e.sets && <span className="text-text-secondary">{e.sets}×{e.reps}</span>}
                  {e.weight_kg ? <span className="font-bold text-accent-purple">{e.weight_kg}kg</span> : null}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
type Tab = 'habits' | 'sleep' | 'gym'

export default function Analytics(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('habits')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'habits', label: 'Hábitos', icon: <CheckSquare size={14} />, color: '#7c3aed' },
    { id: 'sleep',  label: 'Sono',    icon: <Moon size={14} />,        color: '#06b6d4' },
    { id: 'gym',    label: 'Academia',icon: <Dumbbell size={14} />,    color: '#ef4444' }
  ]

  return (
    <div className="space-y-5 animate-fadeIn max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary animate-slide-down">Analytics</h1>
        <p className="text-text-secondary text-sm">Tendências e evolução ao longo do tempo</p>
      </div>

      <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'text-white' : 'text-text-secondary hover:text-text-primary'
            }`}
            style={tab === t.id ? { backgroundColor: t.color } : {}}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'habits' && <HabitsAnalytics />}
      {tab === 'sleep'  && <SleepAnalytics />}
      {tab === 'gym'    && <GymAnalytics />}
    </div>
  )
}
