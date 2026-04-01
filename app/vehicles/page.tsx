'use client'

import { useState, useEffect } from 'react'
import { supabase, type Vehicle } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ConfirmDialog from '@/components/ConfirmDialog'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'

const empty: Partial<Vehicle> = {
  plate_number: '',
  carrier_name: '',
  address1: '',
  address2: '',
  phone: '',
  tare_weight: 0,
}

export default function VehiclesPage() {
  const t = useT()
  const { toast } = useToast()
  const { isAdmin } = useUser()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>(empty)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Vehicle | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('scale_vehicles')
      .select('*')
      .order('plate_number')
    if (error) { toast(error.message, 'error'); setLoading(false); return }
    setVehicles(data || [])
    setLoading(false)
  }

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      v.plate_number.toLowerCase().includes(q) ||
      (v.carrier_name || '').toLowerCase().includes(q)
    )
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...empty })
    setSheetOpen(true)
  }

  function openEdit(v: Vehicle) {
    setEditing(v)
    setForm({
      plate_number: v.plate_number,
      carrier_name: v.carrier_name || '',
      address1: v.address1 || '',
      address2: v.address2 || '',
      phone: v.phone || '',
      tare_weight: v.tare_weight,
    })
    setSheetOpen(true)
  }

  async function handleSave() {
    if (!form.plate_number?.trim()) return
    setSaving(true)

    const payload = {
      plate_number: form.plate_number!.trim(),
      carrier_name: form.carrier_name?.trim() || null,
      address1: form.address1?.trim() || null,
      address2: form.address2?.trim() || null,
      phone: form.phone?.trim() || null,
      tare_weight: Number(form.tare_weight) || 0,
    }

    if (editing) {
      const { error } = await supabase
        .from('scale_vehicles')
        .update(payload)
        .eq('id', editing.id)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    } else {
      const { error } = await supabase
        .from('scale_vehicles')
        .insert(payload)
      if (error) { toast(error.message, 'error'); setSaving(false); return }
    }

    setSaving(false)
    setSheetOpen(false)
    loadData()
    toast(editing ? t.vehicles.editVehicle : t.vehicles.addVehicle)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error } = await supabase
      .from('scale_vehicles')
      .delete()
      .eq('id', deleteTarget.id)
    if (error) { toast(error.message, 'error'); return }
    setDeleteTarget(null)
    loadData()
    toast(t.common.delete)
  }

  function set(key: keyof Vehicle, value: string | number) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  return (
    <PageShell title={t.vehicles.title}>
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
          <Plus size={16} /> {t.vehicles.addVehicle}
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
                <th className="pb-3 pr-4 font-medium text-content-muted">{t.vehicles.plateNumber}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden sm:table-cell">{t.vehicles.carrier}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden md:table-cell">{t.vehicles.address}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted hidden lg:table-cell">{t.vehicles.phone}</th>
                <th className="pb-3 pr-4 font-medium text-content-muted text-right">{t.vehicles.tareWeight}</th>
                <th className="pb-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-subtle hover:bg-subtle/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-content">{v.plate_number}</td>
                  <td className="py-3 pr-4 text-content-muted hidden sm:table-cell">{v.carrier_name || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden md:table-cell">{v.address1 || '-'}</td>
                  <td className="py-3 pr-4 text-content-muted hidden lg:table-cell">{v.phone || '-'}</td>
                  <td className="py-3 pr-4 text-content text-right tabular-nums">{v.tare_weight ? `${v.tare_weight} ${t.common.kg}` : '-'}</td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-subtle text-content-muted hover:text-content transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => setDeleteTarget(v)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-content-muted hover:text-red-500 transition-colors">
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
        title={editing ? t.vehicles.editVehicle : t.vehicles.addVehicle}
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
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.plateNumber} *</label>
            <input
              type="text"
              value={form.plate_number || ''}
              onChange={e => set('plate_number', e.target.value)}
              className="glass-input"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.carrier}</label>
            <input
              type="text"
              value={form.carrier_name || ''}
              onChange={e => set('carrier_name', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.address} 1</label>
            <input
              type="text"
              value={form.address1 || ''}
              onChange={e => set('address1', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.address} 2</label>
            <input
              type="text"
              value={form.address2 || ''}
              onChange={e => set('address2', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.phone}</label>
            <input
              type="text"
              value={form.phone || ''}
              onChange={e => set('phone', e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.tareWeight}</label>
            <input
              type="number"
              value={form.tare_weight || ''}
              onChange={e => set('tare_weight', e.target.value)}
              className="glass-input"
              min={0}
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
