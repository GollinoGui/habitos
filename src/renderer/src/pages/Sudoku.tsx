import React, { useState, useEffect, useMemo } from 'react'
import { Timer, RotateCcw, Lightbulb, Trophy, Delete } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useProfileStore } from '../store/profileStore'

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

  const [timer, setTimer] = useState<number>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '{}').timer ?? 0 } catch { return 0 }
  })

  const [completed, setCompleted] = useState<boolean>(() => {
    try { return !!JSON.parse(localStorage.getItem(storageKey) || '{}').completed } catch { return false }
  })

  const [selected, setSelected] = useState<[number, number] | null>(null)
  const [hintCount, setHintCount] = useState(0)
  const [xpGranted, setXpGranted] = useState(false)
  const { grantXP } = useProfileStore()

  useEffect(() => {
    if (completed && !xpGranted) {
      grantXP(50, 'Sudoku diário concluído')
      setXpGranted(true)
    }
  }, [completed])

  useEffect(() => {
    if (completed) return
    const id = setInterval(() => setTimer(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [completed])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ board, timer, completed }))
  }, [board, timer, completed, storageKey])

  const conflicts = useMemo(() => getConflicts(board), [board])

  function inputCell(r: number, c: number, val: number | null) {
    if (completed || initialPuzzle[r][c] !== null) return
    const next = board.map(row => [...row])
    next[r][c] = val
    setBoard(next)
    if (val !== null && next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) {
      setCompleted(true)
    }
  }

  function handleHint() {
    if (!selected || completed) return
    const [r, c] = selected
    if (initialPuzzle[r][c] !== null || board[r][c] === solution[r][c]) return
    const next = board.map(row => [...row])
    next[r][c] = solution[r][c]
    setBoard(next)
    setHintCount(h => h + 1)
    if (next.every((row, ri) => row.every((v, ci) => v === solution[ri][ci]))) setCompleted(true)
  }

  function handleReset() {
    setBoard(initialPuzzle.map(row => [...row]))
    setTimer(0)
    setCompleted(false)
    setSelected(null)
    setHintCount(0)
    localStorage.removeItem(storageKey)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selected || completed) return
      const [r, c] = selected
      if (e.key === 'ArrowUp')    { e.preventDefault(); if (r > 0) setSelected([r - 1, c]); return }
      if (e.key === 'ArrowDown')  { e.preventDefault(); if (r < 8) setSelected([r + 1, c]); return }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); if (c > 0) setSelected([r, c - 1]); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); if (c < 8) setSelected([r, c + 1]); return }
      if (e.key >= '1' && e.key <= '9') { inputCell(r, c, parseInt(e.key)); return }
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') inputCell(r, c, null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, completed, board, initialPuzzle, solution])

  const selectedVal = selected ? board[selected[0]][selected[1]] : null
  const selBox = selected ? [Math.floor(selected[0] / 3), Math.floor(selected[1] / 3)] as const : null

  function cellBg(r: number, c: number): string {
    const isSel = selected?.[0] === r && selected?.[1] === c
    const val = board[r][c]
    const sameNum = selectedVal !== null && val === selectedVal && !isSel
    const related = selected !== null && (
      selected[0] === r ||
      selected[1] === c ||
      (selBox !== null && Math.floor(r / 3) === selBox[0] && Math.floor(c / 3) === selBox[1])
    )
    if (isSel) return 'bg-accent-purple/25'
    if (sameNum) return 'bg-accent-purple/12'
    if (related) return 'bg-bg-border/40'
    return 'hover:bg-bg-border/30'
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

  return (
    <div className="flex flex-col items-center gap-5 max-w-md mx-auto">
      {/* Header */}
      <div className="w-full flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center shrink-0">
          <span className="text-xl">🧩</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-text-primary">Sudoku do Dia</h1>
          <p className="text-xs text-text-muted capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-1.5 bg-bg-secondary border border-bg-border rounded-lg px-3 py-1.5 shrink-0">
          <Timer size={13} className="text-text-muted" />
          <span className="text-sm font-mono font-medium text-text-primary">{formatTime(timer)}</span>
        </div>
      </div>

      {/* Completed banner */}
      {completed && (
        <div className="w-full flex items-center gap-3 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <Trophy size={20} className="text-green-400 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-400">Parabéns! Sudoku de hoje concluído!</p>
            <p className="text-xs text-text-muted mt-0.5">
              Tempo: {formatTime(timer)} · +50 XP
              {hintCount > 0 && ` · ${hintCount} dica${hintCount > 1 ? 's' : ''} usada${hintCount > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        className="bg-bg-secondary rounded-xl overflow-hidden shadow-xl w-full"
        style={{ border: THICK }}
      >
        <div className="grid grid-cols-9">
          {board.map((row, r) =>
            row.map((val, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => setSelected([r, c])}
                className={`flex items-center justify-center text-sm transition-colors select-none
                  ${cellBg(r, c)} ${cellText(r, c)}`}
                style={{
                  aspectRatio: '1',
                  borderRight:  c === 8 ? 'none' : (c + 1) % 3 === 0 ? THICK : THIN,
                  borderBottom: r === 8 ? 'none' : (r + 1) % 3 === 0 ? THICK : THIN,
                  borderLeft: 'none',
                  borderTop: 'none',
                  outline: isSel(r, c) ? '2px solid var(--accent-purple, #7c3aed)' : 'none',
                  outlineOffset: '-2px',
                  fontSize: 'clamp(12px, 3vw, 17px)',
                }}
              >
                {val ?? ''}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full space-y-3">
        {/* Number pad */}
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => selected && inputCell(selected[0], selected[1], n)}
              className="aspect-square flex items-center justify-center text-base font-semibold
                bg-bg-secondary border border-bg-border rounded-xl hover:bg-bg-border
                text-text-primary transition-colors active:scale-95 disabled:opacity-40"
              disabled={!selected || completed}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => selected && inputCell(selected[0], selected[1], null)}
            className="aspect-square flex items-center justify-center
              bg-bg-secondary border border-bg-border rounded-xl hover:bg-bg-border
              text-text-muted transition-colors active:scale-95 disabled:opacity-40"
            disabled={!selected || completed}
            title="Apagar"
          >
            <Delete size={16} />
          </button>
        </div>

        {/* Hint + Reset */}
        <div className="flex gap-2">
          <button
            onClick={handleHint}
            disabled={
              completed ||
              !selected ||
              (selected ? initialPuzzle[selected[0]][selected[1]] !== null : false) ||
              (selected ? board[selected[0]][selected[1]] === solution[selected[0]][selected[1]] : false)
            }
            className="flex-1 flex items-center justify-center gap-2 py-2.5
              bg-bg-secondary border border-bg-border rounded-xl text-sm
              text-text-secondary hover:text-text-primary hover:bg-bg-border
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lightbulb size={14} />
            Dica
          </button>
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 py-2.5
              bg-bg-secondary border border-bg-border rounded-xl text-sm
              text-text-secondary hover:text-text-primary hover:bg-bg-border transition-colors"
          >
            <RotateCcw size={14} />
            Reiniciar
          </button>
        </div>
      </div>

      {/* Instructions */}
      {!completed && (
        <p className="text-xs text-text-muted text-center">
          Clique numa célula e use o teclado numérico ou os botões acima · Setas para navegar
        </p>
      )}
    </div>
  )
}
