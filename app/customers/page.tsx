'use client'

import { useState, useEffect } from 'react'
import { supabase, type Customer } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const empty: Partial<Customer> = {
  customer_number: '',
  name: '',
  address1: '',
  address2: '',
  email: '',
  cvr_number: '',
  p_number: '',
  pin_code: '',
}

export default function CustomersPage() {
  const t = useT()
  const { toast } = useToast()
  const { isAdmin } = useUser()

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState<Partial<Customer>>(empty)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('scale_customers')
      .select('*')
      .order('customer_number')
    if (error) { toast(error.message, 'error'); setLoading(false); return }
    setCustomers(data || [])
    setLoading(false)
  }

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.customer_number.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    )
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...empty })
    setSheetOpen(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({
      customer_number: c.customer_number,
      name: c.name,
      address1: c.address1 || '',
      address2: c.address2 || '',
      email: c.email || '',
      cvr_number: c.cvr_number || '',
      p_number: c.p_number || '',
      pin_code: c.pin_code || '',
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.customer_number?.trim() || !form.name?.trim()) return
    setSaving(true)

    const payload = {
      customer_number: form.customer_number!.trim(),
      name: form.name!.trim(),
      address1: form.address1?.trim() || null,
      address2: form.address2?.trim() || null,
      email: form.email?.trim() || null,
      cvr_number: form.cvr_number?.trim() || null,
      p_number: form.p_number?.trim() || null,
      pin_code: form.pin_code?.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from('scale_customers')
        .update(payload)
        .eq('id', editing.id)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('scale_customers')
        .insert(payload)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    loadData()
    toast(editing ? t.customers.editCustomer : t.customers.addCustomer)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('scale_customers')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast(error.message, 'error'); return }
    setDeleteTarget(null)
    loadData()
    toast(t.common.delete)
  }

  function set(key: keyof Customer, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <PageShell title={t.customers.title}>
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
          <Plus size={16} /> {t.customers.addCustomer}
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
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.customers.customerNumber}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.customers.name}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden md:table-cell">{t.customers.address}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden lg:table-cell">{t.customers.email}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden lg:table-cell">{t.customers.cvr}</th>
                <th className="pb-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-content tabular-nums">{c.customer_number}</td>
                  <td className="py-3 pr-4 text-content">{c.name}</td>
                  <td className="py-3 pr-4 text-content-muted hidden md:table-cell">{c.address1 || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden lg:table-cell">{c.email || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden lg:table-cell">{c.cvr_number || '-'}</td>
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
        title={editing ? t.customers.editCustomer : t.customers.addCustomer}
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
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.customerNumber} *</label>
            <input
              type="text"
              value={form.customer_number || ''}
              onChange={e => set('customer_number', e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.name} *</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.address} 1</label>
            <input
              type="text"
              value={form.address1 || ''}
              onChange={e => set('address1', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.address} 2</label>
            <input
              type="text"
              value={form.address2 || ''}
              onChange={e => set('address2', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.email}</label>
            <input
              type="email"
              value={form.email || ''}
              onChange={e => set('email', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.cvr}</label>
            <input
              type="text"
              value={form.cvr_number || ''}
              onChange={e => set('cvr_number', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.pNumber}</label>
            <input
              type="text"
              value={form.p_number || ''}
              onChange={e => set('p_number', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.pinCode}</label>
            <input
              type="text"
              value={form.pin_code || ''}
              onChange={e => set('pin_code', e.target.value)}
              className="glass-input"
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
