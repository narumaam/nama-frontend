"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Zap, Play, Pause, Plus, Clock, MousePointer2,
  CheckCircle2, XCircle, Loader2, ChevronRight, ChevronDown,
  Trash2, Edit3, History, X, ArrowRight, Sparkles, RefreshCw,
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RoutineStep {
  type: string;
  params: Record<string, unknown>;
}

interface Routine {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  trigger_type: "SCHEDULE" | "EVENT" | "MANUAL";
  cron_expression: string | null;
  schedule_label: string | null;
  event_trigger: string | null;
  prompt: string;
  steps_json: RoutineStep[];
  status: "ACTIVE" | "PAUSED" | "DRAFT";
  run_count: number;
  last_run_at: string | null;
  last_run_status: string | null;
  next_run_at: string | null;
  is_template: boolean;
  template_id: string | null;
  created_at: string;
  updated_at: string;
}

interface RoutineRun {
  id: number;
  routine_id: number;
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | "SKIPPED";
  trigger_source: string;
  trigger_detail: string | null;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  output_summary: string | null;
  actions_log: Array<{ step: string; status: string; ts: string }>;
  error_message: string | null;
}

interface Template {
  template_id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  trigger_type: string;
  cron_expression: string | null;
  schedule_label: string | null;
  event_trigger: string | null;
  prompt: string;
  steps_json: RoutineStep[];
}

// ─── Seed data (shown when backend unavailable) ───────────────────────────────

