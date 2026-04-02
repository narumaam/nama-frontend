"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Kanban,
  List,
  Mail,
  PhoneCall,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  priority: string;
  destination: string;
  quote_total: number;
  status: string;
};

type LeadStage = "New" | "Qualified" | "Quoted" | "Follow Up" | "Won";

type LeadRecord = DemoCase & {
  owner: string;
  source: string;
  stage: LeadStage;
  nextAction: string;
  nextActionAt: string;
  contactLabel: string;
  lastTouch: string;
};

const FALLBACK_CASES: DemoCase[] = [
  { slug: "maldives-honeymoon", lead_id: 1, guest_name: "Meera Nair", priority: "CRITICAL", destination: "Maldives", quote_total: 486000, status: "Deposit pending within 24 hours" },
  { slug: "dubai-bleisure", lead_id: 3, guest_name: "Arjun Mehta", priority: "ATTENTION", destination: "Dubai", quote_total: 212000, status: "Quote approved and ready to send" },
  { slug: "kerala-family", lead_id: 2, guest_name: "Sharma Family", priority: "CRITICAL", destination: "Kerala", quote_total: 124000, status: "Payment reminder queued" },
];

const captureSources = [
  { label: "Website", note: "Public enquiry form", tone: "Fastest intake" },
  { label: "WhatsApp", note: "Business chat handoff", tone: "High response" },
  { label: "Email", note: "Inbox parsing + threading", tone: "Context rich" },
  { label: "Phone", note: "Call transcript capture", tone: "CRM ready" },
];

const schedulerItems = [
  { time: "09:30", title: "Call Meera Nair", owner: "Aisha Khan", mode: "Phone callback", color: "text-[#C9A84C]" },
  { time: "11:00", title: "Send Dubai executive quote", owner: "Ravi Menon", mode: "Email send", color: "text-[#1D9E75]" },
  { time: "14:30", title: "Kerala payment reminder", owner: "Farah Khan", mode: "WhatsApp follow-up", color: "text-[#C9A84C]" },
  { time: "17:00", title: "Review Maldives deposit status", owner: "Aisha Khan", mode: "Manager checkpoint", color: "text-[#F5F0E8]" },
];

const calendarDays = [
  { day: "Mon", date: "06", status: "Full" },
  { day: "Tue", date: "07", status: "Calls" },
  { day: "Wed", date: "08", status: "Quotes" },
  { day: "Thu", date: "09", status: "Deposits" },
  { day: "Fri", date: "10", status: "Reviews" },
];

function buildLeadRecords(cases: DemoCase[]): LeadRecord[] {
  return cases.map((item) => {
    if (item.slug === "maldives-honeymoon") {
      return {
        ...item,
        owner: "Aisha Khan",
        source: "Website",
        stage: "Follow Up",
        nextAction: "Deposit follow-up call",
        nextActionAt: "Today · 09:30",
        contactLabel: "High-intent honeymoon lead",
        lastTouch: "Viewed itinerary 3 times in 90 minutes",
      };
    }
    if (item.slug === "dubai-bleisure") {
      return {
        ...item,
        owner: "Ravi Menon",
        source: "Phone",
        stage: "Quoted",
        nextAction: "Send executive quote PDF",
        nextActionAt: "Today · 11:00",
        contactLabel: "Corporate bleisure traveler",
        lastTouch: "Requested premium option set",
      };
    }
    return {
      ...item,
      owner: "Farah Khan",
      source: "Email",
      stage: "Qualified",
      nextAction: "Payment reminder sequence",
      nextActionAt: "Today · 14:30",
      contactLabel: "Family pacing and budget case",
      lastTouch: "Asked for easier payment timing",
    };
  });
}

