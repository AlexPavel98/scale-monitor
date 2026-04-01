'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase, type Weighing, type Customer } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import { useScale } from '@/lib/useScale'
import { formatKg, formatDateTime } from '@/lib/format'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ScaleDisplay from '@/components/ScaleDisplay'
import PendingWeighings from '@/components/PendingWeighings'
import WeighingTicket from '@/components/WeighingTicket'

const getTrafficLight = () => (typeof window !== 'undefined' ? (window as any).electronTrafficLight : undefined) as
  | {
      setRed: () => Promise<void>
      setGreen: () => Promise<void>
      onAutoChange: (callback: (data: { state: 'red' | 'green' }) => void) => () => void
    }
  | undefined

const getKiosk = () => (typeof window !== 'undefined' ? (window as any).electronKiosk : undefined) as
  | {
      onSubmit: (callback: (data: { cardNumber: string; weight: number }) => void) => () => void
    }
  | undefined

export default function WeighingPage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()
  const { profile } = useUser()
  const { status: scaleStatus, weight: liveWeight, stability } = useScale()

  // ---------- state ----------
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerNumber, setCustomerNumber] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)

  const [carNumber, setCarNumber] = useState('')
  const [trailerNumber, setTrailerNumber] = useState('')
  const [showVehicle, setShowVehicle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [trafficLight, setTrafficLight] = useState<'red' | 'green'>('green')

  // ---------- completion ----------
  const [selectedPending, setSelectedPending] = useState<Weighing | null>(null)
  const [completeWeight, setCompleteWeight] = useState<number>(0)
  const [completing, setCompleting] = useState(false)

  // ---------- ticket ----------
  const [ticketWeighing, setTicketWeighing] = useState<Weighing | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ name: string; address1: string; address2: string } | null>(null)

  const customerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setCustomerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ---------- traffic light sync ----------
  useEffect(() => {
    const tl = getTrafficLight()
    if (!tl?.onAutoChange) return
    const cleanup = tl.onAutoChange(({ state }) => {
      setTrafficLight(state === 'red' ? 'red' : 'green')
    })
    return cleanup
  }, [])

  // ---------- load data ----------
  useEffect(() => {
    async function load() {
      const [c, s] = await Promise.all([
        supabase.from('scale_customers').select('*').order('name'),
        supabase.from('scale_settings').select('*').eq('key', 'company_info').single(),
      ])
      setCustomers(c.data || [])
      if (s.data?.value) {
        const info = s.data.value as Record<string, string>
        setCompanyInfo({ name: info.name || '', address1: info.address1 || '', address2: info.address2 || '' })
      }
    }
    load()
  }, [])

  // ---------- kiosk submit: farmer code + weight ----------
  const kioskSubmitRef = useRef<(data: { cardNumber: string; weight: number }) => void>()
  kioskSubmitRef.current = async ({ cardNumber: code, weight: w }) => {
    // Look up customer by customer_number
    const match = customers.find(c => c.customer_number === code)
    if (!match) {
      toast(lang === 'da' ? `Avler ${code} ikke fundet` : `Farmer ${code} not found`, 'error')
      return
    }
    if (w <= 0) {
      toast(lang === 'da' ? 'Ingen vaegt' : 'No weight', 'error')
      return
    }

    setSaving(true)
    try {
      const { data: maxRow } = await supabase
        .from('scale_weighings')
        .select('weighing_number')
        .order('weighing_number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (maxRow?.weighing_number || 0) + 1

      const { error } = await supabase
        .from('scale_weighings')
        .insert({
          weighing_number: nextNumber,
          status: 'first' as const,
          direction: 'in' as const,
          customer_id: match.id,
          customer_number: match.customer_number,
          customer_name: match.name,
          first_date: new Date().toISOString(),
          first_weight: w,
          operator_id: profile?.id || null,
        })
        .select()
        .single()

      if (error) throw error

      toast(`#${nextNumber} - ${match.name} - ${w} kg`, 'success')
      resetForm()
    } catch (err) {
      console.error('Kiosk weighing error:', err)
      toast(lang === 'da' ? 'Fejl ved vejning' : 'Weighing error', 'error')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    const kioskApi = getKiosk()
    if (!kioskApi?.onSubmit) return
    const cleanup = kioskApi.onSubmit((data) => { kioskSubmitRef.current?.(data) })
    return cleanup
  }, [])

  // ---------- reset ----------
  function resetForm() {
    setCustomerId(null)
    setCustomerNumber('')
    setCustomerName('')
    setCustomerSearch('')
    setCarNumber('')
    setTrailerNumber('')
    setShowVehicle(false)
  }

  // ---------- save weighing from UI (uses live weight) ----------
  async function handleWeigh(weightOverride?: number) {
    const w = weightOverride || liveWeight
    if (w <= 0) {
      toast(lang === 'da' ? 'Ingen vaegt paa vaegte' : 'No weight on scale', 'error')
      return
    }

    setSaving(true)
    try {
      const { data: maxRow } = await supabase
        .from('scale_weighings')
        .select('weighing_number')
        .order('weighing_number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (maxRow?.weighing_number || 0) + 1
      const plateStr = [carNumber, trailerNumber].filter(Boolean).join(' / ') || null

      const { error } = await supabase
        .from('scale_weighings')
        .insert({
          weighing_number: nextNumber,
          status: 'first' as const,
          direction: 'in' as const,
          plate_number: plateStr,
          customer_id: customerId,
          customer_number: customerNumber || null,
          customer_name: customerName || null,
          first_date: new Date().toISOString(),
          first_weight: w,
          operator_id: profile?.id || null,
        })
        .select()
        .single()

      if (error) throw error

      toast(`#${nextNumber} ${customerName || ''} - ${formatKg(w)}`, 'success')
      resetForm()
    } catch (err) {
      console.error('Weighing error:', err)
      toast(lang === 'da' ? 'Fejl ved vejning' : 'Weighing error', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ---------- complete weighing ----------
  async function handleComplete() {
    if (!selectedPending || completeWeight <= 0) return

    setCompleting(true)
    try {
      const firstW = selectedPending.first_weight || 0
      const net = Math.abs(firstW - completeWeight)

      const { data: updated, error } = await supabase
        .from('scale_weighings')
        .update({
          status: 'complete',
          second_weight: completeWeight,
          second_date: new Date().toISOString(),
          net_weight: net,
        })
        .eq('id', selectedPending.id)
        .select()
        .single()

      if (error) throw error

      toast(
        lang === 'da'
          ? `Vejning #${selectedPending.weighing_number} fuldfort - netto ${formatKg(net)}`
          : `Weighing #${selectedPending.weighing_number} completed - net ${formatKg(net)}`,
        'success'
      )

      setSelectedPending(null)
      setCompleteWeight(0)
      setTicketWeighing(updated)
    } catch (err) {
      console.error('Complete error:', err)
      toast(lang === 'da' ? 'Fejl ved fuldforelse' : 'Completion error', 'error')
    } finally {
      setCompleting(false)
    }
  }

  // ---------- filter ----------
  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customer_number.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const isConnected = scaleStatus === 'connected'
  const isStable = stability === 'stable'

  return (
    <PageShell title={t.weighing.title}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ══════ LEFT: Weight + Form ══════ */}
        <div className="lg:col-span-2 space-y-5">

          {/* Weight display */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-3">
              {/* Status */}
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <span className="text-xs font-medium text-content-dim">
                  {isConnected ? (isStable ? 'Stabil' : 'Ustabil') : 'Ikke forbundet'}
                </span>
              </div>
              {/* Traffic light indicator */}
              <button
                onClick={() => {
                  const next = trafficLight === 'red' ? 'green' : 'red'
                  setTrafficLight(next)
                  if (next === 'red') getTrafficLight()?.setRed()
                  else getTrafficLight()?.setGreen()
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  trafficLight === 'red'
                    ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${
                  trafficLight === 'red' ? 'bg-red-500' : 'bg-emerald-500'
                }`} />
                {trafficLight === 'red' ? 'STOP' : 'GO'}
              </button>
            </div>

            <div className="text-center py-4">
              <div className={`text-7xl font-black tabular-nums tracking-tight leading-none transition-colors ${
                isStable && isConnected ? 'text-brand-primary' : 'text-content'
              }`}>
                {isConnected ? formatKg(liveWeight) : '-- kg'}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="glass-card p-5 space-y-4">
            {/* Farmer */}
            <div ref={customerRef}>
              <label className="text-[11px] font-semibold text-content-muted mb-1.5 block uppercase tracking-widest">
                {lang === 'da' ? 'Avler' : 'Farmer'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setCustomerOpen(true)
                    if (customerId) { setCustomerId(null); setCustomerNumber(''); setCustomerName('') }
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  placeholder={lang === 'da' ? 'Navn eller nummer...' : 'Name or number...'}
                  className="glass-input"
                  autoFocus
                />
                {customerOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl shadow-xl max-h-52 overflow-y-auto border border-subtle">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-4 py-2.5 text-left hover:bg-subtle transition-colors flex items-center justify-between"
                        onClick={() => {
                          setCustomerId(c.id); setCustomerNumber(c.customer_number)
                          setCustomerName(c.name); setCustomerSearch(c.name); setCustomerOpen(false)
                        }}
                      >
                        <span className="font-medium text-content text-sm">{c.name}</span>
                        <span className="text-xs text-content-muted font-mono ml-3">{c.customer_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Vehicle toggle + fields */}
            {!showVehicle ? (
              <button
                type="button"
                onClick={() => setShowVehicle(true)}
                className="text-xs text-content-muted hover:text-content transition-colors"
              >
                + {lang === 'da' ? 'Bil / Trailer' : 'Car / Trailer'}
              </button>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-content-muted mb-1.5 block uppercase tracking-widest">
                    {lang === 'da' ? 'Bil nr.' : 'Car no.'}
                  </label>
                  <input
                    type="text"
                    value={carNumber}
                    onChange={e => setCarNumber(e.target.value.toUpperCase())}
                    placeholder="AB 12 345"
                    className="glass-input font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-semibold text-content-muted mb-1.5 block uppercase tracking-widest">
                    {lang === 'da' ? 'Trailer nr.' : 'Trailer no.'}
                  </label>
                  <input
                    type="text"
                    value={trailerNumber}
                    onChange={e => setTrailerNumber(e.target.value.toUpperCase())}
                    placeholder="CD 67 890"
                    className="glass-input font-mono"
                  />
                </div>
              </div>
            )}

            {/* Weight In button */}
            <button
              type="button"
              onClick={() => handleWeigh()}
              disabled={saving || !isConnected || liveWeight <= 0}
              className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {saving
                ? '...'
                : `${lang === 'da' ? 'Vej Ind' : 'Weight In'}${liveWeight > 0 ? ` - ${formatKg(liveWeight)}` : ''}`
              }
            </button>
          </div>
        </div>

        {/* ══════ RIGHT: Pending ══════ */}
        <div>
          <PendingWeighings onSelect={w => { setSelectedPending(w); setCompleteWeight(0) }} />
        </div>
      </div>

      {/* ============ Completion Sheet ============ */}
      <BottomSheet
        open={!!selectedPending}
        onClose={() => { setSelectedPending(null); setCompleteWeight(0) }}
        title={`${t.weighing.complete} #${selectedPending?.weighing_number || ''}`}
        footer={
          <button
            onClick={handleComplete}
            disabled={completing || completeWeight <= 0}
            className="btn-primary w-full py-3 text-base font-bold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {completing ? (lang === 'da' ? 'Gemmer...' : 'Saving...') : t.weighing.complete}
          </button>
        }
      >
        {selectedPending && (
          <div className="space-y-4">
            <div className="space-y-2">
              <InfoRow label={t.weighing.customer} value={selectedPending.customer_name || '-'} />
              <InfoRow label={t.weighing.plateNumber} value={selectedPending.plate_number || '-'} />
              <InfoRow label={t.weighing.firstWeight} value={formatKg(selectedPending.first_weight)} />
              <InfoRow label={t.common.date} value={formatDateTime(selectedPending.first_date, lang)} />
            </div>

            <div className="border-t border-subtle pt-4">
              <label className="text-xs font-medium text-content-muted mb-2 block">
                {t.weighing.secondWeight}
              </label>
              <ScaleDisplay
                value={completeWeight || undefined}
                onCapture={w => setCompleteWeight(w)}
              />
            </div>

            {completeWeight > 0 && selectedPending.first_weight != null && (
              <div className="glass-card p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-content-dim block mb-1">
                  {t.weighing.netWeight}
                </span>
                <span className="text-3xl font-bold text-brand-primary tabular-nums">
                  {formatKg(Math.abs(selectedPending.first_weight - completeWeight))}
                </span>
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ============ Ticket Sheet ============ */}
      <BottomSheet
        open={!!ticketWeighing}
        onClose={() => setTicketWeighing(null)}
        title={t.ticket.weighingReceipt}
      >
        {ticketWeighing && (
          <WeighingTicket
            weighing={ticketWeighing}
            companyInfo={companyInfo || undefined}
            operatorName={profile?.name}
            onClose={() => setTicketWeighing(null)}
          />
        )}
      </BottomSheet>
    </PageShell>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-content-muted">{label}</span>
      <span className="text-sm font-medium text-content">{value}</span>
    </div>
  )
}
