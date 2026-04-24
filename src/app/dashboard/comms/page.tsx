"use client";

/**
 * M5 — Communication Hub (Redesign)
 * ------------------------------------------
 * 2-column layout: left sidebar (template list) + right main area (preview/edit)
 * Design system: Navy #1B2E5E + Teal #14B8A6, full dark mode
 */

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare, Mail, Copy, Check, Loader, AlertCircle,
  Plus, Search, Send, Clock, ChevronDown, Zap,
  Phone, RefreshCw, Smile, Briefcase,
  AlertTriangle, Star, History, X, Wifi, WifiOff,
  ChevronRight, Edit2, FileText, Users, TrendingUp,
} from "lucide-react";
import { leadsApi, commsApi, Lead } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface WaTemplate {
  name: string;
  language: string;
  category: string;
  body: string;
  params: string[];
}

interface SentLogEntry {
  id: string;
  to: string;
  template: string;
  status: "sent" | "demo" | "failed";
  ts: string;
}

// ── Seed leads ────────────────────────────────────────────────────────────────
const CTS = (d: number) => new Date(Date.now() - d * 86400000).toISOString();
const SEED_LEADS: Lead[] = [
  { id: 1, tenant_id: 1, sender_id: "+919812345678", source: "WHATSAPP", full_name: "Ravi Mehta",   email: "ravi.mehta@gmail.com",    phone: "+919812345678", destination: "Rajasthan",  duration_days: 7,  travelers_count: 4, budget_per_person: 75000,  currency: "INR", travel_style: "CULTURAL",  status: "QUALIFIED",     priority: 1, triage_confidence: 92, created_at: CTS(1) },
  { id: 2, tenant_id: 1, sender_id: "+919876543210", source: "EMAIL",    full_name: "Priya Singh",  email: "priya.singh@outlook.com", phone: "+919876543210", destination: "Maldives",   duration_days: 7,  travelers_count: 2, budget_per_person: 250000, currency: "INR", travel_style: "LUXURY",    status: "PROPOSAL_SENT", priority: 1, triage_confidence: 95, created_at: CTS(2) },
  { id: 3, tenant_id: 1, sender_id: "+919845671234", source: "WHATSAPP", full_name: "Ananya Rao",   email: "ananya.rao@gmail.com",    phone: "+919845671234", destination: "Kedarnath",  duration_days: 5,  travelers_count: 3, budget_per_person: 20000,  currency: "INR", travel_style: "ADVENTURE", status: "NEW",           priority: 2, triage_confidence: 78, created_at: CTS(0) },
  { id: 4, tenant_id: 1, sender_id: "+919123456789", source: "WEBSITE",  full_name: "Karan Kapoor", email: "karan.k@hotmail.com",     phone: "+919123456789", destination: "Kenya",      duration_days: 12, travelers_count: 6, budget_per_person: 450000, currency: "INR", travel_style: "WILDLIFE",  status: "QUALIFIED",     priority: 1, triage_confidence: 88, created_at: CTS(3) },
  { id: 5, tenant_id: 1, sender_id: "+919654321098", source: "EMAIL",    full_name: "Deepika Nair", email: "deepika.nair@gmail.com",  phone: "+919654321098", destination: "Bali",       duration_days: 6,  travelers_count: 2, budget_per_person: 120000, currency: "INR", travel_style: "BEACH",     status: "WON",           priority: 1, triage_confidence: 96, created_at: CTS(5) },
  { id: 6, tenant_id: 1, sender_id: "+919712345678", source: "PHONE",    full_name: "Amit Shah",    email: "amit.shah@company.com",   phone: "+919712345678", destination: "Leh Ladakh", duration_days: 10, travelers_count: 8, budget_per_person: 35000,  currency: "INR", travel_style: "ADVENTURE", status: "CONTACTED",     priority: 2, triage_confidence: 81, created_at: CTS(1) },
  { id: 7, tenant_id: 1, sender_id: "+919823456789", source: "WHATSAPP", full_name: "Rohan Verma",  email: "rohan.v@gmail.com",       phone: "+919823456789", destination: "Dubai",      duration_days: 5,  travelers_count: 4, budget_per_person: 90000,  currency: "INR", travel_style: "LUXURY",    status: "NEW",           priority: 2, triage_confidence: 74, created_at: CTS(0) },
];

// ── Context templates ─────────────────────────────────────────────────────────
const CONTEXT_TEMPLATES = [
  { value: "Follow Up",         label: "Follow Up",          icon: Clock,         description: "Gentle check-in after initial enquiry" },
  { value: "Quote Sent",        label: "Quote Sent",         icon: Send,          description: "Nudge after sending a quotation" },
  { value: "Payment Reminder",  label: "Payment Reminder",   icon: AlertTriangle, description: "Politely remind about pending payment" },
  { value: "Booking Confirmed", label: "Booking Confirmed ✓",icon: Check,         description: "Celebrate the booking confirmation" },
  { value: "Itinerary Ready",   label: "Itinerary Ready",    icon: Zap,           description: "Inform client itinerary is prepared" },
  { value: "Trip Reminder",     label: "Pre-trip Reminder",  icon: Star,          description: "7 days before departure checklist" },
  { value: "Post-trip Feedback",label: "Post-trip Feedback", icon: Smile,         description: "Request review after the trip" },
  { value: "Custom",            label: "Custom Context…",    icon: Plus,          description: "Write your own message context" },
];

const TONES = [
  { value: "Professional", label: "Professional", icon: Briefcase },
  { value: "Friendly",     label: "Friendly",     icon: Smile },
  { value: "Urgent",       label: "Urgent",       icon: AlertTriangle },
  { value: "Formal",       label: "Formal",       icon: Star },
];

