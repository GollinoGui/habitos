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
  }
}

contextBridge.exposeInMainWorld('api', api)

declare global {
  interface Window {
    api: typeof api
  }
}
