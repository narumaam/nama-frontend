'use client'

import React, { useState, useEffect } from 'react'
import { leadsApi, itinerariesApi, Lead, ItineraryOut } from '@/lib/api'
import {
  FileText, Plus, Loader, AlertCircle, CheckCircle,
  Clock, Send, Download, Eye, X, ChevronRight,
  Sparkles, DollarSign,
} from 'lucide-react'

// Local quotation state (will persist to backend once M3 backend endpoint added)
interface Quotation {
  id: string
  lead_id?: number
  itinerary_id?: number
  lead_name?: string
  destination?: string
  total_price: number
  currency: string
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  created_at: string
  expires_at?: string
  notes?: string
  margin_pct: number
  duration_days?: number
  travelers: number
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    'bg-slate-100 text-slate-600',
  SENT:     'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  EXPIRED:  'bg-amber-50 text-amber-700',
}

function QuotationCard({ q, onView }: { q: Quotation; onView: (q: Quotation) => void }) {
  return (
    <div
      className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-[#14B8A6]/40 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onView(q)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-slate-900">{q.lead_name || `Quote #${q.id.slice(-6)}`}</div>
          <div className="text-xs text-slate-400 mt-0.5">{q.destination || 'Destination TBD'} · {q.duration_days ? `${q.duration_days}D` : '—'} · {q.travelers} pax</div>
        </div>
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${STATUS_STYLES[q.status]}`}>
          {q.status}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-extrabold text-[#00236f]">
            {q.currency} {q.total_price.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {q.margin_pct}% margin · Created {new Date(q.created_at).toLocaleDateString()}
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
      </div>
    </div>
  )
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [itineraries, setItineraries] = useState<ItineraryOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  // New quote form
  const [form, setForm] = useState({
    lead_id: '', itinerary_id: '', margin_pct: '20',
    notes: '', expires_days: '7',
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load leads and itineraries for the form
      const [leadsData, itinData] = await Promise.all([
        leadsApi.list({ size: 50 }).catch(() => ({ items: [] })),
        itinerariesApi.list().catch(() => []),
      ])
      setLeads(leadsData.items || [])
      setItineraries(Array.isArray(itinData) ? itinData : [])

      // Load quotations from localStorage as temporary storage
      // (will be replaced by GET /api/v1/quotations once M3 backend is live)
      const stored = localStorage.getItem('nama_quotations')
      if (stored) setQuotations(JSON.parse(stored))
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const lead = leads.find(l => l.id === Number(form.lead_id))
      const itin = itineraries.find(i => i.id === Number(form.itinerary_id))
      const basePrice = itin?.total_price || 0
      const margin = Number(form.margin_pct) / 100
      const totalPrice = Math.round(basePrice * (1 + margin))
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + Number(form.expires_days))

      const newQuote: Quotation = {
        id: `q-${Date.now()}`,
        lead_id: lead?.id,
        itinerary_id: itin?.id,
        lead_name: lead?.full_name || undefined,
        destination: lead?.destination || itin?.title,
        total_price: totalPrice,
        currency: itin?.currency || lead?.currency || 'INR',
        status: 'DRAFT',
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        notes: form.notes,
        margin_pct: Number(form.margin_pct),
        duration_days: lead?.duration_days || itin?.duration_days,
        travelers: lead?.travelers_count || 2,
      }

      const updated = [newQuote, ...quotations]
      setQuotations(updated)
      localStorage.setItem('nama_quotations', JSON.stringify(updated))
      setShowNew(false)
      setForm({ lead_id: '', itinerary_id: '', margin_pct: '20', notes: '', expires_days: '7' })
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = (id: string, status: Quotation['status']) => {
    const updated = quotations.map(q => q.id === id ? { ...q, status } : q)
    setQuotations(updated)
    localStorage.setItem('nama_quotations', JSON.stringify(updated))
    if (selectedQuote?.id === id) setSelectedQuote({ ...selectedQuote, status })
  }

  const filtered = statusFilter === 'ALL' ? quotations : quotations.filter(q => q.status === statusFilter)

  // Stats
  const totalValue = quotations.reduce((s, q) => s + q.total_price, 0)
  const wonValue = quotations.filter(q => q.status === 'ACCEPTED').reduce((s, q) => s + q.total_price, 0)
  const convRate = quotations.length > 0 ? Math.round((quotations.filter(q => q.status === 'ACCEPTED').length / quotations.length) * 100) : 0

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Quotations</h1>
          <p className="text-slate-500 mt-2 font-medium">Build, send and track travel proposals.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="bg-[#00236f] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#00236f]/10 hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> New Quotation
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Quotes', value: quotations.length, icon: FileText, color: 'text-blue-600 bg-blue-50' },
          { label: 'Pipeline Value', value: `₹${(totalValue/100000).toFixed(1)}L`, icon: DollarSign, color: 'text-violet-600 bg-violet-50' },
          { label: 'Won Value', value: `₹${(wonValue/100000).toFixed(1)}L`, icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Conversion Rate', value: `${convRate}%`, icon: Sparkles, color: 'text-[#14B8A6] bg-teal-50' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-11 h-11 ${stat.color.split(' ')[1]} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className={stat.color.split(' ')[0]} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === s ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s === 'ALL' ? `All (${quotations.length})` : `${s} (${quotations.filter(q => q.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Quotation grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader size={28} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-slate-400" />
          </div>
          <h3 className="font-extrabold text-slate-700 text-lg mb-2">
            {statusFilter === 'ALL' ? 'No quotations yet' : `No ${statusFilter.toLowerCase()} quotations`}
          </h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            {statusFilter === 'ALL'
              ? 'Build your first quotation from a lead or itinerary. NAMA calculates total price with your margin automatically.'
              : 'Try changing the status filter.'}
          </p>
          {statusFilter === 'ALL' && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-600 transition-all"
            >
              <Plus size={18} /> Create First Quotation
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(q => (
            <QuotationCard key={q.id} q={q} onView={setSelectedQuote} />
          ))}
        </div>
      )}

      {/* ── New Quotation Modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-[#0F172A]">New Quotation</h2>
              <button onClick={() => setShowNew(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Link to Lead (optional)</label>
                <select value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm">
                  <option value="">No specific lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.full_name || `Lead #${l.id}`} — {l.destination || 'N/A'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Link to Itinerary (optional)</label>
                <select value={form.itinerary_id} onChange={e => setForm({...form, itinerary_id: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm">
                  <option value="">No itinerary</option>
                  {itineraries.map(i => <option key={i.id} value={i.id}>{i.title} — {i.currency} {i.total_price?.toLocaleString()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Margin %</label>
                  <input type="number" min="0" max="100" value={form.margin_pct} onChange={e => setForm({...form, margin_pct: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Expires in (days)</label>
                  <input type="number" min="1" max="60" value={form.expires_days} onChange={e => setForm({...form, expires_days: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Notes for Client (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Any special inclusions, T&Cs..." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm resize-none" />
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="mt-5 w-full bg-[#0F172A] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {creating ? <><Loader size={14} className="animate-spin" /> Creating...</> : <><FileText size={14} /> Create Quotation</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Quotation Detail Modal ── */}
      {selectedQuote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedQuote(null)}>
          <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">{selectedQuote.lead_name || `Quote #${selectedQuote.id.slice(-6)}`}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selectedQuote.destination} · {selectedQuote.duration_days}D · {selectedQuote.travelers} pax</p>
              </div>
              <button onClick={() => setSelectedQuote(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 mb-5">
              <div className="text-3xl font-black text-[#00236f]">{selectedQuote.currency} {selectedQuote.total_price.toLocaleString('en-IN')}</div>
              <div className="text-sm text-slate-400 mt-1">{selectedQuote.margin_pct}% margin included</div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Status', value: selectedQuote.status },
                { label: 'Created', value: new Date(selectedQuote.created_at).toLocaleDateString() },
                { label: 'Expires', value: selectedQuote.expires_at ? new Date(selectedQuote.expires_at).toLocaleDateString() : '—' },
                { label: 'Lead ID', value: selectedQuote.lead_id ? `#${selectedQuote.lead_id}` : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</div>
                  <div className="font-bold text-slate-800 text-sm">{value}</div>
                </div>
              ))}
            </div>

            {selectedQuote.notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-sm text-amber-800">
                <span className="font-bold">Notes: </span>{selectedQuote.notes}
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Update Status</div>
              <div className="flex flex-wrap gap-2">
                {(['DRAFT','SENT','ACCEPTED','REJECTED'] as Quotation['status'][]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedQuote.id, s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedQuote.status === s ? 'bg-[#14B8A6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
