'use client'

import React, { useState, useEffect } from 'react'
import { vendorsApi, Vendor } from '@/lib/api'
import {
  Search,
  AlertCircle,
  Loader,
  CheckCircle,
  Star,
  MapPin,
  Phone,
  Mail,
  Tag,
  Shield,
  TrendingUp,
  Filter,
  Building2,
} from 'lucide-react'

const CATEGORIES = ['ALL', 'HOTEL', 'TRANSPORT', 'ACTIVITY', 'RESTAURANT', 'GUIDE', 'INSURANCE', 'OTHER']
const STATUSES = ['ALL', 'ACTIVE', 'INACTIVE', 'PENDING']

const categoryColors: Record<string, string> = {
  HOTEL: 'bg-violet-50 text-violet-700 border-violet-200',
  TRANSPORT: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIVITY: 'bg-orange-50 text-orange-700 border-orange-200',
  RESTAURANT: 'bg-rose-50 text-rose-700 border-rose-200',
  GUIDE: 'bg-green-50 text-green-700 border-green-200',
  INSURANCE: 'bg-slate-50 text-slate-700 border-slate-200',
  OTHER: 'bg-slate-50 text-slate-600 border-slate-200',
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-slate-100 text-slate-500',
  PENDING: 'bg-amber-50 text-amber-700',
}

