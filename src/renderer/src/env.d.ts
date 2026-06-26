export {}

declare global {
  interface Window {
    api?: {
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
        updateName: (name: string) => Promise<boolean>
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
        check: () => Promise<string[]>
      }
      habits: {
        list: () => Promise<unknown[]>
        dueToday: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        update: (id: number, data: object) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        toggleActive: (id: number, active: boolean) => Promise<boolean>
        complete: (habitId: number, date: string) => Promise<boolean>
        uncomplete: (habitId: number, date: string) => Promise<boolean>
        completions: (habitId: number) => Promise<{ completed_at: string }[]>
        completionsRange: (start: string, end: string) => Promise<unknown[]>
        completionsByMonth: (year: number, month: number) => Promise<{ completed_at: string; habit_id: number; color: string }[]>
        streak: (habitId: number) => Promise<number>
      }
      gym: {
        listWorkouts: (limit?: number) => Promise<unknown[]>
        createWorkout: (data: object) => Promise<number>
        deleteWorkout: (id: number) => Promise<boolean>
        listBioimpedance: () => Promise<unknown[]>
        addBioimpedance: (data: object) => Promise<number>
        deleteBioimpedance: (id: number) => Promise<boolean>
      }
      gymPrograms: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        delete: (id: number) => Promise<boolean>
        update: (id: number, data: object) => Promise<boolean>
        exerciseHistory: (name: string) => Promise<unknown[]>
        exerciseNames: () => Promise<string[]>
      }
      gymPhases: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        update: (id: number, data: object) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
      }
      addictions: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        relapse: (id: number, note?: string, relapseAt?: string) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        toggleHidden: (id: number) => Promise<boolean>
        checkMilestones: () => Promise<string[]>
      }
      goals: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        update: (id: number, data: object) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        addTask: (goalId: number, title: string) => Promise<number>
        completeTask: (taskId: number, completed: boolean) => Promise<boolean>
        deleteTask: (taskId: number) => Promise<boolean>
        updateTask: (taskId: number, title: string) => Promise<boolean>
        complete: (id: number) => Promise<boolean>
      }
      goalFolders: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        update: (id: number, data: object) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
      }
      calendar: {
        eventsByMonth: (year: number, month: number) => Promise<unknown[]>
        eventsByRange?: (from: string, to: string) => Promise<unknown[]>
        createEvent: (data: object) => Promise<unknown>
        linkDevice?: (id: number, deviceEventId: string) => Promise<void>
        toggleDone: (id: number) => Promise<void>
        deleteEvent: (id: number) => Promise<void>
        getNote: (date: string) => Promise<{ content: string } | null>
        saveNote: (date: string, content: string) => Promise<void>
        notesByMonth: (year: number, month: number) => Promise<{ date: string }[]>
      }
      journal: {
        get: (date: string) => Promise<{ id: number; date: string; content: string; mood: number } | null>
        recent: (limit?: number) => Promise<unknown[]>
        save: (data: { date: string; content: string; mood: number }) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        byMonth: (year: number, month: number) => Promise<unknown[]>
      }
      sleep: {
        get: (date: string) => Promise<{ id: number; date: string; bedtime: string; wake_time: string; quality: number; notes?: string; cycles?: number | null } | null>
        recent: (limit?: number) => Promise<unknown[]>
        save: (data: { date: string; bedtime: string; wake_time: string; quality: number; notes?: string; cycles?: number | null }) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
      }
      finance: {
        categories: {
          list: () => Promise<unknown[]>
          create: (data: object) => Promise<number>
          delete: (id: number) => Promise<boolean>
        }
        bills: {
          list: () => Promise<unknown[]>
          create: (data: object) => Promise<number>
          delete: (id: number) => Promise<boolean>
          toggleActive: (id: number) => Promise<boolean>
          generateMonth: (year: number, month: number) => Promise<number>
        }
        accounts: {
          list: () => Promise<unknown[]>
          create: (data: object) => Promise<number>
          delete: (id: number) => Promise<boolean>
        }
        transactions: {
          list: (year: number, month: number) => Promise<unknown[]>
          create: (data: object) => Promise<number>
          delete: (id: number) => Promise<boolean>
          updateStatus: (id: number, status: string) => Promise<boolean>
          updateAmount: (id: number, amount: number) => Promise<boolean>
        }
        summary: (year: number, month: number) => Promise<{
          paidIncome: number; pendingIncome: number
          paidExpense: number; pendingExpense: number
          income: number; expense: number; balance: number
          currentBalance: number; projectedBalance: number
          nextMonthIncome: number; nextMonthExpense: number; nextMonthBalance: number
        }>
        ofx: { import: (content: string, accountId?: number) => Promise<{ imported: number; total: number }> }
        receipt: { parse: (base64: string, mimeType: string) => Promise<unknown> }
        backup: {
          check: () => Promise<{ shouldRemind: boolean }>
          dismiss: () => Promise<boolean>
        }
      }
      media: {
        list: () => Promise<unknown[]>
        create: (data: object) => Promise<number>
        update: (id: number, data: object) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        logSession: (data: object) => Promise<boolean>
        todayMinutes: (date: string) => Promise<number>
        logs: (mediaId: number) => Promise<unknown[]>
      }
      focus: {
        logSession: (data: { date: string; duration_minutes: number; label?: string }) => Promise<{ xp: number }>
        todayStats: (date: string) => Promise<{ sessions: number; minutes: number }>
        weekStats: (start: string, end: string) => Promise<{ sessions: number; minutes: number }>
        streak: () => Promise<number>
        history: (limit?: number) => Promise<unknown[]>
      }
      notifications: {
        getSettings: () => Promise<{ enabled: boolean; hour: number; minute: number }>
        saveSettings: (s: { enabled: boolean; hour: number; minute: number }) => Promise<boolean>
        test: () => Promise<{ sent: boolean }>
      }
      app: {
        exportData: () => Promise<string>
        importData: (json: string) => Promise<boolean>
        resetSection: (section: string) => Promise<boolean>
        exportExcel: (year: number, month: number) => Promise<{ success: boolean; path?: string }>
      }
      rocketLeague?: {
        search: (query: string) => Promise<unknown>
        getProfile: (platform: string, username: string) => Promise<unknown>
        addSession: (data: object) => Promise<number>
        listSessions: (limit?: number) => Promise<unknown[]>
        deleteSession: (id: number) => Promise<boolean>
        savePreset: (data: object) => Promise<number>
        listPresets: () => Promise<unknown[]>
        deletePreset: (id: number) => Promise<boolean>
        esportsEvents: () => Promise<{ ok: boolean; data?: unknown; error?: string }>
        esportsPlayers: () => Promise<{ ok: boolean; data?: unknown; error?: string }>
        twitchLive: (logins: string[]) => Promise<{ ok: boolean; data?: unknown[]; error?: string }>
        twitchOAuth: () => Promise<{ access_token: string; refresh_token: string; expires_in: number; user_id: string; user_login: string; user_name: string; profile_image_url: string }>
        twitchFollowed: (userToken: string, userId: string) => Promise<{ ok: boolean; followed?: unknown[]; streams?: unknown[]; error?: string }>
        openUrl: (url: string) => Promise<void>
      }
      volleyball?: {
        list: (limit?: number) => Promise<unknown[]>
        add: (data: object) => Promise<number>
        delete: (id: number) => Promise<boolean>
        stats: () => Promise<{ total: number; games: number; trainings: number; wins: number; losses: number }>
      }
      beachTennis?: {
        list: (limit?: number) => Promise<unknown[]>
        add: (data: object) => Promise<number>
        delete: (id: number) => Promise<boolean>
        stats: () => Promise<{ total: number; games: number; trainings: number; wins: number; losses: number }>
      }
      basketball?: {
        list: (limit?: number) => Promise<unknown[]>
        add: (data: object) => Promise<number>
        delete: (id: number) => Promise<boolean>
        stats: () => Promise<{ total: number; games: number; trainings: number; wins: number; losses: number; avgPoints: number; avgRebounds: number; avgAssists: number }>
      }
      demo: { open: () => Promise<void> }
      db: { setUser: (userId: string | null) => Promise<void> }
    }
    // Electron-only IPC API — exposed by preload as window.electronApi
    // Provides notifications, file export, demo mode, and other desktop-only features.
    // On mobile/Capacitor this is undefined; the mobileApi fallbacks handle that gracefully.
    electronApi?: Window['api']
    __demoMode__?: boolean
    electronAuth?: {
      openOAuthBrowser: (oauthUrl: string, port: number) => Promise<string | null>
      onDeepLink: (cb: (url: string) => void) => () => void
    }
    electronNav?: {
      onNavigate: (cb: (path: string, action?: string) => void) => () => void
    }
  }
}
