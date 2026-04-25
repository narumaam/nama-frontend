'use client'

/**
 * NAMA OS — Vendor Marketplace (V5)
 * ────────────────────────────────────
 * Searchable vendor network with ratings, specialties, commissions.
 * - Marketplace discover view with featured vendors
 * - Category + destination + sort filters
 * - Vendor cards with rating, specialties, booking stats, commission
 * - Detail side panel: full profile + WhatsApp + Email + copy details
 * - Request new vendor form
 * - NAMA Verified + Preferred badges
 * - Network stats strip
 * - DMC Rate Marketplace tab (V5+)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { vendorsApi, Vendor, api } from '@/lib/api'
import {
  Search, Star, MapPin, Mail, Shield, CheckCircle,
  Building2, X, Plus, MessageCircle, Copy, Check,
  Award, Globe, Tag, Loader,
  DollarSign, Clock, ExternalLink, Sparkles,
  Plane, Car, Utensils, Ship, Zap, Info, ChevronDown, RefreshCw,
} from 'lucide-react'

// ─── Enhanced Vendor Type ──────────────────────────────────────────────────────

interface MarketplaceVendor extends Vendor {
  specialties: string[];
  destinations: string[];
  commission_pct: number;
  total_bookings: number;
  response_time_hrs: number;
  languages: string[];
  featured: boolean;
  whatsapp?: string;
  website?: string;
  bio: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = ['ALL', 'HOTEL', 'TRANSPORT', 'ACTIVITY', 'RESTAURANT', 'GUIDE', 'INSURANCE']

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'bookings', label: 'Most Booked' },
  { value: 'commission', label: 'Best Commission' },
  { value: 'response', label: 'Fastest Response' },
]

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  HOTEL:     { color: 'text-violet-700', bg: 'bg-violet-50 border-violet-100', icon: '🏨' },
  TRANSPORT: { color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100',     icon: '🚗' },
  ACTIVITY:  { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-100', icon: '⚡' },
  RESTAURANT:{ color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-100',     icon: '🍽️' },
  GUIDE:     { color: 'text-green-700',  bg: 'bg-green-50 border-green-100',   icon: '🧭' },
  INSURANCE: { color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200',   icon: '🛡️' },
  OTHER:     { color: 'text-slate-600',  bg: 'bg-slate-50 border-slate-200',   icon: '📦' },
}

// ─── Seed Data ─────────────────────────────────────────────────────────────────

const BASE = { tenant_id: 1, status: 'ACTIVE' as const, is_verified: true, created_at: new Date().toISOString() }

const SEED_VENDORS: MarketplaceVendor[] = [
  {
    ...BASE, id: 1, vendor_code: 'HOT001', name: 'Soneva Fushi', category: 'HOTEL',
    contact_name: 'Ahmed Naseer', contact_email: 'res@soneva.com', country: 'Maldives', city: 'Baa Atoll',
    default_currency: 'USD', rating: 5.0, markup_pct: 18, is_preferred: true,
    commission_pct: 18, total_bookings: 47, response_time_hrs: 2, featured: true,
    specialties: ['Overwater Villas', 'Eco Luxury', 'Honeymoon', 'BYOB Policy'],
    destinations: ['Maldives'], languages: ['English', 'Hindi'],
    whatsapp: '+9609876543', website: 'soneva.com',
    bio: 'Ultra-luxury eco-resort in Baa Atoll UNESCO Biosphere Reserve. Stunning overwater and beach villas, world-class dining, zero-footprint philosophy. Book 90 days ahead for best availability.',
    notes: 'NAMA Preferred. 18% commission. Direct contracts available.',
  },
  {
    ...BASE, id: 2, vendor_code: 'HOT002', name: 'The Layar Private Villas', category: 'HOTEL',
    contact_name: 'Putu Widiasih', contact_email: 'reservations@thelayar.com', country: 'Indonesia', city: 'Seminyak, Bali',
    default_currency: 'USD', rating: 4.9, markup_pct: 20, is_preferred: true,
    commission_pct: 20, total_bookings: 83, response_time_hrs: 1, featured: true,
    specialties: ['Private Pool Villas', 'Honeymoon Setup', 'Butler Service', 'Beachside'],
    destinations: ['Bali'], languages: ['English', 'Indonesian', 'Hindi'],
    whatsapp: '+6281234567890', website: 'thelayar.com',
    bio: 'Award-winning private pool villa resort in the heart of Seminyak. 26 one and two-bedroom villas, each with private pool. Renowned for honeymoon setups with rose petals, candles & sparkling wine.',
    notes: '20% net commission. Complimentary honeymoon setup on request.',
  },
  {
    ...BASE, id: 3, vendor_code: 'HOT003', name: 'The Leela Palace', category: 'HOTEL',
    contact_name: 'Ramesh Kumar', contact_email: 'reservations@leela.com', country: 'India', city: 'New Delhi',
    default_currency: 'INR', rating: 4.9, markup_pct: 15, is_preferred: true,
    commission_pct: 15, total_bookings: 124, response_time_hrs: 3, featured: false,
    specialties: ['Heritage Luxury', 'Weddings', 'Business Travel', 'Spa'],
    destinations: ['Rajasthan', 'New Delhi', 'Mumbai', 'Bengaluru'],
    languages: ['English', 'Hindi'], whatsapp: '+911122334455', website: 'theleela.com',
    bio: 'India\'s finest luxury hotel chain with 12 properties across major cities. 15% trade discount on rack rates. Dedicated MICE and wedding desk for group bookings.',
    notes: '15% rack rate discount for NAMA partners.',
  },
  {
    ...BASE, id: 4, vendor_code: 'ACT001', name: 'Bali Adventure Tours', category: 'ACTIVITY',
    contact_name: 'Made Suartini', contact_email: 'ops@baliadventure.co', country: 'Indonesia', city: 'Ubud, Bali',
    default_currency: 'USD', rating: 4.7, markup_pct: 25, is_preferred: true,
    commission_pct: 25, total_bookings: 156, response_time_hrs: 1, featured: true,
    specialties: ['White Water Rafting', 'ATV Rides', 'Cycling Tours', 'Temple Visits', 'Cooking Class'],
    destinations: ['Bali', 'Nusa Penida'], languages: ['English', 'Indonesian'],
    whatsapp: '+6281234567891', website: 'baliadventuretours.com',
    bio: 'Bali\'s #1 activity operator with 10+ years of experience. Safety certified, English-speaking guides, all equipment provided. Group discounts from 6 pax. Pickup included from Seminyak/Ubud.',
    notes: '25% agent commission. Daily departures. Group discounts available.',
  },
  {
    ...BASE, id: 5, vendor_code: 'TRN001', name: 'Royal Wheels India', category: 'TRANSPORT',
    contact_name: 'Vikram Singh', contact_email: 'info@royalwheels.in', country: 'India', city: 'Jaipur',
    default_currency: 'INR', rating: 4.7, markup_pct: 20, is_preferred: true,
    commission_pct: 20, total_bookings: 211, response_time_hrs: 1, featured: false,
    specialties: ['Luxury Coaches', 'Palace on Wheels', 'Heritage Cars', 'Airport Transfers'],
    destinations: ['Rajasthan', 'Delhi', 'Agra', 'Golden Triangle'],
    languages: ['English', 'Hindi', 'French'], whatsapp: '+919876543210', website: 'royalwheels.in',
    bio: 'Rajasthan\'s premium ground transport specialist. Fleet of luxury vehicles from Innova Crysta to heritage Enfield motorcycles. Specialist for Golden Triangle and Rajasthan heritage circuits.',
    notes: '20% agent margin. All drivers English-speaking, background verified.',
  },
  {
    ...BASE, id: 6, vendor_code: 'GDE001', name: 'Himalayan Footsteps', category: 'GUIDE',
    contact_name: 'Tenzin Norgay', contact_email: 'guide@himfootsteps.com', country: 'India', city: 'Manali',
    default_currency: 'INR', rating: 4.8, markup_pct: 30, is_preferred: true,
    commission_pct: 30, total_bookings: 68, response_time_hrs: 4, featured: false,
    specialties: ['High Altitude Trekking', 'Ladakh Circuits', 'Spiti Valley', 'Cultural Immersion'],
    destinations: ['Leh Ladakh', 'Spiti Valley', 'Manali', 'Kedarnath'],
    languages: ['English', 'Hindi', 'Tibetan'], whatsapp: '+919988776655', website: '',
    bio: 'Licensed high-altitude guide with 15 years of Himalayan experience. Specialises in Ladakh, Spiti, and Zanskar. All permits arranged, emergency first aid certified. Small groups only (max 8).',
    notes: '30% commission. Peak season: May–September. Advance booking required.',
  },
  {
    ...BASE, id: 7, vendor_code: 'ACT002', name: 'Nomad Experiences Kenya', category: 'ACTIVITY',
    contact_name: 'James Mwangi', contact_email: 'james@nomadkenya.co', country: 'Kenya', city: 'Nairobi',
    default_currency: 'USD', rating: 4.8, markup_pct: 22, is_preferred: false,
    commission_pct: 22, total_bookings: 34, response_time_hrs: 6, featured: true,
    specialties: ['Big Five Safari', 'Hot Air Balloon', 'Maasai Village', 'Great Migration'],
    destinations: ['Kenya', 'Tanzania'],
    languages: ['English', 'Swahili'], whatsapp: '+254712345678', website: 'nomadkenya.co',
    bio: 'Kenya\'s premium safari operator. Private game drives in custom Land Cruisers, balloon safaris over Masai Mara, authentic Maasai cultural experiences. Great Migration specialist (Jul–Oct).',
    notes: '22% net commission. FIT and group rates available.',
  },
  {
    ...BASE, id: 8, vendor_code: 'INS001', name: 'Bajaj Allianz Travel Guard', category: 'INSURANCE',
    contact_name: 'Divya Sharma', contact_email: 'travel@bajajallianz.com', country: 'India', city: 'Pune',
    default_currency: 'INR', rating: 4.5, markup_pct: 15, is_preferred: true,
    commission_pct: 15, total_bookings: 342, response_time_hrs: 2, featured: false,
    specialties: ['Medical Emergency', 'Trip Cancellation', 'Baggage Loss', 'Adventure Cover'],
    destinations: ['Worldwide'], languages: ['English', 'Hindi'],
    whatsapp: '+911800209090', website: 'bajajallianz.com',
    bio: 'India\'s leading travel insurance provider. Comprehensive plans starting ₹199/day. Cashless hospitalisation in 190+ countries. 24/7 emergency assistance. API integration available for bulk issuance.',
    notes: '15% agent commission. Instant policy issuance. API available.',
  },
  {
    ...BASE, id: 9, vendor_code: 'RST001', name: 'Spice Garden Kerala', category: 'RESTAURANT',
    contact_name: 'George Thomas', contact_email: 'ops@spicegarden.in', country: 'India', city: 'Alleppey',
    default_currency: 'INR', rating: 4.5, markup_pct: 20, is_preferred: false,
    commission_pct: 20, total_bookings: 89, response_time_hrs: 2, featured: false,
    specialties: ['Kerala Sadya', 'Seafood', 'Group Menus', 'Houseboat Dining'],
    destinations: ['Kerala', 'Goa'],
    languages: ['English', 'Malayalam', 'Hindi'], whatsapp: '+919876543211', website: '',
    bio: 'Authentic Kerala cuisine with stunning backwater views. Group menus from ₹800/head. Houseboat dining packages available. Cooking demonstrations for tourist groups. Preferred by major hotel chains.',
    notes: '20% commission on group bookings of 10+ pax.',
  },
  {
    ...BASE, id: 10, vendor_code: 'TRN003', name: 'Dubai Luxury Fleet', category: 'TRANSPORT',
    contact_name: 'Mohammed Al Rashid', contact_email: 'ops@dubailuxuryfleet.ae', country: 'UAE', city: 'Dubai',
    default_currency: 'USD', rating: 4.6, markup_pct: 18, is_preferred: false,
    commission_pct: 18, total_bookings: 178, response_time_hrs: 1, featured: false,
    specialties: ['Rolls Royce Transfers', 'Desert Safari Pickup', 'Airport VIP', 'Yacht Charter'],
    destinations: ['Dubai', 'Abu Dhabi'],
    languages: ['English', 'Arabic', 'Hindi'], whatsapp: '+971501234567', website: 'dubailuxuryfleet.ae',
    bio: 'Dubai\'s premium chauffeur service with a fleet of 50+ luxury vehicles including Rolls Royce, Mercedes S-Class, and GMC Yukon. Desert safari pickups, airport VIP, and private yacht charter.',
    notes: '18% commission. Real-time GPS tracking. 24/7 operations.',
  },
]

// ─── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({ rating, size = 12 }: { rating?: number; size?: number }) {
  if (!rating) return <span className="text-xs text-slate-400">No rating</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
      ))}
      <span className="text-xs font-bold text-slate-600 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

// ─── Vendor Card ──────────────────────────────────────────────────────────────

function VendorCard({ vendor, onSelect }: { vendor: MarketplaceVendor; onSelect: () => void }) {
  const cat = CATEGORY_CONFIG[vendor.category] || CATEGORY_CONFIG.OTHER
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl border ${vendor.featured ? 'border-[#14B8A6]/40 shadow-md shadow-[#14B8A6]/5' : 'border-slate-200 shadow-sm'} p-5 hover:shadow-lg hover:border-[#14B8A6]/50 transition-all cursor-pointer group relative overflow-hidden`}
    >
      {vendor.featured && (
        <div className="absolute top-0 right-0 bg-[#14B8A6] text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-bl-xl">
          Featured
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${cat.bg} border`}>
          {cat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-800 text-sm truncate">{vendor.name}</span>
            {vendor.is_verified && <Shield size={12} className="text-[#14B8A6] flex-shrink-0" />}
            {vendor.is_preferred && <Award size={12} className="text-amber-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin size={10} className="text-slate-400" />
            <span className="text-xs text-slate-500 truncate">{vendor.city}, {vendor.country}</span>
          </div>
        </div>
      </div>

      {/* Rating + Bookings */}
      <div className="flex items-center justify-between mb-3">
        <StarRating rating={vendor.rating} />
        <div className="text-xs text-slate-400 font-medium">{vendor.total_bookings} bookings</div>
      </div>

      {/* Specialties */}
      <div className="flex flex-wrap gap-1 mb-3">
        {vendor.specialties.slice(0, 3).map(s => (
          <span key={s} className="text-[10px] font-semibold bg-slate-50 border border-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
            {s}
          </span>
        ))}
        {vendor.specialties.length > 3 && (
          <span className="text-[10px] font-semibold text-slate-400 px-1 py-0.5">+{vendor.specialties.length - 3}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <DollarSign size={11} className="text-green-600" />
          <span className="text-xs font-bold text-green-700">{vendor.commission_pct}% commission</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} className="text-slate-400" />
          <span className="text-[11px] text-slate-400">{vendor.response_time_hrs}h response</span>
        </div>
      </div>
    </div>
  )
}

