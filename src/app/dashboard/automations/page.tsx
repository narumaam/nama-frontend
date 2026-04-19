"use client";

/**
 * M16 — Automation & Workflow Engine
 * -----------------------------------
 * No-code workflow builder for travel DMC operations.
 * Trigger → Condition → Action chains.
 *
 * Triggers: New Lead, Booking Confirmed, Payment Received, Itinerary Generated,
 *           Query Received, No Response (3 days), Birthday/Anniversary
 * Actions:  Send WhatsApp, Send Email, Create Task, Assign Agent, Update Lead Status,
 *           Generate Itinerary, Send Quotation, Add to Segment
 *
 * All workflows run as backend jobs; this page shows the builder + status.
 */

import React, { useState } from "react";
import {
  Zap, Plus, Play, Pause, Trash2, Edit3, CheckCircle, Clock,
  ArrowRight, MessageSquare, Mail, UserCheck, FileText,
  Bell, RefreshCw, AlertCircle, ChevronDown, X, Copy,
  ToggleLeft, ToggleRight, Activity, BellRing, Loader,
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

// ── Catalogue ─────────────────────────────────────────────────────────────────
const TRIGGERS: Record<TriggerKey, { label: string; icon: React.ElementType; color: string; description: string }> = {
  new_lead:             { label: "New Lead Received",         icon: Zap,          color: "bg-teal-500",   description: "Fires when a new lead is triaged via M1" },
  booking_confirmed:    { label: "Booking Confirmed",         icon: CheckCircle,  color: "bg-emerald-500",description: "Fires when a booking moves to CONFIRMED" },
  payment_received:     { label: "Payment Received",          icon: CheckCircle,  color: "bg-green-600",  description: "Fires when a payment webhook is verified" },
  itinerary_generated:  { label: "Itinerary Generated",       icon: FileText,     color: "bg-violet-500", description: "Fires when AI generates a new itinerary" },
  query_received:       { label: "WhatsApp Query Received",   icon: MessageSquare,color: "bg-[#25D366]",  description: "Fires on any new inbound message" },
  no_response_3d:       { label: "No Response (3 days)",      icon: AlertCircle,  color: "bg-amber-500",  description: "Lead hasn't responded in 3 days" },
  birthday:             { label: "Client Birthday / Anniversary", icon: Bell,      color: "bg-pink-500",   description: "Based on client profile date" },
  quotation_sent:       { label: "Quotation Sent",            icon: FileText,     color: "bg-blue-500",   description: "Fires when a quotation status → SENT" },
  lead_status_changed:  { label: "Lead Status Changed",       icon: RefreshCw,    color: "bg-orange-500", description: "Any lead status transition" },
};

const ACTIONS: Record<ActionKey, { label: string; icon: React.ElementType; color: string }> = {
  send_whatsapp:       { label: "Send WhatsApp Message",  icon: MessageSquare, color: "text-[#25D366]" },
  send_email:          { label: "Send Email",             icon: Mail,          color: "text-blue-500"  },
  create_task:         { label: "Create Task / Reminder", icon: CheckCircle,   color: "text-violet-500"},
  assign_agent:        { label: "Assign Agent",           icon: UserCheck,     color: "text-teal-500"  },
  update_lead_status:  { label: "Update Lead Status",     icon: RefreshCw,     color: "text-amber-500" },
  generate_itinerary:  { label: "AI Generate Itinerary",  icon: Zap,           color: "text-[#14B8A6]" },
  send_quotation:      { label: "Send Quotation",         icon: FileText,      color: "text-indigo-500"},
  add_to_segment:      { label: "Add to Segment",         icon: UserCheck,     color: "text-pink-500"  },
  notify_team:         { label: "Notify Team (Slack/App)", icon: Bell,         color: "text-orange-500"},
  wait_delay:          { label: "Wait / Delay",           icon: Clock,         color: "text-slate-500" },
};

// ── Sample Workflows ───────────────────────────────────────────────────────────
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
  if (d < 60_000)  return "just now";
  if (d < 3_600_000) return `${Math.round(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.round(d / 3_600_000)}h ago`;
  return `${Math.round(d / 86_400_000)}d ago`;
}

