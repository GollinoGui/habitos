import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Trophy, Star, Zap, Pencil, Check, X } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

interface Achievement {
  id: number; key: string; name: string; description: string; icon: string; unlocked_at: string
}

const ALL_BADGES = [
  { key: 'first_habit', name: 'Primeiro Hábito', description: 'Criou seu primeiro hábito', icon: '🌟', category: 'Hábitos' },
  { key: 'streak_7', name: '7 Dias Seguidos', description: 'Completou um hábito por 7 dias consecutivos', icon: '🔥', category: 'Hábitos' },
  { key: 'streak_30', name: '30 Dias Seguidos', description: 'Completou um hábito por 30 dias consecutivos', icon: '💎', category: 'Hábitos' },
  { key: 'streak_100', name: '100 Dias Seguidos', description: 'Completou um hábito por 100 dias consecutivos', icon: '🚀', category: 'Hábitos' },
  { key: 'gym_10', name: '10 Treinos', description: 'Registrou 10 treinos', icon: '🏋️', category: 'Academia' },
  { key: 'gym_50', name: '50 Treinos', description: 'Registrou 50 treinos', icon: '💪', category: 'Academia' },
  { key: 'gym_100', name: '100 Treinos', description: 'Registrou 100 treinos', icon: '🥇', category: 'Academia' },
  { key: 'sober_7d', name: '7 Dias Livre', description: '7 dias livre de um vício', icon: '🌱', category: 'Sobriedade' },
  { key: 'sober_30d', name: '30 Dias Livre', description: '30 dias livre de um vício', icon: '🌿', category: 'Sobriedade' },
  { key: 'sober_90d', name: '90 Dias Livre', description: '90 dias livre de um vício', icon: '🏆', category: 'Sobriedade' },
  { key: 'sober_365d', name: '1 Ano Livre', description: '365 dias livre de um vício', icon: '👑', category: 'Sobriedade' },
  { key: 'goal_first', name: 'Primeira Meta!', description: 'Completou sua primeira meta', icon: '🎯', category: 'Metas' },
  { key: 'goal_5', name: '5 Metas Concluídas', description: 'Completou 5 metas', icon: '🎊', category: 'Metas' },
  { key: 'first_bio', name: 'Primeira Medição', description: 'Registrou sua primeira bioimpedância', icon: '⚖️', category: 'Academia' },
  { key: 'journal_7', name: 'Diário da Semana', description: 'Escreveu no diário por 7 dias', icon: '📔', category: 'Diário' },
  { key: 'journal_30', name: 'Diário do Mês', description: 'Escreveu no diário por 30 dias', icon: '📗', category: 'Diário' },
  { key: 'sleep_7', name: 'Sono Registrado', description: 'Registrou o sono por 7 dias seguidos', icon: '🌙', category: 'Sono' },
  { key: 'sleep_quality', name: 'Sono de Qualidade', description: 'Registrou 5/5 de qualidade no sono', icon: '⭐', category: 'Sono' },
  { key: 'reading_first', name: 'Primeiro Livro', description: 'Concluiu sua primeira leitura', icon: '📚', category: 'Leitura' },
  { key: 'reading_5', name: 'Leitor Dedicado', description: 'Concluiu 5 livros', icon: '🔖', category: 'Leitura' },
  { key: 'finance_first', name: 'Financeiro', description: 'Registrou sua primeira transação', icon: '💰', category: 'Finanças' },
  { key: 'finance_positive', name: 'Saldo Positivo', description: 'Terminou um mês com saldo positivo', icon: '📈', category: 'Finanças' },
  { key: 'level_up_2', name: 'Nível 2: Aprendiz', description: 'Alcançou o rank Aprendiz', icon: '⬆️', category: 'XP' },
  { key: 'level_up_3', name: 'Nível 3: Guerreiro', description: 'Alcançou o rank Guerreiro', icon: '⚔️', category: 'XP' },
  { key: 'level_up_4', name: 'Nível 4: Herói', description: 'Alcançou o rank Herói', icon: '🦸', category: 'XP' },
  { key: 'level_up_5', name: 'Nível 5: Lendário', description: 'Alcançou o rank Lendário', icon: '🌟', category: 'XP' },
  { key: 'level_up_6', name: 'Nível 6: Imortal', description: 'Alcançou o rank Imortal', icon: '⚡', category: 'XP' },
  { key: 'level_up_7', name: 'Nível 7: Ascendente', description: 'Alcançou o rank Ascendente', icon: '👑', category: 'XP' }
]

