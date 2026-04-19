'use client'

import React, { useState, useEffect } from 'react'
import { leadsApi, itinerariesApi, quotationsApi, paymentsApi, Lead, ItineraryOut, Quotation } from '@/lib/api'
import {
  FileText, Plus, Loader, AlertCircle, CheckCircle,
  Clock, Send, Download, Eye, X, ChevronRight,
  Sparkles, DollarSign, Share2, TrendingUp, TrendingDown,
  Minus, BarChart3, Info, Zap, Copy, CreditCard,
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    'bg-slate-100 text-slate-600',
  SENT:     'bg-blue-50 text-blue-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  EXPIRED:  'bg-amber-50 text-amber-700',
}

// ── Seed quotations (shown when backend empty/unreachable) ────────────────────
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

// ── Smart Pricing Intelligence ─────────────────────────────────────────────────
interface PricingBenchmark {
  destination: string;
  avgMarginPct: number;
  marketLow: number;    // per person in INR
  marketMid: number;
  marketHigh: number;
  demandTrend: 'UP' | 'DOWN' | 'STABLE';
  demandPct: number;
  tip: string;
  segment: string;
}

// ── API-backed pricing benchmarks (replaces static PRICING_BENCHMARKS) ────────
// Loaded once per page mount; used by SmartPricingInsight below.
// The module-level cache is keyed by destination string so each quotation
// expansion triggers one fetch at most.

interface ApiBenchmark {
  destination: string;
  avg_price_per_person: number;
  avg_margin_pct: number;
  count: number;
  min_price: number | null;
  max_price: number | null;
  data_source: 'live' | 'benchmark';
}

// Static fallback used only when the API call itself fails completely
const STATIC_FALLBACK: Record<string, PricingBenchmark> = {
  'Maldives':   { destination: 'Maldives',   avgMarginPct: 22, marketLow: 150000, marketMid: 250000, marketHigh: 500000, demandTrend: 'UP',     demandPct: 34, tip: 'High demand — push margins to 25%+. Overwater villas command premium.', segment: 'LUXURY' },
  'Bali':       { destination: 'Bali',       avgMarginPct: 20, marketLow: 60000,  marketMid: 120000, marketHigh: 220000, demandTrend: 'UP',     demandPct: 18, tip: 'Competitive segment. Differentiate with unique experiences, not just hotels.', segment: 'PREMIUM' },
  'Kenya':      { destination: 'Kenya',      avgMarginPct: 24, marketLow: 200000, marketMid: 350000, marketHigh: 600000, demandTrend: 'UP',     demandPct: 22, tip: 'Safari demand surging. Scarcity of good dates — use urgency in pitch.', segment: 'LUXURY' },
  'Dubai':      { destination: 'Dubai',      avgMarginPct: 16, marketLow: 45000,  marketMid: 90000,  marketHigh: 180000, demandTrend: 'STABLE', demandPct: 2,  tip: 'Price-sensitive segment. Focus on bundled value. Keep margins 15-18%.', segment: 'MID' },
  'Rajasthan':  { destination: 'Rajasthan',  avgMarginPct: 22, marketLow: 25000,  marketMid: 65000,  marketHigh: 150000, demandTrend: 'STABLE', demandPct: -3, tip: 'Heritage segment with loyal customers. Bundle cultural experiences for upsell.', segment: 'MID' },
  'Santorini':  { destination: 'Santorini',  avgMarginPct: 25, marketLow: 120000, marketMid: 200000, marketHigh: 400000, demandTrend: 'UP',     demandPct: 15, tip: 'Europe honeymoon segment growing. High aspirational value — price confidently.', segment: 'LUXURY' },
  'Kedarnath':  { destination: 'Kedarnath',  avgMarginPct: 18, marketLow: 12000,  marketMid: 22000,  marketHigh: 40000,  demandTrend: 'STABLE', demandPct: 5,  tip: 'Pilgrimage segment: value-driven. Reliability and safety are key selling points.', segment: 'BUDGET' },
  'Leh Ladakh': { destination: 'Leh Ladakh', avgMarginPct: 20, marketLow: 20000,  marketMid: 38000,  marketHigh: 75000,  demandTrend: 'DOWN',   demandPct: -8, tip: 'Off-season approaching. Offer early-booking discounts. Adventure differentiates.', segment: 'MID' },
};

