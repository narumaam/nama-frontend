"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Globe,
  Copy,
  Check,
  RefreshCw,
  Eye,
  AlertTriangle,
  Loader2,
  ExternalLink,
  Code2,
  Palette,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TokenResponse {
  token: string;
  generated?: boolean;
  rotated?: boolean;
  message?: string;
}

interface StatsResponse {
  month: string;
  widget_leads_this_month: number;
}

// ─── Preset colours ───────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { label: "Emerald",  hex: "#10B981" },
  { label: "Violet",  hex: "#8B5CF6" },
  { label: "Blue",    hex: "#3B82F6" },
  { label: "Rose",    hex: "#F43F5E" },
  { label: "Amber",   hex: "#F59E0B" },
  { label: "Slate",   hex: "#475569" },
];

const DEMO_TOKEN = "demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";

// ─── Inline Widget Preview ────────────────────────────────────────────────────

function WidgetPreview({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="relative h-36 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 overflow-hidden flex items-end justify-end p-4">
      {/* Decorative fake page content */}
      <div className="absolute inset-0 p-5 space-y-2 pointer-events-none">
        <div className="h-3 w-1/2 bg-white/10 rounded-full" />
        <div className="h-2.5 w-3/4 bg-white/7 rounded-full" />
        <div className="h-2.5 w-2/3 bg-white/7 rounded-full" />
        <div className="h-2 w-1/3 bg-white/5 rounded-full" />
      </div>
      {/* Simulated floating button */}
      <button
        style={{ background: color }}
        className="relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg select-none cursor-default whitespace-nowrap"
      >
        <Globe size={14} />
        {label || "\u2708 Enquire Now"}
      </button>
    </div>
  );
}

// ─── Test Widget Modal ────────────────────────────────────────────────────────

