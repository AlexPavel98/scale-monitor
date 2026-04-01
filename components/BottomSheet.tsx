'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function BottomSheet({ open, onClose, title, children, footer }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dragStartY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const close = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      setDragY(0)
      onClose()
    }, isMobile ? 250 : 150)
  }, [onClose, isMobile])

  useEffect(() => {
    if (!open) return
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [open, close])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  function handleTouchStart(e: React.TouchEvent) {
    if (!isMobile) return
    const sheet = sheetRef.current
    if (!sheet || sheet.scrollTop > 0) return
    dragStartY.current = e.touches[0].clientY
    isDragging.current = true
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging.current || !isMobile) return
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy < 0) return
    setDragY(dy)
  }

  function handleTouchEnd() {
    if (!isDragging.current || !isMobile) return
    isDragging.current = false
    if (dragY > 120) close()
    else setDragY(0)
  }

  if (!open && !closing) return null
  if (!mounted) return null

  const content = !isMobile ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center" onClick={close}>
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-200 ${closing ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'var(--overlay-bg)' }}
      />
      <div
        className={`relative z-10 w-full max-w-lg mx-4 max-h-[85vh] rounded-2xl shadow-2xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 transition-all duration-200 flex flex-col ${closing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-content">{title}</h2>
          <button onClick={close} className="w-8 h-8 flex items-center justify-center rounded-full bg-subtle text-content-muted hover:text-content transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 pb-4 overflow-y-auto flex-1">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-subtle shrink-0">{footer}</div>}
      </div>
    </div>
  ) : (
    <div className="fixed inset-0 z-[70]" onClick={close}>
      <div
        className={`absolute inset-0 backdrop-blur-sm transition-opacity duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: 'var(--overlay-bg)' }}
      />
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`glass overflow-y-auto fixed inset-x-0 bottom-0 max-h-[92vh] rounded-t-3xl ${closing ? 'sheet-close' : 'slide-up'}`}
        style={dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div className="sticky top-0 pt-3 pb-2 flex justify-center z-10">
          <div className="w-10 h-1 rounded-full opacity-30" style={{ background: 'var(--text-dim)' }} />
        </div>
        <div className="px-5 pb-4 pt-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-content">{title}</h2>
        </div>
        <div className="px-5 pb-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 px-5 py-4 border-t border-subtle"
            style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))', background: 'var(--glass-bg)', backdropFilter: 'blur(20px)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
