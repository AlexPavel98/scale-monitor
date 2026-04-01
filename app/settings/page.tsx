'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import { useToast } from '@/lib/useToast'
import { useUser } from '@/lib/useUser'
import PageShell from '@/components/PageShell'
import { Save, ShieldX, CircleDot, Monitor } from 'lucide-react'

type CompanyInfo = {
  name: string
  address1: string
  address2: string
  phone: string
  cvr: string
}

type TicketConfig = {
  showLogo: boolean
  copies: number
}

type ControlFieldLabels = {
  control1: string
  control2: string
  control3: string
  control4: string
  control5: string
}

type ScaleConfig = {
  comPort: string
  baudRate: number
  dataBits: number
  parity: string
  stopBits: number
  weightRegex: string
}

const defaultCompany: CompanyInfo = { name: '', address1: '', address2: '', phone: '', cvr: '' }
const defaultTicket: TicketConfig = { showLogo: true, copies: 1 }
const defaultControls: ControlFieldLabels = {
  control1: 'Kontrol 1', control2: 'Kontrol 2', control3: 'Kontrol 3',
  control4: 'Kontrol 4', control5: 'Kontrol 5',
}
const defaultScale: ScaleConfig = {
  comPort: 'COM1', baudRate: 9600, dataBits: 8,
  parity: 'none', stopBits: 1, weightRegex: '(\\d+\\.?\\d*)\\s*kg',
}

type HardwareConfig = {
  trafficLight: {
    enabled: boolean
    host: string
    port: number
  }
  kiosk: {
    enabled: boolean
    host: string
    displayPort: number
    keyboardPort: number
  }
}

const defaultHardware: HardwareConfig = {
  trafficLight: { enabled: false, host: '192.168.2.21', port: 10000 },
  kiosk: { enabled: false, host: '192.168.2.21', displayPort: 10004, keyboardPort: 10008 },
}

// Type guard for Electron IPC bridges
declare global {
  interface Window {
    electronTrafficLight?: {
      connect: (host: string, port: number) => Promise<void>
      disconnect: () => Promise<void>
      setRed: () => Promise<void>
      setGreen: () => Promise<void>
      allOff: () => Promise<void>
      setGreenThenOff: (delay?: number) => Promise<void>
    }
    electronKiosk?: {
      connect: (host: string, displayPort: number, keyboardPort: number) => Promise<void>
      disconnect: () => Promise<void>
      sendDisplay: (line1: string, line2?: string) => Promise<void>
      showReady: () => Promise<void>
    }
  }
}

