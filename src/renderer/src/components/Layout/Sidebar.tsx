import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CheckSquare,
  Dumbbell,
  ShieldOff,
  Target,
  Trophy
} from 'lucide-react'

const navItems = [
  { to: '/', id: 'nav-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/habits', id: 'nav-habits', icon: CheckSquare, label: 'Hábitos' },
  { to: '/gym', id: 'nav-gym', icon: Dumbbell, label: 'Academia' },
  { to: '/addictions', id: 'nav-addictions', icon: ShieldOff, label: 'Vícios' },
  { to: '/goals', id: 'nav-goals', icon: Target, label: 'Metas' },
  { to: '/achievements', id: 'nav-achievements', icon: Trophy, label: 'Conquistas' }
]

export default function Sidebar(): React.JSX.Element {
  return (
    <aside className="w-16 lg:w-56 flex flex-col bg-bg-secondary border-r border-bg-border shrink-0">
      <div className="h-8" /> {/* titlebar space */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-bg-border">
        <span className="text-2xl">🏆</span>
        <span className="hidden lg:block font-bold text-text-primary text-lg">Hábitos</span>
      </div>
      <nav className="flex-1 py-4 space-y-1 px-2">
        {navItems.map(({ to, id, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            id={id}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group
              ${isActive
                ? 'bg-accent-purple text-white shadow-lg shadow-purple-900/30'
                : 'text-text-secondary hover:bg-bg-border hover:text-text-primary'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="hidden lg:block text-sm font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
