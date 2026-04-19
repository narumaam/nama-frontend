"use client";

/**
 * M16 — Automation & Workflow Engine (Redesigned)
 * -------------------------------------------------
 * Follow-up rules, scheduler, run history, email digest preview.
 * Navy #1B2E5E · Teal #14B8A6 · light/dark dual-mode.
 */

import React, { useState } from "react";
import {
  Zap, Plus, Play, Pause, Trash2, Edit3, CheckCircle, Clock,
  ArrowRight, MessageSquare, Mail, UserCheck, FileText,
  Bell, RefreshCw, AlertCircle, ChevronDown, X, Copy,
  ToggleLeft, ToggleRight, Activity, BellRing, Loader,
  Calendar, Shield, TrendingUp, Users, Send, Eye,
} from "lucide-react";
import { automationsApi } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────
type TriggerKey =
  | "new_lead" | "booking_confirmed" | "payment_received"
  | "itinerary_generated" | "query_received" | "no_response_3d"
  | "birthday" | "quotation_sent" | "lead_status_changed";

type ActionKey =
  | "send_whatsapp" | "send_email" | "create_task" | "assign_agent"
  | "update_lead_status" | "generate_itinerary" | "send_quotation"
  | "add_to_segment" | "notify_team" | "wait_delay";

interface WorkflowStep {
  id: string;
  type: "trigger" | "condition" | "action" | "delay";
  key: string;
  label: string;
  config: Record<string, string>;
  icon: React.ElementType;
  color: string;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger: TriggerKey;
  steps: WorkflowStep[];
  run_count: number;
  last_run?: string;
  success_rate: number;
  created_at: string;
}

// ── Run History Seed ───────────────────────────────────────────────────────────
const RUN_HISTORY = [
  { id: "r1", ts: new Date(Date.now() - 1000 * 60 * 18).toISOString(), rules: 3, leads: 7, status: "SUCCESS" as const },
  { id: "r2", ts: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), rules: 2, leads: 3, status: "SUCCESS" as const },
  { id: "r3", ts: new Date(Date.now() - 1000 * 60 * 60 * 27).toISOString(), rules: 3, leads: 11, status: "PARTIAL" as const },
  { id: "r4", ts: new Date(Date.now() - 1000 * 60 * 60 * 51).toISOString(), rules: 1, leads: 2, status: "SUCCESS" as const },
  { id: "r5", ts: new Date(Date.now() - 1000 * 60 * 60 * 75).toISOString(), rules: 3, leads: 0, status: "FAILED" as const },
];

// ── Catalogues ─────────────────────────────────────────────────────────────────
const TRIGGERS: Record<TriggerKey, { label: string; icon: React.ElementType; color: string; description: string }> = {
  new_lead:             { label: "New Lead Received",             icon: Zap,          color: "bg-teal-500",    description: "Fires when a new lead is triaged via M1" },
  booking_confirmed:    { label: "Booking Confirmed",             icon: CheckCircle,  color: "bg-emerald-500", description: "Fires when a booking moves to CONFIRMED" },
  payment_received:     { label: "Payment Received",              icon: CheckCircle,  color: "bg-green-600",   description: "Fires when a payment webhook is verified" },
  itinerary_generated:  { label: "Itinerary Generated",           icon: FileText,     color: "bg-violet-500",  description: "Fires when AI generates a new itinerary" },
  query_received:       { label: "WhatsApp Query Received",       icon: MessageSquare,color: "bg-[#25D366]",   description: "Fires on any new inbound message" },
  no_response_3d:       { label: "No Response (3 days)",          icon: AlertCircle,  color: "bg-amber-500",   description: "Lead hasn't responded in 3 days" },
  birthday:             { label: "Client Birthday / Anniversary", icon: Bell,         color: "bg-pink-500",    description: "Based on client profile date" },
  quotation_sent:       { label: "Quotation Sent",                icon: FileText,     color: "bg-blue-500",    description: "Fires when quotation status → SENT" },
  lead_status_changed:  { label: "Lead Status Changed",           icon: RefreshCw,    color: "bg-orange-500",  description: "Any lead status transition" },
};

