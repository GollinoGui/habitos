import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Timer, RotateCcw, Lightbulb, Trophy, Delete, Pencil, Heart, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProfileStore } from '../store/profileStore'
import { cloudSave, cloudLoad } from '../lib/challengeCloud'

// ── Sudoku Engine ────────────────────────────────────────────────────────────

function seededRng(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s ^= s >>> 16
    s = s >>> 0
    return s / 0x100000000
  }
}

function dateToSeed(dateStr: string): number {
  return dateStr.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) >>> 0, 0)
}

function shuffleArr<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Valid base board: cell (r,c) = ((r*3 + floor(r/3) + c) % 9) + 1
const BASE: number[][] = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => ((r * 3 + Math.floor(r / 3) + c) % 9) + 1)
)

function generateDailyPuzzle(dateStr: string): {
  solution: number[][]
  puzzle: (number | null)[][]
} {
  const rng = seededRng(dateToSeed(dateStr))

  const numMap = shuffleArr([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)
  const rowPerms = [shuffleArr([0, 1, 2], rng), shuffleArr([0, 1, 2], rng), shuffleArr([0, 1, 2], rng)]
  const colPerms = [shuffleArr([0, 1, 2], rng), shuffleArr([0, 1, 2], rng), shuffleArr([0, 1, 2], rng)]
  const bandPerm = shuffleArr([0, 1, 2], rng)
  const stackPerm = shuffleArr([0, 1, 2], rng)

  const solution: number[][] = Array.from({ length: 9 }, (_, r) => {
    const band = Math.floor(r / 3)
    const srcBand = bandPerm[band]
    const srcRow = srcBand * 3 + rowPerms[srcBand][r % 3]
    return Array.from({ length: 9 }, (_, c) => {
      const stack = Math.floor(c / 3)
      const srcStack = stackPerm[stack]
      const srcCol = srcStack * 3 + colPerms[srcStack][c % 3]
      return numMap[BASE[srcRow][srcCol] - 1]
    })
  })

  const positions = shuffleArr(Array.from({ length: 81 }, (_, i) => i), rng)
  const puzzle: (number | null)[][] = solution.map(row => [...row] as (number | null)[])
  // Medium: remove 41 cells (40 clues remain)
  for (let i = 0; i < 41; i++) {
    puzzle[Math.floor(positions[i] / 9)][positions[i] % 9] = null
  }

  return { solution, puzzle }
}

function getConflicts(board: (number | null)[][]): Set<string> {
  const s = new Set<string>()
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c]
      if (!v) continue
      for (let i = 0; i < 9; i++) {
        if (i !== c && board[r][i] === v) { s.add(`${r},${c}`); s.add(`${r},${i}`) }
        if (i !== r && board[i][c] === v) { s.add(`${r},${c}`); s.add(`${i},${c}`) }
      }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          const rr = br + dr, cc = bc + dc
          if ((rr !== r || cc !== c) && board[rr][cc] === v) {
            s.add(`${r},${c}`); s.add(`${rr},${cc}`)
          }
        }
      }
    }
  }
  return s
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const MAX_HINTS = 3
const EMPTY_NOTES = (): number[][][] =>
  Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))

// ── Component ────────────────────────────────────────────────────────────────

