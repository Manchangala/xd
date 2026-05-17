import { createContext } from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
}

export interface ToastContextValue {
  pushToast: (toast: Omit<Toast, 'id'>) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
