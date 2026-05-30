import React, { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Moon, Save, Star, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'

interface SleepLog {
  id: number; date: string; bedtime: string; wake_time: string; quality: number; notes: string
}

function calcDuration(bedtime: string, wake_time: string): string {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wake_time.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 24 * 60
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m > 0 ? `${m}m` : ''}`
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

  useEffect(() => { loadRecent() }, [])
  useEffect(() => { loadEntry(date) }, [date])

  async function loadRecent() {
    const logs = await window.api.sleep.recent(14)
    setRecent(logs as SleepLog[])
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

  async function handleSave() {
    await window.api.sleep.save({ date, bedtime, wake_time: wakeTime, quality, notes })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadRecent()
    const entry = await window.api.sleep.get(date) as SleepLog | null
    if (entry) setExistingId(entry.id)
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
        const totalMins = recent.reduce((s, l) => {
          const [bh, bm] = l.bedtime.split(':').map(Number)
          const [wh, wm] = l.wake_time.split(':').map(Number)
          let m = (wh * 60 + wm) - (bh * 60 + bm)
          if (m < 0) m += 24 * 60
          return s + m
        }, 0) / recent.length
        return `${Math.floor(totalMins / 60)}h${Math.round(totalMins % 60) > 0 ? `${Math.round(totalMins % 60)}m` : ''}`
      })()
    : null

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    return recent.find(l => l.date === d)
  })

  function calcMins(bedtime: string, wake_time: string): number {
    const [bh, bm] = bedtime.split(':').map(Number)
    const [wh, wm] = wake_time.split(':').map(Number)
    let m = (wh * 60 + wm) - (bh * 60 + bm)
    if (m < 0) m += 24 * 60
    return m
  }

  const chartData = Array.from({ length: 14 }, (_, i) => {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    const log = recent.find(l => l.date === d)
    const label = format(subDays(new Date(), i), 'dd/MM')
    if (!log) return { date: label, horas: null }
    const mins = calcMins(log.bedtime, log.wake_time)
    return { date: label, horas: parseFloat((mins / 60).toFixed(1)) }
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Sono</h1>
        <p className="text-text-secondary text-sm mt-1">Acompanhe a qualidade do seu sono</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Registros', value: String(recent.length), icon: '📋' },
          { label: 'Qualidade média', value: avgQuality ? `${avgQuality}/5` : '—', icon: '⭐' },
          { label: 'Duração média', value: avgDuration || '—', icon: '⏱️' }
        ].map(s => (
          <div key={s.label} className="bg-bg-secondary border border-bg-border rounded-xl p-4 text-center">
            <span className="text-2xl">{s.icon}</span>
            <p className="text-xl font-bold text-text-primary mt-1">{s.value}</p>
            <p className="text-xs text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Duration chart - last 14 days */}
      {chartData.some(d => d.horas !== null) && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
          <p className="text-sm font-medium text-text-secondary mb-3">Duração do sono — últimos 14 dias</p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={chartData} margin={{ left: -10, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={1} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 12]} tickFormatter={v => `${v}h`} />
              <Tooltip formatter={(v: number) => [`${v}h`, 'Horas']} contentStyle={{ background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 8 }} />
              <ReferenceLine y={8} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} label={{ value: '8h', position: 'right', fill: '#10b981', fontSize: 10 }} />
              <Line type="monotone" dataKey="horas" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4', r: 3 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-text-muted mt-1">Linha verde = meta de 8h</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-accent-blue" />
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
            <span className="font-bold text-text-primary">{calcDuration(bedtime, wakeTime)}</span>
          </div>

          <div>
            <label className="text-xs text-text-muted mb-2 block">Qualidade do sono</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(q => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    quality === q
                      ? 'border-accent-purple bg-accent-purple/20 text-text-primary'
                      : 'border-bg-border text-text-muted hover:bg-bg-border'
                  }`}
                >
                  <Star size={12} className={`mx-auto ${quality >= q ? 'text-accent-gold fill-accent-gold' : ''}`} />
                </button>
              ))}
            </div>
          </div>

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

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={14} />
              {saved ? 'Salvo!' : existingId ? 'Atualizar' : 'Salvar'}
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
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Histórico</h2>
          {recent.length === 0 && (
            <p className="text-text-muted text-sm">Nenhum registro ainda.</p>
          )}
          {recent.map(log => (
            <button
              key={log.id}
              onClick={() => setDate(log.date)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                log.date === date
                  ? 'border-accent-purple bg-accent-purple/10'
                  : 'border-bg-border bg-bg-secondary hover:border-bg-border/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {format(new Date(log.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                </span>
                <span className={`text-sm font-bold ${qualityColor(log.quality)}`}>
                  {log.quality}/5 ⭐
                </span>
              </div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-xs text-text-muted">🌙 {log.bedtime}</span>
                <span className="text-xs text-text-muted">☀️ {log.wake_time}</span>
                <span className="text-xs text-accent-blue font-medium">{calcDuration(log.bedtime, log.wake_time)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
