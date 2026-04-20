"use client";

/**
 * NAMA OS — Customer Portal
 * ─────────────────────────
 * Public-facing trip dashboard for confirmed clients.
 * URL: /portal/[bookingId]
 *
 * Features:
 * - Day-by-day trip timeline with live status (UPCOMING / TODAY / COMPLETED)
 * - Documents: e-ticket, hotel vouchers, travel insurance
 * - Emergency contacts + agent WhatsApp
 * - Quick weather check for destination
 * - Viral CTA: "Plan your next trip with NAMA"
 * - Zero authentication required
 */

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Plane, Hotel, Car, Utensils, MapPin, Phone, MessageCircle,
  Calendar, Clock, Users, CheckCircle, Circle, AlertCircle,
  Download, Share2, Copy, Check, ChevronDown, ChevronUp,
  Sun, Cloud, CloudRain, Wind, FileText, Star, ArrowRight,
  Shield, Globe, Navigation, Zap, Heart, FileCheck, Edit3
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type DayStatus = 'COMPLETED' | 'TODAY' | 'UPCOMING';

interface TripDay {
  dayNumber: number;
  date: string;
  title: string;
  location: string;
  status: DayStatus;
  segments: TripSegment[];
}

interface TripSegment {
  type: 'FLIGHT' | 'HOTEL' | 'TRANSFER' | 'ACTIVITY' | 'MEAL' | 'NOTE';
  time?: string;
  title: string;
  detail: string;
  ref?: string;
  status?: 'CONFIRMED' | 'PENDING' | 'COMPLETED';
}

interface TripDocument {
  name: string;
  type: string;
  size: string;
  icon: React.ElementType;
  color: string;
}

interface QuotationLineItem {
  label: string;
  amount: number;
}

interface Booking {
  bookingRef: string;
  clientName: string;
  clientPhone: string;
  destination: string;
  packageName: string;
  travelDate: string;
  returnDate: string;
  pax: number;
  agencyName: string;
  agentName: string;
  agentPhone: string;
  agentPhoto: string;
  heroImage: string;
  days: TripDay[];
  documents: TripDocument[];
  emergencyPhone: string;
  // Quote acceptance
  quotationStatus?: 'PENDING' | 'SENT' | 'ACCEPTED' | 'REVISION_REQUESTED' | 'REJECTED';
  quotationTotal?: number;
  quotationId?: number;
  quotationCurrency?: string;
  quotationItems?: QuotationLineItem[];
}

// ─── Demo Booking ─────────────────────────────────────────────────────────────

