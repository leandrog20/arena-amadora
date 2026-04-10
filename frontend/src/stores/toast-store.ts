import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading'

export interface Toast {
  id: string
  type: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  removeToast: (id: string) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  loading: (title: string, description?: string) => string
  dismiss: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++counter}`
    const newToast: Toast = { ...toast, id }
    set((state) => ({ toasts: [...state.toasts, newToast] }))

    if (toast.type !== 'loading') {
      const duration = toast.duration || 5000
      setTimeout(() => get().removeToast(id), duration)
    }

    return id
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
  },

  success: (title, description) => {
    get().addToast({ type: 'success', title, description })
  },

  error: (title, description) => {
    get().addToast({ type: 'error', title, description })
  },

  warning: (title, description) => {
    get().addToast({ type: 'warning', title, description })
  },

  info: (title, description) => {
    get().addToast({ type: 'info', title, description })
  },

  loading: (title, description) => {
    return get().addToast({ type: 'loading', title, description })
  },

  dismiss: (id) => get().removeToast(id),
}))
