"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Download, FileText, PackageOpen, Receipt, Sparkles } from "lucide-react";

import { DEMO_DEAL_CASES } from "@/lib/demo-case-profiles";
import { getDemoBrandTheme, getDemoWorkspaceDomain, readDemoProfile } from "@/lib/demo-profile";
import { useDemoWorkflow } from "@/lib/use-demo-workflow";

const ARTIFACT_CASES = Object.values(DEMO_DEAL_CASES);

export default function ArtifactHubPage() {
  const profile = readDemoProfile();
  const workflow = useDemoWorkflow();
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const [selectedSlug, setSelectedSlug] = useState(ARTIFACT_CASES[0]?.slug ?? "");
  const selectedCase = ARTIFACT_CASES.find((item) => item.slug === selectedSlug) ?? ARTIFACT_CASES[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C]">
            <span>Customer Artifacts</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Invoice + Traveler PDF Hub</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[#F5F0E8] font-headline">Artifact Hub</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            Use this hub to open branded invoice and traveler PDF routes by case. Every artifact inherits the same tenant brand, support inbox, domain, and settlement identity.
          </p>
        </div>
        <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">Active Brand</div>
          <div className="mt-1 text-sm font-black text-[#F5F0E8]">{brandTheme.enabled ? brandTheme.workspaceName : profile.company}</div>
          <div className="mt-1 text-[10px] font-mono uppercase tracking-widest text-[#4A453E]">{workspaceDomain}</div>
        </div>
      </header>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Quick Jump</div>
            <p className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">
              Pick a case and jump straight into the invoice or traveler PDF without walking through Finance or Bookings first.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedSlug}
              onChange={(event) => setSelectedSlug(event.target.value)}
              className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8] outline-none"
            >
              {ARTIFACT_CASES.map((deal) => (
                <option key={deal.slug} value={deal.slug} className="bg-[#111111] text-[#F5F0E8]">
                  {deal.triage.destination}
                </option>
              ))}
            </select>
            <Link href={`/dashboard/invoices/${selectedCase.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
              <Receipt size={14} />
              Open Invoice
            </Link>
            <Link href={`/dashboard/traveler-pdf/${selectedCase.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]">
              <FileText size={14} />
              Open PDF
            </Link>
            <Link href={`/dashboard/demo-pack/${selectedCase.slug}`} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-[#0A0A0A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8]">
              <PackageOpen size={14} />
              Open Demo Pack
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {ARTIFACT_CASES.map((deal) => (
          <article key={deal.slug} className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">{deal.triage.destination}</div>
                <h2 className="mt-2 text-xl font-black text-[#F5F0E8]">{deal.guest_name}</h2>
                <div className="mt-1 text-sm text-[#B8B0A0]">{deal.organization}</div>
              </div>
              <span className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#B8B0A0]">
                {deal.priority}
              </span>
            </div>

            <div className="space-y-3">
              <ArtifactMeta label="Quote Total" value={`₹${deal.finance.quote_total.toLocaleString("en-IN")}`} />
              <ArtifactMeta label="Travel Window" value={deal.triage.travel_dates} />
              <ArtifactMeta label="Support" value={brandTheme.supportEmail} />
              <ArtifactMeta label="Invoice State" value={workflow.cases[deal.slug]?.invoiceState ?? "Draft"} />
              <ArtifactMeta label="Traveler PDF" value={workflow.cases[deal.slug]?.travelerPdfState ?? "Draft"} />
            </div>

            <div className="mt-5 grid gap-3">
              <Link
                href={`/dashboard/invoices/${deal.slug}`}
                className="flex items-center justify-between rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] transition-colors hover:border-[#C9A84C]/20"
              >
                <span className="flex items-center gap-2">
                  <Receipt size={14} className="text-[#C9A84C]" />
                  Branded Invoice
                </span>
                <ChevronRight size={14} className="text-[#C9A84C]" />
              </Link>
              <Link
                href={`/dashboard/traveler-pdf/${deal.slug}`}
                className="flex items-center justify-between rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] transition-colors hover:border-[#C9A84C]/20"
              >
                <span className="flex items-center gap-2">
                  <FileText size={14} className="text-[#C9A84C]" />
                  Traveler PDF
                </span>
                <ChevronRight size={14} className="text-[#C9A84C]" />
              </Link>
              <Link
                href={`/dashboard/demo-pack/${deal.slug}`}
                className="flex items-center justify-between rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] transition-colors hover:border-[#C9A84C]/20"
              >
                <span className="flex items-center gap-2">
                  <PackageOpen size={14} className="text-[#C9A84C]" />
                  Demo Pack
                </span>
                <ChevronRight size={14} className="text-[#C9A84C]" />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">What’s unified now</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <ArtifactMeta label="Brand Source" value={brandTheme.enabled ? brandTheme.workspaceName : profile.company} />
          <ArtifactMeta label="Workspace Domain" value={workspaceDomain} />
          <ArtifactMeta label="Settlement Identity" value={profile.bankDetails.beneficiaryName} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/dashboard/finance" className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
            Finance
          </Link>
          <Link href="/dashboard/bookings" className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
            Bookings
          </Link>
          <Link href="/dashboard/comms" className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
            Comms
          </Link>
          <Link href="/dashboard/itineraries" className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
            Itineraries
          </Link>
        </div>
      </section>
    </div>
  );
}

function ArtifactMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[9px] font-black uppercase tracking-widest text-[#4A453E]">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-relaxed text-[#F5F0E8]">{value}</div>
    </div>
  );
}
