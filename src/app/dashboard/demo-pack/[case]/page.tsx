"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ChevronRight, FileText, Mail, PackageOpen, Printer, Receipt, Share2, ShieldCheck } from "lucide-react";

import { DEMO_DEAL_CASES, PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";
import { normalizeDemoCaseSlug } from "@/lib/demo-cases";
import { getDemoBrandTheme, getDemoWorkspaceDomain, readDemoProfile } from "@/lib/demo-profile";

export default function DemoPackPage() {
  const params = useParams<{ case: string }>();
  const profile = useMemo(() => readDemoProfile(), []);
  const [packState, setPackState] = useState<"Draft" | "Shared" | "Sent">("Draft");
  const [shareMessage, setShareMessage] = useState("Use this bundle as a founder-ready pack after a seeded scenario or smoke run.");
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const slug = normalizeDemoCaseSlug(Array.isArray(params.case) ? params.case[0] : params.case);
  const deal = DEMO_DEAL_CASES[slug] ?? PRIMARY_DEMO_DEAL_CASE;
  const auditReportHref = `/dashboard/admin/audit-report?tenant=${encodeURIComponent(profile.company)}&case=${encodeURIComponent(slug)}`;

  async function handleCopyPackLinks() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setShareMessage("Clipboard is unavailable in this environment.");
      return;
    }
    const summary = [
      `Demo pack for ${deal.guest_name}`,
      `Invoice: /dashboard/invoices/${slug}`,
      `Traveler PDF: /dashboard/traveler-pdf/${slug}`,
      `Audit report: ${auditReportHref}`,
    ].join("\n");
    await navigator.clipboard.writeText(summary);
    setPackState("Shared");
    setShareMessage("Demo pack links copied for founder sharing.");
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B6A1F]">
              <span>Founder Demo Pack</span>
              <ChevronRight size={10} />
              <span className="opacity-60">{deal.triage.destination}</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Demo Pack</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              One founder-facing bundle for this case: invoice, traveler PDF, and audit report with the same tenant identity.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/artifacts" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <ArrowLeft size={14} />
              Back to Artifact Hub
            </Link>
            <button
              type="button"
              onClick={handleCopyPackLinks}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600"
            >
              <Share2 size={14} />
              Copy Pack Links
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(`NAMA demo pack - ${deal.guest_name}`)}&body=${encodeURIComponent(`Sharing the demo pack for ${deal.guest_name}.\nInvoice: /dashboard/invoices/${slug}\nTraveler PDF: /dashboard/traveler-pdf/${slug}\nAudit report: ${auditReportHref}`)}`}
              onClick={() => setPackState("Sent")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600"
            >
              <Mail size={14} />
              Email Pack
            </a>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
            >
              <Printer size={14} />
              Print Pack
            </button>
          </div>
        </div>

        <div className="rounded-[36px] border border-[#C9A84C]/20 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="grid gap-6 border-b border-slate-200 pb-8 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="flex items-center gap-2 text-[#8B6A1F]">
                <PackageOpen size={15} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Bundle Summary</span>
              </div>
              <div className="mt-4 text-3xl font-black tracking-tight">{deal.guest_name}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">
                {deal.organization} · {deal.triage.destination} · {deal.triage.travel_dates}
              </div>
              <div className="mt-4 text-sm leading-relaxed text-slate-600">
                Brand: {brandTheme.enabled ? brandTheme.workspaceName : profile.company} · {workspaceDomain}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PackStat label="Invoice" value="Included" />
              <PackStat label="Traveler PDF" value="Included" />
              <PackStat label="Audit Report" value="Included" />
              <PackStat label="Support" value={brandTheme.supportEmail} />
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <PackState label="Pack State" value={packState} />
            <PackState label="Workspace" value={brandTheme.enabled ? brandTheme.workspaceName : profile.company} />
            <PackState label="Case" value={slug} />
          </div>
          <div className="mt-4 rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#FFF8E8] p-4 text-sm leading-relaxed text-slate-600">
            {shareMessage}
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <PackCard
              icon={<Receipt size={16} className="text-[#8B6A1F]" />}
              title="Branded Invoice"
              detail="Commercial proof with remittance identity, support contact, and invoice state."
              href={`/dashboard/invoices/${slug}`}
              cta="Open Invoice"
            />
            <PackCard
              icon={<FileText size={16} className="text-[#8B6A1F]" />}
              title="Traveler PDF"
              detail="Customer-facing itinerary shell carrying the same tenant brand and support identity."
              href={`/dashboard/traveler-pdf/${slug}`}
              cta="Open Traveler PDF"
            />
            <PackCard
              icon={<ShieldCheck size={16} className="text-[#8B6A1F]" />}
              title="Audit Report"
              detail="Founder-safe event proof for this tenant and case, ready to print or email."
              href={auditReportHref}
              cta="Open Audit Report"
            />
          </div>

          <div className="mt-8 rounded-3xl border border-dashed border-[#C9A84C]/20 bg-[#FFF8E8] p-5 text-sm leading-relaxed text-slate-600">
            Use this pack when you want a single founder-ready checkpoint after a smoke run or seeded scenario. It gives you the commercial artifact, traveler artifact, and system proof in one place.
          </div>
        </div>
      </div>
    </div>
  );
}

function PackStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-black text-[#0F172A]">{value}</div>
    </div>
  );
}

function PackState({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/15 bg-[#FFF8E8] p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-sm font-black text-[#0F172A]">
        <CheckCircle2 size={12} className="text-[#8B6A1F]" />
        {value}
      </div>
    </div>
  );
}

function PackCard({
  icon,
  title,
  detail,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-sm font-black text-[#0F172A]">{title}</div>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-slate-600">{detail}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#8B6A1F]">
        {cta}
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
