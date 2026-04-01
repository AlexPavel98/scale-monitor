'use client'

import { useState, useEffect } from 'react'
import { supabase, type Weighing, type Customer, type Product } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import { formatKg, formatM3, formatDate, formatTime, formatDateTime } from '@/lib/format'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Search, ChevronDown, Trash2 } from 'lucide-react'

const PAGE_SIZE = 50

export default function HistoryPage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()
  const { isAdmin } = useUser()

  const [weighings, setWeighings] = useState<Weighing[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(0)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [plateSearch, setPlateSearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Lookup data
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Detail sheet
  const [selected, setSelected] = useState<Weighing | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Weighing | null>(null)

  useEffect(() => {
    loadLookups()
  }, [])

  useEffect(() => {
    setOffset(0)
    setWeighings([])
    setHasMore(true)
    loadData(0, true)
  }, [dateFrom, dateTo, plateSearch, customerFilter, productFilter, statusFilter])

  async function loadLookups() {
    const [c, p] = await Promise.all([
      supabase.from('scale_customers').select('*').order('name'),
      supabase.from('scale_products').select('*').order('name'),
    ])
    setCustomers(c.data || [])
    setProducts(p.data || [])
  }

  async function loadData(currentOffset: number, replace = false) {
    setLoading(true)

    let query = supabase
      .from('scale_weighings')
      .select('*')
      .order('first_date', { ascending: false })
      .range(currentOffset, currentOffset + PAGE_SIZE - 1)

    if (dateFrom) query = query.gte('first_date', new Date(dateFrom).toISOString())
    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('first_date', endDate.toISOString())
    }
    if (plateSearch.trim()) query = query.ilike('plate_number', `%${plateSearch.trim()}%`)
    if (customerFilter) query = query.eq('customer_id', customerFilter)
    if (productFilter) query = query.eq('product_id', productFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data, error } = await query

    if (error) {
      toast(error.message, 'error')
      setLoading(false)
      return
    }

    const rows = data || []
    if (replace) {
      setWeighings(rows)
    } else {
      setWeighings(prev => [...prev, ...rows])
    }
    setHasMore(rows.length === PAGE_SIZE)
    setLoading(false)
  }

  function loadMore() {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    loadData(newOffset)
  }

  function statusBadge(status: string) {
    switch (status) {
      case 'complete': return <span className="badge-ok text-xs px-2 py-0.5 rounded-full">{t.history.completed}</span>
      case 'first': return <span className="badge-warning text-xs px-2 py-0.5 rounded-full">{t.history.first}</span>
      case 'cancelled': return <span className="badge-expired text-xs px-2 py-0.5 rounded-full">{t.history.cancelled}</span>
      default: return <span className="text-xs text-content-muted">{status}</span>
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('scale_weighings')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast(error.message, 'error'); return }
    setDeleteTarget(null)
    setSelected(null)
    setOffset(0)
    setWeighings([])
    loadData(0, true)
    toast(t.common.delete)
  }

  function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    return (
      <div className="flex justify-between py-2 border-b border-subtle">
        <span className="text-xs text-content-muted">{label}</span>
        <span className="text-sm text-content font-medium tabular-nums">{value ?? '-'}</span>
      </div>
    )
  }

  return (
    <PageShell title={t.history.title}>
      {/* Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.weighing.plateNumber}</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
              <input
                type="text"
                value={plateSearch}
                onChange={e => setPlateSearch(e.target.value)}
                placeholder={t.common.search + '...'}
                className="glass-input pl-8 text-sm"
              />
            </div>
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
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.common.status}</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="glass-input text-sm"
            >
              <option value="all">{t.common.all}</option>
              <option value="first">{t.history.first}</option>
              <option value="complete">{t.history.completed}</option>
              <option value="cancelled">{t.history.cancelled}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading && weighings.length === 0 ? (
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      ) : weighings.length === 0 ? (
        <p className="text-content-muted text-sm">{t.common.noData}</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-subtle text-left">
                  <th className="pb-3 pr-3 font-medium text-content-muted">{t.history.weighingNumber}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted">{t.common.date}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted">{t.weighing.plateNumber}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted hidden md:table-cell">{t.weighing.customer}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted hidden md:table-cell">{t.weighing.product}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted text-right hidden lg:table-cell">{t.weighing.firstWeight}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted text-right hidden lg:table-cell">{t.weighing.secondWeight}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted text-right">{t.weighing.netWeight}</th>
                  <th className="pb-3 pr-3 font-medium text-content-muted hidden lg:table-cell">{t.weighing.direction}</th>
                  <th className="pb-3 font-medium text-content-muted">{t.common.status}</th>
                </tr>
              </thead>
              <tbody>
                {weighings.map(w => (
                  <tr
                    key={w.id}
                    onClick={() => setSelected(w)}
                    className="border-b border-subtle hover:bg-subtle/50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 pr-3 font-medium text-content tabular-nums">{w.weighing_number}</td>
                    <td className="py-3 pr-3 text-content-muted text-xs">{formatDateTime(w.first_date, lang)}</td>
                    <td className="py-3 pr-3 text-content font-medium">{w.plate_number || '-'}</td>
                    <td className="py-3 pr-3 text-content-muted hidden md:table-cell">{w.customer_name || '-'}</td>
                    <td className="py-3 pr-3 text-content-muted hidden md:table-cell">{w.product_name || '-'}</td>
                    <td className="py-3 pr-3 text-content text-right tabular-nums hidden lg:table-cell">{formatKg(w.first_weight)}</td>
                    <td className="py-3 pr-3 text-content text-right tabular-nums hidden lg:table-cell">{formatKg(w.second_weight)}</td>
                    <td className="py-3 pr-3 text-content text-right tabular-nums font-medium">{formatKg(w.net_weight)}</td>
                    <td className="py-3 pr-3 text-content-muted hidden lg:table-cell">
                      {w.direction === 'in' ? t.weighing.directionIn : t.weighing.directionOut}
                    </td>
                    <td className="py-3">{statusBadge(w.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <button onClick={loadMore} disabled={loading} className="btn-secondary text-sm flex items-center gap-1.5">
                <ChevronDown size={16} />
                {loading ? t.common.loading : t.common.all}
              </button>
            </div>
          )}
        </>
      )}

      {/* Detail BottomSheet */}
      <BottomSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${t.history.weighingNumber} ${selected?.weighing_number || ''}`}
        footer={
          isAdmin && selected ? (
            <button
              onClick={() => setDeleteTarget(selected)}
              className="flex items-center justify-center gap-2 w-full text-sm font-semibold px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              <Trash2 size={14} /> {t.common.delete}
            </button>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-0">
            <DetailRow label={t.common.status} value={selected.status} />
            <DetailRow label={t.weighing.direction} value={selected.direction === 'in' ? t.weighing.directionIn : t.weighing.directionOut} />
            <DetailRow label={t.weighing.plateNumber} value={selected.plate_number} />
            <DetailRow label={t.weighing.carrier} value={selected.carrier_name} />
            <DetailRow label={t.weighing.customer} value={selected.customer_name} />
            <DetailRow label={t.weighing.product} value={selected.product_name} />
            <DetailRow label={t.weighing.cardNumber} value={selected.card_number} />
            <DetailRow label={t.weighing.firstWeight} value={formatKg(selected.first_weight)} />
            <DetailRow label={`${t.weighing.firstWeight} ${t.common.date}`} value={formatDateTime(selected.first_date, lang)} />
            <DetailRow label={t.weighing.secondWeight} value={formatKg(selected.second_weight)} />
            <DetailRow label={`${t.weighing.secondWeight} ${t.common.date}`} value={formatDateTime(selected.second_date, lang)} />
            <DetailRow label={t.weighing.netWeight} value={formatKg(selected.net_weight)} />
            <DetailRow label={t.weighing.volume} value={formatM3(selected.volume_m3)} />
            <DetailRow label={t.weighing.deliveryNote} value={selected.delivery_note} />
            <DetailRow label={t.weighing.workplace} value={selected.workplace} />
            <DetailRow label={t.weighing.caseNumber} value={selected.customer_case} />
            <DetailRow label={t.common.notes} value={selected.notes} />
          </div>
        )}
      </BottomSheet>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t.common.delete}
        message={t.common.confirmDelete}
        confirmLabel={t.common.delete}
        danger
      />
    </PageShell>
  )
}
