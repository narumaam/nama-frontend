"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  BellRing,
  CreditCard,
  Globe2,
  Mail,
  MessageSquare,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Ticket,
} from "lucide-react";

import ScreenInfoTip from "@/components/screen-info-tip";
import { fetchIntegrationVaultStatus, type IntegrationProviderStatus, type IntegrationVaultStatus } from "@/lib/integrations-api";
import { SCREEN_HELP } from "@/lib/screen-help";

const INTEGRATION_META: Array<{
  key: keyof IntegrationVaultStatus;
  label: string;
  lane: string;
  icon: typeof MessageSquare;
  detail: string;
}> = [
  {
    key: "whatsapp",
    label: "WhatsApp Business",
    lane: "Comms",
    icon: MessageSquare,
    detail: "Inbound and outbound messaging for lead capture, updates, and support.",
  },
  {
    key: "resend",
    label: "Resend",
    lane: "Comms",
    icon: Mail,
    detail: "Transactional email for waitlists, invites, and customer notifications.",
  },
  {
    key: "sendgrid",
    label: "SendGrid",
    lane: "Comms",
    icon: BellRing,
    detail: "Alternate outbound email rail for customer communication and fallback delivery.",
  },
  {
    key: "stripe",
    label: "Stripe",
    lane: "Payments",
    icon: CreditCard,
    detail: "International collections and card-based payment operations.",
  },
  {
    key: "razorpay",
    label: "Razorpay",
    lane: "Payments",
    icon: ShieldCheck,
    detail: "Domestic India payment rail for collections and settlements.",
  },
  {
    key: "bokun",
    label: "Bokun",
    lane: "Supply",
    icon: Ticket,
    detail: "Tours, activities, and booking inventory sync.",
  },
  {
    key: "amadeus",
    label: "Amadeus",
    lane: "Supply",
    icon: Globe2,
    detail: "Air and travel inventory access for pricing and sourcing.",
  },
  {
    key: "tbo",
    label: "TBO",
    lane: "Supply",
    icon: ShoppingBag,
    detail: "Hotel and travel inventory connectivity for fulfillment flows.",
  },
];

const CONTINUITY_LINKS = [
  { label: "Overview", href: "/dashboard" },
  { label: "Finance", href: "/dashboard/finance" },
  { label: "Comms", href: "/dashboard/comms" },
  { label: "DMC Hub", href: "/dashboard/dmc" },
  { label: "Admin", href: "/dashboard/admin" },
];

const EMPTY_STATUS: IntegrationVaultStatus = {
  whatsapp: "NOT_CONFIGURED",
  stripe: "NOT_CONFIGURED",
  razorpay: "NOT_CONFIGURED",
  resend: "NOT_CONFIGURED",
  sendgrid: "NOT_CONFIGURED",
  bokun: "NOT_CONFIGURED",
  amadeus: "NOT_CONFIGURED",
  tbo: "NOT_CONFIGURED",
};

export default function IntegrationsPage() {
  const [status, setStatus] = useState<IntegrationVaultStatus>(EMPTY_STATUS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      setStatus(await fetchIntegrationVaultStatus());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to load integration vault status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  const summary = useMemo(() => {
    const values = Object.values(status);
    const connected = values.filter((value) => value !== "NOT_CONFIGURED").length;
    const liveReady = values.filter((value) => value === "LIVE_READY").length;
    const supplyActive = [status.bokun, status.amadeus, status.tbo].filter((value) => value === "ACTIVE").length;
    return {
      connected,
      liveReady,
      supplyActive,
      total: values.length,
    };
  }, [status]);

  return (
    <div className="bg-[#0A0A0A] text-[#F5F0E8] -m-8 min-h-screen p-8 font-body">
      <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.28em] text-[#C9A84C]">
            <span>Integration Vault</span>
            <span>/</span>
            <span>M12</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-tight">Provider Readiness</h1>
            <ScreenInfoTip content={SCREEN_HELP.integrations} />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
            A single operator-facing view of which communications, payment, and supply rails are already active versus which still need credentials.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadStatus()}
          className="inline-flex items-center gap-2 rounded-2xl border border-[#C9A84C]/15 bg-[#111111] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#F5F0E8] transition-colors hover:bg-[#171717]"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin text-[#C9A84C]" : "text-[#C9A84C]"} />
          Refresh Vault
        </button>
      </div>

      <section className="mb-8 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#C9A84C]">Operator Continuity</div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#F5F0E8]">Show the control layer behind the product, not just the workflow</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              This page lifts MVP quality because it proves the system knows which external rails are available to activate next and which business functions they unlock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CONTINUITY_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <SummaryCard label="Configured Rails" value={`${summary.connected}/${summary.total}`} note="Providers with credentials or active readiness." icon={PlugZap} />
        <SummaryCard label="Live-Ready Payments" value={String(summary.liveReady)} note="Commercial rails ready for production-grade activation." icon={CreditCard} />
        <SummaryCard label="Supply Connectors" value={String(summary.supplyActive)} note="Inventory and sourcing providers available to unlock." icon={Activity} />
        <SummaryCard label="Vault State" value={loading ? "Syncing" : error ? "Attention" : "Operational"} note={error ? error : "Refreshed from the active environment."} icon={BadgeCheck} />
      </div>

      {error ? (
        <div className="mb-8 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm leading-relaxed text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {INTEGRATION_META.map((item) => (
          <IntegrationCard
            key={item.key}
            label={item.label}
            lane={item.lane}
            detail={item.detail}
            icon={item.icon}
            status={status[item.key]}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.24em] text-[#C9A84C]">{label}</div>
          <div className="mt-2 text-2xl font-black tracking-tight text-[#F5F0E8]">{value}</div>
        </div>
        <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3 text-[#C9A84C]">
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 text-sm leading-relaxed text-[#B8B0A0]">{note}</div>
    </div>
  );
}

function IntegrationCard({
  label,
  lane,
  detail,
  icon: Icon,
  status,
}: {
  label: string;
  lane: string;
  detail: string;
  icon: typeof MessageSquare;
  status: IntegrationProviderStatus;
}) {
  const statusClasses =
    status === "NOT_CONFIGURED"
      ? "border-slate-500/20 bg-slate-500/10 text-slate-300"
      : status === "LIVE_READY"
        ? "border-[#1D9E75]/20 bg-[#1D9E75]/10 text-[#1D9E75]"
        : status === "ACTIVE"
          ? "border-[#C9A84C]/20 bg-[#C9A84C]/10 text-[#C9A84C]"
          : "border-[#4BA3FF]/20 bg-[#4BA3FF]/10 text-[#7CC4FF]";

  return (
    <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-3 text-[#C9A84C]">
            <Icon size={16} />
          </div>
          <div>
            <div className="text-sm font-black uppercase tracking-tight text-[#F5F0E8]">{label}</div>
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-[#B8B0A0]">{lane}</div>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-widest ${statusClasses}`}>{status.replace("_", " ")}</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[#B8B0A0]">{detail}</p>
    </div>
  );
}
