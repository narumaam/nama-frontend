"use client";

import React, { useState, useEffect } from 'react'
import { leadsApi, itinerariesApi, quotationsApi, paymentsApi, Lead, ItineraryOut, Quotation } from '@/lib/api'
import { clearDynamixQuotationDraft, loadDynamixQuotationDraft } from '@/lib/dynamix-handoff'
import {
  FileText, Plus, Loader, AlertCircle, CheckCircle,
  Clock, Send, Download, Eye, X, ChevronRight, ChevronDown,
  Sparkles, DollarSign, Share2, TrendingUp, TrendingDown,
  Minus, BarChart3, Info, Zap, Copy, CreditCard, Search,
  Navigation, User,
} from 'lucide-react'

// ── Status styles ────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  DRAFT:    'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
  SENT:     'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  ACCEPTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  REJECTED: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  EXPIRED:  'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
}

const LINE_ITEM_STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-[#14B8A6]/10 text-[#0f766e] dark:bg-[#14B8A6]/10 dark:text-[#14B8A6]',
  PENDING:   'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  ESTIMATED: 'bg-slate-100 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400',
}

// ── Seed quotations ──────────────────────────────────────────────────────────
const QTS = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const SEED_QUOTATIONS: Quotation[] = [
  { id: 101, tenant_id: 1, lead_id: 2, lead_name: 'Priya Singh',   destination: 'Maldives',   base_price: 420000, margin_pct: 20, total_price: 504000, currency: 'INR', status: 'SENT',     created_at: QTS(1), updated_at: QTS(1) },
  { id: 102, tenant_id: 1, lead_id: 4, lead_name: 'Karan Kapoor',  destination: 'Kenya',      base_price: 680000, margin_pct: 18, total_price: 802400, currency: 'INR', status: 'ACCEPTED', created_at: QTS(5), updated_at: QTS(4) },
  { id: 103, tenant_id: 1, lead_id: 1, lead_name: 'Ravi Mehta',    destination: 'Rajasthan',  base_price: 260000, margin_pct: 22, total_price: 317200, currency: 'INR', status: 'DRAFT',    created_at: QTS(0), updated_at: QTS(0) },
  { id: 104, tenant_id: 1, lead_id: 5, lead_name: 'Deepika Nair',  destination: 'Bali',       base_price: 195000, margin_pct: 20, total_price: 234000, currency: 'INR', status: 'ACCEPTED', created_at: QTS(8), updated_at: QTS(7) },
  { id: 105, tenant_id: 1, lead_id: 7, lead_name: 'Rohan Verma',   destination: 'Dubai',      base_price: 320000, margin_pct: 15, total_price: 368000, currency: 'INR', status: 'SENT',     created_at: QTS(2), updated_at: QTS(2) },
  { id: 106, tenant_id: 1, lead_id: 8, lead_name: 'Sneha Patel',   destination: 'Santorini',  base_price: 380000, margin_pct: 20, total_price: 456000, currency: 'INR', status: 'REJECTED', created_at: QTS(9), updated_at: QTS(8) },
  { id: 107, tenant_id: 1, lead_id: 3, lead_name: 'Ananya Rao',    destination: 'Kedarnath',  base_price: 55000,  margin_pct: 18, total_price: 64900,  currency: 'INR', status: 'DRAFT',    created_at: QTS(0), updated_at: QTS(0) },
]

// Seed line items per quote id (for expanded row demo)
const SEED_LINE_ITEMS: Record<number, { component: string; net: number; gross: number; status: 'CONFIRMED' | 'PENDING' | 'ESTIMATED' }[]> = {
  101: [
    { component: 'Overwater Villa (5N)',    net: 240000, gross: 300000, status: 'CONFIRMED'  },
    { component: 'Return Flights',          net: 85000,  gross: 105000, status: 'CONFIRMED'  },
    { component: 'Water Sports Package',    net: 32000,  gross: 42000,  status: 'PENDING'    },
    { component: 'Airport Transfers',       net: 18000,  gross: 22000,  status: 'ESTIMATED'  },
  ],
  102: [
    { component: 'Safari Lodge (6N)',       net: 360000, gross: 450000, status: 'CONFIRMED'  },
    { component: 'Nairobi Return Flights',  net: 120000, gross: 148000, status: 'CONFIRMED'  },
    { component: 'Game Drive Package',      net: 80000,  gross: 98000,  status: 'CONFIRMED'  },
    { component: 'Visa & Insurance',        net: 12000,  gross: 16000,  status: 'ESTIMATED'  },
  ],
  103: [
    { component: 'Heritage Hotels (4N)',    net: 120000, gross: 156000, status: 'PENDING'    },
    { component: 'Private Car (4 days)',    net: 45000,  gross: 58000,  status: 'CONFIRMED'  },
    { component: 'Fort & Palace Entries',   net: 8000,   gross: 12000,  status: 'ESTIMATED'  },
  ],
}

