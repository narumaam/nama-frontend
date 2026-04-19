'use client';

import React, { useState, useMemo } from 'react';
import {
  Palmtree, Plus, Edit2, Copy, Eye, ChevronLeft, ChevronRight,
  Plane, Hotel, Utensils, Bus, MapPin, Clock, Users, Tag,
  Filter, Search, Download, X, Check, AlertCircle, Calendar,
  TrendingUp, CreditCard, Star, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PackageStatus = 'ACTIVE' | 'DRAFT' | 'SOLD OUT' | 'URGENT';
type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING';
type CancellationPolicy = 'Flexible' | 'Moderate' | 'Strict';

interface Departure {
  date: string;   // e.g. "2026-05-15"
  seats: number;
  booked: number;
}

interface HolidayPackage {
  id: string;
  name: string;
  destination: string;
  country: string;
  nights: number;
  days: number;
  pricePerAdult: number;
  priceChild: number;
  priceInfant: number;
  singleSupplement: number;
  inclusions: string[];
  departures: Departure[];
  status: PackageStatus;
  description: string;
  cancellationPolicy: CancellationPolicy;
  markupPct: number;
  gradient: string;
}

interface HolidayBooking {
  id: string;
  packageId: string;
  packageName: string;
  customerName: string;
  email: string;
  departureDate: string;
  paxCount: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  bookedOn: string;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_PACKAGES: HolidayPackage[] = [
  {
    id: 'pkg-001',
    name: 'Bali Bliss 5N/6D',
    destination: 'Bali', country: 'Indonesia',
    nights: 5, days: 6,
    pricePerAdult: 65000, priceChild: 45000, priceInfant: 5000, singleSupplement: 12000,
    inclusions: ['Flights', 'Hotel', 'Meals', 'Transfers'],
    departures: [
      { date: '2026-05-15', seats: 20, booked: 8 },
      { date: '2026-05-22', seats: 20, booked: 14 },
      { date: '2026-06-05', seats: 20, booked: 2 },
    ],
    status: 'ACTIVE',
    description: 'Experience the magic of Bali — temples, rice terraces, and pristine beaches in a perfectly curated 5-night package.',
    cancellationPolicy: 'Moderate',
    markupPct: 20,
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    id: 'pkg-002',
    name: 'Maldives Premium 4N/5D',
    destination: 'Maldives', country: 'Maldives',
    nights: 4, days: 5,
    pricePerAdult: 125000, priceChild: 85000, priceInfant: 0, singleSupplement: 30000,
    inclusions: ['Flights', 'Hotel', 'Meals', 'Transfers', 'Activities'],
    departures: [
      { date: '2026-06-01', seats: 12, booked: 6 },
      { date: '2026-06-15', seats: 12, booked: 3 },
    ],
    status: 'ACTIVE',
    description: 'Overwater bungalows, crystal-clear lagoons, and world-class diving in the paradise of Maldives.',
    cancellationPolicy: 'Strict',
    markupPct: 25,
    gradient: 'from-blue-500 to-teal-500',
  },
  {
    id: 'pkg-003',
    name: 'Kerala Backwaters 3N/4D',
    destination: 'Kerala', country: 'India',
    nights: 3, days: 4,
    pricePerAdult: 18500, priceChild: 12000, priceInfant: 0, singleSupplement: 4000,
    inclusions: ['Hotel', 'Meals', 'Transfers'],
    departures: [
      { date: '2026-05-09', seats: 30, booked: 10 },
      { date: '2026-05-16', seats: 30, booked: 15 },
      { date: '2026-05-23', seats: 30, booked: 8 },
    ],
    status: 'ACTIVE',
    description: 'Float through Kerala\'s enchanting backwaters on a houseboat, explore spice gardens and Ayurvedic traditions.',
    cancellationPolicy: 'Flexible',
    markupPct: 18,
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    id: 'pkg-004',
    name: 'Rajasthan Royal 6N/7D',
    destination: 'Rajasthan', country: 'India',
    nights: 6, days: 7,
    pricePerAdult: 32000, priceChild: 22000, priceInfant: 0, singleSupplement: 8000,
    inclusions: ['Hotel', 'Meals', 'Transfers', 'Guide'],
    departures: [
      { date: '2026-05-20', seats: 25, booked: 17 },
      { date: '2026-06-10', seats: 25, booked: 5 },
    ],
    status: 'ACTIVE',
    description: 'Palaces, forts, camels, and the colours of Rajasthan — Jaipur, Jodhpur, and Udaipur in one grand tour.',
    cancellationPolicy: 'Moderate',
    markupPct: 22,
    gradient: 'from-orange-500 to-amber-600',
  },
  {
    id: 'pkg-005',
    name: 'Sri Lanka Explorer 5N/6D',
    destination: 'Sri Lanka', country: 'Sri Lanka',
    nights: 5, days: 6,
    pricePerAdult: 42000, priceChild: 28000, priceInfant: 2000, singleSupplement: 9000,
    inclusions: ['Flights', 'Hotel', 'Meals', 'Transfers', 'Guide'],
    departures: [
      { date: '2026-06-10', seats: 20, booked: 5 },
      { date: '2026-06-24', seats: 20, booked: 2 },
    ],
    status: 'ACTIVE',
    description: 'Ancient temples, misty hill stations, leopard safaris and beach bliss — Sri Lanka in all its glory.',
    cancellationPolicy: 'Moderate',
    markupPct: 20,
    gradient: 'from-yellow-500 to-orange-500',
  },
  {
    id: 'pkg-006',
    name: 'Dubai City Break 4N/5D',
    destination: 'Dubai', country: 'UAE',
    nights: 4, days: 5,
    pricePerAdult: 58000, priceChild: 40000, priceInfant: 3000, singleSupplement: 14000,
    inclusions: ['Flights', 'Hotel', 'Transfers', 'Activities'],
    departures: [
      { date: '2026-05-18', seats: 15, booked: 11 },
    ],
    status: 'URGENT',
    description: 'Burj Khalifa, Desert Safari, luxury malls and Dhow cruises — Dubai\'s best in 4 nights.',
    cancellationPolicy: 'Strict',
    markupPct: 23,
    gradient: 'from-purple-500 to-pink-600',
  },
  {
    id: 'pkg-007',
    name: 'Manali Summer 4N/5D',
    destination: 'Manali', country: 'India',
    nights: 4, days: 5,
    pricePerAdult: 22000, priceChild: 15000, priceInfant: 0, singleSupplement: 5000,
    inclusions: ['Hotel', 'Meals', 'Transfers'],
    departures: [
      { date: '2026-05-12', seats: 30, booked: 5 },
      { date: '2026-05-19', seats: 30, booked: 8 },
      { date: '2026-05-26', seats: 30, booked: 12 },
    ],
    status: 'ACTIVE',
    description: 'Snow-capped peaks, Solang Valley adventure, and the charm of old Manali — the perfect summer hill escape.',
    cancellationPolicy: 'Flexible',
    markupPct: 15,
    gradient: 'from-sky-500 to-blue-600',
  },
  {
    id: 'pkg-008',
    name: 'Singapore Family 5N/6D',
    destination: 'Singapore', country: 'Singapore',
    nights: 5, days: 6,
    pricePerAdult: 85000, priceChild: 65000, priceInfant: 5000, singleSupplement: 18000,
    inclusions: ['Flights', 'Hotel', 'Meals', 'Transfers', 'Activities', 'Guide'],
    departures: [
      { date: '2026-06-05', seats: 20, booked: 20 },
    ],
    status: 'SOLD OUT',
    description: 'Universal Studios, Gardens by the Bay, Sentosa Island and hawker delights — Singapore for the whole family.',
    cancellationPolicy: 'Moderate',
    markupPct: 22,
    gradient: 'from-rose-500 to-red-600',
  },
];

const SEED_BOOKINGS: HolidayBooking[] = [
  { id: 'HB-001', packageId: 'pkg-001', packageName: 'Bali Bliss 5N/6D', customerName: 'Priya & Rahul Sharma', email: 'priya@example.com', departureDate: '2026-05-15', paxCount: 2, totalAmount: 130000, paymentStatus: 'PAID', bookedOn: '2026-04-10' },
  { id: 'HB-002', packageId: 'pkg-001', packageName: 'Bali Bliss 5N/6D', customerName: 'Amit Patel', email: 'amit@example.com', departureDate: '2026-05-22', paxCount: 3, totalAmount: 195000, paymentStatus: 'PARTIAL', bookedOn: '2026-04-12' },
  { id: 'HB-003', packageId: 'pkg-002', packageName: 'Maldives Premium 4N/5D', customerName: 'Karan & Sneha Mehta', email: 'karan@example.com', departureDate: '2026-06-01', paxCount: 2, totalAmount: 280000, paymentStatus: 'PAID', bookedOn: '2026-04-08' },
  { id: 'HB-004', packageId: 'pkg-003', packageName: 'Kerala Backwaters 3N/4D', customerName: 'Sunita Rao', email: 'sunita@example.com', departureDate: '2026-05-09', paxCount: 4, totalAmount: 74000, paymentStatus: 'PAID', bookedOn: '2026-04-14' },
  { id: 'HB-005', packageId: 'pkg-004', packageName: 'Rajasthan Royal 6N/7D', customerName: 'Vikram & Family', email: 'vikram@example.com', departureDate: '2026-05-20', paxCount: 4, totalAmount: 128000, paymentStatus: 'PARTIAL', bookedOn: '2026-04-11' },
  { id: 'HB-006', packageId: 'pkg-006', packageName: 'Dubai City Break 4N/5D', customerName: 'Deepika Nair', email: 'deepika@example.com', departureDate: '2026-05-18', paxCount: 2, totalAmount: 116000, paymentStatus: 'PAID', bookedOn: '2026-04-13' },
  { id: 'HB-007', packageId: 'pkg-001', packageName: 'Bali Bliss 5N/6D', customerName: 'Rohan Gupta', email: 'rohan@example.com', departureDate: '2026-05-22', paxCount: 1, totalAmount: 77000, paymentStatus: 'PENDING', bookedOn: '2026-04-15' },
  { id: 'HB-008', packageId: 'pkg-007', packageName: 'Manali Summer 4N/5D', customerName: 'Neha & Arjun Singh', email: 'neha@example.com', departureDate: '2026-05-12', paxCount: 2, totalAmount: 44000, paymentStatus: 'PAID', bookedOn: '2026-04-09' },
  { id: 'HB-009', packageId: 'pkg-003', packageName: 'Kerala Backwaters 3N/4D', customerName: 'Rajesh Kumar', email: 'rajesh@example.com', departureDate: '2026-05-16', paxCount: 2, totalAmount: 37000, paymentStatus: 'PAID', bookedOn: '2026-04-16' },
  { id: 'HB-010', packageId: 'pkg-005', packageName: 'Sri Lanka Explorer 5N/6D', customerName: 'Meena Pillai', email: 'meena@example.com', departureDate: '2026-06-10', paxCount: 2, totalAmount: 84000, paymentStatus: 'PARTIAL', bookedOn: '2026-04-17' },
  { id: 'HB-011', packageId: 'pkg-008', packageName: 'Singapore Family 5N/6D', customerName: 'Suresh & Kavitha Iyer', email: 'suresh@example.com', departureDate: '2026-06-05', paxCount: 4, totalAmount: 370000, paymentStatus: 'PAID', bookedOn: '2026-04-01' },
  { id: 'HB-012', packageId: 'pkg-002', packageName: 'Maldives Premium 4N/5D', customerName: 'Ananya Desai', email: 'ananya@example.com', departureDate: '2026-06-01', paxCount: 2, totalAmount: 280000, paymentStatus: 'PENDING', bookedOn: '2026-04-18' },
  { id: 'HB-013', packageId: 'pkg-006', packageName: 'Dubai City Break 4N/5D', customerName: 'Prakash & Leela Joshi', email: 'prakash@example.com', departureDate: '2026-05-18', paxCount: 3, totalAmount: 174000, paymentStatus: 'PARTIAL', bookedOn: '2026-04-07' },
  { id: 'HB-014', packageId: 'pkg-004', packageName: 'Rajasthan Royal 6N/7D', customerName: 'Harish Verma', email: 'harish@example.com', departureDate: '2026-05-20', paxCount: 2, totalAmount: 64000, paymentStatus: 'PAID', bookedOn: '2026-04-06' },
  { id: 'HB-015', packageId: 'pkg-007', packageName: 'Manali Summer 4N/5D', customerName: 'Pallavi Krishnan', email: 'pallavi@example.com', departureDate: '2026-05-19', paxCount: 2, totalAmount: 44000, paymentStatus: 'PAID', bookedOn: '2026-04-05' },
];

const INCLUSIONS_ALL = ['Flights', 'Hotel', 'Meals', 'Transfers', 'Guide', 'Visa', 'Insurance', 'Activities'];
const INCLUSION_ICONS: Record<string, React.ReactNode> = {
  Flights: <Plane size={10} />,
  Hotel: <Hotel size={10} />,
  Meals: <Utensils size={10} />,
  Transfers: <Bus size={10} />,
  Guide: <Users size={10} />,
  Visa: <Tag size={10} />,
  Insurance: <AlertCircle size={10} />,
  Activities: <Star size={10} />,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function seatsLeft(pkg: HolidayPackage) {
  const next = pkg.departures.find(d => new Date(d.date) >= new Date());
  if (!next) return 0;
  return next.seats - next.booked;
}

function nextDeparture(pkg: HolidayPackage) {
  const upcoming = pkg.departures
    .filter(d => new Date(d.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return upcoming[0] || pkg.departures[0];
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PackageStatus | PaymentStatus }) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    DRAFT: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
    'SOLD OUT': 'bg-red-500/15 text-red-400 border-red-500/30',
    URGENT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PAID: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    PARTIAL: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    PENDING: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return (
    <span className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border ${map[status] || map.DRAFT}`}>
      {status === 'URGENT' ? '⚠ LOW SEATS' : status}
    </span>
  );
}

// ─── Payment Badge ────────────────────────────────────────────────────────────

function PayBadge({ status }: { status: PaymentStatus }) {
  return <StatusBadge status={status} />;
}

// ─── TAB 1 — Package Catalogue ───────────────────────────────────────────────

function PackageCatalogue({ onCreateNew }: { onCreateNew: () => void }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = SEED_PACKAGES.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search packages..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['ALL', 'ACTIVE', 'DRAFT', 'SOLD OUT', 'URGENT'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-1.5 rounded-lg transition-all ${
                  filterStatus === s
                    ? 'bg-[#14B8A6] text-[#0F172A]'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-[#14B8A6] hover:bg-teal-400 text-[#0F172A] font-black text-sm px-4 py-2 rounded-xl transition-all active:scale-95 flex-shrink-0"
        >
          <Plus size={16} /> New Package
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(pkg => {
          const nd = nextDeparture(pkg);
          const left = seatsLeft(pkg);
          const seatPct = nd ? Math.round((nd.booked / nd.seats) * 100) : 100;
          return (
            <div key={pkg.id} className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden hover:shadow-lg dark:hover:shadow-black/30 transition-all group">
              {/* Image placeholder */}
              <div className={`h-36 bg-gradient-to-br ${pkg.gradient} flex items-end p-4 relative`}>
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative z-10">
                  <p className="text-white/80 text-xs font-semibold flex items-center gap-1.5">
                    <MapPin size={11} /> {pkg.destination}, {pkg.country}
                  </p>
                  <h3 className="text-white font-black text-lg leading-tight mt-0.5">{pkg.name}</h3>
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <StatusBadge status={pkg.status} />
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                {/* Price + Duration */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Starting from</p>
                    <p className="text-xl font-black text-slate-900 dark:text-white">{fmt(pkg.pricePerAdult)}</p>
                    <p className="text-[10px] text-slate-400">per person</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Clock size={12} />
                      <span className="text-sm font-bold">{pkg.nights}N / {pkg.days}D</span>
                    </div>
                  </div>
                </div>

                {/* Inclusions chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {pkg.inclusions.map(inc => (
                    <span key={inc} className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#14B8A6]/10 text-[#14B8A6] rounded-full border border-[#14B8A6]/20">
                      {INCLUSION_ICONS[inc]} {inc}
                    </span>
                  ))}
                </div>

                {/* Next departure */}
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Next departure</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{nd ? fmtDate(nd.date) : '—'}</span>
                </div>

                {/* Seats bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-[10px] mb-1">
                    <span className="text-slate-400">Seats availability</span>
                    <span className={`font-black ${left < 5 ? 'text-red-400' : 'text-slate-500 dark:text-slate-300'}`}>
                      {left} left
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        seatPct >= 90 ? 'bg-red-500' : seatPct >= 70 ? 'bg-amber-500' : 'bg-[#14B8A6]'
                      }`}
                      style={{ width: `${seatPct}%` }}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                  <button className="flex items-center gap-1.5 text-xs font-bold text-[#14B8A6] hover:bg-[#14B8A6]/10 px-2.5 py-1.5 rounded-lg transition-all">
                    <Edit2 size={12} /> Edit
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-all">
                    <Eye size={12} /> Bookings
                  </button>
                  <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 px-2.5 py-1.5 rounded-lg transition-all ml-auto">
                    <Copy size={12} /> Duplicate
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          <Palmtree size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-bold">No packages found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  );
}

// ─── TAB 2 — Departures Calendar ─────────────────────────────────────────────

function DeparturesCalendar() {
  const today = new Date('2026-04-19');
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(4); // 0-indexed: April = 3, May = 4
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Collect all departures keyed by date string
  const departureMap = useMemo(() => {
    const map: Record<string, { pkg: HolidayPackage; dep: Departure }[]> = {};
    SEED_PACKAGES.forEach(pkg => {
      pkg.departures.forEach(dep => {
        if (!map[dep.date]) map[dep.date] = [];
        map[dep.date].push({ pkg, dep });
      });
    });
    return map;
  }, []);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectedDeps = selectedDate ? (departureMap[selectedDate] || []) : [];

  // Upcoming departures (next 30 days)
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + 30);
  const upcoming = Object.entries(departureMap)
    .flatMap(([date, items]) => items.map(i => ({ date, ...i })))
    .filter(i => {
      const d = new Date(i.date);
      return d >= today && d <= cutoff;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Revenue for a departure
  const depRevenue = (pkgId: string, date: string) => {
    return SEED_BOOKINGS
      .filter(b => b.packageId === pkgId && b.departureDate === date)
      .reduce((s, b) => s + b.totalAmount, 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-black text-slate-900 dark:text-white text-lg">
              {monthNames[viewMonth]} {viewYear}
            </h3>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const deps = departureMap[dateStr] || [];
              const isToday = dateStr === today.toISOString().split('T')[0];
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-start pt-1 transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                    isSelected ? 'bg-[#14B8A6]/15 border border-[#14B8A6]/40' :
                    isToday ? 'border border-[#14B8A6]/50' : 'border border-transparent'
                  }`}
                >
                  <span className={`text-xs font-bold leading-none ${
                    isToday ? 'text-[#14B8A6]' : 'text-slate-700 dark:text-slate-200'
                  }`}>{day}</span>
                  {deps.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center px-0.5">
                      {deps.slice(0, 3).map((d, idx) => (
                        <span key={idx} className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${d.pkg.gradient}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <p className="text-[10px] text-slate-400 mt-3 text-center">Click a date to see departures</p>
        </div>

        {/* Side panel */}
        <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-5">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-slate-900 dark:text-white text-sm">{fmtDate(selectedDate)}</h3>
                <button onClick={() => setSelectedDate(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                  <X size={14} />
                </button>
              </div>
              {selectedDeps.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">No departures on this date</p>
              ) : (
                <div className="space-y-3">
                  {selectedDeps.map(({ pkg, dep }) => {
                    const rev = depRevenue(pkg.id, selectedDate);
                    const booked = SEED_BOOKINGS.filter(b => b.packageId === pkg.id && b.departureDate === selectedDate);
                    return (
                      <div key={pkg.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10">
                        <div className={`inline-block w-3 h-3 rounded-full bg-gradient-to-br ${pkg.gradient} mb-1`} />
                        <p className="font-black text-sm text-slate-900 dark:text-white">{pkg.name}</p>
                        <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex justify-between">
                            <span>Seats confirmed</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{dep.booked}/{dep.seats}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Revenue</span>
                            <span className="font-bold text-[#14B8A6]">{fmt(rev)}</span>
                          </div>
                        </div>
                        {booked.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Passengers</p>
                            {booked.map(b => (
                              <p key={b.id} className="text-xs text-slate-600 dark:text-slate-300 font-medium">{b.customerName} · {b.paxCount} pax</p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-10">
              <Calendar size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-bold text-slate-400">Select a date</p>
              <p className="text-xs text-slate-400 mt-1">Click any date on the calendar to view departure details</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming 30-day list */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-5">
        <h3 className="font-black text-slate-900 dark:text-white mb-4">Upcoming Departures — Next 30 Days</h3>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No departures in the next 30 days</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                  <th className="text-left pb-3 pr-4">Package</th>
                  <th className="text-left pb-3 pr-4">Destination</th>
                  <th className="text-left pb-3 pr-4">Departure</th>
                  <th className="text-right pb-3 pr-4">Confirmed/Total</th>
                  <th className="text-right pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {upcoming.map(({ date, pkg, dep }, idx) => {
                  const rev = depRevenue(pkg.id, date);
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${pkg.gradient} flex-shrink-0`} />
                          <span className="font-bold text-slate-800 dark:text-white">{pkg.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">{pkg.destination}</td>
                      <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-300">{fmtDate(date)}</td>
                      <td className="py-3 pr-4 text-right">
                        <span className={`font-bold ${dep.booked === dep.seats ? 'text-red-400' : dep.booked / dep.seats >= 0.8 ? 'text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {dep.booked}/{dep.seats}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-[#14B8A6]">{rev > 0 ? fmt(rev) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB 3 — Package Bookings ─────────────────────────────────────────────────

function PackageBookings() {
  const [filterPkg, setFilterPkg] = useState('ALL');
  const [filterPay, setFilterPay] = useState('ALL');
  const [search, setSearch] = useState('');

  const filtered = SEED_BOOKINGS.filter(b => {
    const matchPkg = filterPkg === 'ALL' || b.packageId === filterPkg;
    const matchPay = filterPay === 'ALL' || b.paymentStatus === filterPay;
    const matchSearch = b.customerName.toLowerCase().includes(search.toLowerCase()) ||
      b.id.toLowerCase().includes(search.toLowerCase());
    return matchPkg && matchPay && matchSearch;
  });

  const totalRevenue = SEED_BOOKINGS.reduce((s, b) => s + b.totalAmount, 0);
  const totalSeats = SEED_PACKAGES.reduce((s, p) => s + p.departures.reduce((ss, d) => ss + d.seats, 0), 0);
  const totalBooked = SEED_PACKAGES.reduce((s, p) => s + p.departures.reduce((ss, d) => ss + d.booked, 0), 0);
  const avgPax = (SEED_BOOKINGS.reduce((s, b) => s + b.paxCount, 0) / SEED_BOOKINGS.length).toFixed(1);

  return (
    <div className="space-y-5">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Bookings', value: '47', icon: <Users size={16} />, color: 'text-[#14B8A6]' },
          { label: 'Revenue This Month', value: '₹18.4L', icon: <TrendingUp size={16} />, color: 'text-emerald-400' },
          { label: 'Seats Filled', value: `${Math.round((totalBooked / totalSeats) * 100)}%`, icon: <CreditCard size={16} />, color: 'text-amber-400' },
          { label: 'Avg Group Size', value: `${avgPax} pax`, icon: <Users size={16} />, color: 'text-blue-400' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-4">
            <div className={`${kpi.color} mb-2`}>{kpi.icon}</div>
            <p className="text-xl font-black text-slate-900 dark:text-white">{kpi.value}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search bookings..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Filter size={12} className="text-slate-400" />
              <select
                value={filterPkg}
                onChange={e => setFilterPkg(e.target.value)}
                className="text-xs font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
              >
                <option value="ALL">All Packages</option>
                {SEED_PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <select
              value={filterPay}
              onChange={e => setFilterPay(e.target.value)}
              className="text-xs font-bold bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
            >
              <option value="ALL">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/10 px-3 py-1.5 rounded-xl transition-all ml-auto">
            <Download size={12} /> Export
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-white/5">
                <th className="text-left pb-3 pr-4">Booking ID</th>
                <th className="text-left pb-3 pr-4">Customer</th>
                <th className="text-left pb-3 pr-4">Package</th>
                <th className="text-left pb-3 pr-4">Departure</th>
                <th className="text-right pb-3 pr-4">Pax</th>
                <th className="text-right pb-3 pr-4">Amount</th>
                <th className="text-left pb-3 pr-4">Payment</th>
                <th className="text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filtered.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="font-black text-[#14B8A6] text-xs">{b.id}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="font-bold text-slate-800 dark:text-white">{b.customerName}</p>
                    <p className="text-[10px] text-slate-400">{b.email}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{b.packageName}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{fmtDate(b.departureDate)}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{b.paxCount}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="font-bold text-slate-800 dark:text-white">{fmt(b.totalAmount)}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <PayBadge status={b.paymentStatus} />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-lg transition-all">
                        <Eye size={12} />
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users size={28} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">No bookings found</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filtered.length} of {SEED_BOOKINGS.length} bookings</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">Total shown: {fmt(filtered.reduce((s, b) => s + b.totalAmount, 0))}</span>
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4 — Create / Edit Package ───────────────────────────────────────────

function CreatePackageForm({ onCancel }: { onCancel: () => void }) {
  const [form, setForm] = useState({
    name: '',
    destination: '',
    nights: 3,
    days: 4,
    description: '',
    inclusions: [] as string[],
    priceAdult: '',
    priceChild: '',
    priceInfant: '',
    singleSupplement: '',
    markupPct: 20,
    cancellationPolicy: 'Moderate' as CancellationPolicy,
    status: 'DRAFT' as 'DRAFT' | 'ACTIVE',
    departures: [{ date: '', seats: 20 }],
  });
  const [saved, setSaved] = useState(false);

  const toggleInclusion = (inc: string) => {
    setForm(f => ({
      ...f,
      inclusions: f.inclusions.includes(inc)
        ? f.inclusions.filter(i => i !== inc)
        : [...f.inclusions, inc],
    }));
  };

  const addDeparture = () => {
    setForm(f => ({ ...f, departures: [...f.departures, { date: '', seats: 20 }] }));
  };

  const removeDeparture = (idx: number) => {
    setForm(f => ({ ...f, departures: f.departures.filter((_, i) => i !== idx) }));
  };

  const updateDeparture = (idx: number, field: 'date' | 'seats', value: string | number) => {
    setForm(f => {
      const deps = [...f.departures];
      deps[idx] = { ...deps[idx], [field]: value };
      return { ...f, departures: deps };
    });
  };

  const sellingPrice = form.priceAdult
    ? Math.round(Number(form.priceAdult) * (1 + form.markupPct / 100))
    : null;

  const handleSave = (publish: boolean) => {
    setForm(f => ({ ...f, status: publish ? 'ACTIVE' : 'DRAFT' }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const DESTINATIONS = [
    'Bali, Indonesia', 'Maldives', 'Kerala, India', 'Rajasthan, India',
    'Sri Lanka', 'Dubai, UAE', 'Manali, India', 'Singapore',
    'Thailand', 'Vietnam', 'Nepal', 'Bhutan', 'Mauritius', 'Switzerland',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {saved && (
        <div className="flex items-center gap-2.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl text-sm font-bold">
          <Check size={16} /> Package {form.status === 'ACTIVE' ? 'published' : 'saved as draft'} successfully!
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <Palmtree size={16} className="text-[#14B8A6]" /> Basic Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Package Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Bali Bliss 5N/6D"
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white placeholder-slate-400"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Destination *</label>
            <div className="relative">
              <input
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="Search destination..."
                list="destinations-list"
                className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white placeholder-slate-400"
              />
              <datalist id="destinations-list">
                {DESTINATIONS.map(d => <option key={d} value={d} />)}
              </datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Duration</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number" min={1} max={30}
                  value={form.nights}
                  onChange={e => setForm(f => ({ ...f, nights: Number(e.target.value), days: Number(e.target.value) + 1 }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">N</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="number" min={1} max={31}
                  value={form.days}
                  onChange={e => setForm(f => ({ ...f, days: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">D</span>
              </div>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Describe what makes this package special..."
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white placeholder-slate-400 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Inclusions */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Check size={16} className="text-[#14B8A6]" /> Inclusions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {INCLUSIONS_ALL.map(inc => {
            const active = form.inclusions.includes(inc);
            return (
              <button
                key={inc}
                onClick={() => toggleInclusion(inc)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  active
                    ? 'bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#14B8A6]'
                    : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#14B8A6]/30'
                }`}
              >
                {active ? <Check size={14} /> : <div className="w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-sm" />}
                <span>{inc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          <CreditCard size={16} className="text-[#14B8A6]" /> Pricing
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {[
            { label: 'Base Price — Adult *', field: 'priceAdult', hint: 'Cost price per adult' },
            { label: 'Child Price (2–12 yrs)', field: 'priceChild', hint: 'Cost price per child' },
            { label: 'Infant Price (0–2 yrs)', field: 'priceInfant', hint: 'Typically ₹0 or nominal' },
            { label: 'Single Supplement', field: 'singleSupplement', hint: 'Extra charge for solo traveller' },
          ].map(({ label, field, hint }) => (
            <div key={field}>
              <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm pointer-events-none">₹</span>
                <input
                  type="number" min={0}
                  value={(form as Record<string, unknown>)[field] as string}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder="0"
                  className="w-full pl-7 pr-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">{hint}</p>
            </div>
          ))}
        </div>

        {/* Markup */}
        <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 border border-slate-100 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Markup %</label>
            <span className="text-sm font-black text-[#14B8A6]">{form.markupPct}%</span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={form.markupPct}
            onChange={e => setForm(f => ({ ...f, markupPct: Number(e.target.value) }))}
            className="w-full accent-teal-500"
          />
          {sellingPrice && (
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Selling price (adult)</span>
              <span className="font-black text-slate-700 dark:text-slate-200">{fmt(sellingPrice)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Departure Dates */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={16} className="text-[#14B8A6]" /> Departure Dates
          </h3>
          <button
            onClick={addDeparture}
            className="flex items-center gap-1.5 text-xs font-black text-[#14B8A6] hover:bg-[#14B8A6]/10 px-3 py-1.5 rounded-xl transition-all"
          >
            <Plus size={14} /> Add Date
          </button>
        </div>
        <div className="space-y-2">
          {form.departures.map((dep, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="date"
                  value={dep.date}
                  onChange={e => updateDeparture(idx, 'date', e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
                />
              </div>
              <div className="w-32">
                <div className="relative">
                  <input
                    type="number" min={1} max={200}
                    value={dep.seats}
                    onChange={e => updateDeparture(idx, 'seats', Number(e.target.value))}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">seats</span>
                </div>
              </div>
              {form.departures.length > 1 && (
                <button
                  onClick={() => removeDeparture(idx)}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Policy + Status */}
      <div className="bg-white dark:bg-[#0F1B35] rounded-2xl border border-slate-100 dark:border-white/5 p-6">
        <h3 className="font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertCircle size={16} className="text-[#14B8A6]" /> Policy & Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Cancellation Policy</label>
            <select
              value={form.cancellationPolicy}
              onChange={e => setForm(f => ({ ...f, cancellationPolicy: e.target.value as CancellationPolicy }))}
              className="w-full px-3 py-2.5 text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40 text-slate-800 dark:text-white"
            >
              <option value="Flexible">Flexible — Full refund up to 7 days before</option>
              <option value="Moderate">Moderate — 50% refund up to 7 days before</option>
              <option value="Strict">Strict — No refund within 14 days</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['DRAFT', 'ACTIVE'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black border transition-all ${
                    form.status === s
                      ? s === 'ACTIVE'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-slate-500/15 border-slate-500/40 text-slate-400'
                      : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {s === 'ACTIVE' ? '● Active' : '○ Draft'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-3 pb-6">
        <button
          onClick={() => handleSave(false)}
          className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-black border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
        >
          Save as Draft
        </button>
        <button
          onClick={() => handleSave(true)}
          className="flex-1 sm:flex-none px-6 py-3 rounded-xl text-sm font-black bg-[#14B8A6] hover:bg-teal-400 text-[#0F172A] transition-all active:scale-95"
        >
          Publish Package
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-3 rounded-xl text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'catalogue', label: 'Package Catalogue', icon: <Palmtree size={15} /> },
  { id: 'calendar', label: 'Departures Calendar', icon: <Calendar size={15} /> },
  { id: 'bookings', label: 'Package Bookings', icon: <Users size={15} /> },
  { id: 'create', label: 'Create Package', icon: <Plus size={15} /> },
];

export default function HolidaysPage() {
  const [activeTab, setActiveTab] = useState<'catalogue' | 'calendar' | 'bookings' | 'create'>('catalogue');

  const handleCreateNew = () => setActiveTab('create');
  const handleCancelCreate = () => setActiveTab('catalogue');

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-[#14B8A6]/15 rounded-xl flex items-center justify-center">
              <Palmtree size={18} className="text-[#14B8A6]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">Holiday Packages</h1>
            <span className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#14B8A6] animate-pulse inline-block" />
              New
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 ml-12">
            Manage pre-packaged holiday products, departures, pricing, and bookings
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl px-3 py-2 ml-12 sm:ml-0">
          <span className="font-black text-slate-700 dark:text-slate-200">{SEED_PACKAGES.filter(p => p.status === 'ACTIVE').length}</span>
          <span>active packages</span>
          <span className="mx-1 text-slate-200 dark:text-white/20">·</span>
          <span className="font-black text-slate-700 dark:text-slate-200">{SEED_BOOKINGS.length}</span>
          <span>bookings</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-1.5 w-fit overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#14B8A6] text-[#0F172A] shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'catalogue' && <PackageCatalogue onCreateNew={handleCreateNew} />}
      {activeTab === 'calendar' && <DeparturesCalendar />}
      {activeTab === 'bookings' && <PackageBookings />}
      {activeTab === 'create' && <CreatePackageForm onCancel={handleCancelCreate} />}
    </div>
  );
}
