import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Grid3X3, Newspaper, Type, Check, CheckCircle, Flame, ChevronRight, Star } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Challenge {
  key: string
  route: string
  label: string
  description: string
  icon: React.ReactNode
  color: string
  xp: number
  getCompleted: (today: string) => boolean
  getProgress?: (today: string) => string | null
}

function loadJson(key: string): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(key) || '{}') } catch { return {} }
}

export default function Challenges(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  const challenges: Challenge[] = useMemo(() => [
    {
      key: 'wordle',
      route: '/challenges/wordle',
      label: 'Palavra do Dia',
      description: 'Adivinhe a palavra de 5 letras em 6 tentativas',
      icon: <Type size={22} />,
      color: '#10b981',
      xp: 30,
      getCompleted: (d) => {
        const s = loadJson(`habitos_wordle_${d}`)
        return s.status === 'won' || s.status === 'lost'
      },
      getProgress: (d) => {
        const s = loadJson(`habitos_wordle_${d}`)
        if (s.status === 'won') return `✓ ${s.attempts} tentativa${(s.attempts as number) !== 1 ? 's' : ''}`
        if (s.status === 'lost') return 'Palavra revelada'
        if (s.guesses && (s.guesses as string[]).length > 0) return `${(s.guesses as string[]).length}/6 tentativas`
        return null
      },
    },
    {
      key: 'sudoku',
      route: '/challenges/sudoku',
      label: 'Sudoku',
      description: 'Puzzle lógico 9×9 — exercite o raciocínio',
      icon: <Grid3X3 size={22} />,
      color: '#8b5cf6',
      xp: 20,
      getCompleted: (d) => !!loadJson(`habitos_sudoku_${d}`).completed,
      getProgress: (d) => {
        const s = loadJson(`habitos_sudoku_${d}`)
        if (s.completed) return `✓ ${formatTimer(s.timer as number)}`
        if (s.timer) return `Em progresso · ${formatTimer(s.timer as number)}`
        return null
      },
    },
    {
      key: 'news',
      route: '/challenges/news',
      label: 'Notícias do Dia',
      description: 'Leia 5 notícias e mantenha-se informado',
      icon: <Newspaper size={22} />,
      color: '#3b82f6',
      xp: 15,
      getCompleted: (d) => {
        const s = loadJson(`habitos_news_${d}`)
        return (s.readCount as number) >= 5
      },
      getProgress: (d) => {
        const s = loadJson(`habitos_news_${d}`)
        const count = (s.readCount as number) || 0
        if (count >= 5) return '✓ Todas lidas'
        if (count > 0) return `${count}/5 lidas`
        return null
      },
    },
  ], [])

  const completed = challenges.filter(c => c.getCompleted(today))
  const xpEarned = completed.reduce((sum, c) => sum + c.xp, 0)
  const allDone = completed.length === challenges.length

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
          <Flame size={20} className="text-orange-400" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">Desafios Diários</h1>
          <p className="text-sm text-text-muted capitalize">{dateLabel}</p>
        </div>
        {xpEarned > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/15 border border-yellow-500/25 rounded-xl">
            <Star size={13} className="text-yellow-400" />
            <span className="text-sm font-semibold text-yellow-400">+{xpEarned} XP</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-text-primary">
            {completed.length}/{challenges.length} desafios completos
          </span>
          {allDone && (
            <span className="text-xs font-semibold text-orange-400 flex items-center gap-1">
              <Flame size={12} /> Sequência mantida!
            </span>
          )}
        </div>
        <div className="h-2 bg-bg-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completed.length / challenges.length) * 100}%`,
              background: allDone ? '#f97316' : '#7c3aed',
            }}
          />
        </div>
      </div>

      {/* Challenge cards */}
      <div className="space-y-3">
        {challenges.map(c => {
          const isDone = c.getCompleted(today)
          const progress = c.getProgress?.(today)
          return (
            <Link
              key={c.key}
              to={c.route}
              className="flex items-center gap-4 p-4 border rounded-xl transition-all hover:shadow-md group"
              style={isDone
                ? { backgroundColor: `${c.color}12`, borderColor: `${c.color}60` }
                : { backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-border)' }
              }
            >
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                  style={{ backgroundColor: `${c.color}${isDone ? '30' : '20'}`, color: c.color }}
                >
                  {c.icon}
                </div>
                {isDone && (
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2"
                    style={{ backgroundColor: c.color, borderColor: 'var(--bg-secondary)' }}
                  >
                    <Check size={10} className="text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary">{c.label}</h3>
                <p className="text-xs text-text-muted mt-0.5">{c.description}</p>
                {progress && (
                  <p className="text-xs mt-1 font-medium" style={{ color: c.color }}>{progress}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {isDone ? (
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: `${c.color}20`, color: c.color }}
                  >
                    <CheckCircle size={12} />
                    Concluído
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-yellow-400">
                    <Star size={11} />
                    <span>{c.xp} XP</span>
                  </div>
                )}
                <ChevronRight size={15} className="text-text-muted group-hover:text-text-primary transition-colors" />
              </div>
            </Link>
          )
        })}
      </div>

      {allDone && (
        <div className="p-4 rounded-xl border text-center"
          style={{ background: 'rgba(249,115,22,0.08)', borderColor: 'rgba(249,115,22,0.3)' }}>
          <p className="text-orange-400 font-semibold">🔥 Todos os desafios de hoje concluídos!</p>
          <p className="text-text-muted text-sm mt-1">Volte amanhã para novos desafios</p>
        </div>
      )}
    </div>
  )
}

function formatTimer(s: number): string {
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
