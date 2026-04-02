"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "@/lib/api";
import { Kanban, List, Plus, Search, Sparkles, Target, TrendingUp, Users, ChevronRight } from "lucide-react";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  priority: string;
  destination: string;
  quote_total: number;
  status: string;
};

const FALLBACK_CASES: DemoCase[] = [
  { slug: "maldives-honeymoon", lead_id: 1, guest_name: "Meera Nair", priority: "CRITICAL", destination: "Maldives", quote_total: 486000, status: "Deposit pending within 24 hours" },
  { slug: "dubai-bleisure", lead_id: 3, guest_name: "Arjun Mehta", priority: "ATTENTION", destination: "Dubai", quote_total: 212000, status: "Quote approved and ready to send" },
  { slug: "kerala-family", lead_id: 2, guest_name: "Sharma Family", priority: "CRITICAL", destination: "Kerala", quote_total: 124000, status: "Payment reminder queued" },
];

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Sales Operations</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Global Pipeline</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 uppercase font-headline text-[#F5F0E8]">
            Lead Pipeline
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] bg-[#1D9E75]/10 px-3 py-1 rounded-full text-[#1D9E75] border border-[#1D9E75]/20 animate-pulse">
              DEMO_READY
            </span>
          </h1>
          <p className="text-[#B8B0A0] font-mono text-xs mt-2 uppercase tracking-wide">Demo cases mapped from homepage, autopilot, and deal view</p>
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
          <button className="bg-[#111111] text-[#C9A84C] border border-[#C9A84C]/20 p-2.5 rounded-xl hover:bg-[#C9A84C]/10 transition-all active:scale-95">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
          <div className="flex items-center gap-2 text-[#C9A84C] mb-3"><Sparkles size={14} /><span className="text-[10px] uppercase tracking-widest font-mono">Demo Total</span></div>
          <div className="text-2xl font-black text-[#F5F0E8]">₹{cases.reduce((sum, item) => sum + item.quote_total, 0).toLocaleString("en-IN")}</div>
        </div>
        <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
          <div className="flex items-center gap-2 text-[#1D9E75] mb-3"><Target size={14} /><span className="text-[10px] uppercase tracking-widest font-mono">Critical Cases</span></div>
          <div className="text-2xl font-black text-[#F5F0E8]">{cases.filter((item) => item.priority === "CRITICAL").length}</div>
        </div>
        <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
          <div className="flex items-center gap-2 text-[#C9A84C] mb-3"><Users size={14} /><span className="text-[10px] uppercase tracking-widest font-mono">Walkthrough Path</span></div>
          <div className="text-sm text-[#B8B0A0] leading-relaxed">Open any card to show quote, itinerary, finance, and negotiation in one screen.</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-28">
        <Column title="Hot Leads" count="03" color="border-[#C9A84C]/30">
          {cases.slice(0, 2).map((item) => (
            <LeadCard key={item.slug} item={item} tag={item.priority === "CRITICAL" ? "HOT" : "WARM"} tagColor={item.priority === "CRITICAL" ? "text-[#ff8c00]" : "text-[#1D9E75]"} tagBg={item.priority === "CRITICAL" ? "bg-[#ff8c00]/10" : "bg-[#1D9E75]/10"} />
          ))}
        </Column>

        <Column title="Quoted" count="01" color="border-[#1D9E75]/30">
          {cases.slice(1, 2).map((item) => (
            <LeadCard key={item.slug} item={item} tag="READY" tagColor="text-[#1D9E75]" tagBg="bg-[#1D9E75]/10" />
          ))}
        </Column>

        <Column title="Payment" count="01" color="border-[#C9A84C]">
          {cases.slice(2, 3).map((item) => (
            <LeadCard key={item.slug} item={item} tag="FOLLOW UP" tagColor="text-[#C9A84C]" tagBg="bg-[#C9A84C]/10" />
          ))}
        </Column>

        <Column title="Archive" count="00" muted color="border-white/5">
          <div className="rounded-xl border border-dashed border-white/5 p-6 text-center text-[#4A453E] text-xs font-mono uppercase tracking-widest">
            Nothing hidden here for Monday
          </div>
        </Column>
      </div>
    </div>
  );
}

function Column({
  title,
  count,
  children,
  accent = "text-[#F5F0E8]",
  muted = false,
  color,
}: {
  title: string;
  count: number | string;
  children: React.ReactNode;
  accent?: string;
  muted?: boolean;
  color?: string;
}) {
  return (
    <div className={`flex flex-col h-full bg-[#111111] rounded-2xl border border-[#C9A84C]/10 ${muted ? "opacity-40" : ""} shadow-sm`}>
      <div className={`p-4 border-b border-[#C9A84C]/10 flex justify-between items-center ${color ? `border-t-2 ${color}` : ""}`}>
        <span className={`font-black tracking-widest text-[10px] uppercase font-mono ${accent}`}>{title}</span>
        <span className="font-mono text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded-lg text-[#C9A84C] font-bold border border-[#C9A84C]/10">{count}</span>
      </div>
      <div className="p-3 space-y-4 overflow-y-auto flex-1 max-h-[calc(100vh-360px)] no-scrollbar">
        {children}
      </div>
    </div>
  );
}

function LeadCard({
  item,
  tag,
  tagColor,
  tagBg,
}: {
  item: DemoCase;
  tag: string;
  tagColor: string;
  tagBg: string;
}) {
  return (
    <Link href={`/dashboard/deals?case=${item.slug}`} className="block bg-[#1A1A1A] p-4 rounded-xl border border-transparent hover:border-[#C9A84C]/30 transition-all group cursor-pointer relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[9px] font-mono ${tagBg} ${tagColor} px-2 py-0.5 rounded-md uppercase tracking-widest font-black border border-current/10`}>{tag}</span>
        <Plus size={14} className="text-[#B8B0A0] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-black text-sm tracking-tight mb-1 text-[#F5F0E8] font-headline uppercase">{item.guest_name}</h3>
      <p className="text-[10px] font-mono text-[#B8B0A0] uppercase tracking-tighter mb-4">{item.destination}</p>
      <div className="flex justify-between items-center mt-auto border-t border-[#C9A84C]/5 pt-3">
        <span className="text-sm font-mono font-black text-[#C9A84C]">₹{item.quote_total.toLocaleString("en-IN")}</span>
        <span className="text-[9px] font-mono text-[#B8B0A0] opacity-50 uppercase">Open case</span>
      </div>
    </Link>
  );
}
