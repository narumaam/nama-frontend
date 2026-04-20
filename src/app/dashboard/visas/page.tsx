"use client";

/**
 * Visa & Passport Management — NAMA Console
 * ─────────────────────────────────────────
 * Full visa application management hub inspired by "Visa Specialist Intelligence Hub" design.
 *
 * Left sidebar: Active Queue, Priority Cases, Archived, Global Policy, Agent Performance
 * Main pane:    KPI strip → Application Queue table → Global Compliance Heatmap
 * Right pane:   AI Real-time Analysis panel + Policy Pulse
 *
 * Tabs: Dashboard · Applications · Compliance · Analytics
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Stamp, Users, MapPin, Clock, CheckCircle, AlertCircle, XCircle,
  Search, Filter, Plus, ChevronRight, BarChart2, Globe, Shield,
  FileText, Settings, AlertTriangle, TrendingUp, TrendingDown,
  Eye, Edit2, Send, Download, RefreshCw, Zap, Star, X,
  Activity, Inbox, Archive, BookOpen, User, Phone, Mail,
  Calendar, Check, Loader, ChevronDown, Info, Radar,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface VisaApplication {
  id: string;
  traveler:       string;
  initials:       string;
  destination:    string;
  flag:           string;
  visaType:       string;
  submittedDate:  string;
  travelDate:     string;
  status:         "VERIFIED" | "PENDING" | "CLARIFICATION" | "APPROVED" | "REJECTED";
  aiVerification: { label: string; pct: number; color: string; sub: string };
  priority:       "HIGH" | "NORMAL" | "LOW";
  passportExpiry: string;
  docScore:       number;
  ref:            string;
}

// ── Seed data ──────────────────────────────────────────────────────────────────
const APPLICATIONS: VisaApplication[] = [
  {
    id: "V-44921-X", traveler: "Sarah Miller",   initials: "SM", destination: "Italy",      flag: "🇮🇹",
    visaType: "Schengen Short Stay",  submittedDate: "14 Apr 2026", travelDate: "05 May 2026",
    status: "PENDING",       aiVerification: { label: "Document Match",      pct: 98,  color: "amber", sub: "Embassy Sync Active" },
    priority: "HIGH",   passportExpiry: "2029-08-15", docScore: 98,  ref: "V-44921-X",
  },
  {
    id: "V-44955-C", traveler: "Arjun Wong",     initials: "AW", destination: "Japan",      flag: "🇯🇵",
    visaType: "Business e-Visa",      submittedDate: "15 Apr 2026", travelDate: "02 May 2026",
    status: "VERIFIED",      aiVerification: { label: "Verified",            pct: 100, color: "green", sub: "API Push Ready" },
    priority: "NORMAL", passportExpiry: "2028-03-22", docScore: 100, ref: "V-44955-C",
  },
  {
    id: "V-45001-Z", traveler: "Elena Fischer",  initials: "EF", destination: "Australia",  flag: "🇦🇺",
    visaType: "Working Holiday",      submittedDate: "13 Apr 2026", travelDate: "20 May 2026",
    status: "CLARIFICATION",aiVerification: { label: "Pending Clarification",pct: 62,  color: "red",   sub: "Incomplete History" },
    priority: "HIGH",   passportExpiry: "2027-11-30", docScore: 62,  ref: "V-45001-Z",
  },
  {
    id: "V-45034-B", traveler: "Rohan Kapoor",   initials: "RK", destination: "UAE",        flag: "🇦🇪",
    visaType: "Tourist Visa",         submittedDate: "16 Apr 2026", travelDate: "08 May 2026",
    status: "APPROVED",      aiVerification: { label: "Approved",            pct: 100, color: "green", sub: "Visa Issued" },
    priority: "NORMAL", passportExpiry: "2030-01-10", docScore: 100, ref: "V-45034-B",
  },
  {
    id: "V-45102-P", traveler: "Priya Sharma",   initials: "PS", destination: "UK",         flag: "🇬🇧",
    visaType: "Standard Visitor",     submittedDate: "12 Apr 2026", travelDate: "25 May 2026",
    status: "PENDING",       aiVerification: { label: "Document Match",      pct: 91,  color: "amber", sub: "Biometrics Pending" },
    priority: "NORMAL", passportExpiry: "2028-07-04", docScore: 91,  ref: "V-45102-P",
  },
  {
    id: "V-45188-D", traveler: "Deepa Nair",     initials: "DN", destination: "USA",        flag: "🇺🇸",
    visaType: "B1/B2 Tourist",        submittedDate: "10 Apr 2026", travelDate: "15 Jun 2026",
    status: "PENDING",       aiVerification: { label: "Document Match",      pct: 85,  color: "amber", sub: "DS-160 Review" },
    priority: "LOW",    passportExpiry: "2029-02-28", docScore: 85,  ref: "V-45188-D",
  },
  {
    id: "V-45211-X", traveler: "Karan Shah",     initials: "KS", destination: "Canada",     flag: "🇨🇦",
    visaType: "Visitor Visa",         submittedDate: "11 Apr 2026", travelDate: "01 Jun 2026",
    status: "REJECTED",      aiVerification: { label: "Rejected",            pct: 0,   color: "red",   sub: "Financial docs insufficient" },
    priority: "HIGH",   passportExpiry: "2027-09-18", docScore: 44,  ref: "V-45211-X",
  },
];

const HEATMAP_COUNTRIES = [
  { name: "Italy",     code: "IT", x: 47, y: 28, status: "optimal",  count: 12, waitDays: 3 },
  { name: "Japan",     code: "JP", x: 83, y: 32, status: "optimal",  count: 8,  waitDays: 2 },
  { name: "Australia", code: "AU", x: 80, y: 68, status: "delayed",  count: 5,  waitDays: 14 },
  { name: "UAE",       code: "AE", x: 59, y: 38, status: "optimal",  count: 21, waitDays: 1 },
  { name: "UK",        code: "GB", x: 43, y: 25, status: "delayed",  count: 7,  waitDays: 21 },
  { name: "USA",       code: "US", x: 17, y: 35, status: "delayed",  count: 15, waitDays: 28 },
  { name: "Canada",    code: "CA", x: 15, y: 25, status: "delayed",  count: 4,  waitDays: 18 },
  { name: "France",    code: "FR", x: 45, y: 27, status: "optimal",  count: 9,  waitDays: 4 },
  { name: "Germany",   code: "DE", x: 48, y: 25, status: "optimal",  count: 11, waitDays: 5 },
  { name: "Thailand",  code: "TH", x: 74, y: 41, status: "optimal",  count: 28, waitDays: 1 },
];

const STATUS_CFG: Record<string, { badge: string; label: string; icon: React.ElementType }> = {
  VERIFIED:      { badge: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Verified",      icon: CheckCircle },
  APPROVED:      { badge: "bg-blue-50 text-blue-700 border-blue-100",          label: "Approved",      icon: CheckCircle },
  PENDING:       { badge: "bg-amber-50 text-amber-700 border-amber-100",       label: "Pending",       icon: Clock },
  CLARIFICATION: { badge: "bg-red-50 text-red-700 border-red-100",             label: "Clarification", icon: AlertCircle },
  REJECTED:      { badge: "bg-slate-100 text-slate-600 border-slate-200",      label: "Rejected",      icon: XCircle },
};

const AI_COLOR: Record<string, { bar: string; text: string }> = {
  green: { bar: "bg-emerald-500", text: "text-emerald-600" },
  amber: { bar: "bg-amber-500",   text: "text-amber-600"  },
  red:   { bar: "bg-red-500",     text: "text-red-600"    },
};

const SIDE_SECTIONS = [
  { id: "queue",       label: "Active Queue",    icon: Inbox,    count: 7 },
  { id: "priority",    label: "Priority Cases",  icon: AlertCircle, count: 3 },
  { id: "archived",    label: "Archived",        icon: Archive,  count: null },
  { id: "policy",      label: "Global Policy",   icon: Globe,    count: null },
  { id: "performance", label: "Agent Performance",icon: BarChart2,count: null },
  { id: "settings",    label: "Settings",        icon: Settings, count: null },
];

const TOP_TABS = ["Dashboard", "Applications", "Compliance", "Analytics"] as const;
type TopTab = typeof TOP_TABS[number];

// ── Helper components ──────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, subColor }: { label: string; value: string; sub: string; subColor?: string }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <div className="text-xs text-slate-400 uppercase font-semibold tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-extrabold text-[#1B2E5E]">{value}</div>
      <div className={`text-xs mt-1.5 font-semibold ${subColor || "text-emerald-600"}`}>{sub}</div>
    </div>
  );
}

function AnalysisCheck({ label, value, status }: { label: string; value: string; status: "pass" | "warn" | "fail" }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          status === "pass" ? "bg-emerald-400" : status === "warn" ? "bg-amber-400" : "bg-red-400"
        }`}>
          {status === "pass" ? <Check size={9} className="text-white" /> : <AlertCircle size={9} className="text-white" />}
        </div>
        <span className="text-sm text-white/80">{label}</span>
      </div>
      <span className={`text-xs font-bold ${
        status === "pass" ? "text-emerald-300" : status === "warn" ? "text-amber-300" : "text-red-300"
      }`}>{value}</span>
    </div>
  );
}

// ── Application Detail Modal ───────────────────────────────────────────────────
function AppDetailModal({ app, onClose }: { app: VisaApplication; onClose: () => void }) {
  const [activeDocTab, setActiveDocTab] = useState<"checklist" | "notes">("checklist");

  const docChecklist = [
    { item: "Valid passport (6+ months)",  done: true },
    { item: "Passport-size photographs",   done: true },
    { item: "Travel itinerary",            done: true },
    { item: "Hotel booking confirmations", done: true },
    { item: "Bank statements (3 months)",  done: app.docScore >= 80 },
    { item: "Travel insurance",            done: app.docScore >= 90 },
    { item: "Proof of employment/income",  done: app.docScore >= 85 },
    { item: "Return flight tickets",       done: app.status !== "CLARIFICATION" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">{app.flag}</span>
              <h2 className="text-lg font-extrabold text-[#1B2E5E]">{app.traveler}</h2>
              <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${STATUS_CFG[app.status].badge}`}>
                {STATUS_CFG[app.status].label}
              </span>
            </div>
            <p className="text-sm text-slate-400">{app.destination} · {app.visaType} · Ref: {app.ref}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-5">
          {/* Left */}
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
              {[
                { label: "Travel Date",    value: app.travelDate },
                { label: "Submitted",      value: app.submittedDate },
                { label: "Passport Exp",   value: app.passportExpiry },
                { label: "Priority",       value: app.priority },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-slate-400">{row.label}</span>
                  <span className="font-semibold text-slate-700">{row.value}</span>
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">AI Doc Score</span>
                <span className={`text-sm font-extrabold ${AI_COLOR[app.aiVerification.color].text}`}>
                  {app.docScore}%
                </span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${AI_COLOR[app.aiVerification.color].bar}`}
                  style={{ width: `${app.docScore}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{app.aiVerification.sub}</p>
            </div>
          </div>

          {/* Right: doc checklist */}
          <div>
            <div className="flex gap-2 mb-3">
              {(["checklist", "notes"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveDocTab(t)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeDocTab === t ? "bg-[#1B2E5E] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {t === "checklist" ? "Document Checklist" : "Notes"}
                </button>
              ))}
            </div>
            {activeDocTab === "checklist" ? (
              <div className="space-y-2">
                {docChecklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.done ? "bg-emerald-100" : "bg-slate-100"
                    }`}>
                      {item.done
                        ? <Check size={11} className="text-emerald-600" />
                        : <Clock size={11} className="text-slate-400" />
                      }
                    </div>
                    <span className={`text-sm ${item.done ? "text-slate-600" : "text-slate-400"}`}>{item.item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30"
                rows={8}
                defaultValue={`${app.traveler}: ${app.visaType} for ${app.destination}.\n\nTravel dates: ${app.travelDate}\nFollow up on missing documents if clarification required.`}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-6 pb-6">
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#1B2E5E] text-white rounded-xl text-sm font-semibold hover:bg-[#1B2E5E]/90 transition-colors">
            <Send size={13} /> Trigger Embassy Push
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors">
            <FileText size={13} /> Request Documents
          </button>
          <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
            <Download size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Compliance Heatmap ─────────────────────────────────────────────────────────
function ComplianceHeatmap() {
  const [hoveredCountry, setHoveredCountry] = useState<typeof HEATMAP_COUNTRIES[0] | null>(null);

  return (
    <div className="bg-[#1B2E5E]/5 rounded-2xl border border-[#1B2E5E]/10 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1B2E5E]/10">
        <div>
          <h3 className="text-sm font-bold text-[#1B2E5E]">Global Compliance Heatmap</h3>
          <p className="text-xs text-slate-400 mt-0.5">Real-time Approval & Processing Efficiency</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-slate-500">Optimal</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-400" /><span className="text-slate-500">Delayed</span></div>
        </div>
      </div>
      <div className="relative p-4" style={{ height: 220 }}>
        {/* World map SVG silhouette (simplified) */}
        <div className="absolute inset-4 rounded-xl bg-slate-900/5 border border-slate-200/50" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(20,184,166,0.03) 0%, transparent 70%)' }}>
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <div key={y} className="absolute w-full border-t border-slate-200/30" style={{ top: `${y}%` }} />
          ))}
          {[20, 40, 60, 80].map(x => (
            <div key={x} className="absolute h-full border-l border-slate-200/30" style={{ left: `${x}%` }} />
          ))}
        </div>

        {/* Country dots */}
        {HEATMAP_COUNTRIES.map((country) => (
          <div
            key={country.code}
            className="absolute z-10"
            style={{ left: `${country.x}%`, top: `${country.y}%`, transform: 'translate(-50%,-50%)' }}
            onMouseEnter={() => setHoveredCountry(country)}
            onMouseLeave={() => setHoveredCountry(null)}
          >
            <div className={`relative group cursor-pointer`}>
              <div className={`w-4 h-4 rounded-full border-2 border-white shadow ${
                country.status === "optimal" ? "bg-blue-500" : "bg-red-400"
              } ${country.status === "delayed" ? "animate-pulse" : ""}`} />
              <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-slate-900 text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow">
                {country.name} · {country.waitDays}d wait
              </div>
            </div>
          </div>
        ))}

        {/* Count labels for active dots */}
        {HEATMAP_COUNTRIES.filter(c => c.count > 5).map((country) => (
          <div
            key={`label-${country.code}`}
            className="absolute z-10 pointer-events-none"
            style={{ left: `calc(${country.x}% + 10px)`, top: `calc(${country.y}% - 6px)` }}
          >
            <span className="text-[9px] font-bold text-slate-500">{country.count}</span>
          </div>
        ))}
      </div>

      {/* Country table */}
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {HEATMAP_COUNTRIES.slice(0, 5).map((c) => (
            <div key={c.code} className="bg-white rounded-xl p-2.5 text-center border border-slate-100">
              <div className="text-[10px] text-slate-400 font-semibold">{c.name}</div>
              <div className={`text-base font-extrabold mt-0.5 ${c.status === "optimal" ? "text-blue-600" : "text-red-500"}`}>{c.waitDays}d</div>
              <div className="text-[9px] text-slate-400">{c.count} apps</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Analytics Tab ──────────────────────────────────────────────────────────────
function AnalyticsView() {
  const statusBreakdown = [
    { label: "Approved",      count: 42, pct: 54, color: "bg-emerald-500" },
    { label: "Pending",       count: 18, pct: 23, color: "bg-amber-500"   },
    { label: "Clarification", count: 9,  pct: 12, color: "bg-red-500"     },
    { label: "Rejected",      count: 8,  pct: 10, color: "bg-slate-400"   },
  ];
  const topDestinations = [
    { dest: "UAE",       flag: "🇦🇪", count: 21, trend: "+12%" },
    { dest: "Thailand",  flag: "🇹🇭", count: 18, trend: "+8%"  },
    { dest: "Italy",     flag: "🇮🇹", count: 12, trend: "+3%"  },
    { dest: "Germany",   flag: "🇩🇪", count: 11, trend: "+6%"  },
    { dest: "Japan",     flag: "🇯🇵", count: 8,  trend: "+15%" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#1B2E5E] mb-4">Status Breakdown — This Month</h3>
        <div className="space-y-3">
          {statusBreakdown.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-24">{row.label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-700 w-8 text-right">{row.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#1B2E5E] mb-4">Top Destinations</h3>
        <div className="space-y-2.5">
          {topDestinations.map((row) => (
            <div key={row.dest} className="flex items-center gap-3 py-1">
              <span className="text-xl">{row.flag}</span>
              <span className="flex-1 text-sm font-semibold text-slate-700">{row.dest}</span>
              <span className="text-sm text-slate-400">{row.count} apps</span>
              <span className="text-xs font-bold text-emerald-600 w-10 text-right">{row.trend}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-[#1B2E5E] mb-4">Processing Time Trend (days)</h3>
        <div className="flex items-end gap-1.5 h-24">
          {[8,6,9,5,4,7,4,3,5,4,3,4].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-sm bg-gradient-to-t from-[#1B2E5E] to-[#14B8A6] opacity-80"
                style={{ height: `${(h / 10) * 100}%` }}
              />
              {i % 3 === 0 && <span className="text-[9px] text-slate-400">W{Math.floor(i/3)+1}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#1B2E5E] rounded-2xl p-5 text-white">
        <h3 className="text-sm font-bold text-white/80 mb-3">AI Performance</h3>
        <div className="space-y-3">
          {[
            { label: "Document Accuracy",  value: "99.9%", color: "text-emerald-300" },
            { label: "False Reject Rate",   value: "0.1%",  color: "text-emerald-300" },
            { label: "Avg Verification",    value: "4.2h",  color: "text-teal-300"   },
            { label: "Daily Throughput",    value: "1,240", color: "text-blue-300"   },
            { label: "Global Stability",    value: "98.4%", color: "text-emerald-300" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center">
              <span className="text-sm text-white/60">{row.label}</span>
              <span className={`text-sm font-extrabold ${row.color}`}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Seed checklist for fallback ────────────────────────────────────────────────
const SEED_REQUIREMENTS: Record<string, string[]> = {
  default: [
    "Valid passport (minimum 6 months validity beyond travel date)",
    "Completed visa application form",
    "Passport-size photographs (2, white background)",
    "Proof of travel itinerary (flights + hotel bookings)",
    "Travel insurance with minimum USD 30,000 cover",
    "Bank statements from last 3 months",
    "Proof of employment / income (salary slips or ITR)",
    "No-objection certificate (if employed)",
    "Return flight tickets",
  ],
};

// ── Visa Requirements Checker ──────────────────────────────────────────────────
const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia",
  "Germany", "France", "Italy", "Spain", "Japan", "UAE", "Singapore",
  "Thailand", "Maldives", "Bali (Indonesia)", "Sri Lanka", "Nepal",
  "New Zealand", "South Africa", "Brazil",
];

function VisaRequirementsChecker() {
  const [origin, setOrigin]           = useState("");
  const [destination, setDestination] = useState("");
  const [loading, setLoading]         = useState(false);
  const [checklist, setChecklist]     = useState<string[] | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [isLive, setIsLive]           = useState(false);

  const fetchRequirements = useCallback(async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    setChecklist(null);
    setIsLive(false);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("nama_token") : null;
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ origin, destination });
      const res = await fetch(`/api/v1/visa/requirements?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        // Expect { checklist: string[] } or { requirements: string[] }
        const list = data.checklist || data.requirements || data.items || null;
        if (Array.isArray(list) && list.length > 0) {
          setChecklist(list);
          setIsLive(true);
          return;
        }
      }
    } catch {
      // Fall through to seed
    }
    // Fallback to seed
    setChecklist(SEED_REQUIREMENTS.default);
    setError("Using estimated checklist — connect Visa API for live data.");
    setLoading(false);
  }, [origin, destination]);

  useEffect(() => {
    // Reset when countries change
    setChecklist(null);
    setError(null);
    setIsLive(false);
  }, [origin, destination]);

  useEffect(() => {
    if (checklist !== null) setLoading(false);
  }, [checklist]);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-[#1B2E5E]/10 rounded-xl flex items-center justify-center">
          <Stamp size={15} className="text-[#1B2E5E]" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[#1B2E5E]">Visa Requirements Checker</h3>
          <p className="text-xs text-slate-400">Select origin + destination to generate a document checklist</p>
        </div>
        {isLive && (
          <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Live
          </span>
        )}
      </div>

      {/* Country selectors */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Origin Country</label>
          <select
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 text-slate-700"
          >
            <option value="">Select country…</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="hidden sm:flex items-center text-slate-300 mt-5">→</div>
        <div className="flex-1 w-full">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Destination Country</label>
          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 text-slate-700"
          >
            <option value="">Select country…</option>
            {COUNTRIES.filter(c => c !== origin).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button
          onClick={fetchRequirements}
          disabled={!origin || !destination || loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#1B2E5E] text-white rounded-xl text-sm font-semibold hover:bg-[#1B2E5E]/90 transition-colors disabled:opacity-50 mt-5 sm:mt-0 whitespace-nowrap self-end"
        >
          {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
          {loading ? "Checking…" : "Get Checklist"}
        </button>
      </div>

      {/* Error/notice */}
      {error && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl mb-3">
          <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Checklist result */}
      {checklist && (
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
          <p className="text-xs font-extrabold text-[#1B2E5E] uppercase tracking-wider mb-3">
            Documents Required — {origin || "Origin"} → {destination || "Destination"}
          </p>
          <div className="space-y-2">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#1B2E5E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check size={10} className="text-[#1B2E5E]" />
                </div>
                <span className="text-sm text-slate-600">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!checklist && !loading && origin && destination && (
        <p className="text-xs text-slate-400 text-center py-3">
          Click "Get Checklist" to load requirements for {origin} → {destination}
        </p>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function VisasPage() {
  const [activeSection, setActiveSection] = useState("queue");
  const [activeTopTab, setActiveTopTab]   = useState<TopTab>("Dashboard");
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState("ALL");
  const [selectedApp, setSelectedApp]     = useState<VisaApplication | null>(null);
  const [aiVisionMode, setAiVisionMode]   = useState(true);
  const [analysisApp, setAnalysisApp]     = useState<VisaApplication>(APPLICATIONS[0]);

  const filtered = useMemo(() => {
    const section = activeSection === "priority"
      ? APPLICATIONS.filter(a => a.priority === "HIGH")
      : activeSection === "archived"
      ? APPLICATIONS.filter(a => a.status === "APPROVED" || a.status === "REJECTED")
      : APPLICATIONS;

    return section.filter(a => {
      const matchStatus = statusFilter === "ALL" || a.status === statusFilter;
      const matchSearch = !search || a.traveler.toLowerCase().includes(search.toLowerCase()) ||
        a.destination.toLowerCase().includes(search.toLowerCase()) ||
        a.visaType.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [search, statusFilter, activeSection]);

  const pendingCount     = APPLICATIONS.filter(a => a.status === "PENDING").length;
  const approvedCount    = APPLICATIONS.filter(a => a.status === "APPROVED" || a.status === "VERIFIED").length;
  const clarificationCount = APPLICATIONS.filter(a => a.status === "CLARIFICATION").length;

  return (
    <div className="flex h-[calc(100vh-64px)] -m-4 sm:-m-6 overflow-hidden bg-[#F8FAFC]">
      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      <div className="w-52 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Agent badge */}
        <div className="px-4 py-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1B2E5E] flex items-center justify-center">
              <Stamp size={15} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-[#1B2E5E]">Visa Specialist</div>
              <div className="text-[10px] text-slate-400">Global Operations</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {SIDE_SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all ${
                activeSection === sec.id
                  ? "bg-[#1B2E5E]/5 text-[#1B2E5E] font-bold border-r-2 border-[#1B2E5E]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <sec.icon size={14} className={activeSection === sec.id ? "text-[#1B2E5E]" : "text-slate-400"} />
              <span className="flex-1 text-left text-xs">{sec.label}</span>
              {sec.count !== null && (
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  activeSection === sec.id ? "bg-[#1B2E5E] text-white" : "bg-slate-100 text-slate-500"
                }`}>{sec.count}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Emergency */}
        <div className="p-4 border-t border-slate-100">
          <button className="w-full py-2.5 bg-red-600 text-white rounded-xl text-xs font-extrabold hover:bg-red-700 transition-colors">
            EMERGENCY SUPPORT
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top tab bar */}
        <div className="bg-white border-b border-slate-100 px-6 flex items-center gap-0">
          {TOP_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTopTab(tab)}
              className={`px-5 py-3.5 text-sm font-semibold border-b-2 transition-all ${
                activeTopTab === tab
                  ? "border-[#1B2E5E] text-[#1B2E5E]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {tab}
            </button>
          ))}
          <div className="ml-auto pr-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1B2E5E] text-white rounded-xl text-sm font-semibold hover:bg-[#1B2E5E]/90 transition-colors">
              <Plus size={14} /> New Case
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTopTab === "Analytics" ? (
            <AnalyticsView />
          ) : (
            <>
              {/* Unit badge */}
              <div>
                <div className="text-xs font-bold text-[#14B8A6] uppercase tracking-widest mb-1">SYSTEM ENVIRONMENT</div>
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-extrabold text-[#1B2E5E]">
                    Visa Specialist Intelligence Hub{" "}
                    <span className="text-[#14B8A6]">Unit 04-SIGMA</span>
                  </h1>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Active — Global Compliance Mode
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Clock size={11} />
                      {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })} GMT+0
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg">
                      <Globe size={11} />
                      24 REGIONS ACTIVE
                    </div>
                  </div>
                </div>
              </div>

              {/* Visa Requirements Checker */}
              {activeTopTab === "Dashboard" && <VisaRequirementsChecker />}

              {/* KPI strip */}
              <div className="grid grid-cols-3 gap-4">
                <KpiCard
                  label="Avg. Approval Time"
                  value="4.2 Hours"
                  sub="▼ Reduced 72%"
                  subColor="text-emerald-600"
                />
                <KpiCard
                  label="Application Accuracy"
                  value="99.9%"
                  sub="✦ AI Optimized"
                  subColor="text-[#14B8A6]"
                />
                <KpiCard
                  label="Daily Throughput"
                  value="1,240"
                  sub="Applications processed today"
                  subColor="text-slate-500"
                />
              </div>

              {/* Application Queue */}
              <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
                  <h2 className="text-sm font-extrabold text-[#1B2E5E]">Active Application Queue</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search applicant or destination…"
                        className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 w-48"
                      />
                    </div>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/30 text-slate-600"
                    >
                      <option value="ALL">All Status</option>
                      <option value="VERIFIED">Verified</option>
                      <option value="PENDING">Pending</option>
                      <option value="CLARIFICATION">Clarification</option>
                      <option value="APPROVED">Approved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-50">
                      <th className="text-left px-5 py-2.5 font-semibold">Traveler</th>
                      <th className="text-left px-5 py-2.5 font-semibold">Destination</th>
                      <th className="text-left px-5 py-2.5 font-semibold">Visa Type</th>
                      <th className="text-left px-5 py-2.5 font-semibold">AI Verification</th>
                      <th className="text-left px-5 py-2.5 font-semibold">Travel Date</th>
                      <th className="text-left px-5 py-2.5 font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((app) => {
                      const aiCol = AI_COLOR[app.aiVerification.color];
                      return (
                        <tr
                          key={app.id}
                          className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors cursor-pointer"
                          onClick={() => { setAnalysisApp(app); setSelectedApp(null); }}
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#1B2E5E]/10 flex items-center justify-center text-[#1B2E5E] text-xs font-black flex-shrink-0">
                                {app.initials}
                              </div>
                              <div>
                                <div className="font-semibold text-slate-800">{app.traveler}</div>
                                <div className="text-[10px] text-slate-400">ID: #{app.ref}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{app.flag}</span>
                              <span className="font-medium text-slate-700">{app.destination}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                              {app.visaType}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                app.aiVerification.color === "green" ? "bg-emerald-500" :
                                app.aiVerification.color === "amber" ? "bg-amber-500" : "bg-red-500"
                              }`} />
                              <div>
                                <div className={`text-xs font-semibold ${aiCol.text}`}>{app.aiVerification.label} {app.docScore > 0 ? `${app.docScore}%` : ""}</div>
                                <div className="text-[10px] text-slate-400">{app.aiVerification.sub}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-sm text-slate-500">{app.travelDate}</td>
                          <td className="px-5 py-3.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                              className="text-xs font-extrabold text-[#14B8A6] hover:text-[#0d9488] uppercase tracking-wider"
                            >
                              ANALYZE
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-5 py-10 text-center text-sm text-slate-400">
                          No applications match your search.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Action row */}
                <div className="flex items-center gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1B2E5E] text-white rounded-xl text-xs font-bold hover:bg-[#1B2E5E]/90 transition-colors">
                    <Send size={12} /> Trigger Embassy Push
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
                    <FileText size={12} /> Request Missing Documents
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[#1B2E5E] text-white rounded-xl text-xs font-bold hover:bg-[#1B2E5E]/90 transition-colors">
                    <Check size={12} /> Finalize Application
                  </button>
                </div>
              </div>

              {/* Compliance heatmap */}
              <ComplianceHeatmap />
            </>
          )}
        </div>
      </div>

      {/* ── Right panel: AI Real-time Analysis ────────────────────────────── */}
      <div className="w-72 flex-shrink-0 bg-[#0F1B35] border-l border-white/5 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-extrabold text-white">AI Real-time Analysis</span>
            <button
              onClick={() => setAiVisionMode(!aiVisionMode)}
              className={`text-[10px] font-black uppercase px-2 py-1 rounded border transition-all ${
                aiVisionMode ? "bg-blue-500/20 border-blue-500/30 text-blue-300" : "bg-white/5 border-white/10 text-white/50"
              }`}
            >
              VISION MODE
            </button>
          </div>
        </div>

        {/* Passport mock analysis */}
        <div className="p-4">
          <div className="relative rounded-xl overflow-hidden bg-[#1a2d50] border border-white/10 aspect-[3/2]">
            {/* Passport image placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">🛂</div>
                <div className="text-white/50 text-xs font-mono">PASSPORT SCAN</div>
              </div>
            </div>
            {/* Scanning overlay */}
            {aiVisionMode && (
              <>
                <div className="absolute inset-x-4 top-6 h-5 border-2 border-[#14B8A6]/60 rounded bg-[#14B8A6]/5 flex items-center px-2">
                  <span className="text-[9px] font-bold text-[#14B8A6] uppercase tracking-widest">Surname Match</span>
                </div>
                <div className="absolute inset-x-4 bottom-8 h-5 border-2 border-amber-400/60 rounded bg-amber-400/5 flex items-center px-2">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Passport Number</span>
                </div>
                {/* Scan line animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-[#14B8A6] to-transparent opacity-60 animate-scan" />
              </>
            )}
            {/* Score overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
              <span className="text-[10px] text-white/60 uppercase font-semibold">Extraction Confidence</span>
              <span className="text-xs font-extrabold text-[#14B8A6]">{analysisApp.docScore > 0 ? `${analysisApp.docScore}%` : "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Verification checks */}
        <div className="px-4 pb-2">
          <AnalysisCheck label="Name Match"       value="100%"  status="pass" />
          <AnalysisCheck label="Expiry Date Check" value="PASS" status="pass" />
          <AnalysisCheck label="Face Similarity"   value={`${analysisApp.docScore > 0 ? Math.min(99.8, analysisApp.docScore * 0.95).toFixed(1) : "N/A"}%`}
            status={analysisApp.docScore >= 90 ? "pass" : analysisApp.docScore >= 60 ? "warn" : "fail"} />
          <AnalysisCheck label="Document Integrity" value={analysisApp.status === "CLARIFICATION" ? "REVIEW" : "PASS"}
            status={analysisApp.status === "CLARIFICATION" ? "warn" : "pass"} />
        </div>

        {/* Applicant selector */}
        <div className="px-4 py-3 border-t border-white/10">
          <div className="text-[10px] font-bold text-white/40 uppercase mb-2">Analyzing</div>
          <div className="space-y-1">
            {APPLICATIONS.slice(0, 4).map((app) => (
              <button
                key={app.id}
                onClick={() => setAnalysisApp(app)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  analysisApp.id === app.id ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                <div className="w-5 h-5 rounded-full bg-[#14B8A6]/20 flex items-center justify-center text-[9px] font-black text-[#14B8A6] flex-shrink-0">
                  {app.initials}
                </div>
                <span className="text-xs font-semibold truncate">{app.traveler}</span>
                <span className="ml-auto text-[9px]">{app.flag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Policy Pulse */}
        <div className="mx-4 mb-4 bg-white/5 border border-white/10 rounded-2xl p-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Radar size={14} className="text-[#14B8A6]" />
            <span className="text-sm font-extrabold text-white">Policy Pulse</span>
          </div>
          <p className="text-xs text-white/60 leading-relaxed mb-3">
            AI has detected a temporary processing shift in the Schengen Zone. Automated buffer adjustments are active to maintain the 4.2h approval average.
          </p>
          <div className="border-t border-white/10 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-white/40 uppercase font-semibold">Global Stability</span>
              <span className="text-xs font-extrabold text-emerald-400">98.4%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#14B8A6] to-emerald-400 rounded-full" style={{ width: "98.4%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── App detail modal ───────────────────────────────────────────────── */}
      {selectedApp && <AppDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} />}

      {/* Scan line animation style */}
      <style jsx>{`
        @keyframes scan {
          0% { top: 10%; }
          100% { top: 90%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
          position: absolute;
        }
      `}</style>
    </div>
  );
}