const MOCK_HISTORY = [
  { id: 1, lead: "Ravi Mehta",   context: "Quote Sent",          channel: "whatsapp", sent_at: "2 hrs ago",   status: "delivered" },
  { id: 2, lead: "Priya Singh",  context: "Follow Up",           channel: "email",    sent_at: "Yesterday",   status: "opened" },
  { id: 3, lead: "Ananya Rao",   context: "Booking Confirmed ✓", channel: "whatsapp", sent_at: "2 days ago",  status: "replied" },
  { id: 4, lead: "Karan Kapoor", context: "Payment Reminder",    channel: "email",    sent_at: "3 days ago",  status: "delivered" },
  { id: 5, lead: "Deepika Nair", context: "Itinerary Ready",     channel: "whatsapp", sent_at: "4 days ago",  status: "replied" },
];

// ── Follow-up Template Library ─────────────────────────────────────────────────
interface FollowUpTemplate {
  id: string;
  category: "NEW_LEAD" | "QUOTE" | "BOOKING" | "PRE_TRIP" | "POST_TRIP" | "REENGAGEMENT";
  label: string;
  timing: string;
  emoji: string;
  channel: "both" | "whatsapp" | "email";
  whatsapp: (name: string, dest: string, agent: string) => string;
  email: (name: string, dest: string, agent: string) => string;
}

