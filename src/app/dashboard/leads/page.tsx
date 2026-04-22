"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  Flame,
  Mail,
  Phone,
  ChevronRight,
  X,
  MessageCircle,
  LayoutList,
  Columns,
  TrendingDown,
  ArrowRight,
} from "lucide-react";
import { leadsApi, Lead } from "@/lib/api";
import DynamixHandoffBanner from "@/components/dynamix-handoff-banner";

// ── Extended seed type ──────────────────────────────────────────────────────
interface SeedLead extends Lead {
  temperature: "HOT" | "WARM" | "COLD";
  ai_score: number;
  ai_reasoning: string;
  travel_date: string;
  destination_flag: string;
  notes: { text: string; created_at: string }[];
  activity: { label: string; created_at: string }[];
}

const SEED_LEADS: SeedLead[] = [
  {
    id: 1, tenant_id: 1, sender_id: "s1", source: "WEBSITE",
    full_name: "Priya Mehta", email: "priya.mehta@gmail.com", phone: "+91 98765 43210",
    destination: "Bali", destination_flag: "🇮🇩", budget_per_person: 185000,
    currency: "INR", travelers_count: 2, duration_days: 7,
    travel_style: "luxury", status: "PROPOSAL_SENT", priority: 1,
    triage_confidence: 0.92, temperature: "HOT", ai_score: 92,
    ai_reasoning: "High budget, short travel date window, repeated engagement — strong buying intent.",
    travel_date: "2026-05-15",
    created_at: "2026-04-10T09:00:00Z",
    notes: [{ text: "Wants private villa with pool.", created_at: "2026-04-11T10:00:00Z" }],
    activity: [
      { label: "Status changed to PROPOSAL_SENT", created_at: "2026-04-14T08:00:00Z" },
      { label: "Lead created", created_at: "2026-04-10T09:00:00Z" },
    ],
  },
  {
    id: 2, tenant_id: 1, sender_id: "s2", source: "WHATSAPP",
    full_name: "Arjun Kapoor", email: "arjun.kapoor@outlook.com", phone: "+91 97654 32109",
    destination: "Maldives", destination_flag: "🇲🇻", budget_per_person: 420000,
    currency: "INR", travelers_count: 2, duration_days: 6,
    travel_style: "luxury", status: "QUALIFIED", priority: 1,
    triage_confidence: 0.88, temperature: "HOT", ai_score: 88,
    ai_reasoning: "Premium budget for Maldives overwater villa. Fast responses. High closure probability.",
    travel_date: "2026-06-01",
    created_at: "2026-04-11T11:00:00Z",
    notes: [{ text: "Interested in Soneva Fushi or Gili Lankanfushi.", created_at: "2026-04-12T09:00:00Z" }],
    activity: [
      { label: "Status changed to QUALIFIED", created_at: "2026-04-13T10:00:00Z" },
      { label: "Lead created", created_at: "2026-04-11T11:00:00Z" },
    ],
  },
  {
    id: 3, tenant_id: 1, sender_id: "s3", source: "EMAIL",
    full_name: "Deepika Singh", email: "deepika.singh@yahoo.co.in", phone: "+91 96543 21098",
    destination: "Dubai", destination_flag: "🇦🇪", budget_per_person: 95000,
    currency: "INR", travelers_count: 4, duration_days: 5,
    travel_style: "family", status: "CONTACTED", priority: 2,
    triage_confidence: 0.67, temperature: "WARM", ai_score: 67,
    ai_reasoning: "Family trip with reasonable budget. Currently comparing options — follow up needed.",
    travel_date: "2026-07-10",
    created_at: "2026-04-12T08:30:00Z",
    notes: [],
    activity: [
      { label: "Status changed to CONTACTED", created_at: "2026-04-13T12:00:00Z" },
      { label: "Lead created", created_at: "2026-04-12T08:30:00Z" },
    ],
  },
  {
    id: 4, tenant_id: 1, sender_id: "s4", source: "REFERRAL",
    full_name: "Rohan Sharma", email: "rohan.sharma@protonmail.com", phone: "+91 95432 10987",
    destination: "Thailand", destination_flag: "🇹🇭", budget_per_person: 125000,
    currency: "INR", travelers_count: 3, duration_days: 8,
    travel_style: "adventure", status: "NEW", priority: 2,
    triage_confidence: 0.55, temperature: "WARM", ai_score: 55,
    ai_reasoning: "Warm referral lead. Budget aligns with itinerary. Needs first contact.",
    travel_date: "2026-08-05",
    created_at: "2026-04-13T14:00:00Z",
    notes: [],
    activity: [{ label: "Lead created", created_at: "2026-04-13T14:00:00Z" }],
  },
  {
    id: 5, tenant_id: 1, sender_id: "s5", source: "WEBSITE",
    full_name: "Anjali Patel", email: "anjali.patel@gmail.com", phone: "+91 94321 09876",
    destination: "Rajasthan", destination_flag: "🇮🇳", budget_per_person: 68000,
    currency: "INR", travelers_count: 5, duration_days: 6,
    travel_style: "cultural", status: "NEW", priority: 3,
    triage_confidence: 0.32, temperature: "COLD", ai_score: 32,
    ai_reasoning: "Low budget per person for large group. Low urgency signals. Nurture phase.",
    travel_date: "2026-10-15",
    created_at: "2026-04-14T10:00:00Z",
    notes: [],
    activity: [{ label: "Lead created", created_at: "2026-04-14T10:00:00Z" }],
  },
  {
    id: 6, tenant_id: 1, sender_id: "s6", source: "WHATSAPP",
    full_name: "Karan Verma", email: "karan.verma@icloud.com", phone: "+91 93210 98765",
    destination: "Sri Lanka", destination_flag: "🇱🇰", budget_per_person: 210000,
    currency: "INR", travelers_count: 2, duration_days: 9,
    travel_style: "honeymoon", status: "WON", priority: 1,
    triage_confidence: 0.95, temperature: "HOT", ai_score: 95,
    ai_reasoning: "Confirmed booking. Honeymoon package fully paid. Highest score in pipeline.",
    travel_date: "2026-05-20",
    created_at: "2026-04-05T09:00:00Z",
    notes: [{ text: "Booked Amanwella + Jetwing Lighthouse combo.", created_at: "2026-04-08T10:00:00Z" }],
    activity: [
      { label: "Status changed to WON", created_at: "2026-04-16T09:00:00Z" },
      { label: "Status changed to PROPOSAL_SENT", created_at: "2026-04-10T09:00:00Z" },
      { label: "Lead created", created_at: "2026-04-05T09:00:00Z" },
    ],
  },
  {
    id: 7, tenant_id: 1, sender_id: "s7", source: "EMAIL",
    full_name: "Sneha Nair", email: "sneha.nair@gmail.com", phone: "+91 92109 87654",
    destination: "Goa", destination_flag: "🇮🇳", budget_per_person: 45000,
    currency: "INR", travelers_count: 6, duration_days: 4,
    travel_style: "leisure", status: "LOST", priority: 3,
    triage_confidence: 0.20, temperature: "COLD", ai_score: 20,
    ai_reasoning: "Very low budget. Non-responsive after two follow-ups. Marked lost.",
    travel_date: "2026-09-01",
    created_at: "2026-04-01T10:00:00Z",
    notes: [],
    activity: [
      { label: "Status changed to LOST", created_at: "2026-04-12T10:00:00Z" },
      { label: "Lead created", created_at: "2026-04-01T10:00:00Z" },
    ],
  },
  {
    id: 8, tenant_id: 1, sender_id: "s8", source: "REFERRAL",
    full_name: "Vikram Rao", email: "vikram.rao@corporateemail.com", phone: "+91 91098 76543",
    destination: "Europe", destination_flag: "🇪🇺", budget_per_person: 650000,
    currency: "INR", travelers_count: 2, duration_days: 14,
    travel_style: "luxury", status: "PROPOSAL_SENT", priority: 1,
    triage_confidence: 0.85, temperature: "HOT", ai_score: 85,
    ai_reasoning: "Highest-value lead. 14-day Europe tour. Corporate referral. Decision expected this week.",
    travel_date: "2026-06-20",
    created_at: "2026-04-08T08:00:00Z",
    notes: [{ text: "Wants private transfers throughout. No budget compromises.", created_at: "2026-04-09T11:00:00Z" }],
    activity: [
      { label: "Status changed to PROPOSAL_SENT", created_at: "2026-04-15T08:00:00Z" },
      { label: "Status changed to QUALIFIED", created_at: "2026-04-11T08:00:00Z" },
      { label: "Lead created", created_at: "2026-04-08T08:00:00Z" },
    ],
  },
  {
    id: 9, tenant_id: 1, sender_id: "s9", source: "WEBSITE",
    full_name: "Meera Joshi", email: "meera.joshi@hotmail.com", phone: "+91 90987 65432",
    destination: "Himachal", destination_flag: "🇮🇳", budget_per_person: 78000,
    currency: "INR", travelers_count: 4, duration_days: 7,
    travel_style: "adventure", status: "CONTACTED", priority: 2,
    triage_confidence: 0.60, temperature: "WARM", ai_score: 60,
    ai_reasoning: "Mid-range family adventure trip. Engaged but still researching. Good conversion odds.",
    travel_date: "2026-07-25",
    created_at: "2026-04-14T13:00:00Z",
    notes: [],
    activity: [
      { label: "Status changed to CONTACTED", created_at: "2026-04-16T10:00:00Z" },
      { label: "Lead created", created_at: "2026-04-14T13:00:00Z" },
    ],
  },
  {
    id: 10, tenant_id: 1, sender_id: "s10", source: "WHATSAPP",
    full_name: "Rahul Gupta", email: "rahul.gupta@gmail.com", phone: "+91 89876 54321",
    destination: "Kenya Safari", destination_flag: "🇰🇪", budget_per_person: 380000,
    currency: "INR", travelers_count: 2, duration_days: 10,
    travel_style: "adventure", status: "QUALIFIED", priority: 2,
    triage_confidence: 0.72, temperature: "WARM", ai_score: 72,
    ai_reasoning: "Premium safari budget. Genuine interest. Needs detailed itinerary to convert.",
    travel_date: "2026-09-10",
    created_at: "2026-04-15T09:00:00Z",
    notes: [{ text: "Interested in Maasai Mara + Amboseli combo.", created_at: "2026-04-16T09:00:00Z" }],
    activity: [
      { label: "Status changed to QUALIFIED", created_at: "2026-04-17T09:00:00Z" },
      { label: "Lead created", created_at: "2026-04-15T09:00:00Z" },
    ],
  },
];

