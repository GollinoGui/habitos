import React, { useEffect, useRef, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Moon, Save, Star, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import SectionHelpButton, { HelpTips } from '../components/Help/SectionHelpButton'

interface SleepLog {
  id: number; date: string; bedtime: string; wake_time: string; quality: number; notes: string; cycles?: number | null
}

function calcMinsFromTimes(bedtime: string, wake_time: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake_time.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 24 * 60
  return mins
}

function calcDuration(bedtime: string, wake_time: string): string {
  const mins = calcMinsFromTimes(bedtime, wake_time)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? `${m}m` : ''}`
}

function calcCycles(bedtime: string, wake_time: string): number {
  const mins = calcMinsFromTimes(bedtime, wake_time)
  if (mins < 45) return 0
  return Math.round(Math.min(mins / 90, 7) * 10) / 10
}

function qualityColor(q: number): string {
  if (q >= 4) return 'text-accent-green'
  if (q >= 3) return 'text-accent-gold'
  return 'text-accent-red'
}

export default function Sleep(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [date, setDate] = useState(today)
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState(3)
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)
  const [recent, setRecent] = useState<SleepLog[]>([])
  const [existingId, setExistingId] = useState<number | null>(null)
  const [highlightedDate, setHighlightedDate] = useState<string | null>(null)
  const [qualityVersion, setQualityVersion] = useState(0)
  const [showSaveFloat, setShowSaveFloat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingEntry, setSavingEntry] = useState(false)

  const chartRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => { loadRecent() }, [])
  useEffect(() => { loadEntry(date) }, [date])

  async function loadRecent() {
    try {
      const logs = await window.api.sleep.recent(14)
      setRecent(logs as SleepLog[])
    } finally {
      setLoading(false)
    }
  }

  async function loadEntry(d: string) {
    const entry = await window.api.sleep.get(d) as SleepLog | null
    if (entry) {
      setBedtime(entry.bedtime)
      setWakeTime(entry.wake_time)
      setQuality(entry.quality)
      setNotes(entry.notes || '')
      setExistingId(entry.id)
    } else {
      setBedtime('23:00')
      setWakeTime('07:00')
      setQuality(3)
      setNotes('')
      setExistingId(null)
    }
  }

  function handleQualityClick(q: number) {
    setQuality(q)
    setQualityVersion(v => v + 1)
  }

  async function handleSave() {
    if (savingEntry) return
    setSavingEntry(true)
    try {
      await window.api.sleep.save({ date, bedtime, wake_time: wakeTime, quality, notes, cycles: calcCycles(bedtime, wakeTime) || null })
      setSaved(true)
      setShowSaveFloat(true)
      setTimeout(() => setSaved(false), 2000)
      setTimeout(() => setShowSaveFloat(false), 950)
      await loadRecent()
      const entry = await window.api.sleep.get(date) as SleepLog | null
      if (entry) setExistingId(entry.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(msg.startsWith('Erro ao salvar sono') ? msg : 'Erro ao salvar sono: ' + msg)
    } finally {
      setSavingEntry(false)
    }
  }

  async function handleDelete() {
    if (!existingId) return
    await window.api.sleep.delete(existingId)
    setExistingId(null)
    setNotes('')
    loadRecent()
  }

  const avgQuality = recent.length > 0
    ? (recent.reduce((s, l) => s + l.quality, 0) / recent.length).toFixed(1)
    : null

  const avgDuration = recent.length > 0
    ? (() => {
        const totalMins = recent.reduce((s, l) => s + calcMinsFromTimes(l.bedtime, l.wake_time), 0) / recent.length
        return `${Math.floor(totalMins / 60)}h${Math.round(totalMins % 60) > 0 ? `${Math.round(totalMins % 60)}m` : ''}`
      })()
    : null

  const logsWithCycles = recent.filter(l => l.cycles && l.cycles > 0)
  const avgCycles = logsWithCycles.length > 0
    ? (logsWithCycles.reduce((s, l) => s + (l.cycles ?? 0), 0) / logsWithCycles.length).toFixed(1)
    : null

  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const log = recent.find(l => l.date === d)
    const label = format(subDays(new Date(), i), 'dd/MM')
    if (!log) return null
    const mins = calcMinsFromTimes(log.bedtime, log.wake_time)
    return {
      date: label,
      rawDate: d,
      horas: parseFloat((mins / 60).toFixed(1)),
      ciclos: log.cycles ?? null
    }
  }).filter(Boolean).reverse() as { date: string; rawDate: string; horas: number; ciclos: number | null }[]

  const hasCyclesData = chartData.some(d => d.ciclos != null && d.ciclos > 0)

  function smoothScrollTo(element: HTMLElement) {
    const container = element.closest('main') as HTMLElement
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const target = elementRect.top - containerRect.top + container.scrollTop - 80
    container.scrollTo({ top: target, behavior: 'smooth' })
  }

  function handleChartClick(data: any) {
    const rawDate = data?.activePayload?.[0]?.payload?.rawDate
    if (!rawDate) return
    setDate(rawDate)
    setHighlightedDate(rawDate)
    setTimeout(() => {
      const card = cardRefs.current[rawDate]
      if (card) smoothScrollTo(card)
    }, 50)
  }

  function handleCardClick(logDate: string) {
    setDate(logDate)
    setHighlightedDate(logDate)
    if (chartRef.current) smoothScrollTo(chartRef.current)
  }

  const renderDot = (props: any) => {
    const { cx, cy, payload } = props
    if (payload.rawDate === highlightedDate) {
      return (
        <g key={`dot-${payload.rawDate}`}>
          <circle cx={cx} cy={cy} r={9} fill="#06b6d4" opacity={0.25} />
          <circle cx={cx} cy={cy} r={5} fill="#06b6d4" stroke="#ffffff" strokeWidth={2} />
        </g>
      )
    }
    return <circle key={`dot-${payload.rawDate}`} cx={cx} cy={cy} r={3} fill="#06b6d4" />
  }

  const highlightedLog = highlightedDate ? recent.find(l => l.date === highlightedDate) : null

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-text-primary animate-slide-down">Sono</h1>
          <SectionHelpButton sectionId="sleep" title="Como usar o Sono" emoji="🌙">
            <p>
              Registre o horário em que <strong className="text-text-primary">dormiu</strong> e{' '}
              <strong className="text-text-primary">acordou</strong> a cada dia para acompanhar duração, ciclos e
              qualidade do seu descanso.
            </p>
            <HelpTips
              items={[
                'A nota de qualidade (estrelas) é subjetiva — registre como você se sentiu ao acordar.',
                'Ciclos de sono ajudam a identificar se você dormiu em múltiplos de ~90 minutos.',
                'Use o gráfico para notar padrões: dormir tarde costuma afetar a qualidade.'
              ]}
            />
          </SectionHelpButton>
        </div>
        <p className="text-text-secondary text-sm mt-1 animate-slide-in-left" style={{ animationDelay: '60ms' }}>Acompanhe a qualidade do seu sono</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Qualidade', value: avgQuality ? `${avgQuality}/5` : '—', icon: '⭐' },
          { label: 'Duração', value: avgDuration || '—', icon: '⏱️' },
          { label: 'Ciclos', value: avgCycles ? `${avgCycles}` : '—', icon: '🔄' }
        ].map((s, i) => (
          <div key={s.label} className="bg-bg-secondary border border-bg-border rounded-xl p-3 text-center animate-slide-up" style={{ animationDelay: `${i * 70}ms` }}>
            <span className="text-xl animate-bounce-in" style={{ animationDelay: `${100 + i * 70}ms`, display: 'inline-block' }}>{s.icon}</span>
            <p className="text-base font-bold text-text-primary mt-1 animate-count-up" style={{ animationDelay: `${180 + i * 70}ms` }}>{s.value}</p>
            <p className="text-[10px] text-text-muted leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Duration + Cycles chart - last 14 days */}
      {chartData.length > 0 && (
        <div ref={chartRef} className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '180ms' }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text-secondary">Duração do sono — últimos 14 dias</p>
            {highlightedLog && (
              <div className="flex items-center gap-2 bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-3 py-1 animate-fadeIn">
                <span className="text-xs text-accent-blue font-medium">
                  📍 {format(new Date(highlightedDate! + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-secondary">{calcDuration(highlightedLog.bedtime, highlightedLog.wake_time)}</span>
                {highlightedLog.cycles != null && highlightedLog.cycles > 0 && (
                  <>
                    <span className="text-xs text-text-muted">·</span>
                    <span className="text-xs text-accent-purple font-medium">{highlightedLog.cycles.toFixed(1)} ciclos</span>
                  </>
                )}
                <span className="text-xs text-text-muted">·</span>
                <span className={`text-xs font-medium ${qualityColor(highlightedLog.quality)}`}>{highlightedLog.quality}/5 ⭐</span>
              </div>
            )}
          </div>
          <ResponsiveContainer width="100%" height={hasCyclesData ? 160 : 140}>
            <LineChart data={chartData} margin={{ left: -10, right: hasCyclesData ? 16 : 8, top: 4, bottom: 0 }} onClick={handleChartClick} style={{ cursor: 'pointer' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={1} />
              <YAxis yAxisId="left" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 12]} tickFormatter={v => `${v}h`} />
              {hasCyclesData && (
                <YAxis yAxisId="right" orientation="right" tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 7]} tickFormatter={v => v > 0 ? `${v}c` : ''} />
              )}
              <Tooltip
                formatter={(v: number, name: string) => [
                  name === 'ciclos' ? `${v.toFixed(1)} ciclos` : `${v}h`,
                  name === 'ciclos' ? 'Ciclos' : 'Horas'
                ]}
                contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }}
              />
              <ReferenceLine yAxisId="left" y={8} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{ value: '8h', position: 'right', fill: '#10b981', fontSize: 10 }} />
              <Line yAxisId="left" type="monotone" dataKey="horas" stroke="#06b6d4" strokeWidth={2} dot={renderDot} activeDot={{ r: 5, fill: '#06b6d4' }} connectNulls={false} />
              {hasCyclesData && (
                <Line yAxisId="right" type="monotone" dataKey="ciclos" stroke="#8b5cf6" strokeWidth={1.5} dot={{ r: 2, fill: '#8b5cf6' }} activeDot={{ r: 4, fill: '#8b5cf6' }} connectNulls={false} strokeDasharray="4 2" />
              )}
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-1">
            <p className="text-xs text-text-muted">Linha verde = meta de 8h · Clique em um ponto para ver o registro</p>
            {hasCyclesData && (
              <span className="flex items-center gap-1 text-xs text-text-muted ml-auto">
                <span className="w-3 h-0 border-t border-dashed border-accent-purple inline-block" style={{ borderTopWidth: 1.5 }} />
                Ciclos
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 space-y-4 animate-card-in relative overflow-hidden" style={{ animationDelay: '250ms' }}>
          <span className="absolute top-3 right-5 text-sm text-text-muted/20 animate-float select-none pointer-events-none" style={{ animationDelay: '0s' }}>✦</span>
          <span className="absolute top-14 right-9 text-xs text-text-muted/15 animate-float select-none pointer-events-none" style={{ animationDelay: '1.4s' }}>✦</span>
          <span className="absolute bottom-14 right-4 text-base text-text-muted/10 animate-float select-none pointer-events-none" style={{ animationDelay: '0.7s' }}>✦</span>
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-accent-blue animate-float" style={{ animationDelay: '0.3s' } as React.CSSProperties} />
            <h2 className="font-semibold text-text-primary">Registrar sono</h2>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-1 block">Data</label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-muted mb-1 block">Hora de dormir</label>
              <input
                type="time"
                value={bedtime}
                onChange={e => setBedtime(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
              />
            </div>
            <div>
              <label className="text-xs text-text-muted mb-1 block">Hora de acordar</label>
              <input
                type="time"
                value={wakeTime}
                onChange={e => setWakeTime(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
              />
            </div>
          </div>

          <div className="p-3 bg-bg-primary rounded-lg text-center">
            <span className="text-sm text-text-secondary">Duração: </span>
            <span key={calcDuration(bedtime, wakeTime)} className="font-bold text-text-primary animate-count-up" style={{ display: 'inline-block' }}>
              {calcDuration(bedtime, wakeTime)}
            </span>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-2 block">Qualidade do sono</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(q => (
                <button
                  key={q}
                  onClick={() => handleQualityClick(q)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    quality === q
                      ? 'border-accent-purple bg-accent-purple/20 text-text-primary'
                      : 'border-bg-border text-text-muted hover:bg-bg-border'
                  }`}
                >
                  <span
                    key={quality >= q ? `f${qualityVersion}-${q}` : `e${q}`}
                    style={{ display: 'block' }}
                    className={quality >= q ? 'animate-check-pop' : ''}
                  >
                    <Star size={12} className={`mx-auto ${quality >= q ? 'text-accent-gold fill-accent-gold' : ''}`} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {(() => {
            const c = calcCycles(bedtime, wakeTime)
            return c > 0 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-bg-primary rounded-lg">
                <span className="text-sm">🔄</span>
                <span className="text-sm text-text-secondary">Ciclos estimados:</span>
                <span className="font-bold text-accent-purple">{c.toFixed(1)}</span>
                <span className="text-xs text-text-muted">(cada ciclo ≈ 90 min)</span>
              </div>
            ) : null
          })()}

          <div>
            <label className="text-xs text-text-muted mb-1 block">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Tive pesadelos, acordei durante a noite..."
              rows={2}
              className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple resize-none"
            />
          </div>

          <div className="flex gap-2 relative">
            {showSaveFloat && (
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-sm font-bold text-accent-green xp-float pointer-events-none whitespace-nowrap">
                💤 Salvo!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={savingEntry}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-60 ${saved ? 'bg-accent-green' : 'bg-accent-purple hover:bg-purple-600'}`}
            >
              <Save size={14} className={saved ? 'animate-check-pop' : ''} />
              {saved ? 'Salvo! ✓' : savingEntry ? 'Salvando...' : existingId ? 'Atualizar' : 'Salvar'}
            </button>
            {existingId && (
              <button
                onClick={handleDelete}
                className="px-3 py-2 bg-bg-border hover:bg-red-900/30 text-text-secondary hover:text-accent-red rounded-lg transition-colors"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* History */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider animate-reveal-left">Histórico</h2>
          {recent.length === 0 && (
            <p className="text-text-muted text-sm">Nenhum registro ainda.</p>
          )}
          {recent.map((log, i) => (
            <button
              key={log.id}
              ref={el => { cardRefs.current[log.date] = el }}
              onClick={() => handleCardClick(log.date)}
              className={`w-full text-left p-3 rounded-xl border transition-all animate-slide-up hover:shadow-md hover:shadow-accent-blue/10 hover:-translate-y-px ${
                log.date === date
                  ? 'border-accent-purple bg-accent-purple/10 shadow-sm shadow-accent-purple/20'
                  : 'border-bg-border bg-bg-secondary hover:border-accent-blue/30'
              } ${log.date === highlightedDate && log.date !== date ? 'ring-1 ring-accent-blue/50' : ''}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {format(new Date(log.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                </span>
                <span className={`text-sm font-bold ${qualityColor(log.quality)}`}>
                  {log.quality}/5 ⭐
                </span>
              </div>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-text-muted">🌙 {log.bedtime}</span>
                <span className="text-xs text-text-muted">☀️ {log.wake_time}</span>
                <span className="text-xs text-accent-blue font-medium">{calcDuration(log.bedtime, log.wake_time)}</span>
                {log.cycles != null && log.cycles > 0 && (
                  <span className="text-xs text-accent-purple font-medium">🔄 {log.cycles.toFixed(1)} ciclos</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
