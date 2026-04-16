'use client'

import React, { useState, useEffect } from 'react'
import { leadsApi, queriesApi, Lead } from '@/lib/api'
import { Search, AlertCircle, Loader, Plus, Sparkles, X, UserPlus } from 'lucide-react'

const statusBadgeColor = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-purple-50 text-purple-700 border-purple-200',
  QUALIFIED: 'bg-green-50 text-green-700 border-green-200',
  PROPOSAL_SENT: 'bg-amber-50 text-amber-700 border-amber-200',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-red-50 text-red-700 border-red-200',
}

type InquiryMode = 'ai' | 'manual'

// ── Seed leads (shown when backend empty/unreachable) ─────────────────────────
const TS = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString()
const SEED_LEADS: Lead[] = [
  { id: 1, tenant_id: 1, sender_id: '+919812345678', source: 'WHATSAPP', full_name: 'Ravi Mehta',      email: 'ravi.mehta@gmail.com',    phone: '+91 98123 45678', destination: 'Rajasthan',  duration_days: 7,  travelers_count: 4, budget_per_person: 75000,  currency: 'INR', travel_style: 'CULTURAL',  status: 'QUALIFIED',    priority: 1, triage_confidence: 92, suggested_reply: 'Thank you for reaching out! Rajasthan in March sounds wonderful…', created_at: TS(1) },
  { id: 2, tenant_id: 1, sender_id: '+919876543210', source: 'EMAIL',    full_name: 'Priya Singh',     email: 'priya.singh@outlook.com', phone: '+91 98765 43210', destination: 'Maldives',   duration_days: 7,  travelers_count: 2, budget_per_person: 250000, currency: 'INR', travel_style: 'LUXURY',    status: 'PROPOSAL_SENT',priority: 1, triage_confidence: 95, suggested_reply: 'Great choice for a honeymoon! The Maldives in February is magical…',  created_at: TS(2) },
  { id: 3, tenant_id: 1, sender_id: '+919845671234', source: 'WHATSAPP', full_name: 'Ananya Rao',      email: 'ananya.rao@gmail.com',    phone: '+91 98456 71234', destination: 'Kedarnath',  duration_days: 5,  travelers_count: 3, budget_per_person: 20000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'NEW',          priority: 2, triage_confidence: 78, suggested_reply: undefined, created_at: TS(0) },
  { id: 4, tenant_id: 1, sender_id: '+919123456789', source: 'WEBSITE',  full_name: 'Karan Kapoor',    email: 'karan.k@hotmail.com',     phone: '+91 91234 56789', destination: 'Kenya',      duration_days: 12, travelers_count: 6, budget_per_person: 450000, currency: 'INR', travel_style: 'WILDLIFE',  status: 'QUALIFIED',    priority: 1, triage_confidence: 88, suggested_reply: undefined, created_at: TS(3) },
  { id: 5, tenant_id: 1, sender_id: '+919654321098', source: 'EMAIL',    full_name: 'Deepika Nair',    email: 'deepika.nair@gmail.com',  phone: '+91 96543 21098', destination: 'Bali',       duration_days: 6,  travelers_count: 2, budget_per_person: 120000, currency: 'INR', travel_style: 'BEACH',     status: 'WON',          priority: 1, triage_confidence: 96, suggested_reply: undefined, created_at: TS(5) },
  { id: 6, tenant_id: 1, sender_id: '+919712345678', source: 'PHONE',    full_name: 'Amit Shah',       email: 'amit.shah@company.com',   phone: '+91 97123 45678', destination: 'Leh Ladakh', duration_days: 10, travelers_count: 8, budget_per_person: 35000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'CONTACTED',    priority: 2, triage_confidence: 81, suggested_reply: undefined, created_at: TS(1) },
  { id: 7, tenant_id: 1, sender_id: '+919823456789', source: 'WHATSAPP', full_name: 'Rohan Verma',     email: 'rohan.v@gmail.com',       phone: '+91 98234 56789', destination: 'Dubai',      duration_days: 5,  travelers_count: 4, budget_per_person: 90000,  currency: 'INR', travel_style: 'LUXURY',    status: 'NEW',          priority: 2, triage_confidence: 74, suggested_reply: undefined, created_at: TS(0) },
  { id: 8, tenant_id: 1, sender_id: '+919534567890', source: 'EMAIL',    full_name: 'Sneha Patel',     email: 'sneha.patel@gmail.com',   phone: '+91 95345 67890', destination: 'Santorini',  duration_days: 8,  travelers_count: 2, budget_per_person: 200000, currency: 'INR', travel_style: 'HONEYMOON', status: 'LOST',         priority: 3, triage_confidence: 65, suggested_reply: undefined, created_at: TS(7) },
]

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedLeadId, setExpandedLeadId] = useState<number | null>(null)
  const [updating, setUpdating] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  // New Inquiry Modal
  const [showInquiry, setShowInquiry] = useState(false)
  const [inquiryMode, setInquiryMode] = useState<InquiryMode>('ai')
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null)
  const [rawMessage, setRawMessage] = useState('')
  const [manualForm, setManualForm] = useState({
    full_name: '', email: '', phone: '', destination: '',
    duration_days: '', travelers_count: '2', budget_per_person: '',
    currency: 'INR', travel_style: 'Luxury', source: 'MANUAL',
  })

  useEffect(() => {
    fetchLeads()
  }, [statusFilter, page])

  const fetchLeads = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await leadsApi.list({ status: statusFilter || undefined, page })
      if (data.items && data.items.length > 0) {
        setLeads(data.items)
        setTotal(data.total)
      } else {
        setLeads(SEED_LEADS)
        setTotal(SEED_LEADS.length)
      }
    } catch (err) {
      setLeads(SEED_LEADS)
      setTotal(SEED_LEADS.length)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (leadId: number, newStatus: string) => {
    setUpdating(leadId)
    try {
      await leadsApi.update(leadId, { status: newStatus })
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)))
      setExpandedLeadId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead status')
    } finally {
      setUpdating(null)
    }
  }

  const handleAiIngest = async () => {
    if (!rawMessage.trim()) return
    setInquiryLoading(true)
    setInquirySuccess(null)
    try {
      const result = await queriesApi.ingest({ raw_message: rawMessage, source: 'DASHBOARD' })
      setInquirySuccess(
        `Lead #${result.lead_id} created — ${result.destination || 'destination TBD'}, ${result.triage_confidence}% confidence`
      )
      setRawMessage('')
      fetchLeads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI triage failed')
      setShowInquiry(false)
    } finally {
      setInquiryLoading(false)
    }
  }

  const handleManualCreate = async () => {
    setInquiryLoading(true)
    setInquirySuccess(null)
    try {
      const lead = await leadsApi.create({
        full_name: manualForm.full_name || undefined,
        email: manualForm.email || undefined,
        phone: manualForm.phone || undefined,
        destination: manualForm.destination || undefined,
        duration_days: manualForm.duration_days ? Number(manualForm.duration_days) : undefined,
        travelers_count: Number(manualForm.travelers_count) || 1,
        budget_per_person: manualForm.budget_per_person ? Number(manualForm.budget_per_person) : undefined,
        currency: manualForm.currency,
        travel_style: manualForm.travel_style,
        source: 'MANUAL',
      })
      setInquirySuccess(`Lead #${lead.id} — ${lead.full_name || 'Unnamed'} created successfully`)
      setManualForm({ full_name: '', email: '', phone: '', destination: '', duration_days: '', travelers_count: '2', budget_per_person: '', currency: 'INR', travel_style: 'Luxury', source: 'MANUAL' })
      fetchLeads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
      setShowInquiry(false)
    } finally {
      setInquiryLoading(false)
    }
  }

  const filteredLeads = leads.filter((lead) => {
    const searchStr = searchTerm.toLowerCase()
    return (
      (lead.destination?.toLowerCase().includes(searchStr) || '') ||
      (lead.full_name?.toLowerCase().includes(searchStr) || '') ||
      (lead.email?.toLowerCase().includes(searchStr) || '')
    )
  })

  const pageSize = 10
  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Leads Pipeline</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and qualify incoming travel inquiries.</p>
        </div>
        <button
          onClick={() => { setShowInquiry(true); setInquirySuccess(null) }}
          className="bg-[#00236f] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#00236f]/10 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus size={18} /> New Inquiry
        </button>
      </div>

      {/* New Inquiry Modal */}
      {showInquiry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-[#0F172A]">New Inquiry</h2>
              <button onClick={() => setShowInquiry(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setInquiryMode('ai')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  inquiryMode === 'ai' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Sparkles size={15} /> AI Triage
              </button>
              <button
                onClick={() => setInquiryMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  inquiryMode === 'manual' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <UserPlus size={15} /> Manual Entry
              </button>
            </div>

            {inquirySuccess ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="font-bold text-slate-800 mb-1">Lead Created</p>
                <p className="text-sm text-slate-500 mb-6">{inquirySuccess}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setInquirySuccess(null)}
                    className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                  >
                    Add Another
                  </button>
                  <button
                    onClick={() => setShowInquiry(false)}
                    className="flex-1 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-all"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : inquiryMode === 'ai' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Paste the client's message
                  </label>
                  <textarea
                    value={rawMessage}
                    onChange={(e) => setRawMessage(e.target.value)}
                    placeholder="e.g. Hi, I'm looking for a 7-day family trip to Bali in December for 4 people, budget around ₹1.5L per person..."
                    rows={5}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all resize-none text-sm"
                  />
                  <p className="text-xs text-slate-400 mt-1">The AI will extract destination, duration, budget, style, and generate a suggested reply.</p>
                </div>
                <button
                  onClick={handleAiIngest}
                  disabled={inquiryLoading || !rawMessage.trim()}
                  className="w-full bg-[#14B8A6] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 transition-all disabled:opacity-50"
                >
                  {inquiryLoading ? <><Loader size={16} className="animate-spin" /> Analysing...</> : <><Sparkles size={16} /> Triage with AI</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Full Name</label>
                    <input type="text" value={manualForm.full_name} onChange={(e) => setManualForm({ ...manualForm, full_name: e.target.value })} placeholder="Jane Doe" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Email</label>
                    <input type="email" value={manualForm.email} onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })} placeholder="jane@example.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
                    <input type="tel" value={manualForm.phone} onChange={(e) => setManualForm({ ...manualForm, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Destination</label>
                    <input type="text" value={manualForm.destination} onChange={(e) => setManualForm({ ...manualForm, destination: e.target.value })} placeholder="Bali, Maldives..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Duration (days)</label>
                    <input type="number" min={1} value={manualForm.duration_days} onChange={(e) => setManualForm({ ...manualForm, duration_days: e.target.value })} placeholder="7" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Travelers</label>
                    <input type="number" min={1} value={manualForm.travelers_count} onChange={(e) => setManualForm({ ...manualForm, travelers_count: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Budget/Person</label>
                    <input type="number" value={manualForm.budget_per_person} onChange={(e) => setManualForm({ ...manualForm, budget_per_person: e.target.value })} placeholder="150000" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Travel Style</label>
                    <select value={manualForm.travel_style} onChange={(e) => setManualForm({ ...manualForm, travel_style: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm bg-white">
                      {['Luxury', 'Adventure', 'Cultural', 'Family', 'Budget', 'Wellness'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleManualCreate}
                  disabled={inquiryLoading}
                  className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50 mt-2"
                >
                  {inquiryLoading ? <><Loader size={16} className="animate-spin" /> Creating...</> : <><UserPlus size={16} /> Create Lead</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by destination, name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all bg-white"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL_SENT">Proposal Sent</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader size={32} className="animate-spin text-slate-400" />
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-slate-400 text-sm font-medium">No leads found</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 pl-4 pr-2">#</th>
                  <th className="pb-3 px-2">Contact</th>
                  <th className="pb-3 px-2">Destination</th>
                  <th className="pb-3 px-2">Duration</th>
                  <th className="pb-3 px-2">Budget</th>
                  <th className="pb-3 px-2">Style</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Priority</th>
                  <th className="pb-3 px-2">Confidence</th>
                  <th className="pb-3 px-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                  <React.Fragment key={lead.id}>
                    <tr
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setExpandedLeadId(expandedLeadId === lead.id ? null : lead.id)}
                    >
                      <td className="py-3 pl-4 pr-2 font-bold text-[#0F172A]">{lead.id}</td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium text-slate-900">{lead.full_name || 'N/A'}</div>
                          <div className="text-xs text-slate-500">{lead.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-700">{lead.destination || 'N/A'}</td>
                      <td className="py-3 px-2 text-slate-700">{lead.duration_days || 'N/A'} days</td>
                      <td className="py-3 px-2">
                        {lead.budget_per_person
                          ? `${lead.currency} ${lead.budget_per_person.toLocaleString()}`
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-2 text-slate-700">{lead.travel_style}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${
                            statusBadgeColor[lead.status as keyof typeof statusBadgeColor] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-slate-700 font-bold">{lead.priority}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-[#14B8A6] h-2 rounded-full"
                              style={{ width: `${lead.triage_confidence}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600 w-8">{lead.triage_confidence}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-500 text-xs">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                    </tr>

                    {expandedLeadId === lead.id && (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={10} className="py-6 px-4">
                          <div className="space-y-6">
                            <div>
                              <h4 className="font-bold text-slate-900 mb-2">Lead Details</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-slate-500 font-medium">Phone:</span>
                                  <div className="text-slate-900 font-medium">{lead.phone || 'N/A'}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Travelers:</span>
                                  <div className="text-slate-900 font-medium">{lead.travelers_count}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Source:</span>
                                  <div className="text-slate-900 font-medium">{lead.source}</div>
                                </div>
                                <div>
                                  <span className="text-slate-500 font-medium">Confidence Score:</span>
                                  <div className="text-slate-900 font-medium">{lead.triage_confidence}%</div>
                                </div>
                              </div>
                            </div>

                            {lead.suggested_reply && (
                              <div>
                                <h4 className="font-bold text-slate-900 mb-2">AI Suggested Reply</h4>
                                <div className="bg-white p-4 rounded-lg border border-slate-200 italic text-slate-700">
                                  "{lead.suggested_reply}"
                                </div>
                              </div>
                            )}

                            <div>
                              <h4 className="font-bold text-slate-900 mb-2">Update Status</h4>
                              <div className="flex flex-wrap gap-2">
                                {['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST'].map(
                                  (status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusUpdate(lead.id, status)}
                                      disabled={updating === lead.id}
                                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                                        lead.status === status
                                          ? 'bg-[#14B8A6] text-white'
                                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                      } ${updating === lead.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {status}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
            <div className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total} total leads)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
