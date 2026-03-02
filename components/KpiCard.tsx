'use client'

type Props = {
  label: string
  value: string
  icon?: React.ReactNode
  accent?: boolean
}

export default function KpiCard({ label, value, icon, accent }: Props) {
  return (
    <div className={`glass-card p-4 ${accent ? 'ring-1 ring-brand-primary/20' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium uppercase tracking-wider text-content-dim">{label}</span>
        {icon && <div className={accent ? 'text-brand-primary' : 'text-content-dim'}>{icon}</div>}
      </div>
      <div className={`text-2xl font-bold tracking-tight ${accent ? 'text-brand-primary' : 'text-content'}`}>
        {value}
      </div>
    </div>
  )
}
