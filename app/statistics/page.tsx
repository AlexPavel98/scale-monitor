'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, type Weighing, type Customer, type Product } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { formatKg, formatM3, formatDateTime } from '@/lib/format'
import PageShell from '@/components/PageShell'
import KpiCard from '@/components/KpiCard'
import { Weight, Droplets, Hash, Download, FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import { subDays, format } from 'date-fns'

const COLORS = [
  '#2e7d32', '#4caf50', '#81c784', '#388e3c', '#66bb6a',
  '#1b5e20', '#a5d6a7', '#43a047', '#c8e6c9', '#00695c',
]

type ProductStat = { name: string; kg: number }
type CustomerStat = { name: string; count: number }

export default function StatisticsPage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()

  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [productFilter, setProductFilter] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [directionFilter, setDirectionFilter] = useState('all')

  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo, productFilter, customerFilter, directionFilter])

  async function loadLookups() {
    const [c, p] = await Promise.all([
      supabase.from('scale_customers').select('*').order('name'),
      supabase.from('scale_products').select('*').order('name'),
    ])
    setCustomers(c.data || [])
    setProducts(p.data || [])
  }

  async function loadData() {
    setLoading(true)

    let query = supabase
      .from('scale_weighings')
      .select('*')
      .eq('status', 'complete')
      .order('first_date', { ascending: false })

    if (dateFrom) query = query.gte('first_date', new Date(dateFrom).toISOString())
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('first_date', endDate.toISOString())
    }
    if (productFilter) query = query.eq('product_id', productFilter)
    if (customerFilter) query = query.eq('customer_id', customerFilter)
    if (directionFilter !== 'all') query = query.eq('direction', directionFilter)

    const { data, error } = await query

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    setWeighings(data || [])
    setLoading(false)
  }

  // Summary stats
  const totalKg = useMemo(() => weighings.reduce((sum, w) => sum + (w.net_weight || 0), 0), [weighings])
  const totalM3 = useMemo(() => weighings.reduce((sum, w) => sum + (w.volume_m3 || 0), 0), [weighings])
  const totalCount = weighings.length

  // Tonnage by product (top 10)
  const productStats: ProductStat[] = useMemo(() => {
    const map = new Map<string, number>()
    weighings.forEach(w => {
      const name = w.product_name || '-'
      map.set(name, (map.get(name) || 0) + (w.net_weight || 0))
    })
    return Array.from(map.entries())
      .map(([name, kg]) => ({ name, kg }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, 10)
  }, [weighings])

  // Weighings by customer (top 10)
  const customerStats: CustomerStat[] = useMemo(() => {
    const map = new Map<string, number>()
    weighings.forEach(w => {
      const name = w.customer_name || '-'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [weighings])

  function exportCsv() {
    const headers = [
      'Weighing #', 'Date', 'Plate', 'Customer', 'Product',
      '1st Weight (kg)', '2nd Weight (kg)', 'Net (kg)', 'Volume (m3)',
      'Direction', 'Status', 'Notes',
    ]
    const rows = weighings.map(w => [
      w.weighing_number,
      w.first_date || '',
      w.plate_number || '',
      w.customer_name || '',
      w.product_name || '',
      w.first_weight ?? '',
      w.second_weight ?? '',
      w.net_weight ?? '',
      w.volume_m3 ?? '',
      w.direction,
      w.status,
      (w.notes || '').replace(/"/g, '""'),
    ])

    const csv = [
      headers.join(';'),
      ...rows.map(r => r.map(v => `"${v}"`).join(';')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weighings_${dateFrom}_${dateTo}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(t.statistics.exportCsv)
  }

  function exportPdf() {
    toast('PDF export coming soon', 'info')
  }

  return (
    <PageShell title={t.statistics.title}>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.common.from}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="glass-input text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.common.to}</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="glass-input text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.weighing.product}</label>
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
              className="glass-input text-sm"
            >
              <option value="">{t.common.all}</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.weighing.customer}</label>
            <select
              value={customerFilter}
              onChange={e => setCustomerFilter(e.target.value)}
              className="glass-input text-sm"
            >
              <option value="">{t.common.all}</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.weighing.direction}</label>
            <select
              value={directionFilter}
              onChange={e => setDirectionFilter(e.target.value)}
              className="glass-input text-sm"
            >
              <option value="all">{t.common.all}</option>
              <option value="in">{t.weighing.directionIn}</option>
              <option value="out">{t.weighing.directionOut}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label={t.statistics.totalWeight}
          value={loading ? '...' : formatKg(totalKg)}
          icon={<Weight size={18} />}
          accent
        />
        <KpiCard
          label={t.statistics.totalVolume}
          value={loading ? '...' : formatM3(totalM3)}
          icon={<Droplets size={18} />}
        />
        <KpiCard
          label={t.statistics.totalCount}
          value={loading ? '...' : String(totalCount)}
          icon={<Hash size={18} />}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Tonnage by product */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-content mb-4">{t.statistics.byProduct}</h2>
          {loading ? (
            <p className="text-sm text-content-muted">{t.common.loading}</p>
          ) : productStats.length === 0 ? (
            <p className="text-sm text-content-muted">{t.common.noData}</p>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productStats} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--text-dim)" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 10 }}
                    stroke="var(--text-dim)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [formatKg(value as number), t.common.kg]}
                  />
                  <Bar dataKey="kg" fill="var(--brand-primary)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Weighings by customer */}
        <div className="glass-card p-5">
          <h2 className="text-base font-semibold text-content mb-4">{t.statistics.byCustomer}</h2>
          {loading ? (
            <p className="text-sm text-content-muted">{t.common.loading}</p>
          ) : customerStats.length === 0 ? (
            <p className="text-sm text-content-muted">{t.common.noData}</p>
          ) : (
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={customerStats}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props: any) => {
                      const name = props.name || ''
                      const percent = props.percent || 0
                      return `${name.length > 12 ? name.slice(0, 12) + '...' : name} ${(percent * 100).toFixed(0)}%`
                    }}
                    labelLine={{ stroke: 'var(--text-dim)' }}
                  >
                    {customerStats.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--glass-bg)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Export buttons */}
      <div className="flex gap-3">
        <button onClick={exportCsv} className="btn-primary text-sm flex items-center gap-1.5">
          <Download size={16} /> {t.statistics.exportCsv}
        </button>
        <button onClick={exportPdf} className="btn-secondary text-sm flex items-center gap-1.5">
          <FileText size={16} /> {t.statistics.exportPdf}
        </button>
      </div>
    </PageShell>
  )
}