function TestWidgetModal({
  open,
  onClose,
  color,
  label,
}: {
  open: boolean;
  onClose: () => void;
  color: string;
  label: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-0 flex items-start justify-between">
          <div>
            <p className="text-xl font-black text-slate-900">Plan Your Trip</p>
            <p className="text-sm text-slate-500 mt-1">
              Fill in your details and we&apos;ll craft the perfect itinerary for you.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-2xl leading-none ml-4 mt-0.5"
          >
            &times;
          </button>
        </div>
        {/* Form */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Rahul Sharma"
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Email</label>
              <input
                type="email"
                placeholder="rahul@example.com"
                className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Destination</label>
            <input
              type="text"
              placeholder="Maldives, Bali, Europe…"
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Travel Dates</label>
              <input
                type="text"
                placeholder="Dec 15–22, 2026"
                className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Travellers</label>
              <input
                type="number"
                defaultValue={2}
                min={1}
                className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Anything else?</label>
            <textarea
              rows={2}
              placeholder="Special requests, travel style, celebrations…"
              className="w-full px-3.5 py-2.5 border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-emerald-400 transition-colors resize-none"
            />
          </div>
          <button
            style={{ background: color }}
            className="w-full py-3 rounded-xl text-white text-sm font-black transition-opacity hover:opacity-90"
          >
            {label || "\u2708 Enquire Now"}
          </button>
          <p className="text-center text-xs text-slate-400">
            This is a preview — submissions here are not saved.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WidgetPage() {
  const [token, setToken]               = useState<string>("");
  const [color, setColor]               = useState<string>("#10B981");
  const [hexInput, setHexInput]         = useState<string>("#10B981");
  const [buttonLabel, setButtonLabel]   = useState<string>("\u2708 Enquire Now");
  const [copied, setCopied]             = useState<boolean>(false);
  const [loadingToken, setLoadingToken] = useState<boolean>(true);
  const [rotating, setRotating]         = useState<boolean>(false);
  const [showConfirm, setShowConfirm]   = useState<boolean>(false);
  const [testOpen, setTestOpen]         = useState<boolean>(false);
  const [stats, setStats]               = useState<StatsResponse | null>(null);
  const [tokenError, setTokenError]     = useState<string>("");
  const hexInputRef = useRef<HTMLInputElement>(null);

  // Fetch token on mount
  useEffect(() => {
    setLoadingToken(true);
    api
      .get<TokenResponse>("/api/v1/capture/generate-token")
      .then((res) => {
        setToken(res.token);
      })
      .catch(() => {
        // Fallback demo token so UI is fully usable
        setToken(DEMO_TOKEN);
        setTokenError(
          "Could not reach the backend. Showing demo token — real token will appear after logging in."
        );
      })
      .finally(() => setLoadingToken(false));

    // Stats — non-blocking
    api
      .get<StatsResponse>("/api/v1/capture/stats")
      .then(setStats)
      .catch(() => {
        setStats({ month: "This Month", widget_leads_this_month: 0 });
      });
  }, []);

  // Keep hex input in sync with color picker
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleHexCommit = useCallback(() => {
    const cleaned = hexInput.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) {
      setColor(cleaned);
    } else {
      setHexInput(color); // revert
    }
  }, [hexInput, color]);

  const embedCode = `<script\n  src="https://getnama.app/widget.js"\n  data-token="${token}"\n  data-color="${color}"\n  data-label="${buttonLabel}"\n><\/script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRotateConfirm = async () => {
    setShowConfirm(false);
    setRotating(true);
    try {
      const res = await api.post<TokenResponse>("/api/v1/capture/rotate-token", {});
      setToken(res.token);
      setTokenError("");
    } catch {
      setTokenError("Failed to rotate token. Please try again.");
    } finally {
      setRotating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Globe size={18} className="text-emerald-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Website Lead Widget</h1>
          </div>
          <p className="text-slate-400 text-sm ml-12">
            Capture enquiries directly from your website into NAMA
          </p>
        </div>

        {/* Lead count badge */}
        {stats && (
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 self-start sm:self-auto">
            <Users size={14} className="text-emerald-400 flex-shrink-0" />
            <div className="text-right">
              <p className="text-xl font-black text-white leading-none">
                {stats.widget_leads_this_month}
              </p>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Widget leads · {stats.month}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Token error banner ── */}
      {tokenError && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">{tokenError}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Left column: Preview + Config ── */}
        <div className="space-y-5">
          {/* Live Preview */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Eye size={15} className="text-slate-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Live Preview</h2>
            </div>
            <WidgetPreview color={color} label={buttonLabel} />
            <p className="text-xs text-slate-500 text-center mt-3">
              This is how the button appears on your website
            </p>
          </div>

          {/* Configuration */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Palette size={15} className="text-slate-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Configuration</h2>
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                Accent Colour
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_COLORS.map((p) => (
                  <button
                    key={p.hex}
                    title={p.label}
                    onClick={() => setColor(p.hex)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 flex-shrink-0 ${
                      color === p.hex ? "border-white scale-110" : "border-transparent"
                    }`}
                    style={{ background: p.hex }}
                  />
                ))}
                {/* Custom color swatch */}
                <label
                  title="Pick custom colour"
                  className="w-8 h-8 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-slate-400 transition-colors overflow-hidden"
                  style={{ background: color }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="opacity-0 absolute w-0 h-0"
                  />
                </label>
              </div>
              {/* Hex input */}
              <input
                ref={hexInputRef}
                type="text"
                value={hexInput}
                onChange={(e) => setHexInput(e.target.value)}
                onBlur={handleHexCommit}
                onKeyDown={(e) => e.key === "Enter" && handleHexCommit()}
                placeholder="#10B981"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Button label */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                Button Text
              </label>
              <input
                type="text"
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="✈ Enquire Now"
                maxLength={40}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Test button */}
            <button
              onClick={() => setTestOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold py-2.5 rounded-xl transition-colors"
            >
              <Eye size={14} />
              Test Widget
            </button>
          </div>
        </div>

        {/* ── Right column: Embed Code + Token ── */}
        <div className="space-y-5">
          {/* Embed code */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Code2 size={15} className="text-slate-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Embed Code</h2>
              </div>
              <button
                onClick={handleCopy}
                disabled={loadingToken}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {loadingToken ? (
              <div className="flex items-center gap-2 py-6 justify-center text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading token…</span>
              </div>
            ) : (
              <pre className="bg-slate-900 rounded-xl p-4 text-xs text-emerald-300 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all select-all">
                {embedCode}
              </pre>
            )}

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Paste this tag before the closing{" "}
              <code className="text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded">&lt;/body&gt;</code>{" "}
              on any page of your website.
            </p>
          </div>

          {/* Token management */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ExternalLink size={15} className="text-slate-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">Your Token</h2>
            </div>

            <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-xs text-slate-300 break-all mb-4 border border-slate-700">
              {loadingToken ? (
                <span className="text-slate-500 italic">Loading…</span>
              ) : (
                token
              )}
            </div>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              This token identifies your agency. Keep it private — it routes
              enquiries directly into your CRM. Rotate it below if you suspect
              it has been shared.
            </p>

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                disabled={rotating || loadingToken}
                className="flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={rotating ? "animate-spin" : ""} />
                {rotating ? "Rotating…" : "Regenerate Token"}
              </button>
            ) : (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    Rotating the token will <strong>immediately invalidate</strong> your
                    current widget on all websites. You must update the{" "}
                    <code className="bg-amber-500/20 px-1 py-0.5 rounded">data-token</code> attribute
                    everywhere the script is pasted.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleRotateConfirm}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-white text-xs font-black py-2 rounded-lg transition-colors"
                  >
                    Yes, Rotate Now
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-4">How It Works</h2>
            <ol className="space-y-3">
              {[
                { step: "1", text: "Copy the embed code above and paste it on your website." },
                { step: "2", text: "A floating \"Enquire Now\" button appears in the bottom-right corner." },
                { step: "3", text: "Visitors fill in the form — a Lead is created in your NAMA CRM instantly." },
                { step: "4", text: "Track all widget leads in the Leads section (source: Website)." },
              ].map((item) => (
                <li key={item.step} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    {item.step}
                  </span>
                  <p className="text-sm text-slate-400 leading-relaxed">{item.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {/* ── Test modal ── */}
      <TestWidgetModal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        color={color}
        label={buttonLabel}
      />
    </div>
  );
}
