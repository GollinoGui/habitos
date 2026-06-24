import React from 'react'
import { Link } from 'react-router-dom'
import { Grid3X3, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function Games(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')

  const sudokuSaved = (() => {
    try { return JSON.parse(localStorage.getItem(`habitos_sudoku_${today}`) || '{}') } catch { return {} }
  })()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-purple/20 flex items-center justify-center">
          <span className="text-xl">🧩</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Jogos</h1>
          <p className="text-sm text-text-muted">1 jogo por dia para exercitar o cérebro</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          to="/games/sudoku"
          className="group bg-bg-secondary border border-bg-border rounded-xl p-5
            hover:border-accent-purple/40 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/15 flex items-center justify-center">
              <Grid3X3 size={22} className="text-accent-purple" />
            </div>
            {sudokuSaved.completed && (
              <div className="flex items-center gap-1 text-xs font-medium text-green-400">
                <CheckCircle size={13} />
                Concluído
              </div>
            )}
          </div>
          <h3 className="font-semibold text-text-primary mb-1 group-hover:text-accent-purple transition-colors">
            Sudoku
          </h3>
          <p className="text-sm text-text-muted">Puzzle lógico 9×9 — novo a cada dia</p>
          {sudokuSaved.timer && !sudokuSaved.completed && (
            <p className="text-xs text-text-muted mt-2">
              Em progresso · {String(Math.floor(sudokuSaved.timer / 60)).padStart(2, '0')}:{String(sudokuSaved.timer % 60).padStart(2, '0')}
            </p>
          )}
        </Link>
      </div>
    </div>
  )
}
