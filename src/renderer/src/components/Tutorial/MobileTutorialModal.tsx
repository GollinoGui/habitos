import React, { useState, useRef } from 'react'

const SLIDES = [
  {
    emoji: '🏆',
    title: 'Bem-vindo ao Hábitos!',
    description:
      'Seu companheiro de evolução pessoal. Construa hábitos, supere vícios, alcance metas e suba de nível — ganhando XP a cada conquista.',
    color: '#7c3aed'
  },
  {
    emoji: '👉',
    title: 'Como Navegar',
    description:
      'Use a barra de ícones no rodapé para ir de uma seção para outra: deslize o dedo para o lado ou toque direto no ícone da seção que você quer abrir.',
    color: '#7c3aed'
  },
  {
    emoji: '🏠',
    title: 'Dashboard',
    description:
      'Sua tela inicial. Mostra de relance os hábitos pendentes de hoje, seus contadores de sobriedade e as conquistas mais recentes.',
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
    emoji: '🌙',
    title: 'Sono',
    description:
      'Registre quantas horas e ciclos você dormiu cada noite e acompanhe a qualidade do seu sono ao longo do tempo.',
    color: '#06b6d4'
  },
  {
    emoji: '💰',
    title: 'Finanças',
    description:
      'Faça seu controle de receitas e despesas aqui. Organize por categorias e veja para onde está indo o seu dinheiro.',
    color: '#10b981'
  },
  {
    emoji: '💪',
    title: 'Academia & Treinos',
    description:
      'Faça seu registro de treinos e atividades físicas aqui. Acompanhe medidas corporais ao longo do tempo e visualize sua evolução física.',
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
    emoji: '📓',
    title: 'Diário',
    description:
      'Escreva reflexões e anotações sobre o seu dia. Um espaço só seu para colocar os pensamentos no papel.',
    color: '#8b5cf6'
  },
  {
    emoji: '📚',
    title: 'Mídia',
    description:
      'Guarde os livros, filmes, séries e mangás que você está acompanhando ou já terminou.',
    color: '#ec4899'
  },
  {
    emoji: '📅',
    title: 'Calendário',
    description:
      'Veja em um só lugar tudo que aconteceu em cada dia: hábitos concluídos, treinos e outros eventos.',
    color: '#0ea5e9'
  },
  {
    emoji: '📊',
    title: 'Analytics',
    description:
      'Gráficos e tendências da sua evolução ao longo do tempo, juntando dados de todas as áreas do app.',
    color: '#a855f7'
  },
  {
    emoji: '⚡',
    title: 'Conquistas & Perfil',
    description:
      'Seu perfil: ganhe XP em cada ação, suba de nível e desbloqueie conquistas únicas. Acompanhe toda a sua jornada aqui.',
    color: '#f59e0b'
  },
  {
    emoji: '⚙️',
    title: 'Configurações',
    description:
      'Edite seu perfil, escolha quais seções aparecem no menu e ajuste as cores do app. Você pode rever este tutorial aqui sempre que quiser.',
    color: '#6b7280'
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
      <div className="relative z-10 flex justify-end px-4 pb-2 shrink-0" style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}>
        <button
          onClick={onComplete}
          className="text-text-muted text-sm px-3 py-1.5 rounded-lg active:bg-bg-secondary transition-colors"
        >
          Pular
        </button>
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex-1 min-h-0 overflow-y-auto flex flex-col items-center justify-center px-6 text-center">
        <div
          key={`emoji-${current}`}
          className="mb-4 select-none animate-fadeIn"
          style={{ fontSize: 'clamp(2.75rem, 16vh, 6rem)', lineHeight: 1 }}
        >
          {slide.emoji}
        </div>
        <h1
          key={`title-${current}`}
          className="text-xl sm:text-2xl font-bold text-text-primary mb-3 animate-fadeIn"
        >
          {slide.title}
        </h1>
        <p
          key={`desc-${current}`}
          className="text-text-secondary text-sm sm:text-base leading-relaxed animate-fadeIn"
        >
          {slide.description}
        </p>
      </div>

      {/* Bottom controls */}
      <div
        className="relative z-10 px-4 space-y-4 shrink-0"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
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
