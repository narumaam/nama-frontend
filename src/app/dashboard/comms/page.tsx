"use client";

/**
 * M5 — Communication Hub (World-Class Rebuild)
 * ----------------------------------------------
 * AI-powered WhatsApp + Email drafting with:
 *   - KPI strip (sent this month, reply rate, avg response time, open rate)
 *   - Lead selector with live search + status badge
 *   - 8 context templates + free-text custom context
 *   - Tone selector: Professional / Friendly / Urgent / Formal
 *   - AI draft with character count (WA: 4096, Email: unlimited)
 *   - Draft history (last 10, click to reload)
 *   - Copy + WhatsApp deep-link + mailto shortcut
 *   - Message log table (simulated sent history)
 */

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Mail, Copy, Check, Loader, AlertCircle,
  Plus, Search, Send, Clock, ChevronDown, Zap,
  BarChart2, Phone, RefreshCw, Smile, Briefcase,
  AlertTriangle, Star, History, X,
} from "lucide-react";
import { leadsApi, commsApi, Lead } from "@/lib/api";

// ── Seed leads (shown when backend is empty or unreachable) ──────────────────
const CTS = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const SEED_LEADS: Lead[] = [
  { id: 1, tenant_id: 1, sender_id: '+919812345678', source: 'WHATSAPP', full_name: 'Ravi Mehta',    email: 'ravi.mehta@gmail.com',    phone: '+919812345678', destination: 'Rajasthan',  duration_days: 7,  travelers_count: 4, budget_per_person: 75000,  currency: 'INR', travel_style: 'CULTURAL',  status: 'QUALIFIED',    priority: 1, triage_confidence: 92, created_at: CTS(1) },
  { id: 2, tenant_id: 1, sender_id: '+919876543210', source: 'EMAIL',    full_name: 'Priya Singh',   email: 'priya.singh@outlook.com', phone: '+919876543210', destination: 'Maldives',   duration_days: 7,  travelers_count: 2, budget_per_person: 250000, currency: 'INR', travel_style: 'LUXURY',    status: 'PROPOSAL_SENT',priority: 1, triage_confidence: 95, created_at: CTS(2) },
  { id: 3, tenant_id: 1, sender_id: '+919845671234', source: 'WHATSAPP', full_name: 'Ananya Rao',    email: 'ananya.rao@gmail.com',    phone: '+919845671234', destination: 'Kedarnath',  duration_days: 5,  travelers_count: 3, budget_per_person: 20000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'NEW',          priority: 2, triage_confidence: 78, created_at: CTS(0) },
  { id: 4, tenant_id: 1, sender_id: '+919123456789', source: 'WEBSITE',  full_name: 'Karan Kapoor',  email: 'karan.k@hotmail.com',     phone: '+919123456789', destination: 'Kenya',      duration_days: 12, travelers_count: 6, budget_per_person: 450000, currency: 'INR', travel_style: 'WILDLIFE',  status: 'QUALIFIED',    priority: 1, triage_confidence: 88, created_at: CTS(3) },
  { id: 5, tenant_id: 1, sender_id: '+919654321098', source: 'EMAIL',    full_name: 'Deepika Nair',  email: 'deepika.nair@gmail.com',  phone: '+919654321098', destination: 'Bali',       duration_days: 6,  travelers_count: 2, budget_per_person: 120000, currency: 'INR', travel_style: 'BEACH',     status: 'WON',          priority: 1, triage_confidence: 96, created_at: CTS(5) },
  { id: 6, tenant_id: 1, sender_id: '+919712345678', source: 'PHONE',    full_name: 'Amit Shah',     email: 'amit.shah@company.com',   phone: '+919712345678', destination: 'Leh Ladakh', duration_days: 10, travelers_count: 8, budget_per_person: 35000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'CONTACTED',    priority: 2, triage_confidence: 81, created_at: CTS(1) },
  { id: 7, tenant_id: 1, sender_id: '+919823456789', source: 'WHATSAPP', full_name: 'Rohan Verma',   email: 'rohan.v@gmail.com',       phone: '+919823456789', destination: 'Dubai',      duration_days: 5,  travelers_count: 4, budget_per_person: 90000,  currency: 'INR', travel_style: 'LUXURY',    status: 'NEW',          priority: 2, triage_confidence: 74, created_at: CTS(0) },
]