export default function Sudoku(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const storageKey = `habitos_sudoku_${today}`

  const { solution, puzzle: initialPuzzle } = useMemo(() => generateDailyPuzzle(today), [today])

  const [board, setBoard] = useState<(number | null)[][]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (Array.isArray(saved.board)) return saved.board
    } catch { /* empty */ }
    return initialPuzzle
  })

  const [notes, setNotes] = useState<number[][][]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (Array.isArray(saved.notes)) return saved.notes
    } catch { /* empty */ }
    return EMPTY_NOTES()
  })

  const [timer, setTimer] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').timer ?? 0 } catch { return 0 }
  })

  const [completed, setCompleted] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem(storageKey) || '{}').completed } catch { return false }
  })

  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [hintCount, setHintCount] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').hintCount ?? 0 } catch { return 0 }
  })
  const [pencilMode, setPencilMode] = useState(false)
  const [lives, setLives] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').lives ?? 3 } catch { return 3 }
  })
  const [failed, setFailed] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem(storageKey) || '{}').failed } catch { return false }
  })
  const [errorFlash, setErrorFlash] = useState(false)
  const [xpGranted, setXpGranted] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem(storageKey) || '{}').xpGranted } catch { return false }
  })
  const { grantXP } = useProfileStore()

  useEffect(() => {
    if (completed && !xpGranted) {
      grantXP(15, 'Sudoku diário concluído')
      setXpGranted(true)
    }
  }, [completed, xpGranted])

  useEffect(() => {
    if (completed || failed) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [completed, failed])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ board, timer, completed, notes, hintCount, lives, failed, xpGranted }))
  }, [board, timer, completed, notes, hintCount, lives, failed, xpGranted, storageKey])

  // cloud sync: restore on mount if localStorage was empty (fresh install)
  const cloudLoaded = useRef(false)
  useEffect(() => {
    if (cloudLoaded.current || completed || failed) return
    const localRaw = localStorage.getItem(storageKey)
    if (localRaw && localRaw !== '{}') return // already have local data
    cloudLoaded.current = true
    cloudLoad(today, 'sudoku').then(cloud => {
      if (!cloud) return
      if (Array.isArray(cloud.board)) setBoard(cloud.board as (number | null)[][])
      if (cloud.completed) setCompleted(true)
      if (cloud.failed) setFailed(true)
      if (typeof cloud.lives === 'number') setLives(cloud.lives)
      if (typeof cloud.hintCount === 'number') setHintCount(cloud.hintCount)
      if (cloud.xpGranted) setXpGranted(true)
    })
  }, [])

  // cloud sync: save on board/completion changes (not on every timer tick)
  useEffect(() => {
    cloudSave(today, 'sudoku', { board, completed, notes, hintCount, lives, failed, xpGranted })
  }, [board, completed, failed, xpGranted])

  const conflicts = useMemo(() => getConflicts(board), [board])

  const filledCounts = useMemo(() => {
    const counts: Record<number, number> = {}
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c]) counts[board[r][c]!] = (counts[board[r][c]!] || 0) + 1
    return counts
  }, [board])

  function triggerError() {
    setErrorFlash(true)
    setTimeout(() => setErrorFlash(false), 500)
  }

  function inputCell(r: number, c: number, val: number | null) {
    if (completed || failed || initialPuzzle[r][c] !== null) return

    // Apagar é sempre permitido
    if (val === null) {
      const nextBoard = board.map(row => [...row])
      nextBoard[r][c] = null
      setBoard(nextBoard)
      return
    }

    // Número errado → perde vida
    if (val !== solution[r][c]) {
      triggerError()
      const newLives = lives - 1
      setLives(newLives)
      if (newLives <= 0) setFailed(true)
      return
    }

    // Número correto
    const nextBoard = board.map(row => [...row])
    nextBoard[r][c] = val
    const nextNotes = notes.map(row => row.map(cell => [...cell]))
    nextNotes[r][c] = []
    for (let i = 0; i < 9; i++) {
      nextNotes[r][i] = nextNotes[r][i].filter(n => n !== val)
      nextNotes[i][c] = nextNotes[i][c].filter(n => n !== val)
    }
    const br = Math.floor(r / 3) * 3
    const bc = Math.floor(c / 3) * 3
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++)
        nextNotes[br + dr][bc + dc] = nextNotes[br + dr][bc + dc].filter(n => n !== val)

    setBoard(nextBoard)
    setNotes(nextNotes)

    if (nextBoard.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) {
      setCompleted(true)
    }
  }

  function toggleNote(r: number, c: number, n: number) {
    if (completed || failed || initialPuzzle[r][c] !== null || board[r][c] !== null) return
    const next = notes.map(row => row.map(cell => [...cell]))
    const cell = next[r][c]
    const idx = cell.indexOf(n)
    if (idx === -1) {
      cell.push(n)
      cell.sort((a, b) => a - b)
    } else {
      cell.splice(idx, 1)
    }
    setNotes(next)
  }

  function handleHint() {
    if (!selected || completed || failed || hintCount >= MAX_HINTS) return
    const [r, c] = selected
    if (initialPuzzle[r][c] !== null || board[r][c] === solution[r][c]) return
    const nextBoard = board.map(row => [...row])
    nextBoard[r][c] = solution[r][c]
    const nextNotes = notes.map(row => row.map(cell => [...cell]))
    nextNotes[r][c] = []
    setBoard(nextBoard)
    setNotes(nextNotes)
    setHintCount(h => h + 1)
    if (nextBoard.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) setCompleted(true)
  }

  function handleReset() {
    setBoard(initialPuzzle.map(row => [...row]))
    setNotes(EMPTY_NOTES())
    setTimer(0)
    setCompleted(false)
    setFailed(false)
    setLives(3)
    setErrorFlash(false)
    setSelected(null)
    setHintCount(0)
    setPencilMode(false)
    localStorage.removeItem(storageKey)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selected || completed || failed) return
      const [r, c] = selected
      if (e.key === 'ArrowUp')    { e.preventDefault(); if (r > 0) setSelected([r - 1, c]); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); if (r < 8) setSelected([r + 1, c]); return }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); if (c > 0) setSelected([r, c - 1]); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (c < 8) setSelected([r, c + 1]); return }
      if (e.key >= '1' && e.key <= '9') {
        const n = parseInt(e.key)
        if (pencilMode) toggleNote(r, c, n)
        else if ((filledCounts[n] ?? 0) < 9) inputCell(r, c, n)
        return
      }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputCell(r, c, null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, completed, failed, board, notes, initialPuzzle, solution, pencilMode, lives, filledCounts])

  const selectedVal = selected ? board[selected[0]][selected[1]] : null
  const selBox = selected ? [Math.floor(selected[0] / 3), Math.floor(selected[1] / 3)] as const : null

  function cellBgStyle(r: number, c: number): React.CSSProperties {
    const isSel = selected?.[0] === r && selected?.[1] === c
    const val = board[r][c]
    const sameNum = selectedVal !== null && val === selectedVal && !isSel
    const inCross = !isSel && selected !== null && (selected[0] === r || selected[1] === c)
    const inBox = !isSel && !inCross && selBox !== null &&
      Math.floor(r / 3) === selBox[0] && Math.floor(c / 3) === selBox[1]
    const mix = (pct: number) => `color-mix(in srgb, var(--accent-purple) ${pct}%, transparent)`
    if (isSel)   return { backgroundColor: mix(30) }
    if (sameNum) return { backgroundColor: mix(42) }
    if (inCross) return { backgroundColor: mix(14) }
    if (inBox)   return { backgroundColor: mix(5) }
    return {}
  }

  function cellIsHighlighted(r: number, c: number): boolean {
    if (!selected) return false
    const [sr, sc] = selected
    if (sr === r && sc === c) return true
    const val = board[r][c]
    if (selectedVal !== null && val === selectedVal) return true
    if (sr === r || sc === c) return true
    if (selBox !== null && Math.floor(r / 3) === selBox[0] && Math.floor(c / 3) === selBox[1]) return true
    return false
  }

  function cellText(r: number, c: number): string {
    if (conflicts.has(`${r},${c}`)) return 'text-red-400 font-semibold'
    if (initialPuzzle[r][c] !== null) return 'text-text-primary font-bold'
    return 'text-accent-purple font-semibold'
  }

  const THIN  = '1px solid rgba(107,114,128,0.2)'
  const THICK = '2px solid rgba(107,114,128,0.55)'
  const isSel = (r: number, c: number) => selected?.[0] === r && selected?.[1] === c

  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })
  const hintsLeft = MAX_HINTS - hintCount

  return (
    <div className="flex flex-col items-center gap-2 max-w-md mx-auto">
      {/* Header */}
      <div className="w-full flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-accent-purple/20 flex items-center justify-center shrink-0">
          <span className="text-lg">🧩</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-text-primary">Sudoku do Dia</h1>
          <p className="text-xs text-text-muted capitalize">{dateLabel}</p>
        </div>
        {/* Vidas */}
        <div className={`flex items-center gap-0.5 ${errorFlash ? 'animate-wiggle' : ''}`}>
          {[1, 2, 3].map(i => (
            <Heart
              key={i}
              size={16}
              className={i <= lives ? 'text-red-400' : 'text-text-muted/25'}
              fill={i <= lives ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 bg-bg-secondary border border-bg-border rounded-lg px-3 py-1 shrink-0">
          <Timer size={12} className="text-text-muted" />
          <span className="text-sm font-mono font-medium text-text-primary">{formatTime(timer)}</span>
        </div>
      </div>

      {/* Completed banner */}
      {completed && (
        <div className="w-full flex items-center gap-3 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl">
          <Trophy size={16} className="text-green-400 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-green-400">Parabéns! Sudoku de hoje concluído!</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tempo: {formatTime(timer)} · +15 XP
              {hintCount > 0 && ` · ${hintCount} dica${hintCount > 1 ? 's' : ''} usada${hintCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* Failed banner */}
      {failed && (
        <div className="w-full flex items-center gap-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
          <X size={16} className="text-red-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-400">Desafio perdido! Você usou todas as vidas.</p>
            <p className="text-xs text-text-muted mt-0.5">Tente novamente amanhã com um novo puzzle.</p>
          </div>
          <button
            onClick={handleReset}
            className="shrink-0 flex items-center gap-1 px-2 py-1 border border-bg-border rounded-lg text-xs text-text-muted hover:text-text-primary hover:bg-bg-border transition-colors"
          >
            <RotateCcw size={11} />
            Reiniciar
          </button>
        </div>
      )}

      {/* Grid — width limited so grid + controls fit without scrolling */}
      <div
        className="bg-bg-secondary rounded-xl overflow-hidden shadow-xl transition-all"
        style={{
          border: errorFlash ? '2px solid rgba(239,68,68,0.7)' : THICK,
          width: 'min(100%, calc(100dvh - 290px))',
          aspectRatio: '1',
          margin: '0 auto',
          boxShadow: errorFlash ? '0 0 0 3px rgba(239,68,68,0.2)' : undefined,
        }}
      >
        <div className="grid grid-cols-9 h-full">
          {board.map((row, r) =>
            row.map((val, c) => {
              const cellNotes = notes[r][c]
              const showNotes = !val && cellNotes.length > 0

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => setSelected([r, c])}
                  className={`relative flex items-center justify-center text-sm transition-colors select-none
                    ${cellIsHighlighted(r, c) ? '' : 'hover:bg-white/5'} ${cellText(r, c)}`}
                  style={{
                    ...cellBgStyle(r, c),
                    aspectRatio: '1',
                    borderRight:  c === 8 ? 'none' : (c + 1) % 3 === 0 ? THICK : THIN,
                    borderBottom: r === 8 ? 'none' : (r + 1) % 3 === 0 ? THICK : THIN,
                    borderLeft: 'none',
                    borderTop: 'none',
                    outline: isSel(r, c) ? '2px solid var(--accent-purple, #7c3aed)' : 'none',
                    outlineOffset: '-2px',
                    fontSize: showNotes ? undefined : 'clamp(12px, 3vw, 17px)',
                  }}
                >
                  {showNotes ? (
                    <div
                      className="absolute inset-0 grid grid-cols-3"
                      style={{ padding: '5%' }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <span
                          key={n}
                          className="flex items-center justify-center text-text-muted leading-none"
                          style={{ fontSize: 'clamp(5px, 1.2vw, 8px)' }}
                        >
                          {cellNotes.includes(n) ? n : ''}
                        </span>
                      ))}
                    </div>
                  ) : (val ?? '')}
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full space-y-1.5">
        {/* Number pad */}
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
            const done = (filledCounts[n] ?? 0) >= 9
            return (
              <button
                key={n}
                onClick={() => {
                  if (!selected || completed || done) return
                  const [r, c] = selected
                  if (pencilMode) toggleNote(r, c, n)
                  else inputCell(r, c, n)
                }}
                className={`relative h-10 flex items-center justify-center text-base font-semibold
                  bg-bg-secondary border border-bg-border rounded-xl
                  transition-colors active:scale-95 overflow-hidden
                  ${done ? 'text-text-muted opacity-40 cursor-default' : 'text-text-primary hover:bg-bg-border disabled:opacity-40'}`}
                disabled={!selected || completed}
              >
                {n}
                {done && (
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(to bottom right, transparent calc(50% - 0.75px), var(--text-muted) calc(50% - 0.75px), var(--text-muted) calc(50% + 0.75px), transparent calc(50% + 0.75px))',
                    }}
                  />
                )}
              </button>
            )
          })}
          <button
            onClick={() => selected && inputCell(selected[0], selected[1], null)}
            className="h-10 flex items-center justify-center
              bg-bg-secondary border border-bg-border rounded-xl hover:bg-bg-border
              text-text-muted transition-colors active:scale-95 disabled:opacity-40"
            disabled={!selected || completed}
            title="Apagar"
          >
            <Delete size={16} />
          </button>
        </div>

        {/* Pencil + Hint + Reset */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setPencilMode(m => !m)}
            disabled={completed}
            className={`flex-1 flex items-center justify-center gap-2 py-2
              border rounded-xl text-sm transition-colors disabled:opacity-40
              ${pencilMode
                ? 'bg-accent-purple/20 border-accent-purple/40 text-accent-purple'
                : 'bg-bg-secondary border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-border'
              }`}
            title="Modo rascunho — anota candidatos sem confirmar o número"
          >
            <Pencil size={13} />
            Rascunho
          </button>

          <button
            onClick={handleHint}
            disabled={
              completed ||
              !selected ||
              hintCount >= MAX_HINTS ||
              (selected ? initialPuzzle[selected[0]][selected[1]] !== null : false) ||
              (selected ? board[selected[0]][selected[1]] === solution[selected[0]][selected[1]] : false)
            }
            className="flex-1 flex items-center justify-center gap-2 py-2
              bg-bg-secondary border border-bg-border rounded-xl text-sm
              text-text-secondary hover:text-text-primary hover:bg-bg-border
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lightbulb size={13} />
            Dica ({hintsLeft})
          </button>

          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-4 py-2
              bg-bg-secondary border border-bg-border rounded-xl text-sm
              text-text-secondary hover:text-text-primary hover:bg-bg-border transition-colors"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Instructions */}
      {!completed && pencilMode && (
        <p className="text-xs text-text-muted text-center">
          ✏️ Modo rascunho ativo — os números são anotações, não respostas
        </p>
      )}
    </div>
  )
}
