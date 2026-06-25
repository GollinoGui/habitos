import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { RotateCcw, Share2 } from 'lucide-react'
import { useProfileStore } from '../store/profileStore'

// ── Word list ────────────────────────────────────────────────────────────────
// 5-letter Portuguese words, uppercase, no accents required for mechanics
const WORDS = [
  'ABRIR','ACASO','ADEUS','AGORA','AINDA','AJUDA','ALUNO','AMIGO','ANDAR','ANTES',
  'ARMAR','ARTES','ASSAR','ASSIM','BANCO','BARCO','BEBER','BOLSO','BRASA','BRAVO',
  'BURRO','CALMA','CAMPO','CARNE','CARRO','CARTA','CERTO','CHAVE','CHORO','CLARO',
  'COBRA','CORPO','CREME','CRIME','CRUEL','DENTE','DIZER','DRAMA','DROGA','DUPLA',
  'DUROS','ERRAR','FALAR','FALTA','FARDO','FAZER','FEBRE','FEITO','FELIZ','FILHO',
  'FILME','FIRME','FLOCO','FOLHA','FORMA','FORTE','FRACO','FREIO','FRUTA','FUNDO',
  'GALHO','GARRA','GASTO','GENES','GENTE','GIRAR','GLOBO','GOLPE','GORDO','GOSTO',
  'GRADE','GRAMA','GRIPE','GRUPO','HUMOR','IDEIA','JEITO','JOGAR','JUNTO','JUSTO',
  'LAPSO','LARGO','LASER','LEITE','LENHA','LETRA','LEVAR','LIVRE','LIVRO','LUGAR',
  'MADRE','MAGRO','MANGA','MARCA','MASSA','METRO','MILHO','MINHA','MISTO','MOLDE',
  'MUNDO','MUSGO','NARIZ','NEGRA','NEGRO','NERVO','NOITE','NORMA','OBRAS','OLHAR',
  'ORDEM','OUTRO','OUVIR','PADRE','PAPEL','PANDA','PASTA','PEGAR','PENAS','PERDA',
  'PIANO','PLANO','POLVO','POMBO','PORTA','PORTO','PRATA','PRAZO','PRECE','PRETO',
  'PRIMO','PROVA','PULSO','PUXAR','QUASE','QUEDA','QUERO','RACHA','RADIO','RAIVA',
  'RAPAZ','RASGO','RAZAO','RENDA','REPOR','RESTO','REZAR','RISCO','ROLHA','ROMBO',
  'RONCO','ROSNA','ROUPA','SACOS','SAGAS','SAMBA','SENHA','SERVO','SOBRE','SOLDO',
  'SOLTO','SOMAR','SORTE','SUBIR','SULCO','SUMIR','SURDO','SURTO','TALCO','TAMPO',
  'TANTO','TARDE','TECLA','TEMPO','TENDO','TERMO','TERRA','TOLDO','TOMAR','TORNO',
  'TORTA','TRAGO','TRAMA','TRENS','TRIBO','TRIGO','TRONO','TURCO','TURBO','VALOR',
  'VALER','VERDE','VERSO','VESTE','VIOLA','VIRAR','VOLTA','VULTO','ZEBRA','ZEROS',
  'ABALO','ABATE','ACENO','ACIMA','ACNES','ACODE','ACUSA','ADIAR','ADORO','AFETO',
  'AGACO','AGITO','AGORA','AGUDA','AGUDO','AJUDA','ALCES','ALCOL','ALDEA','ALEIA',
  'ALETA','ALGAS','ALGOZ','ALIAR','ALMAS','ALOES','ALTOS','AMARA','AMBAS','AMENO',
  'AMORA','AMPLO','ANCAS','ANIMO','ANOSA','ANOTE','ANSIA','APELO','APITO','APNEA',
  'APOIO','ARAME','ARARA','ARDER','AREIA','AROMA','AROTE','ARQUE','ARRAS','ARRIA',
  'ARROZ','ATLAS','ATRAS','ATRIZ','ATUAR','AUDIO','AUTAR','AVARO','AVISO','AVOAR',
  'BAIXO','BALAS','BALSA','BAMBU','BANCA','BANDA','BANHO','BAQUE','BARCA','BARDO',
  'BARRA','BEIJO','BELAS','BELAS','BERCO','BESTA','BEZER','BICHO','BICOS','BILHA',
  'BISAO','BOCAS','BOLAR','BOLAR','BOLHA','BOLOR','BONCO','BONUS','BORDO','BOSCO',
  'BOTAS','BOXEA','BRACO','BRASA','BREVE','BROCA','BRUMA','BRUTA','BURCA','BUSCA',
  'CACHO','CACOS','CADEA','CAIMA','CAIRU','CALCE','CALCO','CALDO','CAMPE','CANOS',
  'CAOBA','CAPIM','CAPUZ','CASCA','CASOS','CAVAR','CENAS','CERCA','CERCO','CERTA',
  'CESTA','CHAPA','CHUVA','CIMAR','CINCO','CINZA','CITAR','CLIPE','CLONE','COCOA',
  'COCHO','CODEX','COGUL','COICE','COISA','COITO','COLAR','COLMO','COLOS','COMEM',
  'CONDE','CONGA','CONGE','CONTO','COPOS','COROA','COSER','COSMO','COURO','COUVE',
  'CRISE','CRIVO','CROPS','CRUZA','CUECA','CULPA','CURAR','CURSA','CURTA','CURTO',
  // expanded word list
  'RURAL','FINAL','GERAL','LEGAL','LOCAL','MORAL','NATAL','NAVAL','RIVAL','TOTAL',
  'VITAL','VOCAL','CIVIL','IGUAL','METAL','SINAL','CANAL','CORAL','IDEAL','PENAL',
  'VIRIL','ABRIL','VAPOR','VELHO','COMER','MATAR','MUDAR','PODER','SABER','SECAR',
  'TEMER','TIRAR','VOTAR','LUNAR','SOLAR','BANAL','JURAR','LIGAR','NEGAR','PAGAR',
  'TOCAR','FERIR','SUJAR','ZELAR','BOTAR','CORAR','FUMAR','LAVAR','MEDIR','OPTAR',
  'VELAR','MONTE','RAMAL','VIGOR','MURAL','HIATO','INATO','VAGAR','ZUMBI','PULAR',
  'OBTER','TECER','SELAR','REGER','METER','DITAR','ASILO','JULHO','JUNHO','HEROI',
  'QUILO','OSSOS','ZERAR','VEDAR','RALAR','GERIR','DOTAR','PARIR','VARAR','GELAR',
  'PRAIA','MACHO','TOURO','BROTO','LESMA','MIOLO','NOVEL','TREVO','USINA','NOBRE',
  'LOUCO','CRIAR','NOTAR','FREAR','COZER','ALTAR','RAMOS','CABRA','CAPAZ','GABAR',
  'SALAO','PLENA','FLUXO','VEZES','PATIO','GUETO','CAULE','TOPAR','RODAR','REGAR',
  'JAZER','OBESO','PAJEM','VAGAO','CRAVO','CERVO','FEROZ','TURVO','FATOR','BURLA',
  'CASCO','DIQUE','GOLFO','ICONE','JOIAS','LACOS','LAVOR','OSTRA','PALCO','SAGAZ',
  'VALSA','ADEGA','CETRO','ETNIA','FOGAO','CURVA','LARVA','MANIA','PLUMA','SABRE',
  'TOTEM','VELOZ','BLOCO','MALHA','TORSO','JORRO','LOUSA','GREVE','TURMA','PILAR',
]

