import React, { useState, useRef } from 'react'

const SLIDES = [
  {
    emoji: '🏆',
    title: 'Bem-vindo ao Hábitos!',
    description:
      'Seu companheiro de evolução pessoal. Construa hábitos, supere vícios, alcance metas e evolua como um herói de RPG — ganhando XP a cada conquista.',
    color: '#7c3aed'
  },
  {
    emoji: '✅',
    title: 'Hábitos Diários',
    description:
      'Crie hábitos personalizados e marque-os como feitos todo dia. Cada hábito concluído ganha XP e mantém sua sequência ativa. Não quebre a corrente!',
    color: '#10b981'
  },
  {
    emoji: '💪',
    title: 'Academia & Treinos',
    description:
      'Registre seus treinos com exercícios e séries. Acompanhe medidas corporais ao longo do tempo e visualize sua evolução física.',
    color: '#ef4444'
  },
  {
    emoji: '🛡️',
    title: 'Superando Vícios',
    description:
      'Monitore sua sobriedade com contadores precisos. Celebre marcos de 7, 30 e 90 dias — cada dia sóbrio é uma vitória.',
    color: '#3b82f6'
  },
  {
    emoji: '🎯',
    title: 'Metas & Objetivos',
    description:
      'Defina grandes objetivos e quebre-os em subtarefas concretas. Conclua cada etapa e ganhe XP como recompensa pela sua determinação.',
    color: '#f59e0b'
  },
  {
    emoji: '🌙',
    title: 'Mais Seções',
    description:
      'Registro de sono, diário pessoal, controle financeiro, leituras e mídias — tudo integrado para evoluir em todos os aspectos da sua vida.',
    color: '#06b6d4'
  },
  {
    emoji: '⚡',
    title: 'Sistema de XP & Nível',
    description:
      'Cada ação ganha XP e sobe seu nível de herói. Desbloqueie conquistas únicas e acompanhe toda sua jornada na seção de Conquistas!',
    color: '#f59e0b'
  }
]

interface Props {
  onComplete: () => void
}

export default function MobileTutorialModal({ onComplete }: Props): React.JSX.Element {
  const [current, setCurrent] = useState(0)
  const touchStart = useRef<number | null>(null)

  const slide = SLIDES[current]
  const isLast = current === SLIDES.length - 1

  function next(): void {
    if (isLast) {
      onComplete()
    } else {
      setCurrent((c) => c + 1)
    }
  }

  function prev(): void {
    if (current > 0) setCurrent((c) => c - 1)
  }

  function onTouchStart(e: React.TouchEvent): void {
    touchStart.current = e.touches[0].clientX
  }

  function onTouchEnd(e: React.TouchEvent): void {
    if (touchStart.current === null) return
    const dx = e.changedTouches[0].clientX - touchStart.current
    touchStart.current = null
    if (dx < -60) next()
    else if (dx > 60) prev()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-primary"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Colored gradient overlay — changes per slide */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500"
        style={{
          background: `linear-gradient(to bottom, ${slide.color}22 0%, transparent 65%)`
        }}
      />

      {/* Skip button */}
      <div className="relative z-10 flex justify-end px-6 pt-12 pb-2">
        <button
          onClick={onComplete}
          className="text-text-muted text-sm px-3 py-1.5 rounded-lg active:bg-bg-secondary transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div key={`emoji-${current}`} className="text-8xl mb-8 select-none animate-fadeIn">
          {slide.emoji}
        </div>
        <h1
          key={`title-${current}`}
          className="text-2xl font-bold text-text-primary mb-4 animate-fadeIn"
        >
          {slide.title}
        </h1>
        <p
          key={`desc-${current}`}
          className="text-text-secondary text-base leading-relaxed max-w-xs animate-fadeIn"
        >
          {slide.description}
        </p>
      </div>

      {/* Bottom controls */}
      <div className="relative z-10 px-6 pb-12 space-y-6">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === current ? slide.color : 'var(--bg-border)',
                transition: 'all 300ms ease'
              }}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={prev}
              className="px-5 py-4 border border-bg-border text-text-secondary rounded-2xl font-semibold text-sm active:bg-bg-secondary transition-colors"
            >
              ←
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-transform"
            style={{ backgroundColor: slide.color }}
          >
            {isLast ? 'Vamos lá! 🚀' : 'Próximo →'}
          </button>
        </div>
      </div>
    </div>
  )
}
