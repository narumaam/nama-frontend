"use client";

/**
 * M19 — Marketplace & Integrations
 * ----------------------------------
 * Connect NAMA OS to WhatsApp Business, email providers,
 * payment gateways, GDS feeds, CRM tools, and custom webhooks.
 *
 * Categories:
 *   - Messaging:     WhatsApp Business API, Twilio SMS, Telegram
 *   - Email:         SendGrid, Mailchimp, AWS SES
 *   - Payments:      Razorpay, Stripe, PayU
 *   - Travel APIs:   Amadeus GDS, TBO Holidays, Hotelbeds
 *   - CRM/Ops:       HubSpot, Salesforce, Google Sheets
 *   - Webhooks:      Custom inbound/outbound webhooks
 */

import React, { useState } from "react";
import {
  Plug, CheckCircle, AlertCircle, Clock, ArrowRight,
  Zap, Shield, RefreshCw, ExternalLink, X, Copy,
  Eye, EyeOff, Plus, Trash2, Globe, Key,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
type IntegrationStatus = "connected" | "disconnected" | "pending" | "error";
type Category = "all" | "messaging" | "email" | "payments" | "travel" | "crm" | "webhooks";

interface Integration {
  id: string;
  name: string;
  description: string;
  category: Exclude<Category, "all">;
  status: IntegrationStatus;
  icon: string;
  color: string;
  docs_url: string;
  connected_at?: string;
  last_event?: string;
  event_count?: number;
  fields: Array<{ key: string; label: string; type: "text" | "password" | "url"; placeholder: string }>;
  badge?: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  last_triggered?: string;
  success_count: number;
  fail_count: number;
}

// ── Integration Catalogue ─────────────────────────────────────────────────────
const INTEGRATIONS: Integration[] = [
  // Messaging
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    description: "Receive and send WhatsApp messages. AI-triages inbound queries into M1 leads automatically.",
    category: "messaging",
    status: "connected",
    icon: "💬",
    color: "bg-[#25D366]",
    docs_url: "https://developers.facebook.com/docs/whatsapp",
    connected_at: "2025-11-10",
    last_event: "2 min ago",
    event_count: 1240,
    badge: "Core",
    fields: [
      { key: "phone_number_id", label: "Phone Number ID", type: "text", placeholder: "1234567890123" },
      { key: "access_token", label: "Permanent Access Token", type: "password", placeholder: "EAA..." },
      { key: "verify_token", label: "Webhook Verify Token", type: "text", placeholder: "nama_wh_verify_..." },
    ],
  },
  {
    id: "twilio",
    name: "Twilio SMS",
    description: "Send SMS booking confirmations, payment reminders, and OTPs to clients globally.",
    category: "messaging",
    status: "disconnected",
    icon: "📱",
    color: "bg-red-500",
    docs_url: "https://www.twilio.com/docs/sms",
    fields: [
      { key: "account_sid", label: "Account SID", type: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
      { key: "auth_token", label: "Auth Token", type: "password", placeholder: "your_auth_token" },
      { key: "from_number", label: "From Phone Number", type: "text", placeholder: "+1415xxxxxxx" },
    ],
  },
  {
    id: "telegram",
    name: "Telegram Bot",
    description: "Receive travel queries and send itinerary PDFs via Telegram bot integration.",
    category: "messaging",
    status: "disconnected",
    icon: "✈️",
    color: "bg-blue-400",
    docs_url: "https://core.telegram.org/bots/api",
    fields: [
      { key: "bot_token", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF..." },
    ],
  },
  // Email
  {
    id: "sendgrid",
    name: "SendGrid",
    description: "Transactional emails for booking confirmations, itineraries, and quotations.",
    category: "email",
    status: "connected",
    icon: "📧",
    color: "bg-blue-600",
    docs_url: "https://docs.sendgrid.com",
    connected_at: "2025-10-20",
    last_event: "8 min ago",
    event_count: 3420,
    badge: "Active",
    fields: [
      { key: "api_key", label: "SendGrid API Key", type: "password", placeholder: "SG.xxxx" },
      { key: "from_email", label: "From Email", type: "text", placeholder: "noreply@yourcompany.com" },
      { key: "from_name", label: "From Name", type: "text", placeholder: "NAMA Travel" },
    ],
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Marketing campaigns, newsletter sync, and audience segmentation for travel promotions.",
    category: "email",
    status: "disconnected",
    icon: "🐒",
    color: "bg-yellow-500",
    docs_url: "https://mailchimp.com/developer",
    fields: [
      { key: "api_key", label: "API Key", type: "password", placeholder: "xxxx-us21" },
      { key: "list_id", label: "Audience List ID", type: "text", placeholder: "abc123def" },
    ],
  },
  // Payments
  {
    id: "razorpay",
    name: "Razorpay",
    description: "Accept INR payments via UPI, cards, net banking. Webhook-verified payment confirmation flow.",
    category: "payments",
    status: "connected",
    icon: "💳",
    color: "bg-blue-700",
    docs_url: "https://razorpay.com/docs",
    connected_at: "2025-11-01",
    last_event: "1 hr ago",
    event_count: 128,
    badge: "Core",
    fields: [
      { key: "key_id", label: "Key ID", type: "text", placeholder: "rzp_live_xxxxxxxxxxxxxxxx" },
      { key: "key_secret", label: "Key Secret", type: "password", placeholder: "your_key_secret" },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", placeholder: "whsec_xxxxxxx" },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Accept international payments in USD/EUR. Ideal for FIT clients and corporate travel.",
    category: "payments",
    status: "disconnected",
    icon: "💰",
    color: "bg-violet-600",
    docs_url: "https://stripe.com/docs",
    fields: [
      { key: "publishable_key", label: "Publishable Key", type: "text", placeholder: "pk_live_..." },
      { key: "secret_key", label: "Secret Key", type: "password", placeholder: "sk_live_..." },
      { key: "webhook_secret", label: "Webhook Secret", type: "password", placeholder: "whsec_..." },
    ],
  },
  // Travel APIs
  {
    id: "amadeus",
    name: "Amadeus GDS",
    description: "Real-time flight search, hotel availability, and car rental APIs for live pricing in itineraries.",
    category: "travel",
    status: "pending",
    icon: "✈️",
    color: "bg-[#003580]",
    docs_url: "https://developers.amadeus.com",
    badge: "Beta",
    fields: [
      { key: "api_key", label: "API Key", type: "text", placeholder: "your_api_key" },
      { key: "api_secret", label: "API Secret", type: "password", placeholder: "your_api_secret" },
      { key: "environment", label: "Environment", type: "text", placeholder: "production" },
    ],
  },
  {
    id: "tbo",
    name: "TBO Holidays",
    description: "B2B hotel inventory across India and South Asia — live rates and room availability.",
    category: "travel",
    status: "disconnected",
    icon: "🏨",
    color: "bg-orange-500",
    docs_url: "https://www.tbo.com/api",
    fields: [
      { key: "username", label: "API Username", type: "text", placeholder: "your_username" },
      { key: "password", label: "API Password", type: "password", placeholder: "your_password" },
    ],
  },
  {
    id: "hotelbeds",
    name: "Hotelbeds",
    description: "Global hotel bedbank — 180K+ properties. Auto-populates vendor rates in M6.",
    category: "travel",
    status: "disconnected",
    icon: "🌍",
    color: "bg-teal-600",
    docs_url: "https://developer.hotelbeds.com",
    fields: [
      { key: "api_key", label: "API Key", type: "text", placeholder: "your_api_key" },
      { key: "api_secret", label: "API Secret", type: "password", placeholder: "your_api_secret" },
    ],
  },
  // CRM
  {
    id: "hubspot",
    name: "HubSpot CRM",
    description: "Bi-directional sync of leads and contacts. NAMA lead status mirrors HubSpot deal stage.",
    category: "crm",
    status: "disconnected",
    icon: "🟠",
    color: "bg-orange-600",
    docs_url: "https://developers.hubspot.com",
    fields: [
      { key: "api_key", label: "Private App Token", type: "password", placeholder: "pat-na1-xxxxxxxx" },
      { key: "pipeline_id", label: "Pipeline ID", type: "text", placeholder: "default" },
    ],
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    description: "Export leads, bookings, and revenue data to Google Sheets on schedule or on-demand.",
    category: "crm",
    status: "disconnected",
    icon: "📊",
    color: "bg-green-600",
    docs_url: "https://developers.google.com/sheets",
    fields: [
      { key: "service_account_json", label: "Service Account JSON", type: "password", placeholder: '{"type":"service_account",...}' },
      { key: "spreadsheet_id", label: "Spreadsheet ID", type: "text", placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" },
    ],
  },
];

const SAMPLE_WEBHOOKS: Webhook[] = [
  {
    id: "wh-1",
    name: "Booking Confirmed → Slack",
    url: "https://hooks.slack.com/services/T0000/B0000/xxxx",
    events: ["booking.confirmed", "payment.received"],
    secret: "whsec_nama_abc123",
    active: true,
    last_triggered: "2 hrs ago",
    success_count: 87,
    fail_count: 0,
  },
  {
    id: "wh-2",
    name: "New Lead → Google Sheets",
    url: "https://script.google.com/macros/s/xxx/exec",
    events: ["lead.created", "lead.updated"],
    secret: "whsec_nama_def456",
    active: true,
    last_triggered: "14 min ago",
    success_count: 312,
    fail_count: 3,
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All Integrations",
  messaging: "Messaging",
  email: "Email",
  payments: "Payments",
  travel: "Travel APIs",
  crm: "CRM & Ops",
  webhooks: "Webhooks",
};

const STATUS_UI: Record<IntegrationStatus, { label: string; color: string; icon: React.ElementType }> = {
  connected:    { label: "Connected",    color: "bg-emerald-50 text-emerald-700",   icon: CheckCircle },
  disconnected: { label: "Not Connected", color: "bg-slate-100 text-slate-500",     icon: Plug },
  pending:      { label: "Pending",      color: "bg-amber-50 text-amber-700",       icon: Clock },
  error:        { label: "Error",        color: "bg-red-50 text-red-600",           icon: AlertCircle },
};

// ── Connect Modal ─────────────────────────────────────────────────────────────
function ConnectModal({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [showPwd, setShowPwd] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setSaved(true);
    setTimeout(onClose, 1200);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[28px] w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className={`w-12 h-12 ${integration.color} rounded-2xl flex items-center justify-center text-2xl flex-shrink-0`}>
            {integration.icon}
          </div>
          <div>
            <h2 className="font-extrabold text-[#0F172A] text-lg">{integration.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{integration.description}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-2 text-slate-400 hover:bg-slate-100 rounded-xl flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {integration.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">{field.label}</label>
              <div className="relative">
                <input
                  type={field.type === "password" && !showPwd[field.key] ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={values[field.key] || ""}
                  onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-[#14B8A6] text-sm font-mono pr-9"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPwd({ ...showPwd, [field.key]: !showPwd[field.key] })}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPwd[field.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
            <Shield size={13} className="text-[#14B8A6] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Credentials are encrypted with AES-256 (same as BYOK) and never logged or exposed in API responses.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          <a
            href={integration.docs_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold hover:text-slate-700"
          >
            <ExternalLink size={12} /> Docs
          </a>
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 bg-[#0F172A] text-white font-black py-2.5 rounded-xl hover:bg-slate-700 text-sm disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saved ? (
              <><CheckCircle size={14} className="text-emerald-400" /> Connected!</>
            ) : saving ? (
              <><RefreshCw size={14} className="animate-spin" /> Connecting...</>
            ) : (
              <>Connect {integration.name}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────
function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
}: {
  integration: Integration;
  onConnect: (i: Integration) => void;
  onDisconnect: (id: string) => void;
}) {
  const st = STATUS_UI[integration.status];
  const connected = integration.status === "connected";

  return (
    <div className={`bg-white border rounded-2xl p-5 flex flex-col gap-4 transition-all hover:shadow-md ${connected ? "border-slate-200" : "border-slate-100"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 ${integration.color} rounded-2xl flex items-center justify-center text-xl flex-shrink-0`}>
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{integration.name}</span>
            {integration.badge && (
              <span className="text-[10px] font-black bg-[#14B8A6]/10 text-[#14B8A6] px-1.5 py-0.5 rounded-full uppercase">
                {integration.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{integration.description}</p>
        </div>
      </div>

      {/* Status + metrics */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.color}`}>
          <st.icon size={11} />
          {st.label}
        </span>
        {connected && integration.event_count && (
          <span className="text-[11px] text-slate-400">
            {integration.event_count.toLocaleString("en-IN")} events · {integration.last_event}
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="flex gap-2">
        {connected ? (
          <>
            <button
              onClick={() => onConnect(integration)}
              className="flex-1 text-xs font-bold border border-slate-200 text-slate-600 py-2 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Configure
            </button>
            <button
              onClick={() => onDisconnect(integration.id)}
              className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Disconnect"
            >
              <Trash2 size={14} />
            </button>
          </>
        ) : (
          <button
            onClick={() => onConnect(integration)}
            className="w-full text-xs font-black bg-[#0F172A] text-white py-2 rounded-xl hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus size={13} /> Connect
          </button>
        )}
      </div>
    </div>
  );
}

// ── Webhook Row ────────────────────────────────────────────────────────────────
function WebhookRow({ wh, onDelete }: { wh: Webhook; onDelete: (id: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(wh.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900 text-sm">{wh.name}</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${wh.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {wh.active ? "ACTIVE" : "PAUSED"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono truncate mb-2">{wh.url}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {wh.events.map((e) => (
              <span key={e} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{e}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="text-emerald-600 font-semibold">✓ {wh.success_count} success</span>
            {wh.fail_count > 0 && <span className="text-red-500 font-semibold">✗ {wh.fail_count} failed</span>}
            {wh.last_triggered && <span>Last: {wh.last_triggered}</span>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={copySecret} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Copy secret">
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
          <button onClick={() => onDelete(wh.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [category, setCategory] = useState<Category>("all");
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [webhooks, setWebhooks] = useState<Webhook[]>(SAMPLE_WEBHOOKS);
  const [connectingTo, setConnectingTo] = useState<Integration | null>(null);
  const [activeTab, setActiveTab] = useState<"integrations" | "webhooks">("integrations");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookName, setNewWebhookName] = useState("");
  const [showNewWebhook, setShowNewWebhook] = useState(false);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  const filtered = category === "all"
    ? integrations
    : integrations.filter((i) => i.category === category);

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: "disconnected" as const } : i));
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleAddWebhook = () => {
    if (!newWebhookUrl || !newWebhookName) return;
    const wh: Webhook = {
      id: `wh-${Date.now()}`,
      name: newWebhookName,
      url: newWebhookUrl,
      events: ["lead.created", "booking.confirmed"],
      secret: `whsec_nama_${Math.random().toString(36).slice(2, 10)}`,
      active: true,
      success_count: 0,
      fail_count: 0,
    };
    setWebhooks([wh, ...webhooks]);
    setNewWebhookUrl("");
    setNewWebhookName("");
    setShowNewWebhook(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Integrations</h1>
          <p className="text-slate-500 mt-2 font-medium">
            Connect NAMA OS to your entire travel-tech stack.
            <span className="ml-2 text-[#14B8A6] font-bold">{connectedCount} of {integrations.length} connected</span>
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Connected",      value: String(connectedCount),                              color: "bg-emerald-500", icon: CheckCircle },
          { label: "Total Available", value: String(integrations.length),                        color: "bg-[#14B8A6]",   icon: Plug },
          { label: "Webhooks Active", value: String(webhooks.filter((w) => w.active).length),    color: "bg-violet-500",  icon: Globe },
          { label: "Events (30d)",    value: integrations.filter(i => i.event_count).reduce((s, i) => s + (i.event_count || 0), 0).toLocaleString("en-IN"),
            color: "bg-blue-500", icon: Zap },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-10 h-10 ${k.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <k.icon size={18} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-black text-[#0F172A]">{k.value}</div>
              <div className="text-xs text-slate-400 font-medium">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs: Integrations vs Webhooks */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["integrations", "webhooks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
              activeTab === t ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Integrations Tab ──────────────────────────────────────────────── */}
      {activeTab === "integrations" && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  category === cat
                    ? "bg-[#0F172A] text-white"
                    : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                }`}
              >
                {CATEGORY_LABELS[cat]}
                {cat !== "all" && (
                  <span className={`ml-1.5 text-[10px] ${category === cat ? "text-slate-300" : "text-slate-400"}`}>
                    ({integrations.filter((i) => i.category === cat).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={setConnectingTo}
                onDisconnect={handleDisconnect}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Webhooks Tab ──────────────────────────────────────────────────── */}
      {activeTab === "webhooks" && (
        <div className="space-y-5">
          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-start gap-3">
            <Globe size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-800 text-sm">Outbound Webhooks</p>
              <p className="text-blue-600 text-xs mt-0.5">
                NAMA fires signed HTTPS POST events to your endpoint for every platform event.
                Your endpoint URL — <code className="bg-blue-100 px-1 rounded text-[11px]">POST /api/v1/webhooks/inbound</code> — receives WhatsApp, Razorpay, and custom events.
                All payloads are HMAC-SHA256 signed with your <Key size={10} className="inline" /> webhook secret.
              </p>
            </div>
          </div>

          {/* Add webhook */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[#0F172A]">Your Webhooks</h3>
              <button
                onClick={() => setShowNewWebhook(!showNewWebhook)}
                className="flex items-center gap-1.5 text-xs font-black bg-[#0F172A] text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Plus size={13} /> New Webhook
              </button>
            </div>

            {showNewWebhook && (
              <div className="mb-5 p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Name</label>
                    <input
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                      placeholder="e.g. New Lead → Slack"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Endpoint URL</label>
                    <input
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                      placeholder="https://hooks.slack.com/..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6] font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowNewWebhook(false)} className="text-xs font-bold text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100">Cancel</button>
                  <button
                    onClick={handleAddWebhook}
                    disabled={!newWebhookUrl || !newWebhookName}
                    className="text-xs font-black bg-[#14B8A6] text-[#0F172A] px-4 py-2 rounded-xl hover:bg-[#0FA898] transition-colors disabled:opacity-40"
                  >
                    Add Webhook
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {webhooks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">No webhooks yet. Add one above.</div>
              ) : (
                webhooks.map((wh) => (
                  <WebhookRow key={wh.id} wh={wh} onDelete={handleDeleteWebhook} />
                ))
              )}
            </div>
          </div>

          {/* NAMA webhook events reference */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0F172A]">Available Webhook Events</h3>
              <p className="text-slate-400 text-xs mt-0.5">Subscribe to any of these events in your outbound webhooks.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Event", "Trigger", "Payload"].map((h) => (
                      <th key={h} className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { event: "lead.created",          trigger: "New lead triaged by M1",               payload: "lead_id, tenant_id, destination, confidence" },
                    { event: "lead.updated",          trigger: "Lead status or fields changed",         payload: "lead_id, changes, status" },
                    { event: "itinerary.generated",   trigger: "AI itinerary built by M8",             payload: "itinerary_id, lead_id, destination, total_price" },
                    { event: "quotation.sent",        trigger: "Quotation status → SENT",              payload: "quotation_id, lead_name, total_price, currency" },
                    { event: "booking.confirmed",     trigger: "Booking status → CONFIRMED",           payload: "booking_id, lead_id, itinerary_id, total_price" },
                    { event: "payment.received",      trigger: "Razorpay/Stripe payment verified",     payload: "payment_id, booking_id, amount, currency" },
                    { event: "whatsapp.message",      trigger: "Inbound WhatsApp message received",   payload: "from, message, timestamp, media_url?" },
                    { event: "automation.triggered",  trigger: "M16 workflow step executed",           payload: "workflow_id, step_key, context" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-mono">{row.event}</code>
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{row.trigger}</td>
                      <td className="px-5 py-3">
                        <code className="text-[10px] text-slate-500 font-mono">{row.payload}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Connect Modal */}
      {connectingTo && (
        <ConnectModal integration={connectingTo} onClose={() => setConnectingTo(null)} />
      )}
    </div>
  );
}
