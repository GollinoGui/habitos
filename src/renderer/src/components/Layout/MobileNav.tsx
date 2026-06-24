import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CheckSquare, Moon, DollarSign,
  Dumbbell, ShieldOff, Target, Trophy, BookOpen, BookMarked,
  Calendar, BarChart2, Settings, Medal
} from 'lucide-react'

const ALL_NAV_ITEMS = [
  { to: '/',           key: 'dashboard',   icon: LayoutDashboard, label: 'Início',     color: '#7c3aed' },
  { to: '/habits',     key: 'habits',      icon: CheckSquare,     label: 'Hábitos',    color: '#10b981' },
  { to: '/sleep',      key: 'sleep',       icon: Moon,            label: 'Sono',       color: '#06b6d4' },
  { to: '/finance',    key: 'finance',     icon: DollarSign,      label: 'Finanças',   color: '#10b981' },
  { to: '/gym',        key: 'gym',         icon: Dumbbell,        label: 'Academia',   color: '#ef4444' },
  { to: '/addictions', key: 'addictions',  icon: ShieldOff,       label: 'Vícios',     color: '#3b82f6' },
  { to: '/goals',      key: 'goals',       icon: Target,          label: 'Metas',      color: '#f59e0b' },
  { to: '/journal',    key: 'journal',     icon: BookOpen,        label: 'Diário',     color: '#8b5cf6' },
  { to: '/reading',    key: 'reading',     icon: BookMarked,      label: 'Mídia',      color: '#ec4899' },
  { to: '/calendar',   key: 'calendar',    icon: Calendar,        label: 'Calendário', color: '#0ea5e9' },
  { to: '/analytics',  key: 'analytics',   icon: BarChart2,       label: 'Analytics',  color: '#a855f7' },
  { to: '/achievements',key: 'achievements',icon: Trophy,         label: 'Conquistas', color: '#f59e0b' },
  { to: '/sports',     key: 'sports',      icon: Medal,           label: 'Esportes',   color: '#f97316' },
  { to: '/settings',   key: 'settings',    icon: Settings,        label: 'Config.',    color: '#6b7280' },
]

function getHiddenSections(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]') } catch { return [] }
}

function getSectionOrder(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_section_order') || '[]') } catch { return [] }
}

function computeNavItems(): typeof ALL_NAV_ITEMS {
  const hidden = getHiddenSections()
  const order = getSectionOrder()
  const ordered = order.length
    ? [...ALL_NAV_ITEMS].sort((a, b) => {
        const ai = order.indexOf(a.key)
        const bi = order.indexOf(b.key)
        if (ai === -1) return 1
        if (bi === -1) return -1
        return ai - bi
      })
    : ALL_NAV_ITEMS
  return ordered.filter(item => !hidden.includes(item.key))
}

export function useNavItems(): typeof ALL_NAV_ITEMS {
  const [items, setItems] = useState(computeNavItems)
  useEffect(() => {
    function onChange(): void { setItems(computeNavItems()) }
    window.addEventListener('habitos_sections_changed', onChange)
    return () => window.removeEventListener('habitos_sections_changed', onChange)
  }, [])
  return items
}

export function navMod(n: number, total: number): number { return ((n % total) + total) % total }

const ITEM_WIDTH = 72 // px per slot
const OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const

export default function MobileNav(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const navItems = useNavItems()
  const total = navItems.length

  const activeIndex = (() => {
    const idx = navItems.findIndex(item =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
    )
    return idx === -1 ? 0 : idx
  })()

  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchRef = useRef<{ x: number; y: number; dirLocked: boolean } | null>(null)

  function onTouchStart(e: React.TouchEvent) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dirLocked: false }
    setDragging(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!touchRef.current) return
    const dx = e.touches[0].clientX - touchRef.current.x
    const dy = e.touches[0].clientY - touchRef.current.y

    if (!touchRef.current.dirLocked && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      touchRef.current.dirLocked = true
      if (Math.abs(dy) > Math.abs(dx)) {
        touchRef.current = null
        setDragging(false)
        setDragX(0)
        return
      }
    }

    if (touchRef.current?.dirLocked) setDragX(dx)
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    touchRef.current = null
    setDragging(false)
    setDragX(0)

    if (Math.abs(dx) < 40) return
    navigate(navItems[navMod(activeIndex + (dx < 0 ? 1 : -1), total)].to)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-bg-secondary border-t border-bg-border z-40 select-none safe-b"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative w-full h-20 flex items-center justify-center overflow-hidden">
        {/* Center highlight ring — active item sits 12px above nav center */}
        <div
          className="absolute rounded-2xl pointer-events-none"
          style={{
            width: `${ITEM_WIDTH}px`,
            height: '56px',
            backgroundColor: navItems[activeIndex].color + '22',
            border: `1.5px solid ${navItems[activeIndex].color}44`,
            left: '50%',
            top: 'calc(50% - 12px)',
            transform: 'translate(-50%, -50%)',
            transition: 'background-color 300ms ease, border-color 300ms ease',
          }}
        />

        {OFFSETS.map(offset => {
          const itemIndex = navMod(activeIndex + offset, total)
          const item = navItems[itemIndex]
          const Icon = item.icon

          const dragItems = dragX / ITEM_WIDTH
          const visualOffset = offset + dragItems
          const absVis = Math.abs(visualOffset)

          const scale = Math.max(0.52, 1 - absVis * 0.17)
          const translateY = Math.max(-12, -12 + absVis * 9)
          const opacity = Math.max(0, 1 - absVis * 0.33)
          const translateX = offset * ITEM_WIDTH + (dragging ? dragX : 0)

          const isActive = offset === 0

          return (
            <button
              key={offset}
              onClick={() => {
                if (Math.abs(dragX) > 5) return
                if (!isActive) navigate(item.to)
              }}
              className="absolute flex flex-col items-center gap-1 touch-none"
              style={{
                width: `${ITEM_WIDTH}px`,
                transform: `translateX(${translateX}px) translateY(${translateY}px) scale(${scale})`,
                opacity,
                transition: dragging ? 'none' : 'transform 320ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 320ms ease',
                willChange: 'transform, opacity',
              }}
            >
              <Icon
                size={isActive ? 22 : 18}
                style={{ color: isActive ? item.color : 'var(--text-muted)' }}
              />
              <span
                className="text-[9px] font-medium leading-none text-center w-full px-0.5 truncate"
                style={{ color: isActive ? item.color : 'var(--text-muted)' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
