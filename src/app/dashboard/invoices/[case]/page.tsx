"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeIndianRupee, CheckCircle2, ChevronRight, Download, Landmark, Mail, Receipt, Shield } from "lucide-react";

import { DEMO_DEAL_CASES, PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";
import { getDemoBrandTheme, getDemoWorkspaceDomain, readDemoProfile } from "@/lib/demo-profile";
import { normalizeDemoCaseSlug } from "@/lib/demo-cases";

function formatAmount(amount: number) {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function InvoicePage() {
  const params = useParams<{ case: string }>();
  const profile = useMemo(() => readDemoProfile(), []);
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const slug = normalizeDemoCaseSlug(Array.isArray(params.case) ? params.case[0] : params.case);
  const deal = DEMO_DEAL_CASES[slug] ?? PRIMARY_DEMO_DEAL_CASE;
  const balanceDue = deal.finance.quote_total - deal.finance.deposit_due;

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B6A1F]">
              <span>Customer Artifact</span>
              <ChevronRight size={10} />
              <span className="opacity-60">Branded Invoice</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Invoice Route</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              This is a dedicated invoice-style route using the same tenant brand, support contact, workspace domain, and bank profile captured in onboarding.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/finance" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <ArrowLeft size={14} />
              Back to Finance
            </Link>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">
              <Download size={14} />
              Download Invoice
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#0F172A]/10 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#0F172A]"
            >
              <Receipt size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="print-shell rounded-[36px] border border-[#C9A84C]/25 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-black text-[#0A0A0A]" style={{ backgroundColor: brandTheme.accentHex }}>
                {brandTheme.badgeGlyph}
              </div>
              <div>
                <div className="text-2xl font-black tracking-tight">{brandTheme.enabled ? brandTheme.workspaceName : profile.company}</div>
                <div className="mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{workspaceDomain}</div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div>{profile.bankDetails.billingAddress}</div>
                  <div>{brandTheme.supportEmail}</div>
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Invoice Ref</div>
              <div className="mt-1 text-xl font-black text-[#0F172A]">INV-{deal.lead_id.toString().padStart(4, "0")}</div>
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Status</div>
              <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-[#1D9E75]/20 bg-[#1D9E75]/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#1D9E75]">
                <CheckCircle2 size={12} />
                Preview Issued
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-b border-slate-200 py-8 md:grid-cols-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Bill To</div>
              <div className="mt-2 text-lg font-black text-[#0F172A]">{deal.guest_name}</div>
              <div className="mt-1 text-sm text-slate-600">{deal.organization}</div>
              <div className="mt-3 text-sm leading-relaxed text-slate-600">
                {deal.triage.destination} itinerary and service confirmation for {deal.triage.travelers_count} traveler{deal.triage.travelers_count > 1 ? "s" : ""}.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InvoiceMeta label="Travel Window" value={deal.triage.travel_dates} />
              <InvoiceMeta label="Payment Rail" value={profile.market.gateway} />
              <InvoiceMeta label="Support Inbox" value={brandTheme.supportEmail} />
              <InvoiceMeta label="Workspace Domain" value={workspaceDomain} />
            </div>
          </div>

          <div className="py-8">
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="grid grid-cols-[1.3fr_0.7fr_0.6fr] bg-slate-50 px-5 py-4 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                <span>Description</span>
                <span>State</span>
                <span className="text-right">Amount</span>
              </div>
              <div className="divide-y divide-slate-200">
                <InvoiceRow label={`${deal.triage.destination} travel program`} state="Confirmed scope" amount={formatAmount(deal.finance.quote_total)} />
                <InvoiceRow label="Deposit requested for hold and release" state="Due now" amount={formatAmount(deal.finance.deposit_due)} />
                <InvoiceRow label="Balance payable before final dispatch" state="Staged" amount={formatAmount(balanceDue)} />
              </div>
            </div>
          </div>

          <div className="grid gap-6 border-t border-slate-200 pt-8 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center gap-2 text-[#8B6A1F]">
                  <Landmark size={14} />
                  <span className="text-[10px] font-black uppercase tracking-[0.24em]">Remittance Details</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InvoiceMeta label="Beneficiary" value={profile.bankDetails.beneficiaryName} />
                  <InvoiceMeta label="Bank" value={profile.bankDetails.bankName} />
                  <InvoiceMeta label="Branch" value={profile.bankDetails.branchName} />
                  <InvoiceMeta label="Account Type" value={profile.bankDetails.accountType} />
                  <InvoiceMeta label="Account Number" value={profile.bankDetails.accountNumber} />
                  <InvoiceMeta label="IFSC / SWIFT" value={profile.bankDetails.routingCode} />
                </div>
              </div>
              <div className="rounded-3xl border border-dashed border-[#C9A84C]/30 bg-[#FFF8E8] p-5 text-sm leading-relaxed text-slate-600">
                This invoice route is preview-safe, but the settlement identity is now consistent with onboarding, finance, bookings, quote, comms, and traveler export surfaces.
              </div>
            </div>

            <div className="rounded-3xl border border-[#0F172A]/10 bg-[#0F172A] p-6 text-white">
              <div className="mb-4 flex items-center gap-2 text-[#C9A84C]">
                <Receipt size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Summary</span>
              </div>
              <div className="space-y-4">
                <InvoiceTotal label="Quoted Total" value={formatAmount(deal.finance.quote_total)} />
                <InvoiceTotal label="Deposit Now" value={formatAmount(deal.finance.deposit_due)} />
                <InvoiceTotal label="Balance Later" value={formatAmount(balanceDue)} muted />
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-slate-300">
                Reach us at {brandTheme.supportEmail} for remittance confirmation, invoice questions, or itinerary release support.
              </div>
              <Link href={`/dashboard/traveler-pdf/${deal.slug}`} className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">
                Open Traveler PDF Route
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

function InvoiceRow({ label, state, amount }: { label: string; state: string; amount: string }) {
  return (
    <div className="grid grid-cols-[1.3fr_0.7fr_0.6fr] px-5 py-4 text-sm">
      <span className="font-semibold text-[#0F172A]">{label}</span>
      <span className="text-slate-500">{state}</span>
      <span className="text-right font-black text-[#0F172A]">{amount}</span>
    </div>
  );
}

function InvoiceMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-relaxed text-[#0F172A]">{value}</div>
    </div>
  );
}

function InvoiceTotal({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 pb-3">
      <span className={`text-sm ${muted ? "text-slate-400" : "text-white"}`}>{label}</span>
      <span className={`text-lg font-black ${muted ? "text-slate-300" : "text-[#C9A84C]"}`}>{value}</span>
    </div>
  );
}
