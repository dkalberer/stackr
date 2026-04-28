import { useState, useCallback, type ReactNode } from 'react'
import { Snackbar, Alert, type AlertColor } from '@mui/material'
import { ToastContext } from './ToastContext'

interface Toast {
  id: number
  message: string
  severity: AlertColor
}

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, severity: AlertColor = 'info') => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, severity }])
  }, [])

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const showError = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast])
  const showInfo = useCallback((message: string) => showToast(message, 'info'), [showToast])

  const handleClose = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open
          autoHideDuration={4000}
          onClose={() => handleClose(toast.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          style={{ top: 16 + index * 64 }}
        >
          <Alert
            onClose={() => handleClose(toast.id)}
            severity={toast.severity}
            variant="filled"
            sx={{
              minWidth: 280,
              fontFamily: '"DM Sans", sans-serif',
              fontSize: '0.875rem',
              fontWeight: 500,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid',
              borderColor:
                toast.severity === 'success' ? 'success.dark'
                : toast.severity === 'error' ? 'error.dark'
                : toast.severity === 'warning' ? 'warning.dark'
                : 'info.dark',
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </ToastContext.Provider>
  )
}
