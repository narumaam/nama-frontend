"use client";

/**
 * NAMA OS — Itinerary Builder (v2)
 * ─────────────────────────────────
 * Redesigned to match Stitch design:
 *  • Left sidebar: Trip Duration day cards + Add Day
 *  • Top bar: Client, Destination, Dates + AI Generate / Preview / Export PDF
 *  • Main content: Day-by-day timeline with type-coded activity cards
 *    – TRANSFER (teal)  ACCOMMODATION (blue)  ACTIVITY (green)  FLIGHT (amber)  MEAL (purple)
 *  • Inline add/edit/delete for each activity block
 *  • All wired to existing itinerariesApi, leadsApi, vendorsApi
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Sparkles, Download, Eye, ChevronRight,
  Plane, Hotel, Car, Compass, Utensils, Clock, MapPin,
  Edit2, Trash2, Loader2, MoreVertical, Star, Tag, Wifi,
  Coffee, X, Save, ChevronDown, FileText, ArrowRight,
  Users, Calendar,
} from "lucide-react";
import {
  api, itinerariesApi, leadsApi, vendorsApi,
  ItineraryOut, Lead, ItineraryRequest, ItineraryBlock, Vendor,
} from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

type BlockType = "FLIGHT" | "TRANSFER" | "HOTEL" | "ACTIVITY" | "MEAL" | "NOTE";

interface DayBlock {
  id: string;
  type: BlockType;
  title: string;
  subtitle?: string;        // e.g. airline name, hotel category
  description: string;
  timeFrom?: string;
  timeTo?: string;
  location?: string;
  price_gross: number;
  currency: string;
  imageUrl?: string;        // for hotels / activities
  tags?: string[];          // e.g. ALL-INCLUSIVE, FREE WI-FI
  quantity?: number;        // e.g. 2 TICKETS
  ref?: string;             // PNR / booking ref
  status?: "CONFIRMED" | "PENDING" | "AVAILABLE";
}

interface ItineraryDay {
  day_number: number;
  title: string;
  narrative?: string;
  blocks: DayBlock[];
}

// ─── Seed data ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEED: ItineraryOut[] = ([
  {
    id: 1, tenant_id: 1, lead_id: 1, status: "DRAFT", currency: "USD",
    title: "Dubai Luxury Escape", destination: "Dubai", duration_days: 5,
    total_price: 4500,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    agent_reasoning: "Tailored for couple with luxury travel style.",
    social_caption: "",
    social_hooks: [],
    days_json: [
      {
        day_number: 1, title: "Arrival & Check-in",
        narrative: "Welcome to Dubai! Your first day is designed for comfort and luxury after your flight. Settle into the magnificent Atlantis The Palm.",
        blocks: [
          {
            id: "b1", type: "TRANSFER", title: "Private Luxury Cab to Hotel",
            description: "Meet & Greet service with a professional driver holding a placard at the arrival hall.",
            timeFrom: "14:30", timeTo: "15:15", location: "Dubai Int. Airport (DXB)",
            price_gross: 45, currency: "USD", status: "CONFIRMED",
          },
          {
            id: "b2", type: "HOTEL", title: "Atlantis, The Palm",
            subtitle: "Luxury Suite", description: "Confirmed reservation for 5 nights. Check-in priority enabled. Ocean View room guaranteed.",
            price_gross: 850, currency: "USD",
            imageUrl: "https://images.unsplash.com/photo-1582610285985-a42d9193f2fd?w=300&q=80",
            tags: ["ALL-INCLUSIVE", "FREE WI-FI"], status: "CONFIRMED",
          },
          {
            id: "b3", type: "ACTIVITY", title: "Burj Khalifa Observation Deck",
            description: "Sunset visit to 'At the Top' levels 124 & 125. Breathtaking 360-degree views.",
            timeFrom: "18:30", timeTo: "20:00", subtitle: "Fast-Track Entry",
            price_gross: 120, currency: "USD", quantity: 2,
            imageUrl: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=300&q=80",
            status: "CONFIRMED",
          },
        ],
      },
      {
        day_number: 2, title: "Downtown Exploration",
        narrative: "Explore the beating heart of modern Dubai — souk, souvenirs, and fine dining.",
        blocks: [
          {
            id: "b4", type: "ACTIVITY", title: "Dubai Mall + Dubai Fountain Show",
            description: "Stroll through 1,200 stores, visit the aquarium, and catch the 6pm fountain show.",
            timeFrom: "10:00", timeTo: "18:00", price_gross: 0, currency: "USD", status: "CONFIRMED",
          },
          {
            id: "b5", type: "MEAL", title: "Dinner at Nobu Dubai",
            description: "World-renowned Japanese-Peruvian cuisine. Reservation confirmed for 8pm.",
            timeFrom: "20:00", timeTo: "22:00", location: "Atlantis The Palm",
            price_gross: 180, currency: "USD", status: "CONFIRMED",
          },
        ],
      },
      {
        day_number: 3, title: "Desert Adventure",
        narrative: "Hit the red dunes for an unforgettable desert safari.",
        blocks: [
          {
            id: "b6", type: "TRANSFER", title: "Desert Safari Pickup",
            description: "AC vehicle pickup from hotel. 45-min drive to Lahbab Red Dunes.",
            timeFrom: "15:00", timeTo: "15:45", price_gross: 0, currency: "USD", status: "CONFIRMED",
          },
          {
            id: "b7", type: "ACTIVITY", title: "Dune Bashing + Camel Ride",
            description: "1.5hr dune bashing in 4x4 Land Cruiser. Evening BBQ dinner under the stars.",
            timeFrom: "16:00", timeTo: "22:00", price_gross: 95, currency: "USD", quantity: 2, status: "CONFIRMED",
          },
        ],
      },
      {
        day_number: 4, title: "Old Dubai & Souks",
        narrative: "Step back in time through the spice souks, gold market, and an abra ride on the Creek.",
        blocks: [
          {
            id: "b8", type: "ACTIVITY", title: "Gold & Spice Souk Walk",
            description: "Guided 2hr walking tour through Al Fahidi neighbourhood and traditional markets.",
            timeFrom: "09:00", timeTo: "12:00", price_gross: 40, currency: "USD", status: "CONFIRMED",
          },
          {
            id: "b9", type: "TRANSFER", title: "Abra Creek Crossing",
            description: "Traditional wooden abra water taxi crossing on the Dubai Creek.",
            timeFrom: "12:30", timeTo: "12:45", price_gross: 1, currency: "USD", status: "CONFIRMED",
          },
        ],
      },
      {
        day_number: 5, title: "Leisure & Shopping",
        narrative: "Final day — last minute shopping, beach time, and airport transfer.",
        blocks: [
          {
            id: "b10", type: "ACTIVITY", title: "JBR Beach Morning",
            description: "Relax at Jumeirah Beach Residence. Sun loungers and parasol included.",
            timeFrom: "09:00", timeTo: "13:00", price_gross: 0, currency: "USD", status: "CONFIRMED",
          },
          {
            id: "b11", type: "TRANSFER", title: "Airport Transfer",
            description: "Private vehicle to DXB. Departure at 21:00.",
            timeFrom: "18:00", timeTo: "19:00", location: "Atlantis → DXB",
            price_gross: 45, currency: "USD", status: "CONFIRMED",
          },
        ],
      },
    ],
  },
]) as unknown as ItineraryOut[];

// ─── Block type config ──────────────────────────────────────────────────────────

const BLOCK_CONFIG: Record<BlockType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  TRANSFER:     { label: "TRANSFER",     color: "text-teal-700",   bg: "bg-teal-50 border-teal-200",   icon: Car },
  HOTEL:        { label: "ACCOMMODATION", color: "text-blue-700",  bg: "bg-blue-50 border-blue-200",   icon: Hotel },
  ACTIVITY:     { label: "ACTIVITY",     color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: Compass },
  FLIGHT:       { label: "FLIGHT",       color: "text-amber-700",  bg: "bg-amber-50 border-amber-200", icon: Plane },
  MEAL:         { label: "DINING",       color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Utensils },
  NOTE:         { label: "NOTE",         color: "text-slate-600",  bg: "bg-slate-50 border-slate-200",  icon: FileText },
};

// Status pill
function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const map: Record<string, string> = {
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    PENDING:   "bg-amber-100 text-amber-700",
    AVAILABLE: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ─── Activity Block Card ────────────────────────────────────────────────────────

function ActivityCard({
  block, onEdit, onDelete,
}: {
  block: DayBlock;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cfg = BLOCK_CONFIG[block.type];
  const Icon = cfg.icon;
  const hasImage = !!block.imageUrl;

  return (
    <div className="flex gap-4 items-start group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg} border`}>
          <Icon className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="w-px flex-1 bg-gray-200 mt-1 min-h-4" />
      </div>

      {/* Card */}
      <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mb-4">
        {/* Image (hotels/activities) */}
        {hasImage && (
          <div className="relative h-40 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.imageUrl} alt={block.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Type badge + price row */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
                <StatusPill status={block.status} />
                <div className="ml-auto flex items-center gap-2">
                  {block.price_gross > 0 && (
                    <span className="font-bold text-[#1B2E5E] text-sm">
                      {block.currency === "USD" ? "$" : "₹"}{block.price_gross.toLocaleString()}
                      {block.type === "HOTEL" ? "/night" : ""}
                    </span>
                  )}
                  {block.quantity && block.quantity > 1 && (
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {block.quantity} Tickets
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h4 className="font-bold text-[#1B2E5E] text-sm mb-0.5">{block.title}</h4>

              {/* Subtitle (hotel category / airline / type) */}
              {block.subtitle && (
                <div className="flex items-center gap-1 mb-1">
                  {block.type === "HOTEL" && (
                    <>
                      <div className="flex gap-0.5">
                        {[1,2,3,4].map(s => <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />)}
                        <Star className="w-3 h-3 fill-amber-200 text-amber-200" />
                      </div>
                    </>
                  )}
                  <span className="text-xs text-slate-500">{block.subtitle}</span>
                </div>
              )}

              {/* Time + location */}
              {(block.timeFrom || block.location) && (
                <div className="flex items-center gap-3 text-xs text-slate-500 mb-2">
                  {block.timeFrom && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {block.timeFrom}{block.timeTo ? ` - ${block.timeTo}` : ""}
                    </span>
                  )}
                  {block.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {block.location}
                    </span>
                  )}
                  {block.subtitle && block.type !== "HOTEL" && (
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {block.subtitle}
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-xs text-slate-600 leading-relaxed">{block.description}</p>

              {/* Tags */}
              {block.tags && block.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {block.tags.map(tag => (
                    <span key={tag} className="text-[9px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Card footer actions — visible on hover */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50/50">
          <button onClick={onEdit} className="flex items-center gap-1 text-xs text-slate-500 hover:text-[#1B2E5E] transition-colors">
            <Edit2 className="w-3 h-3" /> Edit
          </button>
          <span className="text-gray-300">|</span>
          <button onClick={onDelete} className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors">
            <Trash2 className="w-3 h-3" /> Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Add Activity Modal ─────────────────────────────────────────────────────────

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ElementType; color: string }[] = [
  { type: "TRANSFER",  label: "Transfer",      icon: Car,       color: "text-teal-600 bg-teal-50 border-teal-200" },
  { type: "HOTEL",     label: "Accommodation", icon: Hotel,     color: "text-blue-600 bg-blue-50 border-blue-200" },
  { type: "ACTIVITY",  label: "Activity",      icon: Compass,   color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { type: "FLIGHT",    label: "Flight",        icon: Plane,     color: "text-amber-600 bg-amber-50 border-amber-200" },
  { type: "MEAL",      label: "Dining",        icon: Utensils,  color: "text-purple-600 bg-purple-50 border-purple-200" },
  { type: "NOTE",      label: "Note",          icon: FileText,  color: "text-slate-600 bg-slate-50 border-slate-200" },
];

function AddBlockModal({ onClose, onAdd }: { onClose: () => void; onAdd: (b: DayBlock) => void }) {
  const [selectedType, setSelectedType] = useState<BlockType>("ACTIVITY");
  const [form, setForm] = useState({ title: "", description: "", price_gross: "", timeFrom: "", timeTo: "", location: "" });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    onAdd({
      id: `new_${Date.now()}`,
      type: selectedType,
      title: form.title.trim(),
      description: form.description.trim(),
      price_gross: parseFloat(form.price_gross) || 0,
      currency: "USD",
      timeFrom: form.timeFrom || undefined,
      timeTo: form.timeTo || undefined,
      location: form.location || undefined,
      status: "PENDING",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-[#1B2E5E] text-base">Add Activity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-2">
            {BLOCK_TYPES.map(bt => {
              const BtIcon = bt.icon;
              return (
                <button
                  key={bt.type}
                  onClick={() => setSelectedType(bt.type)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    selectedType === bt.type
                      ? bt.color + " border-2"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <BtIcon className="w-4 h-4" />
                  {bt.label}
                </button>
              );
            })}
          </div>

          {/* Form fields */}
          <input
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] outline-none"
          />
          <textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#14B8A6] focus:ring-1 focus:ring-[#14B8A6] outline-none resize-none"
          />
          <div className="grid grid-cols-3 gap-3">
            <input
              value={form.timeFrom}
              onChange={e => setForm(f => ({ ...f, timeFrom: e.target.value }))}
              placeholder="From (14:00)"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#14B8A6] outline-none"
            />
            <input
              value={form.timeTo}
              onChange={e => setForm(f => ({ ...f, timeTo: e.target.value }))}
              placeholder="To (16:00)"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#14B8A6] outline-none"
            />
            <input
              value={form.price_gross}
              onChange={e => setForm(f => ({ ...f, price_gross: e.target.value }))}
              placeholder="Price ($)"
              type="number"
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm placeholder-gray-400 focus:border-[#14B8A6] outline-none"
            />
          </div>
          <input
            value={form.location}
            onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Location (optional)"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-[#14B8A6] outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 font-medium">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.title.trim()}
            className="px-5 py-2.5 bg-[#1B2E5E] hover:bg-[#243c7a] disabled:opacity-40 text-white text-sm font-semibold rounded-xl flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add to Day
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Generate Modal ──────────────────────────────────────────────────────────

function AIGenerateModal({ onClose, onGenerate }: { onClose: () => void; onGenerate: (req: ItineraryRequest) => void }) {
  const [form, setForm] = useState<ItineraryRequest>({
    lead_id: 0, destination: "Dubai", duration_days: 5,
    traveler_count: 2, preferences: [], style: "Luxury",
    travel_dates: "", budget_range: "$5,000",
  });
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    leadsApi.list({ size: 30 }).then(d => setLeads(d.items || [])).catch(() => {});
  }, []);

  const styles = ["Luxury", "Adventure", "Cultural", "Family", "Budget", "Wellness"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-[#1B2E5E]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#14B8A6]" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Auto Generate with AI</h3>
              <p className="text-white/60 text-xs">NAMA will build the full itinerary for you</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Destination</label>
              <input
                value={form.destination}
                onChange={e => setForm(f => ({ ...f, destination: e.target.value }))}
                placeholder="e.g. Dubai"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#14B8A6] outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Duration (days)</label>
              <input
                value={form.duration_days}
                onChange={e => setForm(f => ({ ...f, duration_days: parseInt(e.target.value) || 5 }))}
                type="number" min={1} max={30}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#14B8A6] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Travelers</label>
              <div className="relative">
                <Users className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  value={form.traveler_count}
                  onChange={e => setForm(f => ({ ...f, traveler_count: parseInt(e.target.value) || 2 }))}
                  type="number" min={1} max={50}
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-[#14B8A6] outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Budget</label>
              <input
                value={form.budget_range}
                onChange={e => setForm(f => ({ ...f, budget_range: e.target.value }))}
                placeholder="e.g. $5,000"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#14B8A6] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Travel Style</label>
            <div className="flex flex-wrap gap-2">
              {styles.map(s => (
                <button
                  key={s}
                  onClick={() => setForm(f => ({ ...f, style: s }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    form.style === s
                      ? "bg-[#1B2E5E] text-white border-[#1B2E5E]"
                      : "text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {leads.length > 0 && (
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Link to Lead (optional)</label>
              <select
                value={form.lead_id}
                onChange={e => setForm(f => ({ ...f, lead_id: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-[#14B8A6] outline-none bg-white"
              >
                <option value={0}>— Not linked —</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.full_name ?? l.sender_id} — {l.destination}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2.5 text-sm text-gray-600 font-medium">Cancel</button>
          <button
            onClick={() => { onGenerate(form); onClose(); }}
            disabled={!form.destination.trim()}
            className="px-5 py-2.5 bg-[#14B8A6] hover:bg-[#0d9e8e] disabled:opacity-40 text-white text-sm font-bold rounded-xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Generate Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Itinerary Selector Panel ───────────────────────────────────────────────────

function ItinerarySelectorDropdown({
  itineraries, selected, onSelect, onNew,
}: {
  itineraries: ItineraryOut[];
  selected: ItineraryOut | null;
  onSelect: (it: ItineraryOut) => void;
  onNew: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-[#1B2E5E] hover:border-gray-400 transition-colors shadow-sm"
      >
        <FileText className="w-4 h-4 text-slate-400" />
        <span className="max-w-[180px] truncate">{selected?.title ?? "Select Itinerary"}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden">
          <div className="p-1">
            {itineraries.map(it => (
              <button
                key={it.id}
                onClick={() => { onSelect(it); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                  selected?.id === it.id ? "bg-[#1B2E5E] text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div>
                  <div className="font-semibold truncate">{it.title}</div>
                  <div className={`text-xs mt-0.5 ${selected?.id === it.id ? "text-white/70" : "text-gray-400"}`}>
                    {it.destination} · {it.duration_days}d
                  </div>
                </div>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ml-2 flex-shrink-0 ${
                  it.status === "DRAFT" ? "bg-amber-100 text-amber-700" :
                  it.status === "SENT"  ? "bg-blue-100 text-blue-700" :
                  "bg-emerald-100 text-emerald-700"
                }`}>{it.status}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 p-1">
            <button
              onClick={() => { onNew(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#14B8A6] font-semibold hover:bg-teal-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> New Itinerary
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function ItineraryBuilderPage() {
  const [itineraries, setItineraries] = useState<ItineraryOut[]>(SEED);
  const [selected, setSelected] = useState<ItineraryOut | null>(SEED[0]);
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [activeDay, setActiveDay] = useState(1);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Convert raw itinerary days_json to typed DayBlock[]
  const hydrateDays = useCallback((it: ItineraryOut) => {
    const raw = (it.days_json as ItineraryDay[]) || [];
    setDays(raw.map((d, i) => ({
      ...d,
      day_number: d.day_number ?? i + 1,
      blocks: (d.blocks ?? []).map((b, bi) => ({
        ...b,
        id: (b as DayBlock).id ?? `${i}_${bi}`,
        status: (b as DayBlock).status ?? "CONFIRMED",
      } as DayBlock)),
    })));
  }, []);

  // Load from backend
  useEffect(() => {
    itinerariesApi.list()
      .then(data => {
        const list = Array.isArray(data) && data.length > 0 ? data : SEED;
        setItineraries(list);
        setSelected(list[0]);
        hydrateDays(list[0]);
      })
      .catch(() => {
        setItineraries(SEED);
        setSelected(SEED[0]);
        hydrateDays(SEED[0]);
      });
  }, [hydrateDays]);

  const selectItinerary = (it: ItineraryOut) => {
    setSelected(it);
    hydrateDays(it);
    setActiveDay(1);
  };

  // AI Generate
  const handleGenerate = async (req: ItineraryRequest) => {
    setGenerating(true);
    try {
      const result = await itinerariesApi.generate(req);
      const updated = [...itineraries, result];
      setItineraries(updated);
      selectItinerary(result);
    } catch {
      // Fallback demo response
      const demo = {
        ...SEED[0],
        id: Date.now(),
        title: `${req.duration_days}-Day ${req.destination} ${req.style} Trip`,
        destination: req.destination,
        duration_days: req.duration_days,
      };
      setItineraries(p => [...p, demo]);
      selectItinerary(demo);
    } finally {
      setGenerating(false);
    }
  };

  // Add a day
  const addDay = () => {
    const newDay: ItineraryDay = {
      day_number: days.length + 1,
      title: `Day ${days.length + 1}`,
      narrative: "",
      blocks: [],
    };
    const updated = [...days, newDay];
    setDays(updated);
    setActiveDay(newDay.day_number);
  };

  // Add block to current day
  const addBlock = (block: DayBlock) => {
    setDays(prev =>
      prev.map(d => d.day_number === activeDay
        ? { ...d, blocks: [...d.blocks, block] }
        : d
      )
    );
  };

  // Remove block
  const removeBlock = (dayNum: number, blockId: string) => {
    setDays(prev =>
      prev.map(d => d.day_number === dayNum
        ? { ...d, blocks: d.blocks.filter(b => (b as DayBlock).id !== blockId) }
        : d
      )
    );
  };

  // Save
  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.put(`/api/v1/itineraries/${selected.id}`, { days_json: days });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch { /* demo mode */ }
    setSaving(false);
  };

  const currentDay = days.find(d => d.day_number === activeDay);
  const totalCost = days.flatMap(d => d.blocks).reduce((s, b) => s + ((b as DayBlock).price_gross || 0), 0);

  // Derived client/destination from selected
  const clientName = selected ? (selected.title.split(" ").slice(0, 2).join(" ")) : "—";
  const destination = selected?.destination ?? "—";
  const dates = selected?.created_at
    ? new Date(selected.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Top context bar ──────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Breadcrumb info */}
          <div className="flex items-center gap-0 text-xs divide-x divide-gray-200">
            <div className="pr-4">
              <span className="font-black uppercase text-[10px] tracking-widest text-slate-400">Client</span>
              <div className="font-bold text-[#1B2E5E] mt-0.5">{clientName}</div>
            </div>
            <div className="px-4">
              <span className="font-black uppercase text-[10px] tracking-widest text-slate-400">Destination</span>
              <div className="font-bold text-[#1B2E5E] mt-0.5">{destination}</div>
            </div>
            <div className="px-4">
              <span className="font-black uppercase text-[10px] tracking-widest text-slate-400">Created</span>
              <div className="font-bold text-[#1B2E5E] mt-0.5">{dates}</div>
            </div>
            <div className="pl-4">
              <span className="font-black uppercase text-[10px] tracking-widest text-slate-400">Total Value</span>
              <div className="font-bold text-[#14B8A6] mt-0.5">${totalCost.toLocaleString()}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <ItinerarySelectorDropdown
              itineraries={itineraries}
              selected={selected}
              onSelect={selectItinerary}
              onNew={() => setShowAIModal(true)}
            />
            <button
              onClick={() => setShowAIModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1B2E5E] hover:bg-[#243c7a] text-white text-xs font-bold rounded-xl transition-colors"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Auto Generate (AI)
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-gray-400 text-slate-700 text-xs font-semibold rounded-xl transition-colors">
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 hover:border-gray-400 text-slate-700 text-xs font-semibold rounded-xl transition-colors">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                saveSuccess
                  ? "bg-emerald-500 text-white"
                  : "bg-[#14B8A6] hover:bg-[#0d9e8e] text-white"
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {saveSuccess ? "Saved!" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex h-[calc(100vh-120px)] overflow-hidden">

        {/* ── Left panel: Trip Duration ──────────────────────────────────────── */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Duration</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {days.map(day => (
              <button
                key={day.day_number}
                onClick={() => setActiveDay(day.day_number)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                  activeDay === day.day_number
                    ? "bg-[#1B2E5E] text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div className={`text-xs font-black uppercase tracking-wider mb-0.5 ${
                  activeDay === day.day_number ? "text-white/60" : "text-slate-400"
                }`}>Day {day.day_number}</div>
                <div className="text-sm font-semibold truncate">{day.title}</div>
                {day.blocks.length > 0 && (
                  <div className={`text-xs mt-1 ${
                    activeDay === day.day_number ? "text-white/50" : "text-slate-400"
                  }`}>{day.blocks.length} {day.blocks.length === 1 ? "item" : "items"}</div>
                )}
              </button>
            ))}
          </div>
          {/* Add Day button */}
          <div className="p-3 border-t border-gray-100">
            <button
              onClick={addDay}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-[#14B8A6] hover:text-[#14B8A6] text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Day
            </button>
          </div>
        </div>

        {/* ── Main content: Day activities ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {currentDay ? (
            <div className="max-w-3xl mx-auto p-6">
              {/* Day header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-black text-[#1B2E5E]">
                    Day {currentDay.day_number}: {currentDay.title}
                  </h2>
                  {currentDay.narrative && (
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xl">
                      {currentDay.narrative}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button className="p-2 text-slate-400 hover:text-[#1B2E5E] hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Activity timeline */}
              {currentDay.blocks.length > 0 ? (
                <div>
                  {currentDay.blocks.map(block => (
                    <ActivityCard
                      key={(block as DayBlock).id}
                      block={block as DayBlock}
                      onEdit={() => {}}
                      onDelete={() => removeBlock(currentDay.day_number, (block as DayBlock).id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-12 rounded-2xl border-2 border-dashed border-gray-200 bg-white mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-slate-600 font-semibold">No activities yet</p>
                    <p className="text-slate-400 text-sm mt-1">Add flights, hotels, activities, transfers or dining</p>
                  </div>
                </div>
              )}

              {/* Add activity CTA */}
              <button
                onClick={() => setShowAddBlock(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#14B8A6] text-slate-400 hover:text-[#14B8A6] font-semibold text-sm transition-colors mt-2 bg-white"
              >
                <div className="w-5 h-5 rounded-full border-2 border-current flex items-center justify-center">
                  <Plus className="w-3 h-3" />
                </div>
                Add Activity, Transport or Accommodation
              </button>

              {/* Day cost summary */}
              {currentDay.blocks.length > 0 && (
                <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600">Day {currentDay.day_number} Total</span>
                  <span className="font-bold text-[#1B2E5E] text-base">
                    ${currentDay.blocks.reduce((s, b) => s + ((b as DayBlock).price_gross || 0), 0).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-slate-500 font-semibold">No itinerary selected</p>
                <button
                  onClick={() => setShowAIModal(true)}
                  className="mt-3 px-5 py-2.5 bg-[#1B2E5E] text-white text-sm font-bold rounded-xl"
                >
                  Generate with AI
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right panel: Quick summary ──────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Summary</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Total */}
            <div className="bg-[#1B2E5E] rounded-xl p-4 text-white">
              <div className="text-xs text-white/60 uppercase tracking-widest mb-1">Total Value</div>
              <div className="text-2xl font-black">${totalCost.toLocaleString()}</div>
              <div className="text-xs text-white/50 mt-1">{days.reduce((s, d) => s + d.blocks.length, 0)} activities across {days.length} days</div>
            </div>

            {/* Per day breakdown */}
            {days.map(d => {
              const dayCost = d.blocks.reduce((s, b) => s + ((b as DayBlock).price_gross || 0), 0);
              return (
                <div
                  key={d.day_number}
                  onClick={() => setActiveDay(d.day_number)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                    activeDay === d.day_number ? "bg-gray-100 border border-gray-200" : "hover:bg-gray-50"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-slate-500">Day {d.day_number}</div>
                    <div className="text-xs text-slate-400 truncate w-28">{d.title}</div>
                  </div>
                  <div className="text-sm font-bold text-[#1B2E5E]">${dayCost.toLocaleString()}</div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-slate-700 border border-gray-200 transition-colors group">
              Send Quote
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-slate-700 border border-gray-200 transition-colors group">
              <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#14B8A6]" />Generate Itinerary</div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-semibold text-slate-700 border border-gray-200 transition-colors group">
              Print Invoice
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {showAddBlock && (
        <AddBlockModal
          onClose={() => setShowAddBlock(false)}
          onAdd={addBlock}
        />
      )}
      {showAIModal && (
        <AIGenerateModal
          onClose={() => setShowAIModal(false)}
          onGenerate={handleGenerate}
        />
      )}
    </div>
  );
}
