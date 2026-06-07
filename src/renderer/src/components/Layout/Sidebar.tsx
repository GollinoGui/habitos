import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Dumbbell, ShieldOff, Target,
  Trophy, Settings, BookOpen, Moon, DollarSign, BookMarked, Calendar,
  ChevronLeft, ChevronRight
} from 'lucide-react'

const ALL_NAV_ITEMS = [
  { to: '/', id: 'nav-dashboard', icon: LayoutDashboard, label: 'Dashboard', key: 'dashboard', color: '#7c3aed' },
  { to: '/habits', id: 'nav-habits', icon: CheckSquare, label: 'Hábitos', key: 'habits', color: '#10b981' },
  { to: '/gym', id: 'nav-gym', icon: Dumbbell, label: 'Academia', key: 'gym', color: '#ef4444' },
  { to: '/addictions', id: 'nav-addictions', icon: ShieldOff, label: 'Vícios', key: 'addictions', color: '#3b82f6' },
  { to: '/goals', id: 'nav-goals', icon: Target, label: 'Metas', key: 'goals', color: '#f59e0b' },
  { to: '/achievements', id: 'nav-achievements', icon: Trophy, label: 'Conquistas', key: 'achievements', color: '#f59e0b' },
  { to: '/journal', id: 'nav-journal', icon: BookOpen, label: 'Diário', key: 'journal', color: '#8b5cf6' },
  { to: '/sleep', id: 'nav-sleep', icon: Moon, label: 'Sono', key: 'sleep', color: '#06b6d4' },
  { to: '/finance', id: 'nav-finance', icon: DollarSign, label: 'Finanças', key: 'finance', color: '#10b981' },
  { to: '/reading', id: 'nav-reading', icon: BookMarked, label: 'Mídia', key: 'reading', color: '#ec4899' },
  { to: '/calendar', id: 'nav-calendar', icon: Calendar, label: 'Calendário', key: 'calendar', color: '#0ea5e9' }
]

function getHiddenSections(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]') } catch { return [] }
}

function getCollapsed(): boolean {
  return localStorage.getItem('habitos_sidebar_collapsed') === '1'
}

export default function Sidebar(): React.JSX.Element {
  const [hidden, setHidden] = useState<string[]>(getHiddenSections)
  const [collapsed, setCollapsed] = useState(getCollapsed)

  useEffect(() => {
    function onSectionsChanged() {
      setHidden(getHiddenSections())
    }
    window.addEventListener('habitos_sections_changed', onSectionsChanged)
    return () => window.removeEventListener('habitos_sections_changed', onSectionsChanged)
  }, [])

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('habitos_sidebar_collapsed', next ? '1' : '0')
  }

  const visibleItems = ALL_NAV_ITEMS.filter(item => !hidden.includes(item.key))

  return (
    <aside className={`flex flex-col bg-bg-secondary border-r border-bg-border shrink-0 transition-all duration-200 ${collapsed ? 'w-14' : 'w-14 lg:w-56'}`}>
      <div className="h-8" />
      <div className={`flex items-center border-b border-bg-border ${collapsed ? 'justify-center px-0 py-5' : 'gap-3 px-4 py-5'}`}>
        <span className="text-2xl shrink-0">🏆</span>
        {!collapsed && <span className="hidden lg:block font-bold text-text-primary text-lg">Hábitos</span>}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {visibleItems.map(({ to, id, icon: Icon, label, color }, idx) => (
          <div key={to} className="relative group/nav">
            <NavLink
              to={to}
              id={id}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 animate-slide-in-left
                ${isActive
                  ? 'text-white shadow-lg'
                  : 'text-text-secondary hover:bg-bg-border hover:text-text-primary'
                }`
              }
              style={({ isActive }) => ({
                ...(isActive ? { backgroundColor: color, boxShadow: `0 4px 14px ${color}40` } : {}),
                animationDelay: `${idx * 45}ms`
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className="shrink-0" style={!isActive ? { color } : {}} />
                  {!collapsed && <span className="hidden lg:block text-sm font-medium">{label}</span>}
                </>
              )}
            </NavLink>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 bg-bg-secondary border border-bg-border rounded-lg text-xs font-medium text-text-primary whitespace-nowrap shadow-xl
                opacity-0 pointer-events-none translate-x-1
                group-hover/nav:opacity-100 group-hover/nav:translate-x-0
                transition-all duration-150 delay-300 z-50">
                {label}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="px-2 pb-2">
        <NavLink
          to="/settings"
          title={collapsed ? 'Configurações' : undefined}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150
            ${isActive
              ? 'bg-accent-purple text-white shadow-lg shadow-purple-900/30'
              : 'text-text-secondary hover:bg-bg-border hover:text-text-primary'
            }`
          }
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="hidden lg:block text-sm font-medium">Configurações</span>}
        </NavLink>

        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center gap-2 mt-1 px-3 py-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-border transition-colors"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span className="hidden lg:block text-xs">Recolher</span></>}
        </button>
      </div>
    </aside>
  )
}