// ── Engine ───────────────────────────────────────────────────────────────────

function dateToSeed(s: string): number {
  return s.split('').reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) >>> 0, 0)
}

function seededRng(seed: number): () => number {
  let s = (seed ^ 0xdeadbeef) >>> 0
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b)
    s ^= s >>> 16
    return (s >>> 0) / 0x100000000
  }
}

function getDailyWord(dateStr: string): string {
  const rng = seededRng(dateToSeed(dateStr))
  const idx = Math.floor(rng() * WORDS.length)
  return WORDS[idx]
}

type LetterState = 'correct' | 'present' | 'absent' | 'empty' | 'tbd'

interface GuessResult { letter: string; state: LetterState }

function evaluateGuess(guess: string, answer: string): GuessResult[] {
  const result: GuessResult[] = Array.from({ length: 5 }, (_, i) => ({ letter: guess[i], state: 'absent' }))
  const answerArr = answer.split('')
  const used = Array(5).fill(false)

  // Pass 1: mark correct
  for (let i = 0; i < 5; i++) {
    if (guess[i] === answer[i]) {
      result[i].state = 'correct'
      used[i] = true
    }
  }
  // Pass 2: mark present
  for (let i = 0; i < 5; i++) {
    if (result[i].state === 'correct') continue
    const j = answerArr.findIndex((c, k) => !used[k] && c === guess[i])
    if (j !== -1) { result[i].state = 'present'; used[j] = true }
  }
  return result
}

