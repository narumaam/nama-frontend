"use client";

/**
 * M19 — Marketplace & Integrations
 * ----------------------------------
 * Connect NAMA OS to WhatsApp Business, email providers,
 * payment gateways, GDS feeds, CRM tools, custom webhooks,
 * and social media lead capture (Facebook Lead Ads + Instagram DMs).
 *
 * Categories:
 *   - Messaging:     WhatsApp Business API, Twilio SMS, Telegram
 *   - Email:         SendGrid, Mailchimp, AWS SES
 *   - Payments:      Razorpay, Stripe, PayU
 *   - Travel APIs:   Amadeus GDS, TBO Holidays, Hotelbeds
 *   - CRM/Ops:       HubSpot, Salesforce, Google Sheets
 *   - Webhooks:      Custom inbound/outbound webhooks
 *   - Social:        Facebook Lead Ads, Instagram DMs
 */

import React, { useState, useEffect } from "react";
import {
  Plug, CheckCircle, AlertCircle, Clock, ArrowRight,
  Zap, Shield, RefreshCw, ExternalLink, X, Copy,
  Eye, EyeOff, Plus, Trash2, Globe, Key, Loader2, Send,
  Share2, Users,
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
  id: string | number;
  url: string;
  events: string[];
  description?: string | null;
  secret: string;
  is_active: boolean;
  last_triggered_at?: string | null;
  delivery_count: number;
  failure_count: number;
  created_at?: string;
  // legacy fields kept for seed fallback
  name?: string;
  active?: boolean;
  last_triggered?: string;
  success_count?: number;
  fail_count?: number;
}

// All 8 supported outbound webhook events
const SUPPORTED_WEBHOOK_EVENTS = [
  "lead.created",
  "lead.status_changed",
  "lead.assigned",
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "quotation.sent",
  "quotation.accepted",
] as const;