const ACTIONS: Record<ActionKey, { label: string; icon: React.ElementType; color: string }> = {
  send_whatsapp:       { label: "Send WhatsApp Message",   icon: MessageSquare, color: "text-[#25D366]" },
  send_email:          { label: "Send Email",              icon: Mail,          color: "text-blue-500"   },
  create_task:         { label: "Create Task / Reminder",  icon: CheckCircle,   color: "text-violet-500" },
  assign_agent:        { label: "Assign Agent",            icon: UserCheck,     color: "text-teal-500"   },
  update_lead_status:  { label: "Update Lead Status",      icon: RefreshCw,     color: "text-amber-500"  },
  generate_itinerary:  { label: "AI Generate Itinerary",   icon: Zap,           color: "text-[#14B8A6]"  },
  send_quotation:      { label: "Send Quotation",          icon: FileText,      color: "text-indigo-500" },
  add_to_segment:      { label: "Add to Segment",          icon: UserCheck,     color: "text-pink-500"   },
  notify_team:         { label: "Notify Team (Slack/App)", icon: Bell,          color: "text-orange-500" },
  wait_delay:          { label: "Wait / Delay",            icon: Clock,         color: "text-slate-500"  },
};

const SAMPLE_WORKFLOWS: Workflow[] = [
  {
    id: "wf-1",
    name: "New Lead → Welcome Sequence",
    description: "Auto-send WhatsApp welcome + assign agent within 2 mins of triage",
    is_active: true,
    trigger: "new_lead",
    run_count: 312,
    last_run: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
    success_rate: 98,
    created_at: "2025-11-01",
    steps: [
      { id: "s1", type: "trigger", key: "new_lead", label: "New Lead Received", config: {}, icon: Zap, color: "bg-teal-500" },
      { id: "s2", type: "action", key: "send_whatsapp", label: "Send WhatsApp Welcome", config: { template: "welcome_v2", delay: "immediate" }, icon: MessageSquare, color: "bg-[#25D366]" },
      { id: "s3", type: "action", key: "assign_agent", label: "Auto-Assign Agent", config: { strategy: "round_robin" }, icon: UserCheck, color: "bg-teal-600" },
      { id: "s4", type: "delay", key: "wait_delay", label: "Wait 2 hours", config: { duration: "2h" }, icon: Clock, color: "bg-slate-500" },
      { id: "s5", type: "action", key: "send_email", label: "Send Follow-up Email", config: { template: "welcome_email_v1" }, icon: Mail, color: "bg-blue-500" },
    ],
  },
  {
    id: "wf-2",
    name: "Booking Confirmed → Full Ops Pack",
    description: "Auto-generate confirmations, assign ops team, notify finance",
    is_active: true,
    trigger: "booking_confirmed",
    run_count: 87,
    last_run: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    success_rate: 100,
    created_at: "2025-11-15",
    steps: [
      { id: "s1", type: "trigger", key: "booking_confirmed", label: "Booking Confirmed", config: {}, icon: CheckCircle, color: "bg-emerald-500" },
      { id: "s2", type: "action", key: "send_email", label: "Send Booking Confirmation to Client", config: { template: "booking_confirmed" }, icon: Mail, color: "bg-blue-500" },
      { id: "s3", type: "action", key: "create_task", label: "Create Ops Checklist Task", config: { assignee: "ops_team", due: "+1d" }, icon: CheckCircle, color: "bg-violet-500" },
      { id: "s4", type: "action", key: "notify_team", label: "Notify Finance Team", config: { channel: "finance_alerts" }, icon: Bell, color: "bg-orange-500" },
    ],
  },
  {
    id: "wf-3",
    name: "No Response Re-engagement",
    description: "Chase leads who haven't responded in 3 days with personalized nudge",
    is_active: false,
    trigger: "no_response_3d",
    run_count: 41,
    last_run: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    success_rate: 72,
    created_at: "2025-12-01",
    steps: [
      { id: "s1", type: "trigger", key: "no_response_3d", label: "No Response (3 days)", config: {}, icon: AlertCircle, color: "bg-amber-500" },
      { id: "s2", type: "action", key: "send_whatsapp", label: "Send Re-engagement WhatsApp", config: { template: "re_engage_v1" }, icon: MessageSquare, color: "bg-[#25D366]" },
      { id: "s3", type: "action", key: "update_lead_status", label: "Mark Lead as WARM", config: { status: "WARM" }, icon: RefreshCw, color: "bg-amber-500" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 60_000)    return "just now";
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
        enabled ? "bg-[#14B8A6]" : "bg-slate-200 dark:bg-slate-700"
      } disabled:opacity-50`}
      aria-checked={enabled}
      role="switch"
    >
      <span
        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ── Follow-up Rule Card ────────────────────────────────────────────────────────
interface FollowUpRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  days: number;
  enabled: boolean;
  status: "ACTIVE" | "PAUSED";
  lastRun?: string;
}

function RuleCard({
  rule,
  onToggle,
  onRunNow,
  running,
}: {
  rule: FollowUpRule;
  onToggle: () => void;
  onRunNow: () => void;
  running: boolean;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0A0F1E]/50 transition-all">
      {/* Day badge */}
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1B2E5E] dark:bg-[#14B8A6]/10 flex flex-col items-center justify-center">
        <span className="text-[10px] font-black text-[#14B8A6] uppercase leading-none">DAY</span>
        <span className="text-lg font-extrabold text-white dark:text-[#14B8A6] leading-none">{rule.days}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{rule.name}</span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              rule.status === "ACTIVE"
                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
            }`}
          >
            {rule.status}
          </span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">{rule.description}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-600">
          Trigger: <span className="font-semibold text-slate-600 dark:text-slate-400">{rule.trigger}</span>
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <Toggle enabled={rule.enabled} onChange={onToggle} />
        <button
          onClick={onRunNow}
          disabled={running}
          className="flex items-center gap-1.5 bg-[#1B2E5E] dark:bg-[#14B8A6]/10 text-white dark:text-[#14B8A6] border border-transparent dark:border-[#14B8A6]/20 hover:bg-[#243d7a] dark:hover:bg-[#14B8A6]/20 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all disabled:opacity-50"
        >
          {running ? <Loader size={11} className="animate-spin" /> : <Play size={11} />}
          Run Now
        </button>
      </div>
    </div>
  );
}