const FOLLOW_UP_TEMPLATES: FollowUpTemplate[] = [
  {
    id: "nl-1", category: "NEW_LEAD", label: "Warm Welcome", timing: "Within 1h of inquiry", emoji: "👋", channel: "both",
    whatsapp: (n, d, a) => `Hi ${n}! 👋 Thank you for reaching out about your ${d} trip — I'm ${a} from NAMA Travel.\n\nI'd love to create something special for you. Could you share your preferred travel dates and the number of travellers? I'll put together a tailored itinerary right away! 🌏`,
    email: (n, d, a) => `Subject: Your ${d} Trip Enquiry — Let's Make It Happen! ✈️\n\nDear ${n},\n\nThank you so much for reaching out! I'm ${a} from NAMA Travel, and I'm thrilled to help you plan your ${d} experience.\n\nTo create a personalised itinerary, could you share:\n• Preferred travel dates\n• Number of travellers\n• Any specific experiences in mind?\n\nI'll have a proposal ready for you within 24 hours.\n\nWarm regards,\n${a} | NAMA Travel`,
  },
  {
    id: "nl-2", category: "NEW_LEAD", label: "24h No-Response Nudge", timing: "24h after first message", emoji: "🔔", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! 🌟 Just checking in — I sent you a message yesterday about your ${d} trip.\n\nI've been looking at some amazing options for you and don't want you to miss out on the best availability. Would you have 5 minutes to connect today? 📞`,
    email: (n, d, a) => `Subject: Following up — ${d} Trip Ideas Ready for You\n\nHi ${n},\n\nI wanted to follow up on your ${d} enquiry. I've been curating some wonderful options that I think you'll love!\n\nAre you available for a quick call this week? I can walk you through the top 3 itineraries I've shortlisted.\n\nBest,\n${a} | NAMA Travel`,
  },
  {
    id: "q-1", category: "QUOTE", label: "Quote Sent — 2h Follow-up", timing: "2h after sending quote", emoji: "📋", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! 😊 Just wanted to check — did you get a chance to look at the ${d} proposal I shared?\n\nHappy to walk you through it or answer any questions. We can also customise the itinerary to fit your preferences perfectly! 🗺️`,
    email: (n, d, a) => `Subject: Your ${d} Proposal — Any Questions?\n\nHi ${n},\n\nI hope you've had a chance to review the ${d} itinerary I sent over. I've put together something I think you'll really enjoy!\n\nIf you have any questions — about the hotels, activities, or pricing — I'm here to help. We can also tweak anything to better match your vision.\n\nLooking forward to hearing your thoughts!\n\nBest,\n${a}`,
  },
  {
    id: "q-2", category: "QUOTE", label: "Quote — 48h Urgency", timing: "48h after sending quote", emoji: "⏰", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! Hope all's well 🙏 A quick heads-up — the rates on your ${d} package are valid until this Friday, after which hotel availability may change.\n\nWould you like to secure a 24-hour hold while you decide? No payment needed yet — just keeps the best rooms reserved for you! 🏨`,
    email: (n, d, a) => `Subject: ${d} Package — Rates Valid Until Friday\n\nDear ${n},\n\nI wanted to flag that the pricing on your ${d} itinerary is valid until this Friday. After that, hotel inventory and rates may change for your dates.\n\nIf you'd like, I can place a 24-hour hold on your preferred accommodations — this keeps everything reserved while you finalise your decision.\n\nShall I go ahead with the hold?\n\nBest,\n${a}`,
  },
  {
    id: "q-3", category: "QUOTE", label: "Lost Quote — Re-engagement", timing: "1 week after no response", emoji: "💡", channel: "both",
    whatsapp: (n, d, a) => `Hi ${n}! It's ${a} from NAMA — I know life gets busy! 😊\n\nI have a new offer for ${d} that just came in — a great deal I thought you might like. Would you want me to share the details? Takes only 2 minutes to review! ✨`,
    email: (n, d, a) => `Subject: New Deal Alert — ${d} Package Just In\n\nHi ${n},\n\nI completely understand things get busy! I wanted to reach out because we just received a special offer for ${d} that I immediately thought of you.\n\nNo obligation at all — just wanted to make sure you don't miss it. Can I send over the details?\n\nWarmly,\n${a}`,
  },
  {
    id: "b-1", category: "BOOKING", label: "Booking Confirmed 🎉", timing: "Immediately on booking", emoji: "🎉", channel: "both",
    whatsapp: (...[n, d]) => `${n}, your ${d} trip is CONFIRMED! 🎉🌍\n\nI'm so excited for you! Here's what happens next:\n✅ You'll receive your booking documents within 24 hours\n✅ I'll share a detailed pre-trip checklist\n✅ I'm available 24/7 for any questions\n\nThis is going to be an incredible trip! 🙌`,
    email: (n, d, a) => `Subject: ✅ Your ${d} Trip is Confirmed!\n\nDear ${n},\n\nFantastic news — your ${d} trip is officially confirmed! 🎉\n\nYou can expect:\n• Booking confirmation documents within 24 hours\n• A detailed pre-trip checklist\n• Hotel vouchers and e-tickets\n\nThank you for choosing NAMA Travel. This is going to be an unforgettable experience!\n\nWith excitement,\n${a}`,
  },
  {
    id: "b-2", category: "BOOKING", label: "Balance Payment Reminder", timing: "15 days before balance due", emoji: "💳", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! 👋 A gentle reminder — the balance payment for your ${d} trip is due in 15 days.\n\nYou can transfer to the account details I shared earlier. Once received, I'll send over all your travel documents! 🎒\n\nLet me know if you have any questions or need a payment link.`,
    email: (n, d, a) => `Subject: Balance Payment Due — ${d} Trip\n\nDear ${n},\n\nI hope you're getting excited for your upcoming ${d} trip!\n\nThis is a friendly reminder that the balance payment is due in 15 days. Once received, I'll dispatch all your travel documents, vouchers, and e-tickets.\n\nPlease let me know if you need any assistance with the payment process.\n\nBest regards,\n${a}`,
  },
  {
    id: "pt-1", category: "PRE_TRIP", label: "7-Day Departure Checklist", timing: "7 days before travel", emoji: "🎒", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! 🎒 Only 7 days to go until your ${d} adventure!\n\nQuick checklist:\n✅ Passport valid for 6+ months\n✅ Visa arranged\n✅ Travel insurance activated\n✅ Foreign currency exchanged\n✅ Emergency numbers saved\n\nI've got your back every step of the way! Have a question? Just ping me. 🌟`,
    email: (n, d, a) => `Subject: 7 Days to ${d} — Your Pre-Departure Checklist\n\nDear ${n},\n\nI can't believe it's almost time for your ${d} trip — how exciting!\n\nHere's your pre-departure checklist:\n□ Passport valid for 6+ months beyond travel date\n□ Visa arranged & printed\n□ Travel insurance policy downloaded\n□ Foreign currency exchanged\n□ Accommodation confirmations printed/saved\n□ Emergency contact numbers saved (${a}: available 24/7)\n\nHave a wonderful trip!\n\nBest,\n${a}`,
  },
  {
    id: "pt-2", category: "PRE_TRIP", label: "Day-Before Arrival", timing: "1 day before departure", emoji: "✈️", channel: "both",
    whatsapp: (...[n]) => `Hi ${n}! ✈️ Tomorrow is the big day!\n\nYour driver will be waiting at arrivals with a name board. Please save their number: [Driver's Number]\n\nHave a smooth flight and let me know the moment you land! I'll be thinking of you. 🌴`,
    email: (n, d, a) => `Subject: Tomorrow is the Day — ${d} Here You Come!\n\nDear ${n},\n\nHow exciting — you leave for ${d} tomorrow! 🎉\n\nA quick reminder: your airport transfer will be waiting at the arrivals exit. Please reach out to me the moment you land so I know you've arrived safely.\n\nHave an incredible journey!\n\n${a}`,
  },
  {
    id: "post-1", category: "POST_TRIP", label: "Welcome Back + Review Ask", timing: "2 days after return", emoji: "⭐", channel: "both",
    whatsapp: (...[n, d]) => `Welcome back, ${n}! 🏠 Hope you had an amazing time in ${d}!\n\nI'd love to hear all about it — and if you're happy with how everything went, a quick Google review would mean the world to us 🙏\n\nAlso… shall we start planning the next adventure? 😄✈️`,
    email: (n, d, a) => `Subject: Welcome Back from ${d}! How Was It?\n\nDear ${n},\n\nWelcome home from ${d}! I hope every moment was magical.\n\nIf you have a spare minute, I'd be so grateful for a Google review — it helps us continue helping travellers like yourself.\n\nAnd of course, when you're ready for the next adventure, I'm here! 😊\n\nWarm regards,\n${a}`,
  },
  {
    id: "re-1", category: "REENGAGEMENT", label: "3-Month Cold Re-engage", timing: "90 days of silence", emoji: "🔄", channel: "both",
    whatsapp: (n, d, a) => `Hi ${n}! It's ${a} from NAMA — hope you're doing great! 😊\n\nWe have some exciting new deals for ${d} and thought of you instantly. Prices are at their lowest for the next season — would you like me to send over a quick comparison? No pressure at all! 🌏`,
    email: (n, d, a) => `Subject: Still Dreaming of ${d}? We Have Something for You!\n\nHi ${n},\n\nI hope this finds you well! I wanted to reach out as we've just launched some exciting packages for ${d} that offer exceptional value.\n\nNo strings attached — I'd love to share a 2-minute summary. Shall I send it over?\n\nWarmly,\n${a}`,
  },
  {
    id: "re-2", category: "REENGAGEMENT", label: "Seasonal Offer Alert", timing: "Seasonal campaign push", emoji: "🎯", channel: "both",
    whatsapp: (...[n, d]) => `Hi ${n}! 🎯 Quick one — we've just unlocked early-bird pricing for ${d} for the upcoming season. Rates are typically 20-30% lower when booked 90+ days out.\n\nWant me to hold a slot while you check your dates? 🗓️`,
    email: (n, d, a) => `Subject: Early-Bird Alert — ${d} Deals Just Opened\n\nHi ${n},\n\nExciting news — early-bird packages for ${d} are now available, typically 20-30% below peak rates.\n\nThese allocations fill quickly. Shall I reserve a slot for your preferred dates while you decide?\n\nBest,\n${a}`,
  },
];