// ── Colors ───────────────────────────────────────────────────────────────────

const STATE_BG: Record<LetterState, string> = {
  correct: '#16a34a',
  present: '#ca8a04',
  absent:  '#374151',
  empty:   'transparent',
  tbd:     'transparent',
}

const STATE_BORDER: Record<LetterState, string> = {
  correct: '#16a34a',
  present: '#ca8a04',
  absent:  '#374151',
  empty:   'rgba(107,114,128,0.3)',
  tbd:     '#7c3aed',
}

// ── Keyboard ─────────────────────────────────────────────────────────────────

const ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['ENTER','Z','X','C','V','B','N','M','⌫'],
]

// ── Storage ──────────────────────────────────────────────────────────────────

interface SavedState {
  guesses: string[]
  results: GuessResult[][]
  status: 'playing' | 'won' | 'lost'
  attempts?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function WordleGame(): React.JSX.Element {
  const today = format(new Date(), 'yyyy-MM-dd')
  const storageKey = `habitos_wordle_${today}`
  const answer = useMemo(() => getDailyWord(today), [today])
  const { grantXP } = useProfileStore()
  const dateLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })

  const loadState = (): SavedState => {
    try {
      const s = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<SavedState>
      if (s.guesses && s.results && s.status) return s as SavedState
    } catch { /* empty */ }
    return { guesses: [], results: [], status: 'playing' }
  }

  const [state, setState] = useState<SavedState>(loadState)
  const [current, setCurrent] = useState('')
  const [shake, setShake] = useState(false)
  const [reveal, setReveal] = useState<number | null>(null)
  const [xpGranted, setXpGranted] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // persist
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(state))
  }, [state, storageKey])

  useEffect(() => {
    if (!errorMsg) return
    const t = setTimeout(() => setErrorMsg(''), 1800)
    return () => clearTimeout(t)
  }, [errorMsg])

  // XP on completion (once)
  useEffect(() => {
    if (xpGranted) return
    if (state.status === 'won') {
      grantXP(20, 'Palavra do Dia concluída')
      setXpGranted(true)
    } else if (state.status === 'lost') {
      grantXP(5, 'Palavra do Dia tentada')
      setXpGranted(true)
    }
  }, [state.status])

  // Letter key states derived from all guesses
  const letterStates = useMemo(() => {
    const map: Record<string, LetterState> = {}
    const priority: LetterState[] = ['correct', 'present', 'absent']
    state.results.flat().forEach(({ letter, state: ls }) => {
      const cur = map[letter]
      if (!cur || priority.indexOf(ls) < priority.indexOf(cur)) map[letter] = ls
    })
    return map
  }, [state.results])

  const isOver = state.status !== 'playing'

  const submitGuess = useCallback(() => {
    if (isOver) return
    if (current.length !== 5) { setErrorMsg('Digite 5 letras'); return }
    if (!WORDS.includes(current)) {
      setShake(true)
      setErrorMsg('Palavra não encontrada na lista')
      setTimeout(() => setShake(false), 600)
      return
    }

    const results = evaluateGuess(current, answer)
    const newGuesses = [...state.guesses, current]
    const newResults = [...state.results, results]
    const won = results.every(r => r.state === 'correct')
    const lost = !won && newGuesses.length >= 6

    const next: SavedState = {
      guesses: newGuesses,
      results: newResults,
      status: won ? 'won' : lost ? 'lost' : 'playing',
      attempts: won ? newGuesses.length : undefined,
    }

    setReveal(newGuesses.length - 1)
    setState(next)
    setCurrent('')
    setTimeout(() => setReveal(null), 600)
  }, [current, state, answer, isOver])

  const handleKey = useCallback((key: string) => {
    if (isOver) return
    if (key === 'ENTER' || key === 'Enter') { submitGuess(); return }
    if (key === '⌫' || key === 'Backspace') { setCurrent(c => c.slice(0, -1)); return }
    if (/^[A-Z]$/.test(key) && current.length < 5) setCurrent(c => c + key)
  }, [isOver, submitGuess, current])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Backspace') { handleKey('⌫'); return }
      if (e.key === 'Enter') { handleKey('ENTER'); return }
      handleKey(e.key.toUpperCase())
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleKey])

  // Build 6-row grid
  const rows: { letters: string[]; results: GuessResult[] | null; isActive: boolean }[] = []
  for (let r = 0; r < 6; r++) {
    if (r < state.guesses.length) {
      rows.push({ letters: state.guesses[r].split(''), results: state.results[r], isActive: false })
    } else if (r === state.guesses.length && !isOver) {
      const letters = current.split('')
      while (letters.length < 5) letters.push('')
      rows.push({ letters, results: null, isActive: true })
    } else {
      rows.push({ letters: ['', '', '', '', ''], results: null, isActive: false })
    }
  }

  function shareResult() {
    const emoji = state.results.map(row =>
      row.map(r => r.state === 'correct' ? '🟩' : r.state === 'present' ? '🟨' : '⬛').join('')
    ).join('\n')
    const text = `Palavra do Dia — ${format(new Date(), 'dd/MM')}\n${state.status === 'won' ? state.attempts : 'X'}/6\n\n${emoji}`
    navigator.clipboard.writeText(text).catch(() => { /* empty */ })
  }

  return (
    <div className="flex flex-col items-center gap-5 max-w-sm mx-auto">
      {/* Header */}
      <div className="w-full flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
          <span className="text-xl">🔤</span>
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">Palavra do Dia</h1>
          <p className="text-xs text-text-muted capitalize">{dateLabel}</p>
        </div>
      </div>

      {/* Result banner */}
      {state.status === 'won' && (
        <div className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-green-400">
              Parabéns! Em {state.attempts} tentativa{state.attempts !== 1 ? 's' : ''}!
            </p>
            <p className="text-xs text-text-muted mt-0.5">+20 XP</p>
          </div>
          <button onClick={shareResult} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 rounded-lg text-xs text-green-400 hover:bg-green-500/30 transition-colors">
            <Share2 size={12} /> Compartilhar
          </button>
        </div>
      )}
      {state.status === 'lost' && (
        <div className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div>
            <p className="text-sm font-semibold text-red-400">A palavra era: <span className="tracking-widest">{answer}</span></p>
            <p className="text-xs text-text-muted mt-0.5">+5 XP por tentar</p>
          </div>
          <button onClick={shareResult} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 rounded-lg text-xs text-red-400 hover:bg-red-500/30 transition-colors">
            <Share2 size={12} /> Compartilhar
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="w-full px-4 py-2 bg-red-500/15 border border-red-500/30 rounded-xl text-sm text-red-400 text-center font-medium">
          {errorMsg}
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-1.5" style={{ gridTemplateRows: 'repeat(6, 1fr)' }}>
        {rows.map((row, r) => (
          <div
            key={r}
            className={`flex gap-1.5 ${shake && row.isActive ? 'animate-shake' : ''}`}
          >
            {row.letters.map((letter, c) => {
              const state_: LetterState = row.results
                ? row.results[c].state
                : letter ? 'tbd' : 'empty'
              const isRevealing = reveal === r

              return (
                <div
                  key={c}
                  className="w-14 h-14 flex items-center justify-center text-xl font-bold rounded-lg border-2 select-none transition-all"
                  style={{
                    backgroundColor: STATE_BG[state_],
                    borderColor: STATE_BORDER[state_],
                    color: state_ === 'empty' || state_ === 'tbd' ? 'var(--text-primary)' : 'white',
                    transitionDelay: isRevealing ? `${c * 80}ms` : '0ms',
                    transform: isRevealing ? 'rotateX(180deg)' : 'none',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  {letter}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Keyboard */}
      <div className="w-full space-y-1.5">
        {ROWS.map((row, ri) => (
          <div key={ri} className="flex justify-center gap-1">
            {row.map(key => {
              const ls = letterStates[key]
              const isSpecial = key === 'ENTER' || key === '⌫'
              return (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className="flex items-center justify-center rounded-lg text-xs font-bold transition-colors active:scale-95 select-none"
                  style={{
                    width: isSpecial ? 56 : 32,
                    height: 44,
                    backgroundColor: ls ? STATE_BG[ls] : 'var(--bg-border)',
                    color: ls ? 'white' : 'var(--text-primary)',
                    border: 'none',
                  }}
                >
                  {key}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Hint */}
      {!isOver && (
        <p className="text-xs text-text-muted text-center">
          🟩 Certa · 🟨 Presente · ⬛ Ausente &nbsp;·&nbsp; {state.guesses.length}/6 tentativas
        </p>
      )}

      {isOver && (
        <button
          onClick={() => {
            /* next day only — no replay, this is intentional */
          }}
          className="flex items-center gap-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <RotateCcw size={12} /> Nova palavra amanhã
        </button>
      )}
    </div>
  )
}