// ── Constants ──────────────────────────────────────────────────────────────────
const CONTEXT_TEMPLATES = [
  { value: "Follow Up", label: "Follow Up", icon: Clock, description: "Gentle check-in after initial enquiry" },
  { value: "Quote Sent", label: "Quote Sent", icon: Send, description: "Nudge after sending a quotation" },
  { value: "Payment Reminder", label: "Payment Reminder", icon: AlertTriangle, description: "Politely remind about pending payment" },
  { value: "Booking Confirmed", label: "Booking Confirmed ✓", icon: Check, description: "Celebrate the booking confirmation" },
  { value: "Itinerary Ready", label: "Itinerary Ready", icon: Zap, description: "Inform client itinerary is prepared" },
  { value: "Trip Reminder", label: "Pre-trip Reminder", icon: Star, description: "7 days before departure checklist" },
  { value: "Post-trip Feedback", label: "Post-trip Feedback", icon: Smile, description: "Request review after the trip" },
  { value: "Custom", label: "Custom Context…", icon: Plus, description: "Write your own message context" },
];

const TONES = [
  { value: "Professional", label: "Professional", icon: Briefcase },
  { value: "Friendly", label: "Friendly", icon: Smile },
  { value: "Urgent", label: "Urgent", icon: AlertTriangle },
  { value: "Formal", label: "Formal", icon: Star },
];

const MOCK_HISTORY = [
  { id: 1, lead: "Ravi Mehta", context: "Quote Sent", channel: "whatsapp", sent_at: "2 hrs ago", status: "delivered" },
  { id: 2, lead: "Priya Singh", context: "Follow Up", channel: "email", sent_at: "Yesterday", status: "opened" },
  { id: 3, lead: "Ananya Rao", context: "Booking Confirmed ✓", channel: "whatsapp", sent_at: "2 days ago", status: "replied" },
  { id: 4, lead: "Karan Kapoor", context: "Payment Reminder", channel: "email", sent_at: "3 days ago", status: "delivered" },
  { id: 5, lead: "Deepika Nair", context: "Itinerary Ready", channel: "whatsapp", sent_at: "4 days ago", status: "replied" },
];

const STATUS_COLOR: Record<string, string> = {
  delivered: "bg-blue-50 text-blue-600",
  opened:    "bg-amber-50 text-amber-600",
  replied:   "bg-emerald-50 text-emerald-600",
  failed:    "bg-red-50 text-red-600",
};

// ── Follow-up Template Library ─────────────────────────────────────────────────
interface FollowUpTemplate {
  id: string;
  category: 'NEW_LEAD' | 'QUOTE' | 'BOOKING' | 'PRE_TRIP' | 'POST_TRIP' | 'REENGAGEMENT';
  label: string;
  timing: string;
  emoji: string;
  whatsapp: (name: string, dest: string, agent: string) => string;
  email: (name: string, dest: string, agent: string) => string;
}

