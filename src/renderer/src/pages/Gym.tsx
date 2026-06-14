import React, { useEffect, useRef, useState } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Plus, Trash2, X, ChevronDown, ChevronUp, Scale, Dumbbell, Link2, Pencil, Calendar } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useProfileStore } from '../store/profileStore'

interface Exercise { id: number; name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }
interface Workout { id: number; date: string; name: string; notes?: string; duration_min?: number; cardio_type?: string; cardio_minutes?: number; exercises: Exercise[] }
interface Bio { id: number; date: string; weight_kg?: number; body_fat_pct?: number; muscle_mass_kg?: number; bmr_kcal?: number }

type Tab = 'workouts' | 'bio' | 'programs' | 'phases'

interface ProgramExercise { id: number; name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }
interface ProgramDay { id: number; program_id: number; day_label?: string; name: string; exercises: ProgramExercise[] }
interface WorkoutProgram { id: number; name: string; description?: string; days: ProgramDay[] }

type PhaseType = 'resistencia' | 'forca' | 'hipertrofia' | 'personalizado'
interface TrainingPhase { id: number; name: string; type: PhaseType; start_date: string; end_date: string; program_id?: number; notes?: string }

const PHASE_CONFIG: Record<PhaseType, { label: string; color: string; bg: string; border: string; desc: string }> = {
  resistencia: { label: 'Resistência', color: 'text-blue-400', bg: 'bg-blue-950/30', border: 'border-blue-500/30', desc: '15-20 reps · carga leve · menos descanso' },
  forca: { label: 'Força', color: 'text-red-400', bg: 'bg-red-950/30', border: 'border-red-500/30', desc: '3-5 reps · carga máxima · mais descanso' },
  hipertrofia: { label: 'Hipertrofia', color: 'text-accent-purple', bg: 'bg-purple-950/30', border: 'border-purple-500/30', desc: '8-12 reps · carga moderada' },
  personalizado: { label: 'Personalizado', color: 'text-text-secondary', bg: 'bg-bg-border/30', border: 'border-bg-border', desc: '' },
}

const EXERCISE_SUGGESTIONS = [
  { name: 'Supino Reto', group: 'Peito' },
  { name: 'Supino Inclinado', group: 'Peito' },
  { name: 'Supino Declinado', group: 'Peito' },
  { name: 'Crucifixo', group: 'Peito' },
  { name: 'Crossover', group: 'Peito' },
  { name: 'Flexão de Braço', group: 'Peito' },
  { name: 'Chest Press', group: 'Peito' },
  { name: 'Barra Fixa', group: 'Costas' },
  { name: 'Remada Curvada', group: 'Costas' },
  { name: 'Remada Serrote', group: 'Costas' },
  { name: 'Puxada Frontal', group: 'Costas' },
  { name: 'Remada Baixa', group: 'Costas' },
  { name: 'Levantamento Terra', group: 'Costas' },
  { name: 'Remada Cavalinho', group: 'Costas' },
  { name: 'Pullover', group: 'Costas' },
  { name: 'Agachamento', group: 'Pernas' },
  { name: 'Leg Press', group: 'Pernas' },
  { name: 'Cadeira Extensora', group: 'Pernas' },
  { name: 'Cadeira Flexora', group: 'Pernas' },
  { name: 'Stiff', group: 'Pernas' },
  { name: 'Afundo', group: 'Pernas' },
  { name: 'Panturrilha em Pé', group: 'Pernas' },
  { name: 'Hack Squat', group: 'Pernas' },
  { name: 'Leg Curl Deitado', group: 'Pernas' },
  { name: 'Abdutora', group: 'Pernas' },
  { name: 'Adutora', group: 'Pernas' },
  { name: 'Desenvolvimento com Halteres', group: 'Ombros' },
  { name: 'Desenvolvimento com Barra', group: 'Ombros' },
  { name: 'Elevação Lateral', group: 'Ombros' },
  { name: 'Elevação Frontal', group: 'Ombros' },
  { name: 'Remada Alta', group: 'Ombros' },
  { name: 'Encolhimento', group: 'Ombros' },
  { name: 'Face Pull', group: 'Ombros' },
  { name: 'Rosca Direta', group: 'Bíceps' },
  { name: 'Rosca Alternada', group: 'Bíceps' },
  { name: 'Rosca Concentrada', group: 'Bíceps' },
  { name: 'Rosca Martelo', group: 'Bíceps' },
  { name: 'Rosca Scott', group: 'Bíceps' },
  { name: 'Rosca 21', group: 'Bíceps' },
  { name: 'Tríceps na Polia', group: 'Tríceps' },
  { name: 'Tríceps Francês', group: 'Tríceps' },
  { name: 'Tríceps Testa', group: 'Tríceps' },
  { name: 'Mergulho (Tríceps)', group: 'Tríceps' },
  { name: 'Kickback', group: 'Tríceps' },
  { name: 'Abdominal Crunch', group: 'Abdômen' },
  { name: 'Prancha', group: 'Abdômen' },
  { name: 'Abdominal Oblíquo', group: 'Abdômen' },
  { name: 'Elevação de Pernas', group: 'Abdômen' },
  { name: 'Russian Twist', group: 'Abdômen' },
]

