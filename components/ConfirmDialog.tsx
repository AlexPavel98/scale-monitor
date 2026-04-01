'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/lib/i18n'

type Props = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel, danger }: Props) {
  const t = useT()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--overlay-bg)' }} />
      <div
        className="relative z-10 w-full max-w-sm mx-4 p-6 rounded-2xl shadow-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 slide-up"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-content mb-2">{title}</h3>
        <p className="text-sm text-content-muted mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">{t.common.cancel}</button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-colors ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'btn-primary'
            }`}
          >
            {confirmLabel || t.common.confirm}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
