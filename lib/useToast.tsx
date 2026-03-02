'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: number
  message: string
  type: ToastType
}

type ToastContextType = {
  toasts: Toast[]
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  toast: () => {},
})

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast }}>
      {children}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
