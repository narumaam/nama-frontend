"use client";

/**
 * M7 — Booking Detail (Stitch Redesign)
 * ----------------------------------------
 * Full-page booking detail view with tabs:
 *   Overview · Flights · Hotels · Transport · Itinerary · Documents · Payments · Notes
 *
 * Top header: Booking ID, status pill, client, destination, dates
 * Right cards: Total Value, Margin, Payment status
 * Tab content changes below
 */

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Hotel, Car, Map, FileText, StickyNote,
  LayoutGrid, Clock, AlertCircle, MapPin, Users, Calendar, Download,
  Mail, Phone, MessageCircle, Edit2, Plus, Printer, Send, Star,
  Loader, Check, Navigation, Shield, Copy, ExternalLink,
} from "lucide-react";
import { bookingsApi, documentsApi, Booking } from "@/lib/api";

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmtINR = (n: number) => {
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)  return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000)     return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const STATUS_CFG: Record<string, { badge: string; dot: string; label: string }> = {
  DRAFT:                { badge: "bg-slate-100 text-slate-600 border-slate-200",   dot: "bg-slate-400",    label: "Draft" },
  PENDING_CONFIRMATION: { badge: "bg-amber-50 text-amber-700 border-amber-200",    dot: "bg-amber-400",    label: "Pending" },
  CONFIRMED:            { badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Confirmed" },
  CANCELLED:            { badge: "bg-red-50 text-red-600 border-red-200",           dot: "bg-red-400",      label: "Cancelled" },
  COMPLETED:            { badge: "bg-blue-50 text-blue-700 border-blue-200",        dot: "bg-blue-400",     label: "Completed" },
};

// ── Seed data ──────────────────────────────────────────────────────────────────
const SEED_BOOKINGS: Booking[] = [
  { id: 1001, tenant_id: 1, lead_id: 1, itinerary_id: 1, status: 'CONFIRMED',            total_price: 185000, currency: 'INR', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: 1002, tenant_id: 1, lead_id: 2, itinerary_id: 2, status: 'PENDING_CONFIRMATION', total_price: 420000, currency: 'INR', created_at: new Date(Date.now() - 172800000).toISOString() },
  { id: 1003, tenant_id: 1, lead_id: 3, itinerary_id: 3, status: 'CONFIRMED',            total_price: 95000,  currency: 'INR', created_at: new Date(Date.now() - 259200000).toISOString() },
  { id: 1004, tenant_id: 1, lead_id: 4, itinerary_id: 4, status: 'COMPLETED',            total_price: 680000, currency: 'INR', created_at: new Date(Date.now() - 604800000).toISOString() },
  { id: 1005, tenant_id: 1, lead_id: 5, itinerary_id: 5, status: 'DRAFT',                total_price: 240000, currency: 'INR', created_at: new Date(Date.now() - 432000000).toISOString() },
  { id: 1006, tenant_id: 1, lead_id: 6, itinerary_id: 6, status: 'CANCELLED',            total_price: 155000, currency: 'INR', created_at: new Date(Date.now() - 1209600000).toISOString() },
];

const ENRICHMENT = [
  { client_name: "Ravi Mehta",     destination: "Bali, Indonesia",  nights: 6, travelers: 2, phone: "+91 98765 43210", email: "ravi.mehta@email.com",     depart: "2026-05-12", return: "2026-05-18", ref: "BK-BALI-1001", margin: 22 },
  { client_name: "Priya Singh",    destination: "Maldives",         nights: 7, travelers: 4, phone: "+91 97654 32109", email: "priya.singh@email.com",    depart: "2026-06-01", return: "2026-06-08", ref: "BK-MALD-1002", margin: 18 },
  { client_name: "Ananya Rao",     destination: "Rajasthan",        nights: 5, travelers: 2, phone: "+91 96543 21098", email: "ananya.rao@email.com",     depart: "2026-04-25", return: "2026-04-30", ref: "BK-RAJ-1003",  margin: 25 },
  { client_name: "Karan Kapoor",   destination: "Dubai",            nights: 6, travelers: 3, phone: "+91 95432 10987", email: "karan.kapoor@email.com",   depart: "2026-05-20", return: "2026-05-26", ref: "BK-DXB-1004",  margin: 20 },
  { client_name: "Deepika Nair",   destination: "Thailand",         nights: 8, travelers: 2, phone: "+91 94321 09876", email: "deepika.nair@email.com",   depart: "2026-07-10", return: "2026-07-18", ref: "BK-BKK-1005",  margin: 23 },
  { client_name: "Amit Shah",      destination: "Goa",              nights: 4, travelers: 6, phone: "+91 93210 98765", email: "amit.shah@email.com",      depart: "2026-04-28", return: "2026-05-02", ref: "BK-GOA-1006",  margin: 30 },
];

// Per-booking seed data for each tab
const FLIGHTS_DATA = [
  {
    outbound: [
      { airline: "Air India", logo: "AI", flight: "AI-110", from: "BOM", to: "DPS", dep: "06:30", arr: "14:45", date: "12 May 2026", class: "Economy", pnr: "WQRT89", status: "CONFIRMED" },
    ],
    return: [
      { airline: "IndiGo",   logo: "6E", flight: "6E-901", from: "DPS", to: "BOM", dep: "15:20", arr: "19:05", date: "18 May 2026", class: "Economy", pnr: "XKJP23", status: "CONFIRMED" },
    ],
    requirements: [
      { item: "Passport valid for 6 months", done: true },
      { item: "Visa on arrival printed", done: true },
      { item: "Travel insurance purchased", done: false },
      { item: "Check-in reminder sent (24h)", done: false },
    ],
  },
  {
    outbound: [
      { airline: "Emirates",  logo: "EK", flight: "EK-500", from: "BOM", to: "DXB", dep: "02:15", arr: "04:20", date: "01 Jun 2026", class: "Business", pnr: "ABLM45", status: "CONFIRMED" },
      { airline: "Emirates",  logo: "EK", flight: "EK-651", from: "DXB", to: "MLE", dep: "08:40", arr: "13:05", date: "01 Jun 2026", class: "Business", pnr: "ABLM45", status: "CONFIRMED" },
    ],
    return: [
      { airline: "Emirates",  logo: "EK", flight: "EK-652", from: "MLE", to: "DXB", dep: "14:15", arr: "17:20", date: "08 Jun 2026", class: "Business", pnr: "CDPQ77", status: "CONFIRMED" },
    ],
    requirements: [
      { item: "Passport valid for 6 months", done: true },
      { item: "Tourist visa obtained", done: true },
      { item: "Travel insurance purchased", done: true },
      { item: "Seaplane transfer names confirmed", done: false },
    ],
  },
];

const HOTELS_DATA = [
  [
    { name: "Anantara Seminyak Resort", location: "Seminyak, Bali", checkin: "12 May 2026", checkout: "15 May 2026", nights: 3, rooms: 1, type: "Ocean View Suite", status: "CONFIRMED", ref: "HV-12348", cost: 45000 },
    { name: "Four Seasons Resort Bali",  location: "Jimbaran, Bali",  checkin: "15 May 2026", checkout: "18 May 2026", nights: 3, rooms: 1, type: "Jimbaran Pool Villa", status: "CONFIRMED", ref: "FS-99217", cost: 78000 },
  ],
  [
    { name: "Soneva Jani",               location: "Noonu Atoll",      checkin: "01 Jun 2026", checkout: "08 Jun 2026", nights: 7, rooms: 1, type: "Water Retreat 1BR",  status: "CONFIRMED", ref: "SJ-44521", cost: 280000 },
  ],
];

const TRANSPORT_DATA = [
  [
    { type: "Airport Transfer", provider: "Bali Taxi Co.",     from: "DPS Airport",      to: "Anantara Seminyak", date: "12 May 2026", time: "14:30", vehicle: "Toyota Innova", pax: 2, status: "CONFIRMED", cost: 2500 },
    { type: "Inter-Hotel",      provider: "Bali Taxi Co.",     from: "Anantara Seminyak", to: "Four Seasons Jimbaran", date: "15 May 2026", time: "11:00", vehicle: "Toyota Innova", pax: 2, status: "CONFIRMED", cost: 1800 },
    { type: "Airport Transfer", provider: "Bali Taxi Co.",     from: "Four Seasons",     to: "DPS Airport",       date: "18 May 2026", time: "12:00", vehicle: "Toyota Innova", pax: 2, status: "PENDING", cost: 2500 },
  ],
  [
    { type: "Speedboat",        provider: "Maldives Transfers", from: "Malé Airport",    to: "Soneva Jani",       date: "01 Jun 2026", time: "15:00", vehicle: "Speedboat",     pax: 4, status: "CONFIRMED", cost: 18000 },
  ],
];

const PAYMENTS_DATA = [
  [
    { type: "Deposit",   amount: 46250, date: "02 Apr 2026", method: "Bank Transfer", ref: "TXN-A1234", status: "RECEIVED" },
    { type: "Balance",   amount: 138750, date: "30 Apr 2026", method: "Pending",       ref: "—",         status: "PENDING" },
  ],
  [
    { type: "Full Payment", amount: 420000, date: "15 Apr 2026", method: "Bank Transfer", ref: "TXN-B5678", status: "RECEIVED" },
  ],
];

const DOCUMENTS_DATA = [
  [
    { name: "Quotation_Mehta_Bali.pdf",   type: "Quotation",    date: "28 Mar 2026", size: "420 KB" },
    { name: "Invoice_Mehta_Bali.pdf",      type: "Invoice",      date: "05 Apr 2026", size: "380 KB" },
    { name: "Voucher_Anantara.pdf",        type: "Hotel Voucher",date: "10 Apr 2026", size: "210 KB" },
    { name: "FlightItinerary_AI110.pdf",   type: "Flight",       date: "10 Apr 2026", size: "195 KB" },
    { name: "TravelInsurance_Mehta.pdf",   type: "Insurance",    date: "12 Apr 2026", size: "540 KB" },
  ],
  [
    { name: "Quotation_Singh_Maldives.pdf", type: "Quotation",   date: "01 Apr 2026", size: "560 KB" },
    { name: "Invoice_Singh_Maldives.pdf",   type: "Invoice",     date: "08 Apr 2026", size: "490 KB" },
    { name: "Voucher_SonevaJani.pdf",       type: "Hotel Voucher",date: "15 Apr 2026", size: "310 KB" },
  ],
];

const DOC_TYPE_COLORS: Record<string, string> = {
  "Quotation":     "bg-violet-50 text-violet-700",
  "Invoice":       "bg-blue-50 text-blue-700",
  "Hotel Voucher": "bg-emerald-50 text-emerald-700",
  "Flight":        "bg-amber-50 text-amber-700",
  "Insurance":     "bg-rose-50 text-rose-700",
};

// ── Tab definitions ────────────────────────────────────────────────────────────
// For launch: only Overview / Itinerary / Notes are surfaced. Flights, Hotels,
// Transport, Documents, Payments tabs ship with real backend wiring in the
// next release — currently each one renders hardcoded mock data indexed by
// (booking.id % 2), which is misleading on a real customer's booking.
const TABS = [
  { id: "overview",  label: "Overview",  icon: LayoutGrid },
  { id: "itinerary", label: "Itinerary", icon: Map },
  { id: "notes",     label: "Notes",     icon: StickyNote },
] as const;
type TabId = typeof TABS[number]["id"];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.DRAFT;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
        <h3 className="text-sm font-bold text-[#1B2E5E]">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Tab: Overview ──────────────────────────────────────────────────────────────
function OverviewTab({ booking, enriched }: { booking: Booking; enriched: typeof ENRICHMENT[0] }) {
  const timeline = [
    { event: "Booking Created",      done: true,                                    desc: new Date(booking.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) },
    { event: "Quote Sent",           done: booking.status !== "DRAFT",              desc: "Quotation emailed to client" },
    { event: "Booking Confirmed",    done: ["CONFIRMED","COMPLETED"].includes(booking.status), desc: "Deposit received & PNR issued" },
    { event: "Final Payment",        done: booking.status === "COMPLETED",          desc: "Balance cleared before departure" },
    { event: "Trip Departed",        done: booking.status === "COMPLETED",          desc: enriched.depart },
    { event: "Trip Completed",       done: booking.status === "COMPLETED",          desc: enriched.return },
  ];

  const priceSplit = [
    { label: "Flights",   value: Math.round(booking.total_price * 0.38) },
    { label: "Hotels",    value: Math.round(booking.total_price * 0.44) },
    { label: "Transport", value: Math.round(booking.total_price * 0.08) },
    { label: "Activities",value: Math.round(booking.total_price * 0.07) },
    { label: "Misc.",     value: Math.round(booking.total_price * 0.03) },
  ];
  const marginAmt = Math.round(booking.total_price * enriched.margin / 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Left: timeline + price breakdown */}
      <div className="lg:col-span-2 space-y-5">
        <SectionCard title="Booking Timeline">
          <div className="relative">
            <div className="absolute left-3.5 top-0 bottom-0 w-0.5 bg-slate-100" />
            <div className="space-y-5">
              {timeline.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                    step.done ? "bg-[#14B8A6] border-[#14B8A6]" : "bg-white border-slate-200"
                  }`}>
                    {step.done && <Check size={12} className="text-white" />}
                  </div>
                  <div className="pt-0.5">
                    <p className={`text-sm font-semibold ${step.done ? "text-slate-800" : "text-slate-400"}`}>{step.event}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Price Breakdown">
          <div className="space-y-3">
            {priceSplit.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="text-sm text-slate-500 w-24">{item.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-[#14B8A6]"
                    style={{ width: `${Math.round((item.value / booking.total_price) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-slate-700 w-20 text-right">{fmtINR(item.value)}</span>
              </div>
            ))}
            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">Total</span>
              <span className="text-sm font-extrabold text-[#1B2E5E]">{fmtINR(booking.total_price)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">Margin ({enriched.margin}%)</span>
              <span className="text-sm font-bold text-emerald-600">+{fmtINR(marginAmt)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Right: client + quick info */}
      <div className="space-y-5">
        <SectionCard title="Client Details">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[#1B2E5E] flex items-center justify-center text-white font-bold text-sm">
              {enriched.client_name.split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <div className="font-bold text-slate-800">{enriched.client_name}</div>
              <div className="text-xs text-slate-400">Lead #{booking.lead_id}</div>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Mail size={13} className="text-slate-400" />
              {enriched.email}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Phone size={13} className="text-slate-400" />
              {enriched.phone}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <MapPin size={13} className="text-slate-400" />
              {enriched.destination}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Calendar size={13} className="text-slate-400" />
              {enriched.depart} → {enriched.return}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Users size={13} className="text-slate-400" />
              {enriched.travelers} traveler{enriched.travelers > 1 ? "s" : ""}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 transition-colors">
              <Phone size={12} /> Call
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#14B8A6]/10 text-[#14B8A6] rounded-xl text-xs font-semibold hover:bg-[#14B8A6]/20 transition-colors">
              <MessageCircle size={12} /> WhatsApp
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Trip Summary">
          <div className="space-y-2.5">
            {[
              { label: "Booking Ref", value: enriched.ref },
              { label: "Duration",    value: `${enriched.nights} nights` },
              { label: "Travelers",   value: `${enriched.travelers} pax` },
              { label: "Departure",   value: enriched.depart },
              { label: "Return",      value: enriched.return },
              { label: "Itinerary",   value: `#${booking.itinerary_id}` },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center">
                <span className="text-xs text-slate-400">{row.label}</span>
                <span className="text-xs font-semibold text-slate-700">{row.value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Actions">
          <div className="space-y-2">
            <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-[#1B2E5E] text-white rounded-xl text-sm font-semibold hover:bg-[#1B2E5E]/90 transition-colors">
              <Send size={13} /> Send Quote / Update
            </button>
            <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
              <Map size={13} /> View Itinerary
            </button>
            <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
              <Printer size={13} /> Print Invoice
            </button>
            <button className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
              <Shield size={13} /> Client Portal
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ── Tab: Flights ───────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FlightsTab({ booking }: { booking: Booking }) {
  const idx = Math.min(booking.id % 2, FLIGHTS_DATA.length - 1);
  const data = FLIGHTS_DATA[idx];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {/* Outbound */}
        <SectionCard
          title="Outbound Flights"
          action={<button className="flex items-center gap-1 text-xs text-[#14B8A6] font-semibold hover:underline"><Plus size={12} /> Add segment</button>}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="text-left py-2 pr-4 font-semibold">Airline</th>
                  <th className="text-left py-2 pr-4 font-semibold">Route</th>
                  <th className="text-left py-2 pr-4 font-semibold">Departure</th>
                  <th className="text-left py-2 pr-4 font-semibold">Arrival</th>
                  <th className="text-left py-2 pr-4 font-semibold">Class</th>
                  <th className="text-left py-2 font-semibold">PNR</th>
                </tr>
              </thead>
              <tbody>
                {data.outbound.map((seg, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1B2E5E] flex items-center justify-center text-white text-xs font-black">{seg.logo}</div>
                        <div>
                          <div className="font-semibold text-slate-800">{seg.airline}</div>
                          <div className="text-xs text-slate-400">{seg.flight}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{seg.from}</span>
                        <Navigation size={12} className="text-[#14B8A6] rotate-90" />
                        <span className="font-bold text-slate-800">{seg.to}</span>
                      </div>
                      <div className="text-xs text-slate-400">{seg.date}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-800">{seg.dep}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-semibold text-slate-800">{seg.arr}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-slate-600">{seg.class}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{seg.pnr}</code>
                        <button className="text-slate-400 hover:text-slate-600"><Copy size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Return */}
        <SectionCard title="Return Flights">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-50">
                  <th className="text-left py-2 pr-4 font-semibold">Airline</th>
                  <th className="text-left py-2 pr-4 font-semibold">Route</th>
                  <th className="text-left py-2 pr-4 font-semibold">Departure</th>
                  <th className="text-left py-2 pr-4 font-semibold">Arrival</th>
                  <th className="text-left py-2 pr-4 font-semibold">Class</th>
                  <th className="text-left py-2 font-semibold">PNR</th>
                </tr>
              </thead>
              <tbody>
                {data.return.map((seg, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#1B2E5E] flex items-center justify-center text-white text-xs font-black">{seg.logo}</div>
                        <div>
                          <div className="font-semibold text-slate-800">{seg.airline}</div>
                          <div className="text-xs text-slate-400">{seg.flight}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{seg.from}</span>
                        <Navigation size={12} className="text-[#14B8A6] rotate-90" />
                        <span className="font-bold text-slate-800">{seg.to}</span>
                      </div>
                      <div className="text-xs text-slate-400">{seg.date}</div>
                    </td>
                    <td className="py-3 pr-4"><span className="font-semibold text-slate-800">{seg.dep}</span></td>
                    <td className="py-3 pr-4"><span className="font-semibold text-slate-800">{seg.arr}</span></td>
                    <td className="py-3 pr-4"><span className="text-slate-600">{seg.class}</span></td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">{seg.pnr}</code>
                        <button className="text-slate-400 hover:text-slate-600"><Copy size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      {/* Right column */}
      <div className="space-y-5">
        <SectionCard title="Flight Requirements">
          <div className="space-y-3">
            {data.requirements.map((req, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  req.done ? "bg-emerald-100" : "bg-slate-100"
                }`}>
                  {req.done
                    ? <Check size={11} className="text-emerald-600" />
                    : <Clock size={11} className="text-slate-400" />
                  }
                </div>
                <span className={`text-sm ${req.done ? "text-slate-600 line-through" : "text-slate-700"}`}>{req.item}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Quick Notes">
          <textarea
            className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
            rows={5}
            defaultValue="Passenger prefers window seats. Vegetarian meals requested on both sectors. Client is a frequent flyer — check for upgrade eligibility."
          />
        </SectionCard>
      </div>
    </div>
  );
}

// ── Tab: Hotels ────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function HotelsTab({ booking }: { booking: Booking }) {
  const idx = Math.min(booking.id % 2, HOTELS_DATA.length - 1);
  const hotels = HOTELS_DATA[idx];

  return (
    <div className="space-y-4">
      {hotels.map((h, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-start gap-5 p-5">
            {/* Hotel image placeholder */}
            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center flex-shrink-0">
              <Hotel size={28} className="text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-[#1B2E5E] text-base">{h.name}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="text-xs text-slate-400">{h.location}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={10} className="text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold flex-shrink-0">
                  {h.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Check-in</div>
                  <div className="text-xs font-bold text-slate-700">{h.checkin}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Check-out</div>
                  <div className="text-xs font-bold text-slate-700">{h.checkout}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Room Type</div>
                  <div className="text-xs font-bold text-slate-700">{h.type}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-2.5">
                  <div className="text-[10px] text-slate-400 uppercase font-semibold mb-0.5">Booking Ref</div>
                  <div className="text-xs font-mono font-bold text-slate-700">{h.ref}</div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400">{h.nights} nights · {h.rooms} room</span>
              <span className="ml-3 text-sm font-extrabold text-[#1B2E5E]">{fmtINR(h.cost)}</span>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <Download size={11} /> Voucher
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors">
                <Edit2 size={11} /> Edit
              </button>
            </div>
          </div>
        </div>
      ))}

      <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors">
        <Plus size={15} /> Add Hotel
      </button>
    </div>
  );
}

// ── Tab: Transport ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TransportTab({ booking }: { booking: Booking }) {
  const idx = Math.min(booking.id % 2, TRANSPORT_DATA.length - 1);
  const transfers = TRANSPORT_DATA[idx];

  return (
    <div className="space-y-3">
      {transfers.map((t, i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#1B2E5E]/5 flex items-center justify-center flex-shrink-0">
            <Car size={18} className="text-[#1B2E5E]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <div className="font-bold text-slate-800">{t.type}</div>
                <div className="text-xs text-slate-400">{t.provider} · {t.vehicle}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                t.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}>{t.status}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin size={11} className="text-slate-400 flex-shrink-0" />
              <span className="font-medium">{t.from}</span>
              <Navigation size={11} className="text-[#14B8A6]" />
              <span className="font-medium">{t.to}</span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span><Calendar size={11} className="inline mr-1" />{t.date}</span>
              <span><Clock size={11} className="inline mr-1" />{t.time}</span>
              <span><Users size={11} className="inline mr-1" />{t.pax} pax</span>
              <span className="font-semibold text-slate-600">{fmtINR(t.cost)}</span>
            </div>
          </div>
        </div>
      ))}
      <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors">
        <Plus size={15} /> Add Transfer
      </button>
    </div>
  );
}

// ── Tab: Itinerary ─────────────────────────────────────────────────────────────
function ItineraryTab({ enriched }: { booking: Booking; enriched: typeof ENRICHMENT[0] }) {
  const days = Math.min(enriched.nights, 5);
  const dayActivities = [
    ["Arrival & Transfer to Hotel", "Welcome Dinner at Rooftop Restaurant", "Check-in & Freshen up"],
    ["City Tour – Major Landmarks", "Lunch at Local Restaurant", "Sunset Viewpoint Visit", "Night Market Walk"],
    ["Day Trip to Nature Reserve", "Guided Hiking Experience", "Traditional Village Visit"],
    ["Leisure Day – Beach/Pool", "Optional Spa Treatment", "Shopping at Local Market"],
    ["Check-out & Departure Transfer", "Airport Drop-off"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{enriched.nights}-night itinerary · {enriched.destination}</p>
        <a href="/dashboard/itineraries" className="flex items-center gap-1.5 text-sm text-[#14B8A6] font-semibold hover:underline">
          Open full editor <ExternalLink size={13} />
        </a>
      </div>
      {Array.from({ length: days }).map((_, di) => (
        <div key={di} className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-[#1B2E5E] flex items-center justify-center text-white text-xs font-black">
              {di + 1}
            </div>
            <span className="font-bold text-[#1B2E5E] text-sm">Day {di + 1}</span>
            <span className="text-xs text-slate-400 ml-auto">
              {new Date(new Date(enriched.depart).getTime() + di * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short" })}
            </span>
          </div>
          <div className="p-4 space-y-2">
            {(dayActivities[di] || dayActivities[0]).map((act, ai) => (
              <div key={ai} className="flex items-center gap-3 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] flex-shrink-0" />
                <span className="text-sm text-slate-700">{act}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Documents ─────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DocumentsTab({ booking }: { booking: Booking }) {
  const idx = Math.min(booking.id % 2, DOCUMENTS_DATA.length - 1);
  const docs = DOCUMENTS_DATA[idx];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {docs.map((doc, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center gap-3 hover:border-slate-200 transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 truncate">{doc.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${DOC_TYPE_COLORS[doc.type] || "bg-slate-100 text-slate-600"}`}>
                  {doc.type}
                </span>
                <span className="text-[10px] text-slate-400">{doc.date} · {doc.size}</span>
              </div>
            </div>
            <button className="p-2 text-slate-300 group-hover:text-slate-500 transition-colors">
              <Download size={15} />
            </button>
          </div>
        ))}
      </div>
      <button className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm text-slate-400 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-colors">
        <Plus size={15} /> Upload Document
      </button>
    </div>
  );
}

// ── Tab: Payments ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PaymentsTab({ booking }: { booking: Booking }) {
  const idx = Math.min(booking.id % 2, PAYMENTS_DATA.length - 1);
  const payments = PAYMENTS_DATA[idx];
  const received  = payments.filter(p => p.status === "RECEIVED").reduce((s, p) => s + p.amount, 0);
  const pending   = payments.filter(p => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <div className="text-xs text-slate-400 uppercase font-semibold mb-1">Total Value</div>
          <div className="text-xl font-extrabold text-[#1B2E5E]">{fmtINR(booking.total_price)}</div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <div className="text-xs text-emerald-600 uppercase font-semibold mb-1">Received</div>
          <div className="text-xl font-extrabold text-emerald-700">{fmtINR(received)}</div>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="text-xs text-amber-600 uppercase font-semibold mb-1">Pending</div>
          <div className="text-xl font-extrabold text-amber-700">{fmtINR(pending)}</div>
        </div>
      </div>

      {/* Payment timeline */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-50">
          <h3 className="text-sm font-bold text-[#1B2E5E]">Payment Schedule</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-50">
              <th className="text-left px-5 py-2.5 font-semibold">Type</th>
              <th className="text-left px-5 py-2.5 font-semibold">Amount</th>
              <th className="text-left px-5 py-2.5 font-semibold">Due / Paid</th>
              <th className="text-left px-5 py-2.5 font-semibold">Method</th>
              <th className="text-left px-5 py-2.5 font-semibold">Ref</th>
              <th className="text-left px-5 py-2.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-5 py-3.5 font-semibold text-slate-700">{p.type}</td>
                <td className="px-5 py-3.5 font-bold text-[#1B2E5E]">{fmtINR(p.amount)}</td>
                <td className="px-5 py-3.5 text-slate-500">{p.date}</td>
                <td className="px-5 py-3.5 text-slate-500">{p.method}</td>
                <td className="px-5 py-3.5">
                  <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{p.ref}</code>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                    p.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-4 flex items-center justify-between">
          <button className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 font-semibold">
            <Plus size={12} /> Record Payment
          </button>
          <button className="flex items-center gap-2 text-xs text-[#14B8A6] font-semibold hover:underline">
            <Send size={12} /> Send Payment Link
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Notes ─────────────────────────────────────────────────────────────────
function NotesTab({}: { booking: Booking; enriched: typeof ENRICHMENT[0] }) {
  const [note, setNote] = useState(
    `Client is a repeat traveller — prefers boutique properties over chains.\n\n` +
    `Special requests: Early check-in (12:00 noon) requested at all hotels. ` +
    `Anniversary trip — complimentary decoration/turndown service arranged at first hotel.\n\n` +
    `Payment preference: Bank transfer only, invoice required 7 days in advance.`
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50">
            <h3 className="text-sm font-bold text-[#1B2E5E]">Internal Notes</h3>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                saved ? "bg-emerald-50 text-emerald-700" : "bg-[#1B2E5E] text-white hover:bg-[#1B2E5E]/90"
              }`}
            >
              {saved ? <><Check size={11} /> Saved</> : "Save"}
            </button>
          </div>
          <div className="p-5">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full text-sm text-slate-700 bg-slate-50/50 border border-slate-100 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 leading-relaxed"
              rows={12}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-50">
            <h3 className="text-sm font-bold text-[#1B2E5E]">Activity Log</h3>
          </div>
          <div className="p-4 space-y-3">
            {[
              { event: "Booking created", time: "2 days ago", actor: "You" },
              { event: "Quote sent via email", time: "2 days ago", actor: "You" },
              { event: "Client viewed portal", time: "1 day ago", actor: "Client" },
              { event: "Deposit received", time: "18 hours ago", actor: "System" },
              { event: "Hotels confirmed", time: "12 hours ago", actor: "You" },
            ].map((log, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] mt-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{log.event}</p>
                  <p className="text-[10px] text-slate-400">{log.time} · {log.actor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={14} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700">Pending Actions</span>
          </div>
          <div className="space-y-1.5">
            {["Travel insurance not purchased", "Flight check-in reminder pending"].map((a, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                <div className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                {a}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function BookingDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const bookingId = Number(params?.id);

  const [booking,  setBooking]  = useState<Booking | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Derive enrichment from seed
  const enriched = booking ? ENRICHMENT[(booking.id % 6)] : ENRICHMENT[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    bookingsApi.list()
      .then((list) => {
        if (cancelled) return;
        // Prefer real booking by ID. Allow SEED match only if it shares the same ID
        // (so demo IDs still load demo data). NEVER silently fall back to SEED_BOOKINGS[0]
        // for an unknown ID — that lets a stranger probe URLs and see fake booking detail.
        const found = list.find(b => b.id === bookingId)
                   || SEED_BOOKINGS.find(b => b.id === bookingId);
        setBooking(found || null);
      })
      .catch(() => {
        if (!cancelled) {
          // Network failure: still allow demo SEED match by ID, but no [0] fallback.
          setBooking(SEED_BOOKINGS.find(b => b.id === bookingId) || null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) });
    return () => { cancelled = true };
  }, [bookingId]);

  const handleDownloadInvoice = async () => {
    if (!booking) return;
    setInvoiceLoading(true);
    try {
      const res  = await documentsApi.invoicePdf(booking.id);
      if (res.ok) {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `Invoice_${booking.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // demo mode — fail silently
    } finally {
      setInvoiceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader size={24} className="animate-spin text-[#14B8A6]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle size={24} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold text-[#0F172A] mb-1">Booking not found</h2>
        <p className="text-sm text-slate-500 mb-5 max-w-md">
          We couldn&apos;t find a booking with ID #{bookingId}. It may have been deleted, or the link
          may belong to a different workspace.
        </p>
        <button
          onClick={() => router.push("/dashboard/bookings")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1B2E5E] text-white text-sm font-semibold hover:bg-[#1B2E5E]/90 transition-colors"
        >
          <ArrowLeft size={14} /> Back to bookings
        </button>
      </div>
    );
  }

  const marginAmt = Math.round(booking.total_price * enriched.margin / 100);
  const paidAmt   = Math.round(booking.total_price * 0.25);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Breadcrumb + actions row */}
          <div className="flex items-center justify-between py-3 border-b border-slate-50">
            <button
              onClick={() => router.push("/dashboard/bookings")}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-[#1B2E5E] transition-colors"
            >
              <ArrowLeft size={15} />
              Bookings
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadInvoice}
                disabled={invoiceLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                {invoiceLoading ? <Loader size={11} className="animate-spin" /> : <Download size={11} />}
                Invoice
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors">
                <Mail size={11} /> Email Client
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1B2E5E] text-white rounded-lg text-xs font-semibold hover:bg-[#1B2E5E]/90 transition-colors">
                <Edit2 size={11} /> Edit Booking
              </button>
            </div>
          </div>

          {/* Booking title row */}
          <div className="flex items-start justify-between py-4">
            <div className="flex items-start gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-extrabold text-[#1B2E5E]">
                    Booking #{booking.id}
                  </h1>
                  <StatusBadge status={booking.status} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Users size={13} className="text-slate-400" />
                    {enriched.client_name}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-slate-400" />
                    {enriched.destination}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-400" />
                    {enriched.depart} → {enriched.return}
                  </span>
                </div>
              </div>
            </div>

            {/* Value cards */}
            <div className="hidden sm:flex items-center gap-3">
              <div className="bg-[#1B2E5E] text-white rounded-2xl px-5 py-3 text-right">
                <div className="text-[10px] text-white/60 uppercase font-semibold">Total Value</div>
                <div className="text-xl font-extrabold mt-0.5">{fmtINR(booking.total_price)}</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 text-right">
                <div className="text-[10px] text-emerald-600 uppercase font-semibold">Margin</div>
                <div className="text-lg font-extrabold text-emerald-700 mt-0.5">+{fmtINR(marginAmt)}</div>
                <div className="text-[10px] text-emerald-500">{enriched.margin}%</div>
              </div>
              <div className={`rounded-2xl px-4 py-3 text-right border ${
                booking.status === "CONFIRMED" || booking.status === "COMPLETED"
                  ? "bg-blue-50 border-blue-100"
                  : "bg-amber-50 border-amber-100"
              }`}>
                <div className={`text-[10px] uppercase font-semibold ${
                  booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? "text-blue-600" : "text-amber-600"
                }`}>Collected</div>
                <div className={`text-lg font-extrabold mt-0.5 ${
                  booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? "text-blue-700" : "text-amber-700"
                }`}>{fmtINR(paidAmt)}</div>
                <div className={`text-[10px] ${
                  booking.status === "CONFIRMED" || booking.status === "COMPLETED" ? "text-blue-500" : "text-amber-500"
                }`}>25%</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-0.5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.id
                    ? "border-[#14B8A6] text-[#14B8A6]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab content ─────────────────────────────────────────────────────── */}
      {/* Flights/Hotels/Transport/Documents/Payments tabs are not in TABS for the
          launch (they currently render hardcoded mocks). The components are kept
          in this file (OvereviewTab callers use shared helpers) and re-enabled
          alongside their backend wiring in the next release. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {activeTab === "overview"   && <OverviewTab   booking={booking} enriched={enriched} />}
        {activeTab === "itinerary"  && <ItineraryTab  booking={booking} enriched={enriched} />}
        {activeTab === "notes"      && <NotesTab      booking={booking} enriched={enriched} />}
      </div>
    </div>
  );
}
