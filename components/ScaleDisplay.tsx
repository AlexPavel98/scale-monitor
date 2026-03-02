'use client'

import { useScale } from '@/lib/useScale'
import { useT } from '@/lib/i18n'
import { formatKg } from '@/lib/format'
import { Wifi, WifiOff, Activity, CircleDot } from 'lucide-react'

type Props = {
  onCapture: (weight: number) => void
  value?: number
}

export default function ScaleDisplay({ onCapture, value }: Props) {
  const { isElectron, status, weight, stability, captureWeight } = useScale()
  const t = useT()

  if (isElectron) {
    const isConnected = status === 'connected'
    const isStable = stability === 'stable'

    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
            {t.weighing.liveScale}
          </span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="badge-ok flex items-center gap-1 text-xs">
                <Wifi size={12} />
                {isConnected ? 'OK' : ''}
              </span>
            ) : (
              <span className="badge-warning flex items-center gap-1 text-xs">
                <WifiOff size={12} />
                {t.weighing.noConnection}
              </span>
            )}
            {isConnected && (
              <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                isStable
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }`}>
                {isStable ? <CircleDot size={12} /> : <Activity size={12} />}
                {isStable ? t.weighing.stable : t.weighing.unstable}
              </span>
            )}
          </div>
        </div>

        <div className="text-center py-4">
          <div className={`text-5xl font-bold tracking-tight tabular-nums transition-colors ${
            isConnected
              ? isStable ? 'text-brand-primary' : 'text-content'
              : 'text-content-dim'
          }`}>
            {isConnected ? formatKg(weight) : '-- kg'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const captured = captureWeight()
            onCapture(captured)
          }}
          disabled={!isConnected || !isStable}
          className="btn-primary w-full text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.weighing.captureWeight}
        </button>
      </div>
    )
  }

  // Manual entry mode (non-Electron / browser)
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
          {t.weighing.manualEntry}
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
