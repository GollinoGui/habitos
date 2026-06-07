import React, { useEffect, useRef, useState } from 'react'
import { Bell, BellOff, Send, AlertTriangle, Download, Upload, Trash2, Palette, Eye, EyeOff } from 'lucide-react'

interface NotifSettings { enabled: boolean; hour: number; minute: number }

const ACCENT_PRESETS = [
  { label: 'Roxo', value: '#7c3aed' },
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#10b981' },
  { label: 'Rosa', value: '#ec4899' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Vermelho', value: '#ef4444' }
]

const ALL_SECTIONS = [
  { key: 'habits', label: 'Hábitos', emoji: '✅' },
  { key: 'gym', label: 'Academia', emoji: '🏋️' },
  { key: 'addictions', label: 'Vícios', emoji: '🛡️' },
  { key: 'goals', label: 'Metas', emoji: '🎯' },
  { key: 'achievements', label: 'Conquistas', emoji: '🏆' },
  { key: 'journal', label: 'Diário', emoji: '📓' },
  { key: 'sleep', label: 'Sono', emoji: '🌙' },
  { key: 'finance', label: 'Finanças', emoji: '💰' },
  { key: 'reading', label: 'Leitura', emoji: '📚' },
  { key: 'calendar', label: 'Calendário', emoji: '📅' }
]

const RESET_SECTIONS = [
  { key: 'habits', label: 'Hábitos e completamentos' },
  { key: 'gym', label: 'Treinos e bioimpedância' },
  { key: 'gym_programs', label: 'Programas de treino' },
  { key: 'addictions', label: 'Vícios e relapsos' },
  { key: 'goals', label: 'Metas e tarefas' },
  { key: 'journal', label: 'Diário' },
  { key: 'sleep', label: 'Registro de sono' },
  { key: 'finance', label: 'Finanças' },
  { key: 'media', label: 'Leitura & Mídia' },
  { key: 'xp', label: 'XP e nível' },
  { key: 'achievements', label: 'Conquistas' }
]

function getTheme(): string { return localStorage.getItem('habitos_theme') || 'dark' }
function getAccent(): string { return localStorage.getItem('habitos_accent') || '#7c3aed' }
function getHiddenSections(): string[] {
  try { return JSON.parse(localStorage.getItem('habitos_hidden_sections') || '[]') } catch { return [] }
}

export default function Settings(): React.JSX.Element {
  const [notif, setNotif] = useState<NotifSettings>({ enabled: false, hour: 20, minute: 0 })
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'blocked'>('idle')
  const [theme, setTheme] = useState(getTheme)
  const [accent, setAccent] = useState(getAccent)
  const [hiddenSections, setHiddenSections] = useState<string[]>(getHiddenSections)
  const [exporting, setExporting] = useState(false)
  const [exportDone, setExportDone] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importStatus, setImportStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const importInputRef = useRef<HTMLInputElement>(null)
  const [resetTarget, setResetTarget] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  useEffect(() => {
    window.api.notifications.getSettings().then((s) => setNotif(s as NotifSettings))
  }, [])

  function applyTheme(t: string) {
    setTheme(t)
    localStorage.setItem('habitos_theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  function applyAccent(color: string) {
    setAccent(color)
    localStorage.setItem('habitos_accent', color)
    document.documentElement.style.setProperty('--accent-purple', color)
  }

  function toggleSection(key: string) {
    const next = hiddenSections.includes(key)
      ? hiddenSections.filter(k => k !== key)
      : [...hiddenSections, key]
    setHiddenSections(next)
    localStorage.setItem('habitos_hidden_sections', JSON.stringify(next))
    window.dispatchEvent(new Event('habitos_sections_changed'))
  }

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

  async function handleExport() {
    setExporting(true)
    const json = await window.api.app.exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `habitos-backup-${new Date().toISOString().slice(0, 10)}.json`
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

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>

      {/* Theme */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Palette size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Aparência</h2>
        </div>

        <div>
          <p className="text-sm text-text-secondary mb-2">Tema</p>
          <div className="flex gap-2">
            {[['dark', '🌑 Escuro'], ['light', '☀️ Claro']].map(([t, l]) => (
              <button
                key={t}
                onClick={() => applyTheme(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  theme === t ? 'border-accent-purple bg-accent-purple/20 text-text-primary' : 'border-bg-border text-text-muted hover:bg-bg-border'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm text-text-secondary mb-2">Cor de destaque</p>
          <div className="flex gap-2 flex-wrap">
            {ACCENT_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => applyAccent(p.value)}
                title={p.label}
                className={`w-8 h-8 rounded-full transition-all border-2 ${
                  accent === p.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: p.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Sections visibility */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Eye size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Seções visíveis</h2>
        </div>
        <p className="text-sm text-text-secondary">Escolha quais seções aparecem no menu lateral.</p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_SECTIONS.map(s => {
            const hidden = hiddenSections.includes(s.key)
            return (
              <button
                key={s.key}
                onClick={() => toggleSection(s.key)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${
                  hidden ? 'border-bg-border text-text-muted bg-bg-primary' : 'border-accent-purple/40 bg-accent-purple/10 text-text-primary'
                }`}
              >
                <span>{s.emoji}</span>
                <span className="text-sm font-medium flex-1">{s.label}</span>
                {hidden ? <EyeOff size={14} className="shrink-0" /> : <Eye size={14} className="shrink-0 text-accent-purple" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-5">
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
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-secondary">Horário:</label>
            <div className="flex items-center gap-2">
              <select value={notif.hour} onChange={e => setNotif(s => ({ ...s, hour: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-text-primary font-semibold">:</span>
              <select value={notif.minute} onChange={e => setNotif(s => ({ ...s, minute: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple">
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
            <span className="text-text-secondary text-sm">Todo dia às {hourStr}:{minStr}</span>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={handleNotifSave} className="px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors">
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
          {notif.enabled && (
            <button onClick={handleTest} className="flex items-center gap-2 px-4 py-2 bg-bg-border hover:bg-bg-border/70 text-text-primary text-sm font-medium rounded-lg transition-colors">
              <Send size={14} />
              {testStatus === 'sent' ? 'Enviada!' : 'Testar notificação'}
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

      {/* Export */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Download size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Exportar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Exporta todos os seus dados (hábitos, treinos, metas, diário, sono e mais) como um arquivo JSON.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-accent-green/20 hover:bg-accent-green/30 text-accent-green border border-accent-green/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Download size={14} />
          {exportDone ? 'Download iniciado!' : exporting ? 'Exportando...' : 'Baixar backup JSON'}
        </button>
      </div>

      {/* Import */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Upload size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Importar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Restaura um backup JSON. <span className="text-accent-red font-medium">Todos os dados atuais serão substituídos.</span>
        </p>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        <button
          onClick={() => importInputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-2 px-4 py-2 bg-accent-purple/20 hover:bg-accent-purple/30 text-accent-purple border border-accent-purple/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Upload size={14} />
          {importing ? 'Importando...' : importStatus === 'done' ? 'Importado com sucesso!' : importStatus === 'error' ? 'Arquivo inválido' : 'Selecionar backup JSON'}
        </button>
        {importStatus === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-700/40 rounded-lg">
            <AlertTriangle size={15} className="text-accent-red shrink-0 mt-0.5" />
            <p className="text-xs text-accent-red">O arquivo selecionado não é um backup válido.</p>
          </div>
        )}
      </div>

      {/* Reset */}
      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Trash2 size={20} className="text-accent-red" />
          <h2 className="text-lg font-semibold text-text-primary">Resetar dados</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Remove permanentemente todos os dados de uma seção específica. Ação irreversível.
        </p>
        <select
          value={resetTarget}
          onChange={e => { setResetTarget(e.target.value); setResetConfirm(false) }}
          className="w-full bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent-red"
        >
          <option value="">Selecionar seção...</option>
          {RESET_SECTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        {resetTarget && (
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={resetConfirm} onChange={e => setResetConfirm(e.target.checked)}
              className="accent-accent-red" />
            <span className="text-sm text-accent-red">
              Confirmo que quero apagar permanentemente os dados de "{RESET_SECTIONS.find(s => s.key === resetTarget)?.label}"
            </span>
          </label>
        )}
        {resetTarget && (
          <button
            onClick={handleReset}
            disabled={!resetConfirm}
            className="flex items-center gap-2 px-4 py-2 bg-red-950/30 hover:bg-red-950/50 text-accent-red border border-accent-red/30 text-sm font-medium rounded-lg transition-colors disabled:opacity-40"
          >
            <Trash2 size={14} />
            {resetDone ? 'Dados apagados!' : 'Resetar dados'}
          </button>
        )}
      </div>
    </div>
  )
}