const TEMPLATE_CATEGORIES: Record<string, { label: string; color: string; darkColor: string; bg: string; darkBg: string; dot: string }> = {
  NEW_LEAD:     { label: "New Lead",  color: "text-blue-700",   darkColor: "dark:text-blue-400",   bg: "bg-blue-50",   darkBg: "dark:bg-blue-900/20",   dot: "bg-blue-500" },
  QUOTE:        { label: "Quote",     color: "text-amber-700",  darkColor: "dark:text-amber-400",  bg: "bg-amber-50",  darkBg: "dark:bg-amber-900/20",  dot: "bg-amber-500" },
  BOOKING:      { label: "Booking",   color: "text-green-700",  darkColor: "dark:text-green-400",  bg: "bg-green-50",  darkBg: "dark:bg-green-900/20",  dot: "bg-green-500" },
  PRE_TRIP:     { label: "Pre-Trip",  color: "text-purple-700", darkColor: "dark:text-purple-400", bg: "bg-purple-50", darkBg: "dark:bg-purple-900/20", dot: "bg-purple-500" },
  POST_TRIP:    { label: "Post-Trip", color: "text-teal-700",   darkColor: "dark:text-teal-400",   bg: "bg-teal-50",   darkBg: "dark:bg-teal-900/20",   dot: "bg-[#14B8A6]" },
  REENGAGEMENT: { label: "Re-engage", color: "text-rose-700",   darkColor: "dark:text-rose-400",   bg: "bg-rose-50",   darkBg: "dark:bg-rose-900/20",   dot: "bg-rose-500" },
};

