import React, { useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { RefreshCw, Smartphone } from 'lucide-react'
import CalendarSection from '../components/CalendarSection'
import { useAuth } from '../contexts/AuthContext'
import { isNativeCalendarAvailable, requestCalendarAccess, syncDeviceCalendar } from '../lib/nativeCalendarSync'

export default function Calendar(): React.JSX.Element {
  const { user } = useAuth()
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'done' | 'error'>('idle')
  const [syncMessage, setSyncMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  const nativeAvailable = isNativeCalendarAvailable()

  async function handleSyncDevice() {
    if (!window.api.calendar.eventsByRange) return
    setSyncing(true)
    setSyncStatus('idle')
    try {
      const granted = await requestCalendarAccess()
      if (!granted) {
        setSyncStatus('error')
        setSyncMessage('Permissão de calendário negada. Ative o acesso ao calendário nas configurações do Android.')
        return
      }
      const from = format(subDays(new Date(), 7), 'yyyy-MM-dd')
      const to = format(addDays(new Date(), 180), 'yyyy-MM-dd')
      const events = await window.api.calendar.eventsByRange(from, to) as Parameters<typeof syncDeviceCalendar>[0]
      const result = await syncDeviceCalendar(events, user?.email || 'habitos-app')
      setSyncStatus('done')
      setSyncMessage(`${result.exported} enviado(s), ${result.imported} importado(s), ${result.removedLocally} removido(s).`)
      setRefreshKey(k => k + 1)
    } catch (err) {
      setSyncStatus('error')
      setSyncMessage('Erro ao sincronizar: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncStatus('idle'), 8000)
    }
  }

  return (
    <div className="animate-fadeIn">
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Calendário</h1>
          <p className="text-text-secondary text-sm mt-1">Veja hábitos, treinos e eventos de cada dia em um só lugar</p>
        </div>
        {nativeAvailable && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleSyncDevice}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 bg-accent-purple/15 hover:bg-accent-purple/25 border border-accent-purple/30 text-accent-purple text-sm font-medium rounded-lg transition-colors disabled:opacity-60 shrink-0"
            >
              {syncing ? <RefreshCw size={14} className="animate-spin" /> : <Smartphone size={14} />}
              {syncing ? 'Sincronizando...' : 'Sincronizar com o celular'}
            </button>
            {syncStatus !== 'idle' && (
              <p className={`text-xs max-w-xs text-right ${syncStatus === 'error' ? 'text-accent-red' : 'text-accent-green'}`}>
                {syncMessage}
              </p>
            )}
          </div>
        )}
      </div>
      <CalendarSection refreshKey={refreshKey} />
    </div>
  )
}