const DEFAULT_BENCHMARK: PricingBenchmark = {
  destination: 'General', avgMarginPct: 20, marketLow: 50000, marketMid: 120000, marketHigh: 250000,
  demandTrend: 'STABLE', demandPct: 0, tip: 'Set margins 18-22% for most destinations. Higher for luxury, lower for budget.', segment: 'MID',
};

/** Static-only lookup — used for portfolio-level calculations where we don't have API data yet */
function getPricingBenchmark(destination: string): PricingBenchmark {
  const key = Object.keys(STATIC_FALLBACK).find(k =>
    destination?.toLowerCase().includes(k.toLowerCase())
  );
  return key ? STATIC_FALLBACK[key] : { ...DEFAULT_BENCHMARK, destination: destination || 'General' };
}

/** Convert an API benchmark row into the UI's PricingBenchmark shape */
function apiBenchmarkToUI(api: ApiBenchmark): PricingBenchmark & { dataSource: 'live' | 'benchmark' } {
  const avgPrice = api.avg_price_per_person;
  // Derive rough market range from the avg price
  const marketLow  = api.min_price ?? Math.round(avgPrice * 0.6);
  const marketMid  = Math.round(avgPrice);
  const marketHigh = api.max_price ?? Math.round(avgPrice * 1.6);
  // Find the static fallback for demand signal (not in DB aggregates)
  const staticKey = Object.keys(STATIC_FALLBACK).find(k =>
    api.destination.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(api.destination.toLowerCase())
  );
  const staticFb = staticKey ? STATIC_FALLBACK[staticKey] : DEFAULT_BENCHMARK;
  return {
    destination:  api.destination,
    avgMarginPct: api.avg_margin_pct,
    marketLow,
    marketMid,
    marketHigh,
    demandTrend:  staticFb.demandTrend,
    demandPct:    staticFb.demandPct,
    tip:          api.data_source === 'live'
      ? `Based on ${api.count} real itinerary${api.count !== 1 ? 'ies' : 'y'} — avg ₹${Math.round(avgPrice/1000)}K/person, ${api.avg_margin_pct}% margin.`
      : staticFb.tip,
    segment:      staticFb.segment,
    dataSource:   api.data_source,
  };
}