const STATUS_OPTIONS = ["ALL", "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"];
const TEMP_OPTIONS = ["ALL", "HOT", "WARM", "COLD"];
const KANBAN_COLS = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON"];

function fmt(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(name: string) {
  const colors = [
    "bg-teal-500", "bg-indigo-500", "bg-pink-500",
    "bg-amber-500", "bg-purple-500", "bg-rose-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    NEW: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    CONTACTED: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
    QUALIFIED: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    PROPOSAL_SENT: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    WON: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    LOST: "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-slate-100 text-slate-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function TempBadge({ temp }: { temp: string }) {
  if (temp === "HOT")
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
        <Flame size={11} />HOT
      </span>
    );
  if (temp === "WARM") return <span className="text-xs font-semibold text-amber-500">WARM</span>;
  return <span className="text-xs font-semibold text-sky-400">COLD</span>;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#14B8A6]"
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{score}</span>
    </div>
  );
}

// ── Slide-over ───────────────────────────────────────────────────────────────
function LeadSlideOver({
  lead,
  onClose,
}: {
  lead: SeedLead;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "notes" | "activity">("overview");
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState(lead.notes);

  function addNote() {
    if (!noteText.trim()) return;
    setNotes((prev) => [
      { text: noteText.trim(), created_at: new Date().toISOString() },
      ...prev,
    ]);
    setNoteText("");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[420px] max-w-full h-full bg-white dark:bg-[#0F1B35] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColor(lead.full_name ?? "")}`}
            >
              {initials(lead.full_name ?? "?")}
            </div>
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{lead.full_name}</p>
              <p className="text-xs text-slate-400">{lead.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X size={16} className="text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 px-5 py-3 border-b border-slate-100 dark:border-white/5">
          <a
            href={`https://wa.me/${(lead.phone ?? "").replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
          >
            <MessageCircle size={13} />WhatsApp
          </a>
          <a
            href={`mailto:${lead.email}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium transition-colors"
          >
            <Mail size={13} />Email
          </a>
          <a
            href={`tel:${lead.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-medium transition-colors"
          >
            <Phone size={13} />Call
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(["overview", "notes", "activity"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                tab === t
                  ? "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {tab === "overview" && (
            <>
              {/* AI Score */}
              <div className="rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-[#1B2E5E]/20 p-4">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  AI Score
                </p>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#14B8A6]"
                      style={{ width: `${lead.ai_score}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-[#14B8A6]">{lead.ai_score}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{lead.ai_reasoning}</p>
              </div>

              {/* Fields grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Destination", `${lead.destination_flag} ${lead.destination}`],
                  ["Budget", fmt(lead.budget_per_person ?? 0)],
                  ["Travel Date", lead.travel_date],
                  ["Travelers", `${lead.travelers_count} pax`],
                  ["Duration", `${lead.duration_days} days`],
                  ["Style", lead.travel_style],
                  ["Status", lead.status.replace("_", " ")],
                  ["Temperature", lead.temperature],
                  ["Phone", lead.phone ?? "—"],
                  ["Source", lead.source],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-100 dark:border-white/5 p-3"
                  >
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "notes" && (
            <>
              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note..."
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1B2E5E]/30 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
                />
                <button
                  onClick={addNote}
                  className="w-full py-2 rounded-xl bg-[#14B8A6] hover:bg-teal-500 text-white text-sm font-medium transition-colors"
                >
                  Save Note
                </button>
              </div>
              <div className="space-y-3">
                {notes.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-6">No notes yet.</p>
                )}
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-100 dark:border-white/5 p-3"
                  >
                    <p className="text-sm text-slate-700 dark:text-slate-200">{n.text}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(n.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "activity" && (
            <div className="space-y-3">
              {lead.activity.map((a, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-[#14B8A6] flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{a.label}</p>
                    <p className="text-[10px] text-slate-400">
                      {new Date(a.created_at).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const searchParams = useSearchParams();
  const highlightedLeadId = Number(searchParams.get("leadId") || 0) || null;
  const destinationContext = searchParams.get("destination") || "";
  const [leads, setLeads] = useState<SeedLead[]>(SEED_LEADS);
  const [view, setView] = useState<"list" | "pipeline">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tempFilter, setTempFilter] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<SeedLead | null>(null);

  useEffect(() => {
    leadsApi
      .list()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((data: any) => {
        const items: Lead[] = Array.isArray(data) ? data : (data?.items ?? []);
        if (items.length > 0) {
          const merged: SeedLead[] = items.map((l) => {
            const seed = SEED_LEADS.find((s) => s.id === l.id);
            return seed
              ? { ...seed, ...l }
              : {
                  ...l,
                  temperature: "WARM" as const,
                  ai_score: Math.round(l.triage_confidence * 100),
                  ai_reasoning: "Score based on triage confidence.",
                  travel_date: "—",
                  destination_flag: "🌍",
                  notes: [],
                  activity: [{ label: "Lead created", created_at: l.created_at }],
                };
          });
          setLeads(merged);
        }
      })
      .catch(() => {
        // fallback to seed
      });
  }, []);

  useEffect(() => {
    if (!highlightedLeadId) return;
    const match = leads.find((lead) => lead.id === highlightedLeadId);
    if (match) setSelectedLead(match);
  }, [highlightedLeadId, leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !search ||
        (l.full_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (l.destination ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (l.email ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || l.status === statusFilter;
      const matchTemp = tempFilter === "ALL" || l.temperature === tempFilter;
      return matchSearch && matchStatus && matchTemp;
    });
  }, [leads, search, statusFilter, tempFilter]);

  // KPI calculations
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.temperature === "HOT").length;
  const wonLeads = leads.filter((l) => l.status === "WON").length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const avgDealValue =
    leads.length > 0
      ? Math.round(
          leads.reduce((sum, l) => sum + (l.budget_per_person ?? 0), 0) / leads.length
        )
      : 0;

  // Funnel counts
  const funnelStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON"];
  const funnelCounts = funnelStages.map((s) => leads.filter((l) => l.status === s).length);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0F1E] p-6" data-tour="leads-page">
      <DynamixHandoffBanner moduleLabel="Leads" />

      {highlightedLeadId ? (
        <div className="rounded-2xl border border-[#14B8A6]/20 bg-white dark:bg-[#0F1B35] p-5 mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#14B8A6]">Live CRM context</p>
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 mt-2">
            Dynamix has handed lead #{highlightedLeadId} into the CRM
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Use this page for follow-ups, ownership, and timeline notes{destinationContext ? ` for ${destinationContext}` : ""}.
          </p>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 mt-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1B2E5E] dark:text-white">Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Manage and track your lead pipeline
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                view === "list"
                  ? "bg-[#1B2E5E] dark:bg-[#14B8A6] text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <LayoutList size={14} />List
            </button>
            <button
              onClick={() => setView("pipeline")}
              className={`px-3 py-2 flex items-center gap-1.5 text-sm font-medium transition-colors ${
                view === "pipeline"
                  ? "bg-[#1B2E5E] dark:bg-[#14B8A6] text-white"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              }`}
            >
              <Columns size={14} />Pipeline
            </button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
            <Upload size={14} />Import CSV
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#14B8A6] hover:bg-teal-500 text-white text-sm font-medium transition-colors shadow-sm"
            data-tour="add-lead"
          >
            <Plus size={14} />Add Lead
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Leads", value: String(totalLeads), sub: "All time", badge: false },
          { label: "HOT Leads", value: String(hotLeads), sub: "High intent", badge: true },
          { label: "Conversion Rate", value: `${conversionRate}%`, sub: "Leads → Won", badge: false },
          { label: "Avg Deal Value", value: fmt(avgDealValue), sub: "Per lead", badge: false },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                {card.label}
              </p>
              {card.badge && (
                <span className="text-[10px] font-bold bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                  {hotLeads}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-4 mb-4 flex flex-col lg:flex-row gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1B2E5E]/30 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
          />
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
              }`}
            >
              {s.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Temperature filter */}
        <div className="flex gap-1">
          {TEMP_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setTempFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tempFilter === t
                  ? "bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIST VIEW ────────────────────────────────────────────────────── */}
      {view === "list" && (
        <>
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden mb-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-white/5">
                    {[
                      "Lead",
                      "Destination",
                      "Budget",
                      "Travel Date",
                      "Pax",
                      "Temp",
                      "Status",
                      "Score",
                      "Actions",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        No leads match your filters.
                      </td>
                    </tr>
                  )}
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      {/* Lead */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${avatarColor(lead.full_name ?? "")}`}
                          >
                            {initials(lead.full_name ?? "?")}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {lead.full_name}
                            </p>
                            <p className="text-xs text-slate-400">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Destination */}
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {lead.destination_flag} {lead.destination}
                      </td>
                      {/* Budget */}
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {fmt(lead.budget_per_person ?? 0)}
                      </td>
                      {/* Travel Date */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {lead.travel_date}
                      </td>
                      {/* Pax */}
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {lead.travelers_count}
                      </td>
                      {/* Temp */}
                      <td className="px-4 py-3">
                        <TempBadge temp={lead.temperature} />
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusPill status={lead.status} />
                      </td>
                      {/* Score */}
                      <td className="px-4 py-3">
                        <ScoreBar score={lead.ai_score} />
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <a
                            href={`https://wa.me/${(lead.phone ?? "").replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle size={13} />
                          </a>
                          <a
                            href={`mailto:${lead.email}`}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                            title="Email"
                          >
                            <Mail size={13} />
                          </a>
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                            title="View detail"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Conversion Funnel Footer */}
          <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-1 mb-3">
              <TrendingDown size={14} className="text-slate-400" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Conversion Funnel
              </p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              {funnelStages.map((stage, i) => (
                <div key={stage} className="flex items-center gap-1">
                  <div className="text-center">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                      {stage.replace("_", " ")}
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] font-bold text-sm min-w-[40px] text-center">
                      {funnelCounts[i]}
                    </div>
                  </div>
                  {i < funnelStages.length - 1 && (
                    <div className="flex flex-col items-center mx-1">
                      <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />
                      {funnelCounts[i] > 0 && (
                        <span className="text-[10px] text-red-400 font-medium">
                          -
                          {Math.round(
                            ((funnelCounts[i] - funnelCounts[i + 1]) / funnelCounts[i]) * 100
                          )}
                          %
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── PIPELINE / KANBAN VIEW ─────────────────────────────────────── */}
      {view === "pipeline" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLS.map((col) => {
            const colLeads = filtered.filter((l) => l.status === col);
            const colValue = colLeads.reduce((sum, l) => sum + (l.budget_per_person ?? 0), 0);
            return (
              <div
                key={col}
                className="flex-shrink-0 w-64 bg-slate-100 dark:bg-[#0F1B35]/50 rounded-2xl p-3 flex flex-col gap-3"
              >
                {/* Column header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    {col.replace("_", " ")}
                  </span>
                  <span className="text-xs font-bold bg-white dark:bg-[#0F1B35] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full border border-slate-200 dark:border-white/10">
                    {colLeads.length}
                  </span>
                </div>
                <p className="text-xs text-slate-400 -mt-2">{fmt(colValue)}</p>

                {/* Cards */}
                {colLeads.length === 0 && (
                  <div className="text-center py-8 text-slate-300 dark:text-slate-600 text-xs">
                    No leads
                  </div>
                )}
                {colLeads.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="w-full text-left bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-xl p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${avatarColor(lead.full_name ?? "")}`}
                      >
                        {initials(lead.full_name ?? "?")}
                      </div>
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {lead.full_name}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ml-auto ${
                          lead.temperature === "HOT"
                            ? "bg-red-500"
                            : lead.temperature === "WARM"
                            ? "bg-amber-400"
                            : "bg-sky-400"
                        }`}
                        title={lead.temperature}
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                      {lead.destination_flag} {lead.destination}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {fmt(lead.budget_per_person ?? 0)}
                      </span>
                      <span className="text-[10px] text-slate-400">{lead.travel_date}</span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over */}
      {selectedLead && (
        <LeadSlideOver lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
