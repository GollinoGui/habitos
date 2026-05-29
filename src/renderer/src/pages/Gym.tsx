import React, { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Plus, Trash2, X, ChevronDown, ChevronUp, Scale, Dumbbell, Link2 } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useProfileStore } from '../store/profileStore'

interface Exercise { id: number; name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }
interface Workout { id: number; date: string; name: string; notes?: string; duration_min?: number; exercises: Exercise[] }
interface Bio { id: number; date: string; weight_kg?: number; body_fat_pct?: number; muscle_mass_kg?: number; bmr_kcal?: number }

type Tab = 'workouts' | 'bio' | 'programs'

interface ProgramExercise { id: number; name: string; sets?: number; reps?: number; weight_kg?: number; is_superset?: number }
interface ProgramDay { id: number; program_id: number; day_label?: string; name: string; exercises: ProgramExercise[] }
interface WorkoutProgram { id: number; name: string; description?: string; days: ProgramDay[] }

function WorkoutModal({ onClose, onSave }: { onClose: () => void; onSave: (d: object) => void }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')
  const [duration, setDuration] = useState('')
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
      exercises: exercises.filter(e => e.name).map(e => ({
        name: e.name, sets: e.sets ? Number(e.sets) : null,
        reps: e.reps ? Number(e.reps) : null, weight_kg: e.weight ? Number(e.weight) : null,
        is_superset: e.superset ? 1 : 0
      }))
    })
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
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
                    <div className={`flex gap-2 items-center py-1 ${isInSuperset ? 'border-l-2 border-orange-500/40 pl-2' : ''}`}>
                      <input value={ex.name} onChange={e => updateEx(i, 'name', e.target.value)} placeholder="Exercício"
                        className="flex-1 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple" />
                      <input value={ex.sets} onChange={e => updateEx(i, 'sets', e.target.value)} placeholder="Séries" type="number"
                        className="w-14 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple" />
                      <input value={ex.reps} onChange={e => updateEx(i, 'reps', e.target.value)} placeholder="Reps" type="number"
                        className="w-14 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple" />
                      <input value={ex.weight} onChange={e => updateEx(i, 'weight', e.target.value)} placeholder="kg" type="number"
                        className="w-14 bg-bg-primary border border-bg-border rounded-lg px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-purple" />
                      {i < exercises.length - 1 ? (
                        <button onClick={() => toggleSuperset(i)}
                          title={ex.superset ? 'Remover superserie' : 'Linkar como superserie'}
                          className={`shrink-0 p-1.5 rounded-lg transition-colors ${ex.superset ? 'text-orange-400 bg-orange-950/40 border border-orange-500/30' : 'text-text-muted hover:text-orange-400 hover:bg-orange-950/20'}`}>
                          <Link2 size={13} />
                        </button>
                      ) : <div className="w-[26px] shrink-0" />}
                      <button onClick={() => removeEx(i)} className="shrink-0 text-text-muted hover:text-accent-red"><X size={14} /></button>
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-bg-secondary border border-bg-border rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-pop-in">
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

