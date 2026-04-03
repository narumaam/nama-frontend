"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, FileDown, Printer, ShieldCheck } from "lucide-react";

import { filterDemoEvents, type DemoEventCategory, type DemoEventRange, type DemoEventSeverity } from "@/lib/demo-events";
import { readDemoProfile } from "@/lib/demo-profile";
import { useDemoEvents } from "@/lib/use-demo-events";

export default function AuditReportPage() {
  return (
    <Suspense fallback={<AuditReportSkeleton />}>
      <AuditReportContent />
    </Suspense>
  );
}

function AuditReportContent() {
  const searchParams = useSearchParams();
  const events = useDemoEvents();
  const profile = useMemo(() => readDemoProfile(), []);
  const tenant = searchParams.get("tenant") || "All";
  const category = (searchParams.get("category") || "All") as DemoEventCategory;
  const caseSlug = searchParams.get("case") || "All";
  const severity = (searchParams.get("severity") || "All") as DemoEventSeverity | "All";
  const range = (searchParams.get("range") || "All") as DemoEventRange;

  const filteredEvents = useMemo(
    () =>
      filterDemoEvents(events, {
        tenant,
        category,
        caseSlug,
        severity,
        range,
      }),
    [caseSlug, category, events, range, severity, tenant]
  );

  const summary = useMemo(() => {
    return {
      total: filteredEvents.length,
      success: filteredEvents.filter((event) => event.severity === "success").length,
      warning: filteredEvents.filter((event) => event.severity === "warning").length,
      tenants: new Set(filteredEvents.map((event) => event.tenant)).size,
    };
  }, [filteredEvents]);

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A] print:bg-white">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="print-hidden flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#8B6A1F]">
              <span>Super Admin</span>
              <span>/</span>
              <span>Audit Report</span>
            </div>
            <h1 className="text-4xl font-black uppercase tracking-tight">Audit Report</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Founder-safe printable proof of tenant activity, filtered from the live Super Admin timeline.
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/admin" className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600">
              <ArrowLeft size={14} />
              Back to Admin
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0F172A] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white"
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>

        <div className="rounded-[36px] border border-[#C9A84C]/20 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#8B6A1F]">
                <ShieldCheck size={15} />
                <span className="text-[10px] font-black uppercase tracking-[0.24em]">Platform Audit Summary</span>
              </div>
              <div className="mt-4 text-3xl font-black tracking-tight">{profile.company}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-600">
                Filters: {tenant}, {category}, {caseSlug}, {severity}, {range}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReportStat label="Events" value={String(summary.total)} />
              <ReportStat label="Success" value={String(summary.success)} />
              <ReportStat label="Warnings" value={String(summary.warning)} />
              <ReportStat label="Tenants" value={String(summary.tenants)} />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <ReportNote
              title="Current view"
              detail={`This report focuses on ${tenant === "All" ? "all visible tenants" : tenant} and ${category === "All" ? "all activity types" : category} events.`}
            />
            <ReportNote
              title="Export intent"
              detail="Use this route for founder demos, customer follow-ups, or internal walkthrough proof after a seeded scenario or smoke test."
            />
            <ReportNote
              title="Source"
              detail="The events shown here come from the same shared demo state that powers registration, invites, finance, bookings, invoices, and traveler artifacts."
            />
          </div>

          <div className="mt-8 space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#C9A84C]/20 bg-[#FFF8E8] p-4 text-sm leading-relaxed text-slate-600">
                No audit events match the current filter set.
              </div>
            ) : (
              filteredEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="text-sm font-black text-[#0F172A]">{event.title}</div>
                      <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                        {event.tenant} · {event.createdAt}
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-slate-600">{event.detail}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {event.caseSlug && <ReportBadge text={event.caseSlug} tone="neutral" />}
                      <ReportBadge text={event.severity} tone={event.severity} />
                      {event.path && (
                        <Link href={event.path} className="print-hidden inline-flex items-center gap-1 rounded-full border border-[#C9A84C]/15 bg-white px-3 py-1 text-[9px] font-black uppercase tracking-widest text-[#8B6A1F]">
                          <FileDown size={10} />
                          Open
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AuditReportSkeleton() {
  return (
    <div className="min-h-screen bg-[#F5F0E8] px-6 py-10 text-[#0F172A]">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-[#C9A84C]/20 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">Audit Report</div>
        <div className="mt-4 text-3xl font-black tracking-tight">Loading report...</div>
      </div>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-[#0F172A]">{value}</div>
    </div>
  );
}

function ReportNote({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#8B6A1F]">{title}</div>
      <div className="mt-2 text-sm leading-relaxed text-slate-600">{detail}</div>
    </div>
  );
}

function ReportBadge({ text, tone }: { text: string; tone: "success" | "warning" | "info" | "neutral" }) {
  const classes =
    tone === "success"
      ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
      : tone === "warning"
        ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#8B6A1F]"
        : "border-slate-200 bg-white text-slate-500";

  return <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${classes}`}>{text}</span>;
}
