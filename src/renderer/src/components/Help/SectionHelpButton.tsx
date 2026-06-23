import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SectionHelpButtonProps {
  sectionId: string
  title: string
  emoji?: string
  children: React.ReactNode
}

function storageKey(id: string): string {
  return `habitos_help_seen_${id}`
}

export default function SectionHelpButton({
  sectionId,
  title,
  emoji,
  children
}: SectionHelpButtonProps): React.JSX.Element {
  const [show, setShow] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    setIsNew(!localStorage.getItem(storageKey(sectionId)))
  }, [sectionId])

  function handleOpen(): void {
    setShow(true)
    if (isNew) {
      localStorage.setItem(storageKey(sectionId), '1')
      setIsNew(false)
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        title="Como usar esta seção"
        className={`flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold transition-colors shrink-0 ${
          isNew
            ? 'border-accent-purple text-accent-purple tutorial-glow'
            : 'border-bg-border text-text-muted hover:text-text-primary hover:border-text-muted'
        }`}
      >
        ?
      </button>

      {show && createPortal(
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4"
          onClick={() => setShow(false)}
        >
          <div
            className="bg-bg-secondary border border-bg-border rounded-2xl p-5 w-full max-w-md shadow-2xl animate-pop-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                {emoji && <span className="text-xl">{emoji}</span>}
                {title}
              </h2>
              <button onClick={() => setShow(false)}>
                <X size={18} className="text-text-muted" />
              </button>
            </div>
            <div className="text-sm text-text-secondary space-y-3">{children}</div>
            <button
              onClick={() => setShow(false)}
              className="w-full mt-5 py-2.5 bg-accent-purple hover:bg-purple-600 text-white rounded-xl font-semibold text-sm transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

export function GoodBadExample({ bad, good }: { bad: string; good: string }): React.JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2 bg-red-950/20 border border-accent-red/30 rounded-lg px-3 py-2">
        <span className="text-accent-red font-bold shrink-0">✕</span>
        <span className="text-text-secondary text-sm">{bad}</span>
      </div>
      <div className="flex items-start gap-2 bg-emerald-950/20 border border-accent-green/30 rounded-lg px-3 py-2">
        <span className="text-accent-green font-bold shrink-0">✓</span>
        <span className="text-text-secondary text-sm">{good}</span>
      </div>
    </div>
  )
}

export function HelpTips({ items }: { items: string[] }): React.JSX.Element {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
          <span className="text-accent-purple shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
