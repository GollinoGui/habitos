import React, { useEffect, useState } from 'react'
import { Bell, BellOff, Send, AlertTriangle } from 'lucide-react'

interface NotifSettings {
  enabled: boolean
  hour: number
  minute: number
}

export default function Settings(): React.JSX.Element {
  const [settings, setSettings] = useState<NotifSettings>({ enabled: false, hour: 20, minute: 0 })
  const [saved, setSaved] = useState(false)
  const [testStatus, setTestStatus] = useState<'idle' | 'sent' | 'blocked'>('idle')

  useEffect(() => {
    window.api.notifications.getSettings().then((s) => setSettings(s as NotifSettings))
  }, [])

  async function handleSave(): Promise<void> {
    await window.api.notifications.saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleTest(): Promise<void> {
    const result = await window.api.notifications.test()
    setTestStatus(result.sent ? 'sent' : 'blocked')
    setTimeout(() => setTestStatus('idle'), 5000)
  }

  const hourStr = String(settings.hour).padStart(2, '0')
  const minStr = String(settings.minute).padStart(2, '0')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>

      <div className="bg-bg-secondary border border-bg-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Bell size={20} className="text-accent-purple" />
          <h2 className="text-lg font-semibold text-text-primary">Lembrete diário</h2>
        </div>

        <p className="text-sm text-text-secondary">
          Receba uma notificação do Windows no horário escolhido para lembrar de registrar seus
          hábitos e completar tarefas do dia.
        </p>

        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => setSettings((s) => ({ ...s, enabled: !s.enabled }))}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-accent-purple' : 'bg-bg-border'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-sm text-text-primary">
            {settings.enabled ? 'Ativado' : 'Desativado'}
          </span>
          {settings.enabled ? (
            <Bell size={15} className="text-accent-purple" />
          ) : (
            <BellOff size={15} className="text-text-secondary" />
          )}
        </label>

        {settings.enabled && (
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-secondary">Horário:</label>
            <div className="flex items-center gap-2">
              <select
                value={settings.hour}
                onChange={(e) => setSettings((s) => ({ ...s, hour: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <span className="text-text-primary font-semibold">:</span>
              <select
                value={settings.minute}
                onChange={(e) => setSettings((s) => ({ ...s, minute: Number(e.target.value) }))}
                className="bg-bg-primary border border-bg-border text-text-primary rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-accent-purple"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-text-secondary text-sm">
              Todo dia às {hourStr}:{minStr}
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1 flex-wrap">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-accent-purple hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
          {settings.enabled && (
            <button
              onClick={handleTest}
              className="flex items-center gap-2 px-4 py-2 bg-bg-border hover:bg-bg-border/70 text-text-primary text-sm font-medium rounded-lg transition-colors"
            >
              <Send size={14} />
              {testStatus === 'sent' ? 'Notificação enviada!' : 'Testar notificação'}
            </button>
          )}
        </div>

        {testStatus === 'blocked' && (
          <div className="flex items-start gap-2 p-3 bg-yellow-950/30 border border-yellow-700/40 rounded-lg">
            <AlertTriangle size={15} className="text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300">
              Notificações não suportadas ou bloqueadas neste computador. Verifique em{' '}
              <span className="font-medium">Configurações do Windows → Sistema → Notificações</span>{' '}
              se o aplicativo tem permissão para enviar notificações.
            </p>
          </div>
        )}

        {settings.enabled && testStatus === 'idle' && (
          <p className="text-xs text-text-muted">
            Se a notificação não aparecer, verifique em{' '}
            <span className="font-medium text-text-secondary">Configurações do Windows → Sistema → Notificações</span>.
          </p>
        )}
      </div>
    </div>
  )
}
