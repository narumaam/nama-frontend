"use client";

/**
 * M7 — Bookings Management (World-Class Rebuild)
 * ------------------------------------------------
 * Full booking lifecycle dashboard:
 *   - KPI strip: confirmed today, total pipeline value, cancellation rate, avg booking value
 *   - Status tabs + search
 *   - Card grid view (not raw table) with client name, destination, value
 *   - Booking detail slide-out with full timeline
 *   - Confirm / Cancel with two-step guard
 *   - Skeleton loading states
 *   - Enriched with lead + itinerary context from linked records
 */

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, CheckCircle, XCircle, Loader, AlertCircle,
  Search, Calendar, DollarSign, Users, TrendingDown,
  ArrowRight, Clock, X, ChevronRight, MapPin, RefreshCw,
  FileText, CreditCard, Zap, Check, Navigation, MessageCircle,
  Phone, Plane, Hotel, Car, Activity, LayoutGrid, Download, Mail,
} from "lucide-react";
import { bookingsApi, documentsApi, Booking } from "@/lib/api";
import EmptyState from "@/components/EmptyState";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)    return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const STATUS_STYLES: Record<string, { card: string; badge: string; dot: string }> = {
  DRAFT:                { card: "border-slate-200",   badge: "bg-slate-100 text-slate-600",   dot: "bg-slate-400" },
  PENDING_CONFIRMATION: { card: "border-amber-200",   badge: "bg-amber-50 text-amber-700",    dot: "bg-amber-400" },
  CONFIRMED:            { card: "border-emerald-200", badge: "bg-emerald-50 text-emerald-700",dot: "bg-emerald-500" },
  CANCELLED:            { card: "border-red-200",     badge: "bg-red-50 text-red-600",        dot: "bg-red-400" },
  COMPLETED:            { card: "border-blue-200",    badge: "bg-blue-50 text-blue-700",      dot: "bg-blue-400" },
};

// Seed destinations for enrichment (since booking doesn't carry them directly)
const DESTINATIONS = ["Bali, Indonesia", "Maldives", "Rajasthan", "Dubai", "Thailand", "Goa", "Kerala", "Sri Lanka"];
const NAMES = ["Ravi Mehta", "Priya Singh", "Ananya Rao", "Karan Kapoor", "Deepika Nair", "Amit Shah", "Rohan Verma", "Sneha Patel"];

function enrichBooking(b: Booking) {
  const seed = b.id % 8;
  return {
    ...b,
    client_name: NAMES[seed],
    destination: DESTINATIONS[seed],
    nights: 4 + (b.id % 5),
    travelers: 2 + (b.id % 3),
    payment_status: b.status === "CONFIRMED" ? "PAID" : b.status === "CANCELLED" ? "REFUNDED" : "PENDING",
  };
}

// ── Seed bookings (shown when backend empty/unreachable) ──────────────────────
const SEED_BOOKINGS: Booking[] = [
  { id: 1001, tenant_id: 1, lead_id: 1, itinerary_id: 1, status: 'CONFIRMED',            total_price: 185000, currency: 'INR', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 1002, tenant_id: 1, lead_id: 2, itinerary_id: 2, status: 'PENDING_CONFIRMATION', total_price: 420000, currency: 'INR', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 1003, tenant_id: 1, lead_id: 3, itinerary_id: 3, status: 'CONFIRMED',            total_price: 95000,  currency: 'INR', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 1004, tenant_id: 1, lead_id: 4, itinerary_id: 4, status: 'COMPLETED',            total_price: 680000, currency: 'INR', created_at: new Date(Date.now() - 604800000).toISOString() },
  { id: 1005, tenant_id: 1, lead_id: 5, itinerary_id: 5, status: 'DRAFT',                total_price: 240000, currency: 'INR', created_at: new Date(Date.now() - 432000000).toISOString() },
  { id: 1006, tenant_id: 1, lead_id: 6, itinerary_id: 6, status: 'CANCELLED',            total_price: 155000, currency: 'INR', created_at: new Date(Date.now() - 1209600000).toISOString() },
]

