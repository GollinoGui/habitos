import React, { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, StickyNote } from 'lucide-react'
import { isNativeCalendarAvailable, deleteDeviceEvent } from '../lib/nativeCalendarSync'

interface CalendarEvent {
  id: number
  title: string
  date: string
  type: 'event' | 'task'
  color: string
  is_done: number
  device_event_id?: string | null
}

interface HabitDot {
  color: string
  habit_id: number
}

interface HabitInfo {
  id: number
  name: string
  icon: string
  color: string
  is_active: number
}

const EVENT_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
const DOW_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function CalendarSection({ refreshKey, onHabitToggled }: { refreshKey?: number; onHabitToggled?: () => void }): React.JSX.Element {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [noteDates, setNoteDates] = useState<Set<string>>(new Set())
  const [habitDotsByDate, setHabitDotsByDate] = useState<Map<string, HabitDot[]>>(new Map())
  const [allHabits, setAllHabits] = useState<HabitInfo[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])
  const [note, setNote] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'event' | 'task'>('event')
  const [newColor, setNewColor] = useState(EVENT_COLORS[0])
  const [showAddForm, setShowAddForm] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const calSwipeRef = useRef<{ x: number; y: number } | null>(null)
  const detailRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.api.habits.list().then(h => {
      setAllHabits((h as HabitInfo[]).filter(x => x.is_active))
    })
  }, [])

  useEffect(() => {
    async function loadMonth() {
      const [evts, notes, habitComps] = await Promise.all([
        window.api.calendar.eventsByMonth(year, month),
        window.api.calendar.notesByMonth(year, month),
        window.api.habits.completionsByMonth(year, month)
      ])
      setAllEvents(evts as CalendarEvent[])
      setNoteDates(new Set((notes as { date: string }[]).map(n => n.date)))
      const map = new Map<string, HabitDot[]>()
      for (const c of habitComps as { completed_at: string; color: string; habit_id: number }[]) {
        const existing = map.get(c.completed_at) || []
        existing.push({ color: c.color, habit_id: c.habit_id })
        map.set(c.completed_at, existing)
      }
      setHabitDotsByDate(map)
    }
    loadMonth()
  }, [year, month, refreshKey])

  useEffect(() => {
    if (!selectedDate) {
      setDayEvents([])
      setNote('')
      return
    }
    setDayEvents(allEvents.filter(e => e.date === selectedDate))
    async function loadNote() {
      const n = await window.api.calendar.getNote(selectedDate)
      setNote((n as { content: string } | null)?.content || '')
    }
    loadNote()
    // On mobile (below xl breakpoint), scroll detail panel into view
    if (window.innerWidth < 1280) {
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [selectedDate, allEvents])

  useEffect(() => {
    return () => { if (noteTimer.current) clearTimeout(noteTimer.current) }
  }, [])

  function handleNoteChange(val: string) {
    setNote(val)
    if (noteTimer.current) clearTimeout(noteTimer.current)
    noteTimer.current = setTimeout(async () => {
      await window.api.calendar.saveNote(selectedDate, val)
      setNoteDates(prev => {
        const s = new Set(prev)
        if (val.trim()) s.add(selectedDate)
        else s.delete(selectedDate)
        return s
      })
    }, 600)
  }

  async function reloadEvents() {
    const evts = await window.api.calendar.eventsByMonth(year, month)
    setAllEvents(evts as CalendarEvent[])
  }

  async function reloadHabitDots() {
    const habitComps = await window.api.habits.completionsByMonth(year, month)
    const map = new Map<string, HabitDot[]>()
    for (const c of habitComps as { completed_at: string; color: string; habit_id: number }[]) {
      const existing = map.get(c.completed_at) || []
      existing.push({ color: c.color, habit_id: c.habit_id })
      map.set(c.completed_at, existing)
    }
    setHabitDotsByDate(map)
  }

  async function toggleHabitDate(habitId: number, dateStr: string) {
    const dots = habitDotsByDate.get(dateStr) || []
    const completed = dots.some(d => d.habit_id === habitId)
    if (completed) {
      await window.api.habits.uncomplete(habitId, dateStr)
    } else {
      await window.api.habits.complete(habitId, dateStr)
    }
    await reloadHabitDots()
    onHabitToggled?.()
  }

  async function addEvent() {
    if (!newTitle.trim()) return
    await window.api.calendar.createEvent({
      title: newTitle.trim(),
      date: selectedDate,
      type: newType,
      color: newColor
    })
    setNewTitle('')
    setShowAddForm(false)
    reloadEvents()
  }

  async function toggleDone(id: number) {
    await window.api.calendar.toggleDone(id)
    reloadEvents()
  }

  async function deleteEvent(id: number) {
    const evt = allEvents.find(e => e.id === id)
    if (evt?.device_event_id && isNativeCalendarAvailable()) {
      await deleteDeviceEvent(evt.device_event_id)
    }
    await window.api.calendar.deleteEvent(id)
    reloadEvents()
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  function onCalSwipeStart(e: React.TouchEvent) {
    calSwipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  function onCalSwipeEnd(e: React.TouchEvent) {
    if (!calSwipeRef.current) return
    const dx = e.changedTouches[0].clientX - calSwipeRef.current.x
    const dy = e.changedTouches[0].clientY - calSwipeRef.current.y
    calSwipeRef.current = null
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    if (dx > 0) prevMonth()
    else nextMonth()
  }

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR })
  const selectedLabel = selectedDate
    ? format(new Date(selectedDate + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })
    : ''

  return (
    <div
      className="bg-bg-secondary border border-bg-border rounded-xl p-3 sm:p-5 overflow-hidden"
      onTouchStart={onCalSwipeStart}
      onTouchEnd={onCalSwipeEnd}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          📅 Calendário
        </h2>
        <div className="flex items-center gap-1 min-w-0">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-bg-border transition-colors text-text-muted hover:text-text-primary shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary capitalize text-center flex-1 min-w-0 truncate px-1">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-bg-border transition-colors text-text-muted hover:text-text-primary shrink-0"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-5">
        {/* Calendar grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-7 mb-1">
            {DOW_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-text-muted py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="min-h-[48px]" />
              const m = String(month).padStart(2, '0')
              const d = String(day).padStart(2, '0')
              const dateStr = `${year}-${m}-${d}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const evts = allEvents.filter(e => e.date === dateStr)
              const hasNote = noteDates.has(dateStr)
              const habitDots = habitDotsByDate.get(dateStr) || []
              const allDots = [
                ...evts.map(e => ({ color: e.is_done ? '#10b981' : e.color, key: `e-${e.id}` })),
                ...habitDots.map(h => ({ color: h.color, key: `h-${h.habit_id}` }))
              ]

              const isPastOrToday = dateStr <= todayStr
              const allEvtsDone = evts.length > 0 && evts.every(e => e.is_done)
              const dayBorderClass = isPastOrToday && allEvtsDone
                ? isSelected
                  ? 'bg-accent-green/20 border-accent-green/60'
                  : 'border-accent-green/60 bg-accent-green/5 hover:bg-accent-green/10'
                : isPastOrToday && evts.length > 0
                  ? isSelected
                    ? 'bg-red-500/20 border-red-500/60'
                    : 'border-red-500/60 bg-red-500/5 hover:bg-red-500/10'
                  : isSelected
                    ? 'bg-accent-purple/20 border-accent-purple/60'
                    : isToday
                      ? 'border-accent-purple/30 bg-accent-purple/5'
                      : 'border-transparent hover:bg-bg-border/50'

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex flex-col items-center py-1 px-0.5 rounded-lg border transition-all duration-100 min-h-[42px] sm:min-h-[48px] ${dayBorderClass}`}
                >
                  <span className={`text-xs leading-none mb-1 ${
                    isToday ? 'font-bold text-accent-purple' :
                    isSelected ? 'font-medium text-text-primary' :
                    'text-text-secondary'
                  }`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center max-w-full px-0.5">
                    {allDots.slice(0, 4).map(dot => (
                      <div
                        key={dot.key}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: dot.color }}
                      />
                    ))}
                    {allDots.length > 4 && (
                      <span className="text-[9px] text-text-muted leading-none">+{allDots.length - 4}</span>
                    )}
                  </div>
                  {hasNote && (
                    <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-accent-gold" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
              <span>tem observação</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
              <span>evento / tarefa</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
              <span>hábito concluído</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-3 h-3 rounded border-2 border-accent-green/60" />
              <span>eventos concluídos</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-3 h-3 rounded border-2 border-red-500/60" />
              <span>eventos pendentes</span>
            </div>
          </div>
        </div>

        {/* Day detail panel — only rendered after clicking a day */}
        {selectedDate && (
          <div ref={detailRef} className="xl:w-72 shrink-0 border border-bg-border rounded-xl p-3 sm:p-4 bg-bg-primary space-y-4 animate-fadeIn">
            <h3 className="text-sm font-semibold text-text-primary capitalize">{selectedLabel}</h3>

            {/* Events & Tasks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Eventos & Tarefas</span>
                <button
                  onClick={() => setShowAddForm(f => !f)}
                  className="p-1 rounded hover:bg-bg-border text-text-muted hover:text-text-primary transition-colors"
                >
                  {showAddForm ? <X size={14} /> : <Plus size={14} />}
                </button>
              </div>

              {showAddForm && (
                <div className="mb-3 p-3 bg-bg-secondary rounded-lg border border-bg-border space-y-2">
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addEvent() }}
                    placeholder="Título..."
                    className="w-full bg-bg-primary border border-bg-border rounded px-2 py-1.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple"
                  />
                  <div className="flex gap-1.5">
                    {(['event', 'task'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setNewType(t)}
                        className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${
                          newType === t ? 'bg-accent-purple text-white' : 'bg-bg-border text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t === 'event' ? 'Evento' : 'Tarefa'}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    {EVENT_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setNewColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          newColor === c
                            ? 'scale-125 ring-2 ring-white/60 ring-offset-1 ring-offset-bg-secondary'
                            : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={addEvent}
                    disabled={!newTitle.trim()}
                    className="w-full py-1.5 rounded bg-accent-purple hover:bg-accent-purple/80 disabled:opacity-40 text-white text-xs font-medium transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              )}

              <div className="space-y-1.5">
                {dayEvents.length === 0 && !showAddForm && (
                  <p className="text-xs text-text-muted italic">Nenhum evento neste dia.</p>
                )}
                {dayEvents.map(evt => (
                  <div
                    key={evt.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${evt.is_done ? 'border-accent-green bg-emerald-950/30' : 'border-bg-border bg-bg-secondary'}`}
                  >
                    <button
                      onClick={() => toggleDone(evt.id)}
                      className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-colors"
                      style={{
                        border: `2px solid ${evt.color}`,
                        borderRadius: evt.type === 'task' ? '3px' : '50%',
                        backgroundColor: evt.is_done ? evt.color : 'transparent',
                      }}
                      title={evt.is_done ? 'Desmarcar' : 'Marcar como feito'}
                    >
                      {!!evt.is_done && <span className="text-white text-[9px] leading-none">✓</span>}
                    </button>
                    <span className={`flex-1 text-xs ${evt.is_done ? 'line-through text-text-muted' : 'text-text-primary'}`}>
                      {evt.title}
                    </span>
                    <button
                      onClick={() => deleteEvent(evt.id)}
                      className="shrink-0 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Habits */}
            {allHabits.length > 0 && (
              <div>
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Hábitos</span>
                <div className="space-y-1.5 mt-2">
                  {allHabits.map(habit => {
                    const dots = habitDotsByDate.get(selectedDate) || []
                    const completed = dots.some(d => d.habit_id === habit.id)
                    return (
                      <button
                        key={habit.id}
                        onClick={() => toggleHabitDate(habit.id, selectedDate)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                          completed
                            ? 'border-accent-green bg-emerald-950/30'
                            : 'border-bg-border bg-bg-secondary hover:bg-bg-border/30'
                        }`}
                      >
                        <div
                          className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                          style={{
                            border: `2px solid ${completed ? '#10b981' : '#4b5563'}`,
                            backgroundColor: completed ? '#10b981' : 'transparent',
                          }}
                        >
                          {completed && <span className="text-white text-[9px] leading-none">✓</span>}
                        </div>
                        <span className="text-base leading-none">{habit.icon}</span>
                        <span className="text-xs text-text-primary flex-1">{habit.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <StickyNote size={12} className="text-accent-gold" />
                <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Observações</span>
              </div>
              <textarea
                value={note}
                onChange={e => handleNoteChange(e.target.value)}
                placeholder="Escreva suas observações do dia..."
                rows={5}
                className="w-full bg-bg-secondary border border-bg-border rounded-lg px-3 py-2 text-xs text-text-primary placeholder:text-text-muted outline-none focus:border-accent-purple resize-none transition-colors"
              />
              {note.trim() && (
                <p className="text-[10px] text-text-muted mt-1">Salvo automaticamente</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
