import { create } from 'zustand'
import { STORAGE_KEYS } from '@/lib/constants'
import { readStorage, removeStorage, writeStorage } from '@/lib/storage/localStorage'
import type { AuthSession } from '@/types/auth'

interface AuthState {
  session: AuthSession | null
  setSession: (session: AuthSession) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: readStorage<AuthSession | null>(STORAGE_KEYS.auth, null),
  setSession: (session) => {
    writeStorage(STORAGE_KEYS.auth, session)
    set({ session })
  },
  clearSession: () => {
    removeStorage(STORAGE_KEYS.auth)
    set({ session: null })
  },
}))