function ProgramsTab() {
  const [programs, setPrograms] = useState<WorkoutProgram[]>([])
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [showForm, setShowForm] = useState(false)
  const [progName, setProgName] = useState('')
  const [progDesc, setProgDesc] = useState('')
  const [days, setDays] = useState([{ name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
  const { fetchProfile } = useProfileStore()

  useEffect(() => { load() }, [])

  async function load() {
    const p = await window.api.gymPrograms.list()
    setPrograms(p as WorkoutProgram[])
  }

  function addDay() {
    setDays([...days, { name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
  }

  function updateDay(i: number, field: string, val: string) {
    setDays(days.map((d, idx) => idx === i ? { ...d, [field]: val } : d))
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

  async function handleCreate() {
    if (!progName.trim()) return
    await window.api.gymPrograms.create({
      name: progName, description: progDesc,
      days: days.filter(d => d.name).map(d => ({
        name: d.name, day_label: d.day_label,
        exercises: d.exercises.filter(e => e.name).map(e => ({
          name: e.name,
          sets: e.sets ? Number(e.sets) : null,
          reps: e.reps ? Number(e.reps) : null,
          weight_kg: e.weight ? Number(e.weight) : null
        }))
      }))
    })
    setProgName(''); setProgDesc(''); setDays([{ name: '', day_label: '', exercises: [{ name: '', sets: '', reps: '', weight: '' }] }])
    setShowForm(false)
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
    alert(`Treino "${day.name}" adicionado para hoje!`)
  }

  async function deleteProgram(id: number) {
    if (confirm('Excluir este programa?')) {
      await window.api.gymPrograms.delete(id)
      load()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-text-secondary">{programs.length} programa{programs.length !== 1 ? 's' : ''} criado{programs.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
          <Plus size={15} /> Novo programa
        </button>
      </div>

      {showForm && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-text-primary">Criar programa de treino</h3>
          <div className="grid grid-cols-2 gap-3">
            <input value={progName} onChange={e => setProgName(e.target.value)} placeholder="Nome do programa *"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
            <input value={progDesc} onChange={e => setProgDesc(e.target.value)} placeholder="Descrição (opcional)"
              className="col-span-2 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple" />
          </div>
          {days.map((day, di) => (
            <div key={di} className="border border-bg-border rounded-lg p-3 space-y-2">
              <div className="flex gap-2">
                <input value={day.day_label} onChange={e => updateDay(di, 'day_label', e.target.value)} placeholder="Rótulo (Ex: Push, Dia A)"
                  className="w-28 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                <input value={day.name} onChange={e => updateDay(di, 'name', e.target.value)} placeholder="Nome do dia *"
                  className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
              </div>
              {day.exercises.map((ex, ei) => (
                <div key={ei} className="flex gap-1.5 items-center">
                  <input value={ex.name} onChange={e => updateEx(di, ei, 'name', e.target.value)} placeholder="Exercício"
                    className="flex-1 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  <input value={ex.sets} onChange={e => updateEx(di, ei, 'sets', e.target.value)} placeholder="Séries" type="number"
                    className="w-14 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  <input value={ex.reps} onChange={e => updateEx(di, ei, 'reps', e.target.value)} placeholder="Reps" type="number"
                    className="w-14 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  <input value={ex.weight} onChange={e => updateEx(di, ei, 'weight', e.target.value)} placeholder="Kg" type="number"
                    className="w-14 bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent-purple" />
                  <button onClick={() => removeEx(di, ei)} className="text-text-muted hover:text-accent-red transition-colors">
                    <X size={13} />
                  </button>
                </div>
              ))}
              <button onClick={() => addExToDay(di)} className="text-xs text-accent-purple hover:text-purple-400 transition-colors">
                + Exercício
              </button>
            </div>
          ))}
          <button onClick={addDay} className="text-sm text-accent-blue hover:text-blue-400 transition-colors">+ Adicionar dia</button>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors">
              Criar programa
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-bg-border text-text-secondary text-sm rounded-lg">Cancelar</button>
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
              <button onClick={() => deleteProgram(prog.id)} className="p-1.5 text-text-muted hover:text-accent-red hover:bg-red-950/30 rounded">
                <Trash2 size={14} />
              </button>
            </div>
            {isExp && prog.days.length > 0 && (
              <div className="border-t border-bg-border divide-y divide-bg-border">
                {prog.days.map(day => (
                  <div key={day.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        {day.day_label && <span className="text-xs bg-bg-border text-text-muted px-1.5 py-0.5 rounded mr-2">{day.day_label}</span>}
                        <span className="text-sm font-medium text-text-primary">{day.name}</span>
                      </div>
                      <button onClick={() => applyDay(day)}
                        className="text-xs px-2.5 py-1 bg-accent-green/20 text-accent-green border border-accent-green/30 rounded-lg hover:bg-accent-green/30 transition-colors">
                        Usar hoje
                      </button>
                    </div>
                    {day.exercises.map((ex, i) => (
                      <div key={ex.id} className="flex gap-3 text-xs text-text-secondary py-0.5">
                        <span className="flex-1">{ex.name}</span>
                        {ex.sets && <span>{ex.sets}×{ex.reps ?? '?'}</span>}
                        {ex.weight_kg && <span>{ex.weight_kg}kg</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Gym(): React.JSX.Element {
  const { fetchProfile } = useProfileStore()
  const [tab, setTab] = useState<Tab>('workouts')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [bio, setBio] = useState<Bio[]>([])
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [showBioModal, setShowBioModal] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    const [w, b] = await Promise.all([window.api.gym.listWorkouts(), window.api.gym.listBioimpedance()])
    setWorkouts(w as Workout[])
    setBio(b as Bio[])
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

  return (
    <div className="space-y-4 animate-fadeIn max-w-3xl">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-text-primary">Academia</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowBioModal(true)}
            className="flex items-center gap-2 px-3 py-2 border border-bg-border hover:bg-bg-border text-text-secondary rounded-lg text-sm">
            <Scale size={15} /> Bioimpedância
          </button>
          <button onClick={() => setShowWorkoutModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white rounded-lg text-sm font-semibold animate-jump-in">
            <Plus size={16} /> Treino
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-secondary border border-bg-border rounded-xl p-1 w-fit">
        <button onClick={() => setTab('workouts')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'workouts' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <Dumbbell className="inline mr-1.5" size={13} />Treinos ({workouts.length})
        </button>
        <button onClick={() => setTab('bio')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'bio' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          <Scale className="inline mr-1.5" size={13} />Corpo ({bio.length})
        </button>
        <button onClick={() => setTab('programs')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === 'programs' ? 'bg-accent-purple text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          📋 Programas
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
          {workouts.map(w => {
            const isExpanded = expanded.has(w.id)
            return (
              <div key={w.id} className="bg-bg-secondary border border-bg-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-text-primary">{w.name}</span>
                      {w.duration_min && <span className="text-xs text-text-muted">{w.duration_min}min</span>}
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
                    <button onClick={async () => { if (confirm('Excluir treino?')) { await window.api.gym.deleteWorkout(w.id); loadAll() } }}
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
            {bio.map(b => (
              <div key={b.id} className="bg-bg-secondary border border-bg-border rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-semibold text-text-primary">{format(new Date(b.date + 'T00:00:00'), 'dd/MM/yyyy')}</p>
                  <button onClick={async () => { if (confirm('Excluir medição?')) { await window.api.gym.deleteBioimpedance(b.id); loadAll() } }}
                    className="p-1 text-text-muted hover:text-accent-red"><Trash2 size={13} /></button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                  {b.weight_kg != null && <div><p className="text-xs text-text-muted">Peso</p><p className="text-lg font-bold text-accent-purple">{b.weight_kg}kg</p></div>}
                  {b.body_fat_pct != null && <div><p className="text-xs text-text-muted">Gordura</p><p className="text-lg font-bold text-accent-red">{b.body_fat_pct}%</p></div>}
                  {b.muscle_mass_kg != null && <div><p className="text-xs text-text-muted">Músculo</p><p className="text-lg font-bold text-accent-green">{b.muscle_mass_kg}kg</p></div>}
                  {b.bmr_kcal != null && <div><p className="text-xs text-text-muted">TMB</p><p className="text-lg font-bold text-accent-gold">{b.bmr_kcal}kcal</p></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'programs' && <ProgramsTab />}

      {showWorkoutModal && <WorkoutModal onClose={() => setShowWorkoutModal(false)} onSave={handleSaveWorkout} />}
      {showBioModal && <BioModal onClose={() => setShowBioModal(false)} onSave={handleSaveBio} />}
    </div>
  )
}
