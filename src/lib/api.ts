// In production on Vercel, leave BASE as empty string so requests hit /api/:path*
// which is rewritten by vercel.json to the Railway backend. Locally, use localhost.
const BASE = process.env.NEXT_PUBLIC_API_URL !== undefined
  ? process.env.NEXT_PUBLIC_API_URL
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
      ? ''
      : 'http://localhost:8000')

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('nama_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  if (res.status === 204) return {} as T
  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// Types
export interface Lead {
  id: number
  tenant_id: number
  sender_id: string
  source: string
  full_name?: string
  email?: string
  phone?: string
  destination?: string
  duration_days?: number
  travelers_count: number
  budget_per_person?: number
  currency: string
  travel_style: string
  status: string
  priority: number
  triage_confidence: number
  suggested_reply?: string
  created_at: string
  updated_at?: string
}

export interface ItineraryBlock {
  type: string
  title: string
  description: string
  time_start?: string
  cost_net: number
  price_gross: number
  currency: string
}

export interface ItineraryDay {
  day_number: number
  title: string
  narrative: string
  blocks: ItineraryBlock[]
}

export interface ItineraryRequest {
  lead_id: number
  destination: string
  duration_days: number
  traveler_count?: number
  preferences?: string[]
  style?: string
  travel_dates?: string
  budget_range?: string
}

export interface ItineraryOut {
  id?: number
  tenant_id?: number
  lead_id?: number
  title: string
  destination?: string
  duration_days?: number
  status?: string
  total_price: number
  currency: string
  days_json?: ItineraryDay[]
  social_caption?: string
  social_hooks?: string[]
  agent_reasoning?: string
  created_at?: string
  days?: ItineraryDay[]
  social_post?: { caption: string; hooks: string[]; image_suggestions: string[] }
}

export interface Booking {
  id: number
  tenant_id: number
  lead_id: number
  itinerary_id: number
  status: string
  total_price: number
  currency: string
  created_at: string
}

export interface LedgerEntry {
  id: number
  entry_type: string
  amount: number
  currency: string
  description: string
  created_at: string
}

export interface LedgerSummary {
  total_revenue: number
  total_cost: number
  gross_profit: number
  currency: string
}

export interface BookingProfit {
  booking_id: number
  revenue: number
  cost: number
  gross_profit: number
  margin_pct: number
  currency: string
}

export interface DashboardStats {
  gmv: { value: number; trend: number; status: string }
  conversion_rate: { value: number; trend: number; status: string }
  total_leads: { value: number; trend: number; status: string }
  active_itineraries: { value: number; trend: number; status: string }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{access_token: string; user_id: number; tenant_id: number; role: string; email: string}>(
      '/api/v1/login',
      { email, password }
    ),
  registerOrg: (data: {organization_name: string; admin_email: string; admin_password: string}) =>
    api.post<{tenant_id: number; access_token: string}>('/api/v1/tenants/register-org', data),
  registerUser: (data: {email: string; password: string; full_name: string; role: string; tenant_id: number}) =>
    api.post<{access_token: string; user_id: number}>('/api/v1/register-user', data),
}

// Leads
export const leadsApi = {
  list: (params?: {status?: string; page?: number; size?: number}) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.page) q.set('page', String(params.page))
    if (params?.size) q.set('size', String(params.size))
    return api.get<{items: Lead[]; total: number; page: number; size: number}>(`/api/v1/leads/?${q}`)
  },
  get: (id: number) => api.get<Lead>(`/api/v1/leads/${id}`),
  update: (id: number, data: Partial<Lead>) => api.patch<Lead>(`/api/v1/leads/${id}`, data),
}

// Itineraries
export const itinerariesApi = {
  generate: (data: ItineraryRequest) => api.post<ItineraryOut>('/api/v1/itineraries/generate', data),
  list: () => api.get<ItineraryOut[]>('/api/v1/itineraries/'),
  get: (id: number) => api.get<ItineraryOut>(`/api/v1/itineraries/${id}`),
}

// Bookings
export const bookingsApi = {
  list: () => api.get<Booking[]>('/api/v1/bookings/'),
  get: (id: number) => api.get<Booking>(`/api/v1/bookings/${id}`),
  confirm: (id: number) => api.post(`/api/v1/bookings/${id}/confirm`, {}),
  cancel: (id: number) => api.post(`/api/v1/bookings/${id}/cancel`, {}),
}

// Finance
export const financeApi = {
  ledger: () => api.get<LedgerEntry[]>('/api/v1/payments/ledger'),
  summary: () => api.get<LedgerSummary>('/api/v1/finance/summary'),
  profit: (bookingId: number) => api.get<BookingProfit>(`/api/v1/finance/booking/${bookingId}/profit`),
}

// Analytics
export const analyticsApi = {
  dashboard: () => api.get<DashboardStats>('/api/v1/analytics/dashboard'),
}

// Comms
export const commsApi = {
  draft: (data: {context: string; lead_id: number}) =>
    api.post<{whatsapp: string; email: string}>('/api/v1/comms/draft', data),
}

// Content
export interface Destination {
  id?: number
  name: string
  country: string
  description: string
  cover_image?: string
}

export interface ContentAsset {
  id?: number
  url: string
  type: string
  tags?: string[]
}

export interface ContentBlock {
  id?: number
  title: string
  category: string
  preview: string
}

export const contentApi = {
  destinations: () => api.get<Destination[]>('/api/v1/content/destinations'),
  assets: () => api.get<ContentAsset[]>('/api/v1/content/assets'),
  blocks: () => api.get<ContentBlock[]>('/api/v1/content/blocks'),
  createDestination: (data: Destination) => api.post<Destination>('/api/v1/content/destinations', data),
  createAsset: (data: ContentAsset) => api.post<ContentAsset>('/api/v1/content/assets', data),
  createBlock: (data: ContentBlock) => api.post<ContentBlock>('/api/v1/content/blocks', data),
}
