'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase, type Debtor } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { formatDate } from '@/lib/format'
import PageShell from '@/components/PageShell'
import { Receipt } from 'lucide-react'

export default function DebtorsPage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()

  const [debtors, setDebtors] = useState<Debtor[]>([])
  const [loading, setLoading] = useState(true)

  // Date range filter
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadData()
  }, [dateFrom, dateTo])

  async function loadData() {
    setLoading(true)

    let query = supabase
      .from('scale_debtors')
      .select('*')
      .order('customer_name')

    if (dateFrom) query = query.gte('date', dateFrom)
    if (dateTo) query = query.lte('date', dateTo)

    const { data, error } = await query

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    setDebtors(data || [])
    setLoading(false)
  }

  const totals = useMemo(() => {
    const subtotal = debtors.reduce((sum, d) => sum + (d.subtotal || 0), 0)
    const grandTotal = debtors.reduce((sum, d) => sum + (d.grand_total || 0), 0)
    return { subtotal, grandTotal }
  }, [debtors])

  function formatCurrency(value: number | null | undefined) {
    if (value == null) return '-'
    return value.toLocaleString('da-DK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <PageShell title={t.debtors.title}>
      {/* Date range filter */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md">
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
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      ) : debtors.length === 0 ? (
        <div className="text-center py-12">
          <Receipt size={40} className="mx-auto mb-3 text-content-dim" />
          <p className="text-content-muted text-sm">{t.common.noData}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle text-left">
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.customers.customerNumber}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.customers.name}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted text-right">{t.debtors.subtotal}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted text-right">{t.debtors.grandTotal}</th>
                <th className="pb-3 font-medium text-content-muted">{t.common.date}</th>
              </tr>
            </thead>
            <tbody>
              {debtors.map(d => (
                <tr key={d.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-content tabular-nums">{d.customer_number || '-'}</td>
                  <td className="py-3 pr-4 text-content">{d.customer_name || '-'}</td>
                  <td className="py-3 pr-4 text-content text-right tabular-nums">{formatCurrency(d.subtotal)}</td>
                  <td className="py-3 pr-4 text-content text-right tabular-nums font-medium">{formatCurrency(d.grand_total)}</td>
                  <td className="py-3 text-content-muted">{formatDate(d.date, lang)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-subtle">
                <td className="pt-4 pr-4 font-bold text-content" colSpan={2}>{t.common.total}</td>
                <td className="pt-4 pr-4 font-bold text-content text-right tabular-nums">{formatCurrency(totals.subtotal)}</td>
                <td className="pt-4 pr-4 font-bold text-content text-right tabular-nums">{formatCurrency(totals.grandTotal)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PageShell>
  )
}