// ── Smart Pricing types ──────────────────────────────────────────────────────
interface PricingBenchmark {
  destination: string; avgMarginPct: number;
  marketLow: number; marketMid: number; marketHigh: number;
  demandTrend: 'UP' | 'DOWN' | 'STABLE'; demandPct: number;
  tip: string; segment: string;
}
interface ApiBenchmark {
  destination: string; avg_price_per_person: number; avg_margin_pct: number;
  count: number; min_price: number | null; max_price: number | null;
  data_source: 'live' | 'benchmark';
}

const STATIC_FALLBACK: Record<string, PricingBenchmark> = {
  'Maldives':   { destination: 'Maldives',   avgMarginPct: 22, marketLow: 150000, marketMid: 250000, marketHigh: 500000, demandTrend: 'UP',     demandPct: 34, tip: 'High demand — push margins to 25%+. Overwater villas command premium.', segment: 'LUXURY' },
  'Bali':       { destination: 'Bali',       avgMarginPct: 20, marketLow: 60000,  marketMid: 120000, marketHigh: 220000, demandTrend: 'UP',     demandPct: 18, tip: 'Competitive segment. Differentiate with unique experiences, not just hotels.', segment: 'PREMIUM' },
  'Kenya':      { destination: 'Kenya',      avgMarginPct: 24, marketLow: 200000, marketMid: 350000, marketHigh: 600000, demandTrend: 'UP',     demandPct: 22, tip: 'Safari demand surging. Scarcity of good dates — use urgency in pitch.', segment: 'LUXURY' },
  'Dubai':      { destination: 'Dubai',      avgMarginPct: 16, marketLow: 45000,  marketMid: 90000,  marketHigh: 180000, demandTrend: 'STABLE', demandPct: 2,  tip: 'Price-sensitive segment. Focus on bundled value. Keep margins 15-18%.', segment: 'MID' },
  'Rajasthan':  { destination: 'Rajasthan',  avgMarginPct: 22, marketLow: 25000,  marketMid: 65000,  marketHigh: 150000, demandTrend: 'STABLE', demandPct: -3, tip: 'Heritage segment with loyal customers. Bundle cultural experiences for upsell.', segment: 'MID' },
  'Santorini':  { destination: 'Santorini',  avgMarginPct: 25, marketLow: 120000, marketMid: 200000, marketHigh: 400000, demandTrend: 'UP',     demandPct: 15, tip: 'Europe honeymoon segment growing. High aspirational value — price confidently.', segment: 'LUXURY' },
  'Kedarnath':  { destination: 'Kedarnath',  avgMarginPct: 18, marketLow: 12000,  marketMid: 22000,  marketHigh: 40000,  demandTrend: 'STABLE', demandPct: 5,  tip: 'Pilgrimage segment: value-driven. Reliability and safety are key selling points.', segment: 'BUDGET' },
  'Leh Ladakh': { destination: 'Leh Ladakh', avgMarginPct: 20, marketLow: 20000,  marketMid: 38000,  marketHigh: 75000,  demandTrend: 'DOWN',   demandPct: -8, tip: 'Off-season approaching. Offer early-booking discounts. Adventure differentiates.', segment: 'MID' },
}
const DEFAULT_BENCHMARK: PricingBenchmark = {
  destination: 'General', avgMarginPct: 20, marketLow: 50000, marketMid: 120000, marketHigh: 250000,
  demandTrend: 'STABLE', demandPct: 0, tip: 'Set margins 18-22% for most destinations. Higher for luxury, lower for budget.', segment: 'MID',
}

