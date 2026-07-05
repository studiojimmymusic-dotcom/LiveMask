import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import type { AspectRatio } from '../lib/aspect'
import type { Character } from '../types/character'
import type { Profile } from '../types/profile'

interface AppState {
  user: User | null
  session: Session | null
  profile: Profile | null

  characters: Character[]
  activeCharacter: Character | null

  virtualCamStatus: 'idle' | 'active' | 'error'
  aspectRatio: AspectRatio

  toast: string | null

  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  clearUser: () => void

  setCharacters: (characters: Character[]) => void
  setActiveCharacter: (character: Character | null) => void

  setVirtualCamStatus: (status: 'idle' | 'active' | 'error') => void
  setAspectRatio: (ratio: AspectRatio) => void

  setToast: (message: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  session: null,
  profile: null,

  characters: [],
  activeCharacter: null,

  virtualCamStatus: 'idle',
  aspectRatio: 'landscape',

  toast: null,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setProfile: (profile) => set({ profile }),
  clearUser: () =>
    set({
      user: null,
      session: null,
      profile: null,
      characters: [],
      activeCharacter: null
    }),

  setCharacters: (characters) => set({ characters }),
  setActiveCharacter: (character) => set({ activeCharacter: character }),

  setVirtualCamStatus: (status) => set({ virtualCamStatus: status }),
  setAspectRatio: (ratio) => set({ aspectRatio: ratio }),

  setToast: (message) => set({ toast: message })
}))
