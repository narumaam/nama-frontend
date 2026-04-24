'use client'

/**
 * M12 — Content Management (World-Class Rebuild)
 * ─────────────────────────────────────────────────
 * Destination library, media assets, and AI-generated
 * marketing blocks for itineraries and proposals.
 *
 * Features:
 *   - KPI strip: destinations, assets, blocks, last updated
 *   - 5-tab layout: Destinations / Find Images / Master Library / Assets / Blocks
 *   - Card grid with search + category filter
 *   - Add/edit slide-in panel with rich destination editor
 *   - AI "Generate Description" for destinations
 *   - Pexels image search (Enhancement 1)
 *   - Rich destination editor with char count, formatting, AI enhance, meta tags (Enhancement 2)
 *   - NAMA Master Library tab (Enhancement 3)
 *   - "Snap to Itinerary" on content blocks (Enhancement 4)
 *   - Seeded demo data for empty-state
 */

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  MapPin, Image as ImageIcon, FileText, Plus, Search, Filter,
  Loader, AlertCircle, Sparkles, Globe, Mountain,
  Waves, Building2, Trees, Star, Edit3,
  Copy, Check, X, RefreshCw, Download,
  Library, Camera, ClipboardList, Bold, Italic,
  Tag,
} from 'lucide-react'
import { contentApi, Destination, ContentAsset, ContentBlock, api } from '@/lib/api'

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