const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  // ── NEW LEAD
  {
    id: 'nl-1',
    category: 'NEW_LEAD',
    label: 'Warm Welcome',
    timing: 'Within 1h of inquiry',
    emoji: '👋',
    whatsapp: (n, d, a) => `Hi ${n}! 👋 Thank you for reaching out about your ${d} trip — I'm ${a} from NAMA Travel.\n\nI'd love to create something special for you. Could you share your preferred travel dates and the number of travellers? I'll put together a tailored itinerary right away! 🌏`,
    email: (n, d, a) => `Subject: Your ${d} Trip Enquiry — Let's Make It Happen! ✈️\n\nDear ${n},\n\nThank you so much for reaching out! I'm ${a} from NAMA Travel, and I'm thrilled to help you plan your ${d} experience.\n\nTo create a personalised itinerary, could you share:\n• Preferred travel dates\n• Number of travellers\n• Any specific experiences in mind?\n\nI'll have a proposal ready for you within 24 hours.\n\nWarm regards,\n${a} | NAMA Travel`,
  },
  {
    id: 'nl-2',
    category: 'NEW_LEAD',
    label: '24h No-Response Nudge',
    timing: '24h after first message',
    emoji: '🔔',
    whatsapp: (n, d, a) => `Hi ${n}! 🌟 Just checking in — I sent you a message yesterday about your ${d} trip.\n\nI've been looking at some amazing options for you and don't want you to miss out on the best availability. Would you have 5 minutes to connect today? 📞`,
    email: (n, d, a) => `Subject: Following up — ${d} Trip Ideas Ready for You\n\nHi ${n},\n\nI wanted to follow up on your ${d} enquiry. I've been curating some wonderful options that I think you'll love!\n\nAre you available for a quick call this week? I can walk you through the top 3 itineraries I've shortlisted.\n\nBest,\n${a} | NAMA Travel`,
  },
  // ── QUOTE
  {
    id: 'q-1',
    category: 'QUOTE',
    label: 'Quote Sent — 2h Follow-up',
    timing: '2h after sending quote',
    emoji: '📋',
    whatsapp: (n, d, a) => `Hi ${n}! 😊 Just wanted to check — did you get a chance to look at the ${d} proposal I shared?\n\nHappy to walk you through it or answer any questions. We can also customise the itinerary to fit your preferences perfectly! 🗺️`,
    email: (n, d, a) => `Subject: Your ${d} Proposal — Any Questions?\n\nHi ${n},\n\nI hope you've had a chance to review the ${d} itinerary I sent over. I've put together something I think you'll really enjoy!\n\nIf you have any questions — about the hotels, activities, or pricing — I'm here to help. We can also tweak anything to better match your vision.\n\nLooking forward to hearing your thoughts!\n\nBest,\n${a}`,
  },
  {
    id: 'q-2',
    category: 'QUOTE',
    label: 'Quote — 48h Urgency',
    timing: '48h after sending quote',
    emoji: '⏰',
    whatsapp: (n, d, a) => `Hi ${n}! Hope all's well 🙏 A quick heads-up — the rates on your ${d} package are valid until this Friday, after which hotel availability may change.\n\nWould you like to secure a 24-hour hold while you decide? No payment needed yet — just keeps the best rooms reserved for you! 🏨`,
    email: (n, d, a) => `Subject: ${d} Package — Rates Valid Until Friday\n\nDear ${n},\n\nI wanted to flag that the pricing on your ${d} itinerary is valid until this Friday. After that, hotel inventory and rates may change for your dates.\n\nIf you'd like, I can place a 24-hour hold on your preferred accommodations — this keeps everything reserved while you finalise your decision.\n\nShall I go ahead with the hold?\n\nBest,\n${a}`,
  },
  {
    id: 'q-3',
    category: 'QUOTE',
    label: 'Lost Quote — Re-engagement',
    timing: '1 week after no response',
    emoji: '💡',
    whatsapp: (n, d, a) => `Hi ${n}! It's ${a} from NAMA — I know life gets busy! 😊\n\nI have a new offer for ${d} that just came in — a great deal I thought you might like. Would you want me to share the details? Takes only 2 minutes to review! ✨`,
    email: (n, d, a) => `Subject: New Deal Alert — ${d} Package Just In\n\nHi ${n},\n\nI completely understand things get busy! I wanted to reach out because we just received a special offer for ${d} that I immediately thought of you.\n\nNo obligation at all — just wanted to make sure you don't miss it. Can I send over the details?\n\nWarmly,\n${a}`,
  },
  // ── BOOKING
  {
    id: 'b-1',
    category: 'BOOKING',
    label: 'Booking Confirmed 🎉',
    timing: 'Immediately on booking',
    emoji: '🎉',
    whatsapp: (n, d, a) => `${n}, your ${d} trip is CONFIRMED! 🎉🌍\n\nI'm so excited for you! Here's what happens next:\n✅ You'll receive your booking documents within 24 hours\n✅ I'll share a detailed pre-trip checklist\n✅ I'm available 24/7 for any questions\n\nThis is going to be an incredible trip! 🙌`,
    email: (n, d, a) => `Subject: ✅ Your ${d} Trip is Confirmed!\n\nDear ${n},\n\nFantastic news — your ${d} trip is officially confirmed! 🎉\n\nYou can expect:\n• Booking confirmation documents within 24 hours\n• A detailed pre-trip checklist\n• Hotel vouchers and e-tickets\n\nThank you for choosing NAMA Travel. This is going to be an unforgettable experience!\n\nWith excitement,\n${a}`,
  },
  {
    id: 'b-2',
    category: 'BOOKING',
    label: 'Balance Payment Reminder',
    timing: '15 days before balance due',
    emoji: '💳',
    whatsapp: (n, d, a) => `Hi ${n}! 👋 A gentle reminder — the balance payment for your ${d} trip is due in 15 days.\n\nYou can transfer to the account details I shared earlier. Once received, I'll send over all your travel documents! 🎒\n\nLet me know if you have any questions or need a payment link.`,
    email: (n, d, a) => `Subject: Balance Payment Due — ${d} Trip\n\nDear ${n},\n\nI hope you're getting excited for your upcoming ${d} trip!\n\nThis is a friendly reminder that the balance payment is due in 15 days. Once received, I'll dispatch all your travel documents, vouchers, and e-tickets.\n\nPlease let me know if you need any assistance with the payment process.\n\nBest regards,\n${a}`,
  },
  // ── PRE-TRIP
  {
    id: 'pt-1',
    category: 'PRE_TRIP',
    label: '7-Day Departure Checklist',
    timing: '7 days before travel',
    emoji: '🎒',
    whatsapp: (n, d, a) => `Hi ${n}! 🎒 Only 7 days to go until your ${d} adventure!\n\nQuick checklist:\n✅ Passport valid for 6+ months\n✅ Visa arranged\n✅ Travel insurance activated\n✅ Foreign currency exchanged\n✅ Emergency numbers saved\n\nI've got your back every step of the way! Have a question? Just ping me. 🌟`,
    email: (n, d, a) => `Subject: 7 Days to ${d} — Your Pre-Departure Checklist\n\nDear ${n},\n\nI can't believe it's almost time for your ${d} trip — how exciting!\n\nHere's your pre-departure checklist:\n□ Passport valid for 6+ months beyond travel date\n□ Visa arranged & printed\n□ Travel insurance policy downloaded\n□ Foreign currency exchanged\n□ Accommodation confirmations printed/saved\n□ Emergency contact numbers saved (${a}: available 24/7)\n\nHave a wonderful trip!\n\nBest,\n${a}`,
  },
  {
    id: 'pt-2',
    category: 'PRE_TRIP',
    label: 'Day-Before Arrival',
    timing: '1 day before departure',
    emoji: '✈️',
    whatsapp: (n, d, a) => `Hi ${n}! ✈️ Tomorrow is the big day!\n\nYour driver will be waiting at arrivals with a name board. Please save their number: [Driver's Number]\n\nHave a smooth flight and let me know the moment you land! I'll be thinking of you. 🌴`,
    email: (n, d, a) => `Subject: Tomorrow is the Day — ${d} Here You Come!\n\nDear ${n},\n\nHow exciting — you leave for ${d} tomorrow! 🎉\n\nA quick reminder: your airport transfer will be waiting at the arrivals exit. Please reach out to me the moment you land so I know you've arrived safely.\n\nHave an incredible journey!\n\n${a}`,
  },
  // ── POST-TRIP
  {
    id: 'post-1',
    category: 'POST_TRIP',
    label: 'Welcome Back + Review Ask',
    timing: '2 days after return',
    emoji: '⭐',
    whatsapp: (n, d, a) => `Welcome back, ${n}! 🏠 Hope you had an amazing time in ${d}!\n\nI'd love to hear all about it — and if you're happy with how everything went, a quick Google review would mean the world to us 🙏\n\nAlso… shall we start planning the next adventure? 😄✈️`,
    email: (n, d, a) => `Subject: Welcome Back from ${d}! How Was It?\n\nDear ${n},\n\nWelcome home from ${d}! I hope every moment was magical.\n\nIf you have a spare minute, I'd be so grateful for a Google review — it helps us continue helping travellers like yourself.\n\nAnd of course, when you're ready for the next adventure, I'm here! 😊\n\nWarm regards,\n${a}`,
  },
  // ── RE-ENGAGEMENT
  {
    id: 're-1',
    category: 'REENGAGEMENT',
    label: '3-Month Cold Re-engage',
    timing: '90 days of silence',
    emoji: '🔄',
    whatsapp: (n, d, a) => `Hi ${n}! It's ${a} from NAMA — hope you're doing great! 😊\n\nWe have some exciting new deals for ${d} and thought of you instantly. Prices are at their lowest for the next season — would you like me to send over a quick comparison? No pressure at all! 🌏`,
    email: (n, d, a) => `Subject: Still Dreaming of ${d}? We Have Something for You!\n\nHi ${n},\n\nI hope this finds you well! I wanted to reach out as we've just launched some exciting packages for ${d} that offer exceptional value.\n\nNo strings attached — I'd love to share a 2-minute summary. Shall I send it over?\n\nWarmly,\n${a}`,
  },
  {
    id: 're-2',
    category: 'REENGAGEMENT',
    label: 'Seasonal Offer Alert',
    timing: 'Seasonal campaign push',
    emoji: '🎯',
    whatsapp: (n, d, a) => `Hi ${n}! 🎯 Quick one — we've just unlocked early-bird pricing for ${d} for the upcoming season. Rates are typically 20-30% lower when booked 90+ days out.\n\nWant me to hold a slot while you check your dates? 🗓️`,
    email: (n, d, a) => `Subject: Early-Bird Alert — ${d} Deals Just Opened\n\nHi ${n},\n\nExciting news — early-bird packages for ${d} are now available, typically 20-30% below peak rates.\n\nThese allocations fill quickly. Shall I reserve a slot for your preferred dates while you decide?\n\nBest,\n${a}`,
  },
];

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string; bg: string }> = {
  NEW_LEAD:     { label: 'New Lead',    color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
  QUOTE:        { label: 'Quote',       color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
  BOOKING:      { label: 'Booking',     color: 'text-green-700',  bg: 'bg-green-50 border-green-100' },
  PRE_TRIP:     { label: 'Pre-Trip',    color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  POST_TRIP:    { label: 'Post-Trip',   color: 'text-[#14B8A6]',  bg: 'bg-teal-50 border-teal-100' },
  REENGAGEMENT: { label: 'Re-engage',   color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-100' },
};

// ── Character counter ──────────────────────────────────────────────────────────
function CharCount({ text, max }: { text: string; max: number }) {
  const count = text.length;
  const pct   = (count / max) * 100;
  const color = pct > 90 ? "text-red-500" : pct > 75 ? "text-amber-500" : "text-slate-400";
  return (
    <span className={`text-[11px] font-bold ${color}`}>{count}/{max}</span>
  );
}

// ── Lead card in selector ──────────────────────────────────────────────────────
function LeadOption({ lead, selected, onClick }: { lead: Lead; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
        selected ? "bg-[#14B8A6]/10 border border-[#14B8A6]/30" : "hover:bg-slate-50 border border-transparent"
      }`}
    >
      <div className="w-8 h-8 bg-gradient-to-br from-[#14B8A6] to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
        {(lead.full_name || "L")[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">{lead.full_name || `Lead #${lead.id}`}</div>
        <div className="text-[11px] text-slate-400 truncate">{lead.destination || "No destination"}</div>
      </div>
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
        lead.status === "NEW" ? "bg-blue-50 text-blue-600" :
        lead.status === "QUALIFIED" ? "bg-emerald-50 text-emerald-600" :
        "bg-slate-100 text-slate-500"
      }`}>
        {lead.status || "NEW"}
      </span>
    </button>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommsPage() {
  const [leads, setLeads]         = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch]     = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [context, setContext]     = useState("Follow Up");
  const [customContext, setCustomContext] = useState("");
  const [tone, setTone]           = useState("Friendly");
  const [drafted, setDrafted]     = useState<{ whatsapp: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("whatsapp");
  const [loading, setLoading]     = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState<"whatsapp" | "email" | null>(null);
  const [draftHistory, setDraftHistory] = useState<Array<{ context: string; lead: string; draft: typeof drafted; ts: string }>>([]);
  const [showHistory, setShowHistory]   = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    leadsApi.list({ size: 100 }).then((d) => {
      const list = d.items?.length ? d.items : SEED_LEADS;
      setLeads(list);
      setSelectedLead(list[0]);
    }).catch(() => {
      setLeads(SEED_LEADS);
      setSelectedLead(SEED_LEADS[0]);
    }).finally(() => setLeadsLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowLeadDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredLeads = leads.filter((l) =>
    !leadSearch || (l.full_name || "").toLowerCase().includes(leadSearch.toLowerCase()) ||
    (l.destination || "").toLowerCase().includes(leadSearch.toLowerCase())
  );

  const handleDraft = async () => {
    if (!selectedLead) { setError("Please select a lead first"); return; }
    setLoading(true);
    setError(null);

    const ctx = context === "Custom" ? "custom" : context.toLowerCase().replace(/ /g, "_");
    const dest = selectedLead.destination || "your destination";
    const name = selectedLead.full_name || `Lead #${selectedLead.id}`;

    // Try real SSE streaming endpoint first
    try {
      const params = new URLSearchParams({
        lead_name: name,
        destination: dest,
        context: ctx,
        tone: tone.toLowerCase(),
        channel: "whatsapp",
        custom_context: context === "Custom" ? customContext : "",
      });

      const res = await fetch(`/api/v1/comms/drafts/stream?${params}`, {
        method: "POST",
        headers: { "Accept": "text/event-stream" },
      });

      if (res.ok && res.body) {
        let waText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        // Show streaming panel immediately
        setDrafted({ whatsapp: "", email: "" });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") {
                waText += data.content;
                setDrafted({ whatsapp: waText, email: waText });
              }
            } catch { /* skip malformed */ }
          }
        }

        setDraftHistory((h) => [
          { context: ctx, lead: name, draft: { whatsapp: waText, email: waText }, ts: "Just now" },
          ...h.slice(0, 9),
        ]);
        setLoading(false);
        return;
      }
    } catch { /* fallback to legacy API below */ }

    // Legacy fallback
    try {
      const effectiveContext = context === "Custom" ? customContext : `${context} (tone: ${tone})`;
      const result = await commsApi.draft({ context: effectiveContext, lead_id: selectedLead.id });
      setDrafted(result);
      setDraftHistory((h) => [
        { context: context === "Custom" ? customContext : context, lead: name, draft: result, ts: "Just now" },
        ...h.slice(0, 9),
      ]);
    } catch (e: any) {
      setError(e.message || "Failed to draft message");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: "whatsapp" | "email") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const whatsappDeepLink = drafted?.whatsapp && selectedLead?.phone
    ? `https://wa.me/${selectedLead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(drafted.whatsapp)}`
    : null;

  const mailtoLink = drafted?.email && selectedLead?.email
    ? `mailto:${selectedLead.email}?subject=${encodeURIComponent("Your Travel Enquiry")}&body=${encodeURIComponent(drafted.email)}`
    : null;

  // KPIs (simulated)
  const kpis = [
    { label: "Sent This Month", value: "247",  icon: Send,        color: "bg-[#14B8A6] text-white" },
    { label: "Reply Rate",      value: "68%",  icon: MessageSquare, color: "bg-violet-500 text-white" },
    { label: "Avg Response",    value: "4.2h", icon: Clock,       color: "bg-blue-500 text-white" },
    { label: "Open Rate",       value: "82%",  icon: BarChart2,   color: "bg-amber-500 text-white" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Communication Hub</h1>
          <p className="text-slate-500 mt-2 font-medium">AI-powered WhatsApp & Email drafting for every lead interaction.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowTemplates(!showTemplates); setShowHistory(false); }}
            className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all ${showTemplates ? 'bg-[#14B8A6] text-white border-[#14B8A6]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
          >
            <Zap size={15} /> Quick Templates
          </button>
          <button
            onClick={() => { setShowHistory(!showHistory); setShowTemplates(false); }}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50"
          >
            <History size={15} /> History ({draftHistory.length})
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 ${k.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <k.icon size={18} />
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F172A]">{k.value}</div>
              <div className="text-xs text-slate-400 font-medium">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
          <AlertCircle size={18} className="flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left panel: Controls ─────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-5">
          {/* Lead selector */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-3">1. Select Lead</h3>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowLeadDropdown(!showLeadDropdown)}
                className="w-full flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-[#14B8A6] transition-colors"
              >
                {selectedLead ? (
                  <>
                    <div className="w-7 h-7 bg-[#14B8A6] rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {(selectedLead.full_name || "L")[0]}
                    </div>
                    <span className="text-sm font-bold text-slate-800 flex-1 text-left truncate">
                      {selectedLead.full_name || `Lead #${selectedLead.id}`}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-400 flex-1 text-left">Select a lead…</span>
                )}
                <ChevronDown size={14} className="text-slate-400 flex-shrink-0" />
              </button>

              {showLeadDropdown && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-2 border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2">
                      <Search size={13} className="text-slate-400" />
                      <input
                        autoFocus
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Search leads…"
                        className="bg-transparent text-sm outline-none flex-1 text-slate-700 placeholder-slate-400"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-2">
                    {leadsLoading ? (
                      <div className="flex justify-center py-4"><Loader size={18} className="animate-spin text-slate-300" /></div>
                    ) : filteredLeads.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No leads found</p>
                    ) : (
                      filteredLeads.map((l) => (
                        <LeadOption
                          key={l.id} lead={l}
                          selected={selectedLead?.id === l.id}
                          onClick={() => { setSelectedLead(l); setShowLeadDropdown(false); setLeadSearch(""); }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {selectedLead && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: "Destination", value: selectedLead.destination || "—" },
                  { label: "Status", value: selectedLead.status || "NEW" },
                  { label: "Budget", value: selectedLead.budget_per_person ? `₹${selectedLead.budget_per_person.toLocaleString("en-IN")}` : "—" },
                  { label: "Travelers", value: String(selectedLead.travelers_count || "—") },
                ].map((f) => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-2.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{f.label}</div>
                    <div className="text-xs font-bold text-slate-700 mt-0.5 truncate">{f.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Context */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-3">2. Message Context</h3>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {CONTEXT_TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setContext(t.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-all border ${
                    context === t.value
                      ? "bg-[#14B8A6]/10 border-[#14B8A6]/40 text-[#14B8A6]"
                      : "border-slate-100 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <t.icon size={11} className="flex-shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              ))}
            </div>
            {context === "Custom" && (
              <textarea
                value={customContext}
                onChange={(e) => setCustomContext(e.target.value)}
                placeholder="Describe what you want to say…"
                rows={3}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#14B8A6] resize-none"
              />
            )}
          </div>

          {/* Tone */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="font-extrabold text-[#0F172A] text-sm mb-3">3. Tone</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    tone === t.value
                      ? "bg-[#0F172A] border-[#0F172A] text-white"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <t.icon size={12} />
                  {t.value}
                </button>
              ))}
            </div>
          </div>

          {/* Draft button */}
          <button
            onClick={handleDraft}
            disabled={loading || !selectedLead}
            className="w-full bg-[#14B8A6] text-[#0F172A] py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-[#0FA898] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <><Loader size={16} className="animate-spin" /> Drafting with AI…</>
            ) : (
              <><Zap size={16} fill="currentColor" /> Draft with AI</>
            )}
          </button>
        </div>

        {/* ── Right panel: Draft output ────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {!drafted ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare size={28} className="text-slate-300" />
              </div>
              <h3 className="text-lg font-extrabold text-slate-700 mb-1">Ready to draft</h3>
              <p className="text-slate-400 text-sm max-w-xs mx-auto">Pick a lead, choose context & tone, then hit "Draft with AI".</p>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
                {(["whatsapp", "email"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                      activeTab === tab ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab === "whatsapp" ? <Phone size={14} /> : <Mail size={14} />}
                    {tab === "whatsapp" ? "WhatsApp" : "Email"}
                  </button>
                ))}
              </div>

              {/* Draft card */}
              <div className="bg-white border border-slate-100 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ${activeTab === "whatsapp" ? "bg-[#25D366]" : "bg-blue-500"}`}>
                      {activeTab === "whatsapp" ? <Phone size={12} /> : <Mail size={12} />}
                    </div>
                    <span className="text-sm font-bold text-slate-600 capitalize">{activeTab} draft</span>
                  </div>
                  <CharCount
                    text={activeTab === "whatsapp" ? (drafted.whatsapp || "") : (drafted.email || "")}
                    max={activeTab === "whatsapp" ? 4096 : 10000}
                  />
                </div>
                <div className="bg-slate-50 rounded-xl p-5 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed min-h-[200px] max-h-80 overflow-y-auto border border-slate-200">
                  {activeTab === "whatsapp" ? drafted.whatsapp : drafted.email}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleCopy(activeTab === "whatsapp" ? drafted.whatsapp : drafted.email, activeTab)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      copied === activeTab ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {copied === activeTab ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                  </button>
                  {activeTab === "whatsapp" && whatsappDeepLink && (
                    <a
                      href={whatsappDeepLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[#25D366] text-white hover:bg-[#20bb5a] transition-all"
                    >
                      <Send size={14} /> Open in WhatsApp
                    </a>
                  )}
                  {activeTab === "email" && mailtoLink && (
                    <a
                      href={mailtoLink}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all"
                    >
                      <Mail size={14} /> Open in Mail
                    </a>
                  )}
                  <button
                    onClick={handleDraft}
                    className="px-3 py-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    title="Re-draft"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Sent history log */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-extrabold text-[#0F172A] text-sm">Recent Sent Messages</h3>
              <span className="text-xs text-slate-400">Last 30 days</span>
            </div>
            <div className="divide-y divide-slate-50">
              {MOCK_HISTORY.map((msg) => (
                <div key={msg.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.channel === "whatsapp" ? "bg-[#25D366]" : "bg-blue-500"}`}>
                    {msg.channel === "whatsapp" ? <Phone size={12} className="text-white" /> : <Mail size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{msg.lead}</p>
                    <p className="text-xs text-slate-400">{msg.context}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[msg.status]}`}>{msg.status}</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">{msg.sent_at}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Quick Templates Library ── */}
      {showTemplates && (
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-extrabold text-[#0F172A] text-sm flex items-center gap-2">
                <Zap size={15} className="text-[#14B8A6]" /> 1-Click Follow-up Templates
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Select a lead above, then apply any template to instantly populate your draft.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {['ALL', ...Object.keys(TEMPLATE_CATEGORIES)].map(cat => (
                <button
                  key={cat}
                  onClick={() => setTemplateFilter(cat)}
                  className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                    templateFilter === cat
                      ? 'bg-[#0f172a] text-white border-[#0f172a]'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat === 'ALL' ? 'All Templates' : TEMPLATE_CATEGORIES[cat].label}
                </button>
              ))}
            </div>
          </div>

          {/* Template Grid */}
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {FOLLOW_UP_TEMPLATES
              .filter(t => templateFilter === 'ALL' || t.category === templateFilter)
              .map(tpl => {
                const catCfg = TEMPLATE_CATEGORIES[tpl.category];
                const name = selectedLead?.full_name?.split(' ')[0] || '[Name]';
                const dest = selectedLead?.destination || '[Destination]';
                const agent = 'Prateek';
                const preview = tpl.whatsapp(name, dest, agent);
                return (
                  <div
                    key={tpl.id}
                    className={`rounded-xl border p-4 flex flex-col gap-3 ${catCfg.bg} hover:shadow-md transition-all`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{tpl.emoji}</span>
                          <span className={`text-xs font-black ${catCfg.color}`}>{tpl.label}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={10} className="text-slate-400" />
                          <span className="text-[10px] text-slate-400">{tpl.timing}</span>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${catCfg.bg} ${catCfg.color}`}>
                        {catCfg.label}
                      </span>
                    </div>

                    {/* Preview */}
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 flex-1">
                      {preview}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDrafted({
                            whatsapp: tpl.whatsapp(name, dest, agent),
                            email: tpl.email(name, dest, agent),
                          });
                          setShowTemplates(false);
                          // WhatsApp deep link immediately if lead selected
                          if (selectedLead?.phone) {
                            const wa = tpl.whatsapp(name, dest, agent);
                            window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(wa)}`, '_blank');
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-green-600 transition-colors"
                      >
                        <MessageSquare size={12} /> WhatsApp
                      </button>
                      <button
                        onClick={() => {
                          setDrafted({
                            whatsapp: tpl.whatsapp(name, dest, agent),
                            email: tpl.email(name, dest, agent),
                          });
                          setActiveTab('email');
                          setShowTemplates(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-colors"
                      >
                        <Mail size={12} /> Email
                      </button>
                      <button
                        onClick={() => {
                          const text = tpl.whatsapp(name, dest, agent);
                          navigator.clipboard.writeText(text);
                        }}
                        className="w-8 flex items-center justify-center py-2 rounded-lg bg-white/60 text-slate-500 hover:bg-white transition-colors border border-slate-200"
                        title="Copy WhatsApp text"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Draft history drawer */}
      {showHistory && draftHistory.length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="font-extrabold text-[#0F172A] text-sm mb-4 flex items-center gap-2">
            <History size={15} /> Draft History (this session)
          </h3>
          <div className="space-y-2">
            {draftHistory.map((h, i) => (
              <button
                key={i}
                onClick={() => { setDrafted(h.draft); setShowHistory(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800">{h.lead} — {h.context}</p>
                  <p className="text-xs text-slate-400">{h.ts}</p>
                </div>
                <ArrowRight size={14} className="text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowRight({ size, className }: { size: number; className: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
