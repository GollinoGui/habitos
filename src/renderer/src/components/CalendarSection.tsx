import React, { useEffect, useState, useRef } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, X, StickyNote } from 'lucide-react'

interface CalendarEvent {
  id: number
  title: string
  date: string
  type: 'event' | 'task'
  color: string
  is_done: number
}

const EVENT_COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
const DOW_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function CalendarSection(): React.JSX.Element {
  const now = new Date()
  const todayStr = format(now, 'yyyy-MM-dd')

  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([])
  const [noteDates, setNoteDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayEvents, setDayEvents] = useState<CalendarEvent[]>([])
  const [note, setNote] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<'event' | 'task'>('event')
  const [newColor, setNewColor] = useState(EVENT_COLORS[0])
  const [showAddForm, setShowAddForm] = useState(false)
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function loadMonth() {
      const [evts, notes] = await Promise.all([
        window.api.calendar.eventsByMonth(year, month),
        window.api.calendar.notesByMonth(year, month)
      ])
      setAllEvents(evts as CalendarEvent[])
      setNoteDates(new Set((notes as { date: string }[]).map(n => n.date)))
    }
    loadMonth()
  }, [year, month])

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
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
          📅 Calendário
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-bg-border transition-colors text-text-muted hover:text-text-primary"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-text-primary capitalize w-44 text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-bg-border transition-colors text-text-muted hover:text-text-primary"
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
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} className="min-h-[64px]" />
              const m = String(month).padStart(2, '0')
              const d = String(day).padStart(2, '0')
              const dateStr = `${year}-${m}-${d}`
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const evts = allEvents.filter(e => e.date === dateStr)
              const hasNote = noteDates.has(dateStr)

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`relative flex flex-col items-center py-2 px-1 rounded-lg border transition-all duration-100 min-h-[64px]
                    ${isSelected
                      ? 'bg-accent-purple/20 border-accent-purple/60'
                      : isToday
                        ? 'border-accent-purple/30 bg-accent-purple/5'
                        : 'border-transparent hover:bg-bg-border/50'
                    }`}
                >
                  <span className={`text-sm leading-none mb-1.5 ${
                    isToday ? 'font-bold text-accent-purple' :
                    isSelected ? 'font-medium text-text-primary' :
                    'text-text-secondary'
                  }`}>
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 justify-center max-w-full px-0.5">
                    {evts.slice(0, 3).map(e => (
                      <div
                        key={e.id}
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: e.is_done ? '#6b7280' : e.color }}
                      />
                    ))}
                    {evts.length > 3 && (
                      <span className="text-[9px] text-text-muted leading-none">+{evts.length - 3}</span>
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
          <div className="flex items-center gap-4 mt-3 px-1">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-gold" />
              <span>tem observação</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-purple" />
              <span>evento / tarefa</span>
            </div>
          </div>
        </div>

        {/* Day detail panel — only rendered after clicking a day */}
        {selectedDate && (
          <div className="xl:w-72 shrink-0 border border-bg-border rounded-xl p-4 bg-bg-primary space-y-4 animate-fadeIn">
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
                    className={`flex items-center gap-2 p-2 rounded-lg border border-bg-border bg-bg-secondary transition-opacity ${evt.is_done ? 'opacity-55' : ''}`}
                  >
                    {evt.type === 'task' ? (
                      <button
                        onClick={() => toggleDone(evt.id)}
                        className="shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors"
                        style={{ borderColor: evt.color, backgroundColor: evt.is_done ? evt.color : 'transparent' }}
                      >
                        {!!evt.is_done && <span className="text-white text-[9px] leading-none">✓</span>}
                      </button>
                    ) : (
                      <div className="shrink-0 w-2 h-2 rounded-full mt-0.5" style={{ backgroundColor: evt.color }} />
                    )}
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
