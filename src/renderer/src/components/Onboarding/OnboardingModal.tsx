import React, { useState } from 'react'
import { ArrowRight, CheckSquare, Dumbbell, ShieldOff, Target } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useProfileStore } from '../../store/profileStore'

const STEPS = ['welcome', 'name', 'tour', 'done'] as const
type Step = (typeof STEPS)[number]

const features = [
  {
    icon: CheckSquare,
    color: 'text-accent-green',
    bg: 'bg-emerald-950/40',
    title: 'Hábitos',
    desc: 'Crie hábitos diários e ganhe XP ao completá-los.'
  },
  {
    icon: Dumbbell,
    color: 'text-accent-blue',
    bg: 'bg-blue-950/40',
    title: 'Academia',
    desc: 'Registre treinos e acompanhe sua evolução.'
  },
  {
    icon: ShieldOff,
    color: 'text-accent-red',
    bg: 'bg-red-950/40',
    title: 'Vícios',
    desc: 'Monitore a sobriedade e celebre cada marco.'
  },
  {
    icon: Target,
    color: 'text-accent-gold',
    bg: 'bg-yellow-950/40',
    title: 'Metas',
    desc: 'Defina metas com subtarefas e vença-as.'
  }
]

interface Props {
  onComplete: () => void
}

export default function OnboardingModal({ onComplete }: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const { fetchProfile } = useProfileStore()
  const navigate = useNavigate()

  async function handleSaveName(): Promise<void> {
    const trimmed = name.trim() || 'Herói'
    setSaving(true)
    await window.api.profile.updateName(trimmed)
    await fetchProfile()
    setSaving(false)
    setStep('tour')
  }

  function handleFinish(): void {
    localStorage.setItem('habitos_onboarded', '1')
    onComplete()
    navigate('/habits')
  }

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl animate-fadeIn">
        {/* Progress bar */}
        <div className="flex gap-1.5 px-8 pt-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= stepIndex ? 'bg-accent-purple' : 'bg-bg-border'
              }`}
            />
          ))}
        </div>

        <div className="p-8">
          {step === 'welcome' && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🏆</div>
              <h1 className="text-2xl font-bold text-text-primary">Bem-vindo ao Hábitos!</h1>
              <p className="text-text-secondary leading-relaxed text-sm">
                Construa hábitos incríveis, supere vícios, alcance metas e evolua como um personagem
                de RPG — ganhando XP a cada conquista.
              </p>
              <button
                onClick={() => setStep('name')}
                className="w-full mt-2 py-3 bg-accent-purple hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                Começar <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 'name' && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="text-5xl mb-3">👤</div>
                <h2 className="text-xl font-bold text-text-primary">Como vamos te chamar?</h2>
                <p className="text-text-muted text-sm mt-1">Esse será o seu nome de herói</p>
              </div>
              <input
                type="text"
                placeholder="Seu nome..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !saving && handleSaveName()}
                maxLength={30}
                autoFocus
                className="w-full px-4 py-3 bg-bg-primary border border-bg-border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-purple transition-colors"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('welcome')}
                  className="px-4 py-2.5 text-text-secondary hover:text-text-primary border border-bg-border rounded-xl transition-colors text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-accent-purple hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? 'Salvando...' : (<>Continuar <ArrowRight size={16} /></>)}
                </button>
              </div>
            </div>
          )}

          {step === 'tour' && (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold text-text-primary">Explore o app</h2>
                <p className="text-text-muted text-sm mt-1">Tudo que você pode fazer</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {features.map(({ icon: Icon, color, bg, title, desc }) => (
                  <div
                    key={title}
                    className={`p-4 ${bg} rounded-xl border border-bg-border`}
                  >
                    <Icon size={20} className={`${color} mb-2`} />
                    <p className="text-text-primary font-semibold text-sm">{title}</p>
                    <p className="text-text-muted text-xs mt-1 leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setStep('done')}
                className="w-full py-2.5 bg-accent-purple hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
              >
                Próximo <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="text-6xl">🚀</div>
              <h2 className="text-xl font-bold text-text-primary">Tudo pronto!</h2>
              <p className="text-text-secondary leading-relaxed text-sm">
                Comece criando seu primeiro hábito. Cada dia completado ganha XP e te aproxima do
                próximo nível!
              </p>
              <button
                onClick={handleFinish}
                className="w-full mt-2 py-3 bg-accent-purple hover:bg-purple-600 text-white rounded-xl font-semibold transition-colors"
              >
                Criar meu primeiro hábito 🎯
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