function MarginHealthBar({ actual, benchmark }: { actual: number; benchmark: number }) {
  const diff = actual - benchmark;
  const pct = Math.min(100, Math.max(0, (actual / 35) * 100));
  const color = actual >= benchmark + 2 ? 'bg-green-500' : actual >= benchmark - 2 ? 'bg-[#14B8A6]' : actual >= benchmark - 5 ? 'bg-amber-400' : 'bg-red-400';
  const label = actual >= benchmark + 2 ? 'Above Market ↑' : actual >= benchmark - 2 ? 'On Target ✓' : actual >= benchmark - 5 ? 'Below Market ↓' : 'Underpriced ⚠';
  const labelColor = actual >= benchmark + 2 ? 'text-green-700' : actual >= benchmark - 2 ? 'text-[#14B8A6]' : actual >= benchmark - 5 ? 'text-amber-700' : 'text-red-600';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-bold ${labelColor}`}>{label}</span>
        <span className="text-slate-400">{diff >= 0 ? '+' : ''}{diff.toFixed(1)}% vs benchmark ({benchmark}%)</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SmartPricingInsight({ q, bench }: { q: Quotation; bench: (PricingBenchmark & { dataSource?: 'live' | 'benchmark' }) | null }) {
  const resolvedBench = bench ?? { ...DEFAULT_BENCHMARK, destination: q.destination || 'General', dataSource: 'benchmark' as const };
  const perPax = q.base_price; // treat base_price as cost
  const trend = resolvedBench.demandTrend;
  const TrendIcon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus;
  const trendColor = trend === 'UP' ? 'text-green-600' : trend === 'DOWN' ? 'text-red-500' : 'text-slate-500';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataSource = (resolvedBench as any).dataSource ?? 'benchmark';

  const pricePosition =
    perPax < resolvedBench.marketLow ? 'LOW' :
    perPax <= resolvedBench.marketMid ? 'MID' :
    perPax <= resolvedBench.marketHigh ? 'HIGH' : 'PREMIUM';

  const positionColors: Record<string, string> = {
    LOW: 'text-amber-700 bg-amber-50', MID: 'text-blue-700 bg-blue-50',
    HIGH: 'text-purple-700 bg-purple-50', PREMIUM: 'text-emerald-700 bg-emerald-50',
  };

  return (
    <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
      <div className="flex items-center gap-2">
        <Zap size={14} className="text-[#14B8A6]" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">Smart Pricing Intelligence</span>
        {/* Live / Estimated indicator */}
        {dataSource === 'live' ? (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Live
          </span>
        ) : (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 inline-block" />
            Est.
          </span>
        )}
      </div>

      {/* Margin Health */}
      <MarginHealthBar actual={q.margin_pct} benchmark={resolvedBench.avgMarginPct} />

      {/* Market Range */}
      <div className="bg-slate-50 rounded-xl p-3">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Market Rate Range — {resolvedBench.destination}</div>
        <div className="flex items-center gap-1 mb-2">
          {['Budget', 'Mid', 'Premium'].map((tier, i) => {
            const val = [resolvedBench.marketLow, resolvedBench.marketMid, resolvedBench.marketHigh][i];
            const isActive = (i === 0 && pricePosition === 'LOW') || (i === 1 && pricePosition === 'MID') || (i === 2 && (pricePosition === 'HIGH' || pricePosition === 'PREMIUM'));
            return (
              <div key={tier} className={`flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold ${isActive ? 'bg-[#14B8A6] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                <div>{tier}</div>
                <div>₹{(val/1000).toFixed(0)}k</div>
              </div>
            );
          })}
        </div>
        <div className={`text-center text-[11px] font-bold px-2 py-1 rounded-lg ${positionColors[pricePosition]}`}>
          Your base price is in the <strong>{pricePosition}</strong> range
        </div>
      </div>

      {/* Demand Signal */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 px-3 py-2.5">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Network Demand Signal</div>
          <div className="font-bold text-sm text-slate-800 mt-0.5">{resolvedBench.destination}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <TrendIcon size={16} className={trendColor} />
          <span className={`text-sm font-black ${trendColor}`}>
            {resolvedBench.demandPct > 0 ? '+' : ''}{resolvedBench.demandPct}%
          </span>
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 bg-[#14B8A6]/5 border border-[#14B8A6]/20 rounded-xl p-3">
        <Info size={13} className="text-[#14B8A6] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">{resolvedBench.tip}</p>
      </div>

      {/* Recommended price */}
      {q.margin_pct < resolvedBench.avgMarginPct - 2 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <div className="text-xs font-bold text-amber-800 mb-1">Pricing Opportunity</div>
          <p className="text-xs text-amber-700">
            At {resolvedBench.avgMarginPct}% (benchmark), your total price would be{' '}
            <strong>₹{Math.round(q.base_price * (1 + resolvedBench.avgMarginPct / 100)).toLocaleString('en-IN')}</strong>{' '}
            — an extra <strong>₹{Math.round(q.base_price * (resolvedBench.avgMarginPct - q.margin_pct) / 100).toLocaleString('en-IN')}</strong> in margin.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Payment Link Modal ─────────────────────────────────────────────────────────
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
        quotation_id: quotation.id,
        amount,
        description: `Deposit for ${quotation.destination || 'travel package'} — ${quotation.lead_name || `Quote #${quotation.id}`}`,
        currency: quotation.currency || 'INR',
      })
      setResult(data)
    } catch (err: any) {
      setResult(null)
      alert(err.message || 'Failed to generate payment link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    if (result?.payment_link_url) {
      navigator.clipboard.writeText(result.payment_link_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsApp = () => {
    if (!result?.payment_link_url) return
    const amtFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: quotation.currency || 'INR', maximumFractionDigits: 0 }).format(amount)
    const text = `Hi ${quotation.lead_name?.split(' ')[0] || 'there'}! To confirm your ${quotation.destination} booking, please pay the deposit of ${amtFormatted} via this secure link:\n\n${result.payment_link_url}\n\n_Sent via NAMA OS_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[28px] p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#0F172A]">Collect Deposit</h2>
            <p className="text-xs text-slate-400 mt-0.5">Generate a Razorpay payment link</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Quotation info */}
        <div className="bg-slate-50 rounded-xl p-3 mb-5 text-xs text-slate-500">
          <span className="font-bold text-slate-700">{quotation.lead_name}</span>
          {' · '}
          {quotation.destination}
          {' · '}
          Total: {quotation.currency} {quotation.total_price.toLocaleString('en-IN')}
        </div>

        {!result ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Deposit Amount ({quotation.currency})
                <span className="text-slate-400 font-normal ml-1">— default 25%</span>
              </label>
              <input
                type="number"
                min={1}
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm font-bold"
              />
              <div className="flex gap-2 mt-2">
                {[10, 25, 50].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setAmount(Math.round(quotation.total_price * pct / 100))}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      amount === Math.round(quotation.total_price * pct / 100)
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading || amount <= 0}
              className="w-full py-3.5 bg-[#00236f] hover:bg-slate-800 text-white rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? <><Loader size={14} className="animate-spin" /> Generating...</> : <><CreditCard size={14} /> Generate Link</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                <CheckCircle size={16} />
                Payment link ready!
              </div>
              <div className="text-xs text-emerald-600 font-mono break-all bg-white rounded-lg px-3 py-2 border border-emerald-100">
                {result.payment_link_url}
              </div>
              {result.demo && (
                <div className="mt-2 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
                  Demo mode — add RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET in Railway to activate live links
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 py-3 rounded-xl font-bold text-xs transition-colors"
              >
                <Copy size={13} />
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 py-3 rounded-xl font-bold text-xs transition-colors"
              >
                <Share2 size={13} /> WhatsApp
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function QuotationCard({ q, onView }: { q: Quotation; onView: (q: Quotation) => void }) {
  return (
    <div
      className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-[#14B8A6]/40 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onView(q)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-bold text-slate-900">{q.lead_name || `Quote #${String(q.id).slice(-6)}`}</div>
          <div className="text-xs text-slate-400 mt-0.5">{q.destination || 'Destination TBD'}</div>
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
  const [error, setError] = useState<string | null>(null)
  const [quoteToast, setQuoteToast] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  // Pricing benchmarks — keyed by destination string, populated from API
  const [pricingBenchmarks, setPricingBenchmarks] = useState<Record<string, PricingBenchmark & { dataSource: 'live' | 'benchmark' }>>({})
  const benchmarkFetchedRef = React.useRef<Set<string>>(new Set())

  // New quote form
  const [form, setForm] = useState({
    lead_id: '', itinerary_id: '', lead_name: '', destination: '',
    base_price: '0', margin_pct: '20', notes: '',
  })
  const [creating, setCreating] = useState(false)

  // Payment link modal state
  const [paymentModal, setPaymentModal] = useState<{ quotation: Quotation } | null>(null)

  // Send-to-client modal state
  const [sendModal, setSendModal] = useState<{ quote: Quotation; email: string } | null>(null)
  const [sendMessage, setSendMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => { loadData() }, [])

  // Fetch pricing benchmark when a quote is opened (one call per destination)
  useEffect(() => {
    if (!selectedQuote?.destination) return
    const dest = selectedQuote.destination
    if (benchmarkFetchedRef.current.has(dest)) return
    benchmarkFetchedRef.current.add(dest)
    const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    fetch(`/api/v1/analytics/pricing-benchmarks?destination=${encodeURIComponent(dest)}`, { headers })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null)
      .then((rows: ApiBenchmark[] | null) => {
        if (!rows || rows.length === 0) return
        const apiRow = rows[0]
        setPricingBenchmarks(prev => ({
          ...prev,
          [dest]: apiBenchmarkToUI(apiRow),
        }))
      })
  }, [selectedQuote?.destination]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setLoading(true)
    setError(null)
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
    } catch (e) {
      setQuotations(SEED_QUOTATIONS)
    } finally {
      setLoading(false)
    }
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
    } catch (e: any) {
      setError(e.message || 'Failed to create quotation')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (id: number, newStatus: Quotation['status']) => {
    try {
      let updated: Quotation
      if (newStatus === 'SENT') {
        updated = await quotationsApi.send(id)
      } else {
        updated = await quotationsApi.update(id, { status: newStatus })
      }
      setQuotations(quotations.map(q => q.id === id ? updated : q))
      if (selectedQuote?.id === id) setSelectedQuote(updated)
    } catch (e: any) {
      setError(e.message || 'Status update failed')
    }
  }

  const handleExportQuotePDF = async (q: Quotation) => {
    setPdfLoading(true);
    try {
      const res = await fetch('/api/v1/documents/quotation-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotation_id: q.id }),
      });
      if (!res.ok) throw new Error('PDF generation failed');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `quotation_${q.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setQuoteToast('PDF downloaded successfully');
      setTimeout(() => setQuoteToast(null), 3000);
    } catch {
      setQuoteToast('PDF download failed — try again');
      setTimeout(() => setQuoteToast(null), 3000);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendQuote = async () => {
    if (!sendModal) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/v1/documents/send-quotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotation_id: sendModal.quote.id,
          client_email: sendModal.email,
          message: sendMessage || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult({ ok: true, text: `Quote sent to ${sendModal.email} ✓` });
        setTimeout(() => { setSendModal(null); setSendMessage(''); setSendResult(null); }, 2500);
      } else {
        setSendResult({ ok: false, text: data.error || 'Send failed' });
      }
    } catch {
      setSendResult({ ok: false, text: 'Network error — please try again' });
    } finally {
      setSending(false);
    }
  };

  const handleShareQuoteWhatsApp = (q: Quotation) => {
    const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: q.currency || 'INR', maximumFractionDigits: 0 }).format(q.total_price);
    const text = `✈️ *Travel Quotation — ${q.destination}*\n\nDear ${q.lead_name || 'Valued Guest'},\n\nYour personalised travel quotation is ready.\n\n📍 Destination: *${q.destination}*\n💰 Total Package: *${totalFormatted}*\n📅 Validity: 7 days from today\n\nPlease reply *YES* to confirm and we'll begin your booking.\n\n_Sent via NAMA OS · getnama.app_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setQuoteToast('WhatsApp opened with your quotation!');
    setTimeout(() => setQuoteToast(null), 3000);
  };

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

      {/* Portfolio Margin Intelligence */}
      {quotations.length > 0 && (() => {
        const avgMargin = Math.round(quotations.reduce((s, q) => s + (q.margin_pct || 0), 0) / quotations.length);
        const underpriced = quotations.filter(q => {
          const bench = getPricingBenchmark(q.destination || '');
          return q.margin_pct < bench.avgMarginPct - 2;
        });
        const topDest = quotations.reduce((acc, q) => {
          const d = q.destination || 'Other';
          acc[d] = (acc[d] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const topDestName = Object.entries(topDest).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const topBench = topDestName ? getPricingBenchmark(topDestName) : null;
        return (
          <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] rounded-2xl p-5 flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/20 flex items-center justify-center flex-shrink-0">
                <BarChart3 size={18} className="text-[#14B8A6]" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#14B8A6]">Margin Intelligence</div>
                <div className="text-white font-bold text-sm">Portfolio Average: {avgMargin}% margin</div>
              </div>
            </div>
            <div className="h-8 w-px bg-white/10 hidden md:block" />
            {underpriced.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-sm text-amber-300 font-semibold">
                  {underpriced.length} quote{underpriced.length > 1 ? 's' : ''} below benchmark margin
                </span>
              </div>
            )}
            {topBench && topBench.demandTrend === 'UP' && (
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-green-400" />
                <span className="text-sm text-green-300 font-semibold">
                  {topBench.destination} demand +{topBench.demandPct}% — price with confidence
                </span>
              </div>
            )}
            <div className="ml-auto text-[10px] text-slate-500 font-medium hidden xl:block">
              Powered by NAMA Intelligence Network
            </div>
          </div>
        );
      })()}

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
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Client Name *</label>
                  <input type="text" placeholder="e.g. Rahul Sharma" value={form.lead_name} onChange={e => setForm({...form, lead_name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Destination *</label>
                  <input type="text" placeholder="e.g. Bali, 7 Days" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
                </div>
              </div>
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
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Base Price (₹)</label>
                  <input type="number" min="0" value={form.base_price} onChange={e => setForm({...form, base_price: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">Margin %</label>
                  <input type="number" min="0" max="100" value={form.margin_pct} onChange={e => setForm({...form, margin_pct: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm" />
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
                <h2 className="text-xl font-extrabold text-[#0F172A]">{selectedQuote.lead_name || `Quote #${selectedQuote.id}`}</h2>
                <p className="text-sm text-slate-400 mt-0.5">{selectedQuote.destination}</p>
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
                { label: 'Sent', value: selectedQuote.sent_at ? new Date(selectedQuote.sent_at).toLocaleDateString() : '—' },
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

            {/* Smart Pricing Intelligence */}
            <SmartPricingInsight q={selectedQuote} bench={selectedQuote.destination ? (pricingBenchmarks[selectedQuote.destination] ?? null) : null} />

            {/* Export & Share Actions */}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => handleExportQuotePDF(selectedQuote)}
                disabled={pdfLoading}
                className="flex items-center justify-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-3 rounded-xl font-bold text-xs transition-all disabled:opacity-40"
              >
                {pdfLoading ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
                Download PDF
              </button>
              <button
                onClick={() => {
                  setSendModal({ quote: selectedQuote, email: '' });
                  setSendMessage('');
                  setSendResult(null);
                }}
                className="flex items-center justify-center gap-1.5 bg-[#14B8A6]/10 hover:bg-[#14B8A6]/20 text-[#0f766e] px-3 py-3 rounded-xl font-bold text-xs transition-all"
              >
                <Send size={14} /> Send to Client
              </button>
              <button
                onClick={() => setPaymentModal({ quotation: selectedQuote })}
                className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-3 rounded-xl font-bold text-xs transition-all"
              >
                <CreditCard size={14} /> Deposit Link
              </button>
              <button
                onClick={() => handleShareQuoteWhatsApp(selectedQuote)}
                className="flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-3 py-3 rounded-xl font-bold text-xs transition-all"
              >
                <Share2 size={14} /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Send to Client Modal ── */}
      {sendModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSendModal(null)}>
          <div className="bg-white rounded-[28px] p-8 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-extrabold text-[#0F172A]">Send Quote to Client</h2>
              <button onClick={() => setSendModal(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-5 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{sendModal.quote.lead_name}</span>
              {' · '}
              {sendModal.quote.destination}
              {' · '}
              {sendModal.quote.currency} {sendModal.quote.total_price.toLocaleString('en-IN')}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Client Email *</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={sendModal.email}
                  onChange={e => setSendModal({ ...sendModal, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">Personal Message (optional)</label>
                <textarea
                  rows={3}
                  placeholder="Add a note to your client..."
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm resize-none"
                />
              </div>
            </div>

            {sendResult && (
              <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                sendResult.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {sendResult.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                {sendResult.text}
              </div>
            )}

            <button
              onClick={handleSendQuote}
              disabled={sending || !sendModal.email}
              className="mt-5 w-full bg-[#14B8A6] text-white py-3.5 rounded-xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 transition-all disabled:opacity-50"
            >
              {sending ? <><Loader size={14} className="animate-spin" /> Sending...</> : <><Send size={14} /> Send Quote</>}
            </button>
          </div>
        </div>
      )}

      {/* Payment Link Modal */}
      {paymentModal && (
        <PaymentLinkModal
          quotation={paymentModal.quotation}
          onClose={() => setPaymentModal(null)}
        />
      )}

      {/* Toast */}
      {quoteToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold">
          <span className="text-[#14B8A6]">✓</span>
          {quoteToast}
        </div>
      )}
    </div>
  )
}
