'use client'

import { useState, useEffect } from 'react'
import { supabase, type Product } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const empty: Partial<Product> = {
  product_number: '',
  name: '',
  density: null,
  control1: '',
  control2: '',
  control3: '',
  control4: '',
  control5: '',
}

export default function ProductsPage() {
  const t = useT()
  const { toast } = useToast()
  const { isAdmin } = useUser()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Partial<Product>>(empty)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('scale_products')
      .select('*')
      .order('product_number')
    if (error) { toast(error.message, 'error'); setLoading(false); return }
    setProducts(data || [])
    setLoading(false)
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      p.product_number.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q)
    )
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...empty })
    setSheetOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      product_number: p.product_number,
      name: p.name,
      density: p.density,
      control1: p.control1 || '',
      control2: p.control2 || '',
      control3: p.control3 || '',
      control4: p.control4 || '',
      control5: p.control5 || '',
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.product_number?.trim() || !form.name?.trim()) return
    setSaving(true)

    const payload = {
      product_number: form.product_number!.trim(),
      name: form.name!.trim(),
      density: form.density ? Number(form.density) : null,
      control1: form.control1?.trim() || null,
      control2: form.control2?.trim() || null,
      control3: form.control3?.trim() || null,
      control4: form.control4?.trim() || null,
      control5: form.control5?.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from('scale_products')
        .update(payload)
        .eq('id', editing.id)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('scale_products')
        .insert(payload)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    loadData()
    toast(editing ? t.products.editProduct : t.products.addProduct)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('scale_products')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast(error.message, 'error'); return }
    setDeleteTarget(null)
    loadData()
    toast(t.common.delete)
  }

  function set(key: keyof Product, value: string | number | null) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <PageShell title={t.products.title}>
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
          <Plus size={16} /> {t.products.addProduct}
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
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.products.productNumber}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.products.name}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden md:table-cell text-right">{t.products.density}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden lg:table-cell">{t.products.control} 1</th>
                <th className="pb-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-content tabular-nums">{p.product_number}</td>
                  <td className="py-3 pr-4 text-content">{p.name}</td>
                  <td className="py-3 pr-4 text-content-muted hidden md:table-cell text-right tabular-nums">{p.density ?? '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden lg:table-cell">{p.control1 || '-'}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-subtle text-content-muted hover:text-content transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(p)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-content-muted hover:text-red-500 transition-colors">
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
        title={editing ? t.products.editProduct : t.products.addProduct}
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
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.products.productNumber} *</label>
            <input
              type="text"
              value={form.product_number || ''}
              onChange={e => set('product_number', e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.products.name} *</label>
            <input
              type="text"
              value={form.name || ''}
              onChange={e => set('name', e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.products.density}</label>
            <input
              type="number"
              value={form.density ?? ''}
              onChange={e => set('density', e.target.value ? Number(e.target.value) : null)}
              className="glass-input"
              step="any"
              min={0}
            />
          </div>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n}>
              <label className="text-xs font-medium text-content-muted mb-1 block">{t.products.control} {n}</label>
              <input
                type="text"
                value={(form as Record<string, unknown>)[`control${n}`] as string || ''}
                onChange={e => set(`control${n}` as keyof Product, e.target.value)}
                className="glass-input"
              />
            </div>
          ))}
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