function getPricingBenchmark(destination: string): PricingBenchmark {
  const key = Object.keys(STATIC_FALLBACK).find(k => destination?.toLowerCase().includes(k.toLowerCase()))
  return key ? STATIC_FALLBACK[key] : { ...DEFAULT_BENCHMARK, destination: destination || 'General' }
}
function apiBenchmarkToUI(api: ApiBenchmark): PricingBenchmark & { dataSource: 'live' | 'benchmark' } {
  const avgPrice = api.avg_price_per_person
  const marketLow  = api.min_price ?? Math.round(avgPrice * 0.6)
  const marketMid  = Math.round(avgPrice)
  const marketHigh = api.max_price ?? Math.round(avgPrice * 1.6)
  const staticKey = Object.keys(STATIC_FALLBACK).find(k =>
    api.destination.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(api.destination.toLowerCase())
  )
  const staticFb = staticKey ? STATIC_FALLBACK[staticKey] : DEFAULT_BENCHMARK
  return {
    destination: api.destination, avgMarginPct: api.avg_margin_pct,
    marketLow, marketMid, marketHigh,
    demandTrend: staticFb.demandTrend, demandPct: staticFb.demandPct,
    tip: api.data_source === 'live'
      ? `Based on ${api.count} real itinerary${api.count !== 1 ? 'ies' : 'y'} — avg ₹${Math.round(avgPrice/1000)}K/person, ${api.avg_margin_pct}% margin.`
      : staticFb.tip,
    segment: staticFb.segment, dataSource: api.data_source,
  }
}

// ── Avatar initials helper ────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = (name || '').trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return (name || '?').slice(0, 2).toUpperCase()
}

// ── Margin color helper ───────────────────────────────────────────────────────
function marginColor(pct: number): string {
  if (pct >= 20) return 'text-emerald-600 dark:text-emerald-400'
  if (pct >= 10) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
}