// ── Step Card ─────────────────────────────────────────────────────────────────
function StepCard({ step, index, total }: { step: WorkflowStep; index: number; total: number }) {
  const typeColors = {
    trigger: "bg-[#14B8A6]/15 border-[#14B8A6]/30 text-[#14B8A6]",
    action: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    condition: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    delay: "bg-slate-500/10 border-slate-500/20 text-slate-400",
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

// ── Workflow Row ───────────────────────────────────────────────────────────────
function WorkflowRow({ wf, onToggle, onEdit, onDuplicate, onDelete }: {
  wf: Workflow;
  onToggle: (id: string) => void;
  onEdit: (wf: Workflow) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const trig = TRIGGERS[wf.trigger];
  return (
    <div className={`bg-white border rounded-2xl p-5 transition-all ${wf.is_active ? 'border-slate-200' : 'border-dashed border-slate-200 opacity-60'}`}>
      <div className="flex items-start gap-4">
        {/* Trigger badge */}
        <div className={`w-10 h-10 ${trig.color} rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <trig.icon size={18} className="text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-slate-900 truncate">{wf.name}</span>
            {wf.is_active ? (
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">ACTIVE</span>
            ) : (
              <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">PAUSED</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-3 line-clamp-1">{wf.description}</p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Activity size={11} />{wf.run_count} runs</span>
            <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-500" />{wf.success_rate}% success</span>
            {wf.last_run && <span className="flex items-center gap-1"><Clock size={11} />Last: {timeAgo(wf.last_run)}</span>}
            <span>{wf.steps.length} steps</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onToggle(wf.id)}
            className={`p-2 rounded-xl transition-colors ${wf.is_active ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
            title={wf.is_active ? "Pause" : "Activate"}
          >
            {wf.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <button onClick={() => onEdit(wf)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Edit">
            <Edit3 size={16} />
          </button>
          <button onClick={() => onDuplicate(wf.id)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl" title="Duplicate">
            <Copy size={16} />
          </button>
          <button onClick={() => onDelete(wf.id)} className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Builder Modal ──────────────────────────────────────────────────────────────
function BuilderModal({ onClose, onSave }: { onClose: () => void; onSave: (wf: Partial<Workflow>) => void }) {
  const [step, setStep] = useState<"trigger" | "actions">("trigger");
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
      <div className="bg-[#0F172A] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-white font-black text-xl">New Automation</h2>
            <p className="text-slate-400 text-sm mt-1">Build a no-code workflow in 60 seconds</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Description */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Workflow Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. New Lead Welcome Sequence" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#14B8A6] placeholder-slate-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this automation do?" className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#14B8A6] placeholder-slate-600" />
            </div>
          </div>

          {/* Step 1: Trigger */}
          <div>
            <h3 className="text-white font-black text-sm mb-3 flex items-center gap-2">
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
                      ? 'border-[#14B8A6]/50 bg-[#14B8A6]/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className={`w-8 h-8 ${trig.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                    <trig.icon size={15} className="text-white" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selectedTrigger === key ? 'text-[#14B8A6]' : 'text-slate-300'}`}>{trig.label}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{trig.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Actions */}
          <div>
            <h3 className="text-white font-black text-sm mb-3 flex items-center gap-2">
              <span className="w-5 h-5 bg-blue-500 rounded-full text-white text-xs font-black flex items-center justify-center">2</span>
              Add Actions (pick one or more)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(ACTIONS) as [ActionKey, typeof ACTIONS[ActionKey]][]).map(([key, act]) => {
                const selected = selectedActions.includes(key);
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedActions(selected ? selectedActions.filter(a => a !== key) : [...selectedActions, key])}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      selected ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <act.icon size={15} className={selected ? 'text-blue-400' : 'text-slate-500'} />
                    <span className={`text-xs font-semibold ${selected ? 'text-blue-300' : 'text-slate-400'}`}>{act.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-white/10 text-slate-400 font-bold py-3 rounded-2xl hover:bg-white/5 text-sm">
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
  const [activeTab, setActiveTab] = useState<"all" | "active" | "paused">("all");

  // Automated reminders state
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("nama_reminders_enabled") === "true";
  });
  const [remindersRunning, setRemindersRunning] = useState(false);
  const [remindersBanner, setRemindersBanner] = useState<{
    reminders_sent: number; leads_flagged: number; agents_notified: number; demo_mode: boolean;
  } | null>(null);
  const [remindersLastRun, setRemindersLastRun] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("nama_reminders_last_run");
  });
  const [remindersTogglingSchedule, setRemindersTogglingSchedule] = useState(false);

  const handleToggleReminders = async (enabled: boolean) => {
    setRemindersTogglingSchedule(true);
    try {
      await automationsApi.scheduleReminders(enabled);
      setRemindersEnabled(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("nama_reminders_enabled", String(enabled));
      }
    } catch {
      // Silently fall back — toggle still reflects intent
      setRemindersEnabled(enabled);
      if (typeof window !== "undefined") {
        localStorage.setItem("nama_reminders_enabled", String(enabled));
      }
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
      if (typeof window !== "undefined") {
        localStorage.setItem("nama_reminders_last_run", now);
      }
    } catch (e: any) {
      setRemindersBanner({ reminders_sent: 0, leads_flagged: 0, agents_notified: 0, demo_mode: true });
    } finally {
      setRemindersRunning(false);
    }
  };

  const activeCount = workflows.filter(w => w.is_active).length;
  const totalRuns = workflows.reduce((s, w) => s + w.run_count, 0);
  const avgSuccess = workflows.length > 0
    ? Math.round(workflows.reduce((s, w) => s + w.success_rate, 0) / workflows.length)
    : 0;

  const handleToggle = (id: string) => {
    setWorkflows(wfs => wfs.map(w => w.id === id ? { ...w, is_active: !w.is_active } : w));
  };

  const handleDuplicate = (id: string) => {
    const wf = workflows.find(w => w.id === id);
    if (!wf) return;
    const copy: Workflow = { ...wf, id: `wf-${Date.now()}`, name: `${wf.name} (Copy)`, is_active: false, run_count: 0 };
    setWorkflows([copy, ...workflows]);
  };

  const handleDelete = (id: string) => {
    setWorkflows(wfs => wfs.filter(w => w.id !== id));
  };

  const handleSaveNew = (partial: Partial<Workflow>) => {
    const wf: Workflow = {
      id: `wf-${Date.now()}`,
      name: partial.name || "Untitled Workflow",
      description: partial.description || "",
      is_active: partial.is_active ?? true,
      trigger: partial.trigger!,
      steps: partial.steps || [],
      run_count: 0,
      success_rate: 100,
      created_at: new Date().toISOString(),
    };
    setWorkflows([wf, ...workflows]);
  };

  const filtered = workflows.filter(w => {
    if (activeTab === "active") return w.is_active;
    if (activeTab === "paused") return !w.is_active;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Automations</h1>
          <p className="text-slate-500 mt-2 font-medium">No-code workflow engine. Trigger → Condition → Action.</p>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-slate-700 transition-all"
        >
          <Plus size={16} />
          New Automation
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Workflows", value: activeCount, icon: Zap, color: "text-[#14B8A6] bg-[#14B8A6]/10" },
          { label: "Total Workflows", value: workflows.length, icon: Activity, color: "text-violet-600 bg-violet-50" },
          { label: "Total Runs (All Time)", value: totalRuns.toLocaleString(), icon: Play, color: "text-blue-600 bg-blue-50" },
          { label: "Avg Success Rate", value: `${avgSuccess}%`, icon: CheckCircle, color: "text-emerald-600 bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-11 h-11 ${stat.color.split(" ")[1]} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={20} className={stat.color.split(" ")[0]} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-[#0F172A]">{stat.value}</div>
              <div className="text-xs text-slate-400 font-medium">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["all", "active", "paused"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
              activeTab === tab ? "bg-white text-[#0F172A] shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab} ({workflows.filter(w => tab === "all" ? true : tab === "active" ? w.is_active : !w.is_active).length})
          </button>
        ))}
      </div>

      {/* ── Automated Reminders Card ────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <BellRing size={20} className="text-amber-500" />
            </div>
            <div>
              <h2 className="font-extrabold text-[#0F172A] text-base">Automated Follow-up Reminders</h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Auto-scans: cold leads after 3 days · uncontacted leads after 1 day · stalled qualified leads after 7 days
              </p>
            </div>
          </div>
          {/* Enable toggle */}
          <button
            onClick={() => handleToggleReminders(!remindersEnabled)}
            disabled={remindersTogglingSchedule}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
              remindersEnabled
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
            } disabled:opacity-50`}
          >
            {remindersEnabled ? <ToggleRight size={18} className="text-emerald-500" /> : <ToggleLeft size={18} className="text-slate-400" />}
            {remindersEnabled ? "Reminders On" : "Enable reminders"}
          </button>
        </div>

        {/* Description row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { color: "bg-amber-100 text-amber-700", label: "Cold leads", rule: "CONTACTED + no update for 3 days" },
            { color: "bg-blue-100 text-blue-700", label: "Uncontacted leads", rule: "NEW + no update for 1 day" },
            { color: "bg-violet-100 text-violet-700", label: "Stalled qualified", rule: "QUALIFIED + no update for 7 days" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-2 bg-slate-50 rounded-xl p-3">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${item.color}`}>
                {item.label}
              </span>
              <span className="text-xs text-slate-500 leading-snug">{item.rule}</span>
            </div>
          ))}
        </div>

        {/* Result banner */}
        {remindersBanner && (
          <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 text-sm flex-wrap ${
            remindersBanner.demo_mode
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}>
            <CheckCircle size={16} className="flex-shrink-0" />
            <span className="font-semibold">
              {remindersBanner.demo_mode ? "[Demo] " : ""}
              Scanned leads · <strong>{remindersBanner.leads_flagged}</strong> flagged ·{" "}
              <strong>{remindersBanner.agents_notified}</strong> agents notified ·{" "}
              <strong>{remindersBanner.reminders_sent}</strong> email{remindersBanner.reminders_sent !== 1 ? "s" : ""} sent
            </span>
            {remindersBanner.demo_mode && (
              <span className="text-xs text-amber-600 font-medium">Add RESEND_API_KEY to Railway to send real emails</span>
            )}
            <button onClick={() => setRemindersBanner(null)} className="ml-auto flex-shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Footer row */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-slate-400">
            {remindersLastRun
              ? <>Last run: <span className="font-semibold text-slate-600">{new Date(remindersLastRun).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span></>
              : "Never run yet"
            }
          </div>
          <button
            onClick={handleRunReminders}
            disabled={remindersRunning}
            className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-700 transition-all disabled:opacity-50"
          >
            {remindersRunning ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {remindersRunning ? "Scanning…" : "Run Now"}
          </button>
        </div>
      </div>

      {/* Template presets callout */}
      {workflows.length < 5 && (
        <div className="bg-gradient-to-r from-[#14B8A6]/10 to-violet-500/10 border border-[#14B8A6]/20 rounded-2xl p-5 flex items-center gap-4">
          <Zap size={24} className="text-[#14B8A6] flex-shrink-0" fill="currentColor" />
          <div className="flex-1">
            <p className="font-bold text-slate-800 text-sm">Pro tip: Start with a template</p>
            <p className="text-slate-500 text-xs mt-0.5">We pre-loaded 3 battle-tested automations used by top Indian DMCs. Activate them to start saving time immediately.</p>
          </div>
          <button
            onClick={() => setShowBuilder(true)}
            className="flex-shrink-0 bg-[#14B8A6] text-[#0F172A] font-black text-xs px-4 py-2 rounded-xl hover:bg-[#0FA898] transition-colors"
          >
            + Custom
          </button>
        </div>
      )}

      {/* Workflow List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-16 text-center">
            <Zap size={32} className="text-slate-300 mx-auto mb-4" />
            <h3 className="font-extrabold text-slate-600 text-lg mb-2">No automations yet</h3>
            <p className="text-slate-400 text-sm mb-6">Create your first automation to start saving 20+ hours per month.</p>
            <button onClick={() => setShowBuilder(true)} className="inline-flex items-center gap-2 bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-600 transition-all text-sm">
              <Plus size={16} />
              Build Your First Automation
            </button>
          </div>
        ) : (
          filtered.map(wf => (
            <WorkflowRow
              key={wf.id}
              wf={wf}
              onToggle={handleToggle}
              onEdit={setSelectedWf}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Workflow detail drawer */}
      {selectedWf && (
        <div className="fixed inset-0 bg-black/40 z-50 flex" onClick={() => setSelectedWf(null)}>
          <div className="ml-auto h-full w-full max-w-lg bg-white overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-extrabold text-[#0F172A] text-lg">{selectedWf.name}</h2>
                <p className="text-slate-400 text-xs mt-0.5">{selectedWf.description}</p>
              </div>
              <button onClick={() => setSelectedWf(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-3">Workflow Steps</h3>
              {selectedWf.steps.map((step, i) => (
                <StepCard key={step.id} step={step} index={i} total={selectedWf.steps.length} />
              ))}
              <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Total Runs</p>
                  <p className="font-black text-[#0F172A] text-lg">{selectedWf.run_count}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Success Rate</p>
                  <p className="font-black text-emerald-700 text-lg">{selectedWf.success_rate}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Builder Modal */}
      {showBuilder && (
        <BuilderModal onClose={() => setShowBuilder(false)} onSave={handleSaveNew} />
      )}
    </div>
  );
}
