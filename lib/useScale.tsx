'use client'
import { useState, useEffect, useCallback } from 'react'

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

export function useScale(): ScaleState {
  const [isElectron] = useState(checkElectron)
  const [status, setStatus] = useState<ScaleStatus>('disconnected')
  const [weight, setWeight] = useState(0)
  const [stability, setStability] = useState<WeightStability>('unstable')

  useEffect(() => {
    if (!isElectron) return

    const api = (window as any).electronScale

    const removeWeightListener = api.onWeightUpdate((data: { weight: number; stable: boolean }) => {
      setWeight(data.weight)
      setStability(data.stable ? 'stable' : 'unstable')
    })

    const removeStatusListener = api.onStatusChange((newStatus: ScaleStatus) => {
      setStatus(newStatus)
    })

    return () => {
      removeWeightListener?.()
      removeStatusListener?.()
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
