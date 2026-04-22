'use client'

const STORAGE_KEY = 'nama_dynamix_handoff'

export interface DynamixQuotationDraft {
  lead_name: string
  destination: string
  base_price: string
  margin_pct: string
  notes: string
  customer_email?: string
  customer_whatsapp?: string
  selected_channels?: string[]
  holiday_title?: string
}

export interface DynamixLifecycleHandoff extends DynamixQuotationDraft {
  lead_id?: number
  itinerary_id?: number
  quotation_id?: number
  booking_id?: number
  total_price?: number
  currency?: string
  travel_dates?: string
  duration_days?: number
  travelers_count?: number
}

export function saveDynamixQuotationDraft(draft: DynamixLifecycleHandoff) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export function loadDynamixQuotationDraft(): DynamixLifecycleHandoff | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearDynamixQuotationDraft() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