// ─── Vendor Detail Panel ──────────────────────────────────────────────────────

function VendorDetailPanel({ vendor, onClose }: { vendor: MarketplaceVendor; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const cat = CATEGORY_CONFIG[vendor.category] || CATEGORY_CONFIG.OTHER

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex" onClick={onClose}>
      <div className="ml-auto h-full w-full max-w-md bg-white overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${cat.bg} border`}>{cat.icon}</div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-extrabold text-[#0F172A] text-base">{vendor.name}</h2>
                {vendor.is_verified && <Shield size={13} className="text-[#14B8A6]" />}
                {vendor.is_preferred && <Award size={13} className="text-amber-500" />}
              </div>
              <div className="text-xs text-slate-400">{vendor.category} · {vendor.city}, {vendor.country}</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Rating + Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <StarRating rating={vendor.rating} size={14} />
              <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wide mt-1">Rating</div>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-green-700">{vendor.commission_pct}%</div>
              <div className="text-[10px] text-green-700 font-bold uppercase tracking-wide">Commission</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-xl font-black text-blue-700">{vendor.response_time_hrs}h</div>
              <div className="text-[10px] text-blue-700 font-bold uppercase tracking-wide">Response</div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">About</div>
            <p className="text-sm text-slate-700 leading-relaxed">{vendor.bio}</p>
          </div>

          {/* Specialties */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Specialties</div>
            <div className="flex flex-wrap gap-1.5">
              {vendor.specialties.map(s => (
                <span key={s} className="text-xs font-semibold bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>

          {/* Destinations */}
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Destinations</div>
            <div className="flex flex-wrap gap-1.5">
              {vendor.destinations.map(d => (
                <span key={d} className="flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                  <MapPin size={10} />{d}
                </span>
              ))}
            </div>
          </div>

          {/* Languages */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Globe size={14} className="text-slate-400" />
            <span className="font-medium">Languages:</span>
            <span className="text-slate-500">{vendor.languages.join(', ')}</span>
          </div>

          {/* Contact */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contact</div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-800 text-sm">{vendor.contact_name}</div>
                <div className="text-xs text-slate-500">{vendor.contact_email}</div>
              </div>
              <button onClick={() => copy(vendor.contact_email || '', 'email')} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition-colors">
                {copied === 'email' ? <Check size={13} className="text-green-500" /> : <Copy size={13} className="text-slate-400" />}
              </button>
            </div>

            {vendor.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
                <span className="font-bold">Agent Notes: </span>{vendor.notes}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            {vendor.whatsapp && (
              <a
                href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${vendor.contact_name}! I'm from NAMA Travel and would like to discuss booking options for our clients.`)}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-green-600 transition-colors"
              >
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            <a
              href={`mailto:${vendor.contact_email}?subject=Booking Enquiry — NAMA Travel&body=Hi ${vendor.contact_name},%0D%0A%0D%0AThis is from NAMA Travel. I'd like to discuss availability and rates for our clients.%0D%0A%0D%0AThank you.`}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors"
            >
              <Mail size={15} /> Email
            </a>
            {vendor.website && (
              <a
                href={`https://${vendor.website}`} target="_blank" rel="noopener noreferrer"
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                <ExternalLink size={14} /> Visit Website
              </a>
            )}
          </div>

          {/* Booking stats */}
          <div className="bg-[#0f172a] rounded-2xl p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#14B8A6] mb-3">NAMA Network Stats</div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Bookings', value: vendor.total_bookings },
                { label: 'Avg Response', value: `${vendor.response_time_hrs}h` },
                { label: 'Commission', value: `${vendor.commission_pct}%` },
                { label: 'Status', value: vendor.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</div>
                  <div className="text-white font-bold text-sm mt-0.5">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DMC Rate Marketplace Types ───────────────────────────────────────────────

interface DmcRate {
  id: number
  vendor_id: number
  vendor_name: string
  is_verified: boolean
  category: 'HOTEL' | 'AIRLINE' | 'TRANSFER' | 'ACTIVITY' | 'RESTAURANT' | 'CRUISE'
  country: string
  city: string
  description: string
  season: 'HIGH' | 'LOW' | 'PEAK' | 'STANDARD'
  price_gross: number
  price_gross_child?: number
  child_age_min?: number
  child_age_max?: number
  valid_from: string
  valid_to: string
  currency: string
  is_public: boolean
}

// ─── DMC Rate Seed Data ────────────────────────────────────────────────────────

const SEED_DMC_RATES: DmcRate[] = [
  {
    id: 1, vendor_id: 1, vendor_name: 'Soneva Fushi', is_verified: true,
    category: 'HOTEL', country: 'Maldives', city: 'Baa Atoll',
    description: 'Water Villa (per night, 2 adults) — Full Board',
    season: 'HIGH', price_gross: 145000, currency: 'INR',
    valid_from: '2026-01-01', valid_to: '2026-03-31', is_public: true,
  },
  {
    id: 2, vendor_id: 1, vendor_name: 'Soneva Fushi', is_verified: true,
    category: 'HOTEL', country: 'Maldives', city: 'Baa Atoll',
    description: 'Water Villa (per night, 2 adults) — Full Board',
    season: 'LOW', price_gross: 98000, currency: 'INR',
    valid_from: '2026-05-01', valid_to: '2026-09-30', is_public: true,
  },
  {
    id: 3, vendor_id: 2, vendor_name: 'The Layar Private Villas', is_verified: true,
    category: 'HOTEL', country: 'Indonesia', city: 'Seminyak, Bali',
    description: '1BR Pool Villa (per night) — Breakfast Included',
    season: 'PEAK', price_gross: 52000, currency: 'INR',
    valid_from: '2025-12-20', valid_to: '2026-01-05', is_public: true,
  },
  {
    id: 4, vendor_id: 4, vendor_name: 'Bali Adventure Tours', is_verified: true,
    category: 'ACTIVITY', country: 'Indonesia', city: 'Ubud, Bali',
    description: 'White Water Rafting — Grade 3, 2hr, lunch included',
    season: 'STANDARD', price_gross: 3200, price_gross_child: 2400,
    child_age_min: 8, child_age_max: 15, currency: 'INR',
    valid_from: '2026-01-01', valid_to: '2026-12-31', is_public: true,
  },
  {
    id: 5, vendor_id: 5, vendor_name: 'Royal Wheels India', is_verified: true,
    category: 'TRANSFER', country: 'India', city: 'Jaipur',
    description: 'Delhi → Agra → Jaipur Golden Triangle (Toyota Innova, per vehicle)',
    season: 'HIGH', price_gross: 18500, currency: 'INR',
    valid_from: '2026-10-01', valid_to: '2027-03-31', is_public: true,
  },
  {
    id: 6, vendor_id: 7, vendor_name: 'Nomad Experiences Kenya', is_verified: false,
    category: 'ACTIVITY', country: 'Kenya', city: 'Nairobi',
    description: 'Full Day Private Safari — Masai Mara, 10hr, all meals',
    season: 'PEAK', price_gross: 38000, price_gross_child: 28000,
    child_age_min: 5, child_age_max: 12, currency: 'INR',
    valid_from: '2026-07-01', valid_to: '2026-10-31', is_public: true,
  },
  {
    id: 7, vendor_id: 10, vendor_name: 'Dubai Luxury Fleet', is_verified: false,
    category: 'TRANSFER', country: 'UAE', city: 'Dubai',
    description: 'Dubai Airport → Hotel (Rolls Royce Ghost, 1-way)',
    season: 'STANDARD', price_gross: 12500, currency: 'INR',
    valid_from: '2026-01-01', valid_to: '2026-12-31', is_public: true,
  },
  {
    id: 8, vendor_id: 9, vendor_name: 'Spice Garden Kerala', is_verified: false,
    category: 'RESTAURANT', country: 'India', city: 'Alleppey',
    description: 'Kerala Sadya Group Meal — 12-course, min 10 pax (per head)',
    season: 'STANDARD', price_gross: 950, currency: 'INR',
    valid_from: '2026-01-01', valid_to: '2026-12-31', is_public: true,
  },
  {
    id: 9, vendor_id: 3, vendor_name: 'The Leela Palace', is_verified: true,
    category: 'HOTEL', country: 'India', city: 'New Delhi',
    description: 'Deluxe Room (per night, 2 adults) — Breakfast Included',
    season: 'HIGH', price_gross: 28000, currency: 'INR',
    valid_from: '2026-10-01', valid_to: '2027-03-31', is_public: true,
  },
  {
    id: 10, vendor_id: 3, vendor_name: 'The Leela Palace', is_verified: true,
    category: 'HOTEL', country: 'India', city: 'New Delhi',
    description: 'Deluxe Room (per night, 2 adults) — Breakfast Included',
    season: 'LOW', price_gross: 18500, currency: 'INR',
    valid_from: '2026-04-01', valid_to: '2026-09-30', is_public: true,
  },
]

// ─── DMC Constants ─────────────────────────────────────────────────────────────

const DMC_CATEGORIES = ['All', 'Hotel', 'Airline', 'Transfer', 'Activity', 'Restaurant', 'Cruise'] as const
const DMC_SEASONS = ['All', 'HIGH', 'LOW', 'PEAK', 'STANDARD'] as const

const SEASON_CONFIG: Record<string, { color: string; bg: string }> = {
  HIGH:     { color: 'text-orange-700', bg: 'bg-orange-100' },
  PEAK:     { color: 'text-red-700',    bg: 'bg-red-100' },
  LOW:      { color: 'text-green-700',  bg: 'bg-green-100' },
  STANDARD: { color: 'text-slate-600',  bg: 'bg-slate-100' },
}

function categoryIcon(cat: string, size = 14) {
  switch (cat.toUpperCase()) {
    case 'HOTEL':      return <Building2 size={size} />
    case 'AIRLINE':    return <Plane size={size} />
    case 'TRANSFER':   return <Car size={size} />
    case 'ACTIVITY':   return <Zap size={size} />
    case 'RESTAURANT': return <Utensils size={size} />
    case 'CRUISE':     return <Ship size={size} />
    default:           return <Tag size={size} />
  }
}

function formatValidDates(from: string, to: string): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const f = new Date(from)
  const t = new Date(to)
  const fromStr = `${months[f.getMonth()]} ${f.getFullYear()}`
  const toStr = `${months[t.getMonth()]} ${t.getFullYear()}`
  return fromStr === toStr ? fromStr : `${months[f.getMonth()]}–${months[t.getMonth()]} ${t.getFullYear()}`
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────────

function SkeletonRateCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-slate-100 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-100 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-slate-100 rounded w-full mb-2" />
      <div className="h-3 bg-slate-100 rounded w-4/5 mb-4" />
      <div className="h-7 bg-slate-100 rounded w-1/3 mb-3" />
      <div className="h-10 bg-slate-100 rounded-xl w-full" />
    </div>
  )
}

// ─── DMC Rate Card ─────────────────────────────────────────────────────────────

function DmcRateCard({ rate, onSnap, snapped }: { rate: DmcRate; onSnap: (id: number) => void; snapped: boolean }) {
  const [snapping, setSnapping] = useState(false)
  const season = SEASON_CONFIG[rate.season] || SEASON_CONFIG.STANDARD

  async function handleSnap() {
    if (snapped || snapping) return
    setSnapping(true)
    await onSnap(rate.id)
    setSnapping(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
          {categoryIcon(rate.category)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-slate-800 text-sm truncate">{rate.vendor_name}</span>
            {rate.is_verified && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-[#14B8A6]">
                <CheckCircle size={10} /> Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">
              DMC
            </span>
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MapPin size={9} /> {rate.city}, {rate.country}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{rate.description}</p>

      {/* Season + Valid */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${season.bg} ${season.color}`}>
          {rate.season}
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          Valid: {formatValidDates(rate.valid_from, rate.valid_to)}
        </span>
      </div>

      {/* Price */}
      <div>
        <div className="text-2xl font-black text-[#0F172A]">
          ₹{rate.price_gross.toLocaleString('en-IN')}
          <span className="text-xs font-semibold text-slate-400 ml-1">/ adult</span>
        </div>
        {rate.price_gross_child != null && (
          <div className="text-xs text-slate-500 mt-0.5 font-medium">
            Child (ages {rate.child_age_min}–{rate.child_age_max}): ₹{rate.price_gross_child.toLocaleString('en-IN')}
          </div>
        )}
      </div>

      {/* CTA */}
      {snapped ? (
        <button
          disabled
          className="w-full py-2.5 rounded-xl bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center gap-1.5 cursor-default"
        >
          <Check size={14} /> Added ✓
        </button>
      ) : (
        <button
          onClick={handleSnap}
          disabled={snapping}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60"
        >
          {snapping ? <Loader size={14} className="animate-spin" /> : null}
          {snapping ? 'Adding…' : 'Use This Rate'}
        </button>
      )}
      {snapped && (
        <p className="text-center text-xs text-green-600 font-medium -mt-1">
          Added to your vendor library ✓
        </p>
      )}
    </div>
  )
}

// ─── Toast ──────────────────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])
  return (
    <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
      <CheckCircle size={16} className="text-[#14B8A6] flex-shrink-0" />
      {message}
      <button onClick={onDismiss} className="ml-1 text-slate-400 hover:text-white"><X size={14} /></button>
    </div>
  )
}

// ─── DMC Rate Marketplace Tab ──────────────────────────────────────────────────

function RateMarketplaceTab() {
  const [rates, setRates] = useState<DmcRate[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [seasonFilter, setSeasonFilter] = useState<string>('All')
  const [search, setSearch] = useState('')
  const [snappedIds, setSnappedIds] = useState<Set<number>>(new Set())
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [showDmcTooltip, setShowDmcTooltip] = useState(false)
  const PER_PAGE = 20

  const fetchRates = useCallback(async (pg: number, append = false) => {
    try {
      const params = new URLSearchParams({ page: String(pg), per_page: String(PER_PAGE) })
      if (categoryFilter !== 'All') params.set('category', categoryFilter.toUpperCase())
      if (seasonFilter !== 'All') params.set('season', seasonFilter)
      const data = await api.get<{ items: DmcRate[]; total: number } | DmcRate[]>(`/api/v1/marketplace/rates?${params}`)
      const items = Array.isArray(data) ? data : (data as { items: DmcRate[] }).items ?? []
      const total = Array.isArray(data) ? items.length : (data as { total: number }).total ?? items.length
      if (append) {
        setRates(prev => [...prev, ...items])
      } else {
        setRates(items.length > 0 ? items : SEED_DMC_RATES)
      }
      setHasMore(pg * PER_PAGE < total)
    } catch {
      if (!append) setRates(SEED_DMC_RATES)
      setHasMore(false)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [categoryFilter, seasonFilter])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchRates(1, false)
  }, [fetchRates])

  async function handleLoadMore() {
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    await fetchRates(next, true)
  }

  async function handleSnap(rateId: number) {
    try {
      await api.post(`/api/v1/marketplace/rates/${rateId}/snap`, {})
    } catch {
      // best-effort — still mark as snapped locally
    }
    setSnappedIds(prev => new Set([...prev, rateId]))
    const rate = rates.find(r => r.id === rateId)
    if (rate) setToast(`Rate snapped to your library! Find it in Vendors → ${rate.vendor_name}`)
  }

  // Client-side search filter (country or vendor name)
  const filtered = useMemo(() => {
    let list = rates
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.vendor_name.toLowerCase().includes(q) ||
        r.country.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q)
      )
    }
    return list
  }, [rates, search])

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Category dropdown */}
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold text-slate-700 outline-none cursor-pointer appearance-none"
          >
            {DMC_CATEGORIES.map(c => <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Season dropdown */}
        <div className="relative">
          <select
            value={seasonFilter}
            onChange={e => setSeasonFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl pl-3 pr-8 py-2.5 text-sm font-semibold text-slate-700 outline-none cursor-pointer appearance-none"
          >
            {DMC_SEASONS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Seasons' : s}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex-1 min-w-[200px]">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by country or vendor name…"
            className="bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400 w-full"
          />
          {search && <button onClick={() => setSearch('')}><X size={13} className="text-slate-400 hover:text-slate-600" /></button>}
        </div>

        {/* DMC badge tooltip */}
        <div className="relative flex-shrink-0">
          <button
            onMouseEnter={() => setShowDmcTooltip(true)}
            onFocus={() => setShowDmcTooltip(true)}
            onMouseLeave={() => setShowDmcTooltip(false)}
            onBlur={() => setShowDmcTooltip(false)}
            className="flex items-center gap-1.5 bg-indigo-100 text-indigo-700 font-black text-xs px-2.5 py-2 rounded-lg cursor-help select-none"
          >
            <span>DMC</span>
            <Info size={12} />
          </button>
          {showDmcTooltip && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-[#0F172A] text-white text-xs rounded-xl p-3 leading-relaxed shadow-xl z-30">
              Rates published by verified DMC partners. You see gross rates — your cost to buy.
              <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#0F172A] rotate-45" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRateCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
          <Building2 size={32} className="text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">No public rates available yet</h3>
          <p className="text-sm text-slate-400">DMCs will publish their rates here.</p>
          {(categoryFilter !== 'All' || seasonFilter !== 'All' || search) && (
            <button
              onClick={() => { setCategoryFilter('All'); setSeasonFilter('All'); setSearch('') }}
              className="mt-4 text-sm font-bold text-[#14B8A6] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(r => (
              <DmcRateCard
                key={r.id}
                rate={r}
                snapped={snappedIds.has(r.id)}
                onSnap={handleSnap}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {loadingMore ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function VendorsPage() {
  const [activeTab, setActiveTab] = useState<'network' | 'rates'>('network')
  const [vendors, setVendors] = useState<MarketplaceVendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('rating')
  const [selected, setSelected] = useState<MarketplaceVendor | null>(null)
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [requestSubmitted, setRequestSubmitted] = useState(false)
  const [requestVendor, setRequestVendor] = useState({ name: '', category: 'HOTEL', destination: '', email: '', notes: '' })

  useEffect(() => {
    vendorsApi.list({}).then((data) => {
      const items = Array.isArray(data) ? data : []
      // Empty array on success = real new-tenant zero state. SEED is only for network failure.
      setVendors(items as MarketplaceVendor[])
    }).catch(() => setVendors(SEED_VENDORS))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let list = vendors
    if (category !== 'ALL') list = list.filter(v => v.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.city?.toLowerCase().includes(q) ||
        v.country?.toLowerCase().includes(q) ||
        v.specialties?.some(s => s.toLowerCase().includes(q)) ||
        v.destinations?.some(d => d.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) =>
      sortBy === 'rating' ? (b.rating || 0) - (a.rating || 0) :
      sortBy === 'bookings' ? b.total_bookings - a.total_bookings :
      sortBy === 'commission' ? b.commission_pct - a.commission_pct :
      a.response_time_hrs - b.response_time_hrs
    )
  }, [vendors, category, search, sortBy])

  const featured = filtered.filter(v => v.featured)
  const rest = filtered.filter(v => !v.featured)

  const totalCommission = vendors.reduce((s, v) => s + v.commission_pct, 0) / (vendors.length || 1)
  const avgRating = vendors.reduce((s, v) => s + (v.rating || 0), 0) / (vendors.length || 1)
  const totalBookings = vendors.reduce((s, v) => s + v.total_bookings, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Vendor Marketplace</h1>
          <p className="text-slate-500 mt-2 font-medium">NAMA&apos;s curated network of verified travel partners — hotels, guides, activities and more.</p>
        </div>
        {activeTab === 'network' && (
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center gap-2 bg-[#0f172a] text-white px-5 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"
          >
            <Plus size={16} /> Request Vendor
          </button>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 w-fit">
        <button
          onClick={() => setActiveTab('network')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'network' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Vendor Network
        </button>
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'rates' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Rate Marketplace
          <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-md">DMC</span>
        </button>
      </div>

      {activeTab === 'rates' ? (
        <RateMarketplaceTab />
      ) : (
        <>
          {/* Network Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Verified Partners', value: String(vendors.filter(v => v.is_verified).length), icon: Shield, color: 'bg-[#14B8A6] text-white' },
              { label: 'Avg Commission', value: `${totalCommission.toFixed(0)}%`, icon: DollarSign, color: 'bg-green-500 text-white' },
              { label: 'Avg Rating', value: avgRating.toFixed(1), icon: Star, color: 'bg-amber-500 text-white' },
              { label: 'Total Bookings', value: String(totalBookings), icon: CheckCircle, color: 'bg-violet-500 text-white' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className="text-2xl font-black text-[#0F172A]">{value}</div>
                  <div className="text-xs text-slate-400 font-medium">{label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Search + Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex-1 min-w-[200px]">
              <Search size={15} className="text-slate-400 flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search vendors, destinations, specialties…"
                className="bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400 w-full"
              />
              {search && <button onClick={() => setSearch('')}><X size={14} className="text-slate-400 hover:text-slate-600" /></button>}
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto flex-shrink-0">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${category === cat ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}>
                  {cat === 'ALL' ? `All (${vendors.length})` : `${CATEGORY_CONFIG[cat]?.icon || ''} ${cat}`}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader size={28} className="animate-spin text-slate-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center">
              <Building2 size={32} className="text-slate-300 mx-auto mb-4" />
              <h3 className="font-bold text-slate-600 mb-2">No vendors found</h3>
              <p className="text-sm text-slate-400 mb-5">Try a different category or search term.</p>
              <button onClick={() => { setSearch(''); setCategory('ALL'); }} className="text-sm font-bold text-[#14B8A6] hover:underline">Clear filters</button>
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles size={16} className="text-[#14B8A6]" />
                    <h2 className="font-extrabold text-slate-800">Featured Partners</h2>
                    <span className="text-xs text-slate-400 font-medium">{featured.length} vendors</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {featured.map(v => <VendorCard key={v.id} vendor={v} onSelect={() => setSelected(v)} />)}
                  </div>
                </div>
              )}

              {/* Rest */}
              {rest.length > 0 && (
                <div>
                  {featured.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <Building2 size={16} className="text-slate-500" />
                      <h2 className="font-extrabold text-slate-800">All Partners</h2>
                      <span className="text-xs text-slate-400 font-medium">{rest.length} vendors</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {rest.map(v => <VendorCard key={v.id} vendor={v} onSelect={() => setSelected(v)} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Request Vendor Modal */}
          {showRequestForm && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-extrabold text-[#0F172A]">Request New Vendor</h2>
                  <button onClick={() => { setShowRequestForm(false); setRequestSubmitted(false); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
                </div>
                {requestSubmitted ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={28} className="text-green-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Request Submitted!</h3>
                    <p className="text-slate-500 text-sm">The NAMA team will vet and add this vendor within 48 hours.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[
                      { label: 'Vendor Name', key: 'name', type: 'text', placeholder: 'e.g. Aman Resorts' },
                      { label: 'Destination', key: 'destination', type: 'text', placeholder: 'e.g. Udaipur, Rajasthan' },
                      { label: 'Contact Email', key: 'email', type: 'email', placeholder: 'vendor@email.com' },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key}>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
                        <input type={type} value={requestVendor[key as keyof typeof requestVendor]} onChange={e => setRequestVendor(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6]" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                      <select value={requestVendor.category} onChange={e => setRequestVendor(p => ({ ...p, category: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] bg-white">
                        {CATEGORIES.filter(c => c !== 'ALL').map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Why add this vendor?</label>
                      <textarea value={requestVendor.notes} onChange={e => setRequestVendor(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Any context about pricing, specialties, or why you need this vendor…" rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#14B8A6] resize-none" />
                    </div>
                    <button
                      onClick={() => setRequestSubmitted(true)}
                      disabled={!requestVendor.name || !requestVendor.destination}
                      className="w-full py-3 rounded-xl bg-[#14B8A6] text-white font-bold text-sm hover:bg-teal-600 transition-colors disabled:opacity-40"
                    >
                      Submit Request
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {selected && <VendorDetailPanel vendor={selected} onClose={() => setSelected(null)} />}
        </>
      )}
    </div>
  )
}