const SEED_ROUTINES: Routine[] = [
  {
    id: 1,
    name: "Morning Briefing",
    description: "Start every day with a crisp summary of new leads and follow-ups.",
    icon: "🌅",
    color: "amber",
    trigger_type: "SCHEDULE",
    cron_expression: "0 8 * * 1-6",
    schedule_label: "Weekdays at 8:00 AM",
    event_trigger: null,
    prompt: "Summarise all leads created in the last 24 hours and today's follow-ups. Email to owner.",
    steps_json: [
      { type: "fetch_data", params: { source: "leads" } },
      { type: "ai_summarise", params: { style: "daily_briefing" } },
      { type: "send_email", params: { recipient: "owner" } },
    ],
    status: "ACTIVE",
    run_count: 14,
    last_run_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    last_run_status: "SUCCESS",
    next_run_at: new Date(Date.now() + 20 * 3600000).toISOString(),
    is_template: false,
    template_id: "morning_briefing",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: 2,
    name: "Booking Confirmation Flow",
    description: "Auto-send voucher + WhatsApp notification when a booking is confirmed.",
    icon: "✅",
    color: "emerald",
    trigger_type: "EVENT",
    cron_expression: null,
    schedule_label: null,
    event_trigger: "booking.confirmed",
    prompt: "Generate voucher PDF, email client, WhatsApp ops team.",
    steps_json: [
      { type: "generate_pdf", params: { document: "voucher" } },
      { type: "send_email", params: { recipient: "client" } },
      { type: "send_whatsapp", params: { recipient: "ops_executive" } },
    ],
    status: "ACTIVE",
    run_count: 3,
    last_run_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    last_run_status: "SUCCESS",
    next_run_at: null,
    is_template: false,
    template_id: "booking_confirmation_flow",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: 3,
    name: "Cold Lead Revival",
    description: "Ping agents about leads that have gone quiet for 7+ days.",
    icon: "🥶",
    color: "cyan",
    trigger_type: "SCHEDULE",
    cron_expression: "0 18 * * 1-5",
    schedule_label: "Weekdays at 6:00 PM",
    event_trigger: null,
    prompt: "Find leads not updated in 7+ days. Send WhatsApp to assigned agents.",
    steps_json: [
      { type: "fetch_data", params: { source: "leads", filter: "cold_7d" } },
      { type: "send_whatsapp", params: { recipient: "assigned_agent" } },
    ],
    status: "PAUSED",
    run_count: 7,
    last_run_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    last_run_status: "SUCCESS",
    next_run_at: null,
    is_template: false,
    template_id: "cold_lead_revival",
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  amber:   { bg: "bg-amber-500/10",   border: "border-amber-500/30",   text: "text-amber-400",   badge: "bg-amber-500/20 text-amber-300" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-300" },
  cyan:    { bg: "bg-cyan-500/10",    border: "border-cyan-500/30",    text: "text-cyan-400",    badge: "bg-cyan-500/20 text-cyan-300" },
  blue:    { bg: "bg-blue-500/10",    border: "border-blue-500/30",    text: "text-blue-400",    badge: "bg-blue-500/20 text-blue-300" },
  purple:  { bg: "bg-purple-500/10",  border: "border-purple-500/30",  text: "text-purple-400",  badge: "bg-purple-500/20 text-purple-300" },
  red:     { bg: "bg-red-500/10",     border: "border-red-500/30",     text: "text-red-400",     badge: "bg-red-500/20 text-red-300" },
  green:   { bg: "bg-green-500/10",   border: "border-green-500/30",   text: "text-green-400",   badge: "bg-green-500/20 text-green-300" },
  yellow:  { bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  text: "text-yellow-400",  badge: "bg-yellow-500/20 text-yellow-300" },
};

function getColor(name: string) {
  return COLOR_MAP[name] ?? COLOR_MAP.emerald;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function futureTime(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 3600000) return `in ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `in ${Math.floor(diff / 3600000)}h`;
  return `in ${Math.floor(diff / 86400000)}d`;
}

function TriggerBadge({ routine }: { routine: Routine }) {
  if (routine.trigger_type === "SCHEDULE") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Clock className="w-3 h-3" />{routine.schedule_label ?? routine.cron_expression}
      </span>
    );
  }
  if (routine.trigger_type === "EVENT") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Zap className="w-3 h-3" />on <code className="text-emerald-400">{routine.event_trigger}</code>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
      <MousePointer2 className="w-3 h-3" />Manual only
    </span>
  );
}

function RunStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const map: Record<string, string> = {
    SUCCESS:   "text-emerald-400",
    FAILED:    "text-red-400",
    RUNNING:   "text-blue-400",
    QUEUED:    "text-yellow-400",
    CANCELLED: "text-slate-400",
    SKIPPED:   "text-slate-400",
  };
  const icons: Record<string, React.ReactNode> = {
    SUCCESS:   <CheckCircle2 className="w-3 h-3" />,
    FAILED:    <XCircle className="w-3 h-3" />,
    RUNNING:   <Loader2 className="w-3 h-3 animate-spin" />,
    QUEUED:    <Clock className="w-3 h-3" />,
    CANCELLED: <X className="w-3 h-3" />,
    SKIPPED:   <X className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${map[status] ?? "text-slate-400"}`}>
      {icons[status]}{status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ─── Create / Edit Modal ──────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  { value: "SCHEDULE", label: "Schedule", icon: <Clock className="w-4 h-4" />, desc: "Run automatically on a cron schedule" },
  { value: "EVENT",    label: "Event",    icon: <Zap className="w-4 h-4" />,   desc: "Fire when something happens in NAMA" },
  { value: "MANUAL",   label: "Manual",   icon: <MousePointer2 className="w-4 h-4" />, desc: "Run on demand only" },
];

const SCHEDULE_PRESETS = [
  { label: "Every day at 8 AM",     cron: "0 8 * * *",   display: "Daily at 8:00 AM" },
  { label: "Every weekday at 8 AM", cron: "0 8 * * 1-6", display: "Weekdays at 8:00 AM" },
  { label: "Every weekday at 6 PM", cron: "0 18 * * 1-5",display: "Weekdays at 6:00 PM" },
  { label: "Every Monday at 9 AM",  cron: "0 9 * * 1",   display: "Every Monday at 9:00 AM" },
  { label: "Every Sunday midnight", cron: "0 0 * * 0",   display: "Every Sunday at midnight" },
  { label: "Custom cron…",          cron: "custom",       display: "" },
];

const EVENT_OPTIONS = [
  "lead.created", "lead.status_changed", "booking.confirmed",
  "quotation.sent", "payment.received", "client.created",
];

interface CreateModalProps {
  onClose: () => void;
  onSave: (data: Partial<Routine>) => void;
  initial?: Partial<Routine>;
}

function CreateModal({ onClose, onSave, initial }: CreateModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [icon, setIcon] = useState(initial?.icon ?? "⚡");
  const [color, setColor] = useState(initial?.color ?? "emerald");
  const [triggerType, setTriggerType] = useState<"SCHEDULE" | "EVENT" | "MANUAL">(initial?.trigger_type ?? "SCHEDULE");
  const [selectedPreset, setSelectedPreset] = useState(SCHEDULE_PRESETS[0]);
  const [customCron, setCustomCron] = useState(initial?.cron_expression ?? "");
  const [eventTrigger, setEventTrigger] = useState(initial?.event_trigger ?? "lead.created");
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [saving, setSaving] = useState(false);

  const ICONS = ["⚡", "🌅", "📊", "🥶", "✅", "🔴", "💬", "📈", "🎂", "⏰", "🔔", "📋"];
  const COLORS = Object.keys(COLOR_MAP);

  const handleSave = () => {
    setSaving(true);
    const cronExpr = triggerType === "SCHEDULE"
      ? (selectedPreset.cron === "custom" ? customCron : selectedPreset.cron)
      : null;
    const schedLabel = triggerType === "SCHEDULE" && selectedPreset.cron !== "custom"
      ? selectedPreset.display
      : null;

    onSave({
      name,
      description,
      icon,
      color,
      trigger_type: triggerType,
      cron_expression: cronExpr,
      schedule_label: schedLabel,
      event_trigger: triggerType === "EVENT" ? eventTrigger : null,
      prompt,
      steps_json: [],
      status: "ACTIVE",
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-white font-semibold text-lg">
              {initial?.id ? "Edit Routine" : "New Routine"}
            </h2>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1 w-16 rounded-full transition-colors ${s <= step ? "bg-emerald-500" : "bg-slate-700"}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1 — Trigger */}
          {step === 1 && (
            <div className="space-y-5">
              <p className="text-slate-400 text-sm">When should this routine run?</p>

              {/* Trigger type selector */}
              <div className="grid grid-cols-3 gap-3">
                {TRIGGER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTriggerType(opt.value as typeof triggerType)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      triggerType === opt.value
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    <div className={triggerType === opt.value ? "text-emerald-400" : "text-slate-400"}>
                      {opt.icon}
                    </div>
                    <div className="text-white text-sm font-medium mt-2">{opt.label}</div>
                    <div className="text-slate-400 text-xs mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {/* Schedule sub-options */}
              {triggerType === "SCHEDULE" && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Schedule</p>
                  <div className="grid grid-cols-2 gap-2">
                    {SCHEDULE_PRESETS.map(p => (
                      <button
                        key={p.cron}
                        onClick={() => setSelectedPreset(p)}
                        className={`p-3 rounded-lg border text-sm text-left transition-all ${
                          selectedPreset.cron === p.cron
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {selectedPreset.cron === "custom" && (
                    <input
                      value={customCron}
                      onChange={e => setCustomCron(e.target.value)}
                      placeholder="e.g. 0 9 * * 1-5"
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-slate-500"
                    />
                  )}
                </div>
              )}

              {/* Event sub-options */}
              {triggerType === "EVENT" && (
                <div className="space-y-3">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Event trigger</p>
                  <div className="grid grid-cols-2 gap-2">
                    {EVENT_OPTIONS.map(ev => (
                      <button
                        key={ev}
                        onClick={() => setEventTrigger(ev)}
                        className={`p-3 rounded-lg border text-sm font-mono text-left transition-all ${
                          eventTrigger === ev
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                        }`}
                      >
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2 — What to do */}
          {step === 2 && (
            <div className="space-y-5">
              <p className="text-slate-400 text-sm">Name your routine and describe what it should do.</p>

              <div className="space-y-4">
                {/* Name + icon */}
                <div className="flex gap-3">
                  {/* Icon picker */}
                  <div className="relative group">
                    <button className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl hover:border-slate-500">
                      {icon}
                    </button>
                    <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl p-2 grid grid-cols-6 gap-1 z-10 hidden group-hover:grid">
                      {ICONS.map(i => (
                        <button key={i} onClick={() => setIcon(i)} className="w-8 h-8 rounded-lg hover:bg-slate-700 flex items-center justify-center text-lg">
                          {i}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Routine name"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Color */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Color</span>
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full ${getColor(c).badge} border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                    />
                  ))}
                </div>

                {/* Description */}
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm"
                />

                {/* Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300 text-sm font-medium">What should NAMA do?</span>
                  </div>
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={5}
                    placeholder="Describe in plain language what this routine should do. For example: &apos;Check all leads created in the last 24 hours. For any lead with status QUALIFIED, send a personalised WhatsApp message to the assigned agent and email a summary to the owner.&apos;"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none text-sm resize-none leading-relaxed"
                  />
                  <p className="text-slate-500 text-xs">NAMA&apos;s AI will parse this into a step-by-step action plan.</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Review */}
          {step === 3 && (
            <div className="space-y-5">
              <p className="text-slate-400 text-sm">Review your routine before activating.</p>

              <div className={`rounded-xl border p-5 space-y-4 ${getColor(color).bg} ${getColor(color).border}`}>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{name || "Unnamed Routine"}</h3>
                    <p className="text-slate-400 text-sm">{description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Trigger</span>
                    <div className="text-slate-200 mt-1">
                      {triggerType === "SCHEDULE" && (selectedPreset.display || customCron)}
                      {triggerType === "EVENT" && <code className="text-emerald-400">{eventTrigger}</code>}
                      {triggerType === "MANUAL" && "Manual only"}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">Status after save</span>
                    <div className="text-emerald-400 mt-1 font-medium">Active ✓</div>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 text-sm">Instructions</span>
                  <p className="text-slate-300 text-sm mt-1 leading-relaxed">{prompt || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-slate-300 text-sm">
                  NAMA will parse your instructions into an action plan and execute it on schedule using your live data. You can monitor every run in the history log.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as 1 | 2 | 3) : onClose()}
            className="px-4 py-2 text-slate-400 hover:text-white text-sm"
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep((step + 1) as 2 | 3)}
              disabled={step === 2 && !name.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving || !name.trim() || !prompt.trim()}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Activate Routine
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Run History Drawer ────────────────────────────────────────────────────────

function RunHistoryDrawer({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const [runs, setRuns] = useState<RoutineRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<RoutineRun[]>(`/api/v1/routines/${routine.id}/runs`);
        setRuns(data);
      } catch {
        // Seed data for demo
        setRuns([
          {
            id: 1, routine_id: routine.id, status: "SUCCESS", trigger_source: "schedule",
            trigger_detail: null,
            started_at: new Date(Date.now() - 12 * 3600000).toISOString(),
            completed_at: new Date(Date.now() - 12 * 3600000 + 1200).toISOString(),
            duration_ms: 1234,
            output_summary: "Routine completed successfully.\nSteps executed: 3\n✓ fetch_data\n✓ ai_summarise\n✓ send_email",
            actions_log: [
              { step: "fetch_data", status: "ok", ts: new Date(Date.now() - 12 * 3600000).toISOString() },
              { step: "ai_summarise", status: "ok", ts: new Date(Date.now() - 12 * 3600000 + 400).toISOString() },
              { step: "send_email", status: "ok", ts: new Date(Date.now() - 12 * 3600000 + 800).toISOString() },
            ],
            error_message: null,
          },
          {
            id: 2, routine_id: routine.id, status: "SUCCESS", trigger_source: "schedule",
            trigger_detail: null,
            started_at: new Date(Date.now() - 36 * 3600000).toISOString(),
            completed_at: new Date(Date.now() - 36 * 3600000 + 1100).toISOString(),
            duration_ms: 1109,
            output_summary: "Routine completed successfully.\nSteps executed: 3",
            actions_log: [],
            error_message: null,
          },
          {
            id: 3, routine_id: routine.id, status: "FAILED", trigger_source: "manual",
            trigger_detail: null,
            started_at: new Date(Date.now() - 60 * 3600000).toISOString(),
            completed_at: new Date(Date.now() - 60 * 3600000 + 200).toISOString(),
            duration_ms: 210,
            output_summary: null,
            actions_log: [],
            error_message: "Email delivery failed: Resend API key not configured",
          },
        ]);
      }
      setLoading(false);
    })();
  }, [routine.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-slate-900 border-l border-slate-700 w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <div>
            <h3 className="text-white font-semibold">{routine.icon} {routine.name}</h3>
            <p className="text-slate-400 text-sm mt-0.5">Run history</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No runs yet</p>
            </div>
          ) : (
            runs.map(run => (
              <div key={run.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <RunStatusBadge status={run.status} />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="capitalize">{run.trigger_source}</span>
                    <span>·</span>
                    <span>{relativeTime(run.started_at)}</span>
                    {run.duration_ms && <span>· {Math.round(run.duration_ms)}ms</span>}
                  </div>
                </div>

                {run.output_summary && (
                  <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono bg-slate-900/50 p-3 rounded-lg">
                    {run.output_summary}
                  </pre>
                )}

                {run.error_message && (
                  <div className="flex items-start gap-2 text-red-400 text-xs bg-red-500/10 p-3 rounded-lg">
                    <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {run.error_message}
                  </div>
                )}

                {run.actions_log.length > 0 && (
                  <div className="space-y-1">
                    {run.actions_log.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                        <code className="text-slate-300">{a.step}</code>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template Gallery ─────────────────────────────────────────────────────────

function TemplateGallery({ templates, onUse }: { templates: Template[]; onUse: (t: Template) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {templates.map(t => {
        const c = getColor(t.color);
        return (
          <div key={t.template_id} className={`rounded-xl border p-4 space-y-3 transition-all hover:shadow-lg ${c.bg} ${c.border}`}>
            <div className="flex items-start justify-between">
              <span className="text-2xl">{t.icon}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>
                {t.trigger_type === "SCHEDULE" ? "Scheduled" : t.trigger_type === "EVENT" ? "Event" : "Manual"}
              </span>
            </div>
            <div>
              <h4 className="text-white text-sm font-semibold">{t.name}</h4>
              <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">{t.description}</p>
            </div>
            {(t.schedule_label || t.event_trigger) && (
              <p className="text-slate-500 text-xs flex items-center gap-1">
                {t.schedule_label ? <><Clock className="w-3 h-3" />{t.schedule_label}</> : <><Zap className="w-3 h-3" />{t.event_trigger}</>}
              </p>
            )}
            <button
              onClick={() => onUse(t)}
              className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-medium border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-1"
            >
              Use template <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Routine Card ─────────────────────────────────────────────────────────────

function RoutineCard({
  routine,
  onToggle,
  onRun,
  onEdit,
  onDelete,
  onHistory,
  running,
}: {
  routine: Routine;
  onToggle: () => void;
  onRun: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHistory: () => void;
  running: boolean;
}) {
  const c = getColor(routine.color);
  const isActive = routine.status === "ACTIVE";

  return (
    <div className={`rounded-xl border p-5 transition-all ${c.bg} ${c.border} ${!isActive ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-2xl flex-shrink-0">{routine.icon}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white font-semibold text-sm">{routine.name}</h3>
              {routine.template_id && (
                <span className="text-xs text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">template</span>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                {routine.status.toLowerCase()}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5 line-clamp-1">{routine.description}</p>
            <div className="mt-2">
              <TriggerBadge routine={routine} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onRun}
            disabled={running}
            title="Run now"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-40"
          >
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={onToggle}
            title={isActive ? "Pause" : "Resume"}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button onClick={onHistory} title="Run history" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <History className="w-4 h-4" />
          </button>
          <button onClick={onEdit} title="Edit" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={onDelete} title="Delete" className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />{routine.run_count} runs
        </span>
        {routine.last_run_at && (
          <span className="flex items-center gap-1">
            Last: <RunStatusBadge status={routine.last_run_status} /> {relativeTime(routine.last_run_at)}
          </span>
        )}
        {routine.next_run_at && isActive && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Next {futureTime(routine.next_run_at)}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRoutine, setEditRoutine] = useState<Routine | null>(null);
  const [historyRoutine, setHistoryRoutine] = useState<Routine | null>(null);
  const [runningIds, setRunningIds] = useState<Set<number>>(new Set());
  const [showTemplates, setShowTemplates] = useState(true);
  const [tab, setTab] = useState<"all" | "active" | "paused">("all");
  const [templateToUse, setTemplateToUse] = useState<Template | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [routinesData, templatesData] = await Promise.all([
        api.get<Routine[]>("/api/v1/routines"),
        api.get<Template[]>("/api/v1/routines/templates"),
      ]);
      setRoutines(routinesData);
      setTemplates(templatesData);
    } catch {
      setRoutines(SEED_ROUTINES);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSave = async (data: Partial<Routine>) => {
    try {
      const saved = editRoutine
        ? await api.put<Routine>(`/api/v1/routines/${editRoutine.id}`, data)
        : await api.post<Routine>("/api/v1/routines", data);
      if (editRoutine) {
        setRoutines(r => r.map(x => x.id === saved.id ? saved : x));
      } else {
        setRoutines(r => [saved, ...r]);
      }
    } catch {
      // Optimistic update for demo
      const fake = { id: Date.now(), ...data, run_count: 0, last_run_at: null, last_run_status: null, next_run_at: null, is_template: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Routine;
      setRoutines(r => editRoutine ? r.map(x => x.id === editRoutine.id ? { ...x, ...data } : x) : [fake, ...r]);
    }
    setShowCreate(false);
    setEditRoutine(null);
    setTemplateToUse(null);
  };

  const handleToggle = async (routine: Routine) => {
    try {
      const updated = await api.post<{ status: string }>(`/api/v1/routines/${routine.id}/toggle`, {});
      setRoutines(r => r.map(x => x.id === routine.id ? { ...x, status: updated.status as Routine["status"] } : x));
    } catch {
      setRoutines(r => r.map(x =>
        x.id === routine.id ? { ...x, status: x.status === "ACTIVE" ? "PAUSED" : "ACTIVE" } : x
      ));
    }
  };

  const handleRun = async (routine: Routine) => {
    setRunningIds(s => new Set(s).add(routine.id));
    try {
      await api.post(`/api/v1/routines/${routine.id}/run`, {});
      setTimeout(() => {
        setRunningIds(s => { const ns = new Set(s); ns.delete(routine.id); return ns; });
        setRoutines(r => r.map(x =>
          x.id === routine.id
            ? { ...x, run_count: x.run_count + 1, last_run_at: new Date().toISOString(), last_run_status: "SUCCESS" }
            : x
        ));
      }, 1500);
    } catch {
      setTimeout(() => { setRunningIds(s => { const ns = new Set(s); ns.delete(routine.id); return ns; }); }, 1500);
    }
  };

  const handleDelete = async (routine: Routine) => {
    if (!confirm(`Delete "${routine.name}"?`)) return;
    try {
      await api.delete(`/api/v1/routines/${routine.id}`);
    } catch { /* demo */ }
    setRoutines(r => r.filter(x => x.id !== routine.id));
  };

  const filtered = routines.filter(r => {
    if (tab === "active") return r.status === "ACTIVE";
    if (tab === "paused") return r.status === "PAUSED";
    return true;
  });

  const activeCount = routines.filter(r => r.status === "ACTIVE").length;
  const totalRuns = routines.reduce((s, r) => s + r.run_count, 0);

  // Build initial state when using a template
  const templateInitial = templateToUse ? {
    name: templateToUse.name,
    description: templateToUse.description,
    icon: templateToUse.icon,
    color: templateToUse.color,
    trigger_type: templateToUse.trigger_type as "SCHEDULE" | "EVENT" | "MANUAL",
    cron_expression: templateToUse.cron_expression,
    schedule_label: templateToUse.schedule_label,
    event_trigger: templateToUse.event_trigger,
    prompt: templateToUse.prompt,
    template_id: templateToUse.template_id,
  } : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-emerald-400" /> Routines
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Automated workflows that run on your schedule — powered by NAMA&apos;s AI, no external tools needed.
          </p>
        </div>
        <button
          onClick={() => { setEditRoutine(null); setTemplateToUse(null); setShowCreate(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> New Routine
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Routines", value: activeCount, icon: <Zap className="w-4 h-4 text-emerald-400" /> },
          { label: "Total Runs",      value: totalRuns,   icon: <RefreshCw className="w-4 h-4 text-blue-400" /> },
          { label: "Total Routines",  value: routines.length, icon: <Star className="w-4 h-4 text-amber-400" /> },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="flex items-center gap-2 text-slate-400 text-xs">{s.icon}{s.label}</div>
            <div className="text-white font-bold text-2xl mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Template Gallery */}
      {templates.length > 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="w-full flex items-center justify-between p-5 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-white font-medium text-sm">Template Library</span>
              <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">{templates.length} routines</span>
            </div>
            {showTemplates ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
          </button>
          {showTemplates && (
            <div className="p-5 pt-0">
              <TemplateGallery
                templates={templates}
                onUse={(t) => { setTemplateToUse(t); setEditRoutine(null); setShowCreate(true); }}
              />
            </div>
          )}
        </div>
      )}

      {/* My Routines */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">My Routines</h2>
          <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
            {(["all", "active", "paused"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${tab === t ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-slate-700 rounded-xl">
            <Zap className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No routines yet</p>
            <p className="text-slate-500 text-sm mt-1">Pick a template above or create your own</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Routine
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(r => (
              <RoutineCard
                key={r.id}
                routine={r}
                onToggle={() => handleToggle(r)}
                onRun={() => handleRun(r)}
                onEdit={() => { setEditRoutine(r); setShowCreate(true); }}
                onDelete={() => handleDelete(r)}
                onHistory={() => setHistoryRoutine(r)}
                running={runningIds.has(r.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {(showCreate || editRoutine) && (
        <CreateModal
          onClose={() => { setShowCreate(false); setEditRoutine(null); setTemplateToUse(null); }}
          onSave={handleSave}
          initial={editRoutine ?? templateInitial}
        />
      )}
      {historyRoutine && (
        <RunHistoryDrawer routine={historyRoutine} onClose={() => setHistoryRoutine(null)} />
      )}
    </div>
  );
}
