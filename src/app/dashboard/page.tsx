"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { BadgeIndianRupee, ChevronRight, Clock3, Sparkles, Target, Users, Wallet, Wand2 } from "lucide-react";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  priority: string;
  query: string;
  destination: string;
  quote_total: number;
  status: string;
};

const FALLBACK_CASES: DemoCase[] = [
  {
    slug: "maldives-honeymoon",
    lead_id: 1,
    guest_name: "Meera Nair",
    priority: "CRITICAL",
    query: "Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.",
    destination: "Maldives",
    quote_total: 486000,
    status: "Deposit pending within 24 hours",
  },
  {
    slug: "dubai-bleisure",
    lead_id: 3,
    guest_name: "Arjun Mehta",
    priority: "ATTENTION",
    query: "Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around ₹2L all-in.",
    destination: "Dubai",
    quote_total: 212000,
    status: "Quote approved and ready to send",
  },
  {
    slug: "kerala-family",
    lead_id: 2,
    guest_name: "Sharma Family",
    priority: "CRITICAL",
    query: "Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about ₹1.2L total.",
    destination: "Kerala",
    quote_total: 124000,
    status: "Payment reminder queued",
  },
];

export default function DashboardPage() {
  const [cases, setCases] = useState<DemoCase[]>(FALLBACK_CASES);
  const [loading, setLoading] = useState(true);

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
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalQuote = cases.reduce((sum, item) => sum + item.quote_total, 0);
  const avgQuote = Math.round(totalQuote / Math.max(cases.length, 1));
  const criticalCount = cases.filter((item) => item.priority === "CRITICAL").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Demo</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Golden Path</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-[#F5F0E8] font-headline uppercase">Operations Overview</h1>
          <p className="text-[#B8B0A0] mt-2 font-body text-sm max-w-2xl">
            This dashboard is wired to the live demo cases so the Monday walkthrough stays coherent from lead to quote to deal.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-3">
          <Sparkles size={16} className="text-[#C9A84C]" />
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Demo Mode</div>
            <div className="text-sm font-black text-[#F5F0E8]">Live-fallback enabled</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label="Pipeline Value" value={`₹${totalQuote.toLocaleString("en-IN")}`} sub="Across 3 demo cases" icon={<BadgeIndianRupee size={16} />} />
        <MetricCard label="Avg Deal Size" value={`₹${avgQuote.toLocaleString("en-IN")}`} sub="Mean quote value" icon={<Target size={16} />} />
        <MetricCard label="Active Cases" value={`${cases.length}`} sub={`${criticalCount} marked critical`} icon={<Users size={16} />} />
        <MetricCard label="Automation Readiness" value="94%" sub="Backend + frontend verified" icon={<Wand2 size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-[#F5F0E8] uppercase tracking-tight font-headline">Demo Cases</h2>
              <p className="text-[#B8B0A0] text-sm mt-1">Tap any card to open the full deal view and walk the quote pipeline.</p>
            </div>
            <Link href="/dashboard/autopilot" className="text-[#C9A84C] text-xs uppercase tracking-widest font-black flex items-center gap-1">
              Open Autopilot <ChevronRight size={14} />
            </Link>
          </div>
          <div className="space-y-4">
            {cases.map((item) => (
              <Link key={item.slug} href={`/dashboard/deals?case=${item.slug}`} className="block rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5 hover:border-[#C9A84C]/30 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-2 py-1 rounded-full border ${item.priority === "CRITICAL" ? "text-red-400 border-red-400/20 bg-red-400/10" : "text-[#C9A84C] border-[#C9A84C]/20 bg-[#C9A84C]/10"}`}>
                        {item.priority}
                      </span>
                      <span className="text-[10px] font-mono text-[#4A453E] uppercase tracking-widest">{item.destination}</span>
                    </div>
                    <h3 className="text-lg font-black text-[#F5F0E8]">{item.guest_name}</h3>
                    <p className="text-sm text-[#B8B0A0] leading-relaxed mt-1 max-w-2xl">{item.query}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">Quote</div>
                    <div className="text-xl font-black text-[#C9A84C]">₹{item.quote_total.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-[#1D9E75] mt-2 max-w-[160px]">{item.status}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock3 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Demo Flow</h2>
          </div>
          <ol className="space-y-4 text-sm">
            <FlowStep title="1. Triage" body="Use the homepage playground to load Maldives, Dubai, or Kerala cases." />
            <FlowStep title="2. Autopilot" body="Open the command center and jump directly into the high-priority deal cards." />
            <FlowStep title="3. Deal View" body="Open a case and walk the quote, itinerary, finance, and vendor panels." />
            <FlowStep title="4. Close" body="Show the consistent design, the demo fallback, and the live health indicators." />
          </ol>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-center gap-2 text-[#C9A84C] mb-3">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-mono">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#4A453E] font-mono mt-2">{sub}</div>
    </div>
  );
}

function FlowStep({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{title}</div>
      <div className="text-sm text-[#B8B0A0] leading-relaxed">{body}</div>
    </li>
  );
}
