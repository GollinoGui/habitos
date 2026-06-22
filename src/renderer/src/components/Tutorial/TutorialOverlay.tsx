import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'

interface TutorialStep {
  elementId: string
  route: string
  title: string
  description: string
  emoji: string
}

const STEPS: TutorialStep[] = [
  {
    elementId: 'nav-dashboard',
    route: '/',
    title: 'Dashboard',
    emoji: '🏠',
    description:
      'Visão geral do seu dia: hábitos pendentes, contadores de sobriedade e suas conquistas mais recentes.'
  },
  {
    elementId: 'nav-habits',
    route: '/habits',
    title: 'Hábitos',
    emoji: '✅',
    description:
      'Crie e acompanhe hábitos diários. Cada hábito concluído ganha XP e mantém sua sequência ativa!'
  },
  {
    elementId: 'nav-gym',
    route: '/gym',
    title: 'Academia',
    emoji: '💪',
    description:
      'Registre treinos com exercícios e séries. Acompanhe sua evolução corporal com medidas de bioimpedância.'
  },
  {
    elementId: 'nav-addictions',
    route: '/addictions',
    title: 'Vícios',
    emoji: '🛡️',
    description:
      'Monitore sua sobriedade, veja quanto tempo você está livre e celebre marcos importantes da jornada.'
  },
  {
    elementId: 'nav-goals',
    route: '/goals',
    title: 'Metas',
    emoji: '🎯',
    description:
      'Defina grandes objetivos e quebre-os em subtarefas. Conclua tudo e ganhe XP como recompensa!'
  },
  {
    elementId: 'nav-achievements',
    route: '/achievements',
    title: 'Conquistas',
    emoji: '🏆',
    description:
      'Seu perfil, histórico de XP e todas as conquistas desbloqueadas. Quantas você vai colecionar?'
  },
  {
    elementId: 'nav-journal',
    route: '/journal',
    title: 'Diário',
    emoji: '📔',
    description:
      'Registre como foi seu dia e seu humor. Escrever com frequência também desbloqueia conquistas!'
  },
  {
    elementId: 'nav-sleep',
    route: '/sleep',
    title: 'Sono',
    emoji: '🌙',
    description:
      'Acompanhe horário de dormir, acordar e qualidade do sono para entender seus padrões de descanso.'
  },
  {
    elementId: 'nav-finance',
    route: '/finance',
    title: 'Finanças',
    emoji: '💰',
    description:
      'Controle receitas, despesas e contas recorrentes. Veja seu saldo atual e projetado.'
  },
  {
    elementId: 'nav-reading',
    route: '/reading',
    title: 'Mídia',
    emoji: '📚',
    description:
      'Acompanhe livros, séries, filmes e mangás. Registre sessões de leitura ou episódios assistidos.'
  },
  {
    elementId: 'nav-calendar',
    route: '/calendar',
    title: 'Calendário',
    emoji: '📅',
    description:
      'Veja eventos, hábitos concluídos e anotações do mês inteiro em um só lugar.'
  },
  {
    elementId: 'nav-analytics',
    route: '/analytics',
    title: 'Analytics',
    emoji: '📊',
    description:
      'Estatísticas detalhadas do seu progresso: tendências, taxas de conclusão e muito mais.'
  }
]

interface Layout {
  balloonTop: number
  balloonLeft: number
  arrowSide: 'left' | 'right'
  highlightTop: number
  highlightLeft: number
  highlightWidth: number
  highlightHeight: number
}

interface Props {
  onComplete: () => void
}

const BALLOON_WIDTH = 288

export default function TutorialOverlay({ onComplete }: Props): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0)
  const [layout, setLayout] = useState<Layout | null>(null)
  const navigate = useNavigate()

  const step = STEPS[currentStep]

  const updateLayout = useCallback(() => {
    const el = document.getElementById(step.elementId)
    if (!el) return
    const rect = el.getBoundingClientRect()
    const spaceRight = window.innerWidth - rect.right
    const arrowSide: 'left' | 'right' = spaceRight >= BALLOON_WIDTH + 20 ? 'left' : 'right'

    setLayout({
      balloonTop: rect.top + rect.height / 2,
      balloonLeft:
        arrowSide === 'left' ? rect.right + 12 : rect.left - BALLOON_WIDTH - 12,
      arrowSide,
      highlightTop: rect.top - 4,
      highlightLeft: rect.left - 4,
      highlightWidth: rect.width + 8,
      highlightHeight: rect.height + 8
    })
  }, [step.elementId])

  useEffect(() => {
    navigate(step.route)
    const timer = setTimeout(updateLayout, 120)
    return () => clearTimeout(timer)
  }, [currentStep, navigate, step.route, updateLayout])

  function handleNext(): void {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1)
    } else {
      onComplete()
    }
  }

  function handlePrev(): void {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1)
    }
  }

  return (
    <>
      {/* Dimmed backdrop */}
      <div className="fixed inset-0 z-40 bg-black/55 pointer-events-auto" />

      {layout && (
        <>
          {/* Pulsing highlight ring around the sidebar item */}
          <div
            className="fixed z-50 pointer-events-none rounded-lg border-2 border-accent-purple tutorial-glow"
            style={{
              top: layout.highlightTop,
              left: layout.highlightLeft,
              width: layout.highlightWidth,
              height: layout.highlightHeight
            }}
          />

          {/* Balloon */}
          <div
            className="fixed z-50 pointer-events-auto"
            style={{
              top: layout.balloonTop,
              left: layout.balloonLeft,
              transform: 'translateY(-50%)'
            }}
          >
            <div className="flex items-center">
              {/* Arrow pointing left (toward sidebar) */}
              {layout.arrowSide === 'left' && (
                <div
                  className="shrink-0"
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderRight: '10px solid #2a2a4a'
                  }}
                />
              )}

              <div
                className="bg-bg-secondary border border-bg-border rounded-xl shadow-2xl overflow-hidden animate-fadeIn"
                style={{ width: BALLOON_WIDTH }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{step.emoji}</span>
                    <h3 className="font-bold text-text-primary text-base">{step.title}</h3>
                  </div>
                  <button
                    onClick={onComplete}
                    title="Pular tutorial"
                    className="text-text-muted hover:text-text-secondary transition-colors p-1 rounded"
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* Description */}
                <p className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">
                  {step.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-bg-border bg-bg-primary/40">
                  {/* Progress dots */}
                  <div className="flex gap-1.5 items-center">
                    {STEPS.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          i === currentStep
                            ? 'w-5 bg-accent-purple'
                            : 'w-1.5 bg-bg-border'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={handlePrev}
                        className="px-3 py-1.5 text-xs border border-bg-border text-text-secondary hover:bg-bg-border rounded-lg transition-colors"
                      >
                        ← Anterior
                      </button>
                    )}
                    <button
                      onClick={handleNext}
                      className="px-3 py-1.5 text-xs bg-accent-purple hover:bg-purple-600 text-white font-semibold rounded-lg transition-colors"
                    >
                      {currentStep < STEPS.length - 1 ? 'Próximo →' : 'Concluir ✓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Arrow pointing right (when balloon is on left side) */}
              {layout.arrowSide === 'right' && (
                <div
                  className="shrink-0"
                  style={{
                    width: 0,
                    height: 0,
                    borderTop: '8px solid transparent',
                    borderBottom: '8px solid transparent',
                    borderLeft: '10px solid #2a2a4a'
                  }}
                />
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
