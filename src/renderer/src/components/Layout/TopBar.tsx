import React, { useEffect } from 'react'
import { Zap, Star } from 'lucide-react'
import { useProfileStore } from '../../store/profileStore'

export default function TopBar(): React.JSX.Element {
  const { profile, fetchProfile } = useProfileStore()

  useEffect(() => {
    fetchProfile()
  }, [])

  if (!profile) return <div className="h-12 bg-bg-secondary border-b border-bg-border" />

  const { levelInfo, total_xp, name } = profile
  const { current, next } = levelInfo
  const xpInLevel = total_xp - current.xp
  const xpToNext = next ? next.xp - current.xp : 1
  const pct = next ? Math.min(100, Math.round((xpInLevel / xpToNext) * 100)) : 100

  return (
    <header className="h-12 bg-bg-secondary border-b border-bg-border flex items-center px-4 gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-accent-gold flex items-center gap-1">
            <Star size={11} fill="currentColor" />
            Nv.{current.level} {current.rank}
          </span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-secondary">{name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden max-w-48">
            <div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {xpInLevel}/{next ? xpToNext : '∞'} XP
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-accent-gold font-bold text-sm">
        <Zap size={14} fill="currentColor" />
        {total_xp} XP
      </div>
    </header>
  )
}
