'use client'

/**
 * NAMA OS — Public Proposal View
 * ─────────────────────────────────
 * A beautifully rendered, auth-free itinerary/proposal page
 * that travel agents can share directly with clients via link.
 *
 * URL: /proposal/[id]?token=XXXXXX  (token is optional for demo)
 *
 * In V1 this page:
 * - Fetches the itinerary by ID from the backend (public endpoint)
 * - Falls back to a rich demo proposal if backend is unreachable
 * - Renders a gorgeous branded view with print / WhatsApp / Download actions
 * - No auth required — designed for the client to see
 */

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import {
  MapPin, Calendar, Clock, Download, Share2,
  CheckCircle, Plane, Hotel, Car, Utensils,
  Sparkles, ArrowRight, Zap, Loader,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Block {
  type: string
  title: string
  description?: string
  price_gross?: number
  currency?: string
}
interface Day {
  day_number: number
  title: string
  narrative?: string
  blocks?: Block[]
}
interface Proposal {
  id: number
  title: string
  destination: string
  duration_days: number
  total_price: number
  currency: string
  agent_reasoning?: string
  days: Day[]
  agency_name?: string
  created_at?: string
}

// ── Demo Proposal ──────────────────────────────────────────────────────────────
const DEMO_PROPOSAL: Proposal = {
  id: 1,
  title: '7-Day Maldives Luxury Escape',
  destination: 'Maldives',
  duration_days: 7,
  total_price: 504000,
  currency: 'INR',
  agency_name: 'NAMA Travel',
  created_at: new Date().toISOString(),
  agent_reasoning: 'Tailored exclusively for you — a honeymoon couple seeking luxury experiences. We selected overwater bungalows with direct ocean access, private dining on the sandbank, and curated sunset experiences.',
  days: [
    { day_number: 1, title: 'Arrival & Welcome in Paradise', narrative: 'Private seaplane transfer from Malé International Airport to your resort. Champagne check-in and sunset welcome dinner.', blocks: [
      { type: 'FLIGHT',   title: 'IndiGo 6E-501 BOM → MLE', description: 'Economy class. Check-in 3 hrs early.', price_gross: 32000, currency: 'INR' },
      { type: 'TRANSFER', title: 'Seaplane Transfer', description: 'Trans Maldivian Airways — 25 min scenic flight to resort island.', price_gross: 18000, currency: 'INR' },
      { type: 'HOTEL',    title: 'Overwater Bungalow — Niyama Private Islands', description: 'King bedroom, private deck, direct ocean access. Breakfast included.', price_gross: 45000, currency: 'INR' },
    ]},
    { day_number: 2, title: 'Reef Snorkel & Couples Spa', narrative: 'Morning guided snorkel on the house reef with a marine biologist. Afternoon couples spa followed by a candlelight dinner on the private sandbank.', blocks: [
      { type: 'ACTIVITY', title: 'House Reef Guided Snorkel', description: '2-hr guided snorkel with marine biologist. Equipment included.', price_gross: 6000, currency: 'INR' },
      { type: 'ACTIVITY', title: 'Couples Spa — 90 min', description: 'Balinese massage + hot stone therapy with ocean views.', price_gross: 14000, currency: 'INR' },
      { type: 'MEAL',     title: 'Sandbank Dinner', description: 'Private 5-course dinner on a secluded sandbank. Butler service.', price_gross: 22000, currency: 'INR' },
    ]},
    { day_number: 3, title: 'Scuba Diving & Sunset Cruise', narrative: 'Introduction to scuba diving in crystal-clear waters, followed by a sunset dolphin cruise as the Indian Ocean turns gold.', blocks: [
      { type: 'ACTIVITY', title: 'Intro Scuba Dive', description: 'PADI certified instructor. 40-min dive to 6m depth with reef fish.', price_gross: 9500, currency: 'INR' },
      { type: 'ACTIVITY', title: 'Sunset Dolphin Cruise', description: '90-min dhoni cruise. Dolphins sighted 95% of evenings.', price_gross: 8000, currency: 'INR' },
    ]},
    { day_number: 7, title: 'Farewell & Departure', narrative: 'Final morning at your leisure. Seaplane back to Malé, connection to your return flight home.', blocks: [
      { type: 'TRANSFER', title: 'Seaplane Return — Resort to Malé', description: 'Morning departure. Scenic return flight.', price_gross: 18000, currency: 'INR' },
      { type: 'FLIGHT',   title: 'Return Flight MLE → BOM', description: 'IndiGo direct overnight service.', price_gross: 32000, currency: 'INR' },
    ]},
  ],
}

// ── Utilities ──────────────────────────────────────────────────────────────────
const fmt = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

const BLOCK_STYLES: Record<string, { bg: string; text: string; icon: React.FC<any> }> = {
  FLIGHT:   { bg: 'bg-blue-50',   text: 'text-blue-700',   icon: Plane },
  HOTEL:    { bg: 'bg-amber-50',  text: 'text-amber-700',  icon: Hotel },
  TRANSFER: { bg: 'bg-purple-50', text: 'text-purple-700', icon: Car },
  ACTIVITY: { bg: 'bg-green-50',  text: 'text-green-700',  icon: CheckCircle },
  MEAL:     { bg: 'bg-pink-50',   text: 'text-pink-700',   icon: Utensils },
}

// ── Main Component ─────────────────────────────────────────────────────────────
function ProposalPageInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = params?.id as string
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [shareToast, setShareToast] = useState<string | null>(null)
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api'
        const res = await fetch(`${apiBase}/v1/itineraries/${id}/public`)
        if (!res.ok) throw new Error('not found')
        const data = await res.json()
        setProposal({
          ...data,
          days: data.days_json || data.days || [],
        })
      } catch {
        // Fall back to demo proposal for any ID
        setProposal(DEMO_PROPOSAL)
      } finally {
        setLoading(false)
      }
    }
    if (id) fetchProposal()
    else { setProposal(DEMO_PROPOSAL); setLoading(false) }
  }, [id])

  const handlePrint = () => {
    window.print()
    setPrinted(true)
    setTimeout(() => setPrinted(false), 3000)
  }

  const handleWhatsApp = () => {
    if (!proposal) return
    const text = `✈️ *${proposal.title}*\n\n📍 ${proposal.destination} · ${proposal.duration_days} days\n💰 ${fmt(proposal.total_price, proposal.currency)}\n\nYour personalised itinerary is ready — please reply YES to confirm your booking!\n\n_${proposal.agency_name || 'NAMA Travel'} · Powered by NAMA OS_`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    setShareToast('WhatsApp opened!')
    setTimeout(() => setShareToast(null), 2500)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    setShareToast('Link copied to clipboard!')
    setTimeout(() => setShareToast(null), 2500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader size={32} className="animate-spin text-[#14B8A6] mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Loading your proposal...</p>
        </div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Proposal not found</h2>
          <p className="text-slate-500 text-sm">This proposal may have expired or the link is incorrect.</p>
          <Link href="/" className="mt-6 inline-flex items-center gap-2 bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-600 transition-all">
            Visit NAMA <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-full { max-width: 100% !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
        {/* Header */}
        <div className="no-print sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-white/5">
          <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
              <span className="text-white font-black text-sm">{proposal.agency_name || 'NAMA Travel'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleCopyLink} className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1.5">
                <Share2 size={13} /> Copy Link
              </button>
              <button onClick={handleWhatsApp} className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Share2 size={13} /> WhatsApp
              </button>
              <button onClick={handlePrint} className="bg-[#14B8A6] hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                <Download size={13} /> {printed ? 'Printed!' : 'Save PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#0F172A] via-slate-800 to-[#0F172A] py-16 px-4 print-full">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
              <Sparkles size={12} fill="currentColor" /> Personalised Travel Proposal
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
              {proposal.title}
            </h1>
            <div className="flex flex-wrap items-center gap-6 text-slate-300 text-sm font-medium mb-8">
              <span className="flex items-center gap-2"><MapPin size={15} className="text-[#14B8A6]" />{proposal.destination}</span>
              <span className="flex items-center gap-2"><Calendar size={15} className="text-[#14B8A6]" />{proposal.duration_days} days</span>
              <span className="flex items-center gap-2"><Clock size={15} className="text-[#14B8A6]" />Valid for 7 days</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 inline-block">
              <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Package Value</div>
              <div className="text-4xl font-black text-[#14B8A6]">{fmt(proposal.total_price, proposal.currency)}</div>
              <div className="text-slate-500 text-xs mt-1">Includes all taxes, transfers and listed activities</div>
            </div>
          </div>
        </div>

        {/* Agent Note */}
        {proposal.agent_reasoning && (
          <div className="bg-slate-800/50 border-b border-white/5 py-8 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="text-xs font-bold text-[#14B8A6] uppercase tracking-widest mb-2">A note from your travel expert</div>
              <p className="text-slate-300 text-sm leading-relaxed">{proposal.agent_reasoning}</p>
            </div>
          </div>
        )}

        {/* Itinerary Days */}
        <div className="px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-6">
            {proposal.days.map((day) => (
              <div key={day.day_number} className="bg-white rounded-2xl overflow-hidden shadow-lg">
                <div className="bg-[#0F172A] px-6 py-4">
                  <div className="text-[#14B8A6] text-xs font-black uppercase tracking-widest mb-1">Day {day.day_number}</div>
                  <h3 className="text-white font-bold text-lg leading-tight">{day.title}</h3>
                  {day.narrative && <p className="text-slate-400 text-sm mt-2 leading-relaxed">{day.narrative}</p>}
                </div>
                {(day.blocks || []).length > 0 && (
                  <div className="divide-y divide-slate-50">
                    {(day.blocks || []).map((block, bi) => {
                      const style = BLOCK_STYLES[block.type] || BLOCK_STYLES.ACTIVITY
                      const Icon = style.icon
                      return (
                        <div key={bi} className="flex items-start gap-4 px-6 py-4">
                          <div className={`w-9 h-9 ${style.bg} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon size={16} className={style.text} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 text-sm">{block.title}</div>
                            {block.description && <div className="text-slate-500 text-xs mt-0.5 leading-relaxed">{block.description}</div>}
                          </div>
                          {block.price_gross && (
                            <div className="text-right flex-shrink-0">
                              <div className="font-bold text-sm text-slate-800">{fmt(block.price_gross, block.currency || proposal.currency)}</div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Footer */}
        <div className="no-print bg-gradient-to-r from-[#14B8A6] to-teal-500 px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-black text-white mb-2">Ready to go?</h2>
            <p className="text-teal-100 text-sm mb-8">Reply YES to your agent on WhatsApp and we'll lock in your booking today.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={handleWhatsApp} className="bg-white text-[#14B8A6] font-black px-8 py-4 rounded-2xl hover:bg-teal-50 transition-all flex items-center justify-center gap-2">
                <Share2 size={18} /> Confirm on WhatsApp
              </button>
              <button onClick={handlePrint} className="bg-teal-700 text-white font-black px-8 py-4 rounded-2xl hover:bg-teal-800 transition-all flex items-center justify-center gap-2">
                <Download size={18} /> Save as PDF
              </button>
            </div>
          </div>
        </div>

        {/* Brand Footer */}
        <div className="bg-slate-900 py-8 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-[#14B8A6] rounded-md flex items-center justify-center font-black text-[#0F172A] text-xs">N</div>
            <span className="text-slate-400 text-xs font-bold">Powered by NAMA OS</span>
          </div>
          <p className="text-slate-600 text-xs">AI-native Travel CRM · getnama.app</p>
          <div className="mt-4">
            <Link href="/register" className="text-[#14B8A6] text-xs font-bold hover:underline inline-flex items-center gap-1">
              Are you a travel agent? Try NAMA free <ArrowRight size={10} />
            </Link>
          </div>
        </div>
      </div>

      {/* Toast */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold">
          <span className="text-[#14B8A6]">✓</span>
          {shareToast}
        </div>
      )}
    </>
  )
}

export default function ProposalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader size={32} className="animate-spin text-[#14B8A6]" />
      </div>
    }>
      <ProposalPageInner />
    </Suspense>
  )
}
