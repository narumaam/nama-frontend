"use client"
/**
 * M21 — Email Templates
 * ----------------------
 * NAMA-provided system templates + tenant custom templates.
 * Tabs: NAMA Templates | My Templates | Sent History
 * Actions: Clone, Edit, Delete, Send (with variable substitution)
 */

import React, { useState, useEffect, useCallback } from "react"
import {
  Mail, Plus, Copy, Check, Send, Edit2, Trash2, X, Eye,
  ChevronDown, Search, RefreshCw, Zap, Star, BookOpen,
  FileText, CreditCard, Plane, Gift, MessageSquare, Users,
  ArrowRight, Download, AlertCircle, Loader2,
} from "lucide-react"
import { emailTemplatesApi, EmailTemplate } from "@/lib/api"

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: "ALL",        label: "All Templates",   icon: BookOpen,     color: "#94A3B8" },
  { key: "ENQUIRY",    label: "Enquiry",          icon: MessageSquare,color: "#60A5FA" },
  { key: "QUOTES",     label: "Quotes",           icon: FileText,     color: "#A78BFA" },
  { key: "BOOKINGS",   label: "Bookings",         icon: Plane,        color: "#34D399" },
  { key: "PAYMENTS",   label: "Payments",         icon: CreditCard,   color: "#FBBF24" },
  { key: "DOCUMENTS",  label: "Documents",        icon: Download,     color: "#38BDF8" },
  { key: "PRE_TRIP",   label: "Pre-Trip",         icon: Star,         color: "#FB923C" },
  { key: "POST_TRIP",  label: "Post-Trip",        icon: Zap,          color: "#F472B6" },
  { key: "FOLLOW_UP",  label: "Follow-Up",        icon: RefreshCw,    color: "#A3E635" },
  { key: "MARKETING",  label: "Marketing",        icon: Gift,         color: "#E879F9" },
]

const CATEGORY_COLORS: Record<string, string> = {
  ENQUIRY: "#60A5FA", QUOTES: "#A78BFA", BOOKINGS: "#34D399",
  PAYMENTS: "#FBBF24", DOCUMENTS: "#38BDF8", PRE_TRIP: "#FB923C",
  POST_TRIP: "#F472B6", FOLLOW_UP: "#A3E635", MARKETING: "#E879F9",
}

// ── Seed templates (shown if API unavailable) ─────────────────────────────────
const SEED: EmailTemplate[] = [
  { id: 1, tenant_id: null, name: "New Enquiry Acknowledgement", category: "ENQUIRY",   subject: "Thank you for your enquiry, {{client_name}}!",                          variables: ["client_name","destination","agent_name","agency_name"],                                                   is_system: true, is_active: true, html_body: "" },
  { id: 2, tenant_id: null, name: "Quote Ready",                  category: "QUOTES",    subject: "Your travel quote for {{destination}} is ready ✈️",                    variables: ["client_name","destination","quote_ref","valid_until","view_url","agent_name","agency_name"],          is_system: true, is_active: true, html_body: "" },
  { id: 3, tenant_id: null, name: "Booking Confirmed",            category: "BOOKINGS",  subject: "🎉 Your {{destination}} trip is confirmed! Booking {{booking_ref}}",   variables: ["client_name","destination","booking_ref","travel_date","travelers_count","agent_name","agency_name"],  is_system: true, is_active: true, html_body: "" },
  { id: 4, tenant_id: null, name: "Payment Received",             category: "PAYMENTS",  subject: "Payment received — Thank you, {{client_name}}!",                       variables: ["client_name","amount","currency","booking_ref","destination","agent_name","agency_name"],              is_system: true, is_active: true, html_body: "" },
  { id: 5, tenant_id: null, name: "Balance Due Reminder",         category: "PAYMENTS",  subject: "Balance due reminder — {{booking_ref}} for {{destination}}",           variables: ["client_name","amount_due","currency","due_date","booking_ref","destination","payment_link","agent_name","agency_name"], is_system: true, is_active: true, html_body: "" },
  { id: 6, tenant_id: null, name: "Itinerary Shared",             category: "DOCUMENTS", subject: "Your {{destination}} itinerary is ready 📋",                           variables: ["client_name","destination","travel_date","view_url","agent_name","agency_name"],                       is_system: true, is_active: true, html_body: "" },
  { id: 7, tenant_id: null, name: "Travel Documents Ready",       category: "DOCUMENTS", subject: "Your travel documents are ready — {{destination}} trip",               variables: ["client_name","destination","travel_date","booking_ref","agent_name","agency_name"],                    is_system: true, is_active: true, html_body: "" },
  { id: 8, tenant_id: null, name: "Visa Status Update",           category: "DOCUMENTS", subject: "Visa update for your {{destination}} trip",                            variables: ["client_name","destination","visa_status","next_steps","agent_name","agency_name"],                     is_system: true, is_active: true, html_body: "" },
  { id: 9, tenant_id: null, name: "Trip Reminder (7 days)",       category: "PRE_TRIP",  subject: "⏰ 7 days to go — your {{destination}} adventure awaits!",             variables: ["client_name","destination","travel_date","departure_city","booking_ref","agent_name","agency_name"],   is_system: true, is_active: true, html_body: "" },
  { id:10, tenant_id: null, name: "Post-Trip Thank You",          category: "POST_TRIP", subject: "Welcome back! Hope you loved {{destination}} 🌟",                      variables: ["client_name","destination","agent_name","agency_name"],                                                   is_system: true, is_active: true, html_body: "" },
  { id:11, tenant_id: null, name: "Feedback Request",             category: "POST_TRIP", subject: "How was your {{destination}} trip? Share your experience ⭐",          variables: ["client_name","destination","review_url","agent_name","agency_name"],                                   is_system: true, is_active: true, html_body: "" },
  { id:12, tenant_id: null, name: "Follow-up (No Response)",      category: "FOLLOW_UP", subject: "Following up on your {{destination}} enquiry",                         variables: ["client_name","destination","agent_name","agency_name"],                                                   is_system: true, is_active: true, html_body: "" },
  { id:13, tenant_id: null, name: "Re-engagement",                category: "FOLLOW_UP", subject: "We miss you, {{client_name}}! New destinations just added",            variables: ["client_name","agent_name","agency_name"],                                                                 is_system: true, is_active: true, html_body: "" },
  { id:14, tenant_id: null, name: "Special Offer / Promotion",    category: "MARKETING", subject: "🎁 Exclusive offer for you — {{offer_title}}",                        variables: ["client_name","offer_title","offer_description","original_price","offer_price","currency","valid_until","cta_url","agent_name","agency_name"], is_system: true, is_active: true, html_body: "" },
]

