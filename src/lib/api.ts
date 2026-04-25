// In production on Vercel, leave BASE as empty string so requests hit /api/:path*
// which is rewritten by vercel.json to the Railway backend. Locally, use localhost.
const BASE =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('nama_token')
}

// ── Refresh-token interceptor ────────────────────────────────────────────────
// Backend issues an HttpOnly `nama_refresh_token` cookie on login + register.
// When an authenticated request returns 401, attempt a single refresh:
//   POST /api/v1/auth/refresh — picks up cookie, returns {access_token, ...}
// On success, store the new access token + retry the original request once.
// On failure, fall back to the existing logout-and-redirect behaviour.
//
// In-flight refresh promise is shared across concurrent 401s so we don't
// stampede /refresh with duplicate calls when many requests fail at once.
let refreshInFlight: Promise<string | null> | null = null

async function attemptRefresh(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return null
      const data: { access_token?: string; user_id?: number; tenant_id?: number; role?: string; email?: string } = await res.json()
      if (!data.access_token) return null
      localStorage.setItem('nama_token', data.access_token)
      // Mirror auth-context's user shape so role guards re-hydrate cleanly.
      if (data.user_id !== undefined && data.tenant_id !== undefined && data.role) {
        const userPayload = { userId: data.user_id, tenantId: data.tenant_id, role: data.role, email: data.email ?? '' }
        localStorage.setItem('nama_user', JSON.stringify(userPayload))
      }
      return data.access_token
    } catch (err) {
      console.warn('[api] refresh failed', err)
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function request<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // credentials: 'include' so the refresh cookie travels with same-origin
  // requests proxied through Vercel rewrites to Railway.
  const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' })

  // 401 → try refresh once, then retry original request once. If refresh
  // itself fails (and we're not already retrying), fall through to logout.
  if (res.status === 401 && !_isRetry && !path.includes('/auth/refresh')) {
    if (typeof window !== 'undefined') {
      const isDemo = document.cookie.split(';').some((c) => c.trim().startsWith('nama_demo=1'))
      if (!isDemo) {
        const newToken = await attemptRefresh()
        if (newToken) {
          // Refresh succeeded — retry the original request once with the new token.
          return request<T>(path, options, true)
        }
      }
    }
  }

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      const isDemo = document.cookie.split(';').some((c) => c.trim().startsWith('nama_demo=1'))
      if (!isDemo) {
        localStorage.removeItem('nama_token')
        localStorage.removeItem('nama_user')
        document.cookie = 'nama_auth=; path=/; max-age=0; SameSite=Strict'
        window.location.href = '/login?expired=1'
      }
    }
    throw new Error('Session expired. Please log in again.')
  }

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
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
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
  notes?: string                // free-text notes column on the lead row
  travel_dates?: string         // "free-text from message" per backend model
  preferences?: string[]        // tags / preferences from triage
  created_at: string
  updated_at?: string
}

export interface ItineraryBlock {
  type: string
  title: string
  description: string
  time_start?: string
  cost_net?: number      // optional — seed data and AI output may omit internal cost
  price_gross: number
  currency: string
  vendor_id?: number     // which vendor supplies this block
  vendor_rate_id?: number // which VendorRate was locked in (for pricing traceability)
}

