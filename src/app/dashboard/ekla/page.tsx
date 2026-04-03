"use client";

import React from "react";
import Link from "next/link";
import { PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";
import { dealHrefFromSlug } from "@/lib/demo-cases";
import {
  ArrowRight,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Globe2,
  MessageSquare,
  Mic,
  PhoneCall,
  Shield,
  Sparkles,
  Target,
  Users,
  Workflow,
} from "lucide-react";

const EKLA_LOOPS = [
  {
    title: "Capture to CRM",
    icon: Globe2,
    detail: "Website forms, WhatsApp, inbound email, phone-call transcripts, and pasted sales notes all become one operating object automatically.",
    signal: "Live demo lane",
  },
  {
    title: "Quote & Itinerary",
    icon: Brain,
    detail: "Ekla drafts the commercial response, trip plan, next message, and operator recommendation before a manager touches the file.",
    signal: "Margin-aware",
  },
  {
    title: "Follow-up & Recovery",
    icon: MessageSquare,
    detail: "The system schedules reminders, escalates stalled deposits, and pushes only the risky cases into human review.",
    signal: "Human only where needed",
  },
  {
    title: "Execution & Finance",
    icon: CreditCard,
    detail: "Ops tasks, service handoffs, and finance checkpoints stay in the same loop so the agency is not split across tools.",
    signal: "Single operating spine",
  },
];

const AGENCY_STACK = [
  {
    role: "Agency Owner",
    coverage: "Sees one line of truth: what converted, what is at risk, and what needs intervention.",
    metric: "9 min/day review",
  },
  {
    role: "Sales Team",
    coverage: "Only receives leads that require judgment, negotiation, or high-touch relationship work.",
    metric: "72% auto-prepared",
  },
  {
    role: "Operations Team",
    coverage: "Executes holds, confirmations, and supplier tasks from the same case context without chasing WhatsApp threads.",
    metric: "1 workspace",
  },
  {
    role: "Finance Desk",
    coverage: "Reads deposit state, margin guardrails, and payout checkpoints from the same commercial object.",
    metric: "No handoff loss",
  },
];

const MONDAY_STORY = [
  {
    step: "1. Raw demand enters",
    body: "A website lead, phone transcript, email, or WhatsApp message lands in the same intake lane.",
    icon: Mic,
  },
  {
    step: "2. Ekla assembles",
    body: "The autonomous operator drafts the triage, itinerary, quote, and suggested follow-up without waiting for a human queue.",
    icon: Bot,
  },
  {
    step: "3. Human approves only where needed",
    body: "Risky or premium cases escalate to sales, ops, or finance while routine movement continues in the background.",
    icon: Shield,
  },
  {
    step: "4. Agency runs as a system",
    body: "The founder sees a business that behaves like operating software, not a collection of disconnected people and chats.",
    icon: Workflow,
  },
];

const ACTIVE_SIGNALS = [
  { label: "Website intake", state: "Automated", icon: Globe2 },
  { label: "Phone transcript", state: "Normalized", icon: PhoneCall },
  { label: "WhatsApp placeholder", state: "Demo-safe", icon: MessageSquare },
  { label: "Quote assembly", state: "Prepared", icon: Target },
  { label: "Finance guardrail", state: "Active", icon: CreditCard },
  { label: "Ops handoff", state: "Sequenced", icon: Users },
];

export default function EklaPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Ekla</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Autonomous Agency Operator</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-[#F5F0E8] font-headline">Run The Agency On Its Own</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            Ekla is the preview expression of NAMA’s core idea: the travel agency should run like an operating system.
            It captures raw demand, assembles the commercial response, sequences follow-ups, and escalates only the parts that still need people.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/autopilot"
            className="rounded-xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-[#C9A84C] transition-all hover:bg-[#C9A84C]/10"
          >
            Back to Autopilot
          </Link>
          <Link
            href={dealHrefFromSlug(PRIMARY_DEMO_DEAL_CASE.slug)}
            className="rounded-xl bg-[#C9A84C] px-5 py-3 text-[10px] font-black uppercase tracking-widest text-[#0A0A0A] shadow-[0_0_20px_rgba(201,168,76,0.2)] transition-all hover:scale-105 active:scale-95"
          >
            Open {PRIMARY_DEMO_DEAL_CASE.triage.destination} Deal
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Autonomous Coverage" value="78%" sub="Routine agency work staged by Ekla" icon={<Bot size={16} />} />
        <MetricCard label="Human Escalation" value="22%" sub="Only premium, risky, or exception work" icon={<Shield size={16} />} />
        <MetricCard label="Channels Unified" value="05" sub="Website, phone, email, WhatsApp, transcript" icon={<Globe2 size={16} />} />
        <MetricCard label="Preview Story" value="Ready" sub="Built to land fast in the walkthrough" icon={<Sparkles size={16} />} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-7 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">What Ekla Does End To End</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {EKLA_LOOPS.map((loop) => (
              <div key={loop.title} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]">
                    <loop.icon size={16} />
                  </div>
                  <span className="rounded-full border border-[#1D9E75]/20 bg-[#1D9E75]/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#1D9E75]">
                    {loop.signal}
                  </span>
                </div>
                <div className="text-sm font-black text-[#F5F0E8]">{loop.title}</div>
                <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{loop.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <aside className="xl:col-span-5 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Clock3 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">How To Pitch It In The Preview</h2>
          </div>
          <div className="space-y-4">
            {MONDAY_STORY.map((item) => (
              <div key={item.step} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="mb-2 flex items-center gap-2 text-[#C9A84C]">
                  <item.icon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.step}</span>
                </div>
                <div className="text-sm leading-relaxed text-[#B8B0A0]">{item.body}</div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <Building2 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Who Gets Replaced By Waiting</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            Ekla does not remove the team. It removes the dead time between teams. That is the impact story for agencies, DMCs, and tour operators.
          </p>
          <div className="space-y-3">
            {AGENCY_STACK.map((item) => (
              <div key={item.role} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{item.role}</div>
                    <div className="mt-1 text-sm leading-relaxed text-[#B8B0A0]">{item.coverage}</div>
                  </div>
                  <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">
                    {item.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="mb-5 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Active Control Signals</h2>
          </div>
          <p className="mb-5 text-sm leading-relaxed text-[#B8B0A0]">
            These are the operating signals you can point at live to make Ekla feel real without claiming unsupported provider automation.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIVE_SIGNALS.map((signal) => (
              <div key={signal.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
                  <signal.icon size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{signal.label}</span>
                </div>
                <div className="text-sm font-black text-[#F5F0E8]">{signal.state}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#111111] p-4 text-sm leading-relaxed text-[#B8B0A0]">
            Safe line for the preview: “Ekla is the operating layer that makes the agency move on its own. This walkthrough shows deterministic cases and control loops, not live third-party credentials.”
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, sub, icon }: { label: string; value: string; sub: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="mb-3 flex items-center gap-2 text-[#C9A84C]">
        {icon}
        <span className="text-[10px] uppercase tracking-widest font-mono">{label}</span>
      </div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
      <div className="mt-1 text-sm text-[#B8B0A0]">{sub}</div>
    </div>
  );
}