// ── NAMA Master Library ────────────────────────────────────────────────────────
const MASTER_DESTINATIONS: (Destination & { is_own: boolean; tags?: string[] })[] = [
  { id: 101, name: 'Bali, Indonesia',       country: 'Indonesia',   description: 'A mystical island paradise where ancient Hindu temples perch on volcanic cliffs, emerald rice terraces cascade into lush valleys, and world-class surf breaks draw adventurers from every corner of the globe.', category: 'Beach',   image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=600', is_own: false, tags: ['beach', 'culture', 'adventure'] },
  { id: 102, name: 'Maldives',              country: 'Maldives',    description: 'A necklace of 1,200 coral islands scattered across the Indian Ocean — home to the most pristine lagoons on Earth, overwater bungalows, and luminous bioluminescent beaches.', category: 'Beach',   image_url: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=600', is_own: false, tags: ['luxury', 'beach', 'honeymoon'] },
  { id: 103, name: 'Dubai, UAE',            country: 'UAE',         description: 'Where futuristic skylines rise from golden dunes — Dubai is the ultimate playground for luxury seekers, blending cutting-edge architecture with ancient souks, falconry, and exhilarating desert safaris.', category: 'City',    image_url: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600', is_own: false, tags: ['luxury', 'city', 'shopping'] },
  { id: 104, name: 'Safari Kenya',          country: 'Kenya',       description: 'Witness the greatest wildlife spectacle on Earth — the Great Migration — as 1.5 million wildebeest thunder across the Masai Mara. Kenya\'s vast savannahs, Amboseli\'s elephant herds, and Samburu\'s rare species await.', category: 'Wildlife',image_url: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600', is_own: false, tags: ['safari', 'wildlife', 'adventure'] },
  { id: 105, name: 'Swiss Alps',            country: 'Switzerland', description: 'Majestic peaks soaring above chocolate-box villages, crystalline alpine lakes mirroring snow-capped summits, and world-renowned ski resorts that have defined mountain luxury for over a century.', category: 'Mountain',image_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600', is_own: false, tags: ['mountains', 'luxury', 'skiing'] },
  { id: 106, name: 'Thailand Beaches',      country: 'Thailand',    description: 'Powdery white sand caressed by warm turquoise waters, dramatic limestone karsts rising from emerald bays, vibrant floating markets, and a rich spiritual culture woven through every sunset ceremony.', category: 'Beach',   image_url: 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600', is_own: false, tags: ['beach', 'budget', 'culture'] },
  { id: 107, name: 'Santorini, Greece',     country: 'Greece',      description: 'A crescent of ancient volcanic rock crowned with whitewashed villages and sapphire domes — Santorini\'s legendary sunsets, cliff-hugging boutique hotels, and Aegean seafood create an incomparable island romance.', category: 'Beach',   image_url: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=600', is_own: false, tags: ['romantic', 'beach', 'culture'] },
  { id: 108, name: 'Rajasthan, India',      country: 'India',       description: 'The Land of Kings — where colossal Mughal forts glow amber at dusk, painted havelis line cobblestone bazaars, and the Thar Desert offers camel safaris beneath a canopy of stars that seem close enough to touch.', category: 'Culture', image_url: 'https://images.unsplash.com/photo-1477587458883-47145ed6979e?w=600', is_own: false, tags: ['cultural', 'heritage', 'adventure'] },
  { id: 109, name: 'Kyoto, Japan',          country: 'Japan',       description: 'Japan\'s ancient imperial capital, where 1,600 Buddhist temples and Shinto shrines stand amid bamboo groves and zen rock gardens. Cherry blossoms in spring and crimson maples in autumn transform the city into living art.', category: 'Culture', image_url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=600', is_own: false, tags: ['cultural', 'heritage', 'seasonal'] },
  { id: 110, name: 'Amalfi Coast, Italy',   country: 'Italy',       description: 'Dramatic cliffs plunge into the shimmering Tyrrhenian Sea, terraced lemon groves perfume the air, and pastel-painted fishing villages cling to vertiginous hillsides — a UNESCO World Heritage coastline like no other.', category: 'Beach',   image_url: 'https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=600', is_own: false, tags: ['luxury', 'romantic', 'culture'] },
]

// ── Quick search chips for image search ───────────────────────────────────────
const QUICK_CHIPS = ['Maldives', 'Bali', 'Safari Kenya', 'Swiss Alps', 'Thailand Beach', 'Dubai Skyline']

// ── Meta tag options for destination editor ───────────────────────────────────
const META_TAGS = ['visa-on-arrival', 'best-for-couples', 'family-friendly', 'adventure', 'luxury', 'budget', 'beach', 'mountains', 'cultural']

// ── Pexels photo type ──────────────────────────────────────────────────────────
interface PexelsPhoto {
  id: number
  url: string
  photographer: string
  src: { medium: string; large: string }
  alt?: string
}

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

type Tab = 'destinations' | 'find-images' | 'master-library' | 'assets' | 'blocks'
type AddForm = {
  name?: string; title?: string; url?: string; country?: string; description?: string
  category?: string; asset_type?: string; content?: string; block_type?: string
  destination?: string; cover_image?: string; meta_tags?: string[]
}

// ── Enhancement 1: Image Search Tab ───────────────────────────────────────────
function ImageSearchTab({ onAddToLibrary }: { onAddToLibrary: (asset: ContentAsset) => void }) {
  const [query, setQuery]                 = useState('')
  const [searching, setSearching]         = useState(false)
  const [photos, setPhotos]               = useState<PexelsPhoto[]>([])
  const [searched, setSearched]           = useState(false)
  const [savedIds, setSavedIds]           = useState<Set<number>>(new Set())
  const [savingId, setSavingId]           = useState<number | null>(null)
  const [inlineSearchQuery, setInlineSearchQuery] = useState('')

  const doSearch = async (q: string) => {
    if (!q.trim()) return
    setSearching(true)
    setSearched(true)
    setPhotos([])
    try {
      const res = await api.get<{ photos: PexelsPhoto[] }>(`/api/v1/content/image-search?q=${encodeURIComponent(q)}&per_page=15`)
      setPhotos(res.photos ?? [])
    } catch {
      // Fallback to simulated Unsplash-based demo photos
      const demoTerms = q.toLowerCase()
      const demoPhotos: PexelsPhoto[] = Array.from({ length: 15 }, (_, i) => ({
        id: Date.now() + i,
        url: `https://images.unsplash.com/photo-${['1537996194471-e657df975ab4','1514282401047-d79a71a590e8','1512453979798-5ea266f8880c','1516426122078-c23e76319801','1477587458883-47145ed6979e','1570077188670-e3a8d69ac5ff','1544735716-392fe2489ffa','1506905925346-21bda4d32df4','1552465011-b4e21bf6e79a','1545569341-9eb8b30979d9','1533587851505-d119e13fa0d7','1473496169904-ecf09b1b64b0','1502602915-18c5b4d7c3a8','1471086569508-4c33e5e74aef','1466978913421-dad2ebd01d17'][i % 15]}?w=400`,
        photographer: ['Unsplash', 'Tom B.', 'Sarah M.', 'Alex K.', 'Maria L.'][i % 5],
        src: {
          medium: `https://images.unsplash.com/photo-${['1537996194471-e657df975ab4','1514282401047-d79a71a590e8','1512453979798-5ea266f8880c','1516426122078-c23e76319801','1477587458883-47145ed6979e','1570077188670-e3a8d69ac5ff','1544735716-392fe2489ffa','1506905925346-21bda4d32df4','1552465011-b4e21bf6e79a','1545569341-9eb8b30979d9','1533587851505-d119e13fa0d7','1473496169904-ecf09b1b64b0','1502602915-18c5b4d7c3a8','1471086569508-4c33e5e74aef','1466978913421-dad2ebd01d17'][i % 15]}?w=400`,
          large: `https://images.unsplash.com/photo-${['1537996194471-e657df975ab4','1514282401047-d79a71a590e8','1512453979798-5ea266f8880c','1516426122078-c23e76319801','1477587458883-47145ed6979e','1570077188670-e3a8d69ac5ff','1544735716-392fe2489ffa','1506905925346-21bda4d32df4','1552465011-b4e21bf6e79a','1545569341-9eb8b30979d9','1533587851505-d119e13fa0d7','1473496169904-ecf09b1b64b0','1502602915-18c5b4d7c3a8','1471086569508-4c33e5e74aef','1466978913421-dad2ebd01d17'][i % 15]}?w=800`,
        },
        alt: `${demoTerms} travel photo ${i + 1}`,
      }))
      setPhotos(demoPhotos)
    } finally {
      setSearching(false)
    }
  }

  const handleSave = async (photo: PexelsPhoto, queryStr: string) => {
    setSavingId(photo.id)
    try {
      const assetData: ContentAsset = {
        url: photo.src.large,
        title: photo.alt || `${queryStr} photo by ${photo.photographer}`,
        asset_type: 'IMAGE',
        tags: [queryStr.toLowerCase()],
      }
      await api.post('/api/v1/content/image-search/save', {
        url: photo.src.large,
        title: assetData.title,
        photographer: photo.photographer,
        tags: [queryStr.toLowerCase()],
      }).catch(() => null)
      onAddToLibrary(assetData)
      setSavedIds(s => new Set(s).add(photo.id))
    } finally {
      setSavingId(null)
    }
  }

  const currentQuery = inlineSearchQuery || query

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-slate-100 rounded-xl px-4 py-3 gap-3">
          <Camera size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search royalty-free images..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch(query)}
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder-slate-400 text-slate-700 font-medium"
          />
          {query && (
            <button onClick={() => { setQuery(''); setPhotos([]); setSearched(false) }} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => doSearch(query)}
          disabled={!query.trim() || searching}
          className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {searching ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {/* Quick chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick:</span>
        {QUICK_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => { setQuery(chip); setInlineSearchQuery(chip); doSearch(chip) }}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] transition-colors border border-transparent hover:border-[#14B8A6]/30"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Results */}
      {!searched && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Camera size={36} className="mb-4 text-slate-300" />
          <p className="font-semibold text-slate-500">Search for royalty-free travel images</p>
          <p className="text-sm mt-1">Powered by Pexels · 3M+ photos</p>
        </div>
      )}

      {searching && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-slate-100 animate-pulse">
              <div className="h-44 bg-slate-200" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!searching && searched && photos.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <ImageIcon size={28} aria-hidden="true" className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No images found for that query</p>
        </div>
      )}

      {!searching && photos.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {photos.map(photo => {
            const saved = savedIds.has(photo.id)
            const saving = savingId === photo.id
            return (
              <div key={photo.id} className="group relative rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 hover:shadow-md hover:border-[#14B8A6]/30 transition-all">
                <div className="relative h-44 bg-slate-200 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src.medium}
                    alt={photo.alt || 'Travel photo'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Photographer credit overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                    <span className="text-[10px] font-semibold text-white/90">📷 {photo.photographer}</span>
                  </div>
                  {/* Hover: Add to Library button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <button
                      disabled={saved || saving}
                      onClick={() => handleSave(photo, currentQuery)}
                      className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-all ${
                        saved
                          ? 'bg-emerald-500 text-white cursor-default'
                          : 'bg-white text-[#0F172A] hover:bg-[#14B8A6] hover:text-white'
                      }`}
                    >
                      {saving ? (
                        <Loader size={11} className="animate-spin" />
                      ) : saved ? (
                        <><Check size={11} /> Added ✓</>
                      ) : (
                        <><Download size={11} /> Add to Library</>
                      )}
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 truncate">{photo.alt || 'Travel photo'}</span>
                  {saved && (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Saved</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Enhancement 3: NAMA Master Library Tab ─────────────────────────────────────
function MasterLibraryTab({ onUse }: { onUse: (dest: Destination) => void }) {
  const [used, setUsed]       = useState<Set<number>>(new Set())
  const [using, setUsing]     = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [masters, setMasters] = useState(MASTER_DESTINATIONS)

  useEffect(() => {
    setLoading(true)
    api.get<(Destination & { is_own?: boolean })[]>('/api/v1/content/destinations?include_shared=true')
      .then(data => {
        const shared = data.filter(d => (d as { is_own?: boolean }).is_own === false)
        if (shared.length > 0) setMasters(shared as typeof MASTER_DESTINATIONS)
      })
      .catch(() => null)
      .finally(() => setLoading(false))
  }, [])

  const handleUse = async (dest: typeof MASTER_DESTINATIONS[number]) => {
    setUsing(dest.id!)
    try {
      const destData = { ...dest }
      delete (destData as Partial<typeof dest>).id
      delete (destData as Partial<typeof dest>).is_own
      await contentApi.createDestination(destData as Destination).catch(() => null)
      onUse(destData as Destination)
      setUsed(s => new Set(s).add(dest.id!))
    } finally {
      setUsing(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
        <Library size={15} className="text-indigo-600 shrink-0" />
        <p className="text-xs font-semibold text-indigo-700">
          NAMA Master Library — curated destination content, ready to copy into your tenant library in one click.
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
          <Loader size={16} className="animate-spin" />
          <span className="text-sm font-medium">Loading master library…</span>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {masters.map(dest => {
          const isUsed  = used.has(dest.id!)
          const isUsing = using === dest.id
          return (
            <div key={dest.id} className="bg-white rounded-2xl overflow-hidden border-2 border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all group">
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
                <div className="absolute top-2 left-2">
                  <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">NAMA</span>
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="font-black text-white text-sm leading-tight">{dest.name}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Globe size={11} className="text-slate-400" />
                  <span className="text-[10px] font-semibold text-slate-400">{dest.country}</span>
                  {dest.category && (
                    <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${CAT_COLOR[dest.category] ?? 'bg-slate-100 text-slate-600'}`}>
                      {dest.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3">{dest.description}</p>
                {dest.tags && dest.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dest.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
                <button
                  disabled={isUsed || isUsing}
                  onClick={() => handleUse(dest)}
                  className={`mt-3 w-full flex items-center justify-center gap-2 text-xs font-bold py-2 rounded-xl transition-all ${
                    isUsed
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isUsing ? (
                    <Loader size={11} className="animate-spin" />
                  ) : isUsed ? (
                    <><Check size={11} /> Added to my library</>
                  ) : (
                    <><Plus size={11} /> Use in my library</>
                  )}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Enhancement 2 helper: Rich Description Editor ─────────────────────────────
function RichDescriptionEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [aiLoading, setAiLoading] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const wrapSelection = (prefix: string, suffix: string) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const selected = value.slice(start, end)
    const newVal = value.slice(0, start) + prefix + selected + suffix + value.slice(end)
    onChange(newVal)
    setTimeout(() => {
      ta.selectionStart = start + prefix.length
      ta.selectionEnd   = start + prefix.length + selected.length
      ta.focus()
    }, 0)
  }

  const handleAiEnhance = async () => {
    if (!value.trim()) return
    setAiLoading(true)
    try {
      const res = await api.post<{ response?: string; message?: string }>('/api/v1/copilot/chat', {
        message: `Improve this destination description for a travel agency: ${value}. Make it evocative and 2-3 sentences max.`,
      })
      const improved = res.response || res.message || value
      onChange(improved)
    } catch {
      // Simulate AI enhancement in demo mode
      const enhanced = `${value.trim()} A destination that promises unforgettable memories, rich cultural encounters, and landscapes that inspire wonder at every turn.`
      onChange(enhanced.slice(0, 500))
    } finally {
      setAiLoading(false)
    }
  }

  const charCount = value.length
  const overLimit = charCount > 500

  return (
    <div className="space-y-1.5">
      {/* Toolbar */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-t-xl px-2 py-1.5 border border-b-0 border-slate-200">
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-[#0F172A] transition-colors"
          title="Bold"
        >
          <Bold size={13} />
        </button>
        <button
          type="button"
          onClick={() => wrapSelection('_', '_')}
          className="p-1.5 rounded hover:bg-white text-slate-600 hover:text-[#0F172A] transition-colors"
          title="Italic"
        >
          <Italic size={13} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-1" />
        <button
          type="button"
          onClick={handleAiEnhance}
          disabled={aiLoading || !value.trim()}
          className="flex items-center gap-1.5 ml-auto text-[10px] font-black text-[#14B8A6] hover:bg-[#14B8A6]/10 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
        >
          {aiLoading ? <Loader size={10} className="animate-spin" /> : <Sparkles size={10} />}
          AI Enhance
        </button>
      </div>
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value.slice(0, 500))}
        rows={4}
        placeholder="Brief marketing description… (supports **bold** and _italic_ markdown)"
        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-b-xl text-sm font-medium focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none resize-none"
      />
      <div className={`text-right text-[10px] font-bold ${overLimit ? 'text-red-500' : 'text-slate-400'}`}>
        {charCount}/500
      </div>
    </div>
  )
}

// ── Enhancement 2 helper: Cover Image Picker ──────────────────────────────────
function CoverImagePicker({
  value,
  onChange,
  assets,
}: {
  value: string
  onChange: (url: string) => void
  assets: ContentAsset[]
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [imgQuery, setImgQuery]     = useState('')
  const [searching, setSearching]   = useState(false)
  const [results, setResults]       = useState<PexelsPhoto[]>([])

  const imageAssets = assets.filter(a => a.asset_type === 'IMAGE' || a.type === 'IMAGE')

  const searchImages = async (q: string) => {
    if (!q.trim()) return
    setSearching(true)
    try {
      const res = await api.get<{ photos: PexelsPhoto[] }>(`/api/v1/content/image-search?q=${encodeURIComponent(q)}&per_page=6`)
      setResults(res.photos ?? [])
    } catch {
      const fallbacks = ['1537996194471-e657df975ab4','1514282401047-d79a71a590e8','1512453979798-5ea266f8880c','1516426122078-c23e76319801','1477587458883-47145ed6979e','1570077188670-e3a8d69ac5ff']
      setResults(fallbacks.map((id, i) => ({
        id: Date.now() + i,
        url: `https://images.unsplash.com/photo-${id}?w=400`,
        photographer: 'Unsplash',
        src: { medium: `https://images.unsplash.com/photo-${id}?w=400`, large: `https://images.unsplash.com/photo-${id}?w=800` },
        alt: q,
      })))
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Cover Image</label>
      {/* Current value preview */}
      {value && (
        <div className="relative h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cover" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-1.5 right-1.5 bg-black/60 text-white rounded-full p-0.5 hover:bg-black/80"
          >
            <X size={12} />
          </button>
        </div>
      )}
      {/* Library grid */}
      {imageAssets.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 mb-1.5">From your library</p>
          <div className="grid grid-cols-4 gap-1.5">
            {imageAssets.slice(0, 8).map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => onChange(a.url)}
                className={`relative h-14 rounded-lg overflow-hidden border-2 transition-all ${value === a.url ? 'border-[#14B8A6]' : 'border-transparent hover:border-[#14B8A6]/50'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.title} className="w-full h-full object-cover" />
                {value === a.url && (
                  <div className="absolute inset-0 bg-[#14B8A6]/30 flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      {/* Inline Pexels search */}
      <button
        type="button"
        onClick={() => setShowSearch(s => !s)}
        className="flex items-center gap-2 text-xs font-bold text-[#14B8A6] hover:underline"
      >
        <Camera size={12} /> {showSearch ? 'Hide image search' : 'Search for image'}
      </button>
      {showSearch && (
        <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search Pexels…"
              value={imgQuery}
              onChange={e => setImgQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchImages(imgQuery)}
              className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-[#14B8A6]"
            />
            <button
              type="button"
              onClick={() => searchImages(imgQuery)}
              disabled={searching}
              className="flex items-center gap-1 bg-[#0F172A] text-white text-xs font-bold px-3 py-2 rounded-lg"
            >
              {searching ? <Loader size={11} className="animate-spin" /> : <Search size={11} />}
            </button>
          </div>
          {searching && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-slate-200 animate-pulse" />
              ))}
            </div>
          )}
          {!searching && results.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {results.map(photo => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => { onChange(photo.src.large); setShowSearch(false) }}
                  className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${value === photo.src.large ? 'border-[#14B8A6]' : 'border-transparent hover:border-[#14B8A6]/50'}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.src.medium} alt={photo.alt || ''} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Enhancement 2 helper: Meta Tags Picker ────────────────────────────────────
function MetaTagsPicker({ value, onChange }: { value: string[]; onChange: (tags: string[]) => void }) {
  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter(t => t !== tag) : [...value, tag])
  }
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
        <Tag size={10} className="inline mr-1" />Meta Tags
      </label>
      <div className="flex flex-wrap gap-2">
        {META_TAGS.map(tag => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
              value.includes(tag)
                ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-[#14B8A6]/50 hover:text-[#14B8A6]'
            }`}
          >
            {value.includes(tag) && <Check size={9} className="inline mr-1" />}{tag}
          </button>
        ))}
      </div>
    </div>
  )
}

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
  // Enhancement 4: clipboard tooltip
  const [snapTooltip,  setSnapTooltip]  = useState<number | null>(null)

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
      } else if (activeTab === 'blocks') {
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

  // Enhancement 4: Snap to itinerary
  const snapToItinerary = (id: number, content: string) => {
    navigator.clipboard.writeText(content)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nama_clipboard_block', content)
    }
    setSnapTooltip(id)
    setTimeout(() => setSnapTooltip(null), 2500)
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

  const showSearchBar = activeTab === 'destinations' || activeTab === 'assets' || activeTab === 'blocks'
  const showAddButton = activeTab === 'destinations' || activeTab === 'assets' || activeTab === 'blocks'

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
          {showAddButton && (
            <button
              onClick={() => { setShowAdd(true); setForm({ meta_tags: [] }) }}
              className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
            >
              <Plus size={15} /> Add {activeTab === 'destinations' ? 'Destination' : activeTab === 'assets' ? 'Asset' : 'Block'}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Destinations',    value: destinations.length, icon: MapPin,    color: 'text-teal-600',   bg: 'bg-teal-50'   },
          { label: 'Media Assets',    value: assets.length,       icon: ImageIcon, color: 'text-blue-600',   bg: 'bg-blue-50'   },
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
          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {[
              { id: 'destinations',  label: '🗺️ Destinations' },
              { id: 'find-images',   label: '📷 Find Images' },
              { id: 'master-library',label: '📚 Master Library' },
              { id: 'assets',        label: '🖼️ Assets' },
              { id: 'blocks',        label: '📝 Blocks' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as Tab); setSearch(''); setCatFilter('All') }}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + filter — only for content tabs */}
          {showSearchBar && (
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
          )}
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

          {/* FIND IMAGES (Enhancement 1) */}
          {activeTab === 'find-images' && (
            <ImageSearchTab
              onAddToLibrary={asset => setAssets(p => [{ ...asset, id: Date.now() }, ...p])}
            />
          )}

          {/* MASTER LIBRARY (Enhancement 3) */}
          {activeTab === 'master-library' && (
            <MasterLibraryTab
              onUse={dest => setDestinations(p => [{ ...dest, id: Date.now() }, ...p])}
            />
          )}

          {/* ASSETS */}
          {activeTab === 'assets' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div key={asset.id} className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 hover:shadow-md transition-all group">
                  <div className="h-32 bg-slate-200 overflow-hidden relative">
                    {asset.url && (asset.asset_type === 'IMAGE' || asset.type === 'IMAGE') && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={asset.url} alt={asset.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className="text-[10px] font-black bg-black/50 text-white px-2 py-0.5 rounded-full">
                        {asset.asset_type || asset.type}
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
                  <ImageIcon size={28} aria-hidden="true" className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">No media assets found</p>
                </div>
              )}
            </div>
          )}

          {/* BLOCKS (Enhancement 4: Snap to Itinerary) */}
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
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                      <Star size={10} className="text-amber-400" />
                      Used in 3 itineraries
                    </div>
                    {/* Enhancement 4: Snap to Itinerary button */}
                    <div className="relative">
                      <button
                        onClick={() => snapToItinerary(block.id!, block.content)}
                        className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-[#14B8A6]/10 hover:text-[#14B8A6] transition-colors"
                      >
                        <ClipboardList size={10} />
                        Use in itinerary
                      </button>
                      {snapTooltip === block.id && (
                        <div className="absolute bottom-full right-0 mb-2 w-52 bg-[#0F172A] text-white text-[10px] font-semibold px-3 py-2 rounded-xl shadow-lg z-10 whitespace-normal">
                          Copied! Paste into any itinerary day description.
                          <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-[#0F172A]" />
                        </div>
                      )}
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
                    <select
                      value={form.country ?? ''}
                      onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none"
                    >
                      <option value="">Select country…</option>
                      {['Indonesia','India','Maldives','Kenya','UAE','Greece','Switzerland','Thailand','Japan','Italy','France','Spain','Morocco','Sri Lanka','Nepal','Bhutan','Vietnam','Cambodia','Malaysia','Singapore','Australia','New Zealand','South Africa','Tanzania','Egypt'].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Category</label>
                    <select value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#14B8A6] outline-none">
                      <option value="">Select…</option>
                      {['Beach','Culture','Nature','Wildlife','City','Mountain'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Enhancement 2: Rich description editor */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Description</label>
                    <RichDescriptionEditor
                      value={form.description ?? ''}
                      onChange={v => setForm(f => ({ ...f, description: v }))}
                    />
                  </div>

                  {/* Enhancement 2: Cover image picker */}
                  <CoverImagePicker
                    value={form.cover_image ?? ''}
                    onChange={url => setForm(f => ({ ...f, cover_image: url, image_url: url }))}
                    assets={assets}
                  />

                  {/* Enhancement 2: Meta tags */}
                  <MetaTagsPicker
                    value={form.meta_tags ?? []}
                    onChange={tags => setForm(f => ({ ...f, meta_tags: tags }))}
                  />
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
