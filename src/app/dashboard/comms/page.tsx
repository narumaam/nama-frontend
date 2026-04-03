"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ScreenInfoTip from "@/components/screen-info-tip";
import { DEFAULT_DEMO_PROFILE, getDemoBrandTheme, getDemoWorkspaceDomain, readDemoProfile } from "@/lib/demo-profile";
import { DEMO_CASE_ROUTES, dealHrefFromCaseName, dealHrefFromSlug, getPrimaryDemoCase, normalizeDemoCaseSlug } from "@/lib/demo-cases";
import { SCREEN_HELP } from "@/lib/screen-help";
import {
  ArrowRight,
  Bot,
  ChevronRight,
  Clock3,
  MessageSquare,
  Phone,
  Sparkles,
  Users,
  Mic,
  Mail,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";

type ThreadCard = {
  channel: string;
  source: string;
  guest: string;
  caseName: string;
  tone: string;
  note: string;
  status: string;
};

type TranscriptLine = {
  speaker: string;
  channel: string;
  message: string;
};

const PRIMARY_CASE = getPrimaryDemoCase();

const THREADS: ThreadCard[] = [
  ...DEMO_CASE_ROUTES.map((item) => ({
    channel: item.intakeChannel,
    source: item.intakeSource,
    guest: item.guest,
    caseName: item.caseName,
    tone: item.intakeTone,
    note:
      item.intakeChannel === "Website"
        ? "A preview inquiry lands directly from the homepage and becomes a deal without manual cleanup."
        : item.intakeChannel === "Phone"
          ? "The call summary is attached to the same record so the next rep has context immediately."
          : "The email is normalized into destination, duration, travelers, and follow-up status.",
    status:
      item.intakeChannel === "Website"
        ? "Captured"
        : item.intakeChannel === "Phone"
          ? "Synced"
          : "Parsed",
  })),
  {
    channel: "WhatsApp",
    source: "Placeholder messaging rail",
    guest: DEMO_CASE_ROUTES[1].guest,
    caseName: DEMO_CASE_ROUTES[1].caseName,
    tone: "Demo-safe",
    note: "Shown in the workflow as an expected channel, but not presented as a live production connector.",
    status: "Illustrated",
  },
];

const ACTIVE_TRANSCRIPT: TranscriptLine[] = [
  {
    speaker: "Sales Agent",
    channel: "Phone",
    message: `I’ve captured the ${PRIMARY_CASE.caseName} request and I’m moving it into CRM now.`,
  },
  {
    speaker: "Client",
    channel: "Website",
    message: "Please keep the private dinner, seaplane transfer, and villa hold in place.",
  },
  {
    speaker: "CRM",
    channel: "System",
    message: "The lead is now linked to the deal card, itinerary, and follow-up queue.",
  },
];

const FOLLOW_UP_QUEUE = DEMO_CASE_ROUTES.map((item) => ({
  guest: item.guest,
  caseName: item.caseName,
  nextStep:
    item.slug === PRIMARY_CASE.slug
      ? "Send deposit link and hold villa for 24 hours."
      : item.slug === "dubai-bleisure"
        ? "Share executive quote PDF and confirm premium desert option."
        : "Nudge for deposit and keep the operator in reserve.",
  urgency: item.priority === "CRITICAL" ? "Critical" : "Attention",
}));

const SOURCE_SUMMARY = [
  { label: "Website", value: "1 lead", icon: Sparkles },
  { label: "Phone", value: "1 transcript", icon: Phone },
  { label: "Email", value: "1 thread", icon: Mail },
  { label: "WhatsApp", value: "1 placeholder", icon: MessageCircle },
];

export default function CommsPage() {
  const profile = useMemo(() => readDemoProfile(), []);
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const [selectedThread, setSelectedThread] = useState(THREADS[0]);
  const visibleCompany = profile.company || DEFAULT_DEMO_PROFILE.company;
  const visibleRoles = profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const slug = normalizeDemoCaseSlug(params.get("case"));
    const matchedThread = THREADS.find((thread) => dealHrefFromCaseName(thread.caseName) === dealHrefFromSlug(slug));
    if (matchedThread) setSelectedThread(matchedThread);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Intelligence Hub</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Omnichannel CRM</span>
          </div>
          <h1 className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-3xl sm:text-4xl font-black uppercase tracking-tighter font-headline text-[#F5F0E8]">
            <span className="flex items-center gap-3">
              Comms Command
              <ScreenInfoTip content={SCREEN_HELP.comms} />
            </span>
            <span className="flex items-center gap-2 rounded-full border border-[#1D9E75]/20 bg-[#1D9E75]/10 px-3 py-1 text-[9px] font-black font-mono uppercase tracking-widest text-[#1D9E75]">
              <Sparkles size={12} />
              Preview channels
            </span>
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            Website, phone, email, and a WhatsApp placeholder all resolve into the same CRM story for the April preview.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">{visibleCompany}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">{visibleRoles}</span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.market.language}
            </span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            href={dealHrefFromSlug(PRIMARY_CASE.slug)}
            className="w-full sm:w-auto text-center rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Open {PRIMARY_CASE.destination} deal
          </Link>
          <button className="w-full sm:w-auto rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95">
            Reply draft queued
          </button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {SOURCE_SUMMARY.map((item) => (
          <MetricCard key={item.label} label={item.label} value={item.value} icon={item.icon} />
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-4 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Omnichannel Intake</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            These cards show how the preview captures demand from the same commercial channels your team already uses, then stores the outcome in one CRM lane.
          </p>
          <div className="space-y-3">
            {THREADS.map((thread) => (
              <button
                key={`${thread.channel}-${thread.guest}`}
                type="button"
                onClick={() => setSelectedThread(thread)}
                className={`w-full rounded-2xl border bg-[#0A0A0A] p-4 text-left transition-colors ${
                  selectedThread.channel === thread.channel && selectedThread.guest === thread.guest
                    ? "border-[#C9A84C]/30"
                    : "border-[#C9A84C]/10 hover:border-[#C9A84C]/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{thread.channel}</div>
                    <div className="mt-1 text-sm font-black text-[#F5F0E8]">{thread.guest}</div>
                  </div>
                  <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                    {thread.status}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{thread.note}</p>
                <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{thread.source}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Bot size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Sales Transcript</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            The preview uses a deterministic transcript so the rep can show how voice, message, and CRM context stay attached to the same lead.
          </p>
          <div className="mb-5 rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Current thread focus</div>
                <div className="mt-1 text-sm font-black text-[#F5F0E8]">{selectedThread.guest} · {selectedThread.caseName}</div>
              </div>
              <Link
                href={dealHrefFromCaseName(selectedThread.caseName)}
                className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
              >
                Open linked case
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <FocusField label="Channel" value={selectedThread.channel} />
              <FocusField label="Tone" value={selectedThread.tone} />
              <FocusField label="Status" value={selectedThread.status} />
            </div>
          </div>
          <div className="space-y-4">
            {ACTIVE_TRANSCRIPT.map((line, index) => (
              <div key={`${line.speaker}-${index}`} className={`flex gap-4 ${index % 2 === 1 ? "flex-row-reverse" : ""}`}>
                <Avatar icon={index % 2 === 1 ? Users : Bot} accent={index % 2 === 1 ? "bg-[#1D9E75]/10 text-[#1D9E75] border-[#1D9E75]/20" : "bg-[#C9A84C]/10 text-[#C9A84C] border-[#C9A84C]/20"} />
                <div className={`max-w-[85%] space-y-2 ${index % 2 === 1 ? "text-right" : ""}`}>
                  <div className={`text-[10px] font-black uppercase tracking-[0.2em] font-mono ${index % 2 === 1 ? "text-[#1D9E75]" : "text-[#C9A84C]"}`}>
                    {line.speaker} <span className="opacity-50">/ {line.channel}</span>
                  </div>
                  <div className={`rounded-3xl border px-5 py-4 text-sm leading-relaxed ${index % 2 === 1 ? "border-[#1D9E75]/15 bg-[#1D9E75]/8 text-[#F5F0E8]" : "border-[#C9A84C]/10 bg-[#0A0A0A] text-[#F5F0E8]"}`}>
                    {line.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="xl:col-span-3 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Clock3 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Follow-Up Queue</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            The queue is intentionally deterministic so you can walk the commercial handoff without depending on live messaging rails.
          </p>
          <div className="space-y-3">
            {FOLLOW_UP_QUEUE.map((item) => (
              <div key={item.caseName} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{item.guest}</div>
                    <div className="mt-1 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{item.caseName}</div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${item.urgency === "Critical" ? "border-red-400/20 bg-red-400/10 text-red-300" : "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"}`}>
                    {item.urgency}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{item.nextStep}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Preview Positioning</h2>
          </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">What this proves</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              The same lead can arrive from website, phone, email, or a transcript and still land in one commercial record with the right follow-up context.
            </p>
          </div>
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-2">Safe wording</div>
            <p className="text-sm leading-relaxed text-[#B8B0A0]">
              Use “deterministic CRM intake” and “preview-safe capture” instead of implying the messaging rails are already live in production.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Mail size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Outbound Quote Email Shell</h2>
          </div>
          <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">From</div>
                <div className="mt-1 text-sm font-black text-[#F5F0E8]">{brandTheme.supportEmail}</div>
                <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{workspaceDomain}</div>
              </div>
              <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">Brand</div>
                <div className="mt-1 text-sm font-black text-[#F5F0E8]">{brandTheme.enabled ? brandTheme.workspaceName : visibleCompany}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3">
              <CommsField label="Subject" value={`${selectedThread.caseName} · curated quote from ${brandTheme.enabled ? brandTheme.workspaceName : visibleCompany}`} />
              <CommsField label="Reply-to" value={brandTheme.supportEmail} />
              <CommsField label="Attachment" value={`${selectedThread.caseName} quote PDF · branded footer + settlement details`} />
            </div>
            <div className="mt-5 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm leading-relaxed text-[#B8B0A0]">
              The outbound quote now inherits the configured tenant brand, support inbox, workspace domain, and billing identity instead of a generic platform signature.
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Customer-Facing Footer</h2>
          </div>
          <div className="space-y-3">
            <CommsField label="Support" value={brandTheme.supportEmail} />
            <CommsField label="Workspace Domain" value={workspaceDomain} />
            <CommsField label="Beneficiary" value={profile.bankDetails.beneficiaryName} />
            <CommsField label="Bank / Routing" value={`${profile.bankDetails.bankName} · ${profile.bankDetails.routingCode}`} />
            <CommsField label="Billing Address" value={profile.bankDetails.billingAddress} />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        <Icon size={16} />
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-xs text-[#4A453E]">Seeded demo content</div>
    </div>
  );
}

function Avatar({
  icon: Icon,
  accent,
}: {
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${accent}`}>
      <Icon size={18} />
    </div>
  );
}

function CommsField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-relaxed text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function FocusField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[#F5F0E8]">{value}</div>
    </div>
  );
}
