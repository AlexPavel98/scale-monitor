'use client'

import { useScale } from '@/lib/useScale'
import { useT } from '@/lib/i18n'
import { formatKg } from '@/lib/format'
import { Wifi, WifiOff, Activity, CircleDot, Monitor } from 'lucide-react'

type Props = {
  onCapture: (weight: number) => void
  value?: number
}

export default function ScaleDisplay({ onCapture, value }: Props) {
  const { isElectron, status, weight, stability, captureWeight } = useScale()
  const t = useT()

  const isConnected = status === 'connected'
  const isStable = stability === 'stable'

  // Both Electron and web mode show the live scale if connected
  if (isConnected) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
            {isElectron ? t.weighing.liveScale : t.weighing.remoteScale}
          </span>
          <div className="flex items-center gap-2">
            <span className="badge-ok flex items-center gap-1 text-xs">
              {isElectron ? <Wifi size={12} /> : <Monitor size={12} />}
              OK
            </span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
              isStable
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {isStable ? <CircleDot size={12} /> : <Activity size={12} />}
              {isStable ? t.weighing.stable : t.weighing.unstable}
            </span>
          </div>
        </div>

        <div className="text-center py-4">
          <div className={`text-5xl font-bold tracking-tight tabular-nums transition-colors ${
            isStable ? 'text-brand-primary' : 'text-content'
          }`}>
            {formatKg(weight)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const captured = captureWeight()
            onCapture(captured)
          }}
          disabled={!isStable}
          className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.weighing.captureWeight}
        </button>
      </div>
    )
  }

  // Electron but not connected — show status
  if (isElectron) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
            {t.weighing.liveScale}
          </span>
          <span className="badge-warning flex items-center gap-1 text-xs">
            <WifiOff size={12} />
            {t.weighing.noConnection}
          </span>
        </div>
        <div className="text-center py-4">
          <div className="text-5xl font-bold tracking-tight tabular-nums text-content-dim">
            -- kg
          </div>
        </div>
        <button
          type="button"
          disabled
          className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.weighing.captureWeight}
        </button>
      </div>
    )
  }

  // Web mode, not connected — show manual entry with a note about remote scale
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
          {t.weighing.manualEntry}
        </span>
        <span className="badge-warning flex items-center gap-1 text-xs">
          <WifiOff size={12} />
          {t.weighing.scaleOffline}
        </span>
      </div>
      <div className="relative">
        <input
          type="number"
          min={0}
          step={1}
          value={value ?? ''}
          onChange={e => {
            const val = e.target.value === '' ? 0 : Number(e.target.value)
            onCapture(val)
          }}
          placeholder="kg"
          className="glass-input text-3xl font-bold text-center tabular-nums pr-12 h-20"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-content-dim">
          kg
        </span>
      </div>
    </div>
  )
}
