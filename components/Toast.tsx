'use client'
import { useToast } from '@/lib/useToast'

export default function ToastContainer() {
  const { toasts } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[90%] max-w-sm">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`glass px-4 py-3 rounded-xl text-sm font-medium shadow-lg border slide-up ${
            t.type === 'success'
              ? 'border-green-500/30 text-green-700 dark:text-green-300'
              : t.type === 'error'
              ? 'border-red-500/30 text-red-700 dark:text-red-300'
              : 'border-subtle text-content'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
