import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = url && anonKey
  ? createBrowserClient(url, anonKey)
  : null as any

export function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')
  return createClient(url, serviceKey)
}

// ===== TYPES =====

export type Role = 'admin' | 'operator'

export type Profile = {
  id: string
  name: string
  email: string
  role: Role
  created_at: string
}

export type Vehicle = {
  id: string
  plate_number: string
  carrier_name: string | null
  address1: string | null
  address2: string | null
  phone: string | null
  tare_weight: number
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  customer_id: string | null
  customer_number: string
  pin_code: string | null
  name: string
  address1: string | null
  address2: string | null
  email: string | null
  cvr_number: string | null
  p_number: string | null
  ticket_count: number
  created_at: string
  updated_at: string
}

export type Product = {
  id: string
  product_id: string | null
  product_number: string
  name: string
  density: number | null
  control1: string | null
  control2: string | null
  control3: string | null
  control4: string | null
  control5: string | null
  created_at: string
  updated_at: string
}

export type Card = {
  id: string
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
  workplace_number: string | null
  workplace_name: string | null
  case_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type WeighingStatus = 'first' | 'complete' | 'cancelled'
export type WeighingDirection = 'in' | 'out'

export type Weighing = {
  id: string
  weighing_number: number
  status: WeighingStatus
  direction: WeighingDirection
  vehicle_id: string | null
  plate_number: string | null
  carrier_name: string | null
  carrier_addr1: string | null
  carrier_addr2: string | null
  customer_id: string | null
  customer_number: string | null
  customer_name: string | null
  customer_addr1: string | null
  customer_addr2: string | null
  cvr_number: string | null
  p_number: string | null
  product_id: string | null
  product_number: string | null
  product_name: string | null
  control1: string | null
  control2: string | null
  control3: string | null
  control4: string | null
  control5: string | null
  card_number: string | null
  first_date: string | null
  first_weight: number | null
  second_date: string | null
  second_weight: number | null
  net_weight: number | null
  volume_m3: number | null
  running_total_kg: number | null
  running_total_m3: number | null
  delivery_note: string | null
  department: string | null
  workplace: string | null
  customer_case: string | null
  work_case: string | null
  notes: string | null
  operator_id: string | null
  created_at: string
  updated_at: string
}

export type WeighLog = {
  id: string
  weighing_id: string
  action: string
  operator_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export type Municipality = {
  id: string
  code: string
  name: string
  active: boolean
  created_at: string
}

export type WasteCode = {
  id: string
  code: string
  name: string
  category: string | null
  created_at: string
}

export type WasteReport = {
  id: string
  reporting_year: number
  municipality_id: string | null
  customer_id: string | null
  cvr_number: string | null
  p_number: string | null
  method: string | null
  total_weight_kg: number | null
  record_count: number | null
  status: string
  error_details: Record<string, unknown> | null
  submitted_at: string | null
  created_at: string
}

export type Facility = {
  id: string
  name: string
  address1: string | null
  address2: string | null
  cvr_number: string | null
  p_number: string | null
  contact_person: string | null
  contact_phone: string | null
  is_import: boolean
  is_export: boolean
  is_receiver: boolean
  is_collector: boolean
  is_col_and_rec: boolean
  created_at: string
  updated_at: string
}

export type Debtor = {
  id: string
  customer_number: string | null
  customer_name: string | null
  subtotal: number
  grand_total: number
  date: string | null
  address1: string | null
  address2: string | null
  cvr_number: string | null
  p_number: string | null
  created_at: string
}

export type AppSetting = {
  id: string
  key: string
  value: Record<string, unknown>
}