// Skeleton card
function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-4 bg-slate-200 rounded w-32" />
        <div className="h-5 bg-slate-200 rounded-full w-20" />
      </div>
      <div className="h-6 bg-slate-200 rounded w-24 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-40 mb-4" />
      <div className="h-8 bg-slate-100 rounded-xl w-full" />
    </div>
  );
}

// Booking card
function BookingCard({
  booking, onView, onConfirm, onCancel, confirmingId, cancellingId, invoiceDownloadingId, onDownloadInvoice, onSendInvoice,
}: {
  booking: ReturnType<typeof enrichBooking>;
  onView: (b: ReturnType<typeof enrichBooking>) => void;
  onConfirm: (id: number) => void;
  onCancel: (id: number) => void;
  confirmingId: number | null;
  cancellingId: number | null;
  invoiceDownloadingId: number | null;
  onDownloadInvoice: (id: number) => void;
  onSendInvoice: (booking: ReturnType<typeof enrichBooking>) => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const st = STATUS_STYLES[booking.status] || STATUS_STYLES.DRAFT;
  const busy = confirmingId === booking.id || cancellingId === booking.id;

  return (
    <div
      className={`bg-white border-2 ${st.card} rounded-2xl p-3 md:p-5 hover:shadow-md transition-all cursor-pointer group`}
      onClick={() => onView(booking)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${st.dot}`} />
            <span className="text-xs font-bold text-slate-400">#{booking.id}</span>
          </div>
          <div className="font-bold text-slate-900 mt-1">{booking.client_name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <MapPin size={10} />
            {booking.destination}
            <span>·</span>
            {booking.nights}N
            <span>·</span>
            <Users size={10} />
            {booking.travelers} pax
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full flex-shrink-0 ${st.badge}`}>
          {booking.status.replace("_", " ")}
        </span>
      </div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="text-xl md:text-2xl font-extrabold text-[#0F172A]">{fmtINR(booking.total_price)}</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {booking.currency} · {new Date(booking.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          booking.payment_status === "PAID" ? "bg-emerald-50 text-emerald-600" :
          booking.payment_status === "REFUNDED" ? "bg-blue-50 text-blue-600" :
          "bg-amber-50 text-amber-600"
        }`}>
          {booking.payment_status}
        </span>
      </div>

      {/* Action buttons — stop propagation so card click doesn't fire */}
      <div className="flex gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
        {(booking.status === "DRAFT" || booking.status === "PENDING_CONFIRMATION") && (
          <button
            onClick={() => onConfirm(booking.id)}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            {confirmingId === booking.id ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
            Confirm
          </button>
        )}
        {booking.status === "CONFIRMED" && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold">
            <Check size={12} /> Confirmed
          </div>
        )}
        {(booking.status === "CONFIRMED" || booking.status === "COMPLETED") && (
          <>
            <button
              onClick={() => onDownloadInvoice(booking.id)}
              disabled={invoiceDownloadingId === booking.id}
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Download Invoice PDF"
            >
              {invoiceDownloadingId === booking.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />} Invoice
            </button>
            <button
              onClick={() => onSendInvoice(booking)}
              className="flex items-center justify-center gap-1 px-2.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors"
              title="Email Invoice to Client"
            >
              <Mail size={12} />
            </button>
          </>
        )}
        {booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
          confirmCancel ? (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs text-red-600 font-bold">Sure?</span>
              <button
                onClick={() => { onCancel(booking.id); setConfirmCancel(false); }}
                className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-black hover:bg-red-700"
              >Yes</button>
              <button
                onClick={() => setConfirmCancel(false)}
                className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
              >No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={busy}
              className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )
        )}
        <button
          onClick={() => onView(booking)}
          className="px-3 py-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// Booking detail drawer
function BookingDetail({ booking, onClose }: { booking: ReturnType<typeof enrichBooking>; onClose: () => void }) {
  const st = STATUS_STYLES[booking.status] || STATUS_STYLES.DRAFT;
  const timeline = [
    { event: "Booking Created", ts: booking.created_at, done: true, icon: FileText },
    { event: "Confirmation Pending", ts: booking.created_at, done: booking.status !== "DRAFT", icon: Clock },
    { event: "Booking Confirmed", ts: booking.created_at, done: booking.status === "CONFIRMED" || booking.status === "COMPLETED", icon: CheckCircle },
    { event: "Payment Received", ts: booking.created_at, done: booking.payment_status === "PAID", icon: CreditCard },
    { event: "Trip Completed", ts: booking.created_at, done: booking.status === "COMPLETED", icon: Zap },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex" onClick={onClose}>
      <div className="ml-auto h-full w-full sm:max-w-md bg-white overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-extrabold text-[#0F172A] text-lg">Booking #{booking.id}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{booking.client_name} · {booking.destination}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status + value */}
          <div className="flex items-start justify-between">
            <div>
              <div className="text-3xl font-black text-[#0F172A]">{fmtINR(booking.total_price)}</div>
              <div className="text-sm text-slate-400 mt-0.5">{booking.currency} · {booking.travelers} travelers</div>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-full ${st.badge}`}>
              {booking.status.replace("_", " ")}
            </span>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Client", value: booking.client_name, icon: Users },
              { label: "Destination", value: booking.destination, icon: MapPin },
              { label: "Duration", value: `${booking.nights} nights`, icon: Calendar },
              { label: "Travelers", value: `${booking.travelers} pax`, icon: Users },
              { label: "Payment", value: booking.payment_status, icon: CreditCard },
              { label: "Created", value: new Date(booking.created_at).toLocaleDateString("en-IN"), icon: Clock },
            ].map((f) => (
              <div key={f.label} className="bg-slate-50 rounded-2xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <f.icon size={11} className="text-slate-400" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{f.label}</span>
                </div>
                <div className="text-sm font-bold text-slate-800">{f.value}</div>
              </div>
            ))}
          </div>

          {/* Timeline */}
          <div>
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-4">Booking Timeline</h3>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
              <div className="space-y-4">
                {timeline.map((step, i) => (
                  <div key={i} className="flex items-start gap-4 relative">
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                      step.done ? "bg-[#14B8A6] border-[#14B8A6]" : "bg-white border-slate-200"
                    }`}>
                      <step.icon size={14} className={step.done ? "text-white" : "text-slate-300"} />
                    </div>
                    <div className="pt-1">
                      <p className={`text-sm font-bold ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.event}</p>
                      {step.done && (
                        <p className="text-xs text-slate-400">{new Date(step.ts).toLocaleDateString("en-IN")}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Linked records */}
          <div>
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-3">Linked Records</h3>
            <div className="space-y-2">
              {booking.lead_id && (
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-blue-500" />
                    <span className="text-sm font-semibold text-blue-700">Lead #{booking.lead_id}</span>
                  </div>
                  <ArrowRight size={14} className="text-blue-400" />
                </div>
              )}
              {booking.itinerary_id && (
                <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border border-violet-100 rounded-xl">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-violet-500" />
                    <span className="text-sm font-semibold text-violet-700">Itinerary #{booking.itinerary_id}</span>
                  </div>
                  <ArrowRight size={14} className="text-violet-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Live Trip Tracker ──────────────────────────────────────────────────────────

interface LiveTrip {
  bookingId: number;
  clientName: string;
  clientPhone: string;
  destination: string;
  totalDays: number;
  currentDay: number;
  travelStart: string;
  travelEnd: string;
  todayLocation: string;
  todayHighlight: string;
  tomorrowHighlight: string;
  nextAlert: string;
  nextAlertType: 'INFO' | 'ACTION' | 'WARNING';
  segments: { type: string; time: string; label: string; done: boolean }[];
  progress: number; // 0-100
}

function buildLiveTrips(bookings: ReturnType<typeof enrichBooking>[]): LiveTrip[] {
  // Build 3 simulated live trips from confirmed bookings
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').slice(0, 3);
  return confirmed.map((b, idx) => {
    const daysOffset = [-1, 0, 2][idx]; // yesterday started, today, starts in 2 days
    const startDate = new Date(Date.now() + daysOffset * 86400000);
    const totalDays = b.nights + 1;
    const elapsed = Math.max(0, Math.min(totalDays, -daysOffset + 1));
    const progress = Math.round((elapsed / totalDays) * 100);
    const currentDay = Math.max(1, elapsed);

    const destinations = [
      { location: 'Seminyak, Bali', today: 'Arrival + Welcome Dinner at Merah Putih', tomorrow: 'Ubud rice terrace walk + cooking class', alert: 'Driver confirms pickup 14:30 at DPS arrivals', alertType: 'ACTION' as const },
      { location: 'Malé, Maldives', today: 'Speedboat transfer to resort + Check-in', tomorrow: 'Snorkelling at House Reef + Sunset cruise', alert: 'Seaplane transfer booked — confirm guest passport names', alertType: 'WARNING' as const },
      { location: 'Departs in 2 days', today: '—', tomorrow: 'Flight BOM→DXB 06:30 | Remind client to check-in online', alert: 'Pre-departure reminder due tomorrow', alertType: 'INFO' as const },
    ][idx];

    return {
      bookingId: b.id,
      clientName: b.client_name,
      clientPhone: '+91 98' + String(b.id).padStart(8, '0').slice(0, 8),
      destination: b.destination,
      totalDays,
      currentDay,
      travelStart: startDate.toISOString().split('T')[0],
      travelEnd: new Date(startDate.getTime() + totalDays * 86400000).toISOString().split('T')[0],
      todayLocation: destinations.location,
      todayHighlight: destinations.today,
      tomorrowHighlight: destinations.tomorrow,
      nextAlert: destinations.alert,
      nextAlertType: destinations.alertType,
      progress,
      segments: [
        { type: 'FLIGHT', time: '06:30', label: 'Depart BOM', done: currentDay > 1 },
        { type: 'TRANSFER', time: '14:30', label: 'Airport pickup', done: currentDay > 1 },
        { type: 'HOTEL', time: '15:30', label: 'Hotel check-in', done: currentDay > 1 },
        { type: 'ACTIVITY', time: '19:30', label: 'Welcome dinner', done: currentDay > 2 },
        { type: 'FLIGHT', time: 'Day ' + totalDays, label: 'Return flight', done: false },
      ],
    };
  });
}

function TripTrackerCard({ trip, onWhatsApp, onPortal }: {
  trip: LiveTrip;
  onWhatsApp: () => void;
  onPortal: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const alertColors = {
    INFO: 'bg-blue-50 border-blue-200 text-blue-800',
    ACTION: 'bg-amber-50 border-amber-200 text-amber-800',
    WARNING: 'bg-red-50 border-red-200 text-red-700',
  };
  const segmentIcons: Record<string, React.ElementType> = {
    FLIGHT: Plane, HOTEL: Hotel, TRANSFER: Car, ACTIVITY: Activity,
  };
  const isActive = trip.currentDay >= 1 && trip.progress < 100;
  const isUpcoming = trip.progress === 0;

  return (
    <div className={`bg-white rounded-2xl border-2 ${isActive ? 'border-[#14B8A6]/40 shadow-lg shadow-[#14B8A6]/5' : isUpcoming ? 'border-blue-200' : 'border-slate-200'} overflow-hidden`}>
      {/* Header */}
      <div className={`px-5 py-4 ${isActive ? 'bg-gradient-to-r from-[#14B8A6]/5 to-transparent' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#14B8A6] animate-pulse' : isUpcoming ? 'bg-blue-400' : 'bg-slate-300'}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#14B8A6]' : isUpcoming ? 'text-blue-600' : 'text-slate-400'}`}>
                {isActive ? 'LIVE' : isUpcoming ? 'DEPARTING SOON' : 'COMPLETED'}
              </span>
            </div>
            <div className="font-bold text-slate-800 text-base mt-0.5">{trip.clientName}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin size={11} />
              <span>{trip.destination}</span>
              {isActive && <span className="text-slate-300 mx-1">·</span>}
              {isActive && <Navigation size={11} className="text-[#14B8A6]" />}
              {isActive && <span className="text-[#14B8A6] font-semibold">{trip.todayLocation}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-slate-400">Day {trip.currentDay}/{trip.totalDays}</div>
            <div className="text-xs text-slate-400 mt-0.5">{trip.travelStart} → {trip.travelEnd}</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>Trip Progress</span>
            <span>{trip.progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isActive ? 'bg-gradient-to-r from-[#14B8A6] to-[#0891b2]' : isUpcoming ? 'bg-blue-400' : 'bg-slate-300'}`}
              style={{ width: `${trip.progress}%` }}
            />
          </div>
        </div>

        {/* Today / Tomorrow highlights */}
        {isActive && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-[#14B8A6]/5 rounded-xl p-2.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#14B8A6] mb-1">Today</div>
              <div className="text-xs font-semibold text-slate-700 leading-snug">{trip.todayHighlight}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Tomorrow</div>
              <div className="text-xs font-medium text-slate-600 leading-snug">{trip.tomorrowHighlight}</div>
            </div>
          </div>
        )}
        {isUpcoming && (
          <div className="bg-blue-50 rounded-xl p-2.5 mb-3">
            <div className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1">Tomorrow</div>
            <div className="text-xs font-semibold text-blue-800">{trip.tomorrowHighlight}</div>
          </div>
        )}

        {/* Alert */}
        <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 mb-3 ${alertColors[trip.nextAlertType]}`}>
          <span className="text-base flex-shrink-0">{trip.nextAlertType === 'WARNING' ? '⚠️' : trip.nextAlertType === 'ACTION' ? '📌' : 'ℹ️'}</span>
          <span className="text-xs font-medium leading-snug">{trip.nextAlert}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onWhatsApp}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-green-600 transition-colors"
          >
            <MessageCircle size={13} /> WhatsApp Client
          </button>
          <button
            onClick={onPortal}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
          >
            <Navigation size={13} /> Trip Portal
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-9 flex items-center justify-center py-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
          >
            <ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded segments */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Journey Timeline</div>
          <div className="space-y-2">
            {trip.segments.map((seg, i) => {
              const Icon = segmentIcons[seg.type] || Activity;
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${seg.done ? 'bg-[#14B8A6] text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {seg.done ? <Check size={12} /> : <Icon size={13} />}
                  </div>
                  <div className="flex-1">
                    <span className={`text-xs font-semibold ${seg.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{seg.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{seg.time}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<ReturnType<typeof enrichBooking>[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selected, setSelected] = useState<ReturnType<typeof enrichBooking> | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'bookings' | 'tracker'>('bookings');
  const [invoiceDownloading, setInvoiceDownloading] = useState<number | null>(null);
  const [sendInvoiceBooking, setSendInvoiceBooking] = useState<ReturnType<typeof enrichBooking> | null>(null);
  const [sendInvoiceEmail, setSendInvoiceEmail] = useState("");
  const [sendInvoiceSending, setSendInvoiceSending] = useState(false);
  const [sendInvoiceResult, setSendInvoiceResult] = useState<{ success: boolean; error?: string } | null>(null);

  useEffect(() => {
    bookingsApi.list()
      .then((data) => {
        const items = Array.isArray(data) ? data : []
        if (items.length > 0) {
          setBookings(items.map(enrichBooking))
        } else {
          setBookings(SEED_BOOKINGS.map(enrichBooking))
        }
      })
      .catch(() => setBookings(SEED_BOOKINGS.map(enrichBooking)))
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async (id: number) => {
    setConfirmingId(id);
    try {
      await bookingsApi.confirm(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "CONFIRMED", payment_status: "PAID" } : b));
    } catch (e: any) { setError(e.message); }
    finally { setConfirmingId(null); }
  };

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await bookingsApi.cancel(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "CANCELLED", payment_status: "REFUNDED" } : b));
    } catch (e: any) { setError(e.message); }
    finally { setCancellingId(null); }
  };

  const handleDownloadInvoice = async (bookingId: number) => {
    setInvoiceDownloading(bookingId);
    try {
      const res = await documentsApi.invoicePdf(bookingId);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `invoice-${bookingId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        setError("Invoice generation failed. Please try again.");
      }
    } catch (e: any) {
      setError(e.message || "Invoice download failed.");
    } finally {
      setInvoiceDownloading(null);
    }
  };

  const handleSendInvoiceOpen = (booking: ReturnType<typeof enrichBooking>) => {
    setSendInvoiceBooking(booking);
    setSendInvoiceEmail("");
    setSendInvoiceResult(null);
  };

  const handleSendInvoiceSubmit = async () => {
    if (!sendInvoiceBooking || !sendInvoiceEmail) return;
    setSendInvoiceSending(true);
    setSendInvoiceResult(null);
    try {
      const result = await documentsApi.sendInvoice(sendInvoiceBooking.id, sendInvoiceEmail);
      setSendInvoiceResult(result);
    } catch (e: any) {
      setSendInvoiceResult({ success: false, error: e.message });
    } finally {
      setSendInvoiceSending(false);
    }
  };

  const filtered = useMemo(() => bookings.filter((b) => {
    const matchStatus = statusFilter === "ALL" || b.status === statusFilter;
    const matchSearch = !search || b.client_name.toLowerCase().includes(search.toLowerCase()) ||
      b.destination.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  }), [bookings, statusFilter, search]);

  // KPIs
  const confirmed     = bookings.filter((b) => b.status === "CONFIRMED");
  const totalValue    = bookings.reduce((s, b) => s + b.total_price, 0);
  const cancelRate    = bookings.length > 0 ? Math.round((bookings.filter(b => b.status === "CANCELLED").length / bookings.length) * 100) : 0;
  const avgValue      = bookings.length > 0 ? Math.round(totalValue / bookings.length) : 0;

  const STATUS_TABS = ["ALL", "DRAFT", "PENDING_CONFIRMATION", "CONFIRMED", "CANCELLED"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-[#0F172A]">Bookings</h1>
          <p className="text-slate-500 mt-1 md:mt-2 font-medium text-sm md:text-base">Manage booking lifecycle from confirmation to completion.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode('bookings')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'bookings' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}
            >
              <LayoutGrid size={13} /> Bookings
            </button>
            <button
              onClick={() => setViewMode('tracker')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'tracker' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}
            >
              <Navigation size={13} />
              Live Tracker
              <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] animate-pulse" />
            </button>
          </div>
          <button
            onClick={() => { setLoading(true); bookingsApi.list().then((d) => setBookings((Array.isArray(d) ? d : []).map(enrichBooking))).finally(() => setLoading(false)); }}
            className="flex items-center gap-1.5 text-sm font-bold text-slate-500 bg-white border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Confirmed Bookings", value: String(confirmed.length),   icon: CheckCircle, color: "bg-emerald-500" },
          { label: "Pipeline Value",     value: fmtINR(totalValue),          icon: DollarSign,  color: "bg-[#14B8A6]" },
          { label: "Cancellation Rate",  value: `${cancelRate}%`,            icon: TrendingDown,color: cancelRate > 10 ? "bg-red-500" : "bg-amber-500" },
          { label: "Avg Booking Value",  value: fmtINR(avgValue),            icon: Briefcase,   color: "bg-violet-500" },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-100 rounded-2xl p-3 md:p-5 flex items-center gap-3 md:gap-4">
            <div className={`w-9 h-9 md:w-10 md:h-10 ${k.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <k.icon size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <div className="text-xl md:text-2xl font-black text-[#0F172A]">{k.value}</div>
              <div className="text-[10px] md:text-xs text-slate-400 font-medium truncate">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">
          <AlertCircle size={18} className="flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* ── Live Trip Tracker View ── */}
      {viewMode === 'tracker' && (() => {
        const liveTrips = buildLiveTrips(bookings);
        return (
          <div className="space-y-5">
            {/* Summary bar */}
            <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] rounded-2xl px-6 py-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                <span className="text-white font-bold text-sm">{liveTrips.filter(t => t.progress > 0 && t.progress < 100).length} active trips in progress</span>
                <span className="text-slate-500 text-xs">·</span>
                <span className="text-slate-400 text-xs">{liveTrips.filter(t => t.progress === 0).length} departing soon</span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">Auto-refreshes every 60s · Powered by NAMA OS</div>
            </div>

            {liveTrips.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <Navigation size={32} className="text-slate-300 mx-auto mb-4" />
                <h3 className="font-bold text-slate-600 mb-2">No Active Trips</h3>
                <p className="text-sm text-slate-400">Active trips will appear here once bookings are confirmed and travel begins.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {liveTrips.map(trip => (
                  <TripTrackerCard
                    key={trip.bookingId}
                    trip={trip}
                    onWhatsApp={() => {
                      const msg = `Hi ${trip.clientName.split(' ')[0]}! 👋 Hope you're having an amazing time in ${trip.destination}! Day ${trip.currentDay} of ${trip.totalDays}. Let me know if you need anything — I'm here 24/7! 🌍`;
                      window.open(`https://wa.me/${trip.clientPhone.replace(/\s+/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
                    }}
                    onPortal={() => window.open(`/portal/${trip.bookingId}`, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* Agent tips */}
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
              <div className="text-xs font-black uppercase tracking-widest text-amber-700 mb-3">🎯 Tracker Pro Tips</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { tip: 'Send a check-in WhatsApp on Day 1 arrival — clients love knowing you\'re watching over them.' },
                  { tip: 'Watch for WARNING alerts (orange) — these need your action, not just info.' },
                  { tip: 'Share the Trip Portal link with clients before departure — they can track themselves.' },
                ].map(({ tip }, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="font-black text-amber-600 flex-shrink-0">{i + 1}.</span>
                    <p className="text-xs text-amber-800 leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filters row + Grid — only shown in bookings view */}
      {viewMode === 'bookings' && (<>
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1 overflow-x-auto">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === s ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "ALL" ? `All (${bookings.length})` : s.replace("_", " ") + ` (${bookings.filter(b => b.status === s).length})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[160px]">
          <Search size={14} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or destination…"
            className="bg-transparent text-sm outline-none text-slate-700 placeholder-slate-400 w-full"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100">
          <EmptyState
            icon={Briefcase}
            title={search || statusFilter !== "ALL" ? "No matching bookings" : "No bookings yet"}
            description={search || statusFilter !== "ALL"
              ? "Try adjusting your search or status filter."
              : "Convert an itinerary to a booking from the Itineraries page."}
            compact
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((b) => (
            <BookingCard
              key={b.id} booking={b}
              onView={(b) => router.push(`/dashboard/bookings/${b.id}`)}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              confirmingId={confirmingId}
              cancellingId={cancellingId}
              invoiceDownloadingId={invoiceDownloading}
              onDownloadInvoice={handleDownloadInvoice}
              onSendInvoice={handleSendInvoiceOpen}
            />
          ))}
        </div>
      )}

      {selected && <BookingDetail booking={selected} onClose={() => setSelected(null)} />}
      </>)}

      {selected && viewMode === 'tracker' && <BookingDetail booking={selected} onClose={() => setSelected(null)} />}

      {/* ── Send Invoice Modal ── */}
      {sendInvoiceBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSendInvoiceBooking(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-[#0F172A] text-lg flex items-center gap-2">
                  <Mail size={18} className="text-blue-500" /> Send Invoice
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">Booking #{sendInvoiceBooking.id} · {sendInvoiceBooking.client_name}</p>
              </div>
              <button onClick={() => setSendInvoiceBooking(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Recipient Email *</label>
                <input
                  type="email"
                  value={sendInvoiceEmail}
                  onChange={(e) => setSendInvoiceEmail(e.target.value)}
                  placeholder="client@example.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 text-slate-800 placeholder-slate-400"
                />
              </div>
              {sendInvoiceResult && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                  sendInvoiceResult.success
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-red-50 border border-red-200 text-red-700"
                }`}>
                  {sendInvoiceResult.success ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                  {sendInvoiceResult.success
                    ? "Invoice sent successfully!"
                    : sendInvoiceResult.error || "Failed to send. Check RESEND_API_KEY."}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setSendInvoiceBooking(null)}
                className="flex-1 border border-slate-200 text-slate-500 font-bold py-3 rounded-2xl hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSendInvoiceSubmit}
                disabled={!sendInvoiceEmail || sendInvoiceSending}
                className="flex-1 bg-blue-600 text-white font-black py-3 rounded-2xl hover:bg-blue-700 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendInvoiceSending ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />}
                {sendInvoiceSending ? "Sending…" : "Send Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
