import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Moon, DollarSign, Menu, X,
  Dumbbell, ShieldOff, Target, Trophy, BookOpen, BookMarked,
  Calendar, BarChart2, Settings
} from 'lucide-react'

const MAIN_NAV = [
  { to: '/',        icon: LayoutDashboard, label: 'Início',   color: '#7c3aed' },
  { to: '/habits',  icon: CheckSquare,     label: 'Hábitos',  color: '#10b981' },
  { to: '/sleep',   icon: Moon,            label: 'Sono',     color: '#06b6d4' },
  { to: '/finance', icon: DollarSign,      label: 'Finanças', color: '#10b981' },
]

const MORE_NAV = [
  { to: '/gym',          icon: Dumbbell,    label: 'Academia',   color: '#ef4444' },
  { to: '/addictions',   icon: ShieldOff,   label: 'Vícios',     color: '#3b82f6' },
  { to: '/goals',        icon: Target,      label: 'Metas',      color: '#f59e0b' },
  { to: '/achievements', icon: Trophy,      label: 'Conquistas', color: '#f59e0b' },
  { to: '/journal',      icon: BookOpen,    label: 'Diário',     color: '#8b5cf6' },
  { to: '/reading',      icon: BookMarked,  label: 'Mídia',      color: '#ec4899' },
  { to: '/calendar',     icon: Calendar,    label: 'Calendário', color: '#0ea5e9' },
  { to: '/analytics',    icon: BarChart2,   label: 'Analytics',  color: '#a855f7' },
  { to: '/settings',     icon: Settings,    label: 'Config.',    color: '#6b7280' },
]

export default function MobileNav(): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-bg-secondary border-t border-bg-border flex items-stretch z-40 safe-b">
        {MAIN_NAV.map(({ to, icon: Icon, label, color }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${isActive ? 'text-accent-purple' : 'text-text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} style={{ color: isActive ? '#7c3aed' : color }} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-text-muted"
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-bg-border rounded-t-2xl z-50">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="font-semibold text-text-primary">Menu</span>
              <button onClick={() => setOpen(false)} className="text-text-muted p-1">
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 p-4 pb-8">
              {MORE_NAV.map(({ to, icon: Icon, label, color }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setOpen(false) }}
                  className="flex flex-col items-center gap-2 p-3 bg-bg-primary rounded-xl active:opacity-70"
                >
                  <Icon size={22} style={{ color }} />
                  <span className="text-xs text-text-secondary">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
