import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BookOpen, ChevronLeft, ChevronRight, Save, Trash2 } from 'lucide-react'

interface JournalEntry {
  id: number; date: string; content: string; mood: number; created_at: string
}

const MOODS = [
  { value: 1, emoji: '😞', label: 'Péssimo' },
  { value: 2, emoji: '😕', label: 'Ruim' },
  { value: 3, emoji: '😐', label: 'Neutro' },
  { value: 4, emoji: '😊', label: 'Bom' },
  { value: 5, emoji: '😄', label: 'Ótimo' }
]

export default function Journal(): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(3)
  const [saved, setSaved] = useState(false)
  const [recent, setRecent] = useState<JournalEntry[]>([])
  const [existingId, setExistingId] = useState<number | null>(null)

  useEffect(() => { loadRecent() }, [])
  useEffect(() => { loadEntry(selectedDate) }, [selectedDate])

  async function loadRecent() {
    const entries = await window.api.journal.recent(20)
    setRecent(entries as JournalEntry[])
  }

  async function loadEntry(date: string) {
    const entry = await window.api.journal.get(date) as JournalEntry | null
    if (entry) {
      setContent(entry.content || '')
      setMood(entry.mood || 3)
      setExistingId(entry.id)
    } else {
      setContent('')
      setMood(3)
      setExistingId(null)
    }
  }

  async function handleSave() {
    if (!content.trim()) return
    await window.api.journal.save({ date: selectedDate, content, mood })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    loadRecent()
    const entry = await window.api.journal.get(selectedDate) as JournalEntry | null
    if (entry) setExistingId(entry.id)
  }

  async function handleDelete() {
    if (!existingId) return
    await window.api.journal.delete(existingId)
    setContent('')
    setMood(3)
    setExistingId(null)
    loadRecent()
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDate + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(format(d, 'yyyy-MM-dd'))
  }

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-6">
      <div className="animate-slide-down">
        <h1 className="text-2xl font-bold text-text-primary">Diário</h1>
        <p className="text-text-secondary text-sm mt-1 animate-slide-in-left" style={{ animationDelay: '60ms' }}>Reflexões e anotações do dia</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Date nav */}
          <div className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: '120ms' }}>
            <button onClick={() => shiftDay(-1)} className="p-1.5 rounded-lg bg-bg-secondary border border-bg-border hover:bg-bg-border transition-colors">
              <ChevronLeft size={16} className="text-text-secondary" />
            </button>
            <div className="flex-1 text-center">
              <span className="font-semibold text-text-primary">
                {format(new Date(selectedDate + 'T12:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
              {isToday && <span className="ml-2 text-xs text-accent-purple font-medium">hoje</span>}
            </div>
            <button
              onClick={() => shiftDay(1)}
              disabled={isToday}
              className="p-1.5 rounded-lg bg-bg-secondary border border-bg-border hover:bg-bg-border transition-colors disabled:opacity-40"
            >
              <ChevronRight size={16} className="text-text-secondary" />
            </button>
          </div>

          {/* Mood */}
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '210ms' }}>
            <p className="text-sm font-medium text-text-secondary mb-3">Como você está se sentindo?</p>
            <div className="flex gap-1.5 justify-center flex-wrap">
              {MOODS.map((m, i) => (
                <button
                  key={m.value}
                  onClick={() => setMood(m.value)}
                  title={m.label}
                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg transition-all animate-pop-in ${
                    mood === m.value
                      ? 'bg-accent-purple/20 ring-2 ring-accent-purple scale-110'
                      : 'hover:bg-bg-border'
                  }`}
                  style={{ animationDelay: `${270 + i * 55}ms` }}
                >
                  <span className="text-2xl">{m.emoji}</span>
                  <span className="text-[10px] text-text-muted">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text area */}
          <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: '560ms' }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="O que aconteceu hoje? O que você está pensando e sentindo?..."
              rows={10}
              className="w-full bg-transparent text-text-primary text-sm resize-none focus:outline-none placeholder:text-text-muted leading-relaxed"
            />
          </div>

          <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '640ms' }}>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Save size={15} />
              {saved ? 'Salvo!' : 'Salvar entrada'}
            </button>
            {existingId && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-bg-border hover:bg-red-900/30 text-text-secondary hover:text-accent-red text-sm font-medium rounded-lg transition-colors"
              >
                <Trash2 size={15} />
                Excluir
              </button>
            )}
          </div>
        </div>

        {/* Recent entries */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2 animate-slide-in-left" style={{ animationDelay: '160ms' }}>
            <BookOpen size={14} /> Entradas recentes
          </h2>
          {recent.length === 0 && (
            <p className="text-text-muted text-sm animate-slide-up" style={{ animationDelay: '240ms' }}>Nenhuma entrada ainda.</p>
          )}
          {recent.map((entry, i) => {
            const m = MOODS.find(x => x.value === entry.mood)
            return (
              <button
                key={entry.id}
                onClick={() => setSelectedDate(entry.date)}
                className={`w-full text-left p-3 rounded-xl border transition-all animate-card-in ${
                  entry.date === selectedDate
                    ? 'border-accent-purple bg-accent-purple/10'
                    : 'border-bg-border bg-bg-secondary hover:border-bg-border/60'
                }`}
                style={{ animationDelay: `${220 + i * 60}ms` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-text-secondary">
                    {format(new Date(entry.date + 'T12:00:00'), "d 'de' MMM", { locale: ptBR })}
                  </span>
                  <span title={m?.label}>{m?.emoji}</span>
                </div>
                <p className="text-xs text-text-muted line-clamp-2">{entry.content}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
