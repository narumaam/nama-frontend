"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Download, FileText, MapPin, Phone, Sparkles, Users } from "lucide-react";

import { DEMO_DEAL_CASES, PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";
import { getDemoBrandTheme, getDemoWorkspaceDomain, readDemoProfile } from "@/lib/demo-profile";
import { normalizeDemoCaseSlug } from "@/lib/demo-cases";

export default function TravelerPdfPage() {
  const params = useParams<{ case: string }>();
  const profile = useMemo(() => readDemoProfile(), []);
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const slug = normalizeDemoCaseSlug(Array.isArray(params.case) ? params.case[0] : params.case);
  const deal = DEMO_DEAL_CASES[slug] ?? PRIMARY_DEMO_DEAL_CASE;
  const [deliveryState, setDeliveryState] = useState<"Draft" | "Shared" | "Downloaded">("Draft");
  const [approvalState, setApprovalState] = useState<"Awaiting approval" | "Approved for send">("Awaiting approval");

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B6A1F]">
              <span>Customer Artifact</span>
              <ChevronRight size={10} />
              <span className="opacity-60">Traveler PDF Route</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Traveler PDF Route</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              This route is the branded traveler-facing itinerary shell, tied to the same tenant profile and support identity as the rest of the alpha flow.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/itineraries" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <ArrowLeft size={14} />
              Back to Itineraries
            </Link>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">
              <Download size={14} />
              Download PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0F172A]/10 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0F172A]"
            >
              <FileText size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="print-shell rounded-[36px] border border-[#C9A84C]/25 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="print-hidden border-b border-slate-200 px-8 py-6">
            <div className="grid gap-3 md:grid-cols-4">
              <ArtifactStatusCard label="Traveler PDF" value={deliveryState} />
              <ArtifactStatusCard label="Approval" value={approvalState} />
              <button type="button" onClick={() => setApprovalState("Approved for send")} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
                Approve for send
              </button>
              <button type="button" onClick={() => setDeliveryState("Shared")} className="rounded-2xl border border-[#C9A84C]/20 bg-[#FFF8E8] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#8B6A1F]">
                Mark shared
              </button>
            </div>
          </div>
          <div className="bg-[#0F172A] px-8 py-8 text-white">
            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-[#0A0A0A]" style={{ backgroundColor: brandTheme.accentHex }}>
                    {brandTheme.badgeGlyph}
                  </div>
                  <div>
                    <div className="text-2xl font-black uppercase tracking-tight">{brandTheme.enabled ? brandTheme.workspaceName : profile.company}</div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">{workspaceDomain}</div>
                  </div>
                </div>
                <h2 className="mt-8 text-4xl font-black uppercase tracking-tight">{deal.itinerary.title}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">
                  Curated for {deal.guest_name}. This traveler-facing itinerary keeps the same brand, support, and billing identity used throughout the workspace.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">Support</div>
                <div className="mt-1 text-sm font-semibold">{brandTheme.supportEmail}</div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">Travel Window</div>
                <div className="mt-1 text-sm font-semibold">{deal.triage.travel_dates}</div>
                <div className="mt-4 text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">Release State</div>
                <div className="mt-1 text-sm font-semibold">{deliveryState}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-slate-200 px-8 py-8 md:grid-cols-4">
            <PdfMeta icon={<MapPin size={14} className="text-[#8B6A1F]" />} label="Destination" value={deal.triage.destination} />
            <PdfMeta icon={<CalendarDays size={14} className="text-[#8B6A1F]" />} label="Duration" value={`${deal.triage.duration_days} days`} />
            <PdfMeta icon={<Users size={14} className="text-[#8B6A1F]" />} label="Travelers" value={`${deal.triage.travelers_count}`} />
            <PdfMeta icon={<Sparkles size={14} className="text-[#8B6A1F]" />} label="Style" value={deal.triage.style} />
          </div>

          <div className="px-8 py-8">
            <div className="grid gap-5">
              {deal.itinerary.days.map((day) => (
                <div key={day.day_number} className="print-page-break rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">Day {day.day_number}</div>
                      <h3 className="mt-2 text-2xl font-black tracking-tight text-[#0F172A]">{day.title}</h3>
                      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{day.narrative}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Day Value</div>
                      <div className="mt-1 text-lg font-black text-[#0F172A]">
                        ₹{day.blocks.reduce((sum, block) => sum + block.price_gross, 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {day.blocks.map((block, index) => (
                      <div key={`${block.title}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">{block.type}</div>
                        <div className="mt-1 text-sm font-black text-[#0F172A]">{block.title}</div>
                        <div className="mt-2 text-sm leading-relaxed text-slate-600">{block.description}</div>
                        <div className="mt-3 text-sm font-black text-[#0F172A]">₹{block.price_gross.toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 border-t border-slate-200 px-8 py-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="mb-4 flex items-center gap-2 text-[#8B6A1F]">
                <Phone size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Traveler Support</span>
              </div>
              <div className="space-y-3">
                <PdfField label="Support Email" value={brandTheme.supportEmail} />
                <PdfField label="Workspace Domain" value={workspaceDomain} />
                <PdfField label="Payment Rail" value={profile.market.gateway} />
              </div>
            </div>
            <div className="rounded-3xl border border-[#0F172A]/10 bg-[#0F172A] p-6 text-white">
              <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
                <FileText size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Footer & Billing Identity</span>
              </div>
              <div className="space-y-3">
                <div className="text-sm font-semibold">{profile.bankDetails.beneficiaryName}</div>
                <div className="text-sm text-slate-300">{profile.bankDetails.bankName} · {profile.bankDetails.routingCode}</div>
                <div className="text-sm leading-relaxed text-slate-300">{profile.bankDetails.billingAddress}</div>
              </div>
              <Link href={`/dashboard/invoices/${deal.slug}`} className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
                Open Branded Invoice Route
                <ChevronRight size={12} />
              </Link>
              <Link href="/dashboard/artifacts" className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/80 print-hidden">
                Back to Artifact Hub
                <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PdfMeta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-sm font-black text-[#0F172A]">{value}</div>
    </div>
  );
}

function PdfField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-relaxed text-[#0F172A]">{value}</div>
    </div>
  );
}

function ArtifactStatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-[#0F172A]">{value}</div>
    </div>
  );
}
