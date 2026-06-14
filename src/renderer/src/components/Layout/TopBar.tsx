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
    <header
      className="bg-bg-secondary border-b border-bg-border shrink-0"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
    <div className="h-12 flex items-center px-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 min-w-0">
          <span className="text-xs font-semibold text-accent-gold flex items-center gap-0.5 shrink-0">
            <Star size={10} fill="currentColor" />
            Nv.{current.level}
          </span>
          <span className="text-xs text-text-muted shrink-0 hidden sm:inline">{current.rank}</span>
          <span className="text-xs text-text-secondary truncate">{name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap shrink-0">
            {pct}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-accent-gold font-bold text-sm shrink-0">
        <Zap size={13} fill="currentColor" />
        {total_xp}
      </div>
    </div>
    </header>
  )
}
