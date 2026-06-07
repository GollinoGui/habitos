import { contextBridge, ipcRenderer } from 'electron'

const api = {
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    updateName: (name: string) => ipcRenderer.invoke('profile:update-name', name),
    grantXP: (amount: number, reason: string) => ipcRenderer.invoke('profile:grant-xp', amount, reason)
  },
  achievements: {
    list: () => ipcRenderer.invoke('achievements:list'),
    check: () => ipcRenderer.invoke('achievements:check')
  },
  habits: {
    list: () => ipcRenderer.invoke('habits:list'),
    create: (data: object) => ipcRenderer.invoke('habits:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('habits:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('habits:delete', id),
    toggleActive: (id: number, active: boolean) => ipcRenderer.invoke('habits:toggle-active', id, active),
    complete: (habitId: number, date: string) => ipcRenderer.invoke('habits:complete', habitId, date),
    uncomplete: (habitId: number, date: string) => ipcRenderer.invoke('habits:uncomplete', habitId, date),
    completions: (habitId: number) => ipcRenderer.invoke('habits:completions', habitId),
    completionsRange: (start: string, end: string) => ipcRenderer.invoke('habits:completions-range', start, end),
    completionsByMonth: (year: number, month: number) => ipcRenderer.invoke('habits:completions-by-month', year, month),
    streak: (habitId: number) => ipcRenderer.invoke('habits:streak', habitId)
  },
  gym: {
    listWorkouts: (limit?: number) => ipcRenderer.invoke('gym:list-workouts', limit),
    createWorkout: (data: object) => ipcRenderer.invoke('gym:create-workout', data),
    deleteWorkout: (id: number) => ipcRenderer.invoke('gym:delete-workout', id),
    listBioimpedance: () => ipcRenderer.invoke('gym:list-bioimpedance'),
    addBioimpedance: (data: object) => ipcRenderer.invoke('gym:add-bioimpedance', data),
    deleteBioimpedance: (id: number) => ipcRenderer.invoke('gym:delete-bioimpedance', id)
  },
  addictions: {
    list: () => ipcRenderer.invoke('addictions:list'),
    create: (data: object) => ipcRenderer.invoke('addictions:create', data),
    relapse: (id: number, note?: string) => ipcRenderer.invoke('addictions:relapse', id, note),
    delete: (id: number) => ipcRenderer.invoke('addictions:delete', id),
    toggleHidden: (id: number) => ipcRenderer.invoke('addictions:toggle-hidden', id),
    checkMilestones: () => ipcRenderer.invoke('addictions:check-milestones')
  },
  goals: {
    list: () => ipcRenderer.invoke('goals:list'),
    create: (data: object) => ipcRenderer.invoke('goals:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('goals:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:delete', id),
    addTask: (goalId: number, title: string) => ipcRenderer.invoke('goals:add-task', goalId, title),
    completeTask: (taskId: number, completed: boolean) => ipcRenderer.invoke('goals:complete-task', taskId, completed),
    deleteTask: (taskId: number) => ipcRenderer.invoke('goals:delete-task', taskId),
    updateTask: (taskId: number, title: string) => ipcRenderer.invoke('goals:update-task', taskId, title),
    complete: (id: number) => ipcRenderer.invoke('goals:complete', id)
  },
  goalFolders: {
    list: () => ipcRenderer.invoke('goals:folders:list'),
    create: (data: object) => ipcRenderer.invoke('goals:folders:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('goals:folders:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('goals:folders:delete', id)
  },
  calendar: {
    eventsByMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:events-by-month', year, month),
    createEvent: (data: object) => ipcRenderer.invoke('calendar:create-event', data),
    toggleDone: (id: number) => ipcRenderer.invoke('calendar:toggle-done', id),
    deleteEvent: (id: number) => ipcRenderer.invoke('calendar:delete-event', id),
    getNote: (date: string) => ipcRenderer.invoke('calendar:get-note', date),
    saveNote: (date: string, content: string) => ipcRenderer.invoke('calendar:save-note', date, content),
    notesByMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:notes-by-month', year, month)
  },
  notifications: {
    getSettings: () => ipcRenderer.invoke('notifications:get-settings'),
    saveSettings: (s: { enabled: boolean; hour: number; minute: number }) =>
      ipcRenderer.invoke('notifications:save-settings', s),
    test: () => ipcRenderer.invoke('notifications:test')
  },
  journal: {
    get: (date: string) => ipcRenderer.invoke('journal:get', date),
    recent: (limit?: number) => ipcRenderer.invoke('journal:recent', limit),
    save: (data: { date: string; content: string; mood: number }) => ipcRenderer.invoke('journal:save', data),
    delete: (id: number) => ipcRenderer.invoke('journal:delete', id),
    byMonth: (year: number, month: number) => ipcRenderer.invoke('journal:by-month', year, month)
  },
  sleep: {
    get: (date: string) => ipcRenderer.invoke('sleep:get', date),
    recent: (limit?: number) => ipcRenderer.invoke('sleep:recent', limit),
    save: (data: { date: string; bedtime: string; wake_time: string; quality: number; notes?: string }) =>
      ipcRenderer.invoke('sleep:save', data),
    delete: (id: number) => ipcRenderer.invoke('sleep:delete', id)
  },
  finance: {
    categories: {
      list: () => ipcRenderer.invoke('finance:categories:list'),
      create: (data: object) => ipcRenderer.invoke('finance:categories:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:categories:delete', id)
    },
    transactions: {
      list: (year: number, month: number) => ipcRenderer.invoke('finance:transactions:list', year, month),
      create: (data: object) => ipcRenderer.invoke('finance:transactions:create', data),
      delete: (id: number) => ipcRenderer.invoke('finance:transactions:delete', id)
    },
    summary: (year: number, month: number) => ipcRenderer.invoke('finance:summary', year, month)
  },
  media: {
    list: () => ipcRenderer.invoke('media:list'),
    create: (data: object) => ipcRenderer.invoke('media:create', data),
    update: (id: number, data: object) => ipcRenderer.invoke('media:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('media:delete', id),
    logSession: (data: object) => ipcRenderer.invoke('media:log-session', data),
    todayMinutes: (date: string) => ipcRenderer.invoke('media:today-minutes', date),
    logs: (mediaId: number) => ipcRenderer.invoke('media:logs', mediaId)
  },
  gymPrograms: {
    list: () => ipcRenderer.invoke('gym:programs:list'),
    create: (data: object) => ipcRenderer.invoke('gym:programs:create', data),
    delete: (id: number) => ipcRenderer.invoke('gym:programs:delete', id),
    update: (id: number, data: object) => ipcRenderer.invoke('gym:programs:update', id, data)
  },
  app: {
    exportData: () => ipcRenderer.invoke('app:export-data'),
    importData: (json: string) => ipcRenderer.invoke('app:import-data', json),
    resetSection: (section: string) => ipcRenderer.invoke('app:reset-section', section)
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
