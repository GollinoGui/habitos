import { create } from 'zustand'
import { format } from 'date-fns'
import { useProfileStore } from './profileStore'

export type FocusPhase = 'work' | 'break'

interface FocusStore {
  // Whether the Pomodoro panel is the active dashboard view.
  active: boolean
  phase: FocusPhase
  workMinutes: number
  breakMinutes: number
  running: boolean
  // Epoch ms when the current countdown should hit zero — only set while running.
  endsAt: number | null
  // Canonical "seconds left" value: live-computed from endsAt while running,
  // a frozen snapshot while paused. Kept in the store (not component state) so it
  // survives navigating to another page and back.
  remainingSeconds: number
  sessionsToday: number
  minutesToday: number
  streak: number
  statsLoaded: boolean
  xpToast: number | null

  enter: () => void
  exit: () => void
  start: () => void
  pause: () => void
  reset: () => void
  setWorkMinutes: (m: number) => void
  setBreakMinutes: (m: number) => void
  tick: () => void
  loadStats: () => Promise<void>
}

export const useFocusStore = create<FocusStore>((set, get) => ({
  active: false,
  phase: 'work',
  workMinutes: 25,
  breakMinutes: 5,
  running: false,
  endsAt: null,
  remainingSeconds: 25 * 60,
  sessionsToday: 0,
  minutesToday: 0,
  streak: 0,
  statsLoaded: false,
  xpToast: null,

  enter: () => {
    set({ active: true })
    if (!get().statsLoaded) get().loadStats()
  },

  exit: () => set({ active: false }),

  start: () => {
    const { running, remainingSeconds } = get()
    if (running || remainingSeconds <= 0) return
    set({ running: true, endsAt: Date.now() + remainingSeconds * 1000 })
  },

  pause: () => {
    const { running, endsAt } = get()
    if (!running || endsAt === null) return
    set({ running: false, endsAt: null, remainingSeconds: Math.max(0, Math.round((endsAt - Date.now()) / 1000)) })
  },

  reset: () => {
    set({ running: false, endsAt: null, phase: 'work', remainingSeconds: get().workMinutes * 60 })
  },

  setWorkMinutes: (m: number) => {
    set({ workMinutes: m })
    if (!get().running && get().phase === 'work') set({ remainingSeconds: m * 60 })
  },

  setBreakMinutes: (m: number) => {
    set({ breakMinutes: m })
    if (!get().running && get().phase === 'break') set({ remainingSeconds: m * 60 })
  },

  tick: () => {
    const { running, endsAt } = get()
    if (!running || endsAt === null) return
    const remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
    if (remaining <= 0) {
      completeFocusPhase(get, set)
    } else {
      set({ remainingSeconds: remaining })
    }
  },

  loadStats: async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const [stats, streak] = await Promise.all([window.api!.focus.todayStats(today), window.api!.focus.streak()])
    set({ sessionsToday: stats.sessions, minutesToday: stats.minutes, streak, statsLoaded: true })
  }
}))

async function completeFocusPhase(
  get: () => FocusStore,
  set: (partial: Partial<FocusStore>) => void
): Promise<void> {
  const { phase, workMinutes, breakMinutes } = get()
  set({ running: false, endsAt: null })

  if (phase === 'work') {
    const today = format(new Date(), 'yyyy-MM-dd')
    const result = await window.api!.focus.logSession({ date: today, duration_minutes: workMinutes })
    set({
      sessionsToday: get().sessionsToday + 1,
      minutesToday: get().minutesToday + workMinutes,
      xpToast: result.xp,
      phase: 'break',
      remainingSeconds: breakMinutes * 60
    })
    setTimeout(() => set({ xpToast: null }), 1500)
    useProfileStore.getState().fetchProfile()
    window.api!.focus.streak().then(streak => set({ streak }))
  } else {
    set({ phase: 'work', remainingSeconds: workMinutes * 60 })
  }
}