function makeDemoBooking(bookingId: string): Booking {
  const today = new Date();
  const d = (offset: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + offset);
    return dt.toISOString().split('T')[0];
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const getDayStatus = (dateStr: string): DayStatus => {
    const date = new Date(dateStr);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date < todayDate) return 'COMPLETED';
    if (date.getTime() === todayDate.getTime()) return 'TODAY';
    return 'UPCOMING';
  };

  return {
    bookingRef: bookingId.toUpperCase(),
    clientName: 'Arjun & Priya Mehta',
    clientPhone: '+91 98765 43210',
    destination: 'Bali, Indonesia',
    packageName: 'Bali Honeymoon Deluxe — 7N/8D',
    travelDate: d(1),
    returnDate: d(8),
    pax: 2,
    agencyName: 'NAMA Travel DMC',
    agentName: 'Prateek',
    agentPhone: '+91 99999 00000',
    agentPhoto: '',
    heroImage: '',
    emergencyPhone: '+91 99999 00001',
    // Quote acceptance demo data
    quotationStatus: 'SENT',
    quotationId: 1,
    quotationTotal: 184800,
    quotationCurrency: 'INR',
    quotationItems: [
      { label: 'Flights (BOM ↔ DPS × 2 Pax)', amount: 48000 },
      { label: 'The Layar Private Villas (7 nights)', amount: 84000 },
      { label: 'All Transfers & Drivers', amount: 12000 },
      { label: 'Activities & Experiences', amount: 24000 },
      { label: 'Welcome Dinner + Farewell Dinner', amount: 8800 },
      { label: 'Travel Insurance (ICICI)', amount: 8000 },
    ],
    documents: [
      { name: 'E-Tickets (IndiGo 6E-234)', type: 'PDF', size: '1.2 MB', icon: Plane, color: 'text-blue-600' },
      { name: 'Hotel Voucher — The Layar', type: 'PDF', size: '0.8 MB', icon: Hotel, color: 'text-purple-600' },
      { name: 'Booking Confirmation', type: 'PDF', size: '0.5 MB', icon: FileText, color: 'text-[#14B8A6]' },
      { name: 'Travel Insurance — ICICI', type: 'PDF', size: '2.1 MB', icon: Shield, color: 'text-green-600' },
    ],
    days: [
      {
        dayNumber: 1,
        date: d(1),
        title: 'Arrival in Bali',
        location: 'Seminyak',
        status: getDayStatus(d(1)),
        segments: [
          { type: 'FLIGHT', time: '06:30', title: 'IndiGo 6E-234 · BOM → DPS', detail: 'Mumbai (T2) → Ngurah Rai International. Duration: 6h 30m. Seat: 14A, 14B', ref: '6E-234', status: 'CONFIRMED' },
          { type: 'TRANSFER', time: '14:30', title: 'Airport to Hotel Transfer', detail: 'Private AC vehicle · Driver: Made (+62 812 3456 7890)', status: 'CONFIRMED' },
          { type: 'HOTEL', time: '15:30', title: 'Check-in: The Layar Private Villas', detail: '1-Bed Pool Villa · Jl. Laksmana 77, Seminyak · Honeymoon setup on arrival', ref: 'LAYAR-2024', status: 'CONFIRMED' },
          { type: 'MEAL', time: '19:30', title: 'Welcome Dinner · Merah Putih', detail: 'Table for 2 · Reservation under Arjun Mehta · Smart casual dress code', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 2,
        date: d(2),
        title: 'Ubud — Culture & Highlands',
        location: 'Ubud',
        status: getDayStatus(d(2)),
        segments: [
          { type: 'ACTIVITY', time: '08:30', title: 'Tegalalang Rice Terrace Walk', detail: 'Guided 90-min walk through UNESCO rice terraces. Includes photos & refreshments', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '11:00', title: 'Casa Luna Cooking Class', detail: 'Learn 4 Balinese dishes. Market visit included. Duration: 3 hours', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '15:00', title: 'Sacred Monkey Forest Sanctuary', detail: 'Self-guided. Entry tickets included. Avoid bringing food outside bags.', status: 'CONFIRMED' },
          { type: 'MEAL', time: '19:00', title: 'Dinner · Locavore', detail: 'Table for 2 · One of Bali\'s finest. Tasting menu (7 courses)', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 3,
        date: d(3),
        title: 'Spiritual Bali + Uluwatu',
        location: 'Uluwatu',
        status: getDayStatus(d(3)),
        segments: [
          { type: 'ACTIVITY', time: '09:00', title: 'Tirta Empul Temple — Purification Ceremony', detail: 'Sacred water purification ritual. Sarong provided. Respectful attire required.', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '17:00', title: 'Uluwatu Temple — Sunset Tour', detail: 'Cliff-top temple with Indian Ocean views. Kecak Fire Dance at 18:00 included', status: 'CONFIRMED' },
          { type: 'MEAL', time: '20:00', title: 'Jimbaran Bay Seafood Dinner', detail: 'Romantic beachside dinner · Table on sand · Live music · Sunset views', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 4,
        date: d(4),
        title: 'Nusa Penida Island Tour',
        location: 'Nusa Penida',
        status: getDayStatus(d(4)),
        segments: [
          { type: 'TRANSFER', time: '07:30', title: 'Speed Boat: Sanur → Nusa Penida', detail: 'Depart Sanur Beach. Transfer included. Life jackets provided. Approx 45 min.', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '09:00', title: 'Kelingking Beach Viewpoint', detail: 'T-Rex cliff viewpoint. Iconic Instagram spot. Moderate hike to beach (optional).', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '11:00', title: 'Angel\'s Billabong & Broken Beach', detail: 'Natural infinity pool and horseshoe bay. Stunning geological formations.', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '13:00', title: 'Crystal Bay Snorkeling', detail: 'Equipment provided. Guide included. Manta ray season Nov-Feb!', status: 'CONFIRMED' },
          { type: 'TRANSFER', time: '16:00', title: 'Return Speed Boat to Sanur', status: 'CONFIRMED', detail: 'Return journey to Sanur Beach, then transfer to hotel.' },
        ],
      },
      {
        dayNumber: 5,
        date: d(5),
        title: 'Beach Club & Leisure',
        location: 'Seminyak',
        status: getDayStatus(d(5)),
        segments: [
          { type: 'NOTE', title: 'Leisure Morning', detail: 'Enjoy your pool villa. Room service available 06:00–22:00. Late breakfast in-villa.' },
          { type: 'ACTIVITY', time: '13:00', title: 'Finns Recreation Club', detail: 'Private beach club access included. Infinity pool, waterslides, food & beverage.', status: 'CONFIRMED' },
          { type: 'MEAL', time: '19:30', title: 'Romantic Candlelight Dinner (In-Villa)', detail: '5-course dinner at your pool villa. Chef & butler service. Rose petal setup.', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 6,
        date: d(6),
        title: 'Adventure Day',
        location: 'Ubud / Canggu',
        status: getDayStatus(d(6)),
        segments: [
          { type: 'ACTIVITY', time: '08:00', title: 'White Water Rafting — Ayung River', detail: 'Grade 2-3 rapids. All safety equipment provided. 2h rafting + buffet lunch.', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '14:00', title: 'ATV Ride Through Rice Paddies', detail: '90-min guided ATV adventure through Ubud countryside. Helmet & gear provided.', status: 'CONFIRMED' },
          { type: 'MEAL', time: '19:30', title: 'Dinner · Merevale Bali', detail: 'Rooftop restaurant with rice paddy views. Cocktail hour from 18:30.', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 7,
        date: d(7),
        title: 'Spa & Shopping',
        location: 'Seminyak',
        status: getDayStatus(d(7)),
        segments: [
          { type: 'ACTIVITY', time: '10:00', title: 'Full-Day Balinese Spa Retreat', detail: 'Traditional massage, scrub & flower bath. 4 hours at Fivelements Retreat.', status: 'CONFIRMED' },
          { type: 'ACTIVITY', time: '16:00', title: 'Seminyak Square Shopping', detail: 'Boutique stores, local crafts, Batik fabric. Recommended: Kody & Ko, Motel Mexicola.', status: 'CONFIRMED' },
          { type: 'MEAL', time: '19:30', title: 'Farewell Dinner · Sarong', detail: 'Award-winning Pan-Asian cuisine. Cocktail pairing available. Smart dress code.', status: 'CONFIRMED' },
        ],
      },
      {
        dayNumber: 8,
        date: d(8),
        title: 'Departure Day',
        location: 'Ngurah Rai Airport',
        status: getDayStatus(d(8)),
        segments: [
          { type: 'HOTEL', time: '12:00', title: 'Late Check-out Arranged', detail: 'Check-out extended to 12:00. Luggage storage available post checkout.', status: 'CONFIRMED' },
          { type: 'TRANSFER', time: '14:00', title: 'Hotel to Airport Transfer', detail: 'Private AC vehicle. Flight time 17:15 — allow 3h for international check-in.', status: 'CONFIRMED' },
          { type: 'FLIGHT', time: '17:15', title: 'IndiGo 6E-235 · DPS → BOM', detail: 'Ngurah Rai (DPS) → Mumbai (T2). Duration: 6h 15m. Arrive ~23:30 IST', ref: '6E-235', status: 'CONFIRMED' },
        ],
      },
    ],
  };
}

// ─── Segment Icons ─────────────────────────────────────────────────────────────

function SegmentIcon({ type, status }: { type: TripSegment['type']; status?: string }) {
  const icons: Record<string, React.ElementType> = {
    FLIGHT: Plane,
    HOTEL: Hotel,
    TRANSFER: Car,
    ACTIVITY: Zap,
    MEAL: Utensils,
    NOTE: FileText,
  };
  const colors: Record<string, string> = {
    FLIGHT: 'bg-blue-100 text-blue-600',
    HOTEL: 'bg-purple-100 text-purple-600',
    TRANSFER: 'bg-slate-100 text-slate-600',
    ACTIVITY: 'bg-amber-100 text-amber-600',
    MEAL: 'bg-green-100 text-green-600',
    NOTE: 'bg-slate-100 text-slate-500',
  };
  const Icon = icons[type] || Circle;
  return (
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[type] || 'bg-slate-100 text-slate-500'}`}>
      <Icon size={15} />
    </div>
  );
}

// ─── Day Card ─────────────────────────────────────────────────────────────────

function DayCard({ day }: { day: TripDay }) {
  const [expanded, setExpanded] = useState(day.status === 'TODAY' || day.status === 'UPCOMING' && day.dayNumber <= 2);

  const statusConfig = {
    COMPLETED: { dot: 'bg-slate-300', border: 'border-slate-100', badge: 'bg-slate-100 text-slate-500', label: 'Done' },
    TODAY: { dot: 'bg-[#14B8A6] animate-pulse', border: 'border-[#14B8A6]/30', badge: 'bg-[#14B8A6] text-white', label: "Today ✦" },
    UPCOMING: { dot: 'bg-blue-400', border: 'border-slate-200', badge: 'bg-blue-50 text-blue-700', label: 'Upcoming' },
  };
  const cfg = statusConfig[day.status];

  return (
    <div className={`rounded-2xl border ${cfg.border} bg-white overflow-hidden transition-all duration-200 ${day.status === 'TODAY' ? 'shadow-lg shadow-[#14B8A6]/10' : 'shadow-sm'}`}>
      {/* Day Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        {/* Day Number */}
        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${day.status === 'TODAY' ? 'bg-[#14B8A6] text-white' : day.status === 'COMPLETED' ? 'bg-slate-100 text-slate-400' : 'bg-blue-50 text-blue-700'}`}>
          <span className="text-[10px] font-black leading-none uppercase">Day</span>
          <span className="text-sm font-black leading-none">{day.dayNumber}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-800 text-sm">{day.title}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <MapPin size={11} className="text-slate-400" />
            <span className="text-xs text-slate-500">{day.location}</span>
            <span className="text-slate-300">·</span>
            <Calendar size={11} className="text-slate-400" />
            <span className="text-xs text-slate-500">{new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-400">{day.segments.length} items</span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Segments */}
      {expanded && (
        <div className="border-t border-slate-100 divide-y divide-slate-50">
          {day.segments.map((seg, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 ${day.status === 'COMPLETED' ? 'opacity-60' : ''}`}>
              <SegmentIcon type={seg.type} status={seg.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  {seg.time && (
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5">
                      {seg.time}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-slate-800">{seg.title}</span>
                  {seg.ref && (
                    <span className="text-[10px] text-[#14B8A6] bg-[#14B8A6]/10 px-1.5 py-0.5 rounded-md font-bold">{seg.ref}</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{seg.detail}</p>
              </div>
              {seg.status === 'CONFIRMED' && (
                <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-1" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quote Acceptance Section ─────────────────────────────────────────────────

function QuoteAcceptanceSection({
  booking,
  quotationId,
  respondToken,
}: {
  booking: Booking;
  quotationId: number;
  respondToken: string;
}) {
  const [action, setAction] = useState<null | 'accept' | 'changes'>(null);
  const [message, setMessage] = useState('');
  const [clientName, setClientName] = useState(booking.clientName || '');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<string | null>(null);

  // If already accepted/actioned from a previous session, show badge
  const alreadyActioned =
    booking.quotationStatus === 'ACCEPTED' ||
    booking.quotationStatus === 'REVISION_REQUESTED' ||
    booking.quotationStatus === 'REJECTED';

  const currency = booking.quotationCurrency || 'INR';
  const total = booking.quotationTotal ?? 0;
  const items = booking.quotationItems ?? [];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

  async function handleSubmit() {
    if (!action) return;
    if (!clientName.trim()) {
      setError('Please enter your name to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/quotations/${quotationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'accept' ? 'accept' : 'request_changes',
          client_name: clientName.trim(),
          message: message.trim() || undefined,
          token: respondToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
        setFinalStatus(data.new_status);
      } else {
        setError(data.detail || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  if (alreadyActioned) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="font-bold text-emerald-800 text-sm">Quote Accepted ✓</div>
            <div className="text-xs text-emerald-600 mt-0.5">
              Your travel consultant has been notified and will be in touch shortly.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    const isAccepted = action === 'accept';
    return (
      <div className={`rounded-2xl border p-5 ${isAccepted ? 'border-emerald-200 bg-emerald-50' : 'border-blue-200 bg-blue-50'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isAccepted ? 'bg-emerald-100' : 'bg-blue-100'}`}>
            <CheckCircle size={20} className={isAccepted ? 'text-emerald-600' : 'text-blue-600'} />
          </div>
          <div>
            <div className={`font-bold text-sm ${isAccepted ? 'text-emerald-800' : 'text-blue-800'}`}>
              {isAccepted ? '✅ Quote Accepted!' : '✏️ Change Request Sent!'}
            </div>
            <div className={`text-xs mt-0.5 ${isAccepted ? 'text-emerald-600' : 'text-blue-600'}`}>
              {isAccepted
                ? "We've notified your travel consultant. They'll be in touch shortly to confirm next steps."
                : "Your travel consultant has been notified and will review your request and send a revised quote."}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-slate-700">
        <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center flex-shrink-0">
          <FileCheck size={18} className="text-teal-400" />
        </div>
        <div>
          <div className="font-black text-white text-base">Your Travel Quote</div>
          <div className="text-xs text-slate-400 mt-0.5">Review and respond to your personalised itinerary quote</div>
        </div>
      </div>

      {/* Quote Summary */}
      <div className="px-5 py-4 border-b border-slate-700">
        {/* Destination + dates */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin size={12} className="text-teal-400" />
              <span className="text-xs font-bold text-teal-400 uppercase tracking-wide">{booking.destination}</span>
            </div>
            <div className="font-bold text-white text-sm">{booking.packageName}</div>
            <div className="text-xs text-slate-400 mt-0.5">
              {new Date(booking.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' → '}
              {new Date(booking.returnDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}{booking.pax} Pax
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-slate-400 mb-0.5">Total</div>
            <div className="text-2xl font-black text-white">{formatCurrency(total)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">All inclusive</div>
          </div>
        </div>

        {/* Line items */}
        {items.length > 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-900/60 divide-y divide-slate-700/60 overflow-hidden">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-slate-300">{item.label}</span>
                <span className="text-xs font-semibold text-slate-200 flex-shrink-0 ml-4">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-teal-500/10">
              <span className="text-sm font-bold text-teal-300">Total Package Price</span>
              <span className="text-sm font-black text-teal-300">{formatCurrency(total)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Section */}
      <div className="px-5 py-4">
        {/* Client name input */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
            Your Name
          </label>
          <input
            type="text"
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="Enter your full name to confirm"
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Action buttons */}
        {action === null && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAction('accept')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
            >
              <CheckCircle size={16} />
              Accept Quote
            </button>
            <button
              onClick={() => setAction('changes')}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-sm transition-colors border border-slate-600"
            >
              <Edit3 size={16} />
              Request Changes
            </button>
          </div>
        )}

        {/* Accept confirmation */}
        {action === 'accept' && (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-900/30 border border-emerald-700/50 px-4 py-3 text-sm text-emerald-300">
              You're about to <strong>accept this quote</strong>. Your travel consultant will be notified immediately.
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                {loading ? 'Confirming…' : '✅ Confirm Acceptance'}
              </button>
              <button
                onClick={() => setAction(null)}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-sm transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Request changes form */}
        {action === 'changes' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide">
                What would you like changed?
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="e.g. Can we add one more night? We'd also prefer business class flights if possible..."
                rows={4}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Edit3 size={16} />
                )}
                {loading ? 'Sending…' : '✏️ Send Change Request'}
              </button>
              <button
                onClick={() => setAction(null)}
                className="px-4 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-sm transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-xl px-3 py-2">
            <AlertCircle size={13} className="flex-shrink-0" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Portal Page ──────────────────────────────────────────────────────────────

function PortalPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = (params?.bookingId as string) || 'DEMO-001';
  const respondToken = searchParams?.get('token') ?? '';
  const [booking, setBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  useEffect(() => {
    // In production: fetch from GET /api/v1/bookings/${bookingId}/portal
    // For now: use demo data
    setBooking(makeDemoBooking(bookingId));
  }, [bookingId]);

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#14B8A6] border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Loading your trip…</p>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayDay = booking.days.find(d => d.date === today);
  const completedDays = booking.days.filter(d => d.status === 'COMPLETED').length;
  const totalDays = booking.days.length;
  const progressPct = Math.round((completedDays / totalDays) * 100);

  function handleShare() {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] text-white px-4 pt-12 pb-8 overflow-hidden">
        {/* Decorative rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-white/5" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-[#14B8A6]/10" />
          <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full bg-[#14B8A6]/5" />
        </div>
        <div className="relative max-w-2xl mx-auto">
          {/* Agency */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-[11px] font-black tracking-widest uppercase text-[#14B8A6]">{booking.agencyName}</div>
            <div className="flex gap-2">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Share'}
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                <Download size={12} /> Save PDF
              </button>
            </div>
          </div>
          {/* Trip name */}
          <div className="mb-2">
            <div className="flex items-center gap-2 mb-1">
              <MapPin size={14} className="text-[#14B8A6]" />
              <span className="text-sm text-[#14B8A6] font-semibold">{booking.destination}</span>
            </div>
            <h1 className="text-3xl font-black leading-tight">{booking.packageName}</h1>
          </div>
          <p className="text-slate-400 text-sm mb-6">Welcome, {booking.clientName.split(' ')[0]}! Your trip itinerary is all set.</p>

          {/* Trip Meta */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Calendar, label: 'Departure', value: new Date(booking.travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
              { icon: Users, label: 'Travellers', value: `${booking.pax} Pax` },
              { icon: Clock, label: 'Duration', value: `${totalDays - 1}N/${totalDays}D` },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon size={12} className="text-[#14B8A6]" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">{label}</span>
                </div>
                <div className="font-bold text-sm">{value}</div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Trip Progress</span>
              <span>{completedDays}/{totalDays} days complete</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0891b2] rounded-full transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Today's Highlight */}
        {todayDay && (
          <div className="bg-gradient-to-br from-[#14B8A6] to-[#0891b2] text-white rounded-2xl p-5">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Today — Day {todayDay.dayNumber}</div>
            <div className="font-black text-xl mb-1">{todayDay.title}</div>
            <div className="flex items-center gap-1.5 text-sm opacity-80 mb-3">
              <MapPin size={12} />
              <span>{todayDay.location}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {todayDay.segments.slice(0, 3).map((seg, i) => (
                <span key={i} className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-semibold">
                  {seg.time ? `${seg.time} · ` : ''}{seg.title.split('·')[0].trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Your Agent */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Your Travel Agent</div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0891b2] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {booking.agentName[0]}
            </div>
            <div className="flex-1">
              <div className="font-bold text-slate-800">{booking.agentName}</div>
              <div className="text-xs text-slate-500">{booking.agencyName}</div>
              <div className="text-xs text-slate-400 mt-0.5">Ref: {booking.bookingRef}</div>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${booking.agentPhone}`}
                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <Phone size={15} className="text-slate-600" />
              </a>
              <a
                href={`https://wa.me/${booking.agentPhone.replace(/\s+/g, '')}?text=${encodeURIComponent(`Hi ${booking.agentName}! I'm checking in about my trip — Booking Ref: ${booking.bookingRef}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-green-500 hover:bg-green-600 flex items-center justify-center transition-colors"
              >
                <MessageCircle size={15} className="text-white" />
              </a>
            </div>
          </div>
          {/* Emergency */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <span className="text-xs text-slate-500">24/7 Emergency:</span>
            <a href={`tel:${booking.emergencyPhone}`} className="text-xs font-bold text-red-600 hover:underline">{booking.emergencyPhone}</a>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            onClick={() => setShowDocs(!showDocs)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <div>
              <div className="font-bold text-slate-800">Travel Documents</div>
              <div className="text-xs text-slate-400 mt-0.5">{booking.documents.length} documents ready</div>
            </div>
            {showDocs ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {showDocs && (
            <div className="border-t border-slate-100 divide-y divide-slate-50">
              {booking.documents.map((doc, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className={`w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0`}>
                    <doc.icon size={15} className={doc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 truncate">{doc.name}</div>
                    <div className="text-xs text-slate-400">{doc.type} · {doc.size}</div>
                  </div>
                  <button className="flex items-center gap-1 text-xs font-semibold text-[#14B8A6] hover:underline flex-shrink-0">
                    <Download size={12} /> View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quote Acceptance Section — shown when quote is pending client action or already actioned */}
        {booking.quotationId != null && (
          booking.quotationStatus === 'SENT' ||
          booking.quotationStatus === 'PENDING' ||
          booking.quotationStatus === 'ACCEPTED' ||
          booking.quotationStatus === 'REVISION_REQUESTED'
        ) && (
          <QuoteAcceptanceSection
            booking={booking}
            quotationId={booking.quotationId!}
            respondToken={respondToken}
          />
        )}

        {/* Day-by-Day Timeline */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-slate-800 text-lg">Your Itinerary</h2>
            <span className="text-xs text-slate-400">{totalDays} days · {booking.destination}</span>
          </div>
          <div className="space-y-3">
            {booking.days.map(day => (
              <DayCard key={day.dayNumber} day={day} />
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <div className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">📋 Travel Tips</div>
          <div className="space-y-2">
            {[
              'Keep your e-tickets downloaded — Bali WiFi can be spotty at immigration.',
              'Sarong is mandatory at Uluwatu & Tirta Empul — one is provided, but bring a backup.',
              'Bali has a ₹150,000 IDR tourism tax payable at the airport. Keep cash ready.',
              'The Rupiah exchange rate is ~₹1 = 180 IDR. Approved money changers only.',
              'WhatsApp your driver 30 min before pickup — confirm the airport meeting point.',
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="flex-shrink-0 font-bold">{i + 1}.</span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Viral CTA */}
        <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] text-white rounded-2xl p-6 text-center">
          <Heart size={24} className="text-[#14B8A6] mx-auto mb-3" />
          <h3 className="font-black text-lg mb-1">Loving your trip plan?</h3>
          <p className="text-slate-400 text-sm mb-4">Share this portal with fellow travellers or plan your next adventure with NAMA.</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-semibold transition-colors"
            >
              <Share2 size={14} /> Share Portal
            </button>
            <a
              href="/register"
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#14B8A6] hover:bg-[#0d9488] text-sm font-bold transition-colors"
            >
              Plan Next Trip <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-8">
          <p className="text-xs text-slate-400">Powered by <span className="font-bold text-slate-600">NAMA Travel OS</span> · Bon voyage! ✈️</p>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#14B8A6] border-t-transparent animate-spin" />
      </div>
    }>
      <PortalPageInner />
    </Suspense>
  );
}
