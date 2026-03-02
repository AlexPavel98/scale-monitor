'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type Card, type Vehicle, type Customer, type Product } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Search, Pencil, Trash2, ChevronDown, X } from 'lucide-react'

type CardForm = {
  card_number: string
  vehicle_id: string | null
  plate_number: string | null
  tare_weight: number | null
  carrier_name: string | null
  carrier_addr1: string | null
  carrier_addr2: string | null
  customer_id: string | null
  customer_number: string | null
  customer_name: string | null
  customer_addr1: string | null
  customer_addr2: string | null
  product_id: string | null
  product_number: string | null
  product_name: string | null
  workplace_name: string | null
  case_number: string | null
  notes: string | null
}

const emptyForm: CardForm = {
  card_number: '',
  vehicle_id: null,
  plate_number: null,
  tare_weight: null,
  carrier_name: null,
  carrier_addr1: null,
  carrier_addr2: null,
  customer_id: null,
  customer_number: null,
  customer_name: null,
  customer_addr1: null,
  customer_addr2: null,
  product_id: null,
  product_number: null,
  product_name: null,
  workplace_name: null,
  case_number: null,
  notes: null,
}

/* ─── Searchable select dropdown ─── */
function SearchSelect<T extends { id: string }>({
  label,
  items,
  value,
  displayFn,
  searchFn,
  onSelect,
  onClear,
  placeholder,
}: {
  label: string
  items: T[]
  value: T | null
  displayFn: (item: T) => string
  searchFn: (item: T, q: string) => boolean
  onSelect: (item: T) => void
  onClear: () => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = items.filter(i => !q || searchFn(i, q.toLowerCase()))

  return (
    <div>
      <label className="text-xs font-medium text-content-muted mb-1 block">{label}</label>
      <div ref={ref} className="relative">
        {value ? (
          <div className="glass-input flex items-center justify-between gap-2">
            <span className="truncate text-content">{displayFn(value)}</span>
            <button type="button" onClick={onClear} className="shrink-0 text-content-muted hover:text-content">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setOpen(!open); setQ('') }}
            className="glass-input flex items-center justify-between gap-2 text-left w-full"
          >
            <span className="text-content-muted truncate">{placeholder}</span>
            <ChevronDown size={14} className="shrink-0 text-content-muted" />
          </button>
        )}
        {open && (
          <div className="absolute z-20 mt-1 w-full rounded-xl border border-subtle bg-white dark:bg-zinc-900 shadow-lg max-h-52 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-subtle">
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder={placeholder}
                className="glass-input text-sm"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="p-3 text-xs text-content-muted text-center">--</p>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { onSelect(item); setOpen(false); setQ('') }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-subtle transition-colors text-content"
                  >
                    {displayFn(item)}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function CardsPage() {
  const t = useT()
  const { toast } = useToast()
  const { isAdmin } = useUser()

  const [cards, setCards] = useState<Card[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Card | null>(null)
  const [form, setForm] = useState<CardForm>(emptyForm)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Card | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [cardsRes, vehiclesRes, customersRes, productsRes] = await Promise.all([
      supabase.from('scale_cards').select('*').order('card_number'),
      supabase.from('scale_vehicles').select('*').order('plate_number'),
      supabase.from('scale_customers').select('*').order('name'),
      supabase.from('scale_products').select('*').order('name'),
    ])
    if (cardsRes.error) { toast(cardsRes.error.message, 'error'); setLoading(false); return }
    setCards(cardsRes.data || [])
    setVehicles(vehiclesRes.data || [])
    setCustomers(customersRes.data || [])
    setProducts(productsRes.data || [])
    setLoading(false)
  }

  const filtered = cards.filter(c => {
    const q = search.toLowerCase()
    if (!q) return true
    return c.card_number.toLowerCase().includes(q)
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm })
    setSheetOpen(true)
  }

  function openEdit(c: Card) {
    setEditing(c)
    setForm({
      card_number: c.card_number,
      vehicle_id: c.vehicle_id,
      plate_number: c.plate_number,
      tare_weight: c.tare_weight,
      carrier_name: c.carrier_name,
      carrier_addr1: c.carrier_addr1,
      carrier_addr2: c.carrier_addr2,
      customer_id: c.customer_id,
      customer_number: c.customer_number,
      customer_name: c.customer_name,
      customer_addr1: c.customer_addr1,
      customer_addr2: c.customer_addr2,
      product_id: c.product_id,
      product_number: c.product_number,
      product_name: c.product_name,
      workplace_name: c.workplace_name,
      case_number: c.case_number,
      notes: c.notes,
    })
    setSheetOpen(true)
  }

  function selectVehicle(v: Vehicle) {
    setForm(prev => ({
      ...prev,
      vehicle_id: v.id,
      plate_number: v.plate_number,
      tare_weight: v.tare_weight,
      carrier_name: v.carrier_name,
      carrier_addr1: v.address1,
      carrier_addr2: v.address2,
    }))
  }

  function clearVehicle() {
    setForm(prev => ({
      ...prev,
      vehicle_id: null,
      plate_number: null,
      tare_weight: null,
      carrier_name: null,
      carrier_addr1: null,
      carrier_addr2: null,
    }))
  }

  function selectCustomer(c: Customer) {
    setForm(prev => ({
      ...prev,
      customer_id: c.id,
      customer_number: c.customer_number,
      customer_name: c.name,
      customer_addr1: c.address1,
      customer_addr2: c.address2,
    }))
  }

  function clearCustomer() {
    setForm(prev => ({
      ...prev,
      customer_id: null,
      customer_number: null,
      customer_name: null,
      customer_addr1: null,
      customer_addr2: null,
    }))
  }

  function selectProduct(p: Product) {
    setForm(prev => ({
      ...prev,
      product_id: p.id,
      product_number: p.product_number,
      product_name: p.name,
    }))
  }

  function clearProduct() {
    setForm(prev => ({
      ...prev,
      product_id: null,
      product_number: null,
      product_name: null,
    }))
  }

  async function handleSave() {
    if (!form.card_number?.trim()) return
    setSaving(true)

    const payload = {
      card_number: form.card_number.trim(),
      vehicle_id: form.vehicle_id || null,
      plate_number: form.plate_number || null,
      tare_weight: form.tare_weight ?? null,
      carrier_name: form.carrier_name || null,
      carrier_addr1: form.carrier_addr1 || null,
      carrier_addr2: form.carrier_addr2 || null,
      customer_id: form.customer_id || null,
      customer_number: form.customer_number || null,
      customer_name: form.customer_name || null,
      customer_addr1: form.customer_addr1 || null,
      customer_addr2: form.customer_addr2 || null,
      product_id: form.product_id || null,
      product_number: form.product_number || null,
      product_name: form.product_name || null,
      workplace_name: form.workplace_name?.trim() || null,
      case_number: form.case_number?.trim() || null,
      notes: form.notes?.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from('scale_cards')
        .update(payload)
        .eq('id', editing.id)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('scale_cards')
        .insert(payload)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    loadData()
    toast(editing ? t.cards.editCard : t.cards.addCard)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('scale_cards')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast(error.message, 'error'); return }
    setDeleteTarget(null)
    loadData()
    toast(t.common.delete)
  }

  // Resolve display names from loaded lookup arrays
  const selectedVehicle = vehicles.find(v => v.id === form.vehicle_id) || null
  const selectedCustomer = customers.find(c => c.id === form.customer_id) || null
  const selectedProduct = products.find(p => p.id === form.product_id) || null

  return (
    <PageShell title={t.cards.title}>
      {/* Search bar */}
      <div className="mb-6 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" />
        <input
          type="text"
          placeholder={t.common.search + '...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="glass-input pl-9"
        />
      </div>

      {/* Desktop add button */}
      <div className="hidden md:flex justify-end mb-4">
        <button onClick={openAdd} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={16} /> {t.cards.addCard}
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      ) : filtered.length === 0 ? (
        <p className="text-content-muted text-sm">{t.common.noData}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle text-left">
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.cards.cardNumber}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.cards.vehicle}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden md:table-cell">{t.cards.customer}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden lg:table-cell">{t.cards.product}</th>
                <th className="pb-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-content tabular-nums">{c.card_number}</td>
                  <td className="py-3 pr-4 text-content">{c.plate_number || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden md:table-cell">{c.customer_name || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden lg:table-cell">{c.product_name || '-'}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-subtle text-content-muted hover:text-content transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-content-muted hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* FAB for mobile */}
      <button onClick={openAdd} className="fab md:hidden">
        <Plus size={22} />
      </button>

      {/* BottomSheet form */}
      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? t.cards.editCard : t.cards.addCard}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setSheetOpen(false)} className="btn-secondary flex-1 text-sm">{t.common.cancel}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 text-sm">
              {saving ? t.common.loading : t.common.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Card number */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.cards.cardNumber} *</label>
            <input
              type="text"
              value={form.card_number}
              onChange={e => setForm(prev => ({ ...prev, card_number: e.target.value }))}
              className="glass-input"
              required
            />
          </div>

          {/* Vehicle select */}
          <SearchSelect
            label={t.cards.vehicle}
            items={vehicles}
            value={selectedVehicle}
            displayFn={v => `${v.plate_number}${v.carrier_name ? ` - ${v.carrier_name}` : ''}`}
            searchFn={(v, q) =>
              v.plate_number.toLowerCase().includes(q) ||
              (v.carrier_name || '').toLowerCase().includes(q)
            }
            onSelect={selectVehicle}
            onClear={clearVehicle}
            placeholder={t.weighing.selectVehicle}
          />

          {/* Customer select */}
          <SearchSelect
            label={t.cards.customer}
            items={customers}
            value={selectedCustomer}
            displayFn={c => `${c.customer_number} - ${c.name}`}
            searchFn={(c, q) =>
              c.customer_number.toLowerCase().includes(q) ||
              c.name.toLowerCase().includes(q)
            }
            onSelect={selectCustomer}
            onClear={clearCustomer}
            placeholder={t.weighing.selectCustomer}
          />

          {/* Product select */}
          <SearchSelect
            label={t.cards.product}
            items={products}
            value={selectedProduct}
            displayFn={p => `${p.product_number} - ${p.name}`}
            searchFn={(p, q) =>
              p.product_number.toLowerCase().includes(q) ||
              p.name.toLowerCase().includes(q)
            }
            onSelect={selectProduct}
            onClear={clearProduct}
            placeholder={t.weighing.selectProduct}
          />

          {/* Workplace */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.cards.workplace}</label>
            <input
              type="text"
              value={form.workplace_name || ''}
              onChange={e => setForm(prev => ({ ...prev, workplace_name: e.target.value }))}
              className="glass-input"
            />
          </div>

          {/* Case number */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.cards.caseNumber}</label>
            <input
              type="text"
              value={form.case_number || ''}
              onChange={e => setForm(prev => ({ ...prev, case_number: e.target.value }))}
              className="glass-input"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.common.notes}</label>
            <textarea
              value={form.notes || ''}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              className="glass-input min-h-[80px] resize-y"
              rows={3}
            />
          </div>
        </div>
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
