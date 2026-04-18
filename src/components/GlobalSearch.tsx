'use client'

/**
 * NAMA OS — Global Search (cmd+K)
 * ─────────────────────────────────
 * Searches across leads, itineraries, bookings, vendors, modules — all in one.
 * Zero dependencies — uses string matching on seed data + navigation items.
 * V6 upgrade path: swap matching fn with Fuse.js for fuzzy search.
 *
 * Architecture:
 * - Opens on cmd+K or clicking the search bar
 * - Searches SEED data client-side (no API call, instant results)
 * - Groups results by type: Modules · Leads · Itineraries · Vendors
 * - Arrow key navigation + Enter to go
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search, X, LayoutDashboard, Users, Map, Briefcase, Store, ArrowRight, Command } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'module' | 'lead' | 'itinerary' | 'vendor' | 'booking'
  title: string
  subtitle: string
  href: string
  icon: React.ReactNode
}

// ── Static module index ──────────────────────────────────────────────────────
const MODULES: SearchResult[] = [
  { id: 'm-dash', type: 'module', title: 'Dashboard', subtitle: 'Overview & KPIs', href: '/dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'm-leads', type: 'module', title: 'Leads', subtitle: 'CRM & AI scoring', href: '/dashboard/leads', icon: <Users size={14} /> },
  { id: 'm-itin', type: 'module', title: 'Itineraries', subtitle: 'Bento builder', href: '/dashboard/itineraries', icon: <Map size={14} /> },
  { id: 'm-book', type: 'module', title: 'Bookings', subtitle: 'Live trip tracker', href: '/dashboard/bookings', icon: <Briefcase size={14} /> },
  { id: 'm-vend', type: 'module', title: 'Vendors', subtitle: 'Marketplace', href: '/dashboard/vendors', icon: <Store size={14} /> },
  { id: 'm-quot', type: 'module', title: 'Quotations', subtitle: 'Smart pricing', href: '/dashboard/quotations', icon: <ArrowRight size={14} /> },
  { id: 'm-docs', type: 'module', title: 'Documents', subtitle: 'Invoice, Voucher, Confirmation', href: '/dashboard/documents', icon: <ArrowRight size={14} /> },
  { id: 'm-comms', type: 'module', title: 'Comms', subtitle: 'Follow-up templates', href: '/dashboard/comms', icon: <ArrowRight size={14} /> },
  { id: 'm-rep', type: 'module', title: 'Reports', subtitle: 'Analytics & funnels', href: '/dashboard/reports', icon: <ArrowRight size={14} /> },
  { id: 'm-set', type: 'module', title: 'Settings', subtitle: 'BYOK, billing, preferences', href: '/dashboard/settings', icon: <ArrowRight size={14} /> },
  { id: 'm-aud', type: 'module', title: 'System Audit', subtitle: 'Health & agent status', href: '/dashboard/audit', icon: <ArrowRight size={14} /> },
]

// ── Seed data for cross-module search ────────────────────────────────────────
const SEED_LEADS = [
  { id: 'l1', name: 'Priya Sharma', dest: 'Maldives Luxury' },
  { id: 'l2', name: 'Rahul Verma', dest: 'Bali Adventure' },
  { id: 'l3', name: 'Ananya Patel', dest: 'Europe Classic' },
  { id: 'l4', name: 'Karan Mehta', dest: 'Dubai Weekend' },
  { id: 'l5', name: 'Sunita Rao', dest: 'Rajasthan Heritage' },
]

const SEED_ITINERARIES = [
  { id: 'i1', title: '7-Day Maldives Luxury Escape', dest: 'Maldives' },
  { id: 'i2', title: '12-Day Kenya Wildlife Safari', dest: 'Kenya' },
  { id: 'i3', title: '10-Day Bali & Gili Islands', dest: 'Bali' },
  { id: 'i4', title: '8-Day Rajasthan Royal Tour', dest: 'Rajasthan' },
]

const SEED_VENDORS = [
  { id: 'v1', name: 'SkyWings Aviation', cat: 'Flights' },
  { id: 'v2', name: 'Niyama Private Islands', cat: 'Hotels' },
  { id: 'v3', name: 'Desert Storm DMC', cat: 'Ground Transport' },
  { id: 'v4', name: 'SafariCraft Kenya', cat: 'Safari' },
]

function matchQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

function buildResults(query: string): SearchResult[] {
  if (!query.trim()) return MODULES.slice(0, 6)

  const results: SearchResult[] = []

  // Modules
  MODULES.forEach(m => {
    if (matchQuery(m.title, query) || matchQuery(m.subtitle, query)) results.push(m)
  })

  // Leads
  SEED_LEADS.forEach(l => {
    if (matchQuery(l.name, query) || matchQuery(l.dest, query)) {
      results.push({ id: `lead-${l.id}`, type: 'lead', title: l.name, subtitle: l.dest, href: '/dashboard/leads', icon: <Users size={14} /> })
    }
  })

  // Itineraries
  SEED_ITINERARIES.forEach(i => {
    if (matchQuery(i.title, query) || matchQuery(i.dest, query)) {
      results.push({ id: `itin-${i.id}`, type: 'itinerary', title: i.title, subtitle: i.dest, href: '/dashboard/itineraries', icon: <Map size={14} /> })
    }
  })

  // Vendors
  SEED_VENDORS.forEach(v => {
    if (matchQuery(v.name, query) || matchQuery(v.cat, query)) {
      results.push({ id: `vend-${v.id}`, type: 'vendor', title: v.name, subtitle: v.cat, href: '/dashboard/vendors', icon: <Store size={14} /> })
    }
  })

  return results.slice(0, 10)
}

const TYPE_LABELS: Record<string, string> = {
  module: 'Modules', lead: 'Leads', itinerary: 'Itineraries', vendor: 'Vendors', booking: 'Bookings',
}
const TYPE_COLOR: Record<string, string> = {
  module: 'text-slate-400', lead: 'text-[#14B8A6]', itinerary: 'text-purple-400', vendor: 'text-orange-400',
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const results = buildResults(query)

  // Track client mount for portal rendering
  useEffect(() => { setMounted(true) }, [])

  // cmd+K / ctrl+K to open — capture phase fires before child handlers
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        e.stopPropagation()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler, true) // capture phase
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setActiveIndex(0)
    } else {
      setQuery('')
    }
  }, [open])

  const handleSelect = useCallback((result: SearchResult) => {
    router.push(result.href)
    setOpen(false)
  }, [router])

  // Arrow key navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[activeIndex]) handleSelect(results[activeIndex])
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  return (
    <>
      {/* Search bar trigger in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 w-64 md:w-80 transition-colors group"
      >
        <Search size={16} className="text-slate-400 mr-2 flex-shrink-0" />
        <span className="text-sm text-slate-400 font-medium flex-1 text-left">Search leads, itineraries…</span>
        <span className="hidden md:flex items-center gap-0.5 text-[10px] text-slate-400 font-bold bg-white border border-slate-200 rounded px-1.5 py-0.5">
          <Command size={10} />K
        </span>
      </button>

      {/* Modal — portalled to body to escape sticky header stacking context */}
      {mounted && open && ReactDOM.createPortal((
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[#0F172A]/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 z-10">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0) }}
                onKeyDown={handleKeyDown}
                placeholder="Search modules, leads, itineraries, vendors…"
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={16} />
                </button>
              )}
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">ESC</span>
            </div>

            {/* Results */}
            <div className="max-h-[400px] overflow-y-auto py-2">
              {results.length === 0 && (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400 font-medium">No results for "{query}"</p>
                </div>
              )}
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2">
                    {TYPE_LABELS[type] || type}
                  </p>
                  {items.map(result => {
                    const globalIdx = results.indexOf(result)
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          globalIdx === activeIndex ? 'bg-slate-50' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`flex-shrink-0 ${TYPE_COLOR[result.type] || 'text-slate-400'}`}>
                          {result.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{result.title}</p>
                          <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                        </div>
                        {globalIdx === activeIndex && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 flex-shrink-0">↵</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-4 text-[10px] text-slate-400 font-bold">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
              <span className="ml-auto">NAMA OS Search</span>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  )
}