// Highlight {{variable}} placeholders with teal pills
function renderWithVariables(text: string) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) =>
    /^\{\{[^}]+\}\}$/.test(part) ? (
      <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[11px] font-bold bg-[#14B8A6]/15 text-[#14B8A6] dark:bg-[#14B8A6]/20 dark:text-[#14B8A6] mx-0.5">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function CharCount({ text, max }: { text: string; max: number }) {
  const count = text.length;
  const pct = (count / max) * 100;
  const color = pct > 90 ? "text-red-500" : pct > 75 ? "text-amber-500" : "text-slate-400 dark:text-slate-500";
  return <span className={`text-[11px] font-bold ${color}`}>{count}/{max}</span>;
}

// ── WhatsApp Business API Panel ────────────────────────────────────────────────
function WhatsAppBusinessPanel() {
  const [status, setStatus] = useState<{ connected: boolean; mode: string; phone_id?: string; message?: string } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WaTemplate | null>(null);
  const [phone, setPhone] = useState("");
  const [params, setParams] = useState<string[]>([]);
  const [freeText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message_id?: string; demo?: boolean; error?: string } | null>(null);
  const [sentLog, setSentLog] = useState<SentLogEntry[]>([]);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    fetch("/api/v1/whatsapp/status", {
      headers: { Authorization: `Bearer ${localStorage.getItem("nama_token") || ""}` },
    })
      .then((r) => r.json())
      .then((d) => setStatus(d))
      .catch(() => setStatus({ connected: false, mode: "demo", message: "Backend unreachable" }))
      .finally(() => setStatusLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/v1/whatsapp/templates", {
      headers: { Authorization: `Bearer ${localStorage.getItem("nama_token") || ""}` },
    })
      .then((r) => r.json())
      .then((d) => {
        const list: WaTemplate[] = d.templates || [];
        setTemplates(list);
        if (list.length > 0) {
          setSelectedTemplate(list[0]);
          setParams(new Array(list[0].params.length).fill(""));
        }
      })
      .catch(() => setTemplates([]))
      .finally(() => setTemplatesLoading(false));
  }, []);

  const handleTemplateChange = (tpl: WaTemplate) => {
    setSelectedTemplate(tpl);
    setParams(new Array(tpl.params.length).fill(""));
    setSendResult(null);
  };

  const handleSend = async () => {
    if (!phone) { setSendResult({ success: false, error: "Phone number is required" }); return; }
    setSending(true);
    setSendResult(null);
    try {
      const body = selectedTemplate
        ? { to: phone, message_type: "template", template_name: selectedTemplate.name, template_language: selectedTemplate.language, template_params: params }
        : { to: phone, message_type: "text", text: freeText || "Hello from NAMA OS" };
      const res = await fetch("/api/v1/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("nama_token") || ""}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setSendResult(data);
      if (data.success) {
        setSentLog((prev) => [{ id: data.message_id || String(Date.now()), to: phone, template: selectedTemplate?.name || "text", status: data.demo ? "demo" : "sent", ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
      }
    } catch (e) {
      setSendResult({ success: false, error: String(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#25D366] rounded-xl flex items-center justify-center flex-shrink-0">
            <Phone size={16} className="text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-[#1B2E5E] dark:text-slate-200 text-sm">WhatsApp Business API</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Meta Cloud API — send templates directly from NAMA</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {statusLoading ? (
            <span className="text-[11px] text-slate-400 flex items-center gap-1"><Loader size={11} className="animate-spin" /> checking…</span>
          ) : status?.connected ? (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/40 px-2.5 py-1 rounded-full">
              <Wifi size={10} /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border border-amber-200 dark:border-amber-700/40 px-2.5 py-1 rounded-full">
              <WifiOff size={10} /> Demo mode
            </span>
          )}
          <ChevronRight size={16} className={`text-slate-400 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`} />
        </div>
      </button>

      {!collapsed && (
        <div className="p-6 space-y-5">
          {status && !status.connected && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4 text-amber-700 dark:text-amber-400">
              <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold block mb-0.5">Demo mode active</span>
                {status.message || "Add WHATSAPP_TOKEN + WHATSAPP_PHONE_ID in Railway to activate live sending."} Messages will be simulated.
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Recipient phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 919876543210 (with country code)"
                  className="w-full text-sm border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-[#25D366] focus:ring-1 focus:ring-[#25D366]/20 bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Message template</label>
                {templatesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2"><Loader size={12} className="animate-spin" /> Loading templates…</div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.name}
                        onClick={() => handleTemplateChange(tpl)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                          selectedTemplate?.name === tpl.name
                            ? "bg-[#25D366]/10 border-[#25D366]/40 text-slate-800 dark:text-slate-200"
                            : "border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="font-bold mb-0.5">{tpl.name.replace(/_/g, " ")}</div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{tpl.body}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedTemplate && selectedTemplate.params.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Template parameters</label>
                  <div className="space-y-2">
                    {selectedTemplate.params.map((paramName, idx) => (
                      <div key={paramName} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 w-6 text-right flex-shrink-0">{`{{${idx + 1}}}`}</span>
                        <input
                          type="text"
                          value={params[idx] || ""}
                          onChange={(e) => { const next = [...params]; next[idx] = e.target.value; setParams(next); }}
                          placeholder={paramName.replace(/_/g, " ")}
                          className="flex-1 text-xs border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#25D366] bg-white dark:bg-[#0A0F1E] text-slate-800 dark:text-slate-200 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={handleSend}
                disabled={sending || !phone}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#25D366] text-white font-black text-sm hover:bg-[#20bb5a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? <><Loader size={15} className="animate-spin" /> Sending…</> : <><Send size={15} /> Send WhatsApp Message</>}
              </button>
              {sendResult && (
                <div className={`flex items-start gap-2.5 rounded-xl p-3 text-xs ${sendResult.success ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-400"}`}>
                  {sendResult.success ? <Check size={14} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />}
                  <div>
                    {sendResult.success ? (
                      <><span className="font-bold">Message {sendResult.demo ? "simulated" : "sent"}!</span>{sendResult.demo && <span className="text-[10px] block mt-0.5 text-amber-600 dark:text-amber-400">Demo mode — add env vars to send live</span>}</>
                    ) : (
                      <span className="font-bold">{sendResult.error || "Send failed"}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {selectedTemplate && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Preview</label>
                  <div className="bg-[#e5ddd5] dark:bg-[#1a2a1a] rounded-2xl p-4">
                    <div className="bg-white dark:bg-[#1e3a1e] rounded-xl rounded-tl-sm px-4 py-3 max-w-[85%] shadow-sm">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {selectedTemplate.body.replace(/\{\{(\d+)\}\}/g, (_, n) => params[parseInt(n) - 1] || `[${selectedTemplate.params[parseInt(n) - 1] || `param ${n}`}]`)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1.5 text-right">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                </div>
              )}
              {sentLog.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5">Recent sends <span className="text-slate-300 dark:text-slate-600 font-normal">(this session)</span></label>
                  <div className="space-y-1.5">
                    {sentLog.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2.5 px-3 py-2 bg-slate-50 dark:bg-white/5 rounded-xl text-xs">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${entry.status === "sent" ? "bg-[#25D366]" : entry.status === "demo" ? "bg-amber-400" : "bg-red-400"}`}>
                          {entry.status === "failed" ? <X size={10} className="text-white" /> : <Check size={10} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">+{entry.to.replace(/^\+/, "")}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{entry.template.replace(/_/g, " ")}</p>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${entry.status === "sent" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : entry.status === "demo" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>{entry.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CommsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadSearch, setLeadSearch] = useState("");
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);
  const [context, setContext] = useState("Follow Up");
  const [customContext, setCustomContext] = useState("");
  const [tone, setTone] = useState("Friendly");
  const [drafted, setDrafted] = useState<{ whatsapp: string; email: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("whatsapp");
  const [loading, setLoading] = useState(false);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"whatsapp" | "email" | null>(null);
  const [draftHistory, setDraftHistory] = useState<Array<{ context: string; lead: string; draft: typeof drafted; ts: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [templateFilter, setTemplateFilter] = useState<string>("ALL");
  // Sidebar: selected template from library
  const [selectedTpl, setSelectedTpl] = useState<FollowUpTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editBody, setEditBody] = useState("");
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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowLeadDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Select first template on load
  useEffect(() => {
    if (!selectedTpl && FOLLOW_UP_TEMPLATES.length > 0) setSelectedTpl(FOLLOW_UP_TEMPLATES[0]);
  }, [selectedTpl]);

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
    try {
      const params = new URLSearchParams({
        lead_name: name, destination: dest, context: ctx, tone: tone.toLowerCase(), channel: "whatsapp",
        custom_context: context === "Custom" ? customContext : "",
      });
      const res = await fetch(`/api/v1/comms/drafts/stream?${params}`, { method: "POST", headers: { Accept: "text/event-stream" } });
      if (res.ok && res.body) {
        let waText = "";
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        setDrafted({ whatsapp: "", email: "" });
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try { const data = JSON.parse(line.slice(6)); if (data.type === "delta") { waText += data.content; setDrafted({ whatsapp: waText, email: waText }); } } catch { /* skip */ }
          }
        }
        setDraftHistory((h) => [{ context: ctx, lead: name, draft: { whatsapp: waText, email: waText }, ts: "Just now" }, ...h.slice(0, 9)]);
        setLoading(false);
        return;
      }
    } catch { /* fallback */ }
    try {
      const effectiveContext = context === "Custom" ? customContext : `${context} (tone: ${tone})`;
      const result = await commsApi.draft({ context: effectiveContext, lead_id: selectedLead.id });
      setDrafted(result);
      setDraftHistory((h) => [{ context: context === "Custom" ? customContext : context, lead: name, draft: result, ts: "Just now" }, ...h.slice(0, 9)]);
    } catch {
      const tplMatch = FOLLOW_UP_TEMPLATES.find(
        (t) => t.label.toLowerCase().includes(context.toLowerCase()) || context.toLowerCase().includes(t.label.toLowerCase().split(" ")[0])
      );
      const firstName = name.split(" ")[0];
      const agentName = "NAMA Travel";
      const waText = tplMatch ? tplMatch.whatsapp(firstName, dest, agentName) : `Hi ${firstName}! Hope you are doing well. I wanted to follow up on your ${dest} trip enquiry. — ${agentName}`;
      const emailText = tplMatch ? tplMatch.email(firstName, dest, agentName) : `Subject: Your ${dest} Trip — Options Ready!\n\nDear ${firstName},\n\nThank you for your interest in ${dest}.\n\nWarm regards,\n${agentName}`;
      const seedDraft = { whatsapp: waText, email: emailText };
      setDrafted(seedDraft);
      setDraftHistory((h) => [{ context: context === "Custom" ? customContext : context, lead: name, draft: seedDraft, ts: "Just now" }, ...h.slice(0, 9)]);
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

  const agentName = "Prateek";
  const clientName = selectedLead?.full_name?.split(" ")[0] || "[Name]";
  const clientDest = selectedLead?.destination || "[Destination]";

  const tplPreviewText = selectedTpl
    ? (activeTab === "whatsapp" ? selectedTpl.whatsapp(clientName, clientDest, agentName) : selectedTpl.email(clientName, clientDest, agentName))
    : "";

  const handleSelectTpl = (tpl: FollowUpTemplate) => {
    setSelectedTpl(tpl);
    setEditMode(false);
    setEditBody("");
  };

  const handleEditToggle = () => {
    if (!editMode) setEditBody(tplPreviewText);
    setEditMode(!editMode);
  };

  const handleUseTemplate = (channel: "whatsapp" | "email") => {
    if (!selectedTpl) return;
    const wa = editMode ? editBody : selectedTpl.whatsapp(clientName, clientDest, agentName);
    const em = editMode ? editBody : selectedTpl.email(clientName, clientDest, agentName);
    setDrafted({ whatsapp: wa, email: em });
    setActiveTab(channel);
    if (channel === "whatsapp" && selectedLead?.phone) {
      const text = editMode ? editBody : selectedTpl.whatsapp(clientName, clientDest, agentName);
      window.open(`https://wa.me/${selectedLead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  // KPIs
  const kpis = [
    { label: "Templates",       value: String(FOLLOW_UP_TEMPLATES.length), icon: FileText,    color: "bg-[#1B2E5E] dark:bg-[#1B2E5E]/80 text-white" },
    { label: "Sent This Month", value: "247",                               icon: Send,        color: "bg-[#14B8A6] text-white" },
    { label: "Avg Open Rate",   value: "82%",                               icon: TrendingUp,  color: "bg-violet-500 text-white" },
  ];

  const groupedTemplates = Object.keys(TEMPLATE_CATEGORIES).reduce<Record<string, FollowUpTemplate[]>>((acc, cat) => {
    acc[cat] = FOLLOW_UP_TEMPLATES.filter((t) => t.category === cat);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E]">
      {/* ── Page Header ── */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2E5E] dark:text-slate-100">Communications</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">Email &amp; WhatsApp templates</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowHistory(!showHistory); }}
              className={`flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl border transition-all ${showHistory ? "bg-[#1B2E5E] text-white border-[#1B2E5E] dark:bg-[#14B8A6] dark:border-[#14B8A6]" : "bg-white dark:bg-[#0F1B35] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"}`}
            >
              <History size={15} /> History ({draftHistory.length})
            </button>
            <button
              onClick={handleDraft}
              disabled={loading || !selectedLead}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-[#14B8A6] text-white hover:bg-[#0FA898] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader size={14} className="animate-spin" /> Drafting…</> : <><Zap size={14} fill="currentColor" /> Draft with AI</>}
            </button>
          </div>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          {kpis.map((k) => (
            <div key={k.label} className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${k.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <k.icon size={16} />
              </div>
              <div>
                <div className="text-xl font-black text-[#1B2E5E] dark:text-slate-100">{k.value}</div>
                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-2xl p-4 text-red-700 dark:text-red-400 mb-4">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}
      </div>

      {/* ── 2-Column Body ── */}
      <div className="flex flex-1 overflow-hidden border-t border-slate-100 dark:border-white/5 mx-6 mb-6 rounded-2xl bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5">
        {/* ── LEFT SIDEBAR ── */}
        <div className="w-64 flex-shrink-0 border-r border-slate-100 dark:border-white/5 flex flex-col overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Templates</p>
          </div>

          {/* Category filter */}
          <div className="px-3 pt-3 pb-2 flex gap-1.5 flex-wrap">
            {["ALL", ...Object.keys(TEMPLATE_CATEGORIES)].map((cat) => (
              <button
                key={cat}
                onClick={() => setTemplateFilter(cat)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                  templateFilter === cat
                    ? "bg-[#1B2E5E] dark:bg-[#14B8A6] text-white border-transparent"
                    : "bg-transparent text-slate-500 dark:text-slate-500 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                {cat === "ALL" ? "All" : TEMPLATE_CATEGORIES[cat].label}
              </button>
            ))}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3 pt-1">
            {Object.keys(groupedTemplates)
              .filter((cat) => templateFilter === "ALL" || templateFilter === cat)
              .map((cat) => (
                <div key={cat}>
                  <div className="px-2 py-1 flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${TEMPLATE_CATEGORIES[cat].dot}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{TEMPLATE_CATEGORIES[cat].label}</span>
                  </div>
                  {groupedTemplates[cat].map((tpl) => {
                    const isActive = selectedTpl?.id === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleSelectTpl(tpl)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs transition-all mb-0.5 border-r-2 ${
                          isActive
                            ? "bg-[#14B8A6]/10 dark:bg-[#14B8A6]/15 border-r-[#14B8A6] text-[#1B2E5E] dark:text-[#14B8A6]"
                            : "border-r-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="text-sm flex-shrink-0">{tpl.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className={`font-semibold truncate text-[11px] ${isActive ? "text-[#1B2E5E] dark:text-[#14B8A6]" : "text-slate-700 dark:text-slate-300"}`}>{tpl.label}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{tpl.timing}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>

          {/* New Template button */}
          <div className="p-3 border-t border-slate-100 dark:border-white/5">
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-500 text-xs font-bold hover:border-[#14B8A6] hover:text-[#14B8A6] dark:hover:border-[#14B8A6] dark:hover:text-[#14B8A6] transition-all">
              <Plus size={13} /> New Template
            </button>
          </div>
        </div>

        {/* ── RIGHT MAIN AREA ── */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {!selectedTpl ? (
            <div className="flex-1 flex items-center justify-center p-12 text-center">
              <div>
                <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare size={28} className="text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-base font-extrabold text-slate-700 dark:text-slate-300 mb-1">Select a template to preview</h3>
                <p className="text-slate-400 dark:text-slate-500 text-sm">Choose a template from the sidebar to view and edit it.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 space-y-5">
              {/* Template header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTpl.emoji}</span>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#1B2E5E] dark:text-slate-100">{selectedTpl.label}</h2>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#25D366]/15 text-[#25D366]">
                        <Phone size={9} /> WhatsApp
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Mail size={9} /> Email
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TEMPLATE_CATEGORIES[selectedTpl.category].bg} ${TEMPLATE_CATEGORIES[selectedTpl.category].darkBg} ${TEMPLATE_CATEGORIES[selectedTpl.category].color} ${TEMPLATE_CATEGORIES[selectedTpl.category].darkColor}`}>
                        {TEMPLATE_CATEGORIES[selectedTpl.category].label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                        <Clock size={9} /> {selectedTpl.timing}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleEditToggle}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      editMode
                        ? "bg-[#1B2E5E] text-white border-[#1B2E5E] dark:bg-[#14B8A6] dark:border-[#14B8A6]"
                        : "bg-white dark:bg-[#0A0F1E] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <Edit2 size={12} /> {editMode ? "Editing" : "Edit"}
                  </button>
                </div>
              </div>

              {/* Lead selector (inline) */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <Users size={14} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex-shrink-0">Preview for:</span>
                <div className="relative flex-1" ref={dropdownRef}>
                  <button
                    onClick={() => setShowLeadDropdown(!showLeadDropdown)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#0F1B35] hover:border-[#14B8A6] transition-colors text-xs"
                  >
                    {selectedLead ? (
                      <>
                        <div className="w-5 h-5 bg-[#14B8A6] rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0">{(selectedLead.full_name || "L")[0]}</div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex-1 text-left truncate">{selectedLead.full_name || `Lead #${selectedLead.id}`}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">{selectedLead.destination || "—"}</span>
                      </>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">Select a lead…</span>
                    )}
                    <ChevronDown size={12} className="text-slate-400 flex-shrink-0" />
                  </button>
                  {showLeadDropdown && (
                    <div className="absolute z-20 top-full mt-1 w-72 bg-white dark:bg-[#0F1B35] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
                      <div className="p-2 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                          <Search size={12} className="text-slate-400" />
                          <input autoFocus value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search leads…" className="bg-transparent text-xs outline-none flex-1 text-slate-700 dark:text-slate-300 placeholder-slate-400" />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto p-2">
                        {leadsLoading ? (
                          <div className="flex justify-center py-4"><Loader size={16} className="animate-spin text-slate-300" /></div>
                        ) : filteredLeads.length === 0 ? (
                          <p className="text-xs text-slate-400 text-center py-4">No leads found</p>
                        ) : filteredLeads.map((l) => (
                          <button
                            key={l.id}
                            onClick={() => { setSelectedLead(l); setShowLeadDropdown(false); setLeadSearch(""); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all ${selectedLead?.id === l.id ? "bg-[#14B8A6]/10 dark:bg-[#14B8A6]/15" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                          >
                            <div className="w-7 h-7 bg-gradient-to-br from-[#14B8A6] to-teal-600 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">{(l.full_name || "L")[0]}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{l.full_name || `Lead #${l.id}`}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{l.destination || "No destination"}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Channel tabs */}
              <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-fit gap-1">
                {(["whatsapp", "email"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? "bg-white dark:bg-[#0F1B35] text-[#1B2E5E] dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                  >
                    {tab === "whatsapp" ? <Phone size={13} className={activeTab === tab ? "text-[#25D366]" : ""} /> : <Mail size={13} className={activeTab === tab ? "text-blue-500" : ""} />}
                    {tab === "whatsapp" ? "WhatsApp" : "Email"}
                  </button>
                ))}
              </div>

              {/* Message preview / edit */}
              <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                {activeTab === "whatsapp" ? (
                  <div className="bg-[#e5ddd5] dark:bg-[#1a2a1a] p-5 min-h-[200px]">
                    {editMode ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={8}
                        className="w-full text-sm bg-white dark:bg-[#1e3a1e] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#14B8A6] resize-none text-slate-700 dark:text-slate-300 leading-relaxed"
                      />
                    ) : (
                      <div className="max-w-[80%]">
                        <div className="bg-[#DCF8C6] dark:bg-[#1a3a1a] rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                          <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                            {renderWithVariables(selectedTpl.whatsapp(clientName, clientDest, agentName))}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2 text-right">{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ✓✓</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-5 min-h-[200px]">
                    {editMode ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={10}
                        className="w-full text-sm bg-slate-50 dark:bg-[#0A0F1E] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#14B8A6] resize-none text-slate-700 dark:text-slate-300 leading-relaxed font-mono"
                      />
                    ) : (
                      <div className="space-y-3">
                        {selectedTpl.email(clientName, clientDest, agentName).split("\n").map((line, i) => {
                          if (i === 0 && line.startsWith("Subject:")) {
                            return (
                              <div key={i} className="pb-3 border-b border-slate-100 dark:border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Subject</span>
                                <p className="text-sm font-bold text-[#1B2E5E] dark:text-slate-200 mt-0.5">{line.replace("Subject: ", "")}</p>
                              </div>
                            );
                          }
                          return line ? (
                            <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                              {renderWithVariables(line)}
                            </p>
                          ) : <div key={i} className="h-2" />;
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Action bar */}
                <div className="px-5 py-4 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleUseTemplate("whatsapp")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bb5a] transition-all"
                  >
                    <Phone size={12} /> Send WhatsApp
                  </button>
                  <button
                    onClick={() => handleUseTemplate("email")}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 transition-all"
                  >
                    <Mail size={12} /> Use in Email
                  </button>
                  <button
                    onClick={() => {
                      const text = editMode ? editBody : tplPreviewText;
                      navigator.clipboard.writeText(text);
                      setCopied(activeTab);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${copied === activeTab ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-[#0A0F1E] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                  >
                    {copied === activeTab ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <div className="ml-auto">
                    <CharCount text={editMode ? editBody : tplPreviewText} max={activeTab === "whatsapp" ? 4096 : 10000} />
                  </div>
                </div>
              </div>

              {/* Drafted output (shown when AI draft used) */}
              {drafted && (
                <div className="bg-white dark:bg-[#0F1B35] border border-[#14B8A6]/30 dark:border-[#14B8A6]/20 rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-[#14B8A6] rounded-full flex items-center justify-center">
                        <Zap size={11} fill="white" className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-[#1B2E5E] dark:text-[#14B8A6]">AI Draft</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-lg gap-0.5">
                        {(["whatsapp", "email"] as const).map((tab) => (
                          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${activeTab === tab ? "bg-white dark:bg-[#0F1B35] text-[#1B2E5E] dark:text-slate-100 shadow-sm" : "text-slate-500 dark:text-slate-500"}`}>
                            {tab === "whatsapp" ? "WA" : "Email"}
                          </button>
                        ))}
                      </div>
                      <button onClick={() => setDrafted(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"><X size={14} /></button>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-4 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-h-60 overflow-y-auto border border-slate-100 dark:border-white/5">
                      {activeTab === "whatsapp" ? drafted.whatsapp : drafted.email}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleCopy(activeTab === "whatsapp" ? drafted.whatsapp : drafted.email, activeTab)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${copied === activeTab ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40 text-emerald-700 dark:text-emerald-400" : "bg-white dark:bg-[#0A0F1E] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                      >
                        {copied === activeTab ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                      </button>
                      {activeTab === "whatsapp" && whatsappDeepLink && (
                        <a href={whatsappDeepLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#25D366] text-white hover:bg-[#20bb5a] transition-all">
                          <Send size={12} /> Open in WhatsApp
                        </a>
                      )}
                      {activeTab === "email" && mailtoLink && (
                        <a href={mailtoLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 transition-all">
                          <Mail size={12} /> Open in Mail
                        </a>
                      )}
                      <button onClick={handleDraft} className="px-3 py-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors" title="Re-draft">
                        <RefreshCw size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Context & Tone for AI Draft */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                  <h3 className="font-extrabold text-[#1B2E5E] dark:text-slate-200 text-xs mb-3">Message Context</h3>
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    {CONTEXT_TEMPLATES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setContext(t.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-left text-xs font-semibold transition-all border ${context === t.value ? "bg-[#14B8A6]/10 dark:bg-[#14B8A6]/15 border-[#14B8A6]/40 text-[#14B8A6]" : "border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"}`}
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
                      className="w-full text-xs border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-[#14B8A6] resize-none bg-white dark:bg-[#0A0F1E] text-slate-700 dark:text-slate-300 placeholder-slate-400"
                    />
                  )}
                </div>
                <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4">
                  <h3 className="font-extrabold text-[#1B2E5E] dark:text-slate-200 text-xs mb-3">Tone</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {TONES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTone(t.value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border ${tone === t.value ? "bg-[#1B2E5E] dark:bg-[#1B2E5E]/80 border-[#1B2E5E] text-white" : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5"}`}
                      >
                        <t.icon size={12} />
                        {t.value}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleDraft}
                    disabled={loading || !selectedLead}
                    className="w-full mt-3 bg-[#14B8A6] text-white py-2.5 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-[#0FA898] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {loading ? <><Loader size={13} className="animate-spin" /> Drafting with AI…</> : <><Zap size={13} fill="currentColor" /> Draft with AI</>}
                  </button>
                </div>
              </div>

              {/* Recent sent messages */}
              <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <h3 className="font-extrabold text-[#1B2E5E] dark:text-slate-200 text-sm">Recent Sent Messages</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Last 30 days</span>
                </div>
                <div className="divide-y divide-slate-50 dark:divide-white/5">
                  {MOCK_HISTORY.map((msg) => (
                    <div key={msg.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.channel === "whatsapp" ? "bg-[#25D366]" : "bg-blue-500"}`}>
                        {msg.channel === "whatsapp" ? <Phone size={12} className="text-white" /> : <Mail size={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{msg.lead}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{msg.context}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          msg.status === "delivered" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" :
                          msg.status === "opened"    ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" :
                          msg.status === "replied"   ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" :
                          "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                        }`}>{msg.status}</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{msg.sent_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Draft history drawer (full-width below) */}
      {showHistory && draftHistory.length > 0 && (
        <div className="mx-6 mb-6 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
          <h3 className="font-extrabold text-[#1B2E5E] dark:text-slate-200 text-sm mb-4 flex items-center gap-2">
            <History size={15} className="text-[#14B8A6]" /> Draft History (this session)
          </h3>
          <div className="space-y-2">
            {draftHistory.map((h, i) => (
              <button
                key={i}
                onClick={() => { setDrafted(h.draft); setShowHistory(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-left transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{h.lead} — {h.context}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{h.ts}</p>
                </div>
                <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp Business API Panel */}
      <div className="mx-6 mb-6">
        <WhatsAppBusinessPanel />
      </div>
    </div>
  );
}
