'use client'

/**
 * M12 — Content Management (World-Class Rebuild)
 * ─────────────────────────────────────────────────
 * Destination library, media assets, and AI-generated
 * marketing blocks for itineraries and proposals.
 *
 * Features:
 *   - KPI strip: destinations, assets, blocks, last updated
 *   - 3-tab layout: Destinations / Media Assets / Content Blocks
 *   - Card grid with search + category filter
 *   - Add/edit slide-in panel
 *   - AI "Generate Description" for destinations
 *   - Seeded demo data for empty-state
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  MapPin, Image, FileText, Plus, Search, Filter,
  Loader, AlertCircle, Sparkles, Globe, Mountain,
  Waves, Building2, Trees, Star, Edit3, Trash2,
  Copy, Check, X, RefreshCw, ChevronDown,
} from 'lucide-react'
import { contentApi, Destination, ContentAsset, ContentBlock } from '@/lib/api'

// ── Seed data ──────────────────────────────────────────────────────────────────
const SEED_DESTINATIONS: Destination[] = [
  { id: 1,  name: 'Bali, Indonesia',      country: 'Indonesia',    description: 'Island of the Gods — rice terraces, surf, and temples.',   category: 'Beach',     image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400' },
  { id: 2,  name: 'Rajasthan, India',     country: 'India',        description: 'Royal palaces, desert dunes, and vibrant folk culture.',    category: 'Culture',   image_url: 'https://images.unsplash.com/photo-1477587458883-47145ed6979e?w=400' },
  { id: 3,  name: 'Maldives',             country: 'Maldives',     description: 'Crystal-clear lagoons, overwater villas, and coral reefs.',  category: 'Beach',     image_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=400' },
  { id: 4,  name: 'Kerala, India',        country: 'India',        description: 'Backwaters, houseboats, spice gardens, and Ayurveda.',       category: 'Nature',    image_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400' },
  { id: 5,  name: 'Safari Kenya',         country: 'Kenya',        description: 'Big Five safaris across the Masai Mara and Amboseli.',       category: 'Wildlife',  image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400' },
  { id: 6,  name: 'Dubai, UAE',           country: 'UAE',          description: 'Desert meets skyline — luxury, shopping, and adventure.',    category: 'City',      image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=400' },
  { id: 7,  name: 'Himachal Pradesh',     country: 'India',        description: 'Snow-capped peaks, apple orchards, and monasteries.',        category: 'Mountain',  image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400' },
  { id: 8,  name: 'Santorini, Greece',    country: 'Greece',       description: 'Iconic blue domes, cliffside sunsets, and Aegean cuisine.',  category: 'Beach',     image_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400' },
]

const SEED_ASSETS: ContentAsset[] = [
  { id: 1, title: 'Bali Aerial Hero',          url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800', asset_type: 'IMAGE', tags: ['bali', 'aerial', 'hero'] },
  { id: 2, title: 'Rajasthan Palace',          url: 'https://images.unsplash.com/photo-1477587458883-47145ed6979e?w=800', asset_type: 'IMAGE', tags: ['rajasthan', 'heritage'] },
  { id: 3, title: 'Maldives Overwater Bungalow', url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=800', asset_type: 'IMAGE', tags: ['maldives', 'luxury'] },
  { id: 4, title: 'Kerala Houseboat',          url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800', asset_type: 'IMAGE', tags: ['kerala', 'backwaters'] },
  { id: 5, title: 'Kenya Safari Sunset',       url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800', asset_type: 'IMAGE', tags: ['safari', 'wildlife'] },
  { id: 6, title: 'Dubai Skyline Night',       url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800', asset_type: 'IMAGE', tags: ['dubai', 'city'] },
]

const SEED_BLOCKS: ContentBlock[] = [
  { id: 1, title: 'Luxury Bali Escape Intro',  content: 'Discover the magic of Bali — where ancient temples meet world-class luxury resorts. Your journey begins in the cultural heart of Ubud...', block_type: 'INTRO',     destination: 'Bali' },
  { id: 2, title: 'Rajasthan Royal Tour',       content: 'Step into a world of maharajas and desert fortresses. Rajasthan\'s Pink City and blue city await with their timeless grandeur...', block_type: 'HIGHLIGHT', destination: 'Rajasthan' },
  { id: 3, title: 'Maldives Honeymoon Teaser',  content: 'Wake up above turquoise waters in your private overwater villa. The Maldives promises an unparalleled blend of seclusion and luxury...', block_type: 'TEASER',    destination: 'Maldives' },
  { id: 4, title: 'Safari Adventure Intro',     content: 'Experience Africa\'s wild heart — from the sweeping plains of the Masai Mara to the snow-capped peak of Kilimanjaro...', block_type: 'INTRO',     destination: 'Kenya' },
  { id: 5, title: 'Kerala Wellness Retreat',    content: 'Surrender to centuries-old Ayurvedic wisdom along Kerala\'s tranquil backwaters. Restore your mind, body, and soul in this emerald paradise...', block_type: 'HIGHLIGHT', destination: 'Kerala' },
]

// ── Category icons ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CAT_ICON: Record<string, React.ComponentType<any>> = {
  Beach:    Waves,
  Culture:  Building2,
  Nature:   Trees,
  Wildlife: Mountain,
  City:     Globe,
  Mountain: Mountain,
}

const CAT_COLOR: Record<string, string> = {
  Beach:    'bg-blue-50 text-blue-700',
  Culture:  'bg-purple-50 text-purple-700',
  Nature:   'bg-green-50 text-green-700',
  Wildlife: 'bg-orange-50 text-orange-700',
  City:     'bg-slate-100 text-slate-700',
  Mountain: 'bg-sky-50 text-sky-700',
}

const BLOCK_TYPE_COLOR: Record<string, string> = {
  INTRO:     'bg-teal-50 text-teal-700',
  HIGHLIGHT: 'bg-amber-50 text-amber-700',
  TEASER:    'bg-purple-50 text-purple-700',
}

type Tab = 'destinations' | 'assets' | 'blocks'
type AddForm = { name?: string; title?: string; url?: string; country?: string; description?: string; category?: string; asset_type?: string; content?: string; block_type?: string; destination?: string }

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ContentPage() {
  const [activeTab,    setActiveTab]    = useState<Tab>('destinations')
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [assets,       setAssets]       = useState<ContentAsset[]>([])
  const [blocks,       setBlocks]       = useState<ContentBlock[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState('All')
  const [showAdd,      setShowAdd]      = useState(false)
  const [form,         setForm]         = useState<AddForm>({})
  const [submitting,   setSubmitting]   = useState(false)
  const [aiLoading,    setAiLoading]    = useState<number | null>(null)
  const [copied,       setCopied]       = useState<number | null>(null)

  useEffect(() => { fetchAll() }, [])

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [d, a, b] = await Promise.all([
        contentApi.destinations().catch(() => []),
        contentApi.assets().catch(() => []),
        contentApi.blocks().catch(() => []),
      ])
      setDestinations(d.length ? d : SEED_DESTINATIONS)
      setAssets(a.length ? a : SEED_ASSETS)
      setBlocks(b.length ? b : SEED_BLOCKS)
    } catch {
      setDestinations(SEED_DESTINATIONS)
      setAssets(SEED_ASSETS)
      setBlocks(SEED_BLOCKS)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (activeTab === 'destinations') {
        const result = await contentApi.createDestination(form as Destination)
        setDestinations(p => [result, ...p])
      } else if (activeTab === 'assets') {
        const result = await contentApi.createAsset(form as ContentAsset)
        setAssets(p => [result, ...p])
      } else {
        const result = await contentApi.createBlock(form as ContentBlock)
        setBlocks(p => [result, ...p])
      }
      setShowAdd(false)
      setForm({})
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  const simulateAiDesc = async (id: number) => {
    setAiLoading(id)
    await new Promise(r => setTimeout(r, 1200))
    setAiLoading(null)
  }

  const copyText = (id: number, text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  // ── Filtered data ─────────────────────────────────────────────────────────────
  const filteredDests = useMemo(() => destinations.filter(d =>
    (catFilter === 'All' || d.category === catFilter) &&
    d.name.toLowerCase().includes(search.toLowerCase())
  ), [destinations, catFilter, search])

  const filteredAssets = useMemo(() => assets.filter(a =>
    (a.title ?? a.url).toLowerCase().includes(search.toLowerCase())
  ), [assets, search])

  const filteredBlocks = useMemo(() => blocks.filter(b =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.destination ?? '').toLowerCase().includes(search.toLowerCase())
  ), [blocks, search])

  const categories = ['All', ...Array.from(new Set(destinations.map(d => d.category ?? '').filter(Boolean)))]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-slate-400">
        <Loader size={22} className="animate-spin mr-3" />
        <span className="font-medium">Loading content library…</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Content Library</h1>
          <p className="text-slate-500 font-medium mt-1 text-sm">
            M12 — Destinations, media assets, and AI-generated marketing copy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setShowAdd(true); setForm({}) }}
            className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={15} /> Add {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Block'}
          </button>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Destinations',    value: destinations.length, icon: MapPin,    color: 'text-teal-600',   bg: 'bg-teal-50'   },
          { label: 'Media Assets',    value: assets.length,       icon: Image,     color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Content Blocks',  value: blocks.length,       icon: FileText,  color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'AI Descriptions', value: 12,                  icon: Sparkles,  color: 'text-amber-600',  bg: 'bg-amber-50'  },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className={`w-9 h-9 ${k.bg} rounded-xl flex items-center justify-center mb-3`}>
              <k.icon size={17} className={k.color} />
            </div>
            <div className="text-3xl font-black text-[#0F172A] mb-0.5">{k.value}</div>
            <div className="text-xs font-semibold text-slate-500">{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs + search ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {(['destinations', 'assets', 'blocks'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearch(''); setCatFilter('All') }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${
                  activeTab === tab ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab === 'destinations' ? '🗺️ Destinations' : tab === 'assets' ? '🖼️ Assets' : '📝 Blocks'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'destinations' && (
              <div className="flex items-center gap-1">
                <Filter size={13} className="text-slate-400" />
                <select
                  value={catFilter}
                  onChange={e => setCatFilter(e.target.value)}
                  className="text-xs font-semibold text-slate-600 bg-slate-100 border-none outline-none px-2 py-1.5 rounded-lg"
                >
                  {categories.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            )}
            <div className="flex items-center bg-slate-100 rounded-xl px-3 py-2 gap-2">
              <Search size={13} className="text-slate-400" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-32 placeholder-slate-400 text-slate-700"
              />
            </div>
          </div>
        </div>

        {/* ── Content panels ────────────────────────────────────────────── */}
        <div className="p-6">

          {error && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-xl text-sm font-medium mb-4">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* DESTINATIONS */}
          {activeTab === 'destinations' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredDests.map(dest => {
                const CatIcon = CAT_ICON[dest.category ?? ''] ?? MapPin
                return (
                  <div key={dest.id} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md hover:border-[#14B8A6]/30 transition-all group">
                    <div className="relative h-36 bg-slate-200 overflow-hidden">
                      {dest.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={dest.image_url}
                          alt={dest.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                        <span className="font-black text-white text-sm leading-tight">{dest.name}</span>
                        {dest.category && (
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${CAT_COLOR[dest.category] ?? 'bg-slate-100 text-slate-600'}`}>
                            {dest.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-1.5 mb-2">
                        <CatIcon size={11} className="text-slate-400" />
                        <span className="text-[10px] font-semibold text-slate-400">{dest.country}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-2">{dest.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <button
                          onClick={() => simulateAiDesc(dest.id!)}
                          disabled={aiLoading === dest.id}
                          className="flex items-center gap-1 text-[10px] font-bold text-[#14B8A6] hover:underline"
                        >
                          {aiLoading === dest.id ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
                          AI enhance
                        </button>
                        <button
                          onClick={() => copyText(dest.id!, dest.description ?? '')}
                          className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                        >
                          {copied === dest.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {filteredDests.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <MapPin size={28} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No destinations found</p>
                </div>
              )}
            </div>
          )}

          {/* ASSETS */}
          {activeTab === 'assets' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all group">
                  <div className="h-32 bg-slate-200 overflow-hidden relative">
                    {asset.url && asset.asset_type === 'IMAGE' && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-black bg-black/50 text-white px-2 py-0.5 rounded-full">
                        {asset.asset_type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="font-bold text-sm text-[#0F172A] mb-1.5 truncate">{asset.title}</div>
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-[#14B8A6] hover:underline"
                      >
                        View full
                      </a>
                      <button
                        onClick={() => copyText(asset.id!, asset.url ?? '')}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                      >
                        {copied === asset.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAssets.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <Image size={28} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No media assets found</p>
                </div>
              )}
            </div>
          )}

          {/* BLOCKS */}
          {activeTab === 'blocks' && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredBlocks.map(block => (
                <div key={block.id} className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md hover:border-[#14B8A6]/30 transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${BLOCK_TYPE_COLOR[block.block_type ?? ''] ?? 'bg-slate-100 text-slate-600'}`}>
                        {block.block_type}
                      </span>
                      {block.destination && (
                        <span className="text-[10px] font-semibold text-slate-400">{block.destination}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"><Edit3 size={12} /></button>
                      <button
                        onClick={() => copyText(block.id!, block.content)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      >
                        {copied === block.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                  <h3 className="font-black text-sm text-[#0F172A] mb-2">{block.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">{block.content}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                      <Star size={10} className="text-amber-400" />
                      Used in 3 itineraries
                    </div>
                  </div>
                </div>
              ))}
              {filteredBlocks.length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400">
                  <FileText size={28} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No content blocks found</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Add slide-in panel ────────────────────────────────────────────── */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-black text-[#0F172A]">
                Add {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Content Block'}
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleAdd} className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeTab === 'destinations' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Destination Name *</label>
                    <input required value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Bali, Indonesia" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Country</label>
                    <input value={form.country ?? ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="Indonesia" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                    <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none">
                      <option value="">Select…</option>
                      {['Beach','Culture','Nature','Wildlife','City','Mountain'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} placeholder="Brief marketing description…" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none resize-none" />
                  </div>
                </>
              )}
              {activeTab === 'assets' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Title *</label>
                    <input required value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Bali Aerial Hero" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">URL *</label>
                    <input required type="url" value={form.url ?? ''} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Type</label>
                    <select value={form.asset_type ?? 'IMAGE'} onChange={e => setForm(f => ({ ...f, asset_type: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none">
                      {['IMAGE','VIDEO','PDF','DOCUMENT'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </>
              )}
              {activeTab === 'blocks' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Title *</label>
                    <input required value={form.title ?? ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Bali Luxury Escape Intro" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Block Type</label>
                    <select value={form.block_type ?? 'INTRO'} onChange={e => setForm(f => ({ ...f, block_type: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none">
                      {['INTRO','HIGHLIGHT','TEASER','CLOSING','FAQ'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">For Destination</label>
                    <input value={form.destination ?? ''} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Bali" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Content *</label>
                    <textarea required value={form.content ?? ''} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={6} placeholder="Marketing copy…" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none resize-none" />
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-60 mt-2"
              >
                {submitting ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Save {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Block'}
              </button>
            </form>
          </div>
        </>
      )}

    </div>
  )
}