const CATEGORIES = ['Todos', 'Hábitos', 'Academia', 'Sobriedade', 'Metas', 'Diário', 'Sono', 'Leitura', 'Finanças', 'XP']

export default function Achievements(): React.JSX.Element {
  const { profile, fetchProfile } = useProfileStore()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [badgeFilter, setBadgeFilter] = useState('Todos')

  useEffect(() => {
    fetchProfile()
    window.api.achievements.list().then(setAchievements)
  }, [])

  const unlockedKeys = new Set(achievements.map(a => a.key))
  const unlockedCount = achievements.length

  async function saveName() {
    if (nameInput.trim()) {
      await window.api.profile.updateName(nameInput.trim())
      await fetchProfile()
    }
    setEditingName(false)
  }

  if (!profile) return <div className="text-text-muted text-sm">Carregando...</div>

  const { levelInfo, total_xp } = profile
  const { current, next } = levelInfo
  const xpInLevel = total_xp - current.xp
  const xpToNext = next ? next.xp - current.xp : 0
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary">Conquistas & Perfil</h1>

      {/* Profile card */}
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center text-3xl">
            {current.level <= 2 ? '🌱' : current.level <= 4 ? '⚔️' : current.level <= 6 ? '👑' : '🌟'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                    className="bg-bg-primary border border-bg-border rounded-lg px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
                  <button onClick={saveName} className="text-accent-green"><Check size={15} /></button>
                  <button onClick={() => setEditingName(false)} className="text-text-muted"><X size={15} /></button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-text-primary">{profile.name}</h2>
                  <button onClick={() => { setNameInput(profile.name); setEditingName(true) }}
                    className="text-text-muted hover:text-text-primary"><Pencil size={13} /></button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Star size={13} className="text-accent-gold" fill="currentColor" />
              <span className="text-sm font-semibold text-accent-gold">Nv.{current.level} — {current.rank}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-accent-gold font-bold text-xl justify-end">
              <Zap size={16} fill="currentColor" />{total_xp}
            </div>
            <p className="text-xs text-text-muted">XP total</p>
          </div>
        </div>

        {/* XP bar */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>Nv.{current.level} — {current.rank}</span>
            {next && <span>Nv.{next.level} — {next.rank}</span>}
          </div>
          <div className="h-3 bg-bg-border rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-1">
            <span>{xpInLevel} XP</span>
            {next && <span>{xpToNext - xpInLevel} XP para o próximo nível</span>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-bg-primary rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-accent-purple">{unlockedCount}</p>
            <p className="text-xs text-text-muted">Conquistas</p>
          </div>
          <div className="bg-bg-primary rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-accent-gold">{total_xp}</p>
            <p className="text-xs text-text-muted">XP Total</p>
          </div>
        </div>
      </div>

      {/* Badges grid */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
            <Trophy size={14} /> Badges ({unlockedCount}/{ALL_BADGES.length})
          </h2>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setBadgeFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  badgeFilter === cat ? 'bg-accent-purple text-white' : 'bg-bg-secondary border border-bg-border text-text-secondary hover:text-text-primary'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 lg:grid-cols-4 gap-3">
          {ALL_BADGES.filter(b => badgeFilter === 'Todos' || b.category === badgeFilter).map(badge => {
            const unlocked = unlockedKeys.has(badge.key)
            const achievement = achievements.find(a => a.key === badge.key)
            return (
              <div key={badge.key}
                className={`rounded-xl p-3 text-center border transition-all duration-200
                  ${unlocked
                    ? 'bg-bg-secondary border-accent-purple/40 shadow-lg shadow-purple-900/20'
                    : 'bg-bg-primary border-bg-border opacity-50 grayscale'
                  }`}
                title={badge.description}
              >
                <div className="text-3xl mb-1.5">{badge.icon}</div>
                <p className={`text-xs font-medium leading-tight ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>{badge.name}</p>
                {unlocked && achievement && (
                  <p className="text-xs text-text-muted mt-1">{format(new Date(achievement.unlocked_at.replace(' ', 'T') + 'Z'), 'dd/MM/yy')}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* XP History */}
      {profile.history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
            <Zap size={14} /> Histórico de XP
          </h2>
          <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
            {profile.history.slice(0, 20).map((h, i) => (
              <div key={h.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-bg-border/50' : ''}`}>
                <span className="text-accent-gold font-bold text-sm w-14 text-right shrink-0">+{h.amount}</span>
                <span className="text-text-secondary text-sm flex-1">{h.reason}</span>
                <span className="text-text-muted text-xs shrink-0">{format(new Date(h.created_at.replace(' ', 'T') + 'Z'), 'dd/MM HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