// ── Seed vendors (shown when backend empty/unreachable) ───────────────────────
const BASE = { tenant_id: 1, markup_pct: 15, is_preferred: true, is_verified: true, created_at: new Date().toISOString() }
const SEED_VENDORS: Vendor[] = [
  { ...BASE, id: 1, vendor_code: 'HOT001', name: 'The Leela Palace',       category: 'HOTEL',     status: 'ACTIVE',   contact_name: 'Ramesh Kumar',  contact_email: 'reservations@leela.com',  country: 'India',     city: 'New Delhi',  default_currency: 'INR', rating: 4.9, notes: 'Premium 5-star partner, 15% rack rate discount' },
  { ...BASE, id: 2, vendor_code: 'HOT002', name: 'Taj Hotels & Resorts',   category: 'HOTEL',     status: 'ACTIVE',   contact_name: 'Sunita Sharma', contact_email: 'trade@tajhotels.com',    country: 'India',     city: 'Mumbai',     default_currency: 'INR', rating: 4.8, notes: 'Preferred partner across 12 properties' },
  { ...BASE, id: 3, vendor_code: 'TRN001', name: 'Royal Wheels India',     category: 'TRANSPORT', status: 'ACTIVE',   contact_name: 'Vikram Singh',  contact_email: 'info@royalwheels.in',   country: 'India',     city: 'Jaipur',     default_currency: 'INR', rating: 4.7, notes: 'Luxury coaches and cars, Rajasthan specialist' },
  { ...BASE, id: 4, vendor_code: 'ACT001', name: 'Bali Adventure Tours',   category: 'ACTIVITY',  status: 'ACTIVE',   contact_name: 'Made Suartini', contact_email: 'ops@baliadventure.co',  country: 'Indonesia', city: 'Ubud',       default_currency: 'USD', rating: 4.6, notes: 'White-water rafting, cycling, and temple tours' },
  { ...BASE, id: 5, vendor_code: 'HOT003', name: 'Soneva Fushi',           category: 'HOTEL',     status: 'ACTIVE',   contact_name: 'Ahmed Naseer',  contact_email: 'res@soneva.com',        country: 'Maldives',  city: 'Baa Atoll',  default_currency: 'USD', rating: 5.0, notes: 'Ultra-luxury eco resort, BYOB policy, book 90 days out' },
  { ...BASE, id: 6, vendor_code: 'GDE001', name: 'Himalayan Footsteps',    category: 'GUIDE',     status: 'ACTIVE',   contact_name: 'Tenzin Norgay', contact_email: 'guide@himfootsteps.com', country: 'India',     city: 'Manali',     default_currency: 'INR', rating: 4.8, notes: 'Licensed high-altitude guide, Ladakh + Spiti specialist' },
  { ...BASE, id: 7, vendor_code: 'RST001', name: 'Spice Garden Kerala',    category: 'RESTAURANT',status: 'ACTIVE',   contact_name: 'George Thomas', contact_email: 'ops@spicegarden.in',    country: 'India',     city: 'Alleppey',   default_currency: 'INR', rating: 4.5, notes: 'Authentic Kerala cuisine, group menus from ₹800/head' },
  { ...BASE, id: 8, vendor_code: 'TRN002', name: 'Kenya Safari Vehicles',  category: 'TRANSPORT', status: 'PENDING',  contact_name: 'James Mwangi',  contact_email: 'fleet@kenyasafari.co',  country: 'Kenya',     city: 'Nairobi',    default_currency: 'USD', rating: 4.3, notes: 'Land Cruiser fleet, Masai Mara specialist', is_preferred: false },
]

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-xs text-slate-400">No rating</span>
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
        />
      ))}
      <span className="text-xs font-bold text-slate-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  )
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [categoryFilter, statusFilter])

  const fetchVendors = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await vendorsApi.list({
        category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      })
      const items = Array.isArray(data) ? data : []
      setVendors(items.length > 0 ? items : SEED_VENDORS)
    } catch (err) {
      setVendors(SEED_VENDORS)
    } finally {
      setLoading(false)
    }
  }

  const filtered = vendors.filter((v) => {
    const s = searchTerm.toLowerCase()
    return (
      v.name.toLowerCase().includes(s) ||
      v.vendor_code.toLowerCase().includes(s) ||
      (v.city?.toLowerCase().includes(s) ?? false) ||
      (v.country?.toLowerCase().includes(s) ?? false)
    )
  })

  // Stats
  const activeCount = vendors.filter((v) => v.status === 'ACTIVE').length
  const preferredCount = vendors.filter((v) => v.is_preferred).length
  const verifiedCount = vendors.filter((v) => v.is_verified).length
  const avgMarkup =
    vendors.length > 0
      ? (vendors.reduce((sum, v) => sum + v.markup_pct, 0) / vendors.length).toFixed(1)
      : '0'

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Vendor Registry</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Manage your supply chain — hotels, transport, activities, and more.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Vendors', value: activeCount, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Preferred Partners', value: preferredCount, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Verified', value: verifiedCount, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Avg. Markup', value: `${avgMarkup}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5 flex items-center gap-4"
          >
            <div className={`w-11 h-11 ${stat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className={stat.color} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{stat.value}</div>
              <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, code, city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-slate-400" />
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none bg-white text-sm"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'ALL' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={32} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-1">No vendors found</h3>
            <p className="text-slate-500 text-sm">
              {vendors.length === 0
                ? 'No vendors have been added yet. Add your first vendor to start building your supply chain.'
                : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                className="border border-slate-100 rounded-2xl p-5 hover:border-[#14B8A6]/40 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0F172A]/5 rounded-xl flex items-center justify-center font-black text-[#0F172A] text-sm group-hover:bg-[#14B8A6]/10 transition-colors">
                      {vendor.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm leading-tight">{vendor.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{vendor.vendor_code}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        categoryColors[vendor.category] || categoryColors.OTHER
                      }`}
                    >
                      {vendor.category}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        statusColors[vendor.status] || 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </div>
                </div>

                <StarRating rating={vendor.rating} />

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  {(vendor.city || vendor.country) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="flex-shrink-0" />
                      <span>
                        {[vendor.city, vendor.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {vendor.contact_email && (
                    <div className="flex items-center gap-1.5">
                      <Mail size={11} className="flex-shrink-0" />
                      <span className="truncate">{vendor.contact_email}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    {vendor.is_preferred && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">
                        <Star size={9} fill="currentColor" /> Preferred
                      </span>
                    )}
                    {vendor.is_verified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                        <Shield size={9} /> Verified
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {vendor.markup_pct}% markup
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-400 font-medium">
            Showing {filtered.length} of {vendors.length} vendors
          </div>
        )}
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedVendor(null)}
        >
          <div
            className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#0F172A]/5 rounded-2xl flex items-center justify-center font-black text-[#0F172A] text-xl">
                  {selectedVendor.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#0F172A]">{selectedVendor.name}</h2>
                  <div className="text-sm text-slate-400 font-mono">{selectedVendor.vendor_code}</div>
                </div>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              {[
                { label: 'Category', value: selectedVendor.category },
                { label: 'Status', value: selectedVendor.status },
                { label: 'Currency', value: selectedVendor.default_currency },
                { label: 'Markup', value: `${selectedVendor.markup_pct}%` },
                { label: 'Location', value: [selectedVendor.city, selectedVendor.country].filter(Boolean).join(', ') || 'N/A' },
                { label: 'Rating', value: selectedVendor.rating ? `${selectedVendor.rating}/5` : 'N/A' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">{label}</div>
                  <div className="font-bold text-slate-800">{value}</div>
                </div>
              ))}
            </div>

            {(selectedVendor.contact_name || selectedVendor.contact_email || selectedVendor.contact_phone) && (
              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contact</div>
                {selectedVendor.contact_name && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Building2 size={14} className="text-slate-400" />
                    {selectedVendor.contact_name}
                  </div>
                )}
                {selectedVendor.contact_email && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Mail size={14} className="text-slate-400" />
                    <a href={`mailto:${selectedVendor.contact_email}`} className="hover:text-[#14B8A6] transition-colors">
                      {selectedVendor.contact_email}
                    </a>
                  </div>
                )}
                {selectedVendor.contact_phone && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <Phone size={14} className="text-slate-400" />
                    {selectedVendor.contact_phone}
                  </div>
                )}
              </div>
            )}

            {selectedVendor.tags && selectedVendor.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag size={12} className="text-slate-400" />
                  {selectedVendor.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
