import { create } from 'zustand'

interface LevelInfo {
  current: { level: number; rank: string; xp: number }
  next: { level: number; rank: string; xp: number } | null
}

interface Profile {
  id: number
  name: string
  total_xp: number
  level: number
  levelInfo: LevelInfo
  history: { id: number; amount: number; reason: string; created_at: string }[]
}

interface ProfileStore {
  profile: Profile | null
  loading: boolean
  fetchProfile: () => Promise<void>
  grantXP: (amount: number, reason: string) => Promise<void>
}

export const useProfileStore = create<ProfileStore>((set, get) => ({
  profile: null,
  loading: false,

  fetchProfile: async () => {
    set({ loading: true })
    const profile = await window.api.profile.get()
    set({ profile, loading: false })
  },

  grantXP: async (amount, reason) => {
    const result = await window.api.profile.grantXP(amount, reason)
    const current = get().profile
    if (current) {
      set({
        profile: {
          ...current,
          total_xp: result.total_xp,
          levelInfo: result.levelInfo
        }
      })
    }
  }
}))
