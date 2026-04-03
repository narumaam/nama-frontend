"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from "@/lib/demo-profile";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  FileStack,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
} from "lucide-react";

const CONTRACT_INBOX = [
  {
    supplier: "Atlantis The Palm",
    format: "PDF Contract",
    status: "Parsed",
    note: "Room categories, cancellation rules, blackout dates, and meal inclusions normalized into supplier fields.",
  },
  {
    supplier: "Royal Desert Safaris",
    format: "WhatsApp + image",
    status: "Needs review",
    note: "Tariff came in as chat plus rate card photo; AI extracted the main slabs and flagged missing child policy.",
  },
  {
    supplier: "Kerala Houseboat Collective",
    format: "Email + DOCX",
    status: "Structured",
    note: "Houseboat terms, driver note, and seasonal supplement converted into a reusable contract block.",
  },
  {
    supplier: "City Tours Dubai",
    format: "Scanned JPEG",
    status: "Queued",
    note: "Scanned city-tour agreement is waiting for OCR and service-level review.",
  },
];

const OPERATIONS_THREADS = [
  {
    lane: "Travel Agent",
    partner: "Nair Luxury Escapes",
    message: "Need the Maldives villa hold, private dinner note, and deposit deadline confirmed before 6 PM.",
    channel: "Email + CRM note",
  },
  {
    lane: "Hotelier",
    partner: "Atlantis The Palm",
    message: "Please reconfirm the overwater villa equivalent, breakfast inclusion, and late check-in handling.",
    channel: "Contract + ops follow-up",
  },
  {
    lane: "Driver / Transport",
    partner: "DXB Executive Transfers",
    message: "Need updated airport pickup nameboard, arrival terminal, and emergency ops contact.",
    channel: "WhatsApp placeholder",
  },
  {
    lane: "Activity Vendor",
    partner: "Royal Desert Safaris",
    message: "Confirm sunset slot, private vehicle, and child-friendly pacing for the family backup case.",
    channel: "Phone transcript",
  },
];

const SERVICE_STACK = [
  { label: "Hotels", value: "12 active contracts", icon: Building2 },
  { label: "Guides", value: "6 city-guide templates", icon: Users },
  { label: "Transport", value: "8 cab / driver agreements", icon: Truck },
  { label: "Activities", value: "17 operator rate sheets", icon: Sparkles },
];

export default function DmcPage() {
  const profile = useMemo(() => readDemoProfile(), []);
  const [selectedContract, setSelectedContract] = useState(CONTRACT_INBOX[0]);
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleRoles = profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ");

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>DMC Workspace</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Contracts & Supplier Ops</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#F5F0E8] font-headline">DMC Contract Hub</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            This is the supplier-side operating layer for DMCs: upload non-standard contracts, normalize messy formats, and keep travel-agent plus service-provider communication inside one controlled workspace.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">{visibleCompany}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">{visibleRoles}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/deals?lead=1"
            className="rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Back to deal
          </Link>
          <button className="rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95">
            Upload contract
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SERVICE_STACK.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} icon={<item.icon size={16} />} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <FileStack size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Contract Intake & Normalization</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            Contracts do not arrive in one clean template. They come as PDFs, scanned images, emails, DOCX files, WhatsApp screenshots, and mixed vendor notes. The demo shows how NAMA turns those into structured commercial blocks.
          </p>
          <div className="space-y-3">
            {CONTRACT_INBOX.map((contract) => (
              <button
                key={contract.supplier}
                type="button"
                onClick={() => setSelectedContract(contract)}
                className={`w-full rounded-2xl border bg-[#0A0A0A] p-4 text-left transition-colors ${
                  selectedContract.supplier === contract.supplier ? "border-[#C9A84C]/30" : "border-[#C9A84C]/10 hover:border-[#C9A84C]/20"
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{contract.supplier}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{contract.format}</div>
                    <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{contract.note}</div>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${
                      contract.status === "Parsed" || contract.status === "Structured"
                        ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
                        : contract.status === "Needs review"
                          ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
                          : "border-[#B8B0A0]/20 bg-[#B8B0A0]/10 text-[#B8B0A0]"
                    }`}
                  >
                    {contract.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <aside className="xl:col-span-5 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <ScanSearch size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">What the AI extracts</h2>
          </div>
          <div className="space-y-3">
            {[
              "Rate slabs and seasonal pricing",
              "Cancellation policies and blackout dates",
              "Room category mapping and inclusions",
              "Driver / guide contact and operating windows",
              "Notes that need human review before publishing",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-3 text-sm text-[#B8B0A0]">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Safe wording</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              Present this as “AI-assisted contract normalization in a demo-safe flow,” not as a claim that every vendor format is already fully automated in production.
            </p>
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Selected supplier output</div>
                <div className="mt-1 text-sm font-black text-[#F5F0E8]">{selectedContract.supplier}</div>
              </div>
              <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                {selectedContract.status}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewField label="Source format" value={selectedContract.format} />
              <PreviewField label="Publishing mode" value={selectedContract.status === "Parsed" || selectedContract.status === "Structured" ? "Ready for quote blocks" : "Review before release"} />
            </div>
            <div className="mt-3 rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Structured commercial note</div>
              <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{selectedContract.note}</div>
            </div>
            <div className="mt-3 rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Operational destination</div>
              <div className="mt-2 text-sm text-[#F5F0E8]">{visibleCompany} supplier workspace</div>
              <div className="mt-1 text-[10px] text-[#B8B0A0]">Ready to feed quote blocks, ops notes, and supplier thread context back into the main deal flow.</div>
            </div>
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <MessageSquare size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Travel Agent Communication</h2>
          </div>
          <div className="space-y-3">
            <CommRow
              icon={<Mail size={14} />}
              title="Agent update thread"
              detail="Push clean supplier outcomes back to the travel agent without forcing them to re-read the raw contract."
            />
            <CommRow
              icon={<FileText size={14} />}
              title="Quote-ready supplier blocks"
              detail="Move structured terms, pricing, and inclusions into the quote or itinerary workspace."
            />
            <CommRow
              icon={<ShieldCheck size={14} />}
              title="Ops handoff"
              detail="Travel agent, DMC ops, and finance see the same supplier truth instead of fragmented notes."
            />
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Phone size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Service Provider Threads</h2>
          </div>
          <div className="space-y-3">
            {OPERATIONS_THREADS.map((thread) => (
              <div key={thread.partner} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{thread.partner}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{thread.lane}</div>
                  </div>
                  <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                    {thread.channel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{thread.message}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">How to frame this on Monday</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">What this proves</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              NAMA is not just for front-end quoting. It also helps a DMC handle supplier contracts that are messy, non-standard, and operationally heavy.
            </p>
          </div>
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">What not to imply</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              Don’t claim every upload is live OCR with no review. Position it as a demo-safe DMC operating flow that shows intake, normalization, and supplier communication clearly.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function CommRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{detail}</p>
    </div>
  );
}
