"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeIndianRupee, Bot, CheckCircle2, Clock3, MessageSquare, Shield, Sparkles, Target } from "lucide-react";

import { apiUrl } from "@/lib/api";
import { dealHrefFromSlug } from "@/lib/demo-cases";
import { DEMO_DEAL_CASES, DEMO_LEAD_FALLBACK_MAP, PRIMARY_DEMO_DEAL_CASE, type DemoDealCase } from "@/lib/demo-case-profiles";
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from "@/lib/demo-profile";

export default function DealsClientPage() {
  const profile = useMemo(() => readDemoProfile(), []);
  const params = useSearchParams();
  const leadParam = params.get("lead") ?? "1";
  const resolvedSlug = params.get("case") ?? DEMO_LEAD_FALLBACK_MAP[leadParam] ?? PRIMARY_DEMO_DEAL_CASE.slug;
  const slugParam = DEMO_DEAL_CASES[resolvedSlug] ? resolvedSlug : PRIMARY_DEMO_DEAL_CASE.slug;

  const [data, setData] = useState<DemoDealCase | null>(null);
  const [loading, setLoading] = useState(true);
  const fallbackActivated = resolvedSlug !== slugParam;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/demo/case/${slugParam}`));
        const json = await res.json();
        if (!cancelled) {
          const fallback = DEMO_DEAL_CASES[slugParam];
          setData(json?.slug ? { ...fallback, ...json, capture: fallback.capture } : fallback);
        }
      } catch {
        if (!cancelled) setData(DEMO_DEAL_CASES[slugParam]);
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
    return <div className="text-[#F5F0E8] font-mono text-sm">Loading alpha case...</div>;
  }

  if (!data) {
    const fallback = PRIMARY_DEMO_DEAL_CASE;
    return (
      <div className="space-y-4 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <p className="text-red-400 font-mono text-sm">Preview case unavailable. Loading the primary {fallback.triage.destination} showcase instead.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={dealHrefFromSlug(fallback.slug)} className="rounded-full border border-[#C9A84C]/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#C9A84C]">
            Open {fallback.guest_name}
          </Link>
          <Link href="/dashboard/autopilot" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#B8B0A0]">
            Back to Autopilot
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-[#C9A84C]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C]">Alpha Deal Intelligence</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tight text-[#F5F0E8]">{data.guest_name}</h1>
          <p className="text-[#B8B0A0] text-sm mt-2">{data.organization} · {data.triage.destination} · {data.triage.duration_days} days</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">
              {profile.company || DEFAULT_DEMO_PROFILE.company}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ")}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency} · {profile.market.gateway}
            </span>
          </div>
        </div>
        <Link href="/dashboard/autopilot" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[#C9A84C] text-xs uppercase tracking-widest font-black">
          Back to Autopilot <ArrowRight size={12} />
        </Link>
      </header>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C] mb-2">Resolved Alpha Case</div>
            <h2 className="text-lg font-black text-[#F5F0E8]">{data.guest_name} · {data.triage.destination}</h2>
            <p className="mt-2 text-sm text-[#B8B0A0] leading-relaxed">
              This screen is the conversion layer in the alpha story: capture, triage, quote, supplier alignment, finance, then booking handoff.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1.5 text-[#C9A84C]">Case {slugParam}</span>
            <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[#B8B0A0]">Lead #{data.lead_id}</span>
            <span className="rounded-full border border-white/10 bg-[#0A0A0A] px-3 py-1.5 text-[#B8B0A0]">
              {fallbackActivated ? "Fallback route used" : "Primary route resolved"}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C] mb-2">Case Orchestration</div>
            <h2 className="text-xl font-black text-[#F5F0E8]">One deal, five coordinated layers</h2>
            <p className="mt-2 text-sm text-[#B8B0A0] leading-relaxed">
              This is the stitched operating view: CRM capture, itinerary intelligence, supplier normalization, finance control, and execution readiness around one traveler case.
            </p>
          </div>
          <Link
            href="/dashboard/dmc"
            className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-4 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
          >
            Next: Open DMC Hub
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "CRM", detail: "Inbound source, contact context, transcript", state: "Ready" },
            { label: "Itinerary", detail: data.itinerary.title, state: "Drafted" },
            { label: "Supplier", detail: data.bidding.vendor, state: data.bidding.status },
            { label: "Finance", detail: `Margin ${data.finance.margin_percent}%`, state: data.finance.status },
            { label: "Execution", detail: "Awaiting deposit + ops release", state: "Staged" },
          ].map((step) => (
            <div key={step.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">{step.label}</div>
              <div className="mt-2 text-sm font-semibold text-[#F5F0E8] leading-relaxed">{step.detail}</div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{step.state}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { label: "1 Capture", href: `/dashboard/leads?case=${slugParam}` },
            { label: "2 Deal", href: `/dashboard/deals?case=${slugParam}` },
            { label: "3 Finance", href: "/dashboard/finance" },
            { label: "4 DMC", href: "/dashboard/dmc" },
            { label: "5 Execution", href: "/dashboard/bookings" },
          ].map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0] hover:border-[#C9A84C]/20 hover:text-[#F5F0E8] transition-colors"
            >
              {step.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Quote Value" value={`₹${data.finance.quote_total.toLocaleString("en-IN")}`} icon={<BadgeIndianRupee size={16} />} />
        <StatCard label="Gross Profit" value={`₹${data.finance.gross_profit.toLocaleString("en-IN")}`} icon={<Target size={16} />} />
        <StatCard label="Margin" value={`${data.finance.margin_percent}%`} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Deposit Due" value={`₹${data.finance.deposit_due.toLocaleString("en-IN")}`} icon={<Shield size={16} />} />
      </div>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_0.9fr]">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Commercial Rationale</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed">
            <DealNarrativeCard label="Why this case is attractive" value={data.triage.reasoning} />
            <DealNarrativeCard label="Why this itinerary should convert" value={data.itinerary.agent_reasoning ?? "AI itinerary reasoning not available for this case."} />
            <DealNarrativeCard label="What the human should say next" value={data.communications.suggested_follow_up} />
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Vendor Comparison</h2>
          </div>
          <div className="space-y-3">
            {data.bidding.options.map((option) => (
              <div key={option.vendor} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-[#F5F0E8]">{option.vendor}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#C9A84C]">{option.position}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-[#C9A84C]">₹{option.net_rate.toLocaleString("en-IN")}</div>
                    <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">Net rate</div>
                  </div>
                </div>
                <div className="mt-3 text-xs leading-relaxed text-[#B8B0A0]">{option.decision}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Approval Guardrails</h2>
          </div>
          <div className="space-y-3">
            <GuardrailRow
              label="Confidence threshold"
              state={`${Math.round(data.triage.confidence_score * 100)}% ready`}
              note="Triage quality is high enough to send the case into quote review."
            />
            <GuardrailRow
              label="Margin check"
              state={data.finance.margin_percent >= 18 ? "Within target" : "Needs approval"}
              note="Commercial guardrail keeps the quote from slipping below protected margin."
            />
            <GuardrailRow
              label="Vendor position"
              state={data.bidding.status}
              note={data.bidding.note}
            />
            <GuardrailRow
              label="Next deadline"
              state={data.finance.status}
              note={`Deposit due: ₹${data.finance.deposit_due.toLocaleString("en-IN")} before release into execution.`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">Omnichannel CRM Intake</h2>
        </div>
        <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">
          Website, WhatsApp, email, and phone-call transcripts are captured into the same CRM record so the handoff never loses context.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Website", value: data.capture.website },
            { label: "WhatsApp", value: data.capture.whatsapp },
            { label: "Email", value: data.capture.email },
            { label: "Phone", value: data.capture.phone },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{item.label}</div>
              <div className="text-sm text-[#F5F0E8] leading-relaxed">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {data.capture.transcript.map((line, index) => (
            <div key={index} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 text-sm text-[#F5F0E8] leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Lead Understanding</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">{data.query}</p>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
          <Link
            href="/dashboard/finance"
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]"
          >
            Open Finance Control <ArrowRight size={12} />
          </Link>
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

function DealNarrativeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[10px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{value}</div>
    </div>
  );
}

function GuardrailRow({ label, state, note }: { label: string; state: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
          <div className="mt-2 text-sm font-black text-[#F5F0E8]">{state}</div>
        </div>
        <Clock3 size={14} className="text-[#C9A84C]" />
      </div>
      <div className="mt-3 text-xs leading-relaxed text-[#B8B0A0]">{note}</div>
    </div>
  );
}