export default function LeadsPage() {
  const [activeView, setActiveView] = useState<"kanban" | "list">("kanban");
  const [cases, setCases] = useState<DemoCase[]>(FALLBACK_CASES);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(apiUrl("/demo/cases"));
        const data = await response.json();
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setCases(data);
        }
      } catch {
        if (!cancelled) setCases(FALLBACK_CASES);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const leads = useMemo(() => buildLeadRecords(cases), [cases]);
  const stages: LeadStage[] = ["New", "Qualified", "Quoted", "Follow Up", "Won"];
  const pipelineValue = leads.reduce((sum, item) => sum + item.quote_total, 0);
  const stageBuckets = stages.map((stage) => ({
    stage,
    leads: leads.filter((item) => item.stage === stage),
  }));

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Sales Operations</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Contacts + Pipeline</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 uppercase font-headline text-[#F5F0E8]">
            Leads & Contacts
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] bg-[#1D9E75]/10 px-3 py-1 rounded-full text-[#1D9E75] border border-[#1D9E75]/20 animate-pulse">
              MONDAY_READY
            </span>
          </h1>
          <p className="text-[#B8B0A0] font-mono text-xs mt-2 uppercase tracking-wide">Stages, owners, follow-up scheduler, and omnichannel context in one CRM surface</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-xl border border-[#C9A84C]/15 shadow-inner">
            <button
              onClick={() => setActiveView("kanban")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                activeView === "kanban" ? "bg-[#C9A84C] text-[#0A0A0A] shadow-lg" : "text-[#B8B0A0] hover:text-[#F5F0E8]"
              }`}
            >
              <Kanban size={14} /> Kanban
            </button>
            <button
              onClick={() => setActiveView("list")}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                activeView === "list" ? "bg-[#C9A84C] text-[#0A0A0A] shadow-lg" : "text-[#B8B0A0] hover:text-[#F5F0E8]"
              }`}
            >
              <List size={14} /> List
            </button>
          </div>
          <Link
            href="/dashboard/deals?case=maldives-honeymoon"
            className="bg-[#111111] text-[#C9A84C] border border-[#C9A84C]/20 px-4 py-2.5 rounded-xl hover:bg-[#C9A84C]/10 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            Open Primary Case
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Pipeline Value" value={`₹${pipelineValue.toLocaleString("en-IN")}`} sub="Across active CRM leads" icon={<Sparkles size={14} />} />
        <MetricCard label="Critical Contacts" value={`${leads.filter((item) => item.priority === "CRITICAL").length}`} sub="Needs human attention today" icon={<Target size={14} />} />
        <MetricCard label="Scheduled Touches" value={`${schedulerItems.length}`} sub="Calls, quote sends, reminders" icon={<CalendarClock size={14} />} />
        <MetricCard label="Won This Week" value="01" sub="One case moved to payment" icon={<CheckCircle2 size={14} />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-8 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Omnichannel Inbound Capture</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">
            Website, WhatsApp, email, and phone calls all become the same kind of contact and lead in CRM. The team sees one commercial object instead of scattered follow-ups.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
            {captureSources.map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{item.label}</div>
                <div className="text-sm text-[#F5F0E8] leading-relaxed mb-2">{item.note}</div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{item.tone}</div>
              </div>
            ))}
          </div>
        </section>

        <aside className="xl:col-span-4 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Scheduler</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">
            The scheduler keeps the sales team honest: callbacks, quote sends, deposit reminders, and manager reviews stay visible on the same CRM surface.
          </p>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {calendarDays.map((day) => (
              <div key={day.date} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-3 py-3 text-center">
                <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{day.day}</div>
                <div className="mt-2 text-lg font-black text-[#F5F0E8]">{day.date}</div>
                <div className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#C9A84C]">{day.status}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {schedulerItems.map((item) => (
              <div key={item.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.time}</div>
                    <div className="mt-1 text-sm font-black text-[#F5F0E8]">{item.title}</div>
                    <div className="mt-1 text-xs text-[#B8B0A0]">{item.owner} · {item.mode}</div>
                  </div>
                  <Clock3 size={14} className="text-[#4A453E]" />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      {activeView === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 items-start pb-20">
          {stageBuckets.map((bucket) => (
            <Column key={bucket.stage} title={bucket.stage} count={String(bucket.leads.length).padStart(2, "0")} color={stageColor(bucket.stage)}>
              {bucket.leads.length ? (
                bucket.leads.map((item) => <LeadCard key={item.slug} item={item} />)
              ) : (
                <div className="rounded-xl border border-dashed border-white/5 p-6 text-center text-[#4A453E] text-xs font-mono uppercase tracking-widest">
                  No leads here now
                </div>
              )}
            </Column>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] overflow-hidden pb-8">
          <div className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.9fr_1fr_1fr] gap-4 border-b border-[#C9A84C]/10 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#4A453E]">
            <span>Contact</span>
            <span>Source</span>
            <span>Stage</span>
            <span>Owner</span>
            <span>Next Action</span>
            <span>Status</span>
          </div>
          <div className="divide-y divide-[#C9A84C]/10">
            {leads.map((item) => (
              <Link
                key={item.slug}
                href={`/dashboard/deals?case=${item.slug}`}
                className="grid grid-cols-[1.1fr_0.7fr_0.7fr_0.9fr_1fr_1fr] gap-4 px-6 py-5 hover:bg-[#0A0A0A] transition-colors"
              >
                <div>
                  <div className="text-sm font-black text-[#F5F0E8]">{item.guest_name}</div>
                  <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#C9A84C]">{item.contactLabel}</div>
                </div>
                <div className="text-sm text-[#B8B0A0]">{item.source}</div>
                <div><StagePill stage={item.stage} /></div>
                <div className="text-sm text-[#B8B0A0]">{item.owner}</div>
                <div>
                  <div className="text-sm text-[#F5F0E8]">{item.nextAction}</div>
                  <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{item.nextActionAt}</div>
                </div>
                <div className="text-sm text-[#B8B0A0]">{item.status}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function stageColor(stage: LeadStage) {
  if (stage === "New") return "border-[#4A453E]";
  if (stage === "Qualified") return "border-[#1D9E75]";
  if (stage === "Quoted") return "border-[#C9A84C]";
  if (stage === "Follow Up") return "border-[#ff8c00]";
  return "border-[#1D9E75]";
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-center gap-2 mb-3 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-mono">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-sm text-[#B8B0A0] leading-relaxed">{sub}</div>
    </div>
  );
}

function Column({
  title,
  count,
  children,
  color,
}: {
  title: string;
  count: number | string;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-col h-full bg-[#111111] rounded-2xl border border-[#C9A84C]/10 shadow-sm">
      <div className={`p-4 border-b border-[#C9A84C]/10 flex justify-between items-center border-t-2 ${color || "border-[#C9A84C]/10"}`}>
        <span className="font-black tracking-widest text-[10px] uppercase font-mono text-[#F5F0E8]">{title}</span>
        <span className="font-mono text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded-lg text-[#C9A84C] font-bold border border-[#C9A84C]/10">{count}</span>
      </div>
      <div className="p-3 space-y-4 overflow-y-auto flex-1 max-h-[calc(100vh-360px)] no-scrollbar">{children}</div>
    </div>
  );
}

function LeadCard({ item }: { item: LeadRecord }) {
  return (
    <Link href={`/dashboard/deals?case=${item.slug}`} className="block bg-[#1A1A1A] p-4 rounded-xl border border-transparent hover:border-[#C9A84C]/30 transition-all group cursor-pointer relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-start gap-3 mb-3">
        <StagePill stage={item.stage} />
        <ChevronRight size={14} className="text-[#B8B0A0] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>
      <h3 className="font-black text-sm tracking-tight mb-1 text-[#F5F0E8] font-headline uppercase">{item.guest_name}</h3>
      <p className="text-[10px] font-mono text-[#B8B0A0] uppercase tracking-tighter">{item.destination} · {item.source}</p>
      <p className="mt-3 text-xs text-[#B8B0A0] leading-relaxed">{item.contactLabel}</p>
      <div className="mt-3 rounded-xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3">
        <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Next action</div>
        <div className="mt-1 text-sm font-black text-[#F5F0E8]">{item.nextAction}</div>
        <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#C9A84C]">{item.nextActionAt}</div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-[#C9A84C]/5 pt-3">
        <div>
          <div className="text-sm font-mono font-black text-[#C9A84C]">₹{item.quote_total.toLocaleString("en-IN")}</div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{item.owner}</div>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Last touch</div>
          <div className="text-[10px] text-[#B8B0A0]">{item.lastTouch}</div>
        </div>
      </div>
    </Link>
  );
}

function StagePill({ stage }: { stage: LeadStage }) {
  const tone =
    stage === "New"
      ? "text-[#B8B0A0] bg-white/5 border-white/10"
      : stage === "Qualified"
      ? "text-[#1D9E75] bg-[#1D9E75]/10 border-[#1D9E75]/20"
      : stage === "Quoted"
      ? "text-[#C9A84C] bg-[#C9A84C]/10 border-[#C9A84C]/20"
      : stage === "Follow Up"
      ? "text-[#ffb347] bg-[#ff8c00]/10 border-[#ff8c00]/20"
      : "text-[#1D9E75] bg-[#1D9E75]/10 border-[#1D9E75]/20";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${tone}`}>
      {stage === "Qualified" && <Mail size={10} />}
      {stage === "Follow Up" && <PhoneCall size={10} />}
      {stage === "Won" && <CheckCircle2 size={10} />}
      {(stage === "New" || stage === "Quoted") && <Clock3 size={10} />}
      {stage}
    </span>
  );
}
