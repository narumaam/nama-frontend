'use client'

import React, { useState } from 'react'
import {
  Users, Search, MapPin, Phone, Mail, Calendar,
  Briefcase, TrendingUp, Star, ChevronRight, Filter,
  MessageSquare, Eye, Clock, Award, Globe, Tag,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  email: string
  phone: string
  city: string
  country: string
  // Relationship
  total_bookings: number
  total_spend: number
  last_booking_date: string
  first_booking_date: string
  status: 'active' | 'inactive' | 'vip'
  assigned_agent: string
  tags: string[]
  // Preferences
  preferred_destinations: string[]
  travel_type: string
  // Last interaction
  last_contact: string
  open_leads: number
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CLIENTS: Client[] = [
  {
    id: '1', name: 'Rajesh Mehta', email: 'rajesh.m@gmail.com', phone: '+91 98765 43210',
    city: 'Mumbai', country: 'India',
    total_bookings: 6, total_spend: 1840000, last_booking_date: '2026-04-10',
    first_booking_date: '2024-11-15', status: 'vip', assigned_agent: 'Priya Sharma',
    tags: ['VIP', 'Honeymoon', 'Luxury'],
    preferred_destinations: ['Maldives', 'Bali', 'Switzerland'], travel_type: 'Luxury',
    last_contact: '2026-04-15T10:30:00Z', open_leads: 1,
  },
  {
    id: '2', name: 'Ananya Singh', email: 'ananya.s@outlook.com', phone: '+91 87654 32109',
    city: 'Delhi', country: 'India',
    total_bookings: 4, total_spend: 920000, last_booking_date: '2026-03-22',
    first_booking_date: '2025-02-10', status: 'active', assigned_agent: 'Rahul Verma',
    tags: ['Family', 'Budget-conscious'],
    preferred_destinations: ['Kerala', 'Rajasthan', 'Goa'], travel_type: 'Family',
    last_contact: '2026-04-12T14:20:00Z', open_leads: 0,
  },
  {
    id: '3', name: 'Karan Nair', email: 'karan.n@company.io', phone: '+91 76543 21098',
    city: 'Bangalore', country: 'India',
    total_bookings: 8, total_spend: 2640000, last_booking_date: '2026-04-14',
    first_booking_date: '2024-06-01', status: 'vip', assigned_agent: 'Priya Sharma',
    tags: ['VIP', 'Corporate', 'Repeat'],
    preferred_destinations: ['Dubai', 'Singapore', 'Japan'], travel_type: 'Corporate',
    last_contact: '2026-04-16T09:00:00Z', open_leads: 2,
  },
  {
    id: '4', name: 'Meera Patel', email: 'meera.p@gmail.com', phone: '+91 65432 10987',
    city: 'Ahmedabad', country: 'India',
    total_bookings: 2, total_spend: 340000, last_booking_date: '2026-02-14',
    first_booking_date: '2025-08-20', status: 'active', assigned_agent: 'Divya K.',
    tags: ['Honeymoon', 'First-time'],
    preferred_destinations: ['Bali', 'Thailand'], travel_type: 'Honeymoon',
    last_contact: '2026-03-30T11:45:00Z', open_leads: 1,
  },
  {
    id: '5', name: 'Sanjay Rao', email: 'sanjay.r@startup.com', phone: '+91 54321 09876',
    city: 'Hyderabad', country: 'India',
    total_bookings: 1, total_spend: 180000, last_booking_date: '2025-12-20',
    first_booking_date: '2025-12-20', status: 'inactive', assigned_agent: 'Anil Gupta',
    tags: ['Adventure'],
    preferred_destinations: ['Uttarakhand', 'Ladakh'], travel_type: 'Adventure',
    last_contact: '2026-01-10T08:00:00Z', open_leads: 0,
  },
  {
    id: '6', name: 'Pooja Joshi', email: 'pooja.j@email.com', phone: '+91 43210 98765',
    city: 'Pune', country: 'India',
    total_bookings: 3, total_spend: 560000, last_booking_date: '2026-04-05',
    first_booking_date: '2025-04-12', status: 'active', assigned_agent: 'Rahul Verma',
    tags: ['Group', 'Cultural'],
    preferred_destinations: ['Europe', 'Japan', 'Vietnam'], travel_type: 'Cultural',
    last_contact: '2026-04-08T16:30:00Z', open_leads: 1,
  },
  {
    id: '7', name: 'Amit Desai', email: 'amit.d@business.in', phone: '+91 32109 87654',
    city: 'Surat', country: 'India',
    total_bookings: 5, total_spend: 1120000, last_booking_date: '2026-03-30',
    first_booking_date: '2025-01-05', status: 'active', assigned_agent: 'Priya Sharma',
    tags: ['MICE', 'Corporate'],
    preferred_destinations: ['Bangkok', 'Singapore', 'Dubai'], travel_type: 'MICE',
    last_contact: '2026-04-02T13:15:00Z', open_leads: 0,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)   return `${d} days ago`
  if (d < 30)  return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function avatarColor(name: string) {
  const colors = ['from-teal-400 to-cyan-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500',
    'from-amber-400 to-orange-500', 'from-green-400 to-emerald-500', 'from-rose-400 to-pink-500']
  return colors[name.charCodeAt(0) % colors.length]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients] = useState<Client[]>(SEED_CLIENTS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'spend' | 'bookings' | 'recent' | 'name'>('spend')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const filtered = clients
    .filter(c => {
      const q = search.toLowerCase()
      const matchSearch = !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      const matchType = filterType === 'all' || c.travel_type === filterType
      return matchSearch && matchStatus && matchType
    })
    .sort((a, b) => {
      if (sortBy === 'spend')    return b.total_spend - a.total_spend
      if (sortBy === 'bookings') return b.total_bookings - a.total_bookings
      if (sortBy === 'recent')   return new Date(b.last_booking_date).getTime() - new Date(a.last_booking_date).getTime()
      if (sortBy === 'name')     return a.name.localeCompare(b.name)
      return 0
    })

  const totalRevenue = clients.reduce((s, c) => s + c.total_spend, 0)
  const vipCount = clients.filter(c => c.status === 'vip').length
  const activeCount = clients.filter(c => c.status === 'active').length
  const avgSpend = clients.length ? Math.round(totalRevenue / clients.length) : 0

  const travelTypes = [...new Set(clients.map(c => c.travel_type))]

  const StatusBadge = ({ status }: { status: Client['status'] }) => {
    const map = {
      vip:      'bg-amber-50 text-amber-700',
      active:   'bg-emerald-50 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-500',
    }
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${map[status]}`}>
        {status === 'vip' ? '⭐ VIP' : status === 'active' ? '● Active' : '○ Inactive'}
      </span>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Clients</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {clients.length} clients · {vipCount} VIP · ₹{(totalRevenue / 100000).toFixed(1)}L total spend
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clients.length.toString(), sub: `${vipCount} VIP`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Spend', value: fmtCurrency(totalRevenue), sub: 'All time', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Avg Per Client', value: fmtCurrency(avgSpend), sub: 'Lifetime value', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Clients', value: `${activeCount + vipCount}`, sub: `${clients.filter(c => c.open_leads > 0).length} open leads`, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A]">{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Statuses</option>
          <option value="vip">VIP</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Types</option>
          {travelTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-400 font-medium">Sort:</span>
          {([['spend','Spend'],['bookings','Bookings'],['recent','Recent'],['name','Name']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === id ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map((client) => {
          const initials = client.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={client.id}
              className={`bg-white rounded-[20px] border shadow-sm p-5 hover:border-slate-300 transition-all cursor-pointer ${selectedClient?.id === client.id ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/10' : 'border-slate-100'}`}
              onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(client.name)} flex items-center justify-center font-black text-white text-sm flex-shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#0F172A]">{client.name}</span>
                    <StatusBadge status={client.status} />
                    {client.open_leads > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {client.open_leads} open lead{client.open_leads > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {client.city}</span>
                    <span className="flex items-center gap-1"><Tag size={11} /> {client.travel_type}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(client.last_contact)}</span>
                  </div>
                </div>
                <ChevronRight size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${selectedClient?.id === client.id ? 'rotate-90' : ''}`} />
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{client.total_bookings}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Bookings</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{fmtCurrency(client.total_spend)}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Total Spend</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{fmtCurrency(Math.round(client.total_spend / Math.max(client.total_bookings, 1)))}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Avg per Trip</div>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedClient?.id === client.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Contact</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-600"><Mail size={12} /> {client.email}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Phone size={12} /> {client.phone}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Globe size={12} /> {client.city}, {client.country}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Relationship</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-600"><Users size={12} /> Agent: {client.assigned_agent}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Calendar size={12} /> Since {new Date(client.first_booking_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Briefcase size={12} /> Last: {new Date(client.last_booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2">Preferred Destinations</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.preferred_destinations.map(d => (
                        <span key={d} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                          <MapPin size={10} /> {d}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400 font-medium mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {client.tags.map(tag => (
                        <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all">
                      <MessageSquare size={13} /> Message
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-slate-300 transition-all">
                      <Eye size={13} /> View Bookings
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-slate-300 transition-all">
                      <TrendingUp size={13} /> New Lead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 text-center py-16 text-slate-400">
            <Users size={40} className="mx-auto mb-3 text-slate-200" />
            <p className="font-bold">No clients found</p>
            <p className="text-sm mt-1">Try clearing your search or filters</p>
          </div>
        )}
      </div>
    </div>
  )
}
