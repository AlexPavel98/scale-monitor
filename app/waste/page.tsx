'use client'

import { useState, useEffect } from 'react'
import { supabase, type Facility, type Municipality, type WasteReport } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { formatKg, formatDate } from '@/lib/format'
import { useLang } from '@/lib/i18n'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import { Plus, Save, FileText, ToggleLeft, ToggleRight } from 'lucide-react'

const METHODS = ['import', 'export', 'receiver', 'collector', 'col_and_rec'] as const

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => currentYear - i)

const emptyFacility: Partial<Facility> = {
  name: '',
  address1: '',
  address2: '',
  cvr_number: '',
  p_number: '',
  contact_person: '',
  contact_phone: '',
  is_import: false,
  is_export: false,
  is_receiver: false,
  is_collector: false,
  is_col_and_rec: false,
}

export default function WastePage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()

  // Facility
  const [facility, setFacility] = useState<Partial<Facility>>(emptyFacility)
  const [facilityId, setFacilityId] = useState<string | null>(null)
  const [savingFacility, setSavingFacility] = useState(false)

  // Reporting year
  const [reportingYear, setReportingYear] = useState(currentYear)

  // Municipalities
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [addMunOpen, setAddMunOpen] = useState(false)
  const [newMunCode, setNewMunCode] = useState('')
  const [newMunName, setNewMunName] = useState('')
  const [savingMun, setSavingMun] = useState(false)

  // Reports
  const [reports, setReports] = useState<WasteReport[]>([])
  const [generatingReport, setGeneratingReport] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    loadReports()
  }, [reportingYear])

  async function loadAll() {
    setLoading(true)
    await Promise.all([loadFacility(), loadMunicipalities(), loadReports()])
    setLoading(false)
  }

  async function loadFacility() {
    const { data } = await supabase
      .from('scale_facility')
      .select('*')
      .limit(1)
      .single()

    if (data) {
      setFacilityId(data.id)
      setFacility({
        name: data.name || '',
        address1: data.address1 || '',
        address2: data.address2 || '',
        cvr_number: data.cvr_number || '',
        p_number: data.p_number || '',
        contact_person: data.contact_person || '',
        contact_phone: data.contact_phone || '',
        is_import: data.is_import,
        is_export: data.is_export,
        is_receiver: data.is_receiver,
        is_collector: data.is_collector,
        is_col_and_rec: data.is_col_and_rec,
      })
    }
  }

  async function loadMunicipalities() {
    const { data } = await supabase
      .from('scale_municipalities')
      .select('*')
      .order('code')
    setMunicipalities(data || [])
  }

  async function loadReports() {
    const { data } = await supabase
      .from('scale_waste_reports')
      .select('*')
      .eq('reporting_year', reportingYear)
      .order('created_at', { ascending: false })
    setReports(data || [])
  }

  async function saveFacility() {
    if (!facility.name?.trim()) return
    setSavingFacility(true)

    const payload = {
      name: facility.name!.trim(),
      address1: facility.address1?.trim() || null,
      address2: facility.address2?.trim() || null,
      cvr_number: facility.cvr_number?.trim() || null,
      p_number: facility.p_number?.trim() || null,
      contact_person: facility.contact_person?.trim() || null,
      contact_phone: facility.contact_phone?.trim() || null,
      is_import: facility.is_import || false,
      is_export: facility.is_export || false,
      is_receiver: facility.is_receiver || false,
      is_collector: facility.is_collector || false,
      is_col_and_rec: facility.is_col_and_rec || false,
    }

    if (facilityId) {
      const { error } = await supabase
        .from('scale_facility')
        .update(payload)
        .eq('id', facilityId)
      if (error) { toast(error.message, 'error'); setSavingFacility(false); return }
    } else {
      const { data, error } = await supabase
        .from('scale_facility')
        .insert(payload)
        .select()
        .single()
      if (error) { toast(error.message, 'error'); setSavingFacility(false); return }
      if (data) setFacilityId(data.id)
    }

    setSavingFacility(false)
    toast(t.common.save)
  }

  async function toggleMunicipality(m: Municipality) {
    const { error } = await supabase
      .from('scale_municipalities')
      .update({ active: !m.active })
      .eq('id', m.id)
    if (error) { toast(error.message, 'error'); return }
    setMunicipalities(prev =>
      prev.map(item => item.id === m.id ? { ...item, active: !item.active } : item)
    )
  }

  async function addMunicipality() {
    if (!newMunCode.trim() || !newMunName.trim()) return
    setSavingMun(true)

    const { error } = await supabase
      .from('scale_municipalities')
      .insert({ code: newMunCode.trim(), name: newMunName.trim(), active: true })

    if (error) { toast(error.message, 'error'); setSavingMun(false); return }

    setSavingMun(false)
    setAddMunOpen(false)
    setNewMunCode('')
    setNewMunName('')
    loadMunicipalities()
    toast(t.common.add)
  }

  async function generateReport() {
    setGeneratingReport(true)

    // Get all completed weighings for the reporting year
    const yearStart = new Date(reportingYear, 0, 1).toISOString()
    const yearEnd = new Date(reportingYear + 1, 0, 1).toISOString()

    const { data: yearWeighings, error } = await supabase
      .from('scale_weighings')
      .select('*')
      .eq('status', 'complete')
      .gte('first_date', yearStart)
      .lt('first_date', yearEnd)

    if (error) {
      toast(error.message, 'error')
      setGeneratingReport(false)
      return
    }

    const rows = (yearWeighings || []) as any[]
    const totalKg = rows.reduce((sum: number, w: any) => sum + (w.net_weight || 0), 0)

    // Create a draft report
    const { error: insertError } = await supabase
      .from('scale_waste_reports')
      .insert({
        reporting_year: reportingYear,
        cvr_number: facility.cvr_number || null,
        p_number: facility.p_number || null,
        total_weight_kg: totalKg,
        record_count: rows.length,
        status: 'draft',
      })

    if (insertError) {
      toast(insertError.message, 'error')
      setGeneratingReport(false)
      return
    }

    setGeneratingReport(false)
    loadReports()
    toast(t.waste.generateReport)
  }

  function reportStatusBadge(status: string) {
    switch (status) {
      case 'draft': return <span className="badge-warning text-xs px-2 py-0.5 rounded-full">{t.waste.draft}</span>
      case 'submitted': return <span className="badge-ok text-xs px-2 py-0.5 rounded-full">{t.waste.submitted}</span>
      case 'error': return <span className="badge-expired text-xs px-2 py-0.5 rounded-full">Error</span>
      default: return <span className="text-xs text-content-muted">{status}</span>
    }
  }

  function setF(key: keyof Facility, value: string | boolean) {
    setFacility(prev => ({ ...prev, [key]: value }))
  }

  return (
    <PageShell title={t.waste.title}>
      {loading ? (
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      ) : (
        <div className="space-y-6">
          {/* Facility Info */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.waste.facility}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.companyName} *</label>
                <input
                  type="text"
                  value={facility.name || ''}
                  onChange={e => setF('name', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.address} 1</label>
                <input
                  type="text"
                  value={facility.address1 || ''}
                  onChange={e => setF('address1', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.address} 2</label>
                <input
                  type="text"
                  value={facility.address2 || ''}
                  onChange={e => setF('address2', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.cvr}</label>
                <input
                  type="text"
                  value={facility.cvr_number || ''}
                  onChange={e => setF('cvr_number', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.pNumber}</label>
                <input
                  type="text"
                  value={facility.p_number || ''}
                  onChange={e => setF('p_number', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Kontaktperson</label>
                <input
                  type="text"
                  value={facility.contact_person || ''}
                  onChange={e => setF('contact_person', e.target.value)}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.phone}</label>
                <input
                  type="text"
                  value={facility.contact_phone || ''}
                  onChange={e => setF('contact_phone', e.target.value)}
                  className="glass-input"
                />
              </div>
            </div>

            {/* Method checkboxes */}
            <h3 className="text-sm font-medium text-content mt-5 mb-3">{t.waste.method}</h3>
            <div className="flex flex-wrap gap-4">
              {METHODS.map(method => {
                const key = method === 'col_and_rec' ? 'is_col_and_rec' : `is_${method}` as keyof Facility
                const checked = !!facility[key]
                return (
                  <label key={method} className="flex items-center gap-2 text-sm text-content cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => setF(key, e.target.checked)}
                      className="w-4 h-4 rounded accent-brand-primary"
                    />
                    <span className="capitalize">{method.replace('_', ' & ')}</span>
                  </label>
                )
              })}
            </div>

            <div className="flex justify-end mt-5">
              <button onClick={saveFacility} disabled={savingFacility} className="btn-primary text-sm flex items-center gap-1.5">
                <Save size={16} /> {savingFacility ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>

          {/* Reporting Year */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-content">{t.waste.reportingYear}</h2>
              <select
                value={reportingYear}
                onChange={e => setReportingYear(Number(e.target.value))}
                className="glass-input w-32 text-sm"
              >
                {YEARS.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Municipalities */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-content">{t.waste.municipality}</h2>
              <button onClick={() => setAddMunOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
                <Plus size={16} /> {t.common.add}
              </button>
            </div>

            {municipalities.length === 0 ? (
              <p className="text-sm text-content-muted">{t.common.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle text-left">
                      <th className="pb-3 pr-4 font-medium text-content-muted">Kode</th>
                      <th className="pb-3 pr-4 font-medium text-content-muted">{t.customers.name}</th>
                      <th className="pb-3 font-medium text-content-muted text-right">Aktiv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {municipalities.map(m => (
                      <tr key={m.id} className="border-b border-subtle">
                        <td className="py-3 pr-4 font-medium text-content tabular-nums">{m.code}</td>
                        <td className="py-3 pr-4 text-content">{m.name}</td>
                        <td className="py-3 text-right">
                          <button onClick={() => toggleMunicipality(m)} className="text-content-muted hover:text-content transition-colors">
                            {m.active
                              ? <ToggleRight size={22} className="text-brand-primary" />
                              : <ToggleLeft size={22} />
                            }
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Waste Reports */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-content">Rapporter ({reportingYear})</h2>
              <button
                onClick={generateReport}
                disabled={generatingReport}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <FileText size={16} />
                {generatingReport ? t.common.loading : t.waste.generateReport}
              </button>
            </div>

            {reports.length === 0 ? (
              <p className="text-sm text-content-muted">{t.common.noData}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-subtle text-left">
                      <th className="pb-3 pr-4 font-medium text-content-muted">{t.common.date}</th>
                      <th className="pb-3 pr-4 font-medium text-content-muted text-right">{t.statistics.totalWeight}</th>
                      <th className="pb-3 pr-4 font-medium text-content-muted text-right">{t.statistics.totalCount}</th>
                      <th className="pb-3 font-medium text-content-muted">{t.common.status}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id} className="border-b border-subtle">
                        <td className="py-3 pr-4 text-content-muted">{formatDate(r.created_at, lang)}</td>
                        <td className="py-3 pr-4 text-content text-right tabular-nums">{formatKg(r.total_weight_kg)}</td>
                        <td className="py-3 pr-4 text-content text-right tabular-nums">{r.record_count ?? 0}</td>
                        <td className="py-3">{reportStatusBadge(r.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Municipality BottomSheet */}
      <BottomSheet
        open={addMunOpen}
        onClose={() => setAddMunOpen(false)}
        title={`${t.common.add} ${t.waste.municipality}`}
        footer={
          <div className="flex gap-3">
            <button onClick={() => setAddMunOpen(false)} className="btn-secondary flex-1 text-sm">{t.common.cancel}</button>
            <button onClick={addMunicipality} disabled={savingMun} className="btn-primary flex-1 text-sm">
              {savingMun ? t.common.loading : t.common.save}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">Kode *</label>
            <input
              type="text"
              value={newMunCode}
              onChange={e => setNewMunCode(e.target.value)}
              className="glass-input"
              placeholder="0101"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.name} *</label>
            <input
              type="text"
              value={newMunName}
              onChange={e => setNewMunName(e.target.value)}
              className="glass-input"
              placeholder="Kobenhavn"
            />
          </div>
        </div>
      </BottomSheet>
    </PageShell>
  )
}