function ExerciseInput({ value, onChange, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = value.length === 0
    ? EXERCISE_SUGGESTIONS.slice(0, 12)
    : EXERCISE_SUGGESTIONS.filter(e => e.name.toLowerCase().includes(value.toLowerCase())).slice(0, 12)

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function select(name: string) {
    onChange(name)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative flex-1">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder ?? 'Exercício'}
        className={className}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-bg-secondary border border-bg-border rounded-lg shadow-xl overflow-auto max-h-48">
          {filtered.map((ex, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={() => select(ex.name)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-bg-border flex items-center justify-between gap-2"
            >
              <span className="text-text-primary">{ex.name}</span>
              <span className="text-text-muted shrink-0">{ex.group}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function WorkoutModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
  const [cardioType, setCardioType] = useState('')
  const [cardioMinutes, setCardioMinutes] = useState('')
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '', superset: false }])

  function addEx() { setExercises([...exercises, { name: '', sets: '', reps: '', weight: '', superset: false }]) }
  function updateEx(i: number, field: string, val: string) {
    setExercises(exercises.map((e, idx) => idx === i ? { ...e, [field]: val } : e))
  }
  function toggleSuperset(i: number) {
    setExercises(exercises.map((e, idx) => idx === i ? { ...e, superset: !e.superset } : e))
  }
  function removeEx(i: number) { setExercises(exercises.filter((_, idx) => idx !== i)) }

  function calcXpPreview(): number {
    let xp = 15
    if (duration) xp += Math.floor(Number(duration) / 20) * 5
    const named = exercises.filter(e => e.name)
    xp += named.length * 5
    xp += named.filter((e, i) => i < named.length - 1 && e.superset).length * 10
    return Math.min(xp, 150)
  }

  function handleSave() {
    if (!name.trim()) return
    onSave({
      date, name, notes, duration_min: duration ? Number(duration) : null,
      cardio_type: cardioType.trim() || null,
      cardio_minutes: cardioMinutes ? Number(cardioMinutes) : null,
      exercises: exercises.filter(e => e.name).map(e => ({
        name: e.name, sets: e.sets ? Number(e.sets) : null,
        reps: e.reps ? Number(e.reps) : null, weight_kg: e.weight ? Number(e.weight) : null,
        is_superset: e.superset ? 1 : 0
      }))
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto animate-pop-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Registrar Treino</h2>
          <button onClick={onClose}><X size={18} className="text-text-muted" /></button>
        </div>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Data</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
            </div>
            <div className="flex-1">
              <label className="text-xs text-text-secondary mb-1 block">Duração (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} placeholder="60"
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Nome do treino *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Peito, Pernas, Full Body"
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Observações</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Cardio (opcional)</label>
            <div className="flex gap-2">
              <input value={cardioType} onChange={e => setCardioType(e.target.value)}
                placeholder="Tipo (corrida, bike...)" list="cardio-types"
                className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
              <datalist id="cardio-types">
                <option value="Corrida" /><option value="Caminhada" /><option value="Bicicleta" />
                <option value="Esteira" /><option value="Elíptico" /><option value="Natação" />
                <option value="Pular Corda" /><option value="Remo" />
              </datalist>
              <input type="number" value={cardioMinutes} onChange={e => setCardioMinutes(e.target.value)}
                placeholder="min"
                className="w-20 bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary text-center focus:outline-none focus:border-accent-purple" />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs text-text-secondary">Exercícios</label>
              <button onClick={addEx} className="text-xs text-accent-purple hover:text-purple-400 flex items-center gap-1">
                <Plus size={12} /> Adicionar
              </button>
            </div>
            <div className="space-y-0">
              {exercises.map((ex, i) => {
                const prevLinked = i > 0 && exercises[i - 1].superset
                const isInSuperset = prevLinked || ex.superset
                return (
                  <div key={i}>
                    {prevLinked && (
                      <div className="flex items-center gap-1.5 my-1 ml-2">
                        <div className="w-3 h-3 border-l-2 border-b-2 border-orange-500/50 rounded-bl-sm shrink-0" />
                        <span className="text-[10px] text-orange-400 font-bold tracking-widest">SUPERSERIE</span>
                      </div>
                    )}
                    <div className={`space-y-1 py-1 ${isInSuperset ? 'border-l-2 border-orange-500/40 pl-2' : ''}`}>
                      <div className="flex gap-1.5 items-center">
                        <ExerciseInput
                          value={ex.name}
                          onChange={v => updateEx(i, 'name', v)}
                          className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple w-full"
                        />
                        {i < exercises.length - 1 ? (
                          <button onClick={() => toggleSuperset(i)}
                            title={ex.superset ? 'Remover superserie' : 'Linkar como superserie'}
                            className={`shrink-0 p-1.5 rounded-lg transition-colors ${ex.superset ? 'text-orange-400 bg-orange-950/40 border border-orange-500/30' : 'text-text-muted hover:text-orange-400 hover:bg-orange-950/20'}`}>
                            <Link2 size={13} />
                          </button>
                        ) : <div className="w-[28px] shrink-0" />}
                        <button onClick={() => removeEx(i)} className="shrink-0 text-text-muted hover:text-accent-red"><X size={14} /></button>
                      </div>
                      <div className="flex gap-1.5">
                        <input value={ex.sets} onChange={e => updateEx(i, 'sets', e.target.value)} placeholder="Séries" type="number"
                          className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary text-center focus:outline-none focus:border-accent-purple" />
                        <input value={ex.reps} onChange={e => updateEx(i, 'reps', e.target.value)} placeholder="Reps" type="number"
                          className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary text-center focus:outline-none focus:border-accent-purple" />
                        <input value={ex.weight} onChange={e => updateEx(i, 'weight', e.target.value)} placeholder="kg" type="number"
                          className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary text-center focus:outline-none focus:border-accent-purple" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-accent-purple hover:bg-purple-600 text-white font-semibold text-sm">Salvar (+{calcXpPreview()} XP)</button>
        </div>
      </div>
    </div>
  )
}

function BioModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weight, setWeight] = useState('')
  const [fat, setFat] = useState('')
  const [muscle, setMuscle] = useState('')
  const [bmr, setBmr] = useState('')

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-5 w-full max-w-sm shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-text-primary">Nova Medição</h2>
          <button onClick={onClose}><X size={18} className="text-text-muted" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
          </div>
          {[
            { label: 'Peso (kg)', val: weight, set: setWeight },
            { label: '% Gordura', val: fat, set: setFat },
            { label: 'Massa muscular (kg)', val: muscle, set: setMuscle },
            { label: 'Metabolismo basal (kcal)', val: bmr, set: setBmr }
          ].map(({ label, val, set }) => (
            <div key={label}>
              <label className="text-xs text-text-secondary mb-1 block">{label}</label>
              <input type="number" step="0.1" value={val} onChange={e => set(e.target.value)} placeholder="0"
                className="w-full bg-bg-primary border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-purple" />
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-bg-border text-text-secondary hover:bg-bg-border text-sm">Cancelar</button>
          <button onClick={() => onSave({ date, weight_kg: weight ? Number(weight) : null, body_fat_pct: fat ? Number(fat) : null, muscle_mass_kg: muscle ? Number(muscle) : null, bmr_kcal: bmr ? Number(bmr) : null })}
            className="flex-1 py-2 rounded-lg bg-accent-blue hover:bg-blue-600 text-white font-semibold text-sm">Salvar</button>
        </div>
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-secondary border border-bg-border rounded-lg p-2 text-xs">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

function PhasesTab({ programs }: { programs: WorkoutProgram[] }) {
  const [phases, setPhases] = useState<TrainingPhase[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<PhaseType>('hipertrofia')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState('')
  const [programId, setProgramId] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => Promise<void> } | null>(null)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { load() }, [])

  async function load() {
    const data = await window.api.gymPhases.list()
    setPhases(data as TrainingPhase[])
  }

  function resetForm() {
    setEditingId(null)
    setName('')
    setType('hipertrofia')
    setStartDate(format(new Date(), 'yyyy-MM-dd'))
    setEndDate('')
    setProgramId('')
    setNotes('')
    setShowForm(false)
  }

  function openEdit(phase: TrainingPhase) {
    setEditingId(phase.id)
    setName(phase.name)
    setType(phase.type)
    setStartDate(phase.start_date)
    setEndDate(phase.end_date)
    setProgramId(phase.program_id ? String(phase.program_id) : '')
    setNotes(phase.notes ?? '')
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !startDate || !endDate) return
    const payload = {
      name: name.trim(), type, start_date: startDate, end_date: endDate,
      program_id: programId ? Number(programId) : undefined,
      notes: notes.trim() || undefined
    }
    if (editingId !== null) {
      await window.api.gymPhases.update(editingId, payload)
    } else {
      await window.api.gymPhases.create(payload)
    }
    resetForm()
    load()
  }

  function phaseStatus(phase: TrainingPhase): 'active' | 'upcoming' | 'done' {
    if (phase.end_date < today) return 'done'
    if (phase.start_date > today) return 'upcoming'
    return 'active'
  }

  function daysLeft(phase: TrainingPhase): number {
    return differenceInDays(parseISO(phase.end_date), new Date())
  }

  function totalDays(phase: TrainingPhase): number {
    return differenceInDays(parseISO(phase.end_date), parseISO(phase.start_date))
  }

  const active = phases.filter(p => phaseStatus(p) === 'active')
  const upcoming = phases.filter(p => phaseStatus(p) === 'upcoming')
  const done = phases.filter(p => phaseStatus(p) === 'done')

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">{phases.length} fase{phases.length !== 1 ? 's' : ''} de treino</p>
        <button onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} /> Nova fase
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text-primary">{editingId !== null ? 'Editar fase' : 'Criar fase de treino'}</h3>

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Nome da fase *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Fase 1 - Hipertrofia"
              className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-2 block">Tipo de treino</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(PHASE_CONFIG) as [PhaseType, typeof PHASE_CONFIG[PhaseType]][]).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => setType(key)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${type === key ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-bg-border text-text-muted hover:border-bg-border/80'}`}>
                  <p className="text-xs font-semibold">{cfg.label}</p>
                  {cfg.desc && <p className="text-[10px] opacity-70 mt-0.5">{cfg.desc}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Início *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Fim *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            </div>
          </div>

          {programs.length > 0 && (
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Programa de treino (opcional)</label>
              <select value={programId} onChange={e => setProgramId(e.target.value)}
                className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                <option value="">— Sem programa vinculado —</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-text-secondary mb-1 block">Observações</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: foco em compostos, descanso 90s..."
              className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>

          <div className="flex gap-2">
            <button onClick={handleSave}
              className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
              {editingId !== null ? 'Salvar alterações' : 'Criar fase'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {phases.length === 0 && !showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
          <Calendar size={40} className="text-text-muted mx-auto mb-2" />
          <p className="text-text-muted">Nenhuma fase de treino criada.</p>
          <p className="text-xs text-text-muted mt-1">Organize seu treino por períodos: resistência, força, hipertrofia.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Fase atual</p>
          {active.map(phase => <PhaseCard key={phase.id} phase={phase} programs={programs} onEdit={openEdit} onDelete={msg => setConfirmDelete(msg)} daysLeft={daysLeft(phase)} totalDays={totalDays(phase)} status="active" />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Próximas fases</p>
          {upcoming.map(phase => <PhaseCard key={phase.id} phase={phase} programs={programs} onEdit={openEdit} onDelete={msg => setConfirmDelete(msg)} daysLeft={daysLeft(phase)} totalDays={totalDays(phase)} status="upcoming" />)}
        </div>
      )}

      {done.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Concluídas</p>
          {done.map(phase => <PhaseCard key={phase.id} phase={phase} programs={programs} onEdit={openEdit} onDelete={msg => setConfirmDelete(msg)} daysLeft={daysLeft(phase)} totalDays={totalDays(phase)} status="done" />)}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-accent-red" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Confirmar exclusão</p>
                <p className="text-sm text-text-secondary mt-1">{confirmDelete.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">Cancelar</button>
              <button onClick={async () => { await confirmDelete.onConfirm(); setConfirmDelete(null); load() }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhaseCard({ phase, programs, onEdit, onDelete, daysLeft, totalDays, status }: {
  phase: TrainingPhase
  programs: WorkoutProgram[]
  onEdit: (p: TrainingPhase) => void
  onDelete: (d: { message: string; onConfirm: () => Promise<void> }) => void
  daysLeft: number
  totalDays: number
  status: 'active' | 'upcoming' | 'done'
}) {
  const cfg = PHASE_CONFIG[phase.type]
  const linkedProgram = programs.find(p => p.id === phase.program_id)

  const progress = status === 'active'
    ? Math.max(0, Math.min(100, Math.round(((totalDays - daysLeft) / totalDays) * 100)))
    : status === 'done' ? 100 : 0

  return (
    <div className={`bg-bg-secondary border rounded-xl overflow-hidden ${status === 'active' ? `${cfg.border}` : 'border-bg-border'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${cfg.bg} ${cfg.border} border ${cfg.color}`}>{cfg.label}</span>
              {status === 'active' && <span className="text-xs bg-accent-green/20 text-accent-green border border-accent-green/30 px-1.5 py-0.5 rounded font-bold">EM CURSO</span>}
              {status === 'done' && <span className="text-xs text-text-muted">Concluída</span>}
            </div>
            <p className="font-semibold text-text-primary mt-1">{phase.name}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {format(parseISO(phase.start_date), 'dd/MM/yyyy')} → {format(parseISO(phase.end_date), 'dd/MM/yyyy')}
              {' '}· {totalDays} dia{totalDays !== 1 ? 's' : ''}
            </p>
            {phase.notes && <p className="text-xs text-text-secondary mt-1">{phase.notes}</p>}
            {linkedProgram && (
              <p className="text-xs text-accent-purple mt-1">📋 {linkedProgram.name}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <button onClick={() => onEdit(phase)}
              className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded transition-colors">
              <Pencil size={13} />
            </button>
            <button onClick={() => onDelete({
              message: `Excluir a fase "${phase.name}" permanentemente?`,
              onConfirm: async () => { await window.api.gymPhases.delete(phase.id); }
            })}
              className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {status === 'active' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>{progress}% concluído</span>
              <span>{daysLeft > 0 ? `${daysLeft} dia${daysLeft !== 1 ? 's' : ''} restante${daysLeft !== 1 ? 's' : ''}` : 'Último dia!'}</span>
            </div>
            <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${cfg.bg.replace('/30', '')} ${phase.type === 'resistencia' ? 'bg-blue-500' : phase.type === 'forca' ? 'bg-red-500' : phase.type === 'hipertrofia' ? 'bg-accent-purple' : 'bg-text-muted'}`}
                style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProgramsTab() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [editingProgramId, setEditingProgramId] = useState<number | null>(null)
  const [progName, setProgName] = useState('')
  const [progDesc, setProgDesc] = useState('')
  const [days, setDays] = useState([{ name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
  const [lastApplied, setLastApplied] = useState<Record<number, number>>(() => {
    try { return JSON.parse(localStorage.getItem('gym_last_applied_day') || '{}') } catch { return {} }
  })
  const { fetchProfile } = useProfileStore()
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => Promise<void> } | null>(null)

  function askDelete(message: string, onConfirm: () => Promise<void>): void {
    setConfirmDelete({ message, onConfirm })
  }

  useEffect(() => { load() }, [])

  async function load() {
    const p = await window.api.gymPrograms.list()
    setPrograms(p as WorkoutProgram[])
  }

  function resetForm() {
    setEditingProgramId(null)
    setProgName('')
    setProgDesc('')
    setDays([{ name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
    setShowForm(false)
  }

  function openEdit(prog: WorkoutProgram) {
    setEditingProgramId(prog.id)
    setProgName(prog.name)
    setProgDesc(prog.description || '')
    setDays(prog.days.map(d => ({
      name: d.name,
      day_label: d.day_label || '',
      exercises: d.exercises.length > 0
        ? d.exercises.map(e => ({
            name: e.name,
            sets: e.sets != null ? String(e.sets) : '',
            reps: e.reps != null ? String(e.reps) : '',
            weight: e.weight_kg != null ? String(e.weight_kg) : ''
          }))
        : [{ name: '', sets: '', reps: '', weight: '' }]
    })))
    setShowForm(true)
  }

  function addDay() {
    setDays([...days, { name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
  }

  function updateDay(i: number, field: string, val: string) {
    setDays(days.map((d, idx) => idx === i ? { ...d, [field]: val } : d))
  }

  function removeDay(i: number) {
    setDays(days.filter((_, idx) => idx !== i))
  }

  function addExToDay(di: number) {
    setDays(days.map((d, idx) => idx === di ? { ...d, exercises: [...d.exercises, { name: '', sets: '', reps: '', weight: '' }] } : d))
  }

  function updateEx(di: number, ei: number, field: string, val: string) {
    setDays(days.map((d, idx) => idx === di ? {
      ...d,
      exercises: d.exercises.map((e, eidx) => eidx === ei ? { ...e, [field]: val } : e)
    } : d))
  }

  function removeEx(di: number, ei: number) {
    setDays(days.map((d, idx) => idx === di ? { ...d, exercises: d.exercises.filter((_, eidx) => eidx !== ei) } : d))
  }

  function buildDaysPayload() {
    return days.filter(d => d.name).map(d => ({
      name: d.name, day_label: d.day_label,
      exercises: d.exercises.filter(e => e.name).map(e => ({
        name: e.name,
        sets: e.sets ? Number(e.sets) : null,
        reps: e.reps ? Number(e.reps) : null,
        weight_kg: e.weight ? Number(e.weight) : null
      }))
    }))
  }

  async function handleCreate() {
    if (!progName.trim()) return
    await window.api.gymPrograms.create({ name: progName, description: progDesc, days: buildDaysPayload() })
    resetForm()
    load()
  }

  async function handleUpdate() {
    if (!progName.trim() || editingProgramId === null) return
    await window.api.gymPrograms.update(editingProgramId, { name: progName, description: progDesc, days: buildDaysPayload() })
    resetForm()
    load()
  }

  async function applyDay(day: ProgramDay) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await window.api.gym.createWorkout({
      date: today, name: day.name,
      exercises: day.exercises.map(e => ({
        name: e.name, sets: e.sets, reps: e.reps, weight_kg: e.weight_kg, is_superset: e.is_superset ?? 0
      }))
    })
    await fetchProfile()
    const updated = { ...lastApplied, [day.program_id]: day.id }
    setLastApplied(updated)
    localStorage.setItem('gym_last_applied_day', JSON.stringify(updated))
    alert(`Treino "${day.name}" adicionado para hoje!`)
  }

  function deleteProgram(id: number): void {
    askDelete('Excluir este programa de treino permanentemente?', async () => {
      await window.api.gymPrograms.delete(id)
      if (editingProgramId === id) resetForm()
      load()
    })
  }

  const formDays = days.map((day, di) => (
    <div key={di} className="border border-bg-border rounded-lg p-3 space-y-2">
      <div className="flex gap-2 items-center">
        <input value={day.day_label} onChange={e => updateDay(di, 'day_label', e.target.value)} placeholder="Rótulo (Ex: Push, Dia A)"
          className="w-28 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
        <input value={day.name} onChange={e => updateDay(di, 'name', e.target.value)} placeholder="Nome do dia *"
          className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
        {days.length > 1 && (
          <button onClick={() => removeDay(di)} className="text-text-muted hover:text-accent-red transition-colors shrink-0">
            <X size={14} />
          </button>
        )}
      </div>
      {day.exercises.map((ex, ei) => (
        <div key={ei} className="space-y-1">
          <div className="flex gap-1.5 items-center">
            <ExerciseInput
              value={ex.name}
              onChange={v => updateEx(di, ei, 'name', v)}
              className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple w-full"
            />
            <button onClick={() => removeEx(di, ei)} className="text-text-muted hover:text-accent-red transition-colors shrink-0">
              <X size={13} />
            </button>
          </div>
          <div className="flex gap-1.5">
            <input value={ex.sets} onChange={e => updateEx(di, ei, 'sets', e.target.value)} placeholder="Séries" type="number"
              className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={ex.reps} onChange={e => updateEx(di, ei, 'reps', e.target.value)} placeholder="Reps" type="number"
              className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={ex.weight} onChange={e => updateEx(di, ei, 'weight', e.target.value)} placeholder="Kg" type="number"
              className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>
        </div>
      ))}
      <button onClick={() => addExToDay(di)} className="text-xs text-accent-purple hover:text-purple-400 transition-colors">
        + Exercício
      </button>
    </div>
  ))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">{programs.length} programa{programs.length !== 1 ? 's' : ''} criado{programs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} /> Novo programa
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text-primary">
            {editingProgramId !== null ? 'Editar programa' : 'Criar programa de treino'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={progName} onChange={e => setProgName(e.target.value)} placeholder="Nome do programa *"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={progDesc} onChange={e => setProgDesc(e.target.value)} placeholder="Descrição (opcional)"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>
          {formDays}
          <button onClick={addDay} className="text-sm text-accent-blue hover:text-blue-400 transition-colors">+ Adicionar dia</button>
          <div className="flex gap-2">
            <button
              onClick={editingProgramId !== null ? handleUpdate : handleCreate}
              className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
              {editingProgramId !== null ? 'Salvar alterações' : 'Criar programa'}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {programs.length === 0 && !showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
          <Dumbbell size={40} className="text-text-muted mx-auto mb-2" />
          <p className="text-text-muted">Nenhum programa criado ainda.</p>
        </div>
      )}

      {programs.map(prog => {
        const isExp = expanded.has(prog.id)
        return (
          <div key={prog.id} className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="font-semibold text-text-primary">{prog.name}</p>
                {prog.description && <p className="text-xs text-text-muted">{prog.description}</p>}
                <p className="text-xs text-text-muted">{prog.days.length} dia{prog.days.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => { const n = new Set(expanded); isExp ? n.delete(prog.id) : n.add(prog.id); setExpanded(n) }}
                className="p-1.5 text-text-muted hover:text-text-primary">
                {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              <button onClick={() => openEdit(prog)} className="p-1.5 text-text-muted hover:text-accent-purple hover:bg-accent-purple/10 rounded transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={() => deleteProgram(prog.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            {isExp && prog.days.length > 0 && (
              <div className="border-t border-bg-border divide-y divide-bg-border">
                {prog.days.map(day => {
                  const isLastUsed = lastApplied[prog.id] === day.id
                  return (
                    <div key={day.id} className={`px-4 py-3 ${isLastUsed ? 'bg-accent-purple/5' : ''}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {day.day_label && <span className="text-xs bg-bg-border text-text-muted px-1.5 py-0.5 rounded">{day.day_label}</span>}
                          <span className="text-sm font-medium text-text-primary">{day.name}</span>
                          {isLastUsed && (
                            <span className="text-[10px] bg-accent-purple/20 text-accent-purple border border-accent-purple/30 px-1.5 py-0.5 rounded font-bold">Último usado</span>
                          )}
                        </div>
                        <button onClick={() => applyDay(day)}
                          className="text-xs px-2.5 py-1 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/30 transition-colors">
                          Usar hoje
                        </button>
                      </div>
                      {day.exercises.map((ex) => (
                        <div key={ex.id} className="flex gap-3 text-xs text-text-secondary py-0.5">
                          <span className="flex-1">{ex.name}</span>
                          {ex.sets && <span>{ex.sets}×{ex.reps ?? '?'}</span>}
                          {ex.weight_kg && <span>{ex.weight_kg}kg</span>}
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-accent-red" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Confirmar exclusão</p>
                <p className="text-sm text-text-secondary mt-1">{confirmDelete.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { await confirmDelete.onConfirm(); setConfirmDelete(null) }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Gym(): React.JSX.Element {
  const { fetchProfile } = useProfileStore()
  const [tab, setTab] = useState<Tab>('workouts')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [bio, setBio] = useState<Bio[]>([])
  const [programs, setPrograms] = useState<WorkoutProgram[]>([])
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [showBioModal, setShowBioModal] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [confirmDelete, setConfirmDelete] = useState<{ message: string; onConfirm: () => Promise<void> } | null>(null)
  const [loading, setLoading] = useState(true)

  function askDelete(message: string, onConfirm: () => Promise<void>): void {
    setConfirmDelete({ message, onConfirm })
  }

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    try {
      const [w, b, p] = await Promise.all([
        window.api.gym.listWorkouts(),
        window.api.gym.listBioimpedance(),
        window.api.gymPrograms.list()
      ])
      setWorkouts(w as Workout[])
      setBio(b as Bio[])
      setPrograms(p as WorkoutProgram[])
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveWorkout(data: object) {
    await window.api.gym.createWorkout(data)
    await fetchProfile()
    setShowWorkoutModal(false)
    loadAll()
  }

  async function handleSaveBio(data: object) {
    await window.api.gym.addBioimpedance(data)
    setShowBioModal(false)
    loadAll()
  }

  const bioChartData = [...bio].reverse().slice(-20).map(b => ({
    date: format(new Date(b.date), 'dd/MM'),
    Peso: b.weight_kg,
    '% Gordura': b.body_fat_pct,
    Músculo: b.muscle_mass_kg
  }))

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-7 h-7 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-text-primary animate-slide-down">Academia</h1>
          <p className="text-text-secondary text-sm animate-slide-in-left" style={{ animationDelay: '60ms' }}>{workouts.length} treino{workouts.length !== 1 ? 's' : ''} registrado{workouts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2 shrink-0 animate-slide-up" style={{ animationDelay: '80ms' }}>
          <button onClick={() => setShowBioModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-2 border border-bg-border hover:bg-bg-border text-text-secondary rounded-lg text-sm"
            title="Bioimpedância">
            <Scale size={15} />
            <span className="hidden sm:inline">Bioimpedância</span>
          </button>
          <button onClick={() => setShowWorkoutModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold animate-jump-in">
            <Plus size={15} /> Treino
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 animate-slide-up" style={{ animationDelay: '120ms' }}>
        <button onClick={() => setTab('workouts')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all ${tab === 'workouts' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <Dumbbell size={11} /><span>Treinos</span>
        </button>
        <button onClick={() => setTab('bio')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all ${tab === 'bio' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <Scale size={11} /><span>Corpo</span>
        </button>
        <button onClick={() => setTab('programs')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all ${tab === 'programs' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <span className="text-[11px]">📋</span><span>Prog.</span>
        </button>
        <button onClick={() => setTab('phases')}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg text-[11px] sm:text-sm font-medium transition-all ${tab === 'phases' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <Calendar size={11} /><span>Períodos</span>
        </button>
      </div>

      {tab === 'workouts' && (
        <div className="space-y-3">
          {workouts.length === 0 && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
              <Dumbbell size={40} className="text-text-muted mx-auto mb-2" />
              <p className="text-text-muted">Nenhum treino registrado ainda.</p>
            </div>
          )}
          {workouts.map((w, i) => {
            const isExpanded = expanded.has(w.id)
            return (
              <div key={w.id} className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-text-primary">{w.name}</span>
                      {w.duration_min && <span className="text-xs text-text-muted">{w.duration_min}min</span>}
                      {w.cardio_type && (
                        <span className="text-xs text-accent-green bg-accent-green/10 border border-accent-green/20 rounded px-1.5 py-0.5">
                          🏃 {w.cardio_type}{w.cardio_minutes ? ` ${w.cardio_minutes}min` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">{format(new Date(w.date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                    {w.notes && <p className="text-xs text-text-secondary mt-0.5">{w.notes}</p>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-text-muted">{w.exercises.length} exerc.</span>
                    <button onClick={() => { const n = new Set(expanded); isExpanded ? n.delete(w.id) : n.add(w.id); setExpanded(n) }}
                      className="p-1.5 text-text-muted hover:text-text-primary">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => askDelete(`Excluir o treino "${w.name}"?`, async () => { await window.api.gym.deleteWorkout(w.id); loadAll() })}
                      className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {isExpanded && w.exercises.length > 0 && (
                  <div className="border-t border-bg-border px-4 py-3">
                    <div className="grid grid-cols-4 gap-2 text-xs text-text-muted mb-1 font-medium uppercase">
                      <span>Exercício</span><span className="text-center">Séries</span><span className="text-center">Reps</span><span className="text-center">Peso</span>
                    </div>
                    {w.exercises.map((ex, idx) => {
                      const prevLinked = idx > 0 && w.exercises[idx - 1].is_superset
                      return (
                        <div key={ex.id} className="grid grid-cols-4 gap-2 text-xs text-text-secondary py-1 border-t border-bg-border/50">
                          <span className="flex items-center gap-1.5">
                            {prevLinked && (
                              <span className="shrink-0 text-[9px] bg-orange-950/40 text-orange-400 border border-orange-500/30 rounded px-1 font-bold">SS</span>
                            )}
                            {ex.name}
                          </span>
                          <span className="text-center">{ex.sets ?? '—'}</span>
                          <span className="text-center">{ex.reps ?? '—'}</span>
                          <span className="text-center">{ex.weight_kg ? `${ex.weight_kg}kg` : '—'}</span>
                        </div>
                      )
                    })}
                    {(() => {
                      const tonnage = w.exercises.reduce((sum, ex) => {
                        if (ex.sets && ex.reps && ex.weight_kg) return sum + ex.sets * ex.reps * ex.weight_kg
                        return sum
                      }, 0)
                      return tonnage > 0 ? (
                        <div className="mt-2 pt-2 border-t border-bg-border/50 flex justify-end">
                          <span className="text-xs text-accent-purple font-semibold">
                            Tonelagem: {tonnage >= 1000 ? `${(tonnage / 1000).toFixed(1)}t` : `${tonnage}kg`}
                          </span>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'bio' && (
        <div className="space-y-4">
          {bioChartData.length > 1 && (
            <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-secondary mb-3">Evolução corporal</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bioChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" />
                  <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Peso" stroke="#7c3aed" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="% Gordura" stroke="#ef4444" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="Músculo" stroke="#10b981" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-xs">
                <span className="text-purple-400">— Peso</span>
                <span className="text-red-400">— % Gordura</span>
                <span className="text-emerald-400">— Músculo</span>
              </div>
            </div>
          )}
          <div className="space-y-2">
            {bio.length === 0 && (
              <div className="bg-bg-secondary border border-bg-border rounded-xl p-10 text-center">
                <Scale size={40} className="text-text-muted mx-auto mb-2" />
                <p className="text-text-muted">Nenhuma medição registrada.</p>
              </div>
            )}
            {bio.map((b, i) => (
              <div key={b.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4 animate-slide-up" style={{ animationDelay: `${i * 55}ms` }}>
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-text-primary">{format(new Date(b.date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                  <button onClick={() => askDelete('Excluir esta medição de bioimpedância?', async () => { await window.api.gym.deleteBioimpedance(b.id); loadAll() })}
                    className="p-1 text-text-muted hover:text-accent-red"><Trash2 size={13} /></button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  {b.weight_kg != null && <div><p className="text-xs text-text-muted">Peso</p><p className="text-lg font-bold text-accent-purple animate-count-up">{b.weight_kg}kg</p></div>}
                  {b.body_fat_pct != null && <div><p className="text-xs text-text-muted">Gordura</p><p className="text-lg font-bold text-accent-red animate-count-up" style={{ animationDelay: '60ms' }}>{b.body_fat_pct}%</p></div>}
                  {b.muscle_mass_kg != null && <div><p className="text-xs text-text-muted">Músculo</p><p className="text-lg font-bold text-accent-green animate-count-up" style={{ animationDelay: '120ms' }}>{b.muscle_mass_kg}kg</p></div>}
                  {b.bmr_kcal != null && <div><p className="text-xs text-text-muted">TMB</p><p className="text-lg font-bold text-accent-gold animate-count-up" style={{ animationDelay: '180ms' }}>{b.bmr_kcal}kcal</p></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'programs' && <ProgramsTab />}
      {tab === 'phases' && <PhasesTab programs={programs} />}

      {showWorkoutModal && <WorkoutModal onClose={() => setShowWorkoutModal(false)} onSave={handleSaveWorkout} />}
      {showBioModal && <BioModal onClose={() => setShowBioModal(false)} onSave={handleSaveBio} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-bg-secondary border border-bg-border rounded-2xl shadow-2xl p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-accent-red" />
              </div>
              <div>
                <p className="font-semibold text-text-primary">Confirmar exclusão</p>
                <p className="text-sm text-text-secondary mt-1">{confirmDelete.message}</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg hover:bg-bg-border/70 transition-colors">
                Cancelar
              </button>
              <button onClick={async () => { await confirmDelete.onConfirm(); setConfirmDelete(null) }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
