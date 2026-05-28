export {}

declare global {
  interface Window {
    api: {
      profile: {
        get: () => Promise<{
          id: number
          name: string
          total_xp: number
          level: number
          levelInfo: {
            current: { level: number; rank: string; xp: number }
            next: { level: number; rank: string; xp: number } | null
          }
          history: { id: number; amount: number; reason: string; created_at: string }[]
        }>
        updateName: (name: string) => Promise<void>
        grantXP: (amount: number, reason: string) => Promise<{
          total_xp: number
          levelInfo: {
            current: { level: number; rank: string; xp: number }
            next: { level: number; rank: string; xp: number } | null
          }
        }>
      }
      achievements: {
        list: () => Promise<unknown[]>
        check: () => Promise<void>
      }
      habits: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<unknown>
        update: (id: number, data: object) => Promise<unknown>
        delete: (id: number) => Promise<void>
        toggleActive: (id: number, active: boolean) => Promise<void>
        complete: (habitId: number, date: string) => Promise<unknown>
        uncomplete: (habitId: number, date: string) => Promise<void>
        completions: (habitId: number) => Promise<unknown[]>
        completionsRange: (start: string, end: string) => Promise<unknown[]>
        streak: (habitId: number) => Promise<number>
      }
      gym: {
        listWorkouts: (limit?: number) => Promise<unknown[]>
        createWorkout: (data: object) => Promise<unknown>
        deleteWorkout: (id: number) => Promise<void>
        listBioimpedance: () => Promise<unknown[]>
        addBioimpedance: (data: object) => Promise<unknown>
        deleteBioimpedance: (id: number) => Promise<void>
      }
      addictions: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<unknown>
        relapse: (id: number, note?: string) => Promise<void>
        delete: (id: number) => Promise<void>
        checkMilestones: () => Promise<void>
      }
      goals: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<unknown>
        update: (id: number, data: object) => Promise<unknown>
        delete: (id: number) => Promise<void>
        addTask: (goalId: number, title: string) => Promise<unknown>
        completeTask: (taskId: number, completed: boolean) => Promise<void>
        deleteTask: (taskId: number) => Promise<void>
        complete: (id: number) => Promise<void>
      }
    }
  }
}
