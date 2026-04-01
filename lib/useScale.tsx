'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type ScaleStatus = 'disconnected' | 'connected' | 'error'
type WeightStability = 'stable' | 'unstable'

type ScaleState = {
  isElectron: boolean
  status: ScaleStatus
  weight: number
  stability: WeightStability
  connect: (port: string, baudRate?: number) => void
  disconnect: () => void
  captureWeight: () => number
}

// Check if running inside Electron
function checkElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronScale
}

// Organization ID for Palm Kartofler
const PALM_ORG_ID = 'a0000000-0000-0000-0000-000000000003'

export function useScale(): ScaleState {
  const [isElectron] = useState(checkElectron)
  const [status, setStatus] = useState<ScaleStatus>('disconnected')
  const [weight, setWeight] = useState(0)
  const [stability, setStability] = useState<WeightStability>('unstable')

  useEffect(() => {
    if (isElectron) {
      // ── Electron mode: read from serial port via IPC ──
      const api = (window as any).electronScale

      // Query current status in case the connection happened before we mounted
      api.getStatus?.().then((data: { status: ScaleStatus }) => {
        setStatus(data.status)
      })

      const removeWeightListener = api.onWeightUpdate((data: { weight: number; stable: boolean }) => {
        setWeight(data.weight)
        setStability(data.stable ? 'stable' : 'unstable')
        setStatus('connected')
      })

      const removeStatusListener = api.onStatusChange((data: { status: ScaleStatus }) => {
        setStatus(data.status)
      })

      return () => {
        removeWeightListener?.()
        removeStatusListener?.()
      }
    } else {
      // ── Web mode: subscribe to scale_live_weight via Supabase realtime ──
      if (!supabase) return

      // Initial fetch
      supabase
        .from('scale_live_weight')
        .select('*')
        .eq('organization_id', PALM_ORG_ID)
        .single()
        .then(({ data }) => {
          if (data) {
            applyLiveWeight(data)
          }
        })

      // Realtime subscription
      const channel = supabase
        .channel('scale-live-weight')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'scale_live_weight',
            filter: `organization_id=eq.${PALM_ORG_ID}`,
          },
          (payload: { new: Record<string, unknown> }) => {
            if (payload.new) {
              applyLiveWeight(payload.new)
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }

    function applyLiveWeight(row: Record<string, unknown>) {
      setWeight(Number(row.weight_kg) || 0)
      setStability(row.stable ? 'stable' : 'unstable')

      // Check if the reading is stale (>30s old = probably disconnected)
      const updatedAt = row.updated_at ? new Date(row.updated_at as string).getTime() : 0
      const isRecent = Date.now() - updatedAt < 30000
      setStatus(row.connected && isRecent ? 'connected' : 'disconnected')
    }
  }, [isElectron])

  const connect = useCallback((port: string, baudRate = 9600) => {
    if (!isElectron) return
    ;(window as any).electronScale.connect(port, baudRate)
  }, [isElectron])

  const disconnect = useCallback(() => {
    if (!isElectron) return
    ;(window as any).electronScale.disconnect()
  }, [isElectron])

  const captureWeight = useCallback(() => {
    return weight
  }, [weight])

  return { isElectron, status, weight, stability, connect, disconnect, captureWeight }
}