export default function SettingsPage() {
  const t = useT()
  const { toast } = useToast()
  const { isAdmin, loading: userLoading } = useUser()

  const [company, setCompany] = useState<CompanyInfo>(defaultCompany)
  const [ticket, setTicket] = useState<TicketConfig>(defaultTicket)
  const [controls, setControls] = useState<ControlFieldLabels>(defaultControls)
  const [scale, setScale] = useState<ScaleConfig>(defaultScale)
  const [hardware, setHardware] = useState<HardwareConfig>(defaultHardware)

  const [savingCompany, setSavingCompany] = useState(false)
  const [savingTicket, setSavingTicket] = useState(false)
  const [savingControls, setSavingControls] = useState(false)
  const [savingScale, setSavingScale] = useState(false)
  const [savingHardware, setSavingHardware] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    setLoading(true)

    const { data } = await supabase
      .from('scale_settings')
      .select('*')

    if (data) {
      for (const row of data) {
        const val = row.value as Record<string, unknown>
        switch (row.key) {
          case 'company_info':
            setCompany({ ...defaultCompany, ...val } as CompanyInfo)
            break
          case 'ticket_config':
            setTicket({ ...defaultTicket, ...val } as TicketConfig)
            break
          case 'control_field_labels':
            setControls({ ...defaultControls, ...val } as ControlFieldLabels)
            break
          case 'scale_config':
            setScale({ ...defaultScale, ...val } as ScaleConfig)
            break
          case 'hardware_config':
            setHardware({
              trafficLight: { ...defaultHardware.trafficLight, ...(val.trafficLight as Record<string, unknown> || {}) },
              kiosk: { ...defaultHardware.kiosk, ...(val.kiosk as Record<string, unknown> || {}) },
            } as HardwareConfig)
            break
        }
      }
    }

    setLoading(false)
  }

  async function saveSetting(key: string, value: Record<string, unknown>, setSaving: (v: boolean) => void) {
    setSaving(true)

    const { error } = await supabase
      .from('scale_settings')
      .upsert({ key, value }, { onConflict: 'key' })

    if (error) {
      toast(error.message, 'error')
      setSaving(false)
      return
    }

    setSaving(false)
    toast(t.common.save)
  }

  if (userLoading) {
    return (
      <PageShell title={t.settings.title}>
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      </PageShell>
    )
  }

  // Admin check bypassed for local development
  // if (!isAdmin) {
  //   return (
  //     <PageShell title={t.settings.title}>
  //       <div className="text-center py-16">
  //         <ShieldX size={48} className="mx-auto mb-4 text-content-dim" />
  //         <p className="text-content-muted text-sm">Access denied</p>
  //       </div>
  //     </PageShell>
  //   )
  // }

  return (
    <PageShell title={t.settings.title}>
      {loading ? (
        <p className="text-content-muted text-sm">{t.common.loading}</p>
      ) : (
        <div className="space-y-6 max-w-2xl">
          {/* Company Info */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.settings.companyInfo}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.companyName}</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={e => setCompany(prev => ({ ...prev, name: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.address} 1</label>
                <input
                  type="text"
                  value={company.address1}
                  onChange={e => setCompany(prev => ({ ...prev, address1: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.address} 2</label>
                <input
                  type="text"
                  value={company.address2}
                  onChange={e => setCompany(prev => ({ ...prev, address2: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.vehicles.phone}</label>
                <input
                  type="text"
                  value={company.phone}
                  onChange={e => setCompany(prev => ({ ...prev, phone: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.customers.cvr}</label>
                <input
                  type="text"
                  value={company.cvr}
                  onChange={e => setCompany(prev => ({ ...prev, cvr: e.target.value }))}
                  className="glass-input"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => saveSetting('company_info', company as unknown as Record<string, unknown>, setSavingCompany)}
                disabled={savingCompany}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save size={16} /> {savingCompany ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>

          {/* Ticket Config */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.settings.ticketConfig}</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ticket.showLogo}
                  onChange={e => setTicket(prev => ({ ...prev, showLogo: e.target.checked }))}
                  className="w-4 h-4 rounded accent-brand-primary"
                />
                <span className="text-sm text-content">Vis logo</span>
              </label>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Kopier</label>
                <input
                  type="number"
                  value={ticket.copies}
                  onChange={e => setTicket(prev => ({ ...prev, copies: Number(e.target.value) || 1 }))}
                  className="glass-input w-24"
                  min={1}
                  max={5}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => saveSetting('ticket_config', ticket as unknown as Record<string, unknown>, setSavingTicket)}
                disabled={savingTicket}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save size={16} /> {savingTicket ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>

          {/* Control Field Labels */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.settings.controlFields}</h2>
            <div className="space-y-4">
              {([1, 2, 3, 4, 5] as const).map(n => {
                const key = `control${n}` as keyof ControlFieldLabels
                return (
                  <div key={n}>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.products.control} {n}</label>
                    <input
                      type="text"
                      value={controls[key]}
                      onChange={e => setControls(prev => ({ ...prev, [key]: e.target.value }))}
                      className="glass-input"
                    />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => saveSetting('control_field_labels', controls as unknown as Record<string, unknown>, setSavingControls)}
                disabled={savingControls}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save size={16} /> {savingControls ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>

          {/* Hardware Config */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.settings.hardware}</h2>

            {/* Traffic Light */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <CircleDot size={16} className="text-content-muted" />
                <h3 className="text-sm font-semibold text-content">{t.settings.trafficLight}</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardware.trafficLight.enabled}
                    onChange={e => setHardware(prev => ({
                      ...prev,
                      trafficLight: { ...prev.trafficLight, enabled: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded accent-brand-primary"
                  />
                  <span className="text-sm text-content">{t.settings.enabled}</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.host}</label>
                    <input
                      type="text"
                      value={hardware.trafficLight.host}
                      onChange={e => setHardware(prev => ({
                        ...prev,
                        trafficLight: { ...prev.trafficLight, host: e.target.value },
                      }))}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.port}</label>
                    <input
                      type="number"
                      value={hardware.trafficLight.port}
                      onChange={e => setHardware(prev => ({
                        ...prev,
                        trafficLight: { ...prev.trafficLight, port: Number(e.target.value) || 10000 },
                      }))}
                      className="glass-input"
                    />
                  </div>
                </div>
                {typeof window !== 'undefined' && window.electronTrafficLight && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.electronTrafficLight!.connect(hardware.trafficLight.host, hardware.trafficLight.port)
                          await window.electronTrafficLight!.setRed()
                          toast(t.settings.testRed)
                        } catch (err) {
                          toast(String(err), 'error')
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t.settings.testRed}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.electronTrafficLight!.connect(hardware.trafficLight.host, hardware.trafficLight.port)
                          await window.electronTrafficLight!.setGreen()
                          toast(t.settings.testGreen)
                        } catch (err) {
                          toast(String(err), 'error')
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t.settings.testGreen}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.electronTrafficLight!.allOff()
                          toast(t.settings.testOff)
                        } catch (err) {
                          toast(String(err), 'error')
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t.settings.testOff}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Kiosk Terminal */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Monitor size={16} className="text-content-muted" />
                <h3 className="text-sm font-semibold text-content">{t.settings.kioskTerminal}</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardware.kiosk.enabled}
                    onChange={e => setHardware(prev => ({
                      ...prev,
                      kiosk: { ...prev.kiosk, enabled: e.target.checked },
                    }))}
                    className="w-4 h-4 rounded accent-brand-primary"
                  />
                  <span className="text-sm text-content">{t.settings.enabled}</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.host}</label>
                    <input
                      type="text"
                      value={hardware.kiosk.host}
                      onChange={e => setHardware(prev => ({
                        ...prev,
                        kiosk: { ...prev.kiosk, host: e.target.value },
                      }))}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.displayPort}</label>
                    <input
                      type="number"
                      value={hardware.kiosk.displayPort}
                      onChange={e => setHardware(prev => ({
                        ...prev,
                        kiosk: { ...prev.kiosk, displayPort: Number(e.target.value) || 10004 },
                      }))}
                      className="glass-input"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.keyboardPort}</label>
                    <input
                      type="number"
                      value={hardware.kiosk.keyboardPort}
                      onChange={e => setHardware(prev => ({
                        ...prev,
                        kiosk: { ...prev.kiosk, keyboardPort: Number(e.target.value) || 10008 },
                      }))}
                      className="glass-input"
                    />
                  </div>
                </div>
                {typeof window !== 'undefined' && window.electronKiosk && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.electronKiosk!.connect(hardware.kiosk.host, hardware.kiosk.displayPort, hardware.kiosk.keyboardPort)
                          await window.electronKiosk!.showReady()
                          toast(t.settings.testDisplay)
                        } catch (err) {
                          toast(String(err), 'error')
                        }
                      }}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      {t.settings.testDisplay}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => saveSetting('hardware_config', hardware as unknown as Record<string, unknown>, setSavingHardware)}
                disabled={savingHardware}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save size={16} /> {savingHardware ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>

          {/* Scale Config */}
          <div className="glass-card p-5">
            <h2 className="text-base font-semibold text-content mb-4">{t.settings.scaleConfig}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.comPort}</label>
                <input
                  type="text"
                  value={scale.comPort}
                  onChange={e => setScale(prev => ({ ...prev, comPort: e.target.value }))}
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">{t.settings.baudRate}</label>
                <select
                  value={scale.baudRate}
                  onChange={e => setScale(prev => ({ ...prev, baudRate: Number(e.target.value) }))}
                  className="glass-input"
                >
                  {[1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].map(rate => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Data bits</label>
                <select
                  value={scale.dataBits}
                  onChange={e => setScale(prev => ({ ...prev, dataBits: Number(e.target.value) }))}
                  className="glass-input"
                >
                  {[5, 6, 7, 8].map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Parity</label>
                <select
                  value={scale.parity}
                  onChange={e => setScale(prev => ({ ...prev, parity: e.target.value }))}
                  className="glass-input"
                >
                  {['none', 'even', 'odd', 'mark', 'space'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Stop bits</label>
                <select
                  value={scale.stopBits}
                  onChange={e => setScale(prev => ({ ...prev, stopBits: Number(e.target.value) }))}
                  className="glass-input"
                >
                  {[1, 1.5, 2].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-content-muted mb-1 block">Weight regex</label>
                <input
                  type="text"
                  value={scale.weightRegex}
                  onChange={e => setScale(prev => ({ ...prev, weightRegex: e.target.value }))}
                  className="glass-input font-mono text-xs"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => saveSetting('scale_config', scale as unknown as Record<string, unknown>, setSavingScale)}
                disabled={savingScale}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save size={16} /> {savingScale ? t.common.loading : t.common.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
