'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, type Weighing, type Card, type Vehicle, type Customer, type Product } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import { formatKg, formatDateTime, formatM3 } from '@/lib/format'
import PageShell from '@/components/PageShell'
import BottomSheet from '@/components/BottomSheet'
import ScaleDisplay from '@/components/ScaleDisplay'
import PendingWeighings from '@/components/PendingWeighings'
import WeighingTicket from '@/components/WeighingTicket'
import { CreditCard, Search, ChevronDown, ChevronUp, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

type WeighingDirection = 'in' | 'out'

export default function WeighingPage() {
  const t = useT()
  const { lang } = useLang()
  const { toast } = useToast()
  const { profile } = useUser()

  // ---------- master data ----------
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // ---------- form state ----------
  const [cardNumber, setCardNumber] = useState('')
  const [cardLookedUp, setCardLookedUp] = useState(false)

  const [vehicleId, setVehicleId] = useState<string | null>(null)
  const [plateNumber, setPlateNumber] = useState('')
  const [carrierName, setCarrierName] = useState('')
  const [tareWeight, setTareWeight] = useState<number>(0)

  const [customerId, setCustomerId] = useState<string | null>(null)
  const [customerNumber, setCustomerNumber] = useState('')
  const [customerName, setCustomerName] = useState('')

  const [productId, setProductId] = useState<string | null>(null)
  const [productNumber, setProductNumber] = useState('')
  const [productName, setProductName] = useState('')
  const [productDensity, setProductDensity] = useState<number | null>(null)

  const [direction, setDirection] = useState<WeighingDirection>('in')
  const [capturedWeight, setCapturedWeight] = useState<number>(0)

  const [deliveryNote, setDeliveryNote] = useState('')
  const [workplace, setWorkplace] = useState('')
  const [customerCase, setCustomerCase] = useState('')
  const [workCase, setWorkCase] = useState('')
  const [notes, setNotes] = useState('')
  const [extraOpen, setExtraOpen] = useState(false)

  const [saving, setSaving] = useState(false)

  // ---------- searchable dropdowns ----------
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerOpen, setCustomerOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [productOpen, setProductOpen] = useState(false)

  // ---------- completion ----------
  const [selectedPending, setSelectedPending] = useState<Weighing | null>(null)
  const [completeWeight, setCompleteWeight] = useState<number>(0)
  const [completing, setCompleting] = useState(false)

  // ---------- ticket ----------
  const [ticketWeighing, setTicketWeighing] = useState<Weighing | null>(null)
  const [companyInfo, setCompanyInfo] = useState<{ name: string; address1: string; address2: string } | null>(null)

  // ---------- refs for dropdown close on click outside ----------
  const vehicleRef = useRef<HTMLDivElement>(null)
  const customerRef = useRef<HTMLDivElement>(null)
  const productRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (vehicleRef.current && !vehicleRef.current.contains(e.target as Node)) setVehicleOpen(false)
      if (customerRef.current && !customerRef.current.contains(e.target as Node)) setCustomerOpen(false)
      if (productRef.current && !productRef.current.contains(e.target as Node)) setProductOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ---------- load master data ----------
  useEffect(() => {
    async function load() {
      const [v, c, p, s] = await Promise.all([
        supabase.from('scale_vehicles').select('*').order('plate_number'),
        supabase.from('scale_customers').select('*').order('name'),
        supabase.from('scale_products').select('*').order('name'),
        supabase.from('scale_settings').select('*').eq('key', 'company_info').single(),
      ])
      setVehicles(v.data || [])
      setCustomers(c.data || [])
      setProducts(p.data || [])
      if (s.data?.value) {
        const info = s.data.value as Record<string, string>
        setCompanyInfo({
          name: info.name || '',
          address1: info.address1 || '',
          address2: info.address2 || '',
        })
      }
    }
    load()
  }, [])

  // ---------- card lookup ----------
  const lookupCard = useCallback(async () => {
    if (!cardNumber.trim() || cardLookedUp) return
    const { data } = await supabase
      .from('scale_cards')
      .select('*')
      .eq('card_number', cardNumber.trim())
      .single()

    if (!data) return

    const card = data as Card
    setCardLookedUp(true)

    // Fill vehicle
    if (card.vehicle_id) {
      setVehicleId(card.vehicle_id)
      setPlateNumber(card.plate_number || '')
      setCarrierName(card.carrier_name || '')
      setTareWeight(card.tare_weight || 0)
      setVehicleSearch(card.plate_number || '')
    }

    // Fill customer
    if (card.customer_id) {
      setCustomerId(card.customer_id)
      setCustomerNumber(card.customer_number || '')
      setCustomerName(card.customer_name || '')
      setCustomerSearch(card.customer_name || '')
    }

    // Fill product
    if (card.product_id) {
      setProductId(card.product_id)
      setProductNumber(card.product_number || '')
      setProductName(card.product_name || '')
      setProductSearch(card.product_name || '')
      // Find density from products list
      const prod = products.find(p => p.id === card.product_id)
      setProductDensity(prod?.density ?? null)
    }

    // Fill extra fields
    if (card.workplace_name) setWorkplace(card.workplace_name)
    if (card.case_number) setCustomerCase(card.case_number)
    if (card.notes) setNotes(card.notes)
  }, [cardNumber, cardLookedUp, products])

  // ---------- reset form ----------
  function resetForm() {
    setCardNumber('')
    setCardLookedUp(false)
    setVehicleId(null)
    setPlateNumber('')
    setCarrierName('')
    setTareWeight(0)
    setVehicleSearch('')
    setCustomerId(null)
    setCustomerNumber('')
    setCustomerName('')
    setCustomerSearch('')
    setProductId(null)
    setProductNumber('')
    setProductName('')
    setProductDensity(null)
    setProductSearch('')
    setDirection('in')
    setCapturedWeight(0)
    setDeliveryNote('')
    setWorkplace('')
    setCustomerCase('')
    setWorkCase('')
    setNotes('')
    setExtraOpen(false)
  }

  // ---------- save first weighing ----------
  async function handleWeigh() {
    if (capturedWeight <= 0) {
      toast(lang === 'da' ? 'Angiv en vaegt' : 'Enter a weight', 'error')
      return
    }

    setSaving(true)
    try {
      // Get next weighing number
      const { data: maxRow } = await supabase
        .from('scale_weighings')
        .select('weighing_number')
        .order('weighing_number', { ascending: false })
        .limit(1)
        .single()

      const nextNumber = (maxRow?.weighing_number || 0) + 1

      const insertData = {
        weighing_number: nextNumber,
        status: 'first' as const,
        direction,
        vehicle_id: vehicleId,
        plate_number: plateNumber || null,
        carrier_name: carrierName || null,
        customer_id: customerId,
        customer_number: customerNumber || null,
        customer_name: customerName || null,
        product_id: productId,
        product_number: productNumber || null,
        product_name: productName || null,
        card_number: cardNumber || null,
        first_date: new Date().toISOString(),
        first_weight: capturedWeight,
        delivery_note: deliveryNote || null,
        workplace: workplace || null,
        customer_case: customerCase || null,
        work_case: workCase || null,
        notes: notes || null,
        operator_id: profile?.id || null,
      }

      const { data: newWeighing, error } = await supabase
        .from('scale_weighings')
        .insert(insertData)
        .select()
        .single()

      if (error) throw error

      // Insert log entry
      await supabase.from('scale_weigh_log').insert({
        weighing_id: newWeighing.id,
        action: 'created',
        operator_id: profile?.id || null,
        details: {
          direction,
          first_weight: capturedWeight,
          plate_number: plateNumber || null,
          customer_name: customerName || null,
          product_name: productName || null,
        },
      })

      toast(
        lang === 'da'
          ? `Vejning #${nextNumber} registreret`
          : `Weighing #${nextNumber} registered`,
        'success'
      )
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
    if (!selectedPending) return
    if (completeWeight <= 0) {
      toast(lang === 'da' ? 'Angiv en vaegt' : 'Enter a weight', 'error')
      return
    }

    setCompleting(true)
    try {
      const firstW = selectedPending.first_weight || 0
      const secondW = completeWeight
      const net = Math.abs(firstW - secondW)

      // Find product density for volume calculation
      let volume: number | null = null
      if (selectedPending.product_id) {
        const prod = products.find(p => p.id === selectedPending.product_id)
        if (prod?.density && prod.density > 0) {
          volume = parseFloat((net / prod.density).toFixed(2))
        }
      }

      const { data: updated, error } = await supabase
        .from('scale_weighings')
        .update({
          status: 'complete',
          second_weight: secondW,
          second_date: new Date().toISOString(),
          net_weight: net,
          volume_m3: volume,
        })
        .eq('id', selectedPending.id)
        .select()
        .single()

      if (error) throw error

      // Insert log
      await supabase.from('scale_weigh_log').insert({
        weighing_id: selectedPending.id,
        action: 'completed',
        operator_id: profile?.id || null,
        details: {
          first_weight: firstW,
          second_weight: secondW,
          net_weight: net,
          volume_m3: volume,
        },
      })

      toast(
        lang === 'da'
          ? `Vejning #${selectedPending.weighing_number} fuldfort`
          : `Weighing #${selectedPending.weighing_number} completed`,
        'success'
      )

      // Close completion sheet, show ticket
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

  // ---------- filter helpers ----------
  const filteredVehicles = vehicles.filter(v =>
    !vehicleSearch || v.plate_number.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    (v.carrier_name || '').toLowerCase().includes(vehicleSearch.toLowerCase())
  )

  const filteredCustomers = customers.filter(c =>
    !customerSearch || c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customer_number.toLowerCase().includes(customerSearch.toLowerCase())
  )

  const filteredProducts = products.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.product_number.toLowerCase().includes(productSearch.toLowerCase())
  )

  return (
    <PageShell title={t.weighing.title}>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ============ LEFT: New Weighing Form ============ */}
        <div className="lg:col-span-3 space-y-5">
          <div className="glass-card p-5">
            <h2 className="text-lg font-bold text-content mb-4">{t.weighing.newWeighing}</h2>

            {/* Card number */}
            <div className="mb-4">
              <label className="text-xs font-medium text-content-muted mb-1 block">
                {t.weighing.cardNumber}
              </label>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-dim" />
                <input
                  type="text"
                  value={cardNumber}
                  onChange={e => {
                    setCardNumber(e.target.value)
                    setCardLookedUp(false)
                  }}
                  onBlur={lookupCard}
                  onKeyDown={e => { if (e.key === 'Enter') lookupCard() }}
                  placeholder={lang === 'da' ? 'Scan eller indtast kortnr.' : 'Scan or enter card no.'}
                  className="glass-input pl-9"
                  autoFocus
                />
              </div>
            </div>

            {/* Vehicle */}
            <div className="mb-4" ref={vehicleRef}>
              <label className="text-xs font-medium text-content-muted mb-1 block">
                {t.weighing.plateNumber} / {t.weighing.carrier}
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-dim" />
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={e => {
                    setVehicleSearch(e.target.value)
                    setVehicleOpen(true)
                    // Clear selection if user changes text
                    if (vehicleId) {
                      setVehicleId(null)
                      setPlateNumber('')
                      setCarrierName('')
                      setTareWeight(0)
                    }
                  }}
                  onFocus={() => setVehicleOpen(true)}
                  placeholder={t.weighing.selectVehicle}
                  className="glass-input pl-9"
                />
                {vehicleOpen && filteredVehicles.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl shadow-xl max-h-48 overflow-y-auto border border-subtle">
                    {filteredVehicles.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-subtle transition-colors text-sm flex items-center justify-between"
                        onClick={() => {
                          setVehicleId(v.id)
                          setPlateNumber(v.plate_number)
                          setCarrierName(v.carrier_name || '')
                          setTareWeight(v.tare_weight || 0)
                          setVehicleSearch(v.plate_number)
                          setVehicleOpen(false)
                        }}
                      >
                        <span className="font-medium text-content">{v.plate_number}</span>
                        {v.carrier_name && (
                          <span className="text-xs text-content-muted">{v.carrier_name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {vehicleId && tareWeight > 0 && (
                <p className="text-xs text-content-muted mt-1">
                  {t.weighing.tare}: {formatKg(tareWeight)}
                  {carrierName && ` | ${carrierName}`}
                </p>
              )}
            </div>

            {/* Customer */}
            <div className="mb-4" ref={customerRef}>
              <label className="text-xs font-medium text-content-muted mb-1 block">
                {t.weighing.customer}
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-dim" />
                <input
                  type="text"
                  value={customerSearch}
                  onChange={e => {
                    setCustomerSearch(e.target.value)
                    setCustomerOpen(true)
                    if (customerId) {
                      setCustomerId(null)
                      setCustomerNumber('')
                      setCustomerName('')
                    }
                  }}
                  onFocus={() => setCustomerOpen(true)}
                  placeholder={t.weighing.selectCustomer}
                  className="glass-input pl-9"
                />
                {customerOpen && filteredCustomers.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl shadow-xl max-h-48 overflow-y-auto border border-subtle">
                    {filteredCustomers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-subtle transition-colors text-sm flex items-center justify-between"
                        onClick={() => {
                          setCustomerId(c.id)
                          setCustomerNumber(c.customer_number)
                          setCustomerName(c.name)
                          setCustomerSearch(c.name)
                          setCustomerOpen(false)
                        }}
                      >
                        <span className="font-medium text-content">{c.name}</span>
                        <span className="text-xs text-content-muted">{c.customer_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product */}
            <div className="mb-4" ref={productRef}>
              <label className="text-xs font-medium text-content-muted mb-1 block">
                {t.weighing.product}
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-dim" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={e => {
                    setProductSearch(e.target.value)
                    setProductOpen(true)
                    if (productId) {
                      setProductId(null)
                      setProductNumber('')
                      setProductName('')
                      setProductDensity(null)
                    }
                  }}
                  onFocus={() => setProductOpen(true)}
                  placeholder={t.weighing.selectProduct}
                  className="glass-input pl-9"
                />
                {productOpen && filteredProducts.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl shadow-xl max-h-48 overflow-y-auto border border-subtle">
                    {filteredProducts.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-subtle transition-colors text-sm flex items-center justify-between"
                        onClick={() => {
                          setProductId(p.id)
                          setProductNumber(p.product_number)
                          setProductName(p.name)
                          setProductDensity(p.density)
                          setProductSearch(p.name)
                          setProductOpen(false)
                        }}
                      >
                        <span className="font-medium text-content">{p.name}</span>
                        <span className="text-xs text-content-muted">{p.product_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {productDensity && (
                <p className="text-xs text-content-muted mt-1">
                  {t.products.density}: {productDensity} kg/m3
                </p>
              )}
            </div>

            {/* Direction toggle */}
            <div className="mb-5">
              <label className="text-xs font-medium text-content-muted mb-2 block">
                {t.weighing.direction}
              </label>
              <div className="flex rounded-xl overflow-hidden border border-subtle">
                <button
                  type="button"
                  onClick={() => setDirection('in')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    direction === 'in'
                      ? 'bg-brand-primary text-white'
                      : 'bg-subtle text-content-muted hover:text-content'
                  }`}
                >
                  <ArrowDownToLine size={16} />
                  {t.weighing.directionIn}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('out')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${
                    direction === 'out'
                      ? 'bg-brand-primary text-white'
                      : 'bg-subtle text-content-muted hover:text-content'
                  }`}
                >
                  <ArrowUpFromLine size={16} />
                  {t.weighing.directionOut}
                </button>
              </div>
            </div>

            {/* Scale display */}
            <div className="mb-5">
              <ScaleDisplay
                value={capturedWeight || undefined}
                onCapture={w => setCapturedWeight(w)}
              />
            </div>

            {/* Extra fields - collapsible */}
            <div className="mb-5">
              <button
                type="button"
                onClick={() => setExtraOpen(!extraOpen)}
                className="flex items-center gap-2 text-sm text-content-muted hover:text-content transition-colors"
              >
                {extraOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {lang === 'da' ? 'Ekstra felter' : 'Additional fields'}
              </button>

              {extraOpen && (
                <div className="mt-3 space-y-3 slide-up">
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">
                      {t.weighing.deliveryNote}
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={e => setDeliveryNote(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">
                      {t.weighing.workplace}
                    </label>
                    <input
                      type="text"
                      value={workplace}
                      onChange={e => setWorkplace(e.target.value)}
                      className="glass-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-content-muted mb-1 block">
                        {t.weighing.caseNumber} ({lang === 'da' ? 'Kunde' : 'Customer'})
                      </label>
                      <input
                        type="text"
                        value={customerCase}
                        onChange={e => setCustomerCase(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-content-muted mb-1 block">
                        {t.weighing.caseNumber} ({lang === 'da' ? 'Arbejde' : 'Work'})
                      </label>
                      <input
                        type="text"
                        value={workCase}
                        onChange={e => setWorkCase(e.target.value)}
                        className="glass-input"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">
                      {t.common.notes}
                    </label>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="glass-input min-h-[60px] resize-y"
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Weigh button */}
            <button
              type="button"
              onClick={handleWeigh}
              disabled={saving || capturedWeight <= 0}
              className="btn-primary w-full py-4 text-lg font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (lang === 'da' ? 'Gemmer...' : 'Saving...') : t.weighing.weigh}
            </button>
          </div>
        </div>

        {/* ============ RIGHT: Pending Weighings ============ */}
        <div className="lg:col-span-2">
          <PendingWeighings onSelect={w => {
            setSelectedPending(w)
            setCompleteWeight(0)
          }} />
        </div>
      </div>

      {/* ============ Completion Bottom Sheet ============ */}
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
            {completing
              ? (lang === 'da' ? 'Gemmer...' : 'Saving...')
              : t.weighing.complete
            }
          </button>
        }
      >
        {selectedPending && (
          <div className="space-y-4">
            {/* Summary of first weighing */}
            <div className="space-y-2">
              <InfoRow label={t.weighing.plateNumber} value={selectedPending.plate_number || '-'} />
              <InfoRow label={t.weighing.carrier} value={selectedPending.carrier_name || '-'} />
              <InfoRow label={t.weighing.customer} value={selectedPending.customer_name || '-'} />
              <InfoRow label={t.weighing.product} value={selectedPending.product_name || '-'} />
              <InfoRow
                label={t.weighing.direction}
                value={selectedPending.direction === 'in' ? t.weighing.directionIn : t.weighing.directionOut}
              />
              <InfoRow
                label={t.weighing.firstWeight}
                value={formatKg(selectedPending.first_weight)}
              />
              <InfoRow
                label={t.common.date}
                value={formatDateTime(selectedPending.first_date, lang)}
              />
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

            {/* Live net preview */}
            {completeWeight > 0 && selectedPending.first_weight != null && (
              <div className="glass-card p-4 text-center">
                <span className="text-xs font-medium uppercase tracking-wider text-content-dim block mb-1">
                  {t.weighing.netWeight}
                </span>
                <span className="text-3xl font-bold text-brand-primary tabular-nums">
                  {formatKg(Math.abs(selectedPending.first_weight - completeWeight))}
                </span>
                {(() => {
                  const net = Math.abs(selectedPending.first_weight! - completeWeight)
                  const prod = products.find(p => p.id === selectedPending.product_id)
                  if (prod?.density && prod.density > 0) {
                    return (
                      <p className="text-sm text-content-muted mt-1">
                        {t.weighing.volume}: {formatM3(net / prod.density)}
                      </p>
                    )
                  }
                  return null
                })()}
              </div>
            )}
          </div>
        )}
      </BottomSheet>

      {/* ============ Ticket Bottom Sheet ============ */}
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