export interface RateLookupResult {
  found: boolean
  message?: string
  rate_id?: number
  vendor_id?: number
  description?: string
  season?: string
  price_gross?: number
  price_gross_child?: number | null
  child_age_min?: number | null
  child_age_max?: number | null
  currency?: string
  valid_from?: string | null
  valid_until?: string | null
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

// Matches backend DashboardSummary / KPIEntry schema exactly
export interface KPIEntry {
  label: string
  value: number
  trend: number   // % change
  status: string  // 'UP' | 'DOWN' | 'NEUTRAL'
}

export interface DashboardStats {
  gmv: KPIEntry
  aov: KPIEntry              // Average Order Value — new field from backend
  conversion_rate: KPIEntry
  total_leads: KPIEntry
  active_itineraries: KPIEntry
  currency: string
}

// Auth
export const authApi = {
  // Backend uses OAuth2PasswordRequestForm → MUST be application/x-www-form-urlencoded
  // with field name "username" (not "email") per OAuth2 spec
  login: async (email: string, password: string): Promise<{access_token: string; user_id: number; tenant_id: number; role: string; email: string}> => {
    const body = new URLSearchParams()
    body.append('username', email)
    body.append('password', password)
    const res = await fetch(`${BASE}/api/v1/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }))
      throw new Error(err.detail || `HTTP ${res.status}`)
    }
    return res.json()
  },
  registerOrg: (data: {organization_name: string; admin_email: string; admin_password: string}) =>
    api.post<{tenant_id: number; access_token: string}>('/api/v1/tenants/register-org', data),
  registerUser: (data: {email: string; password: string; full_name: string; role: string; tenant_id: number}) =>
    api.post<{access_token: string; user_id: number}>('/api/v1/register-user', data),
  // Atomic org + admin-user creation in a single transaction. Replaces the
  // 2-call (registerOrg → registerUser) flow which left orphan tenants when
  // the second call failed. Returns full TokenResponse with access_token.
  registerOrganization: (data: {
    organization_name: string;
    admin_email: string;
    admin_password: string;
    admin_full_name?: string;
  }) =>
    api.post<{
      access_token: string;
      user_id: number;
      tenant_id: number;
      role: string;
      email: string;
    }>('/api/v1/auth/register-organization', data),
  validateInvite: (token: string) =>
    api.get<{email: string; role: string; tenant_id: number; token?: string; message?: string; company_name?: string}>(`/api/v1/settings/team/invite/accept/${token}`),
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
  create: (data: Partial<Lead>) => api.post<Lead>('/api/v1/leads/', data),
  update: (id: number, data: Partial<Lead>) => api.patch<Lead>(`/api/v1/leads/${id}`, data),
  assign: (leadId: number, userId: number) =>
    api.post<Lead>(`/api/v1/leads/${leadId}/assign?user_id=${userId}`, {}),
  delete: (id: number) => api.delete<void>(`/api/v1/leads/${id}`),
}

// Query Triage (M1)
export interface TriageRequest {
  raw_message: string
  source?: string
  sender_id?: string
}

export interface TriageResult {
  lead_id?: number
  destination?: string
  duration_days?: number
  travelers_count?: number
  budget_per_person?: number
  currency?: string
  travel_style?: string
  triage_confidence?: number
  priority?: number
  is_valid?: boolean
  // QueryTriageResult shape (backend)
  is_valid_query?: boolean
  extracted_data?: {
    destination?: string
    duration_days?: number
    travelers_count?: number
    budget_per_person?: number
    currency?: string
    style?: string
    confidence_score?: number
  }
  suggested_reply?: string
  reasoning?: string
}

// Map frontend source names → backend QuerySource enum values
const _sourceMap: Record<string, string> = {
  WHATSAPP: 'WHATSAPP',
  EMAIL: 'EMAIL',
  WEBSITE: 'DIRECT',
  PHONE: 'DIRECT',
  DASHBOARD: 'DIRECT',
}

export const queriesApi = {
  ingest: (data: TriageRequest) => api.post<TriageResult>('/api/v1/queries/ingest', {
    content: data.raw_message,
    source: _sourceMap[data.source ?? 'WHATSAPP'] ?? 'DIRECT',
    sender_id: data.sender_id ?? 'dashboard-user',
    tenant_id: 1,  // extracted from JWT server-side; body value required by schema
  }),
}

// Vendors (M6)
export interface Vendor {
  id: number
  tenant_id: number
  vendor_code: string
  name: string
  category: string
  status: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  country?: string
  city?: string
  default_currency: string
  markup_pct: number
  is_preferred: boolean
  is_verified: boolean
  rating?: number
  tags?: string[]
  notes?: string
  created_at: string
}

export const vendorsApi = {
  list: (params?: {category?: string; status?: string}) => {
    const q = new URLSearchParams()
    if (params?.category) q.set('category', params.category)
    if (params?.status) q.set('status', params.status)
    return api.get<Vendor[]>(`/api/v1/vendors?${q}`)
  },
  get: (id: number) => api.get<Vendor>(`/api/v1/vendors/${id}`),
  create: (data: Partial<Vendor> & { vendor_code: string; name: string }) =>
    api.post<Vendor>('/api/v1/vendors', data),
  update: (id: number, data: Partial<Vendor>) =>
    api.patch<Vendor>(`/api/v1/vendors/${id}`, data),
  deactivate: (id: number) => api.delete<void>(`/api/v1/vendors/${id}`),
  stats: () => api.get<{ total_active: number; preferred_count: number; avg_rating?: number; by_category: Record<string, number> }>('/api/v1/vendors/stats/summary'),
}

// Itineraries
export const itinerariesApi = {
  generate: (data: ItineraryRequest) => api.post<ItineraryOut>('/api/v1/itineraries/generate', data),
  list: () => api.get<ItineraryOut[]>('/api/v1/itineraries/'),
  get: (id: number) => api.get<ItineraryOut>(`/api/v1/itineraries/${id}`),
  rateLookup: (params: { vendor_id: number; date: string; category?: string }) => {
    const q = new URLSearchParams({ vendor_id: String(params.vendor_id), date: params.date })
    if (params.category) q.set('category', params.category)
    return api.get<RateLookupResult>(`/api/v1/itineraries/rate-lookup?${q}`)
  },
}

// Bookings
export const bookingsApi = {
  list: () => api.get<Booking[]>('/api/v1/bookings/'),
  get: (id: number) => api.get<Booking>(`/api/v1/bookings/${id}`),
  create: (data: {itinerary_id: number; lead_id: number}) =>
    api.post<Booking>('/api/v1/bookings/', data),
  confirm: (id: number) => api.post(`/api/v1/bookings/${id}/confirm`, {}),
  cancel: (id: number) => api.post(`/api/v1/bookings/${id}/cancel`, {}),
}

// Finance
export const financeApi = {
  ledger: () => api.get<LedgerEntry[]>('/api/v1/payments/ledger'),
  summary: () => api.get<LedgerSummary>('/api/v1/finance/summary'),
  profit: (bookingId: number) => api.get<BookingProfit>(`/api/v1/finance/booking/${bookingId}/profit`),
}

// Analytics (moved/extended above — keeping for backward compat)
// analyticsApi is defined above with anomalies support

// Comms
export const commsApi = {
  draft: (data: {context: string; lead_id: number}) =>
    api.post<{whatsapp: string; email: string}>('/api/v1/comms/draft', data),
}

// Quotations (M3)
export interface Quotation {
  id: number
  tenant_id: number
  lead_id?: number
  itinerary_id?: number
  lead_name: string
  destination: string
  base_price: number
  margin_pct: number
  total_price: number
  currency: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  notes?: string
  valid_until?: string
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface QuotationCreate {
  lead_name: string
  destination: string
  base_price: number
  margin_pct?: number
  currency?: string
  lead_id?: number
  itinerary_id?: number
  notes?: string
  valid_until?: string
}

export const quotationsApi = {
  list: (params?: { status?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.page)   q.set('page',   String(params.page))
    if (params?.size)   q.set('size',   String(params.size))
    return api.get<{ items: Quotation[]; total: number; page: number; size: number }>(`/api/v1/quotations/?${q}`)
  },
  get: (id: number) => api.get<Quotation>(`/api/v1/quotations/${id}`),
  create: (data: QuotationCreate) => api.post<Quotation>('/api/v1/quotations/', data),
  update: (id: number, data: Partial<QuotationCreate> & { status?: string }) =>
    api.patch<Quotation>(`/api/v1/quotations/${id}`, data),
  send: (id: number) => api.post<Quotation>(`/api/v1/quotations/${id}/send`, {}),
  delete: (id: number) => api.delete<void>(`/api/v1/quotations/${id}`),
}

// BYOK Settings (M15)
export interface ByokKey {
  id: number
  provider: string
  label?: string
  key_masked: string
  is_active: boolean
  created_at: string
  last_used_at?: string
}

export const settingsApi = {
  listKeys: () => api.get<ByokKey[]>('/api/v1/settings/api-keys'),
  addKey: (data: { provider: string; api_key: string; label?: string }) =>
    api.post<ByokKey>('/api/v1/settings/api-keys', data),
  deleteKey: (id: number) => api.delete<void>(`/api/v1/settings/api-keys/${id}`),
  subscription: () => api.get<{ plan_id: string; plan_name: string; seats: number; byok_enabled: boolean; period_end?: string }>('/api/v1/settings/subscription'),
}

// Anomalies for analytics dashboard
export const analyticsApi = {
  dashboard: () => api.get<DashboardStats>('/api/v1/analytics/dashboard'),
  anomalies: () => api.get<{ id: string; message: string; severity: string; metric: string }[]>('/api/v1/analytics/anomalies').catch(() => []),
}

// Content
export interface Destination {
  id?: number
  name: string
  country: string
  description: string
  cover_image?: string
  // Extended fields for content library
  category?: string
  image_url?: string
}

export interface ContentAsset {
  id?: number
  url: string
  type?: string       // legacy field
  asset_type?: string // preferred
  tags?: string[]
  title?: string
}

export interface ContentBlock {
  id?: number
  title: string
  category?: string   // legacy field
  preview?: string    // legacy field
  // Extended fields
  content: string
  block_type?: string
  destination?: string
}

export const contentApi = {
  destinations: () => api.get<Destination[]>('/api/v1/content/destinations'),
  assets: () => api.get<ContentAsset[]>('/api/v1/content/assets'),
  blocks: () => api.get<ContentBlock[]>('/api/v1/content/blocks'),
  createDestination: (data: Destination) => api.post<Destination>('/api/v1/content/destinations', data),
  createAsset: (data: ContentAsset) => api.post<ContentAsset>('/api/v1/content/assets', data),
  createBlock: (data: ContentBlock) => api.post<ContentBlock>('/api/v1/content/blocks', data),
}

// RBAC Roles (Phase 2)
export interface RolePermission {
  permission: string
  conditions?: Record<string, unknown>
}

export interface BackendRole {
  id: string
  name: string
  description?: string
  permissions: string[]
  created_at?: string
  updated_at?: string
}

export const rolesApi = {
  list: () => api.get<BackendRole[]>('/api/v1/roles'),
  create: (data: { name: string; description?: string; permissions?: string[] }) =>
    api.post<BackendRole>('/api/v1/roles', data),
  updatePermissions: (roleId: string, permissions: string[]) =>
    api.put<BackendRole>(`/api/v1/roles/${roleId}/permissions`, { permissions }),
}

// Automations (M16)
export interface AutomationAction { type: string; config: Record<string, unknown> }
export interface Automation {
  id: number; tenant_id: number; name: string; description?: string
  trigger: string; conditions: Record<string, unknown>[]; actions: AutomationAction[]
  is_active: boolean; run_count: number; success_count: number
  last_run_at?: string; created_at: string; updated_at: string
}
export interface AutomationCreate {
  name: string; description?: string; trigger: string
  conditions?: Record<string, unknown>[]; actions?: AutomationAction[]; is_active?: boolean
}
export const automationsApi = {
  list: (is_active?: boolean) => {
    const q = new URLSearchParams()
    if (is_active !== undefined) q.set('is_active', String(is_active))
    return api.get<Automation[]>(`/api/v1/automations/?${q}`)
  },
  get: (id: number) => api.get<Automation>(`/api/v1/automations/${id}`),
  create: (data: AutomationCreate) => api.post<Automation>('/api/v1/automations/', data),
  update: (id: number, data: Partial<AutomationCreate>) => api.patch<Automation>(`/api/v1/automations/${id}`, data),
  delete: (id: number) => api.delete<void>(`/api/v1/automations/${id}`),
  toggle: (id: number) => api.post<Automation>(`/api/v1/automations/${id}/toggle`, {}),
  runs: (id: number) => api.get<unknown[]>(`/api/v1/automations/${id}/runs`),
  triggers: () => api.get<{ triggers: string[]; actions: string[] }>('/api/v1/automations/triggers'),
  runReminders: () => api.post<{ reminders_sent: number; leads_flagged: number; agents_notified: number; demo_mode: boolean }>('/api/v1/automations/run-reminders', {}),
  scheduleReminders: (enabled: boolean) => api.post<{ enabled: boolean }>('/api/v1/automations/schedule-reminders', { enabled }),
}

// Documents
export const documentsApi = {
  invoicePdf: async (bookingId: number): Promise<Response> => {
    return fetch('/api/v1/documents/invoice-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: bookingId }),
    })
  },
  sendInvoice: (bookingId: number, email: string) =>
    api.post<{ success: boolean; message_id?: string; error?: string }>(
      '/api/v1/documents/send-invoice',
      { booking_id: bookingId, email }
    ),
}

// Payments — Razorpay payment links
export const paymentsApi = {
  createLink: (data: { quotation_id: number; amount: number; description: string; currency?: string }) =>
    api.post<{ payment_link_url: string; payment_link_id: string; demo?: boolean }>('/api/v1/payments/create-link', data),
}

// Clients (M14) — contact database + bulk import
export interface ClientRecord {
  id: number
  [key: string]: unknown
}

export type ClientPayload = Record<string, unknown>

export const clientsApi = {
  list: (params?: { search?: string; status?: string; page?: number; size?: number }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.status) q.set('status', params.status)
    if (params?.page)   q.set('page',   String(params.page))
    if (params?.size)   q.set('size',   String(params.size))
    return api.get<{ clients: ClientRecord[]; total: number; page: number; size: number }>(`/api/v1/clients/?${q}`)
  },
  get: (id: number) => api.get<ClientRecord>(`/api/v1/clients/${id}`),
  create: (data: ClientPayload) => api.post<ClientRecord>('/api/v1/clients/', data),
  update: (id: number, data: ClientPayload) => api.patch<ClientRecord>(`/api/v1/clients/${id}`, data),
  importContacts: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
    const res = await fetch('/api/v1/clients/import', {
      method: 'POST',
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    return res.json()
  },
  importTemplate: () => fetch('/api/v1/clients/import/template'),
}

// Billing & Subscriptions
export interface SubscriptionPlan {
  id:                number
  name:              string
  slug:              string
  price_monthly:     number
  price_yearly:      number
  price_monthly_usd: number | null
  price_yearly_usd:  number | null
  max_users:         number | null
  max_leads:         number | null
  features:          Record<string, boolean> | null
  is_active:         boolean
  sort_order:        number
}

export interface PlansResponse {
  plans:             SubscriptionPlan[]
  detected_currency: 'INR' | 'USD'
}

export interface TenantSubscription {
  id:                       number
  tenant_id:                number
  plan_id:                  number
  plan:                     SubscriptionPlan | null
  status:                   'active' | 'trial' | 'cancelled' | 'paused'
  billing_cycle:            'monthly' | 'yearly'
  current_period_start:     string | null
  current_period_end:       string | null
  cancel_at_period_end:     boolean
  trial_ends_at:            string | null
  razorpay_subscription_id: string | null
  notes:                    string | null
  created_at:               string
  updated_at:               string | null
}

export interface ProrationPreview {
  current_plan_name:  string
  new_plan_name:      string
  current_daily_rate: number
  new_daily_rate:     number
  days_remaining:     number
  net_charge:         number
  credit:             number
  is_upgrade:         boolean
  billing_cycle:      string
}

export interface SubscriptionEvent {
  id:                number
  event_type:        string
  old_plan_id:       number | null
  new_plan_id:       number | null
  old_billing_cycle: string | null
  new_billing_cycle: string | null
  amount_charged:    number | null
  proration_credit:  number | null
  notes:             string | null
  created_at:        string
}

export interface AdminSubscriptionRow {
  id:                   number
  tenant_id:            number
  tenant_name?:         string | null   // populated by backend admin/all from Tenant table
  plan:                 SubscriptionPlan | null
  status:               string
  billing_cycle:        string
  cancel_at_period_end: boolean
  current_period_end:   string | null
  created_at:           string
}

export interface PlanCreateData {
  name:              string
  slug:              string
  price_monthly:     number
  price_yearly:      number
  price_monthly_usd?: number | null
  price_yearly_usd?:  number | null
  max_users?:        number | null
  max_leads?:        number | null
  features?:         Record<string, boolean> | null
  is_active?:        boolean
  sort_order?:       number
}

export interface PlanUpdateData {
  name?:              string
  price_monthly?:     number
  price_yearly?:      number
  price_monthly_usd?: number | null
  price_yearly_usd?:  number | null
  max_users?:         number | null
  max_leads?:         number | null
  features?:          Record<string, boolean> | null
  is_active?:         boolean
  sort_order?:        number
}

export const billingApi = {
  getPlans: () =>
    api.get<PlansResponse>('/api/v1/billing/plans'),

  createPlan: (data: PlanCreateData) =>
    api.post<SubscriptionPlan>('/api/v1/billing/plans', data),

  updatePlan: (planId: number, data: PlanUpdateData) =>
    api.put<SubscriptionPlan>(`/api/v1/billing/plans/${planId}`, data),

  deactivatePlan: (planId: number) =>
    api.delete<void>(`/api/v1/billing/plans/${planId}`),

  getSubscription: () =>
    api.get<TenantSubscription>('/api/v1/billing/subscription'),

  changePlan: (planId: number, billingCycle: 'monthly' | 'yearly') =>
    api.post<TenantSubscription>('/api/v1/billing/subscription', {
      plan_id: planId,
      billing_cycle: billingCycle,
    }),

  previewProration: (planId: number, billingCycle: 'monthly' | 'yearly') =>
    api.post<ProrationPreview>('/api/v1/billing/prorate', {
      plan_id: planId,
      billing_cycle: billingCycle,
    }),

  getEvents: (page = 1, perPage = 50) =>
    api.get<SubscriptionEvent[]>(`/api/v1/billing/events?page=${page}&per_page=${perPage}`),

  cancel: () =>
    api.put<TenantSubscription>('/api/v1/billing/cancel', {}),

  reactivate: () =>
    api.put<TenantSubscription>('/api/v1/billing/reactivate', {}),

  adminGetAll: (status?: string) => {
    const q = new URLSearchParams()
    if (status) q.set('status', status)
    return api.get<AdminSubscriptionRow[]>(`/api/v1/billing/admin/all?${q}`)
  },

  adminChangePlan: (tenantId: number, planId: number, billingCycle: 'monthly' | 'yearly' = 'monthly') =>
    api.put<TenantSubscription>(`/api/v1/billing/admin/${tenantId}`, {
      plan_id: planId,
      billing_cycle: billingCycle,
    }),

  adminReactivate: (tenantId: number) =>
    api.put<TenantSubscription>(`/api/v1/billing/admin/${tenantId}/reactivate`, {}),
}


// ── Email Templates API (M21) ─────────────────────────────────────────────────
export interface EmailTemplate {
  id:         number
  tenant_id:  number | null
  name:       string
  category:   string
  subject:    string
  html_body:  string
  text_body?: string
  variables:  string[]
  is_system:  boolean
  is_active:  boolean
  created_at?: string
  updated_at?: string
}

export interface EmailTemplateCreate {
  name:      string
  category:  string
  subject:   string
  html_body: string
  text_body?: string
  variables?: string[]
}

export interface EmailTemplateSendRequest {
  to:        string
  variables: Record<string, string>
  reply_to?: string
}

export const emailTemplatesApi = {
  list: (category?: string, isSystem?: boolean) => {
    const q = new URLSearchParams()
    if (category)            q.set('category', category)
    if (isSystem !== undefined) q.set('is_system', String(isSystem))
    return api.get<EmailTemplate[]>(`/api/v1/email-templates/?${q}`)
  },
  get:    (id: number) => api.get<EmailTemplate>(`/api/v1/email-templates/${id}`),
  create: (data: EmailTemplateCreate) => api.post<EmailTemplate>('/api/v1/email-templates/', data),
  update: (id: number, data: Partial<EmailTemplateCreate>) => api.put<EmailTemplate>(`/api/v1/email-templates/${id}`, data),
  delete: (id: number) => api.delete(`/api/v1/email-templates/${id}`),
  clone:  (id: number) => api.post<EmailTemplate>(`/api/v1/email-templates/${id}/clone`, {}),
  send:   (id: number, data: EmailTemplateSendRequest) => api.post<{ok: boolean; to: string; subject: string}>(`/api/v1/email-templates/${id}/send`, data),
  seed:   () => api.post<{seeded: number}>('/api/v1/email-templates/seed', {}),
}
