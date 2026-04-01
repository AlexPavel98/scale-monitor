import { format, type Locale } from 'date-fns'
import { da, enUS } from 'date-fns/locale'

const locales: Record<string, Locale> = { da, en: enUS }

export function formatKg(kg: number | null | undefined): string {
  if (kg == null) return '-'
  return kg.toLocaleString('da-DK') + ' kg'
}

export function formatM3(m3: number | null | undefined): string {
  if (m3 == null) return '-'
  return m3.toFixed(2) + ' m\u00b3'
}

export function formatDate(dateStr: string | null | undefined, lang = 'da'): string {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'dd/MM/yyyy', { locale: locales[lang] || locales.da })
}

export function formatTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'HH:mm')
}

export function formatDateTime(dateStr: string | null | undefined, lang = 'da'): string {
  if (!dateStr) return '-'
  return format(new Date(dateStr), 'dd/MM/yyyy HH:mm', { locale: locales[lang] || locales.da })
}

export function formatElapsed(from: string | null | undefined): string {
  if (!from) return '-'
  const ms = Date.now() - new Date(from).getTime()
  const mins = Math.floor(ms / 60000)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}t ${mins % 60}m`
  return `${mins}m`
}
