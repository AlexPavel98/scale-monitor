'use client'

import { useT } from '@/lib/i18n'
import { useLang } from '@/lib/i18n'
import { formatKg, formatDateTime, formatM3 } from '@/lib/format'
import type { Weighing } from '@/lib/supabase'
import { Printer, X } from 'lucide-react'

type Props = {
  weighing: Weighing
  companyInfo?: { name: string; address1: string; address2: string }
  operatorName?: string
  onClose?: () => void
}

export default function WeighingTicket({ weighing, companyInfo, operatorName, onClose }: Props) {
  const t = useT()
  const { lang } = useLang()

  const netWeight = weighing.net_weight ?? (
    weighing.first_weight != null && weighing.second_weight != null
      ? Math.abs(weighing.first_weight - weighing.second_weight)
      : null
  )

  return (
    <div className="ticket-container">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ticket-container, .ticket-container * { visibility: visible !important; }
          .ticket-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 20mm !important;
            background: white !important;
            color: black !important;
          }
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          .ticket-row { border-bottom: 1px solid #ddd !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* Screen-only buttons */}
      <div className="no-print flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-content">{t.ticket.weighingReceipt}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Printer size={16} />
            {t.common.print}
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-secondary text-sm flex items-center gap-2">
              <X size={16} />
              {t.common.close}
            </button>
          )}
        </div>
      </div>

      {/* Ticket content */}
      <div className="glass-card p-6 print:shadow-none print:border print:border-gray-300">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b border-subtle">
          {companyInfo ? (
            <>
              <h2 className="text-xl font-bold text-content">{companyInfo.name}</h2>
              {companyInfo.address1 && (
                <p className="text-sm text-content-muted">{companyInfo.address1}</p>
              )}
              {companyInfo.address2 && (
                <p className="text-sm text-content-muted">{companyInfo.address2}</p>
              )}
            </>
          ) : (
            <h2 className="text-xl font-bold text-content">Scale Monitor</h2>
          )}
          <div className="mt-3">
            <h1 className="text-lg font-bold uppercase tracking-wider text-content">
              {t.ticket.weighingReceipt}
            </h1>
          </div>
        </div>

        {/* Weighing number */}
        <div className="text-center mb-6">
          <span className="text-xs font-medium uppercase tracking-wider text-content-dim">
            {t.ticket.weighingNo}
          </span>
          <p className="text-3xl font-bold text-brand-primary tabular-nums">
            #{weighing.weighing_number}
          </p>
        </div>

        {/* Details grid */}
        <div className="space-y-2">
          <TicketRow label={t.ticket.date} value={formatDateTime(weighing.first_date, lang)} />
          {weighing.second_date && (
            <TicketRow label={`${t.ticket.date} (2)`} value={formatDateTime(weighing.second_date, lang)} />
          )}

          <div className="h-2" />

          <TicketRow label={t.ticket.vehicle} value={weighing.plate_number || '-'} />
          <TicketRow label={t.ticket.carrier} value={weighing.carrier_name || '-'} />

          <div className="h-2" />

          <TicketRow
            label={t.ticket.customer}
            value={[weighing.customer_number, weighing.customer_name].filter(Boolean).join(' - ') || '-'}
          />
          <TicketRow
            label={t.ticket.product}
            value={[weighing.product_number, weighing.product_name].filter(Boolean).join(' - ') || '-'}
          />

          <div className="h-2" />

          <TicketRow label={t.ticket.direction} value={
            weighing.direction === 'in' ? t.weighing.directionIn : t.weighing.directionOut
          } />

          <div className="my-4 border-t border-subtle" />

          {/* Weights section */}
          <TicketRow label={t.ticket.firstWeighing} value={formatKg(weighing.first_weight)} />
          <TicketRow label={t.ticket.secondWeighing} value={formatKg(weighing.second_weight)} />

          <div className="my-3 border-t-2 border-content" />

          <div className="ticket-row flex items-center justify-between py-2">
            <span className="text-base font-bold text-content">{t.ticket.net}</span>
            <span className="text-2xl font-bold text-brand-primary tabular-nums">
              {formatKg(netWeight)}
            </span>
          </div>

          {weighing.volume_m3 != null && (
            <TicketRow label={t.weighing.volume} value={formatM3(weighing.volume_m3)} />
          )}

          {(weighing.delivery_note || weighing.notes) && (
            <>
              <div className="my-3 border-t border-subtle" />
              {weighing.delivery_note && (
                <TicketRow label={t.weighing.deliveryNote} value={weighing.delivery_note} />
              )}
              {weighing.notes && (
                <TicketRow label={t.ticket.notes} value={weighing.notes} />
              )}
            </>
          )}

          <div className="my-3 border-t border-subtle" />

          {operatorName && (
            <TicketRow label={t.ticket.operator} value={operatorName} />
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-subtle text-center">
          <p className="text-xs text-content-dim">
            Scale Monitor &mdash; {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* Print-only footer */}
      <div className="print-only text-center mt-4 text-xs text-gray-500">
        Scale Monitor &mdash; {new Date().getFullYear()}
      </div>
    </div>
  )
}

function TicketRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ticket-row flex items-center justify-between py-1.5">
      <span className="text-sm text-content-muted">{label}</span>
      <span className="text-sm font-medium text-content text-right">{value}</span>
    </div>
  )
}
