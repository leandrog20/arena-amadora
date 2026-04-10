import { create } from 'zustand'
import { api } from '@/services/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; username: string; password: string; displayName?: string }) => Promise<void>
  logout: () => Promise<void>
  fetchUser: () => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await api.post<{ data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/login',
      { email, password },
      { requireAuth: false }
    )

    localStorage.setItem('accessToken', response.data.accessToken)
    localStorage.setItem('refreshToken', response.data.refreshToken)

    set({
      user: response.data.user,
      isAuthenticated: true,
    })
  },

  register: async (data) => {
    const response = await api.post<{ data: { user: User; accessToken: string; refreshToken: string } }>(
      '/auth/register',
      data,
      { requireAuth: false }
    )

    localStorage.setItem('accessToken', response.data.accessToken)
    localStorage.setItem('refreshToken', response.data.refreshToken)

    set({
      user: response.data.user,
      isAuthenticated: true,
    })
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      await api.post('/auth/logout', { refreshToken })
    } catch {
      // ignore
    }

    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    api.invalidateCache()
    set({ user: null, isAuthenticated: false })

    if (typeof window !== 'undefined') {
      window.location.href = '/'
    }
  },

  fetchUser: async () => {
    try {
      const token = localStorage.getItem('accessToken')
      if (!token) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }

      // Se já tem user no store, não refaz a request
      const current = useAuthStore.getState()
      if (current.user && current.isAuthenticated) {
        set({ isLoading: false })
        return
      }

      const response = await api.get<{ data: User }>('/auth/me')
      set({ user: response.data, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}))
