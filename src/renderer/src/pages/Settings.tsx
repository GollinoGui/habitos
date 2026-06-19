import React, { useEffect, useRef, useState } from 'react'
import {
  Bell, BellOff, Send, AlertTriangle, Download, Upload, Trash2,
  Palette, Eye, EyeOff, User, GripVertical, Sparkles, Check, MonitorPlay, Cloud
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { syncDesktopToCloud, syncFinanceAndCalendarToCloud } from '../lib/syncToCloud'

interface NotifSettings { enabled: boolean; hour: number; minute: number }

const ACCENT_PRESETS = [
  { label: 'Roxo',    value: '#7c3aed' },
  { label: 'Azul',   value: '#3b82f6' },
  { label: 'Verde',  value: '#10b981' },
  { label: 'Rosa',   value: '#ec4899' },
  { label: 'Laranja',value: '#f97316' },
  { label: 'Vermelho',value: '#ef4444' },
  { label: 'Ciano',  value: '#06b6d4' },
  { label: 'Âmbar',  value: '#f59e0b' }
]

const ALL_SECTIONS = [
  { key: 'habits',       label: 'Hábitos',     emoji: '✅' },
  { key: 'gym',          label: 'Academia',    emoji: '🏋️' },
  { key: 'addictions',   label: 'Vícios',      emoji: '🛡️' },
  { key: 'goals',        label: 'Metas',       emoji: '🎯' },
  { key: 'achievements', label: 'Conquistas',  emoji: '🏆' },
  { key: 'journal',      label: 'Diário',      emoji: '📓' },
  { key: 'sleep',        label: 'Sono',        emoji: '🌙' },
  { key: 'finance',      label: 'Finanças',    emoji: '💰' },
  { key: 'reading',      label: 'Mídia',       emoji: '📚' },
  { key: 'calendar',     label: 'Calendário',  emoji: '📅' }
]

const ALL_SECTIONS_ORDER = [
  { key: 'dashboard',    label: 'Dashboard',   emoji: '🏠' },
  { key: 'habits',       label: 'Hábitos',     emoji: '✅' },
  { key: 'gym',          label: 'Academia',    emoji: '🏋️' },
  { key: 'addictions',   label: 'Vícios',      emoji: '🛡️' },
  { key: 'goals',        label: 'Metas',       emoji: '🎯' },
  { key: 'achievements', label: 'Conquistas',  emoji: '🏆' },
  { key: 'journal',      label: 'Diário',      emoji: '📓' },
  { key: 'sleep',        label: 'Sono',        emoji: '🌙' },
  { key: 'finance',      label: 'Finanças',    emoji: '💰' },
  { key: 'reading',      label: 'Mídia',       emoji: '📚' },
  { key: 'calendar',     label: 'Calendário',  emoji: '📅' }
]

const RESET_SECTIONS = [
  { key: 'habits',      label: 'Hábitos e completamentos' },
  { key: 'gym',         label: 'Treinos e bioimpedância' },
  { key: 'gym_programs',label: 'Programas de treino' },
  { key: 'addictions',  label: 'Vícios e relapsos' },
  { key: 'goals',       label: 'Metas e tarefas' },
  { key: 'journal',     label: 'Diário' },
  { key: 'sleep',       label: 'Registro de sono' },
  { key: 'finance',     label: 'Finanças' },
  { key: 'media',       label: 'Leitura & Mídia' },
  { key: 'xp',          label: 'XP e nível' },
  { key: 'achievements',label: 'Conquistas' }
]

function getTheme(): string { return localStorage.getItem('habitos_theme') || 'dark' }
function getAccent(): string { return localStorage.getItem('habitos_accent') || '#7c3aed' }
function getReduceMotion(): boolean { return localStorage.getItem('habitos_reduce_motion') === '1' }
function getHiddenSections(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]') } catch { return [] }
}
function getStoredOrder(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_section_order') || '[]') } catch { return [] }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
function rgbToHex(r: number, g: number, b: number): string {
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

export default function Settings(): React.JSX.Element {
  const { user } = useAuth()
  const [notif, setNotif] = useState<NotifSettings>({ enabled: false, hour: 20, minute: 0 })
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'blocked'>('idle')
  const [theme, setTheme] = useState(getTheme)
  const [accent, setAccent] = useState(getAccent)
  const [hiddenSections, setHiddenSections] = useState<string[]>(getHiddenSections)
  const [reduceMotion, setReduceMotion] = useState(getReduceMotion)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [excelExporting, setExcelExporting] = useState(false)
  const [excelStatus, setExcelStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const now = new Date()
  const [excelYear, setExcelYear] = useState(now.getFullYear())
  const [excelMonth, setExcelMonth] = useState(now.getMonth() + 1)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const importInputRef = useRef<HTMLInputElement>(null)
  const [resetTarget, setResetTarget] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [syncConfirm, setSyncConfirm] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [syncCounts, setSyncCounts] = useState<Record<string, number> | null>(null)

  const [partialSyncing, setPartialSyncing] = useState(false)
  const [partialSyncStatus, setPartialSyncStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [partialSyncError, setPartialSyncError] = useState('')
  const [partialSyncCounts, setPartialSyncCounts] = useState<Record<string, number> | null>(null)

  const isDesktop = !!window.electronAuth
  const isMobileApp = !isDesktop && !window.__demoMode__

  // Profile name
  const [profileName, setProfileName] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  // Section order (drag-and-drop)
  const defaultOrder = ALL_SECTIONS_ORDER.map(s => s.key)
  const [sectionOrder, setSectionOrder] = useState<string[]>(() => {
    const stored = getStoredOrder()
    const allKeys = ALL_SECTIONS_ORDER.map(s => s.key)
    if (!stored.length) return allKeys
    const merged = stored.filter(k => allKeys.includes(k))
    const added = allKeys.filter(k => !merged.includes(k))
    return [...merged, ...added]
  })
  const dragIndexRef = useRef<number | null>(null)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  // Color animation
  const accentAnimRef = useRef<number | null>(null)
  const accentFallbackRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const displayedAccentRef = useRef(getAccent())

  useEffect(() => {
    window.api.notifications.getSettings().then((s) => setNotif(s as NotifSettings))
    window.api.profile.get().then((p: any) => setProfileName(p?.name || ''))
  }, [])

  // ── Profile name ─────────────────────────────────────────────────────────
  async function handleSaveName() {
    const trimmed = profileName.trim()
    if (!trimmed) return
    await window.api.profile.updateName(trimmed)
    setEditingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2500)
  }

  // ── Theme ─────────────────────────────────────────────────────────────────
  function applyTheme(t: string) {
    setTheme(t)
    localStorage.setItem('habitos_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  // ── Accent color (animated) ───────────────────────────────────────────────
  function animateAccent(toHex: string) {
    setAccent(toHex)
    localStorage.setItem('habitos_accent', toHex)
    if (accentAnimRef.current) cancelAnimationFrame(accentAnimRef.current)
    if (accentFallbackRef.current) clearTimeout(accentFallbackRef.current)
    const fromHex = displayedAccentRef.current
    if (fromHex === toHex) {
      document.documentElement.style.setProperty('--accent-purple', toHex)
      return
    }
    const start = performance.now()
    const duration = 550
    const [r1, g1, b1] = hexToRgb(fromHex)
    const [r2, g2, b2] = hexToRgb(toHex)
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const color = rgbToHex(
        Math.round(r1 + (r2-r1)*ease),
        Math.round(g1 + (g2-g1)*ease),
        Math.round(b1 + (b2-b1)*ease)
      )
      displayedAccentRef.current = color
      document.documentElement.style.setProperty('--accent-purple', color)
      if (t < 1) accentAnimRef.current = requestAnimationFrame(step)
      else accentAnimRef.current = null
    }
    accentAnimRef.current = requestAnimationFrame(step)
    // Safety net: some Android WebViews stall requestAnimationFrame (e.g. when the
    // view isn't fully composited yet), which would leave the accent stuck mid-transition.
    accentFallbackRef.current = setTimeout(() => {
      if (displayedAccentRef.current !== toHex) {
        displayedAccentRef.current = toHex
        document.documentElement.style.setProperty('--accent-purple', toHex)
      }
    }, duration + 150)
  }

  function handlePickerInput(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value
    if (accentAnimRef.current) { cancelAnimationFrame(accentAnimRef.current); accentAnimRef.current = null }
    displayedAccentRef.current = color
    document.documentElement.style.setProperty('--accent-purple', color)
    setAccent(color)
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const color = e.target.value
    displayedAccentRef.current = color
    localStorage.setItem('habitos_accent', color)
    setAccent(color)
  }

  // ── Reduce motion ─────────────────────────────────────────────────────────
  function toggleReduceMotion() {
    const next = !reduceMotion
    setReduceMotion(next)
    localStorage.setItem('habitos_reduce_motion', next ? '1' : '0')
    if (next) document.documentElement.setAttribute('data-reduce-motion', '1')
    else document.documentElement.removeAttribute('data-reduce-motion')
  }

  // ── Section visibility ────────────────────────────────────────────────────
  function toggleSection(key: string) {
    const next = hiddenSections.includes(key)
      ? hiddenSections.filter(k => k !== key)
      : [...hiddenSections, key]
    setHiddenSections(next)
    localStorage.setItem('habitos_hidden_sections', JSON.stringify(next))
    window.dispatchEvent(new Event('habitos_sections_changed'))
  }

  // ── Section order (DnD) ───────────────────────────────────────────────────
  function handleDragStart(idx: number) {
    dragIndexRef.current = idx
    setDraggingIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, targetIdx: number) {
    e.preventDefault()
    const sourceIdx = dragIndexRef.current
    if (sourceIdx === null || sourceIdx === targetIdx) return
    dragIndexRef.current = targetIdx
    setDraggingIdx(targetIdx)
    setSectionOrder(prev => {
      const next = [...prev]
      const [item] = next.splice(sourceIdx, 1)
      next.splice(targetIdx, 0, item)
      return next
    })
  }

  function handleDragEnd() {
    dragIndexRef.current = null
    setDraggingIdx(null)
    localStorage.setItem('habitos_section_order', JSON.stringify(sectionOrder))
    window.dispatchEvent(new Event('habitos_sections_changed'))
  }

  function resetOrder() {
    setSectionOrder(defaultOrder)
    localStorage.setItem('habitos_section_order', JSON.stringify(defaultOrder))
    window.dispatchEvent(new Event('habitos_sections_changed'))
  }

  // ── Notifications ─────────────────────────────────────────────────────────
  async function handleNotifSave() {
    await window.api.notifications.saveSettings(notif)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest() {
    const result = await window.api.notifications.test()
    setTestStatus(result.sent ? 'sent' : 'blocked')
    setTimeout(() => setTestStatus('idle'), 5000)
  }

  // ── Export / Import / Reset ───────────────────────────────────────────────
  async function handleExport() {
    setExporting(true)
    const json = await window.api.app.exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitos-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
    setExportDone(true)
    setTimeout(() => setExportDone(false), 3000)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportStatus('idle')
    try {
      const text = await file.text()
      JSON.parse(text)
      await window.api.app.importData(text)
      setImportStatus('done')
    } catch {
      setImportStatus('error')
    } finally {
      setImporting(false)
      if (importInputRef.current) importInputRef.current.value = ''
      setTimeout(() => setImportStatus('idle'), 4000)
    }
  }

  async function handleExportExcel() {
    setExcelExporting(true)
    setExcelStatus('idle')
    try {
      const result = await window.api.app.exportExcel(excelYear, excelMonth)
      setExcelStatus(result?.success ? 'done' : 'idle')
    } catch {
      setExcelStatus('error')
    } finally {
      setExcelExporting(false)
      setTimeout(() => setExcelStatus('idle'), 4000)
    }
  }

  async function handleSyncToCloud() {
    if (!user || !syncConfirm) return
    setSyncing(true)
    setSyncStatus('idle')
    setSyncError('')
    setSyncCounts(null)
    const result = await syncDesktopToCloud(user.id)
    setSyncing(false)
    if (result.success) {
      setSyncStatus('done')
      setSyncCounts(result.counts ?? null)
      localStorage.setItem('habitos_sqlite_migrated', '1')
      setTimeout(() => { setSyncStatus('idle'); setSyncConfirm(false) }, 6000)
    } else {
      setSyncStatus('error')
      setSyncError(result.error ?? 'Erro desconhecido')
      setTimeout(() => setSyncStatus('idle'), 8000)
    }
  }

  async function handlePartialSync() {
    if (!user) return
    setPartialSyncing(true)
    setPartialSyncStatus('idle')
    setPartialSyncError('')
    setPartialSyncCounts(null)
    const result = await syncFinanceAndCalendarToCloud(user.id)
    setPartialSyncing(false)
    if (result.success) {
      setPartialSyncStatus('done')
      setPartialSyncCounts(result.counts ?? null)
      setTimeout(() => setPartialSyncStatus('idle'), 8000)
    } else {
      setPartialSyncStatus('error')
      setPartialSyncError(result.error ?? 'Erro desconhecido')
      setTimeout(() => setPartialSyncStatus('idle'), 8000)
    }
  }

  async function handleReset() {
    if (!resetTarget || !resetConfirm) return
    await window.api.app.resetSection(resetTarget)
    setResetTarget('')
    setResetConfirm(false)
    setResetDone(true)
    setTimeout(() => setResetDone(false), 3000)
  }

  const hourStr = String(notif.hour).padStart(2, '0')
  const minStr = String(notif.minute).padStart(2, '0')

  const orderedSectionItems = sectionOrder
    .map(key => ALL_SECTIONS_ORDER.find(s => s.key === key))
    .filter(Boolean) as typeof ALL_SECTIONS_ORDER

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-text-secondary text-sm mt-1">Edite seu perfil, organize as seções do menu e ajuste preferências do app</p>
      </div>

      {/* ── Perfil ──────────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <User size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Perfil</h2>
          {nameSaved && (
            <span className="ml-auto flex items-center gap-1 text-accent-green text-xs font-medium animate-bounce-in">
              <Check size={13} /> Nome salvo!
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {editingName ? (
            <>
              <input
                autoFocus
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="flex-1 bg-bg-primary border border-accent-purple/50 text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
                placeholder="Seu nome..."
              />
              <button onClick={handleSaveName} className="px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
                Salvar
              </button>
              <button onClick={() => setEditingName(false)} className="px-3 py-2 border border-bg-border text-text-muted hover:text-text-primary rounded-lg text-sm transition-colors">
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-text-primary font-medium">{profileName || '—'}</span>
              <button onClick={() => setEditingName(true)} className="px-4 py-2 border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-border rounded-lg text-sm transition-colors">
                Editar nome
              </button>
            </>
          )}
        </div>
        {!window.__demoMode__ && (
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-bg-border">
            <MonitorPlay size={18} className="text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Modo Demo</p>
              <p className="text-xs text-text-muted">Abre uma janela com dados fictícios para demonstração</p>
            </div>
            <button
              onClick={() => window.api.demo.open()}
              className="flex items-center gap-2 px-4 py-2 bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 text-accent-purple text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <MonitorPlay size={15} />
              Abrir Demo
            </button>
          </div>
        )}
        {!window.__demoMode__ && (
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-bg-border">
            <Sparkles size={18} className="text-text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">Tutorial</p>
              <p className="text-xs text-text-muted">Reveja a explicação de cada seção e o que ela faz</p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event('habitos-replay-tutorial'))}
              className="flex items-center gap-2 px-4 py-2 bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 text-accent-purple text-sm font-medium rounded-lg transition-colors shrink-0"
            >
              <Sparkles size={15} />
              Ver tutorial
            </button>
          </div>
        )}
      </div>

      {/* ── Aparência ───────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Palette size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Aparência</h2>
        </div>

        {/* Tema */}
        <div>
          <p className="text-sm text-text-secondary mb-2">Tema</p>
          <div className="flex gap-2">
            {[['dark','🌑 Escuro'],['light','☀️ Claro']].map(([t, l]) => (
              <button key={t} onClick={() => applyTheme(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  theme === t ? 'border-accent-purple bg-accent-purple/20 text-text-primary' : 'border-bg-border text-text-muted hover:bg-bg-border'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Cor de destaque */}
        <div>
          <p className="text-sm text-text-secondary mb-2">Cor de destaque</p>
          <div className="flex gap-2 flex-wrap items-center">
            {ACCENT_PRESETS.map(p => (
              <button key={p.value} onClick={() => animateAccent(p.value)} title={p.label}
                className={`w-8 h-8 rounded-full transition-all border-2 ${
                  accent === p.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: p.value }} />
            ))}
            {/* Color picker livre */}
            <label className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-dashed border-bg-border hover:border-accent-purple/60 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              title="Cor personalizada">
              <span className="text-xs text-text-muted select-none">+</span>
              <input type="color" value={accent}
                onInput={handlePickerInput}
                onChange={handlePickerChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
            <span className="text-xs text-text-muted font-mono ml-1">{accent}</span>
          </div>
        </div>

        {/* Animações */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary font-medium flex items-center gap-2">
              <Sparkles size={14} className="text-accent-purple" />
              Animações
            </p>
            <p className="text-xs text-text-muted mt-0.5">Desativar para interface mais estática</p>
          </div>
          <div onClick={toggleReduceMotion} className="cursor-pointer"
            title={reduceMotion ? 'Animações desativadas' : 'Animações ativas'}>
            <div className={`relative w-11 h-6 rounded-full transition-colors ${!reduceMotion ? 'bg-accent-purple' : 'bg-bg-border'}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${!reduceMotion ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Ordem das seções (desktop only — mobile usa bottom nav fixo) ── */}
      {!isMobileApp && <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <GripVertical size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary flex-1">Ordem das seções</h2>
          <button onClick={resetOrder} className="text-xs text-text-muted hover:text-text-secondary transition-colors border border-bg-border rounded-lg px-2 py-1">
            Resetar
          </button>
        </div>
        <p className="text-sm text-text-secondary">Arraste para reordenar as seções no menu lateral.</p>
        <div className="space-y-1.5">
          {orderedSectionItems.map((s, idx) => (
            <div
              key={s.key}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-grab active:cursor-grabbing transition-all select-none ${
                draggingIdx === idx
                  ? 'border-accent-purple/60 bg-accent-purple/10 shadow-lg scale-[1.02]'
                  : 'border-bg-border bg-bg-primary hover:border-bg-border/80 hover:bg-bg-border/30'
              }`}
            >
              <GripVertical size={15} className="text-text-muted shrink-0" />
              <span className="text-base">{s.emoji}</span>
              <span className="text-sm font-medium text-text-primary flex-1">{s.label}</span>
              <span className="text-xs text-text-muted">{idx + 1}</span>
            </div>
          ))}
        </div>
      </div>}

      {/* ── Seções visíveis ──────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Eye size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Seções visíveis</h2>
        </div>
        <p className="text-sm text-text-secondary">Escolha quais seções aparecem no menu lateral.</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SECTIONS.map(s => {
            const hidden = hiddenSections.includes(s.key)
            return (
              <button key={s.key} onClick={() => toggleSection(s.key)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-left min-w-0 ${
                  hidden ? 'border-bg-border text-text-muted bg-bg-primary' : 'border-accent-purple/40 bg-accent-purple/10 text-text-primary'
                }`}>
                <span className="shrink-0">{s.emoji}</span>
                <span className="text-sm font-medium flex-1 truncate">{s.label}</span>
                {hidden ? <EyeOff size={13} className="shrink-0" /> : <Eye size={13} className="shrink-0 text-accent-purple" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Lembrete diário ─────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Lembrete diário</h2>
        </div>
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div onClick={() => setNotif(s => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${notif.enabled ? 'bg-accent-purple' : 'bg-bg-border'}`}>
            <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${notif.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-text-primary">{notif.enabled ? 'Ativado' : 'Desativado'}</span>
          {notif.enabled ? <Bell size={15} className="text-accent-purple" /> : <BellOff size={15} className="text-text-secondary" />}
        </label>
        {notif.enabled && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm text-text-secondary shrink-0">Horário:</label>
            <div className="flex items-center gap-2 shrink-0">
              <select value={notif.hour} onChange={e => setNotif(s => ({ ...s, hour: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2,'0')}</option>)}
              </select>
              <span className="text-text-primary font-semibold">:</span>
              <select value={notif.minute} onChange={e => setNotif(s => ({ ...s, minute: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => <option key={m} value={m}>{String(m).padStart(2,'0')}</option>)}
              </select>
            </div>
            <span className="text-text-muted text-xs">Todo dia às {hourStr}:{minStr}</span>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleNotifSave} className="flex-1 sm:flex-none px-4 py-2.5 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors text-center">
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
          {notif.enabled && (
            <button onClick={handleTest} className="flex items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2.5 bg-bg-border hover:bg-bg-border/70 text-text-primary text-sm font-medium rounded-lg transition-colors">
              <Send size={14} />
              {testStatus === 'sent' ? 'Enviada!' : 'Testar'}
            </button>
          )}
        </div>
        {testStatus === 'blocked' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-950/30 border border-yellow-700/40 rounded-lg">
            <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Notificações bloqueadas. Verifique em <span className="font-medium">Configurações do Windows → Sistema → Notificações</span>.
            </p>
          </div>
        )}
      </div>

      {/* ── Exportar ────────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Download size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Exportar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Exporta todos os seus dados (hábitos, treinos, metas, diário, sono e mais) como um arquivo JSON.
        </p>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Download size={14} />
          {exportDone ? 'Download iniciado!' : exporting ? 'Exportando...' : 'Baixar backup JSON'}
        </button>
      </div>

      {/* ── Restaurar Finanças e Calendário do SQLite local ── */}
      {isDesktop && (
        <div className="bg-bg-secondary border border-accent-blue/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Cloud size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-text-primary">Restaurar Finanças e Calendário</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Sincroniza apenas os dados de <strong>Finanças</strong> e <strong>Calendário</strong> do banco local (SQLite) para a nuvem.{' '}
            <span className="text-accent-green font-medium">Os hábitos, treinos e outros dados na nuvem não são afetados.</span>
          </p>
          <button
            onClick={handlePartialSync}
            disabled={partialSyncing || !user}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Cloud size={14} />
            {partialSyncing ? 'Restaurando...' : partialSyncStatus === 'done' ? '✓ Restaurado!' : partialSyncStatus === 'error' ? 'Erro ao restaurar' : 'Restaurar agora'}
          </button>
          {partialSyncStatus === 'done' && partialSyncCounts && (
            <div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
              <p className="text-xs text-accent-blue font-medium mb-1">Dados restaurados:</p>
              <p className="text-xs text-text-secondary">
                {Object.entries(partialSyncCounts)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
            </div>
          )}
          {partialSyncStatus === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/40 rounded-lg">
              <AlertTriangle size={15} className="text-accent-red shrink-0 mt-0.5" />
              <p className="text-xs text-accent-red">{partialSyncError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Sincronização SQLite → Nuvem (somente desktop) ── */}
      {isDesktop && (
        <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Cloud size={20} className="text-accent-blue" />
            <h2 className="text-lg font-semibold text-text-primary">Sincronizar dados locais para a Nuvem</h2>
          </div>
          <p className="text-sm text-text-secondary">
            Envia todos os seus dados locais (SQLite) para o Supabase, substituindo os dados na nuvem.{' '}
            <span className="text-accent-red font-medium">Os dados atuais na nuvem serão substituídos pelos dados locais.</span>
          </p>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={syncConfirm} onChange={e => setSyncConfirm(e.target.checked)} className="accent-accent-blue" />
            <span className="text-sm text-text-secondary">Confirmo que quero sobrescrever os dados na nuvem com os dados locais</span>
          </label>
          <button
            onClick={handleSyncToCloud}
            disabled={syncing || !syncConfirm || !user}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue/15 hover:bg-accent-blue/25 text-accent-blue border border-accent-blue/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Cloud size={14} />
            {syncing ? 'Sincronizando...' : syncStatus === 'done' ? '✓ Sincronizado!' : syncStatus === 'error' ? 'Erro ao sincronizar' : 'Sincronizar agora'}
          </button>
          {syncStatus === 'done' && syncCounts && (
            <div className="p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
              <p className="text-xs text-accent-blue font-medium mb-1">Dados migrados:</p>
              <p className="text-xs text-text-secondary">
                {Object.entries(syncCounts)
                  .filter(([, v]) => v > 0)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
            </div>
          )}
          {syncStatus === 'error' && (
            <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/40 rounded-lg">
              <AlertTriangle size={15} className="text-accent-red shrink-0 mt-0.5" />
              <p className="text-xs text-accent-red">{syncError}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Importar ────────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Upload size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Importar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Restaura um backup JSON. <span className="text-accent-red font-medium">Todos os dados atuais serão substituídos.</span>
        </p>
        <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <button onClick={() => importInputRef.current?.click()} disabled={importing}
          className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple border border-accent-purple/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          <Upload size={14} />
          {importing ? 'Importando...' : importStatus === 'done' ? 'Importado!' : importStatus === 'error' ? 'Arquivo inválido' : 'Selecionar backup JSON'}
        </button>
        {importStatus === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/40 rounded-lg">
            <AlertTriangle size={15} className="text-accent-red shrink-0 mt-0.5" />
            <p className="text-xs text-accent-red">O arquivo selecionado não é um backup válido.</p>
          </div>
        )}
      </div>

      {/* ── Resetar ─────────────────────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trash2 size={20} className="text-accent-red" />
          <h2 className="text-lg font-semibold text-text-primary">Resetar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Remove permanentemente todos os dados de uma seção específica. Ação irreversível.
        </p>
        <select value={resetTarget} onChange={e => { setResetTarget(e.target.value); setResetConfirm(false) }}
          className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-red">
          <option value="">Selecionar seção...</option>
          {RESET_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {resetTarget && (
          <label className="flex items-start gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={resetConfirm} onChange={e => setResetConfirm(e.target.checked)} className="accent-accent-red mt-0.5 shrink-0" />
            <span className="text-sm text-accent-red break-words">
              Confirmo que quero apagar permanentemente "{RESET_SECTIONS.find(s => s.key === resetTarget)?.label}"
            </span>
          </label>
        )}
        {resetTarget && (
          <button onClick={handleReset} disabled={!resetConfirm}
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-red-950/30 hover:bg-red-950/50 text-accent-red border border-accent-red/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-40">
            <Trash2 size={14} />
            {resetDone ? 'Dados apagados!' : 'Resetar dados'}
          </button>
        )}
      </div>

      {/* ── Exportar relatório Excel ─────────────────────────────────────────── */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-4 sm:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Download size={20} className="text-accent-green" />
          <h2 className="text-lg font-semibold text-text-primary">Relatório Excel</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Gera um arquivo <span className="font-medium text-text-primary">.xlsx</span> com hábitos, sono, academia e finanças do mês selecionado.
        </p>
        <div className="flex flex-col gap-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="text-xs text-text-muted block mb-1">Mês</label>
              <select
                value={excelMonth}
                onChange={e => setExcelMonth(Number(e.target.value))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green"
              >
                {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-text-muted block mb-1">Ano</label>
              <select
                value={excelYear}
                onChange={e => setExcelYear(Number(e.target.value))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-green"
              >
                {[now.getFullYear() - 1, now.getFullYear()].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            disabled={excelExporting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-accent-green/15 hover:bg-accent-green/25 border border-accent-green/30 text-accent-green text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={15} />
            {excelExporting ? 'Gerando...' : excelStatus === 'done' ? '✓ Exportado!' : excelStatus === 'error' ? 'Erro ao exportar' : 'Exportar Excel'}
          </button>
        </div>
      </div>
    </div>
  )
}