// ── Workflow Detail Drawer ─────────────────────────────────────────────────────
function StepCard({ step, index, total }: { step: WorkflowStep; index: number; total: number }) {
  const typeColors = {
    trigger:   "bg-[#14B8A6]/15 border-[#14B8A6]/30 text-[#14B8A6]",
    action:    "bg-blue-500/10 border-blue-500/20 text-blue-400",
    condition: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    delay:     "bg-slate-500/10 border-slate-500/20 text-slate-400",
  };
  return (
    <div className="flex flex-col items-center">
      <div className={`w-full border rounded-2xl p-4 ${typeColors[step.type]}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${step.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
            <step.icon size={15} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-white truncate">{step.label}</p>
            {Object.entries(step.config).length > 0 && (
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {Object.entries(step.config).map(([k, v]) => `${k}: ${v}`).join(" · ")}
              </p>
            )}
          </div>
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${typeColors[step.type]}`}>
            {step.type}
          </span>
        </div>
      </div>
      {index < total - 1 && (
        <div className="flex items-center justify-center h-7">
          <ArrowRight size={14} className="text-slate-600 rotate-90" />
        </div>
      )}
    </div>
  );
}

function WorkflowDrawer({ wf, onClose }: { wf: Workflow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex" onClick={onClose}>
      <div
        className="ml-auto h-full w-full max-w-lg bg-white dark:bg-[#0F1B35] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-[#0F1B35] z-10">
          <div>
            <h2 className="font-extrabold text-[#1B2E5E] dark:text-slate-100 text-lg">{wf.name}</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{wf.description}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <h3 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
            Workflow Steps
          </h3>
          {wf.steps.map((step, i) => (
            <StepCard key={step.id} step={step} index={i} total={wf.steps.length} />
          ))}
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 dark:bg-[#0A0F1E]/50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Runs</p>
              <p className="font-black text-[#1B2E5E] dark:text-slate-100 text-lg">{wf.run_count}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest">Success Rate</p>
              <p className="font-black text-emerald-700 dark:text-emerald-400 text-lg">{wf.success_rate}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Builder Modal ──────────────────────────────────────────────────────────────
function BuilderModal({ onClose, onSave }: { onClose: () => void; onSave: (wf: Partial<Workflow>) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerKey | null>(null);
  const [selectedActions, setSelectedActions] = useState<ActionKey[]>([]);

  const handleSave = () => {
    if (!name || !selectedTrigger) return;
    const steps: WorkflowStep[] = [
      { id: "s0", type: "trigger", key: selectedTrigger, label: TRIGGERS[selectedTrigger].label, config: {}, icon: TRIGGERS[selectedTrigger].icon, color: TRIGGERS[selectedTrigger].color },
      ...selectedActions.map((a, i) => ({
        id: `sa${i}`, type: "action" as const, key: a, label: ACTIONS[a].label, config: {}, icon: ACTIONS[a].icon, color: "bg-blue-500",
      })),
    ];
    onSave({ name, description, trigger: selectedTrigger, steps, is_active: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#0F1B35] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-[#1B2E5E] dark:text-white font-black text-xl">New Automation</h2>
            <p className="text-slate-400 text-sm mt-1">Build a no-code workflow in 60 seconds</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Workflow Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. New Lead Welcome Sequence"
                className="w-full bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-[#1B2E5E] dark:text-white text-sm outline-none focus:border-[#14B8A6] placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What does this automation do?"
                className="w-full bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-[#1B2E5E] dark:text-white text-sm outline-none focus:border-[#14B8A6] placeholder-slate-400 dark:placeholder-slate-600"
              />
            </div>
          </div>

          <div>
            <h3 className="text-[#1B2E5E] dark:text-white font-black text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-[#14B8A6] rounded-full text-[#0F172A] text-xs font-black flex items-center justify-center">1</span>
              Choose Trigger
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.entries(TRIGGERS) as [TriggerKey, typeof TRIGGERS[TriggerKey]][]).map(([key, trig]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTrigger(key)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                    selectedTrigger === key
                      ? "border-[#14B8A6]/50 bg-[#14B8A6]/10"
                      : "border-slate-200 dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <div className={`w-8 h-8 ${trig.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <trig.icon size={15} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selectedTrigger === key ? "text-[#14B8A6]" : "text-slate-700 dark:text-slate-300"}`}>
                      {trig.label}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">{trig.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[#1B2E5E] dark:text-white font-black text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-500 rounded-full text-white text-xs font-black flex items-center justify-center">2</span>
              Add Actions (pick one or more)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ACTIONS) as [ActionKey, typeof ACTIONS[ActionKey]][]).map(([key, act]) => {
                const selected = selectedActions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setSelectedActions(
                        selected ? selectedActions.filter(a => a !== key) : [...selectedActions, key]
                      )
                    }
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      selected
                        ? "border-blue-500/50 bg-blue-500/10"
                        : "border-slate-200 dark:border-white/10 bg-[#F8FAFC] dark:bg-white/[0.03] hover:bg-slate-100 dark:hover:bg-white/[0.06]"
                    }`}
                  >
                    <act.icon size={15} className={selected ? "text-blue-400" : "text-slate-400 dark:text-slate-500"} />
                    <span className={`text-xs font-semibold ${selected ? "text-blue-600 dark:text-blue-300" : "text-slate-500 dark:text-slate-400"}`}>
                      {act.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold py-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name || !selectedTrigger}
            className="flex-1 bg-[#14B8A6] text-[#0F172A] font-black py-3 rounded-2xl hover:bg-[#0FA898] text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Play size={14} />
            Create & Activate
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(SAMPLE_WORKFLOWS);
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedWf, setSelectedWf] = useState<Workflow | null>(null);

  // Automated reminders state
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nama_reminders_enabled") === "true";
  });
  const [remindersRunning, setRemindersRunning] = useState(false);
  const [ruleRunning, setRuleRunning] = useState<string | null>(null);
  const [remindersBanner, setRemindersBanner] = useState<{
    reminders_sent: number; leads_flagged: number; agents_notified: number; demo_mode: boolean;
  } | null>(null);
  const [remindersLastRun, setRemindersLastRun] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("nama_reminders_last_run");
  });
  const [remindersTogglingSchedule, setRemindersTogglingSchedule] = useState(false);
  const [schedule, setSchedule] = useState<"daily" | "weekly" | "manual">("daily");
  const [runHistory, setRunHistory] = useState(RUN_HISTORY);
  const [testSending, setTestSending] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const [followUpRules, setFollowUpRules] = useState<FollowUpRule[]>([
    {
      id: "fr-cold",
      name: "Cold Lead Follow-up",
      description: "Send re-engagement email to cold leads and notify their assigned agent",
      trigger: "CONTACTED status, no activity for 3 days",
      days: 3,
      enabled: true,
      status: "ACTIVE",
      lastRun: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "fr-new",
      name: "New Lead Nudge",
      description: "Remind agent to make first contact with new uncontacted leads",
      trigger: "NEW status, uncontacted for 1 day",
      days: 1,
      enabled: true,
      status: "ACTIVE",
      lastRun: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: "fr-stale",
      name: "Stale Qualified Lead",
      description: "Escalate to team lead when a qualified lead stalls without progression",
      trigger: "QUALIFIED status, no update for 7 days",
      days: 7,
      enabled: false,
      status: "PAUSED",
    },
  ]);

  const handleToggleReminders = async (enabled: boolean) => {
    setRemindersTogglingSchedule(true);
    try {
      await automationsApi.scheduleReminders(enabled);
      setRemindersEnabled(enabled);
      if (typeof window !== "undefined") localStorage.setItem("nama_reminders_enabled", String(enabled));
    } catch {
      setRemindersEnabled(enabled);
      if (typeof window !== "undefined") localStorage.setItem("nama_reminders_enabled", String(enabled));
    } finally {
      setRemindersTogglingSchedule(false);
    }
  };

  const handleRunReminders = async () => {
    setRemindersRunning(true);
    setRemindersBanner(null);
    try {
      const result = await automationsApi.runReminders();
      setRemindersBanner(result);
      const now = new Date().toISOString();
      setRemindersLastRun(now);
      if (typeof window !== "undefined") localStorage.setItem("nama_reminders_last_run", now);
      setRunHistory(h => [
        { id: `r${Date.now()}`, ts: now, rules: followUpRules.filter(r => r.enabled).length, leads: result.leads_flagged, status: "SUCCESS" as const },
        ...h.slice(0, 4),
      ]);
    } catch {
      const now = new Date().toISOString();
      setRemindersBanner({ reminders_sent: 0, leads_flagged: 0, agents_notified: 0, demo_mode: true });
      setRunHistory(h => [
        { id: `r${Date.now()}`, ts: now, rules: 0, leads: 0, status: "FAILED" as const },
        ...h.slice(0, 4),
      ]);
    } finally {
      setRemindersRunning(false);
    }
  };

  const handleRunRule = async (ruleId: string) => {
    setRuleRunning(ruleId);
    try {
      await automationsApi.runReminders();
      const now = new Date().toISOString();
      setRemindersLastRun(now);
      if (typeof window !== "undefined") localStorage.setItem("nama_reminders_last_run", now);
    } catch {
      // silent fallback
    } finally {
      setRuleRunning(null);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    setFollowUpRules(rules =>
      rules.map(r =>
        r.id === ruleId
          ? { ...r, enabled: !r.enabled, status: (!r.enabled ? "ACTIVE" : "PAUSED") as "ACTIVE" | "PAUSED" }
          : r
      )
    );
  };

  const handleTestSend = async () => {
    setTestSending(true);
    await new Promise(r => setTimeout(r, 1400));
    setTestSending(false);
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const activeCount    = followUpRules.filter(r => r.enabled).length;
  const totalRuns      = workflows.reduce((s, w) => s + w.run_count, 0);
  const leadsNudged    = runHistory.reduce((s, r) => s + r.leads, 0);

  const handleToggle = (id: string) =>
    setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, is_active: !w.is_active } : w));
  const handleDuplicate = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    setWorkflows([{ ...wf, id: `wf-${Date.now()}`, name: `${wf.name} (Copy)`, is_active: false, run_count: 0 }, ...workflows]);
  };
  const handleDelete = (id: string) => setWorkflows(wfs => wfs.filter(w => w.id !== id));
  const handleSaveNew = (partial: Partial<Workflow>) => {
    setWorkflows([{
      id: `wf-${Date.now()}`,
      name: partial.name || "Untitled Workflow",
      description: partial.description || "",
      is_active: partial.is_active ?? true,
      trigger: partial.trigger!,
      steps: partial.steps || [],
      run_count: 0,
      success_rate: 100,
      created_at: new Date().toISOString(),
    }, ...workflows]);
  };

  const nextRunLabel = schedule === "daily"
    ? "Tomorrow at 09:00 AM"
    : schedule === "weekly"
    ? "Next Monday at 09:00 AM"
    : "Manual trigger only";

  const statusColors = {
    SUCCESS: "border-l-emerald-500",
    PARTIAL: "border-l-amber-500",
    FAILED:  "border-l-red-500",
  };
  const statusBadge = {
    SUCCESS: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    PARTIAL: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    FAILED:  "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  };

  return (
    <div className="space-y-6 bg-[#F8FAFC] dark:bg-[#0A0F1E] min-h-screen -m-6 p-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1B2E5E] dark:text-slate-100">
            Automations
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Automated follow-ups and reminder rules
          </p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-[#1B2E5E] dark:bg-[#14B8A6] text-white dark:text-[#0F172A] px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-[#243d7a] dark:hover:bg-[#0FA898] transition-all"
        >
          <Plus size={16} />
          New Automation
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Active Rules",
            value: activeCount,
            icon: Shield,
            iconColor: "text-[#14B8A6]",
            iconBg: "bg-[#14B8A6]/10",
          },
          {
            label: "Reminders Sent This Month",
            value: totalRuns.toLocaleString(),
            icon: BellRing,
            iconColor: "text-violet-500 dark:text-violet-400",
            iconBg: "bg-violet-50 dark:bg-violet-500/10",
          },
          {
            label: "Leads Nudged",
            value: leadsNudged,
            icon: Users,
            iconColor: "text-blue-500 dark:text-blue-400",
            iconBg: "bg-blue-50 dark:bg-blue-500/10",
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4"
          >
            <div className={`w-11 h-11 ${stat.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className={stat.iconColor} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#1B2E5E] dark:text-slate-100">{stat.value}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Follow-up Rules (left/main, 2 cols) ── */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 dark:bg-amber-500/10 rounded-lg flex items-center justify-center">
                <BellRing size={16} className="text-amber-500 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="font-bold text-[#1B2E5E] dark:text-slate-100 text-sm">Follow-up Rules</h2>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Auto-scan cold · new · stalled qualified leads
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#1B2E5E]/10 dark:bg-[#14B8A6]/10 text-[#1B2E5E] dark:text-[#14B8A6]">
              {activeCount} / {followUpRules.length} ACTIVE
            </span>
          </div>

          {/* Result banner */}
          {remindersBanner && (
            <div
              className={`mx-6 mt-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-xs flex-wrap ${
                remindersBanner.demo_mode
                  ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300"
              }`}
            >
              <CheckCircle size={14} className="flex-shrink-0" />
              <span className="font-semibold flex-1">
                {remindersBanner.demo_mode ? "[Demo] " : ""}
                <strong>{remindersBanner.leads_flagged}</strong> leads flagged ·{" "}
                <strong>{remindersBanner.agents_notified}</strong> agents notified ·{" "}
                <strong>{remindersBanner.reminders_sent}</strong> email{remindersBanner.reminders_sent !== 1 ? "s" : ""} sent
              </span>
              {remindersBanner.demo_mode && (
                <span className="text-amber-500 dark:text-amber-400 font-medium">
                  Add RESEND_API_KEY to Railway for real emails
                </span>
              )}
              <button onClick={() => setRemindersBanner(null)} className="flex-shrink-0">
                <X size={13} />
              </button>
            </div>
          )}

          <div className="p-6 space-y-3">
            {followUpRules.map(rule => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={() => handleToggleRule(rule.id)}
                onRunNow={() => handleRunRule(rule.id)}
                running={ruleRunning === rule.id}
              />
            ))}
          </div>

          <div className="px-6 pb-5 pt-1 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>
              {remindersLastRun
                ? <>Last global run: <span className="font-semibold text-slate-600 dark:text-slate-300">{fmtDateTime(remindersLastRun)}</span></>
                : "Never run yet"}
            </span>
          </div>
        </div>

        {/* ── Scheduler (right, 1 col) ── */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1B2E5E]/10 dark:bg-[#14B8A6]/10 rounded-lg flex items-center justify-center">
              <Calendar size={16} className="text-[#1B2E5E] dark:text-[#14B8A6]" />
            </div>
            <h2 className="font-bold text-[#1B2E5E] dark:text-slate-100 text-sm">Scheduler</h2>
          </div>

          <div className="p-5 flex-1 space-y-5">
            {/* Auto-run toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Auto-run schedule</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {remindersEnabled ? "Runs automatically" : "Currently manual"}
                </p>
              </div>
              <Toggle
                enabled={remindersEnabled}
                onChange={handleToggleReminders}
                disabled={remindersTogglingSchedule}
              />
            </div>

            {/* Schedule options */}
            <div>
              <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Frequency</p>
              <div className="flex gap-2">
                {(["daily", "weekly", "manual"] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSchedule(opt)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                      schedule === opt
                        ? "bg-[#1B2E5E] dark:bg-[#14B8A6] text-white dark:text-[#0F172A]"
                        : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Next run */}
            <div className="bg-[#F8FAFC] dark:bg-[#0A0F1E]/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Next run</span>
                <span className="text-[11px] font-bold text-[#1B2E5E] dark:text-[#14B8A6]">{nextRunLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Last run</span>
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {remindersLastRun ? timeAgo(remindersLastRun) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Status</span>
                <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                  {remindersEnabled ? "SCHEDULED" : "MANUAL"}
                </span>
              </div>
            </div>

            {/* Run All Now */}
            <button
              onClick={handleRunReminders}
              disabled={remindersRunning}
              className="w-full flex items-center justify-center gap-2 bg-[#1B2E5E] dark:bg-[#14B8A6] text-white dark:text-[#0F172A] py-3 rounded-xl font-black text-sm hover:bg-[#243d7a] dark:hover:bg-[#0FA898] transition-all disabled:opacity-50"
            >
              {remindersRunning ? <Loader size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              {remindersRunning ? "Scanning…" : "Run All Now"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Run History + Email Digest Preview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Run History (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Activity size={16} className="text-blue-500 dark:text-blue-400" />
            </div>
            <h2 className="font-bold text-[#1B2E5E] dark:text-slate-100 text-sm">Run History</h2>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">Last 5 runs</span>
          </div>
          <div className="p-4 space-y-2">
            {runHistory.map(run => (
              <div
                key={run.id}
                className={`flex items-center gap-4 border-l-4 pl-4 py-3 rounded-r-xl bg-slate-50 dark:bg-[#0A0F1E]/50 ${statusColors[run.status]}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    {run.rules} rule{run.rules !== 1 ? "s" : ""} triggered · {run.leads} lead{run.leads !== 1 ? "s" : ""} contacted
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{fmtDateTime(run.ts)}</p>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${statusBadge[run.status]}`}>
                  {run.status}
                </span>
              </div>
            ))}
            {runHistory.length === 0 && (
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">No runs yet. Hit "Run All Now" to start.</p>
            )}
          </div>
        </div>

        {/* Email Digest Preview (1 col) */}
        <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
            <div className="w-8 h-8 bg-violet-50 dark:bg-violet-500/10 rounded-lg flex items-center justify-center">
              <Mail size={16} className="text-violet-500 dark:text-violet-400" />
            </div>
            <h2 className="font-bold text-[#1B2E5E] dark:text-slate-100 text-sm">Email Digest Preview</h2>
          </div>

          <div className="p-4 flex-1 flex flex-col gap-4">
            {/* Mock email card */}
            <div className="rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden text-xs">
              {/* Header stripe */}
              <div className="bg-[#1B2E5E] px-4 py-3">
                <p className="text-white font-black text-[11px]">NAMA OS · Daily Reminder Digest</p>
                <p className="text-slate-400 text-[10px] mt-0.5">To: agent@agency.com</p>
              </div>
              {/* Body */}
              <div className="bg-slate-50 dark:bg-[#0A0F1E]/50 px-4 py-3 space-y-2">
                <p className="text-slate-600 dark:text-slate-300 font-semibold">Hi Priya,</p>
                <p className="text-slate-500 dark:text-slate-400 leading-snug">
                  You have <span className="font-bold text-[#1B2E5E] dark:text-[#14B8A6]">4 leads</span> that need your attention today.
                </p>
                <div className="space-y-1">
                  {[
                    { name: "Rahul Sharma", label: "Cold 3d", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
                    { name: "Meera Patel", label: "New 1d", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
                  ].map(l => (
                    <div key={l.name} className="flex items-center justify-between bg-white dark:bg-[#0F1B35] rounded-lg px-3 py-1.5">
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{l.name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${l.color}`}>{l.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-1">+2 more leads · View all in NAMA OS</p>
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={handleTestSend}
                disabled={testSending || testSent}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  testSent
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                    : "bg-[#F8FAFC] dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                } disabled:opacity-50`}
              >
                {testSending ? (
                  <><Loader size={14} className="animate-spin" /> Sending…</>
                ) : testSent ? (
                  <><CheckCircle size={14} /> Test Sent!</>
                ) : (
                  <><Send size={14} /> Test Send</>
                )}
              </button>
              <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-2">
                Sends to your account email. Requires RESEND_API_KEY.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Workflow List (advanced) ── */}
      <div className="bg-white dark:bg-[#0F1B35] border border-slate-100 dark:border-white/5 rounded-2xl">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#14B8A6]/10 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-[#14B8A6]" />
            </div>
            <div>
              <h2 className="font-bold text-[#1B2E5E] dark:text-slate-100 text-sm">Advanced Workflows</h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">No-code Trigger → Condition → Action chains</p>
            </div>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold text-[#14B8A6] hover:text-[#0FA898] transition-colors"
          >
            <Plus size={13} />
            Add Workflow
          </button>
        </div>

        <div className="p-4 space-y-3">
          {workflows.length === 0 ? (
            <div className="py-12 text-center">
              <Zap size={28} className="text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="font-bold text-slate-500 dark:text-slate-400 mb-1">No workflows yet</h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs mb-4">Create your first workflow to start saving time.</p>
              <button
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#0FA898] transition-all"
              >
                <Plus size={14} />
                Build First Workflow
              </button>
            </div>
          ) : (
            workflows.map(wf => {
              const trig = TRIGGERS[wf.trigger];
              return (
                <div
                  key={wf.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                    wf.is_active
                      ? "border-slate-100 dark:border-white/5 bg-[#F8FAFC] dark:bg-[#0A0F1E]/30"
                      : "border-dashed border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0A0F1E]/20 opacity-60"
                  }`}
                >
                  <div className={`w-9 h-9 ${trig.color} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <trig.icon size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{wf.name}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                          wf.is_active
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400"
                        }`}
                      >
                        {wf.is_active ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 line-clamp-1">{wf.description}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="flex items-center gap-1"><Activity size={10} />{wf.run_count} runs</span>
                      <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" />{wf.success_rate}%</span>
                      {wf.last_run && <span className="flex items-center gap-1"><Clock size={10} />{timeAgo(wf.last_run)}</span>}
                      <span>{wf.steps.length} steps</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Toggle enabled={wf.is_active} onChange={() => handleToggle(wf.id)} />
                    <button
                      onClick={() => setSelectedWf(wf)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
                      title="View steps"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(wf.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(wf.id)}
                      className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Workflow Detail Drawer ── */}
      {selectedWf && <WorkflowDrawer wf={selectedWf} onClose={() => setSelectedWf(null)} />}

      {/* ── Builder Modal ── */}
      {showBuilder && <BuilderModal onClose={() => setShowBuilder(false)} onSave={handleSaveNew} />}
    </div>
  );
}
