'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type Weighing } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { formatKg, formatElapsed } from '@/lib/format'
import { Clock, Truck, Scale } from 'lucide-react'

type Props = {
  onSelect: (weighing: Weighing) => void
}

export default function PendingWeighings({ onSelect }: Props) {
  const t = useT()
  const [pending, setPending] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(true)
  const newestId = useRef<string | null>(null)
  const [animatedId, setAnimatedId] = useState<string | null>(null)

  // Refresh elapsed times every 30s
  const [, setTick] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchPending()

    // Subscribe to realtime changes
    const channel = supabase
      .channel('pending-weighings')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scale_weighings',
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newRow = payload.new as Weighing
            if (newRow.status === 'first') {
              setPending(prev => [...prev, newRow])
              // Trigger pulse animation on newest entry
              newestId.current = newRow.id
              setAnimatedId(newRow.id)
              setTimeout(() => setAnimatedId(null), 2000)
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Weighing
            if (updated.status === 'first') {
              setPending(prev => prev.map(w => w.id === updated.id ? updated : w))
            } else {
              // Completed or cancelled -- remove from pending
              setPending(prev => prev.filter(w => w.id !== updated.id))
            }
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string }
            setPending(prev => prev.filter(w => w.id !== deleted.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchPending() {
    setLoading(true)
    const { data } = await supabase
      .from('scale_weighings')
      .select('*')
      .eq('status', 'first')
      .order('first_date', { ascending: true })

    setPending(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-content flex items-center gap-2">
          {t.weighing.pending}
          {pending.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-xs font-bold rounded-full bg-brand-primary text-white">
              {pending.length}
            </span>
          )}
        </h2>
      </div>

      {pending.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <Scale size={32} className="mx-auto mb-3 text-content-dim" />
          <p className="text-sm text-content-muted">{t.common.noData}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map(w => (
            <button
              key={w.id}
              onClick={() => onSelect(w)}
              className={`glass-card w-full p-4 text-left hover:ring-1 hover:ring-brand-primary/30 transition-all cursor-pointer ${
                animatedId === w.id ? 'animate-pulse ring-1 ring-brand-primary/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-brand-primary tabular-nums">
                      #{w.weighing_number}
                    </span>
                    {w.plate_number && (
                      <span className="flex items-center gap-1 text-xs font-medium text-content-muted">
                        <Truck size={12} />
                        {w.plate_number}
                      </span>
                    )}
                  </div>

                  {w.customer_name && (
                    <p className="text-sm text-content truncate">{w.customer_name}</p>
                  )}

                  {w.product_name && (
                    <p className="text-xs text-content-muted truncate">{w.product_name}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-content tabular-nums">
                    {formatKg(w.first_weight)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-content-muted">
                    <Clock size={11} />
                    <span className="tabular-nums">{formatElapsed(w.first_date)}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
