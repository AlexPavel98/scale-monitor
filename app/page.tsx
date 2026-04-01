'use client'

import { useState, useEffect } from 'react'
import { supabase, type Weighing } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { formatKg, formatM3, formatDateTime } from '@/lib/format'
import PageShell from '@/components/PageShell'
import KpiCard from '@/components/KpiCard'
import { Scale, Weight, Clock, Droplets } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subDays, startOfDay } from 'date-fns'

type DailyTonnage = { day: string; kg: number }

export default function DashboardPage() {
  const t = useT()
  const { lang } = useLang()

  const [todayCount, setTodayCount] = useState(0)
  const [todayKg, setTodayKg] = useState(0)
  const [todayM3, setTodayM3] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [recent, setRecent] = useState<Weighing[]>([])
  const [dailyData, setDailyData] = useState<DailyTonnage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    const todayStart = startOfDay(new Date()).toISOString()

    // Today's weighings
    const { data: todayWeighings } = await supabase
      .from('scale_weighings')
      .select('*')
      .gte('first_date', todayStart)

    if (todayWeighings) {
      const tw = todayWeighings as Weighing[]
      setTodayCount(tw.length)
      setTodayKg(tw.reduce((sum, w) => sum + (w.net_weight || 0), 0))
      setTodayM3(tw.reduce((sum, w) => sum + (w.volume_m3 || 0), 0))
      setPendingCount(tw.filter(w => w.status === 'first').length)
    }

    // Recent completed weighings
    const { data: recentData } = await supabase
      .from('scale_weighings')
      .select('*')
      .eq('status', 'complete')
      .order('second_date', { ascending: false })
      .limit(20)

    setRecent(recentData || [])

    // Daily tonnage for last 7 days
    const days: DailyTonnage[] = []
    for (let i = 6; i >= 0; i--) {
      const dayDate = subDays(new Date(), i)
      const dayStart = startOfDay(dayDate).toISOString()
      const dayEnd = startOfDay(subDays(new Date(), i - 1)).toISOString()

      const { data: dayData } = await supabase
        .from('scale_weighings')
        .select('net_weight')
        .gte('first_date', dayStart)
        .lt('first_date', dayEnd)
        .eq('status', 'complete')

      const totalKg = ((dayData || []) as { net_weight: number | null }[]).reduce((sum, w) => sum + (w.net_weight || 0), 0)
      days.push({ day: format(dayDate, 'dd/MM'), kg: totalKg })
    }
    setDailyData(days)
    setLoading(false)
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'complete': return <span className="badge-ok text-xs px-2 py-0.5 rounded-full">{t.history.completed}</span>
      case 'first': return <span className="badge-warning text-xs px-2 py-0.5 rounded-full">{t.history.first}</span>
      case 'cancelled': return <span className="badge-expired text-xs px-2 py-0.5 rounded-full">{t.history.cancelled}</span>
      default: return <span className="text-xs text-content-muted">{status}</span>
    }
  }

  return (
    <PageShell title={t.dashboard.title}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KpiCard
          label={t.dashboard.todayWeighings}
          value={loading ? '...' : String(todayCount)}
          icon={<Scale size={18} />}
          accent
        />
        <KpiCard
          label={t.dashboard.todayTonnage}
          value={loading ? '...' : formatKg(todayKg)}
          icon={<Weight size={18} />}
        />
        <KpiCard
          label={t.dashboard.pendingWeighings}
          value={loading ? '...' : String(pendingCount)}
          icon={<Clock size={18} />}
          accent={pendingCount > 0}
        />
        <KpiCard
          label={t.dashboard.todayVolume}
          value={loading ? '...' : formatM3(todayM3)}
          icon={<Droplets size={18} />}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Weighings Table */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-content mb-4">{t.dashboard.recentWeighings}</h2>
          {loading ? (
            <p className="text-sm text-content-muted">{t.common.loading}</p>
          ) : recent.length === 0 ? (
            <p className="text-sm text-content-muted">{t.common.noData}</p>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <table className="w-full text-xs min-w-[600px]">
                <thead>
                  <tr className="border-b border-subtle text-left">
                    <th className="pb-2 pl-5 pr-2 font-medium text-content-muted">#</th>
                    <th className="pb-2 pr-2 font-medium text-content-muted">{t.weighing.plateNumber}</th>
                    <th className="pb-2 pr-2 font-medium text-content-muted">{t.weighing.customer}</th>
                    <th className="pb-2 pr-2 font-medium text-content-muted">{t.weighing.product}</th>
                    <th className="pb-2 pr-2 font-medium text-content-muted text-right">{t.weighing.netWeight}</th>
                    <th className="pb-2 pr-2 font-medium text-content-muted">{t.common.date}</th>
                    <th className="pb-2 pr-5 font-medium text-content-muted">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(w => (
                    <tr key={w.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                      <td className="py-2 pl-5 pr-2 text-content tabular-nums">{w.weighing_number}</td>
                      <td className="py-2 pr-2 text-content font-medium">{w.plate_number || '-'}</td>
                      <td className="py-2 pr-2 text-content-muted">{w.customer_name || '-'}</td>
                      <td className="py-2 pr-2 text-content-muted">{w.product_name || '-'}</td>
                      <td className="py-2 pr-2 text-content text-right tabular-nums">{formatKg(w.net_weight)}</td>
                      <td className="py-2 pr-2 text-content-muted">{formatDateTime(w.second_date || w.first_date, lang)}</td>
                      <td className="py-2 pr-5">{statusBadge(w.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily Tonnage Chart */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-content mb-4">{t.dashboard.dailyTonnage}</h2>
          {loading ? (
            <p className="text-sm text-content-muted">{t.common.loading}</p>
          ) : (
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="var(--text-dim)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--text-dim)" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatKg(value as number), t.common.kg]}
                  />
                  <Bar dataKey="kg" fill="var(--brand-primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