type Tab = "nama" | "mine" | "history"

interface SentEntry {
  id: number; to: string; subject: string; template: string; at: string; ok: boolean
}

export default function EmailTemplatesPage() {
  const [tab, setTab]               = useState<Tab>("nama")
  const [templates, setTemplates]   = useState<EmailTemplate[]>(SEED)
  const [loading, setLoading]       = useState(false)
  const [liveData, setLiveData]     = useState(false)
  const [activeCat, setActiveCat]   = useState("ALL")
  const [search, setSearch]         = useState("")
  const [sentHistory, setSentHistory] = useState<SentEntry[]>([])

  // Send modal
  const [sendTarget, setSendTarget] = useState<EmailTemplate | null>(null)
  const [sendTo, setSendTo]         = useState("")
  const [sendVars, setSendVars]     = useState<Record<string,string>>({})
  const [sendLoading, setSendLoading] = useState(false)
  const [previewMode, setPreviewMode] = useState(false)

  // Edit modal
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null)
  const [editName, setEditName]     = useState("")
  const [editSubject, setEditSubject] = useState("")
  const [editBody, setEditBody]     = useState("")
  const [editSaving, setEditSaving] = useState(false)

  // New template
  const [showNew, setShowNew]       = useState(false)
  const [newName, setNewName]       = useState("")
  const [newCat, setNewCat]         = useState("ENQUIRY")
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody]       = useState("")
  const [newSaving, setNewSaving]   = useState(false)

  // Toast
  const [toast, setToast]           = useState<{msg:string;ok:boolean}|null>(null)

  const showToast = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const data = await emailTemplatesApi.list()
      if (Array.isArray(data) && data.length > 0) {
        setTemplates(data)
        setLiveData(true)
      }
    } catch { /* fall back to seed */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  // Filtered lists
  const filterFn = (t: EmailTemplate) => {
    const catMatch = activeCat === "ALL" || t.category === activeCat
    const searchMatch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  }
  const namaTemplates = templates.filter(t => t.is_system && filterFn(t))
  const myTemplates   = templates.filter(t => !t.is_system && filterFn(t))

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleClone = async (t: EmailTemplate) => {
    try {
      const cloned = await emailTemplatesApi.clone(t.id)
      setTemplates(ts => [...ts, cloned])
      showToast(`"${t.name}" cloned to My Templates`)
      setTab("mine")
    } catch { showToast("Clone failed", false) }
  }

  const openSend = (t: EmailTemplate) => {
    setSendTarget(t)
    const vars: Record<string,string> = {}
    t.variables.forEach(v => { vars[v] = "" })
    setSendVars(vars)
    setSendTo("")
    setPreviewMode(false)
  }

  const handleSend = async () => {
    if (!sendTarget || !sendTo) return
    setSendLoading(true)
    try {
      const res = await emailTemplatesApi.send(sendTarget.id, { to: sendTo, variables: sendVars })
      setSentHistory(h => [{ id: Date.now(), to: sendTo, subject: res.subject, template: sendTarget.name, at: "just now", ok: true }, ...h])
      showToast(`Email sent to ${sendTo}`)
      setSendTarget(null)
    } catch { showToast("Send failed — check RESEND_API_KEY", false) }
    finally { setSendLoading(false) }
  }

  const openEdit = (t: EmailTemplate) => {
    setEditTarget(t)
    setEditName(t.name)
    setEditSubject(t.subject)
    setEditBody(t.html_body)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const updated = await emailTemplatesApi.update(editTarget.id, { name: editName, subject: editSubject, html_body: editBody })
      setTemplates(ts => ts.map(t => t.id === editTarget.id ? updated : t))
      showToast("Template saved")
      setEditTarget(null)
    } catch { showToast("Save failed", false) }
    finally { setEditSaving(false) }
  }

  const handleDelete = async (t: EmailTemplate) => {
    if (!confirm(`Delete "${t.name}"?`)) return
    try {
      await emailTemplatesApi.delete(t.id)
      setTemplates(ts => ts.filter(x => x.id !== t.id))
      showToast("Template deleted")
    } catch { showToast("Delete failed", false) }
  }

  const handleCreate = async () => {
    if (!newName || !newSubject || !newBody) return
    setNewSaving(true)
    try {
      const created = await emailTemplatesApi.create({ name: newName, category: newCat, subject: newSubject, html_body: newBody })
      setTemplates(ts => [...ts, created])
      showToast("Template created")
      setShowNew(false); setNewName(""); setNewSubject(""); setNewBody("")
    } catch { showToast("Create failed", false) }
    finally { setNewSaving(false) }
  }

  // ── Rendered email preview (render vars) ─────────────────────────────────────
  const renderPreview = (html: string, vars: Record<string,string>) => {
    return html.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || `<span style="background:#fef3c7;color:#92400e;padding:0 3px;border-radius:2px;">{{${k}}}</span>`)
  }

  const catColor = (cat: string) => CATEGORY_COLORS[cat] || "#94A3B8"

  // ── Template card ─────────────────────────────────────────────────────────────
  const TemplateCard = ({ t, isMine }: { t: EmailTemplate; isMine: boolean }) => (
    <div className="bg-[#0F172A] border border-white/8 rounded-xl p-5 flex flex-col gap-3 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catColor(t.category) + "20", color: catColor(t.category) }}>
              {t.category.replace("_", " ")}
            </span>
            {t.is_system && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">NAMA</span>}
          </div>
          <p className="text-[#F1F5F9] font-semibold text-sm leading-snug truncate">{t.name}</p>
          <p className="text-[#64748B] text-xs mt-1 truncate">{t.subject}</p>
        </div>
      </div>

      {t.variables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {t.variables.slice(0, 4).map(v => (
            <span key={v} className="text-[10px] bg-white/5 text-[#94A3B8] px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
          ))}
          {t.variables.length > 4 && <span className="text-[10px] text-[#475569]">+{t.variables.length - 4} more</span>}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 border-t border-white/5">
        <button onClick={() => openSend(t)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 rounded-lg font-semibold transition-all">
          <Send size={11} /> Send
        </button>
        {!isMine && (
          <button onClick={() => handleClone(t)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/5 text-[#94A3B8] hover:bg-white/10 rounded-lg font-semibold transition-all">
            <Copy size={11} /> Clone
          </button>
        )}
        {isMine && (
          <>
            <button onClick={() => openEdit(t)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/5 text-[#94A3B8] hover:bg-white/10 rounded-lg font-semibold transition-all">
              <Edit2 size={11} /> Edit
            </button>
            <button onClick={() => handleDelete(t)} className="flex items-center gap-1 text-xs p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-auto">
              <Trash2 size={11} />
            </button>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#060A14] text-[#F1F5F9] -m-4 md:-m-6 lg:-m-8">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl ${toast.ok ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300" : "bg-red-500/20 border border-red-500/30 text-red-300"}`}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />} {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#F1F5F9] flex items-center gap-2">
            <Mail size={20} className="text-teal-400" /> Email Templates
            {liveData && <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>}
          </h1>
          <p className="text-[#64748B] text-sm mt-0.5">Send professional emails to clients — use NAMA templates or create your own</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all">
          <Plus size={15} /> New Template
        </button>
      </div>

      <div className="flex h-[calc(100vh-130px)]">

        {/* ── Left sidebar: category filter ──────────────────────────────────────── */}
        <div className="w-52 shrink-0 border-r border-white/5 p-4 overflow-y-auto">
          <p className="text-[#475569] text-[10px] font-bold uppercase tracking-wider mb-3">Categories</p>
          {CATEGORIES.map(c => {
            const Icon = c.icon
            const count = templates.filter(t => (c.key === "ALL" || t.category === c.key)).length
            return (
              <button key={c.key} onClick={() => setActiveCat(c.key)}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold mb-1 transition-all ${activeCat === c.key ? "bg-white/8 text-[#F1F5F9]" : "text-[#64748B] hover:text-[#94A3B8] hover:bg-white/4"}`}>
                <span className="flex items-center gap-2">
                  <Icon size={13} style={{ color: activeCat === c.key ? c.color : undefined }} />
                  {c.label}
                </span>
                <span className="text-[10px] text-[#475569]">{count}</span>
              </button>
            )
          })}
        </div>

        {/* ── Main content ───────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Tabs + search bar */}
          <div className="sticky top-0 z-10 bg-[#060A14] border-b border-white/5 px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex gap-1">
              {([["nama","NAMA Templates",namaTemplates.length],["mine","My Templates",myTemplates.length],["history","Sent History",sentHistory.length]] as const).map(([key, label, count]) => (
                <button key={key} onClick={() => setTab(key as Tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === key ? "bg-teal-500/15 text-teal-400" : "text-[#64748B] hover:text-[#94A3B8]"}`}>
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === key ? "bg-teal-500/20 text-teal-400" : "bg-white/5 text-[#475569]"}`}>{count}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…"
                className="bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-teal-500/50 w-52" />
            </div>
          </div>

          <div className="p-6">

            {/* NAMA Templates tab */}
            {tab === "nama" && (
              <div>
                <p className="text-[#64748B] text-xs mb-4">
                  {namaTemplates.length} ready-to-use templates crafted for travel agencies.
                  Clone any template to customise it in My Templates.
                </p>
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-[#475569]">
                    <Loader2 size={20} className="animate-spin mr-2" /> Loading templates…
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {namaTemplates.map(t => <TemplateCard key={t.id} t={t} isMine={false} />)}
                  </div>
                )}
              </div>
            )}

            {/* My Templates tab */}
            {tab === "mine" && (
              <div>
                {myTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                      <Mail size={24} className="text-[#475569]" />
                    </div>
                    <p className="text-[#F1F5F9] font-semibold mb-1">No custom templates yet</p>
                    <p className="text-[#64748B] text-sm mb-4">Clone a NAMA template to get started, or create one from scratch.</p>
                    <div className="flex gap-3">
                      <button onClick={() => setTab("nama")} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-[#94A3B8] rounded-xl text-sm font-semibold transition-all">
                        <Copy size={13} /> Browse NAMA Templates
                      </button>
                      <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 rounded-xl text-sm font-semibold transition-all">
                        <Plus size={13} /> Create New
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {myTemplates.map(t => <TemplateCard key={t.id} t={t} isMine={true} />)}
                  </div>
                )}
              </div>
            )}

            {/* Sent History tab */}
            {tab === "history" && (
              <div>
                {sentHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                      <Send size={24} className="text-[#475569]" />
                    </div>
                    <p className="text-[#F1F5F9] font-semibold mb-1">No emails sent yet</p>
                    <p className="text-[#64748B] text-sm">Emails you send via templates will appear here.</p>
                  </div>
                ) : (
                  <div className="border border-white/8 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-white/4 border-b border-white/8">
                        <tr>{["To","Subject","Template","Sent","Status"].map(h => <th key={h} className="text-left px-4 py-3 text-[#475569] font-semibold">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {sentHistory.map((e, i) => (
                          <tr key={e.id} className={`border-b border-white/5 ${i % 2 === 0 ? "" : "bg-white/2"}`}>
                            <td className="px-4 py-3 text-[#94A3B8]">{e.to}</td>
                            <td className="px-4 py-3 text-[#F1F5F9] max-w-[200px] truncate">{e.subject}</td>
                            <td className="px-4 py-3 text-[#64748B]">{e.template}</td>
                            <td className="px-4 py-3 text-[#475569]">{e.at}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">Sent</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Send Modal ─────────────────────────────────────────────────────────── */}
      {sendTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setSendTarget(null)}>
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <h2 className="font-bold text-[#F1F5F9] text-base">{sendTarget.name}</h2>
                <p className="text-[#64748B] text-xs mt-0.5">{sendTarget.subject}</p>
              </div>
              <button onClick={() => setSendTarget(null)} className="text-[#475569] hover:text-[#94A3B8]"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Toggle preview */}
              <div className="flex gap-2">
                <button onClick={() => setPreviewMode(false)} className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${!previewMode ? "bg-teal-500/15 text-teal-400" : "text-[#64748B] hover:text-[#94A3B8]"}`}>
                  Fill Variables
                </button>
                <button onClick={() => setPreviewMode(true)} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${previewMode ? "bg-teal-500/15 text-teal-400" : "text-[#64748B] hover:text-[#94A3B8]"}`}>
                  <Eye size={11} /> Preview Email
                </button>
              </div>

              {!previewMode ? (
                <>
                  <div>
                    <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Recipient Email *</label>
                    <input value={sendTo} onChange={e => setSendTo(e.target.value)} placeholder="client@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-teal-500/50" />
                  </div>
                  {sendTarget.variables.length > 0 && (
                    <div>
                      <label className="text-[#64748B] text-xs font-semibold mb-2 block">Template Variables</label>
                      <div className="grid grid-cols-2 gap-3">
                        {sendTarget.variables.map(v => (
                          <div key={v}>
                            <label className="text-[#475569] text-[10px] font-mono mb-1 block">{`{{${v}}}`}</label>
                            <input value={sendVars[v] || ""} onChange={e => setSendVars(prev => ({ ...prev, [v]: e.target.value }))}
                              placeholder={v.replace(/_/g, " ")}
                              className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-teal-500/40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white rounded-xl overflow-hidden" style={{ minHeight: 300 }}>
                  {sendTarget.html_body ? (
                    <iframe
                      srcDoc={renderPreview(sendTarget.html_body, sendVars)}
                      className="w-full border-0"
                      style={{ height: 420 }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div className="p-8 text-gray-500 text-sm text-center">
                      <Mail size={32} className="mx-auto mb-3 text-gray-300" />
                      Preview available once email is sent with real template data.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setSendTarget(null)} className="px-4 py-2.5 text-sm text-[#64748B] hover:text-[#94A3B8] font-semibold">Cancel</button>
              <button onClick={handleSend} disabled={!sendTo || sendLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                {sendLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                {sendLoading ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-bold text-[#F1F5F9] text-base">Edit Template</h2>
              <button onClick={() => setEditTarget(null)} className="text-[#475569] hover:text-[#94A3B8]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Template Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Subject Line</label>
                <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">HTML Body <span className="text-[#475569] font-normal">— use {"{{variable_name}}"} for dynamic values</span></label>
                <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={12}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F1F5F9] font-mono resize-none focus:outline-none focus:border-teal-500/50" />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setEditTarget(null)} className="px-4 py-2.5 text-sm text-[#64748B] hover:text-[#94A3B8] font-semibold">Cancel</button>
              <button onClick={handleSaveEdit} disabled={editSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Template Modal ─────────────────────────────────────────────────── */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0F172A] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <h2 className="font-bold text-[#F1F5F9] text-base">Create New Template</h2>
              <button onClick={() => setShowNew(false)} className="text-[#475569] hover:text-[#94A3B8]"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Template Name *</label>
                  <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Honeymoon Special Offer"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-teal-500/50" />
                </div>
                <div>
                  <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Category *</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] focus:outline-none focus:border-teal-500/50">
                    {CATEGORIES.filter(c => c.key !== "ALL").map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">Subject Line *</label>
                <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Use {{variable_name}} for dynamic values"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder-[#475569] focus:outline-none focus:border-teal-500/50" />
              </div>
              <div>
                <label className="text-[#64748B] text-xs font-semibold mb-1.5 block">HTML Body * <span className="text-[#475569] font-normal">— variables auto-detected from {"{{name}}"}  syntax</span></label>
                <textarea value={newBody} onChange={e => setNewBody(e.target.value)} rows={10} placeholder="<p>Dear {{client_name}},</p>..."
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-[#F1F5F9] font-mono resize-none placeholder-[#475569] focus:outline-none focus:border-teal-500/50" />
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 text-sm text-[#64748B] hover:text-[#94A3B8] font-semibold">Cancel</button>
              <button onClick={handleCreate} disabled={!newName || !newSubject || !newBody || newSaving}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all">
                {newSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {newSaving ? "Creating…" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