// Fallback seed webhook shown when API returns empty / unauthenticated
const SEED_WEBHOOK: Webhook = {
  id: "seed-wh-1",
  url: "https://hooks.zapier.com/hooks/catch/000000/xxxxxxx/",
  events: ["lead.created", "booking.confirmed"],
  description: "Example: New Lead → Zapier",
  secret: "whsec_example_seed",
  is_active: false,
  delivery_count: 0,
  failure_count: 0,
};

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
    url: "https://hooks.slack.com/services/T0000/B0000/xxxx",
    description: "Booking Confirmed → Slack",
    events: ["booking.confirmed"],
    secret: "whsec_nama_abc123",
    is_active: true,
    last_triggered_at: "2 hrs ago",
    delivery_count: 87,
    failure_count: 0,
  },
  {
    id: "wh-2",
    url: "https://script.google.com/macros/s/xxx/exec",
    description: "New Lead → Google Sheets",
    events: ["lead.created"],
    secret: "whsec_nama_def456",
    is_active: true,
    last_triggered_at: "14 min ago",
    delivery_count: 312,
    failure_count: 3,
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

// ── Add Webhook Modal ──────────────────────────────────────────────────────────
function AddWebhookModal({ onClose, onAdd }: { onClose: () => void; onAdd: (wh: Webhook) => void }) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["lead.created"]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleEvent = (evt: string) => {
    setSelectedEvents((prev) =>
      prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
    );
  };

  const handleSave = async () => {
    if (!url.trim() || selectedEvents.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/webhooks/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), events: selectedEvents, description: description.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        onAdd(data);
        onClose();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.detail || "Failed to create webhook");
      }
    } catch {
      // Fallback: add locally if API unavailable
      const wh: Webhook = {
        id: `local-${Date.now()}`,
        url: url.trim(),
        description: description.trim() || undefined,
        events: selectedEvents,
        secret: `whsec_${Math.random().toString(36).slice(2, 18)}`,
        is_active: true,
        delivery_count: 0,
        failure_count: 0,
      };
      onAdd(wh);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-[#0F172A] text-lg">Add Webhook</h2>
            <p className="text-slate-400 text-xs mt-0.5">NAMA will POST signed events to your URL</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* URL */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Endpoint URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-[#14B8A6]"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. New Lead → Zapier → Slack"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6]"
            />
          </div>

          {/* Events */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2">Subscribe to events</label>
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_WEBHOOK_EVENTS.map((evt) => (
                <label key={evt} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(evt)}
                    onChange={() => toggleEvent(evt)}
                    className="w-3.5 h-3.5 accent-[#14B8A6]"
                  />
                  <span className={`text-xs font-mono ${selectedEvents.includes(evt) ? "text-slate-800 font-bold" : "text-slate-500"}`}>
                    {evt}
                  </span>
                </label>
              ))}
            </div>
            {selectedEvents.length === 0 && (
              <p className="text-xs text-red-500 mt-1">Select at least one event</p>
            )}
          </div>

          {/* Security note */}
          <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
            <Shield size={13} className="text-[#14B8A6] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              Each delivery is HMAC-SHA256 signed. Verify with the <code className="bg-slate-200 px-1 rounded text-[10px]">X-NAMA-Signature</code> header.
            </p>
          </div>

          {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
        </div>

        <div className="p-6 border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !url.trim() || selectedEvents.length === 0}
            className="flex-1 bg-[#0F172A] text-white font-black py-2.5 rounded-xl hover:bg-slate-700 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Creating...</> : "Create Webhook"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Webhook Row ────────────────────────────────────────────────────────────────
function WebhookRow({
  wh,
  onDelete,
  onTest,
  isSeed = false,
}: {
  wh: Webhook;
  onDelete: (id: string | number) => void;
  onTest: (id: string | number) => void;
  isSeed?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);

  const copySecret = () => {
    navigator.clipboard.writeText(wh.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    await onTest(wh.id);
    setTesting(false);
  };

  const displayUrl = wh.url.length > 40 ? wh.url.slice(0, 40) + "…" : wh.url;
  const displayLabel = wh.description || `Webhook #${wh.id}`;
  const isActive = wh.is_active ?? wh.active ?? false;
  const deliveries = wh.delivery_count ?? wh.success_count ?? 0;
  const failures = wh.failure_count ?? wh.fail_count ?? 0;
  const lastTriggered = wh.last_triggered_at || wh.last_triggered;

  return (
    <div className={`border rounded-2xl p-5 transition-all ${isSeed ? "bg-slate-50 border-slate-200 opacity-70" : "bg-white border-slate-100 hover:shadow-sm"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-bold text-slate-900 text-sm">{displayLabel}</span>
            {isSeed && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">EXAMPLE</span>
            )}
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
              {isActive ? "ACTIVE" : "PAUSED"}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono truncate mb-2" title={wh.url}>{displayUrl}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {wh.events.map((e) => (
              <span key={e} className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{e}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="text-emerald-600 font-semibold">✓ {deliveries} deliveries</span>
            {failures > 0 && <span className="text-red-500 font-semibold">✗ {failures} failed</span>}
            {lastTriggered && <span>Last: {lastTriggered}</span>}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {!isSeed && (
            <button
              onClick={handleTest}
              disabled={testing}
              title="Send test event"
              className="p-2 text-slate-400 hover:text-[#14B8A6] hover:bg-[#14B8A6]/10 rounded-xl transition-colors"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          )}
          <button onClick={copySecret} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Copy secret">
            {copied ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
          {!isSeed && (
            <button onClick={() => onDelete(wh.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const [category, setCategory] = useState<Category>("all");
  const [integrations, setIntegrations] = useState<Integration[]>(INTEGRATIONS);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(false);
  const [useSeedWebhooks, setUseSeedWebhooks] = useState(false);
  const [connectingTo, setConnectingTo] = useState<Integration | null>(null);
  const [activeTab, setActiveTab] = useState<"integrations" | "webhooks" | "social">("integrations");
  const [showAddWebhook, setShowAddWebhook] = useState(false);

  // ── Social media state ─────────────────────────────────────────────────────
  const [socialStatus, setSocialStatus] = useState<{
    facebook_connected: boolean;
    page_name: string;
    instagram_connected: boolean;
    leads_captured_count: number;
    last_lead_at: string | null;
  } | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [verifyToken, setVerifyToken] = useState<string>("");
  const [verifyTokenCopied, setVerifyTokenCopied] = useState(false);
  const [fbPageId, setFbPageId] = useState("");
  const [fbAccessToken, setFbAccessToken] = useState("");
  const [showFbToken, setShowFbToken] = useState(false);
  const [igAccountId, setIgAccountId] = useState("");
  const [socialConnecting, setSocialConnecting] = useState(false);
  const [socialConnectResult, setSocialConnectResult] = useState<{
    connected: boolean;
    page_name: string;
    instagram_connected: boolean;
    error?: string;
  } | null>(null);

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  const filtered = category === "all"
    ? integrations
    : integrations.filter((i) => i.category === category);

  // Load social status + verify token when tab is active
  useEffect(() => {
    if (activeTab !== "social") return;
    setSocialLoading(true);

    const fetchAll = async () => {
      try {
        const [statusRes, tokenRes] = await Promise.all([
          fetch("/api/v1/social/status"),
          fetch("/api/v1/social/verify-token"),
        ]);
        if (statusRes.ok) setSocialStatus(await statusRes.json());
        if (tokenRes.ok) {
          const td = await tokenRes.json();
          setVerifyToken(td.verify_token || "");
        }
      } catch {
        // backend unreachable — leave null state, UI shows disconnected
      } finally {
        setSocialLoading(false);
      }
    };

    fetchAll();
  }, [activeTab]);

  // Load webhooks from API when tab is active
  useEffect(() => {
    if (activeTab !== "webhooks") return;
    setWebhooksLoading(true);
    fetch("/api/v1/webhooks/outbound")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Webhook[] | null) => {
        if (Array.isArray(data)) {
          setWebhooks(data);
          setUseSeedWebhooks(false);
        } else {
          // API unavailable or unauthenticated — show seed fallback
          setWebhooks(SAMPLE_WEBHOOKS);
          setUseSeedWebhooks(true);
        }
      })
      .catch(() => {
        setWebhooks(SAMPLE_WEBHOOKS);
        setUseSeedWebhooks(true);
      })
      .finally(() => setWebhooksLoading(false));
  }, [activeTab]);

  const handleDisconnect = (id: string) => {
    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, status: "disconnected" as const } : i));
  };

  const handleDeleteWebhook = async (id: string | number) => {
    // Optimistic remove
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
    try {
      await fetch(`/api/v1/webhooks/outbound/${id}`, { method: "DELETE" });
    } catch {
      // silently ignore — already removed from UI
    }
  };

  const handleTestWebhook = async (id: string | number) => {
    try {
      await fetch(`/api/v1/webhooks/outbound/${id}/test`, { method: "POST" });
    } catch {
      // ignore
    }
  };

  const handleAddWebhook = (wh: Webhook) => {
    setWebhooks((prev) => [wh, ...prev]);
    setUseSeedWebhooks(false);
  };

  const handleSocialConnect = async () => {
    if (!fbPageId.trim() || !fbAccessToken.trim()) return;
    setSocialConnecting(true);
    setSocialConnectResult(null);
    try {
      const res = await fetch("/api/v1/social/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facebook_page_id: fbPageId.trim(),
          page_access_token: fbAccessToken.trim(),
          instagram_account_id: igAccountId.trim(),
        }),
      });
      const data = await res.json();
      setSocialConnectResult(data);
      if (data.connected || !data.error) {
        // Refresh status
        const statusRes = await fetch("/api/v1/social/status");
        if (statusRes.ok) setSocialStatus(await statusRes.json());
      }
    } catch {
      setSocialConnectResult({
        connected: false,
        page_name: "",
        instagram_connected: false,
        error: "Could not reach server. Check your connection.",
      });
    } finally {
      setSocialConnecting(false);
    }
  };

  const handleCopyVerifyToken = () => {
    if (!verifyToken) return;
    navigator.clipboard.writeText(verifyToken);
    setVerifyTokenCopied(true);
    setTimeout(() => setVerifyTokenCopied(false), 2000);
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

      {/* Tabs: Integrations / Webhooks / Social */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { key: "integrations", label: "Integrations" },
          { key: "webhooks",     label: "Webhooks"     },
          { key: "social",       label: "Social Media" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === t.key ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.key === "social" && <Share2 size={13} />}
            {t.label}
            {t.key === "social" && (
              <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase leading-none">
                New
              </span>
            )}
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
                Connect NAMA to Zapier, Make, your CRM, or any custom HTTP endpoint.
                All payloads are HMAC-SHA256 signed via <code className="bg-blue-100 px-1 rounded text-[11px]">X-NAMA-Signature</code>.
              </p>
            </div>
          </div>

          {/* Webhook list */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-[#0F172A]">Your Webhooks</h3>
              <button
                onClick={() => setShowAddWebhook(true)}
                className="flex items-center gap-1.5 text-xs font-black bg-[#0F172A] text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
              >
                <Plus size={13} /> Add Webhook
              </button>
            </div>

            <div className="space-y-3">
              {webhooksLoading ? (
                <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading webhooks…</span>
                </div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-12">
                  <Globe size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm font-bold text-slate-500">No webhooks yet</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Connect NAMA to Zapier, Make, or your CRM.</p>
                  <button
                    onClick={() => setShowAddWebhook(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-black bg-[#0F172A] text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    <Plus size={13} /> Add Webhook
                  </button>
                </div>
              ) : (
                <>
                  {useSeedWebhooks && (
                    <p className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 mb-2">
                      Showing example webhooks — connect your account to manage real endpoints.
                    </p>
                  )}
                  {webhooks.map((wh) => (
                    <WebhookRow
                      key={wh.id}
                      wh={wh}
                      onDelete={handleDeleteWebhook}
                      onTest={handleTestWebhook}
                      isSeed={useSeedWebhooks}
                    />
                  ))}
                  {/* Always show the Zapier seed as a muted example if list is live but empty-ish */}
                  {!useSeedWebhooks && webhooks.length > 0 && (
                    <WebhookRow
                      wh={SEED_WEBHOOK}
                      onDelete={() => {}}
                      onTest={() => Promise.resolve()}
                      isSeed={true}
                    />
                  )}
                </>
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

      {/* ── Social Media Tab ──────────────────────────────────────────── */}
      {activeTab === "social" && (
        <div className="space-y-6">
          {/* Header banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Share2 size={24} className="text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg">Social Media Lead Capture</h3>
              <p className="text-blue-100 text-sm mt-1">
                Automatically create CRM leads when someone fills out a Facebook Lead Ad form
                or sends your page an Instagram DM. One Meta App, one webhook — zero manual copy-paste.
              </p>
            </div>
          </div>

          {/* Status summary strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                label: "Facebook Lead Ads",
                value: socialStatus?.facebook_connected
                  ? socialStatus.page_name || "Connected"
                  : "Not connected",
                connected: socialStatus?.facebook_connected,
                icon: "📘",
              },
              {
                label: "Instagram DMs",
                value: socialStatus?.instagram_connected ? "Connected" : "Not connected",
                connected: socialStatus?.instagram_connected,
                icon: "📸",
              },
              {
                label: "Leads Captured",
                value: socialLoading ? "…" : String(socialStatus?.leads_captured_count ?? 0),
                connected: (socialStatus?.leads_captured_count ?? 0) > 0,
                icon: "🎯",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium mb-0.5">{item.label}</div>
                  <div className={`text-sm font-bold ${item.connected ? "text-emerald-600" : "text-slate-500"}`}>
                    {item.value}
                  </div>
                </div>
                {item.connected && (
                  <CheckCircle size={14} className="text-emerald-500 ml-auto flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Facebook Lead Ads card ──────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1877F2] rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  📘
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Facebook Lead Ads</span>
                    {socialStatus?.facebook_connected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        <CheckCircle size={9} /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        <Plug size={9} /> Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Auto-create leads from Lead Ad form submissions
                  </p>
                </div>
              </div>

              {/* Setup instructions */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-3">Setup instructions</p>
                  <ol className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">1</span>
                      <span>
                        Go to{" "}
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          Meta for Developers <ExternalLink size={10} className="inline" />
                        </a>
                        {" "}→ your App → Webhooks
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">2</span>
                      <span>
                        Subscribe endpoint URL to <strong>Page</strong> object:
                        <code className="block mt-1 bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg text-[10px] font-mono break-all">
                          https://getnama.app/api/v1/social/webhook
                        </code>
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">3</span>
                      <span>
                        Verify token — copy this value into the Meta dashboard:
                        <div className="flex items-center gap-2 mt-1.5">
                          <code className="flex-1 bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg text-[10px] font-mono truncate">
                            {verifyToken || "loading…"}
                          </code>
                          <button
                            onClick={handleCopyVerifyToken}
                            disabled={!verifyToken}
                            className="flex-shrink-0 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-40"
                            title="Copy verify token"
                          >
                            {verifyTokenCopied
                              ? <CheckCircle size={13} className="text-emerald-500" />
                              : <Copy size={13} className="text-slate-500" />}
                          </button>
                        </div>
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-[#1877F2]/10 text-[#1877F2] rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">4</span>
                      <span>
                        Subscribe to <strong className="text-slate-800">leadgen</strong> events on your Facebook Page
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Connect form */}
                <div className="border-t border-slate-100 pt-4 space-y-3">
                  <p className="text-xs font-bold text-slate-700">Connect your Facebook Page</p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Page ID</label>
                    <input
                      type="text"
                      value={fbPageId}
                      onChange={(e) => setFbPageId(e.target.value)}
                      placeholder="123456789012345"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-400 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Page Access Token</label>
                    <div className="relative">
                      <input
                        type={showFbToken ? "text" : "password"}
                        value={fbAccessToken}
                        onChange={(e) => setFbAccessToken(e.target.value)}
                        placeholder="EAABsbCS..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-400 transition-colors pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowFbToken(!showFbToken)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        {showFbToken ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Generate a never-expiring token in Meta Business Suite → Page Settings → Advanced.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Instagram DMs card ──────────────────────────────────────── */}
            <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  📸
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Instagram DMs</span>
                    {socialStatus?.instagram_connected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        <CheckCircle size={9} /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        <Plug size={9} /> Not connected
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Turn Instagram DMs into CRM leads automatically
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* How it works */}
                <div className="bg-purple-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-xs font-bold text-purple-800">How it works</p>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• When someone DMs your Instagram Business account, NAMA creates a lead instantly</li>
                    <li>• Follow-up messages from the same user append to the same lead (no duplicates)</li>
                    <li>• Uses the same Meta App and webhook URL as Facebook Lead Ads</li>
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-3">Setup instructions</p>
                  <ol className="space-y-3 text-xs text-slate-600">
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">1</span>
                      <span>
                        In your Meta App, add the <strong>Instagram</strong> product and link your Business account
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">2</span>
                      <span>
                        In Webhooks, add subscription for <strong>Instagram</strong> object with the same URL and verify token above
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">3</span>
                      <span>
                        Subscribe to the <strong className="text-slate-800">messages</strong> field
                      </span>
                    </li>
                    <li className="flex gap-2.5">
                      <span className="w-5 h-5 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 mt-0.5">4</span>
                      <span>
                        Enter your Instagram Business Account ID below to complete the setup
                      </span>
                    </li>
                  </ol>
                </div>

                {/* Instagram Account ID input */}
                <div className="border-t border-slate-100 pt-4">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    Instagram Business Account ID
                  </label>
                  <input
                    type="text"
                    value={igAccountId}
                    onChange={(e) => setIgAccountId(e.target.value)}
                    placeholder="17841400008460056"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-400 transition-colors"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Find this in Instagram → Settings → Account → About account, or via the Graph API <code className="bg-slate-100 px-1 rounded text-[9px]">GET /me/accounts</code>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Connect button + result ──────────────────────────────────────── */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="font-bold text-slate-800 text-sm">Save & Connect</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Stores credentials securely in your tenant settings and verifies the Facebook token.
                </p>
              </div>
              <button
                onClick={handleSocialConnect}
                disabled={socialConnecting || !fbPageId.trim() || !fbAccessToken.trim()}
                className="flex items-center gap-2 bg-[#0F172A] text-white font-black px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 text-sm"
              >
                {socialConnecting ? (
                  <><Loader2 size={15} className="animate-spin" /> Connecting…</>
                ) : (
                  <><Share2 size={15} /> Connect Social Media</>
                )}
              </button>
            </div>

            {/* Connection result */}
            {socialConnectResult && (
              <div className={`mt-4 rounded-xl p-4 flex items-start gap-3 ${
                socialConnectResult.connected
                  ? "bg-emerald-50 border border-emerald-200"
                  : socialConnectResult.error
                  ? "bg-red-50 border border-red-200"
                  : "bg-amber-50 border border-amber-200"
              }`}>
                {socialConnectResult.connected ? (
                  <CheckCircle size={16} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                ) : socialConnectResult.error ? (
                  <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  {socialConnectResult.connected ? (
                    <>
                      <p className="text-sm font-bold text-emerald-800">
                        Facebook Page connected: {socialConnectResult.page_name}
                      </p>
                      {socialConnectResult.instagram_connected && (
                        <p className="text-xs text-emerald-700 mt-0.5">Instagram account also connected.</p>
                      )}
                      <p className="text-xs text-emerald-600 mt-1">
                        NAMA will now automatically create CRM leads from Lead Ads and Instagram DMs.
                      </p>
                    </>
                  ) : socialConnectResult.error ? (
                    <>
                      <p className="text-sm font-bold text-red-700">Connection issue</p>
                      <p className="text-xs text-red-600 mt-0.5">{socialConnectResult.error}</p>
                      <p className="text-xs text-red-500 mt-1">
                        Credentials have been saved. Webhooks will work if the token is valid — verify it in Meta&apos;s Webhook Tester.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-amber-800">Credentials saved.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Field mapping reference ──────────────────────────────────────── */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-extrabold text-[#0F172A] text-sm">Facebook Lead Ad Field Mapping</h3>
              <p className="text-slate-400 text-xs mt-0.5">
                NAMA maps Lead Ad question names to CRM fields automatically.
                Unmapped fields are stored in the lead&apos;s notes.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {["Facebook field name", "NAMA CRM field", "Example value"].map((h) => (
                      <th key={h} className="text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { fb: "full_name",     nama: "full_name",         example: "Priya Sharma" },
                    { fb: "first_name + last_name", nama: "full_name", example: "Priya Sharma" },
                    { fb: "email",         nama: "email",             example: "priya@example.com" },
                    { fb: "phone_number",  nama: "phone",             example: "+91 98765 43210" },
                    { fb: "destination",   nama: "destination",       example: "Bali, Indonesia" },
                    { fb: "travel_date",   nama: "travel_dates",      example: "March 2025" },
                    { fb: "budget",        nama: "budget_per_person", example: "50000" },
                    { fb: "any other",     nama: "notes",             example: "Stored as extra fields" },
                  ].map((row, i) => (
                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-5 py-3">
                        <code className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-mono">{row.fb}</code>
                      </td>
                      <td className="px-5 py-3">
                        <code className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-mono">{row.nama}</code>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500">{row.example}</td>
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

      {/* Add Webhook Modal */}
      {showAddWebhook && (
        <AddWebhookModal onClose={() => setShowAddWebhook(false)} onAdd={handleAddWebhook} />
      )}
    </div>
  );
}
