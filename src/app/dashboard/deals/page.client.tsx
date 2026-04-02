"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Bot, CheckCircle2, MessageSquare, Shield, Sparkles, Target } from "lucide-react";

import { apiUrl } from "@/lib/api";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  organization: string;
  priority: string;
  query: string;
  triage: {
    destination: string;
    duration_days: number;
    travelers_count: number;
    travel_dates: string;
    preferences: string[];
    style: string;
    confidence_score: number;
    suggested_reply: string;
    reasoning: string;
  };
  itinerary: {
    title: string;
    total_price: number;
    currency: string;
    days: Array<{
      day_number: number;
      title: string;
      narrative: string;
      blocks: Array<{
        type: string;
        title: string;
        description: string;
        price_gross: number;
        currency?: string;
      }>;
    }>;
  };
  finance: {
    quote_total: number;
    cost_total: number;
    gross_profit: number;
    margin_percent: number;
    deposit_due: number;
    status: string;
  };
  communications: {
    channel: string;
    latest_message: string;
    suggested_follow_up: string;
  };
  bidding: {
    vendor: string;
    status: string;
    note: string;
  };
};

const LEAD_FALLBACK_MAP: Record<string, string> = {
  "1": "maldives-honeymoon",
  "2": "kerala-family",
  "3": "dubai-bleisure",
};

export default function DealsClientPage() {
  const params = useSearchParams();
  const leadParam = params.get("lead") ?? "1";
  const slugParam = params.get("case") ?? LEAD_FALLBACK_MAP[leadParam] ?? "maldives-honeymoon";

  const [data, setData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/demo/case/${slugParam}`));
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  if (loading) {
    return <div className="text-[#F5F0E8] font-mono text-sm">Loading demo deal...</div>;
  }

  if (!data) {
    return <div className="text-red-400 font-mono text-sm">Demo deal unavailable.</div>;
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-[#C9A84C]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C]">Demo Deal Intelligence</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tight text-[#F5F0E8]">{data.guest_name}</h1>
          <p className="text-[#B8B0A0] text-sm mt-2">{data.organization} · {data.triage.destination} · {data.triage.duration_days} days</p>
        </div>
        <Link href="/dashboard/autopilot" className="inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[#C9A84C] text-xs uppercase tracking-widest font-black">
          Back to Autopilot <ArrowRight size={12} />
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Quote Value" value={`₹${data.finance.quote_total.toLocaleString("en-IN")}`} icon={<BadgeIndianRupee size={16} />} />
        <StatCard label="Gross Profit" value={`₹${data.finance.gross_profit.toLocaleString("en-IN")}`} icon={<Target size={16} />} />
        <StatCard label="Margin" value={`${data.finance.margin_percent}%`} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Deposit Due" value={`₹${data.finance.deposit_due.toLocaleString("en-IN")}`} icon={<Shield size={16} />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Lead Understanding</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">{data.query}</p>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <InfoPill label="Style" value={data.triage.style} />
            <InfoPill label="Travelers" value={`${data.triage.travelers_count}`} />
            <InfoPill label="Travel Dates" value={data.triage.travel_dates} />
            <InfoPill label="Confidence" value={`${Math.round(data.triage.confidence_score * 100)}%`} />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-widest text-[#4A453E] font-mono mb-2">Preferences</div>
            <div className="flex flex-wrap gap-2">
              {data.triage.preferences.map((pref) => (
                <span key={pref} className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1 text-xs text-[#F5F0E8]">
                  {pref}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Client Reply</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-4">{data.communications.latest_message}</p>
          <div className="rounded-2xl border border-[#1D9E75]/15 bg-[#1D9E75]/8 p-4 text-sm text-[#F5F0E8] leading-relaxed">
            {data.communications.suggested_follow_up}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#F5F0E8]">Itinerary Snapshot</h2>
          <div className="text-sm font-mono text-[#C9A84C]">{data.itinerary.currency} {data.itinerary.total_price.toLocaleString("en-IN")}</div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {data.itinerary.days.map((day) => (
            <div key={day.day_number} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] font-mono mb-2">Day {day.day_number}</div>
              <h3 className="text-sm font-black text-[#F5F0E8] mb-2">{day.title}</h3>
              <p className="text-xs text-[#B8B0A0] leading-relaxed mb-4">{day.narrative}</p>
              <div className="space-y-3">
                {day.blocks.map((block, index) => (
                  <div key={`${block.title}-${index}`} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#4A453E] font-mono mb-1">{block.type}</div>
                    <div className="text-sm font-semibold text-[#F5F0E8]">{block.title}</div>
                    <div className="text-xs text-[#B8B0A0] mt-1">{block.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <h2 className="text-lg font-black text-[#F5F0E8] mb-4">Finance Summary</h2>
          <div className="space-y-3 text-sm">
            <LineItem label="Quoted to Client" value={`₹${data.finance.quote_total.toLocaleString("en-IN")}`} />
            <LineItem label="Expected Cost" value={`₹${data.finance.cost_total.toLocaleString("en-IN")}`} />
            <LineItem label="Gross Profit" value={`₹${data.finance.gross_profit.toLocaleString("en-IN")}`} />
            <LineItem label="Margin" value={`${data.finance.margin_percent}%`} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4 text-sm text-[#C9A84C]">
            {data.finance.status}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <h2 className="text-lg font-black text-[#F5F0E8] mb-4">Vendor Negotiation</h2>
          <div className="space-y-3 text-sm">
            <LineItem label="Primary Vendor" value={data.bidding.vendor} />
            <LineItem label="Status" value={data.bidding.status} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4 text-sm text-[#B8B0A0] leading-relaxed">
            {data.bidding.note}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-center gap-2 text-[#C9A84C] mb-3">{icon}<span className="text-[10px] uppercase tracking-widest font-mono">{label}</span></div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#4A453E] font-mono mb-1">{label}</div>
      <div className="text-sm text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#C9A84C]/5 pb-2">
      <span className="text-[#B8B0A0]">{label}</span>
      <span className="text-[#F5F0E8] font-semibold">{value}</span>
    </div>
  );
}

