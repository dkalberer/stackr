import { createContext } from 'react'
import type { AlertColor } from '@mui/material'

export interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void
  showSuccess: (message: string) => void
  showError: (message: string) => void
  showWarning: (message: string) => void
  showInfo: (message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