// ── Payment Link Modal ────────────────────────────────────────────────────────
function PaymentLinkModal({ quotation, onClose }: { quotation: Quotation; onClose: () => void }) {
  const defaultDeposit = Math.round(quotation.total_price * 0.25)
  const [amount, setAmount] = useState(defaultDeposit)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ payment_link_url: string; payment_link_id: string; demo?: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const data = await paymentsApi.createLink({
        quotation_id: quotation.id, amount,
        description: `Deposit for ${quotation.destination || 'travel package'} — ${quotation.lead_name || `Quote #${quotation.id}`}`,
        currency: quotation.currency || 'INR',
      })
      setResult(data)
    } catch (err: any) {
      setResult(null)
      alert(err.message || 'Failed to generate payment link')
    } finally { setLoading(false) }
  }
  const handleCopy = () => {
    if (result?.payment_link_url) { navigator.clipboard.writeText(result.payment_link_url); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  }
  const handleWhatsApp = () => {
    if (!result?.payment_link_url) return
    const amtFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: quotation.currency || 'INR', maximumFractionDigits: 0 }).format(amount)
    const text = `Hi ${quotation.lead_name?.split(' ')[0] || 'there'}! To confirm your ${quotation.destination} booking, please pay the deposit of ${amtFormatted} via this secure link:\n\n${result.payment_link_url}\n\n_Sent via NAMA OS_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#0F1B35] rounded-t-[28px] sm:rounded-[28px] p-6 md:p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Collect Deposit</h2>
            <p className="text-xs text-slate-400 mt-0.5">Generate a Razorpay payment link</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X size={18} /></button>
        </div>
        <div className="bg-[#F8FAFC] dark:bg-white/5 rounded-xl p-3 mb-5 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-200">{quotation.lead_name}</span>
          {' · '}{quotation.destination}{' · '}
          Total: {quotation.currency} {quotation.total_price.toLocaleString('en-IN')}
        </div>
        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                Deposit Amount ({quotation.currency}) <span className="text-slate-400 font-normal ml-1">— default 25%</span>
              </label>
              <input type="number" min={1} value={amount} onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] dark:focus:border-[#14B8A6] text-sm font-bold text-slate-900 dark:text-slate-100" />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50].map(pct => (
                  <button key={pct} onClick={() => setAmount(Math.round(quotation.total_price * pct / 100))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${amount === Math.round(quotation.total_price * pct / 100) ? 'bg-[#14B8A6] text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleGenerate} disabled={loading || amount <= 0}
              className="w-full py-3.5 bg-[#1B2E5E] hover:bg-[#14275a] text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {loading ? <><Loader size={14} className="animate-spin" /> Generating...</> : <><CreditCard size={14} /> Generate Link</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm mb-2">
                <CheckCircle size={16} /> Payment link ready!
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono break-all bg-white dark:bg-white/5 rounded-lg px-3 py-2 border border-emerald-100 dark:border-white/5">
                {result.payment_link_url}
              </div>
              {result.demo && <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-lg px-2 py-1">Demo mode — add RAZORPAY keys in Railway to activate live links</div>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handleCopy} className="flex items-center justify-center gap-1.5 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold text-xs transition-colors">
                <Copy size={13} />{copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button onClick={handleWhatsApp} className="flex items-center justify-center gap-1.5 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 py-3 rounded-xl font-bold text-xs transition-colors">
                <Share2 size={13} /> WhatsApp
              </button>
            </div>
            <button onClick={onClose} className="w-full py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Expandable Row Detail ─────────────────────────────────────────────────────
function ExpandedRow({ q, onSend, onDownloadPdf, onPayment, onWhatsApp, pdfLoading }: {
  q: Quotation
  onSend: () => void
  onDownloadPdf: () => void
  onPayment: () => void
  onWhatsApp: () => void
  pdfLoading: boolean
}) {
  const lineItems = SEED_LINE_ITEMS[q.id] ?? []
  const hasItems = lineItems.length > 0

  return (
    <tr className="bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      <td colSpan={8} className="px-6 py-5 border-b border-slate-100 dark:border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Line items */}
          <div className="md:col-span-2">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Line Items</div>
            {hasItems ? (
              <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-white/3">
                      <th className="text-left px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400">Component</th>
                      <th className="text-right px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400">Net Cost</th>
                      <th className="text-right px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400">Gross Price</th>
                      <th className="text-right px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400">Margin</th>
                      <th className="text-right px-4 py-2.5 font-bold text-slate-500 dark:text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const marginPct = Math.round(((item.gross - item.net) / item.gross) * 100)
                      return (
                        <tr key={idx} className="border-t border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/3 transition-colors">
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">{item.component}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500 dark:text-slate-400 font-mono">₹{item.net.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-right text-slate-800 dark:text-slate-200 font-mono font-bold">₹{item.gross.toLocaleString('en-IN')}</td>
                          <td className={`px-4 py-2.5 text-right font-bold font-mono ${marginColor(marginPct)}`}>{marginPct}%</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${LINE_ITEM_STATUS_STYLES[item.status]}`}>{item.status}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/3 rounded-2xl px-4 py-6 text-center">
                No line items linked — attach an itinerary to see breakdown
              </div>
            )}

            {/* Respond token info for SENT */}
            {q.status === 'SENT' && (
              <div className="mt-3 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info size={13} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-blue-700 dark:text-blue-400 mb-0.5">Respond Token Active</div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400/80">Client can view and respond to this quotation via their secure link. Share via WhatsApp or email.</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions panel */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Actions</div>
            <div className="flex flex-col gap-2">
              <button onClick={onSend}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#14B8A6]/10 hover:bg-[#14B8A6]/20 dark:bg-[#14B8A6]/10 dark:hover:bg-[#14B8A6]/20 text-[#0f766e] dark:text-[#14B8A6] rounded-xl font-bold text-xs transition-colors">
                <Send size={13} /> Send to Client
              </button>
              <button onClick={onDownloadPdf} disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors disabled:opacity-40">
                {pdfLoading ? <Loader size={13} className="animate-spin" /> : <Download size={13} />} Download PDF
              </button>
              {q.status === 'ACCEPTED' && (
                <button onClick={onPayment}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-xl font-bold text-xs transition-colors">
                  <CreditCard size={13} /> Collect Deposit
                </button>
              )}
              <button onClick={onWhatsApp}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-700 dark:text-green-400 rounded-xl font-bold text-xs transition-colors">
                <Share2 size={13} /> Share on WhatsApp
              </button>
            </div>

            {/* Quick stats */}
            {q.notes && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 rounded-xl px-3 py-2.5 text-xs text-amber-800 dark:text-amber-400">
                <span className="font-bold">Note: </span>{q.notes}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [itineraries, setItineraries] = useState<ItineraryOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [quoteToast, setQuoteToast] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [pricingBenchmarks, setPricingBenchmarks] = useState<Record<string, PricingBenchmark & { dataSource: 'live' | 'benchmark' }>>({})
  const benchmarkFetchedRef = React.useRef<Set<string>>(new Set())

  // New quote form
  const [form, setForm] = useState({ lead_id: '', itinerary_id: '', lead_name: '', destination: '', base_price: '0', margin_pct: '20', notes: '' })
  const [creating, setCreating] = useState(false)

  // Payment link modal
  const [paymentModal, setPaymentModal] = useState<{ quotation: Quotation } | null>(null)

  // Send modal
  const [sendModal, setSendModal] = useState<{ quote: Quotation; email: string } | null>(null)
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const draft = loadDynamixQuotationDraft()
    if (!draft) return

    setForm((prev) => ({
      ...prev,
      lead_id: draft.lead_id ? String(draft.lead_id) : prev.lead_id,
      itinerary_id: draft.itinerary_id ? String(draft.itinerary_id) : prev.itinerary_id,
      lead_name: draft.lead_name || prev.lead_name,
      destination: draft.destination || prev.destination,
      base_price: draft.base_price || prev.base_price,
      margin_pct: draft.margin_pct || prev.margin_pct,
      notes: draft.notes || prev.notes,
    }))
    setShowNew(true)
    clearDynamixQuotationDraft()
  }, [])

  // Fetch pricing benchmark when a row is expanded
  useEffect(() => {
    if (!expandedId) return
    const q = quotations.find(x => x.id === expandedId)
    if (!q?.destination) return
    const dest = q.destination
    if (benchmarkFetchedRef.current.has(dest)) return
    benchmarkFetchedRef.current.add(dest)
    const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`/api/v1/analytics/pricing-benchmarks?destination=${encodeURIComponent(dest)}`, { headers })
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then((rows: ApiBenchmark[] | null) => {
        if (!rows || rows.length === 0) return
        setPricingBenchmarks(prev => ({ ...prev, [dest]: apiBenchmarkToUI(rows[0]) }))
      })
  }, [expandedId, quotations]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true); setError(null)
    try {
      const [quotsData, leadsData, itinData] = await Promise.all([
        quotationsApi.list({ size: 100 }).catch(() => ({ items: [] as Quotation[], total: 0, page: 1, size: 100 })),
        leadsApi.list({ size: 50 }).catch(() => ({ items: [] })),
        itinerariesApi.list().catch(() => []),
      ])
      const quots = quotsData.items || []
      setQuotations(quots.length > 0 ? quots : SEED_QUOTATIONS)
      setLeads(leadsData.items || [])
      setItineraries(Array.isArray(itinData) ? itinData : [])
    } catch { setQuotations(SEED_QUOTATIONS) }
    finally { setLoading(false) }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const lead = leads.find(l => l.id === Number(form.lead_id))
      const itin = itineraries.find(i => i.id === Number(form.itinerary_id))
      const created = await quotationsApi.create({
        lead_name:    form.lead_name || lead?.full_name || 'Unknown',
        destination:  form.destination || lead?.destination || itin?.title || 'TBD',
        base_price:   Number(form.base_price) || itin?.total_price || 0,
        margin_pct:   Number(form.margin_pct),
        currency:     itin?.currency || lead?.currency || 'INR',
        lead_id:      lead?.id,
        itinerary_id: itin?.id,
        notes:        form.notes || undefined,
      })
      setQuotations([created, ...quotations])
      setShowNew(false)
      setForm({ lead_id: '', itinerary_id: '', lead_name: '', destination: '', base_price: '0', margin_pct: '20', notes: '' })
    } catch (e: any) { setError(e.message || 'Failed to create quotation') }
    finally { setCreating(false) }
  }

  const handleStatusChange = async (id: number, newStatus: Quotation['status']) => {
    try {
      const updated = newStatus === 'SENT' ? await quotationsApi.send(id) : await quotationsApi.update(id, { status: newStatus })
      setQuotations(quotations.map(q => q.id === id ? updated : q))
    } catch (e: any) { setError(e.message || 'Status update failed') }
  }

  const handleExportQuotePDF = async (q: Quotation) => {
    setPdfLoading(true)
    try {
      const res = await fetch('/api/v1/documents/quotation-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quotation_id: q.id }) })
      if (!res.ok) throw new Error('PDF generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `quotation_${q.id}.pdf`; a.click()
      URL.revokeObjectURL(url)
      setQuoteToast('PDF downloaded successfully'); setTimeout(() => setQuoteToast(null), 3000)
    } catch { setQuoteToast('PDF download failed — try again'); setTimeout(() => setQuoteToast(null), 3000) }
    finally { setPdfLoading(false) }
  }

  const handleSendQuote = async () => {
    if (!sendModal) return; setSending(true); setSendResult(null)
    try {
      const res = await fetch('/api/v1/documents/send-quotation', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotation_id: sendModal.quote.id, client_email: sendModal.email, message: sendMessage || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setSendResult({ ok: true, text: `Quote sent to ${sendModal.email} ✓` })
        setTimeout(() => { setSendModal(null); setSendMessage(''); setSendResult(null) }, 2500)
      } else { setSendResult({ ok: false, text: data.error || 'Send failed' }) }
    } catch { setSendResult({ ok: false, text: 'Network error — please try again' }) }
    finally { setSending(false) }
  }

  const handleShareQuoteWhatsApp = (q: Quotation) => {
    const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: q.currency || 'INR', maximumFractionDigits: 0 }).format(q.total_price)
    const text = `✈️ *Travel Quotation — ${q.destination}*\n\nDear ${q.lead_name || 'Valued Guest'},\n\nYour personalised travel quotation is ready.\n\n📍 Destination: *${q.destination}*\n💰 Total Package: *${totalFormatted}*\n📅 Validity: 7 days from today\n\nPlease reply *YES* to confirm and we'll begin your booking.\n\n_Sent via NAMA OS · getnama.app_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    setQuoteToast('WhatsApp opened with your quotation!'); setTimeout(() => setQuoteToast(null), 3000)
  }

  // Filtered list
  const filtered = quotations.filter(q => {
    const matchStatus = statusFilter === 'ALL' || q.status === statusFilter
    const matchSearch = !search || (q.lead_name || '').toLowerCase().includes(search.toLowerCase()) || (q.destination || '').toLowerCase().includes(search.toLowerCase()) || String(q.id).includes(search)
    return matchStatus && matchSearch
  })

  // KPI stats
  const totalValue  = quotations.reduce((s, q) => s + q.total_price, 0)
  const pending     = quotations.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length
  const accepted    = quotations.filter(q => q.status === 'ACCEPTED').length
  const avgMargin   = quotations.length > 0 ? Math.round(quotations.reduce((s, q) => s + (q.margin_pct || 0), 0) / quotations.length) : 0

  const kpiCards = [
    { label: 'Total Quotations', value: String(quotations.length),            sub: `${avgMargin}% avg margin`,         color: 'text-[#1B2E5E] dark:text-[#14B8A6]', bg: 'bg-[#1B2E5E]/5 dark:bg-[#14B8A6]/10' },
    { label: 'Pending Review',   value: String(pending),                       sub: 'Draft + Sent',                      color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Accepted',         value: String(accepted),                      sub: `${Math.round((accepted / Math.max(quotations.length, 1)) * 100)}% conversion`,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Total Value',      value: `₹${(totalValue / 100000).toFixed(1)}L`, sub: 'Pipeline value (INR)',             color: 'text-[#1B2E5E] dark:text-[#14B8A6]', bg: 'bg-[#1B2E5E]/5 dark:bg-[#14B8A6]/10' },
  ]

  const kpiIcons = [FileText, Clock, CheckCircle, DollarSign]

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] space-y-6 p-0">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">Quotations</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Build, send and track travel proposals.</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-[#1B2E5E] hover:bg-[#14275a] text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-[#1B2E5E]/20 transition-colors self-start sm:self-auto">
          <Plus size={16} /> New Quotation
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => {
          const Icon = kpiIcons[i]
          return (
            <div key={card.label} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={card.color} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{card.value}</div>
                <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate">{card.label}</div>
                <div className="text-[10px] text-slate-400 dark:text-slate-600 truncate">{card.sub}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search client, destination, ID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-[#0F1B35] border border-slate-200 dark:border-white/5 rounded-xl text-sm outline-none focus:border-[#14B8A6] dark:focus:border-[#14B8A6] text-slate-700 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === s
                  ? 'bg-[#14B8A6]/10 text-[#14B8A6] border-[#14B8A6]/20 dark:bg-[#14B8A6]/10 dark:text-[#14B8A6] dark:border-[#14B8A6]/20'
                  : 'bg-white dark:bg-[#0F1B35] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10'
              }`}>
              {s === 'ALL' ? `All (${quotations.length})` : `${s} (${quotations.filter(q => q.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader size={28} className="animate-spin text-slate-300 dark:text-slate-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#0F1B35] border-2 border-dashed border-slate-200 dark:border-white/5 rounded-2xl p-16 text-center">
          <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={24} className="text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="font-extrabold text-slate-700 dark:text-slate-300 text-lg mb-2">
            {statusFilter === 'ALL' && !search ? 'No quotations yet' : `No matching quotations`}
          </h3>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6 max-w-xs mx-auto">
            {statusFilter === 'ALL' && !search
              ? 'Build your first quotation from a lead or itinerary.'
              : 'Try adjusting your search or filter.'}
          </p>
          {statusFilter === 'ALL' && !search && (
            <button onClick={() => setShowNew(true)}
              className="inline-flex items-center gap-2 bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-600 transition-colors">
              <Plus size={16} /> Create First Quotation
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-100 dark:border-white/5 bg-[#F8FAFC] dark:bg-white/3">
                  <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Quote #</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Client</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Route</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Amount</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Margin</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Created</th>
                  <th className="text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Status</th>
                  <th className="text-right px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => {
                  const isExpanded = expandedId === q.id
                  const lead = leads.find(l => l.id === q.lead_id)
                  const origin = (lead as unknown as Record<string, string>)?.origin || 'India'
                  const dest   = q.destination || 'TBD'
                  return (
                    <React.Fragment key={q.id}>
                      <tr
                        className={`border-b border-slate-100 dark:border-white/5 hover:bg-[#F8FAFC] dark:hover:bg-white/5 cursor-pointer transition-colors ${isExpanded ? 'bg-[#F8FAFC] dark:bg-white/3' : ''}`}
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        {/* Quote # */}
                        <td className="px-5 py-4">
                          <span className="font-mono font-bold text-sm text-[#1B2E5E] dark:text-[#14B8A6]">
                            #{String(q.id).padStart(6, '0')}
                          </span>
                        </td>

                        {/* Client */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#1B2E5E]/10 dark:bg-[#14B8A6]/10 text-[#1B2E5E] dark:text-[#14B8A6] flex items-center justify-center text-[11px] font-black flex-shrink-0">
                              {getInitials(q.lead_name || '')}
                            </div>
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {q.lead_name || `Quote #${q.id}`}
                            </span>
                          </div>
                        </td>

                        {/* Route */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                            <Navigation size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                            <span className="whitespace-nowrap">{origin} → <span className="font-semibold text-slate-700 dark:text-slate-300">{dest}</span></span>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4 text-right">
                          <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                            ₹{q.total_price.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Margin */}
                        <td className="px-5 py-4 text-right">
                          <span className={`font-bold text-sm font-mono ${marginColor(q.margin_pct)}`}>
                            {q.margin_pct}%
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[q.status]}`}>
                            {q.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            {/* Send */}
                            <button
                              title="Send to Client"
                              onClick={() => { setSendModal({ quote: q, email: '' }); setSendMessage(''); setSendResult(null) }}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#14B8A6] dark:hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-lg transition-colors">
                              <Send size={14} />
                            </button>
                            {/* PDF */}
                            <button
                              title="Download PDF"
                              onClick={() => handleExportQuotePDF(q)}
                              disabled={pdfLoading}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#1B2E5E] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40">
                              <Download size={14} />
                            </button>
                            {/* Expand */}
                            <button
                              title={isExpanded ? 'Collapse' : 'View Details'}
                              onClick={() => setExpandedId(isExpanded ? null : q.id)}
                              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-[#1B2E5E] dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable detail row */}
                      {isExpanded && (
                        <ExpandedRow
                          q={q}
                          onSend={() => { setSendModal({ quote: q, email: '' }); setSendMessage(''); setSendResult(null) }}
                          onDownloadPdf={() => handleExportQuotePDF(q)}
                          onPayment={() => setPaymentModal({ quotation: q })}
                          onWhatsApp={() => handleShareQuoteWhatsApp(q)}
                          pdfLoading={pdfLoading}
                        />
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Table footer */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">{filtered.length} quotation{filtered.length !== 1 ? 's' : ''} shown</span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Total ₹{filtered.reduce((s, q) => s + q.total_price, 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      )}

      {/* ── New Quotation Modal ── */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-[#0F1B35] rounded-t-[28px] sm:rounded-[28px] p-6 md:p-8 w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">New Quotation</h2>
              <button onClick={() => setShowNew(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Client Name *</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={form.lead_name} onChange={e => setForm({...form, lead_name: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Destination *</label>
                  <input type="text" placeholder="e.g. Bali, 7 Days" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Link to Lead (optional)</label>
                <select value={form.lead_id} onChange={e => setForm({...form, lead_id: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-700 dark:text-slate-300">
                  <option value="">No specific lead</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.full_name || `Lead #${l.id}`} — {l.destination || 'N/A'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Link to Itinerary (optional)</label>
                <select value={form.itinerary_id} onChange={e => setForm({...form, itinerary_id: e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0F1B35] rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-700 dark:text-slate-300">
                  <option value="">No itinerary</option>
                  {itineraries.map(i => <option key={i.id} value={i.id}>{i.title} — {i.currency} {i.total_price?.toLocaleString()}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Base Price (₹)</label>
                  <input type="number" min="0" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Margin %</label>
                  <input type="number" min="0" max="100" value={form.margin_pct} onChange={e => setForm({...form, margin_pct: e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-900 dark:text-slate-100" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Notes for Client (optional)</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} placeholder="Any special inclusions, T&Cs..."
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" />
              </div>
            </div>
            {error && (
              <div className="mt-4 flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} />{error}
              </div>
            )}
            <button onClick={handleCreate} disabled={creating}
              className="mt-5 w-full bg-[#1B2E5E] hover:bg-[#14275a] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {creating ? <><Loader size={14} className="animate-spin" /> Creating...</> : <><FileText size={14} /> Create Quotation</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Send to Client Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSendModal(null)}>
          <div className="bg-white dark:bg-[#0F1B35] rounded-t-[28px] sm:rounded-[28px] p-6 md:p-8 w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 dark:border-white/5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Send Quote to Client</h2>
              <button onClick={() => setSendModal(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"><X size={18} /></button>
            </div>
            <div className="bg-[#F8FAFC] dark:bg-white/5 rounded-xl p-3 mb-5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-700 dark:text-slate-200">{sendModal.quote.lead_name}</span>
              {' · '}{sendModal.quote.destination}{' · '}
              {sendModal.quote.currency} {sendModal.quote.total_price.toLocaleString('en-IN')}
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Client Email *</label>
                <input type="email" placeholder="client@example.com" value={sendModal.email}
                  onChange={e => setSendModal({ ...sendModal, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Personal Message (optional)</label>
                <textarea rows={3} placeholder="Add a note to your client..." value={sendMessage} onChange={e => setSendMessage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 rounded-xl outline-none focus:border-[#14B8A6] text-sm resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600" />
              </div>
            </div>
            {sendResult && (
              <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                sendResult.ok ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                              : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'}`}>
                {sendResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{sendResult.text}
              </div>
            )}
            <button onClick={handleSendQuote} disabled={sending || !sendModal.email}
              className="mt-5 w-full bg-[#14B8A6] hover:bg-teal-600 text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
              {sending ? <><Loader size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Quote</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Payment Link Modal ── */}
      {paymentModal && (
        <PaymentLinkModal quotation={paymentModal.quotation} onClose={() => setPaymentModal(null)} />
      )}

      {/* ── Toast ── */}
      {quoteToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] dark:bg-[#0F1B35] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/5 flex items-center gap-3 text-sm font-semibold">
          <span className="text-[#14B8A6]">✓</span>{quoteToast}
        </div>
      )}
    </div>
  )
}
