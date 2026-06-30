import React, { useEffect, useRef, useState } from 'react'
import { NotebookPen, ChevronDown, ChevronUp } from 'lucide-react'

interface SportNotesProps {
  sportKey: string
  color: string
}

export default function SportNotes({ sportKey, color }: SportNotesProps): React.JSX.Element | null {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true
    window.api?.settings?.get(`sport_notes_${sportKey}`).then(v => {
      if (!active) return
      const value = typeof v === 'string' ? v : ''
      setNotes(value)
      setLoaded(true)
      if (value.trim()) setOpen(true)
    })
    return () => { active = false }
  }, [sportKey])

  function handleChange(value: string) {
    setNotes(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      await window.api?.settings?.set(`sport_notes_${sportKey}`, value)
      setSaving(false)
    }, 600)
  }

  if (!loaded) return null

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-bg-border/20 transition-colors"
      >
        <NotebookPen size={14} style={{ color }} />
        <span className="text-sm font-semibold text-text-primary">Notas &amp; melhorias a serem feitas</span>
        {saving && <span className="text-[10px] text-text-muted ml-1">salvando…</span>}
        <span className="ml-auto text-text-muted">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <textarea
            value={notes}
            onChange={e => handleChange(e.target.value)}
            placeholder="Ex: melhorar saque flutuante, treinar bloqueio duplo…"
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-bg-primary border border-bg-border text-text-primary text-sm focus:outline-none resize-y placeholder:text-text-muted"
          />
        </div>
      )}
    </div>
  )
}
