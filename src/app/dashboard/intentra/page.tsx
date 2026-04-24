'use client'

/**
 * M20 — Intentra: Intent Intelligence Feed
 * ─────────────────────────────────────────
 * White-label social listening layer for NAMA OS.
 * Monitors Reddit, X/Twitter, Quora, TripAdvisor, Facebook, Instagram
 * for people expressing travel intent matching your destination watchlist.
 * Agents respond directly and one-click convert signals to NAMA leads.
 *
 * Design: Intentra's own dark-gold identity within the NAMA shell.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Radar, RefreshCw, Sparkles, Loader, X, MapPin,
  Plus, Send, ArrowRight, CheckCircle2, Zap,
  Filter, SortAsc, Copy, Check,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
type Source = 'REDDIT' | 'TWITTER' | 'QUORA' | 'TRIPADVISOR' | 'FACEBOOK' | 'INSTAGRAM'
type IntentLevel = 'HIGH' | 'MID' | 'LOW'

interface Signal {
  id: number
  source: Source
  post: string
  username: string
  subreddit?: string
  time: string
  destinations: string[]
  intent: number          // 0-100
  intentLevel: IntentLevel
  isHot: boolean
  saved: boolean
  responded: boolean
  leadConverted: boolean
  upvotes?: number
}

// ── Seed Data ─────────────────────────────────────────────────────────────────
const SEED_SIGNALS: Signal[] = [
  {
    id: 1, source: 'REDDIT',
    post: 'Planning a honeymoon for March — torn between Maldives and Bali. We want an overwater villa, sunset dinners, spa. Budget around ₹3.5L for 7 nights. Any DMC recs?',
    username: 'u/rahul_weds_priya', subreddit: 'r/IndiaTravel', time: '4 min ago',
    destinations: ['Maldives', 'Bali'], intent: 92, intentLevel: 'HIGH', isHot: true,
    saved: false, responded: false, leadConverted: false, upvotes: 14,
  },
  {
    id: 2, source: 'TWITTER',
    post: 'Seriously need a Rajasthan trip this winter. Heritage forts, desert camp, Jaipur & Jodhpur. Group of 6. Anyone used a travel DMC? Looking for ₹60-80K per person all inclusive.',
    username: '@travel_with_mehta', time: '11 min ago',
    destinations: ['Rajasthan'], intent: 88, intentLevel: 'HIGH', isHot: true,
    saved: false, responded: false, leadConverted: false,
  },
  {
    id: 3, source: 'QUORA',
    post: 'What is the best way to book a 10-day Kenya safari for a family of 4? We want luxury lodges, private game drives, and a bush dinner. Flexible budget, preferably mid-October.',
    username: 'Anjali Verma', time: '23 min ago',
    destinations: ['Kenya'], intent: 85, intentLevel: 'HIGH', isHot: true,
    saved: true, responded: false, leadConverted: false,
  },
  {
    id: 4, source: 'REDDIT',
    post: 'Anyone done the Leh-Ladakh bike circuit? Planning for July with 4 friends. Need permits, accommodation, mechanic support, and a good route. Total budget ₹40K per person.',
    username: 'u/biker_nomad_88', subreddit: 'r/biketravel', time: '35 min ago',
    destinations: ['Ladakh'], intent: 78, intentLevel: 'MID', isHot: false,
    saved: false, responded: false, leadConverted: false, upvotes: 32,
  },
  {
    id: 5, source: 'FACEBOOK',
    post: 'Looking for a good travel agent for a Dubai trip in December — family of 5, 5 nights. We want Burj Khalifa, desert safari, and a dhow cruise. What is a reasonable budget?',
    username: 'Kiran Nair', time: '48 min ago',
    destinations: ['Dubai'], intent: 81, intentLevel: 'HIGH', isHot: true,
    saved: false, responded: false, leadConverted: false,
  },
  {
    id: 6, source: 'TRIPADVISOR',
    post: 'Has anyone booked a Kerala backwaters houseboat recently? What is the best season? We are a couple looking for 3 nights, premium houseboat, Alleppey. Any suggestions for cost?',
    username: 'TravellerSuresh', time: '1 hr ago',
    destinations: ['Kerala'], intent: 74, intentLevel: 'MID', isHot: false,
    saved: true, responded: false, leadConverted: false,
  },
  {
    id: 7, source: 'INSTAGRAM',
    post: 'Just saw those Santorini reels and I need this trip NOW 😭 Blue domes, sunset, good wine. Who has done it and how much did it cost from India? Solo traveller, 5-6 nights.',
    username: '@wanderlust_preethi', time: '1 hr ago',
    destinations: ['Santorini', 'Greece'], intent: 71, intentLevel: 'MID', isHot: false,
    saved: false, responded: false, leadConverted: false,
  },
  {
    id: 8, source: 'REDDIT',
    post: 'Best time to visit Bhutan? Thinking of going in April with my parents (senior citizens). Need easy treks, monastery visits, cultural experience. Budget flexible, looking at 7 days.',
    username: 'u/curious_traveller_in', subreddit: 'r/solotravel', time: '2 hrs ago',
    destinations: ['Bhutan'], intent: 68, intentLevel: 'MID', isHot: false,
    saved: false, responded: false, leadConverted: false, upvotes: 7,
  },
  {
    id: 9, source: 'TWITTER',
    post: 'Does anyone know a reliable travel company for Thailand? Phuket + Bangkok + Chiang Mai, 10 days, budget group trip. 8 people, early Feb. Under ₹50K per person ideally.',
    username: '@grouptrip_chronicles', time: '2 hrs ago',
    destinations: ['Thailand'], intent: 76, intentLevel: 'MID', isHot: false,
    saved: false, responded: true, leadConverted: false,
  },
  {
    id: 10, source: 'QUORA',
    post: 'How do I plan a Singapore + Malaysia trip for a family with kids aged 5 and 8? Universal Studios, Genting Highlands, Gardens by the Bay. 8 days total. What should I budget?',
    username: 'Deepak Sharma', time: '3 hrs ago',
    destinations: ['Singapore', 'Malaysia'], intent: 63, intentLevel: 'MID', isHot: false,
    saved: false, responded: false, leadConverted: false,
  },
  {
    id: 11, source: 'FACEBOOK',
    post: 'Vaguely thinking of a Europe trip next summer, maybe Italy and France. Nothing booked yet. Has anyone used a travel agency? What is a realistic budget for 12 days?',
    username: 'Meena Krishnaswamy', time: '4 hrs ago',
    destinations: ['Europe', 'Italy', 'France'], intent: 42, intentLevel: 'LOW', isHot: false,
    saved: false, responded: false, leadConverted: false,
  },
  {
    id: 12, source: 'REDDIT',
    post: 'Just daydreaming about the Amazon rainforest lol. One day maybe.',
    username: 'u/bucket_list_dreamer', subreddit: 'r/travel', time: '5 hrs ago',
    destinations: ['Amazon', 'Brazil'], intent: 18, intentLevel: 'LOW', isHot: false,
    saved: false, responded: false, leadConverted: false, upvotes: 2,
  },
]

const PLATFORMS: { id: Source; label: string; color: string }[] = [
  { id: 'REDDIT',      label: 'Reddit',      color: '#FF6B35' },
  { id: 'TWITTER',     label: 'X / Twitter', color: '#1D9BF0' },
  { id: 'QUORA',       label: 'Quora',       color: '#B52B27' },
  { id: 'TRIPADVISOR', label: 'TripAdvisor', color: '#34A853' },
  { id: 'FACEBOOK',    label: 'Facebook',    color: '#1877F2' },
  { id: 'INSTAGRAM',   label: 'Instagram',   color: '#E1306C' },
]

const SOURCE_COLORS: Record<Source, string> = {
  REDDIT:      'bg-orange-500/10 text-orange-400 border-orange-500/20',
  TWITTER:     'bg-sky-500/10 text-sky-400 border-sky-500/20',
  QUORA:       'bg-red-800/20 text-red-400 border-red-700/20',
  TRIPADVISOR: 'bg-green-500/10 text-green-400 border-green-500/20',
  FACEBOOK:    'bg-blue-600/10 text-blue-400 border-blue-500/20',
  INSTAGRAM:   'bg-pink-500/10 text-pink-400 border-pink-500/20',
}
const SOURCE_LABELS: Record<Source, string> = {
  REDDIT: 'Reddit', TWITTER: 'X / Twitter', QUORA: 'Quora',
  TRIPADVISOR: 'TripAdvisor', FACEBOOK: 'Facebook', INSTAGRAM: 'Instagram',
}

type FilterType = 'all' | 'hot' | 'reddit' | 'twitter' | 'quora' | 'facebook' | 'instagram' | 'saved'
type SortType = 'time' | 'intent' | 'source'

// ── AI response templates by destination ──────────────────────────────────────
function generateAIResponse(signal: Signal): string {
  const dest = signal.destinations[0] || 'your destination'
  const templates = [
    `Hi! Saw your post about ${dest} — this is exactly what we specialise in at NAMA Travel. We've organised over 200 trips to ${dest} this year and can put together a fully customised itinerary with the best properties and experiences. Would love to understand your travel dates and group size better. Can I share a sample itinerary with pricing?`,
    `Your ${dest} plan sounds amazing! We've done dozens of similar trips and can handle everything end-to-end — flights, accommodation, transfers, and curated experiences. Our average quote turnaround is under 2 minutes. Mind if I send across a detailed proposal?`,
    `We specialise in exactly this kind of ${dest} experience. I'd love to share our top recommended packages for your travel style and budget. Can we get on a quick call, or shall I send a personalised itinerary directly?`,
  ]
  return templates[signal.id % templates.length]
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function IntentraPage() {
  const [signals, setSignals]         = useState<Signal[]>(SEED_SIGNALS)
  const [filter, setFilter]           = useState<FilterType>('all')
  const [sort, setSort]               = useState<SortType>('time')
  const [search, setSearch]           = useState('')
  const [activePlatforms, setActivePlatforms] = useState<Set<Source>>(
    new Set(['REDDIT', 'TWITTER', 'QUORA', 'TRIPADVISOR', 'FACEBOOK', 'INSTAGRAM'])
  )
  const [destinations, setDestinations] = useState<string[]>(['Maldives', 'Rajasthan', 'Kerala', 'Dubai', 'Bali'])
  const [destInput, setDestInput]       = useState('')
  const [refreshing, setRefreshing]     = useState(false)
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'info' } | null>(null)
  // Load signals from backend; gracefully falls back to seed data
  useEffect(() => {
    let cancelled = false
    async function fetchSignals() {
      try {
        const res = await fetch('/api/v1/intentra/signals?limit=20', {
          signal: AbortSignal.timeout(5000),
        })
        if (res.ok && !cancelled) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            // Map backend snake_case → frontend camelCase
            const mapped: Signal[] = data.map((s: {
              id: number; source: string; post: string; username: string;
              subreddit?: string; time: string; destinations: string[];
              intent: number; intent_level: string; is_hot: boolean; upvotes?: number;
            }) => ({
              id: s.id, source: s.source as Source, post: s.post,
              username: s.username, subreddit: s.subreddit, time: s.time,
              destinations: s.destinations, intent: s.intent,
              intentLevel: s.intent_level as 'HIGH' | 'MID' | 'LOW',
              isHot: s.is_hot, upvotes: s.upvotes,
              saved: false, responded: false, leadConverted: false,
            }))
            setSignals(mapped)
          }
        }
      } catch { /* silently fall back to seed data */ }
    }
    fetchSignals()
    return () => { cancelled = true }
  }, [])

  // Respond modal
  const [respondTarget, setRespondTarget] = useState<Signal | null>(null)
  const [aiDraft, setAiDraft]             = useState('')
  const [aiGenerating, setAiGenerating]   = useState(false)
  const [copied, setCopied]               = useState(false)
  const [sendLoading, setSendLoading]     = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'info' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Filtering + sorting ──────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = signals.filter(s => activePlatforms.has(s.source))
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        s.post.toLowerCase().includes(q) ||
        s.destinations.some(d => d.toLowerCase().includes(q))
      )
    }
    switch (filter) {
      case 'hot':       list = list.filter(s => s.intentLevel === 'HIGH'); break
      case 'reddit':    list = list.filter(s => s.source === 'REDDIT'); break
      case 'twitter':   list = list.filter(s => s.source === 'TWITTER'); break
      case 'quora':     list = list.filter(s => s.source === 'QUORA'); break
      case 'facebook':  list = list.filter(s => s.source === 'FACEBOOK'); break
      case 'instagram': list = list.filter(s => s.source === 'INSTAGRAM'); break
      case 'saved':     list = list.filter(s => s.saved); break
    }
    if (sort === 'intent') list = [...list].sort((a, b) => b.intent - a.intent)
    else if (sort === 'source') list = [...list].sort((a, b) => a.source.localeCompare(b.source))
    return list
  }, [signals, filter, sort, search, activePlatforms])

  const stats = useMemo(() => ({
    total:     signals.length,
    hot:       signals.filter(s => s.intentLevel === 'HIGH').length,
    converted: signals.filter(s => s.leadConverted).length,
  }), [signals])

  // ── Actions ──────────────────────────────────────────────────────────────────
  const toggleSaved = (id: number) => {
    setSignals(ss => ss.map(s => s.id === id ? { ...s, saved: !s.saved } : s))
    showToast('Signal saved to watchlist', 'info')
  }

  const dismissSignal = (id: number) => {
    setSignals(ss => ss.filter(s => s.id !== id))
  }

  const openRespond = (signal: Signal) => {
    setRespondTarget(signal)
    setAiDraft('')
    setCopied(false)
  }

  const generateDraft = async () => {
    if (!respondTarget) return
    setAiGenerating(true)
    await new Promise(r => setTimeout(r, 1100))
    setAiDraft(generateAIResponse(respondTarget))
    setAiGenerating(false)
  }

  const copyDraft = async () => {
    if (!aiDraft) return
    await navigator.clipboard.writeText(aiDraft).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendResponse = async () => {
    if (!respondTarget || !aiDraft.trim()) return
    setSendLoading(true)
    await new Promise(r => setTimeout(r, 900))
    setSignals(ss => ss.map(s => s.id === respondTarget.id ? { ...s, responded: true } : s))
    setSendLoading(false)
    setRespondTarget(null)
    showToast('Response copied — paste it on the platform', 'success')
  }

  const convertToLead = async (signal: Signal) => {
    // Optimistic UI update first
    setSignals(ss => ss.map(s => s.id === signal.id ? { ...s, leadConverted: true } : s))
    try {
      await fetch('/api/v1/leads/from-intentra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal_id:    signal.id,
          platform:     signal.source,
          username:     signal.username,
          post_excerpt: signal.post,
          destinations: signal.destinations,
          intent_score: signal.intent,
          contact_note: '',
        }),
      })
      showToast('Lead created in NAMA CRM ✓', 'success')
    } catch {
      showToast('Converted locally (backend sync pending)', 'success')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/intentra/signals?limit=20', {
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Signal[] = data.map((s: {
            id: number; source: string; post: string; username: string;
            subreddit?: string; time: string; destinations: string[];
            intent: number; intent_level: string; is_hot: boolean; upvotes?: number;
          }) => ({
            id: s.id, source: s.source as Source, post: s.post,
            username: s.username, subreddit: s.subreddit, time: s.time,
            destinations: s.destinations, intent: s.intent,
            intentLevel: s.intent_level as 'HIGH' | 'MID' | 'LOW',
            isHot: s.is_hot, upvotes: s.upvotes,
            saved: false, responded: false, leadConverted: false,
          }))
          setSignals(mapped)
          showToast(`${data.length} intent signals loaded`, 'info')
        } else {
          showToast('No new signals found', 'info')
        }
      } else {
        showToast('Refresh failed — using cached data', 'info')
      }
    } catch {
      showToast('Cannot reach backend — using cached signals', 'info')
    } finally {
      setRefreshing(false)
    }
  }

  const addDestination = () => {
    const d = destInput.trim()
    if (d && !destinations.includes(d)) {
      setDestinations(dd => [...dd, d])
      setDestInput('')
      showToast(`Scanning for "${d}" intent`, 'info')
    }
  }

  const togglePlatform = (platform: Source) => {
    setActivePlatforms(prev => {
      const next = new Set(prev)
      if (next.has(platform)) next.delete(platform)
      else next.add(platform)
      return next
    })
  }

  const intentColor = (level: IntentLevel) => {
    if (level === 'HIGH') return { bar: '#1D9E75', text: 'text-emerald-400' }
    if (level === 'MID')  return { bar: '#EF9F27', text: 'text-amber-400' }
    return { bar: '#4B5563', text: 'text-slate-500' }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F0E8] font-sans -m-4 md:-m-6 lg:-m-8">

      {/* ── TOPBAR ────────────────────────────────────────────────────────────── */}
      <div className="h-14 bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-white/5 flex items-center px-6 sticky top-0 z-40 gap-3">
        <div className="flex items-center gap-2 text-xs text-[#6E685E]">
          <span>NAMA OS</span>
          <span className="opacity-40">›</span>
          <span>Intelligence</span>
          <span className="opacity-40">›</span>
          <span className="text-[#C9A84C] font-medium">Intentra</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#6E685E]">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)] animate-pulse" />
            Scanning live
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C9A84C]/20 rounded-full text-[#D4CFC6] text-xs hover:bg-[#C9A84C]/10 hover:text-[#C9A84C] hover:border-[#C9A84C] transition-all"
          >
            <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] rounded-full text-[#0A0A0A] text-xs font-semibold hover:bg-[#E0C06A] transition-all">
            <Radar size={11} /> New Scan
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1300px]">

        {/* ── HERO STRIP ──────────────────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-r from-[#1A1A1A] to-[#1A1500] border border-[#C9A84C]/20 rounded-2xl p-6 flex items-center gap-5 mb-6 overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-[#C9A84C]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="w-12 h-12 flex-shrink-0 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-xl flex items-center justify-center">
            <Radar size={22} className="text-[#C9A84C]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white tracking-tight">Intentra — Intent Intelligence</h1>
            <p className="text-xs text-[#6E685E] mt-1 leading-relaxed">
              Surfaces people expressing travel intent across Reddit, X, Quora, TripAdvisor & more for your destinations.
              Respond directly and convert them into NAMA leads in one click.
            </p>
          </div>
          <div className="flex gap-8 flex-shrink-0">
            {[
              { n: stats.total,     label: 'Signals today' },
              { n: stats.hot,       label: 'High intent' },
              { n: stats.converted, label: 'Converted' },
            ].map(({ n, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-[#C9A84C] font-mono">{n}</div>
                <div className="text-[10px] text-[#6E685E] mt-0.5 whitespace-nowrap">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CONTROLS ────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1A1A1A] border border-white/6 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Filter size={13} className="text-[#6E685E]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search signals by destination, keyword…"
              className="bg-transparent border-none outline-none text-sm text-[#F5F0E8] placeholder-[#6E685E] flex-1 min-w-0"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { id: 'all', label: 'All' },
              { id: 'hot', label: '🔥 High intent' },
              { id: 'reddit', label: 'Reddit' },
              { id: 'twitter', label: 'X / Twitter' },
              { id: 'quora', label: 'Quora' },
              { id: 'saved', label: 'Saved' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as FilterType)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                  filter === f.id
                    ? 'bg-[#C9A84C]/12 border-[#C9A84C]/40 text-[#C9A84C]'
                    : 'border-white/8 text-[#6E685E] hover:border-white/15 hover:text-[#D4CFC6]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative">
            <SortAsc size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E685E] pointer-events-none" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortType)}
              className="bg-[#1A1A1A] border border-white/8 rounded-lg text-xs text-[#D4CFC6] pl-7 pr-3 py-2 outline-none cursor-pointer appearance-none"
            >
              <option value="time">Latest first</option>
              <option value="intent">Intent score</option>
              <option value="source">Source</option>
            </select>
          </div>
        </div>

        {/* ── TWO-COL LAYOUT ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">

          {/* ── FEED ────────────────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#D4CFC6]">
                Intent Feed
                <span className="text-[10px] text-[#6E685E] bg-[#242424] px-2 py-0.5 rounded-full">
                  {displayed.length} signals
                </span>
              </div>
              <button onClick={handleRefresh} className="flex items-center gap-1.5 text-xs text-[#6E685E] hover:text-[#C9A84C] transition-colors bg-transparent border-none cursor-pointer">
                <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="space-y-2.5">
              {displayed.length === 0 && (
                <div className="text-center py-16 border border-dashed border-white/8 rounded-2xl">
                  <div className="text-3xl mb-3 opacity-30">📡</div>
                  <p className="text-sm font-semibold text-[#D4CFC6]">No signals found</p>
                  <p className="text-xs text-[#6E685E] mt-1">Try adjusting filters or add more destinations</p>
                </div>
              )}
              {displayed.map(signal => {
                const ic = intentColor(signal.intentLevel)
                return (
                  <div
                    key={signal.id}
                    className={`relative bg-[#111111] border rounded-2xl p-4 transition-all group cursor-pointer
                      ${signal.isHot
                        ? 'border-red-500/20 hover:border-red-400/30'
                        : 'border-white/6 hover:border-[#C9A84C]/25 hover:bg-[#1A1A1A]'
                      }`}
                  >
                    {/* hot left bar */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-2xl transition-all ${
                      signal.isHot ? 'bg-red-500' : 'bg-transparent group-hover:bg-[#C9A84C]'
                    }`} />

                    {/* Top row */}
                    <div className="flex items-start gap-3 mb-2.5 pl-1">
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium border ${SOURCE_COLORS[signal.source]}`}>
                        {SOURCE_LABELS[signal.source]}
                        {signal.subreddit && <span className="ml-1 opacity-60">{signal.subreddit}</span>}
                      </span>
                      {signal.isHot && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                          🔥 Hot
                        </span>
                      )}
                      {signal.responded && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold ml-auto">
                          <CheckCircle2 size={9} /> Responded
                        </span>
                      )}
                      {signal.leadConverted && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/20 text-[10px] font-semibold ml-auto">
                          <Zap size={9} fill="currentColor" /> Lead created
                        </span>
                      )}
                    </div>

                    {/* Post text */}
                    <p className="text-sm text-[#F5F0E8] leading-relaxed mb-2.5 pl-1">{signal.post}</p>

                    {/* Meta + tags */}
                    <div className="flex items-center gap-3 mb-3 pl-1">
                      <span className="text-[11px] text-[#6E685E]">{signal.username}</span>
                      <span className="text-[11px] text-[#6E685E]">{signal.time}</span>
                      {signal.upvotes !== undefined && (
                        <span className="text-[11px] text-[#6E685E]">↑ {signal.upvotes}</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-wrap pl-1 mb-3">
                      {signal.destinations.map(d => (
                        <span key={d} className="text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C]/8 text-[#C9A84C] border border-[#C9A84C]/20 font-medium">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Bottom row: intent + actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-white/5 pl-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#6E685E] uppercase tracking-wider">Intent</span>
                        <div className="w-14 h-1 bg-[#242424] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${signal.intent}%`, background: ic.bar }} />
                        </div>
                        <span className={`text-xs font-medium ${ic.text}`}>{signal.intent}%</span>
                      </div>
                      <div className="flex gap-1.5">
                        {!signal.leadConverted && (
                          <button
                            onClick={() => convertToLead(signal)}
                            className="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-[#C9A84C]/8 border border-[#C9A84C]/25 text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all"
                          >
                            + Lead
                          </button>
                        )}
                        <button
                          onClick={() => openRespond(signal)}
                          className="px-2.5 py-1 text-[10px] font-semibold rounded-md bg-[#C9A84C] border border-[#C9A84C] text-[#0A0A0A] hover:bg-[#E0C06A] transition-all"
                        >
                          Respond
                        </button>
                        <button
                          onClick={() => toggleSaved(signal.id)}
                          className={`px-2.5 py-1 text-[10px] font-semibold rounded-md border transition-all
                            ${signal.saved
                              ? 'bg-[#C9A84C]/12 border-[#C9A84C]/30 text-[#C9A84C]'
                              : 'bg-transparent border-white/8 text-[#6E685E] hover:border-white/15 hover:text-[#D4CFC6]'
                            }`}
                        >
                          {signal.saved ? '★' : '☆'}
                        </button>
                        <button
                          onClick={() => dismissSignal(signal.id)}
                          className="px-2.5 py-1 text-[10px] rounded-md border border-white/8 text-[#6E685E] hover:border-red-500/30 hover:text-red-400 transition-all"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
          <div className="space-y-4 xl:sticky xl:top-20">

            {/* Destinations watchlist */}
            <div className="bg-[#111111] border border-white/6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-semibold text-[#D4CFC6] flex items-center gap-2">
                  <MapPin size={13} className="text-[#C9A84C]" /> Your Destinations
                </span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={destInput}
                    onChange={e => setDestInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDestination()}
                    placeholder="Add destination…"
                    className="flex-1 bg-[#1A1A1A] border border-white/8 rounded-lg text-sm text-[#F5F0E8] placeholder-[#6E685E] px-3 py-2 outline-none focus:border-[#C9A84C]/50 transition-colors"
                  />
                  <button
                    onClick={addDestination}
                    className="bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[#C9A84C] px-3 py-2 rounded-lg text-sm hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {destinations.map(d => (
                    <span key={d} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A84C]/8 border border-[#C9A84C]/20 text-[#C9A84C] text-xs">
                      {d}
                      <button
                        onClick={() => setDestinations(dd => dd.filter(x => x !== d))}
                        className="opacity-50 hover:opacity-100 transition-opacity leading-none"
                      >×</button>
                    </span>
                  ))}
                </div>
                <button
                  onClick={handleRefresh}
                  className="w-full py-2.5 bg-[#C9A84C] border-none rounded-lg text-[#0A0A0A] text-sm font-bold hover:bg-[#E0C06A] transition-all flex items-center justify-center gap-2"
                >
                  {refreshing ? <Loader size={14} className="animate-spin" /> : <Radar size={14} />}
                  {refreshing ? 'Scanning…' : 'Scan All Platforms'}
                </button>
              </div>
            </div>

            {/* Platform toggles */}
            <div className="bg-[#111111] border border-white/6 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <span className="text-sm font-semibold text-[#D4CFC6]">Active Platforms</span>
                <span className="text-[10px] text-[#6E685E]">{activePlatforms.size} / {PLATFORMS.length}</span>
              </div>
              <div className="p-3 grid grid-cols-2 gap-2">
                {PLATFORMS.map(p => {
                  const on = activePlatforms.has(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                        on
                          ? 'bg-[#242424] border-white/10'
                          : 'bg-[#1A1A1A] border-white/5 opacity-50'
                      }`}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0 transition-colors"
                        style={{ background: on ? p.color : '#4B5563' }}
                      />
                      <span className={`text-xs ${on ? 'text-[#F5F0E8]' : 'text-[#6E685E]'}`}>{p.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick stats */}
            <div className="bg-[#111111] border border-white/6 rounded-2xl p-4">
              <p className="text-xs font-semibold text-[#D4CFC6] mb-3">Today&apos;s Performance</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Total signals scanned', value: 47, color: '#C9A84C' },
                  { label: 'High intent (>80%)',     value: 12, color: '#1D9E75' },
                  { label: 'Responses sent',         value: 4,  color: '#1D9BF0' },
                  { label: 'Leads created',          value: stats.converted + 3, color: '#EF9F27' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-[#6E685E]">{item.label}</span>
                    <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── AI RESPOND MODAL ──────────────────────────────────────────────────── */}
      {respondTarget && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#C9A84C]/25 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-[slide-in_0.2s_ease]">
            {/* Modal head */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
              <div className="w-9 h-9 rounded-xl bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0">
                <Sparkles size={16} className="text-[#C9A84C]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white">Craft Your Response</h2>
                <p className="text-[11px] text-[#6E685E]">via {SOURCE_LABELS[respondTarget.source]} · {respondTarget.username}</p>
              </div>
              <button onClick={() => setRespondTarget(null)} className="text-[#6E685E] hover:text-white transition-colors p-1">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Original post */}
              <div className="bg-[#1A1A1A] border border-white/6 rounded-xl p-3">
                <p className="text-[10px] text-[#6E685E] uppercase tracking-widest mb-2">Original post</p>
                <p className="text-xs text-[#D4CFC6] leading-relaxed">{respondTarget.post}</p>
              </div>

              {/* AI generate */}
              <button
                onClick={generateDraft}
                disabled={aiGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C]/10 border border-[#C9A84C]/25 rounded-lg text-[#C9A84C] text-xs font-medium hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all disabled:opacity-50"
              >
                {aiGenerating
                  ? <><Loader size={12} className="animate-spin" /> Generating…</>
                  : <><Sparkles size={12} /> Generate AI Response</>
                }
              </button>

              {/* Draft textarea */}
              <div>
                <p className="text-[10px] text-[#6E685E] uppercase tracking-widest mb-2">Your response</p>
                <textarea
                  value={aiDraft}
                  onChange={e => setAiDraft(e.target.value)}
                  placeholder="Write or generate a response…"
                  className="w-full bg-[#1A1A1A] border border-white/8 rounded-xl text-sm text-[#F5F0E8] placeholder-[#6E685E] p-3 outline-none focus:border-[#C9A84C]/50 resize-none min-h-[140px] transition-colors leading-relaxed"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center gap-2 px-5 pb-5">
              <button
                onClick={sendResponse}
                disabled={!aiDraft.trim() || sendLoading}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#C9A84C] rounded-xl text-[#0A0A0A] text-sm font-bold hover:bg-[#E0C06A] transition-all disabled:opacity-50"
              >
                {sendLoading
                  ? <><Loader size={13} className="animate-spin" /> Sending…</>
                  : <><Send size={13} /> Copy & Mark Responded</>
                }
              </button>
              <button
                onClick={copyDraft}
                disabled={!aiDraft.trim()}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-white/10 rounded-xl text-[#D4CFC6] text-xs hover:border-white/20 transition-all disabled:opacity-40"
              >
                {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy</>}
              </button>
              <button
                onClick={() => !respondTarget.leadConverted && convertToLead(respondTarget)}
                className={`flex items-center gap-1.5 px-3 py-2.5 border rounded-xl text-xs transition-all ${
                  respondTarget.leadConverted
                    ? 'border-[#C9A84C]/20 text-[#C9A84C] cursor-default'
                    : 'border-white/10 text-[#D4CFC6] hover:border-[#C9A84C]/30 hover:text-[#C9A84C]'
                }`}
              >
                <ArrowRight size={12} /> {respondTarget.leadConverted ? 'In CRM' : '+ Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#1A1A1A] border border-[#C9A84C]/25 rounded-xl px-4 py-3 text-sm text-[#D4CFC6] shadow-2xl animate-[slide-up_0.3s_ease]`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-[#C9A84C]'}`} />
          {toast.msg}
        </div>
      )}

      <style jsx>{`
        @keyframes slide-in { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes slide-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}
