'use client'

/**
 * NAMA OS — Leads CRM (V2)
 * ─────────────────────────
 * World-class CRM with:
 *   - Lead list with HOT/WARM/COLD AI scoring
 *   - Slide-over detail panel (Overview + Notes + Activity)
 *   - Notes: add text notes with timestamps, persist in localStorage as fallback
 *   - Activity timeline: auto-tracks status changes, notes, comms
 *   - Follow-up scheduler: set a date, get overdue alerts
 *   - Quick actions: WhatsApp, Email, call direct from list
 *   - Pipeline stats: conversion funnel across all stages
 */

import React, { useState, useEffect, useCallback } from 'react'
import { leadsApi, queriesApi, Lead } from '@/lib/api'
import EmptyState from '@/components/EmptyState'
import ProductTour from '@/components/ProductTour'
import { LEADS_TOUR, isTourDone, markTourDone } from '@/lib/tour'
import {
  Search, AlertCircle, Loader, Plus, Sparkles, X, UserPlus,
  Phone, Mail, MessageSquare, Calendar, Clock, FileText,
  CheckCircle, ChevronRight, TrendingUp, Flame, Thermometer,
  Snowflake, Filter, BarChart3, StickyNote, Activity,
  ArrowRight, Bell, Star, Tag, Users, Upload,
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  NEW:           'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED:     'bg-purple-50 text-purple-700 border-purple-200',
  QUALIFIED:     'bg-green-50 text-green-700 border-green-200',
  PROPOSAL_SENT: 'bg-amber-50 text-amber-700 border-amber-200',
  WON:           'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST:          'bg-red-50 text-red-700 border-red-200',
}

const STATUS_ORDER = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'WON', 'LOST']

// ── Types ──────────────────────────────────────────────────────────────────────
interface Note {
  id: string
  text: string
  timestamp: string
  type: 'note' | 'status_change' | 'call' | 'email' | 'whatsapp'
  meta?: string
}

type LeadTemp = 'HOT' | 'WARM' | 'COLD'

function getLeadTemp(lead: Lead): LeadTemp {
  const score = (lead.triage_confidence || 0) + (lead.priority === 1 ? 20 : lead.priority === 2 ? 10 : 0)
    + (lead.budget_per_person && lead.budget_per_person > 100000 ? 10 : 0)
    + (lead.status === 'QUALIFIED' || lead.status === 'PROPOSAL_SENT' ? 15 : 0)
  if (score >= 100) return 'HOT'
  if (score >= 70)  return 'WARM'
  return 'COLD'
}

// ── Seed data ──────────────────────────────────────────────────────────────────
const TS = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const SEED_LEADS: Lead[] = [
  { id: 1, tenant_id: 1, sender_id: '+919812345678', source: 'WHATSAPP', full_name: 'Ravi Mehta',    email: 'ravi.mehta@gmail.com',    phone: '+91 98123 45678', destination: 'Rajasthan',  duration_days: 7,  travelers_count: 4, budget_per_person: 75000,  currency: 'INR', travel_style: 'CULTURAL',  status: 'QUALIFIED',     priority: 1, triage_confidence: 92, suggested_reply: 'Thank you for reaching out! Rajasthan in March sounds wonderful for a cultural tour.', created_at: TS(1) },
  { id: 2, tenant_id: 1, sender_id: '+919876543210', source: 'EMAIL',    full_name: 'Priya Singh',   email: 'priya.singh@outlook.com', phone: '+91 98765 43210', destination: 'Maldives',   duration_days: 7,  travelers_count: 2, budget_per_person: 250000, currency: 'INR', travel_style: 'LUXURY',    status: 'PROPOSAL_SENT', priority: 1, triage_confidence: 95, suggested_reply: 'Great choice for a honeymoon! The Maldives in February is magical.',  created_at: TS(2) },
  { id: 3, tenant_id: 1, sender_id: '+919845671234', source: 'WHATSAPP', full_name: 'Ananya Rao',    email: 'ananya.rao@gmail.com',    phone: '+91 98456 71234', destination: 'Kedarnath',  duration_days: 5,  travelers_count: 3, budget_per_person: 20000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'NEW',           priority: 2, triage_confidence: 78, suggested_reply: undefined, created_at: TS(0) },
  { id: 4, tenant_id: 1, sender_id: '+919123456789', source: 'WEBSITE',  full_name: 'Karan Kapoor',  email: 'karan.k@hotmail.com',     phone: '+91 91234 56789', destination: 'Kenya',      duration_days: 12, travelers_count: 6, budget_per_person: 450000, currency: 'INR', travel_style: 'WILDLIFE',  status: 'QUALIFIED',     priority: 1, triage_confidence: 88, suggested_reply: undefined, created_at: TS(3) },
  { id: 5, tenant_id: 1, sender_id: '+919654321098', source: 'EMAIL',    full_name: 'Deepika Nair',  email: 'deepika.nair@gmail.com',  phone: '+91 96543 21098', destination: 'Bali',       duration_days: 6,  travelers_count: 2, budget_per_person: 120000, currency: 'INR', travel_style: 'BEACH',     status: 'WON',           priority: 1, triage_confidence: 96, suggested_reply: undefined, created_at: TS(5) },
  { id: 6, tenant_id: 1, sender_id: '+919712345678', source: 'PHONE',    full_name: 'Amit Shah',     email: 'amit.shah@company.com',   phone: '+91 97123 45678', destination: 'Leh Ladakh', duration_days: 10, travelers_count: 8, budget_per_person: 35000,  currency: 'INR', travel_style: 'ADVENTURE', status: 'CONTACTED',     priority: 2, triage_confidence: 81, suggested_reply: undefined, created_at: TS(1) },
  { id: 7, tenant_id: 1, sender_id: '+919823456789', source: 'WHATSAPP', full_name: 'Rohan Verma',   email: 'rohan.v@gmail.com',       phone: '+91 98234 56789', destination: 'Dubai',      duration_days: 5,  travelers_count: 4, budget_per_person: 90000,  currency: 'INR', travel_style: 'LUXURY',    status: 'NEW',           priority: 2, triage_confidence: 74, suggested_reply: undefined, created_at: TS(0) },
  { id: 8, tenant_id: 1, sender_id: '+919534567890', source: 'EMAIL',    full_name: 'Sneha Patel',   email: 'sneha.patel@gmail.com',   phone: '+91 95345 67890', destination: 'Santorini',  duration_days: 8,  travelers_count: 2, budget_per_person: 200000, currency: 'INR', travel_style: 'HONEYMOON', status: 'LOST',          priority: 3, triage_confidence: 65, suggested_reply: undefined, created_at: TS(7) },
]

type TabType = 'overview' | 'notes' | 'activity' | 'ai'
type InquiryMode = 'ai' | 'manual'

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number, cur = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(n)

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function followUpLabel(dateStr: string | null): { text: string; color: string } {
  if (!dateStr) return { text: '', color: '' }
  const due = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.ceil((due.getTime() - now.setHours(0,0,0,0)) / 86400000)
  if (diffDays < 0)  return { text: `Overdue ${Math.abs(diffDays)}d`, color: 'text-red-600 bg-red-50' }
  if (diffDays === 0) return { text: 'Due today!', color: 'text-amber-700 bg-amber-50' }
  if (diffDays === 1) return { text: 'Tomorrow', color: 'text-blue-700 bg-blue-50' }
  return { text: due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), color: 'text-slate-600 bg-slate-100' }
}

// ── AI Scoring Engine ──────────────────────────────────────────────────────────

interface AIScore {
  conversionPct: number
  temp: LeadTemp
  signals: { label: string; value: string; positive: boolean; weight: number }[]
  qualification: string
  recommendation: string
  risks: string[]
  strengths: string[]
  nextBestAction: string
}

function computeAIScore(lead: Lead): AIScore {
  const conf = lead.triage_confidence || 0
  const budget = lead.budget_per_person || 0
  const pax = lead.travelers_count || 1
  const totalTrip = budget * pax

  // Signals
  const signals: AIScore['signals'] = [
    {
      label: 'AI Triage Confidence',
      value: `${conf}%`,
      positive: conf >= 75,
      weight: Math.round(conf * 0.35),
    },
    {
      label: 'Budget Signal',
      value: budget > 0 ? `₹${budget.toLocaleString('en-IN')}/pax` : 'Not specified',
      positive: budget >= 50000,
      weight: budget >= 150000 ? 25 : budget >= 75000 ? 18 : budget >= 25000 ? 10 : 0,
    },
    {
      label: 'Group Size',
      value: `${pax} pax`,
      positive: pax >= 4,
      weight: pax >= 6 ? 15 : pax >= 4 ? 10 : pax >= 2 ? 5 : 2,
    },
    {
      label: 'Priority Level',
      value: lead.priority === 1 ? 'High' : lead.priority === 2 ? 'Medium' : 'Low',
      positive: lead.priority === 1,
      weight: lead.priority === 1 ? 20 : lead.priority === 2 ? 10 : 2,
    },
    {
      label: 'Pipeline Stage',
      value: lead.status?.replace('_', ' ') || 'NEW',
      positive: ['QUALIFIED', 'PROPOSAL_SENT', 'WON'].includes(lead.status || ''),
      weight: lead.status === 'WON' ? 25 : lead.status === 'PROPOSAL_SENT' ? 18 : lead.status === 'QUALIFIED' ? 15 : lead.status === 'CONTACTED' ? 8 : 3,
    },
    {
      label: 'Source Quality',
      value: lead.source || 'Unknown',
      positive: ['WHATSAPP', 'PHONE'].includes(lead.source || ''),
      weight: lead.source === 'PHONE' ? 12 : lead.source === 'WHATSAPP' ? 10 : lead.source === 'EMAIL' ? 7 : 5,
    },
    {
      label: 'Travel Style',
      value: lead.travel_style?.replace('_', ' ') || 'Not set',
      positive: ['LUXURY', 'HONEYMOON', 'WILDLIFE'].includes(lead.travel_style || ''),
      weight: ['LUXURY', 'HONEYMOON'].includes(lead.travel_style || '') ? 12 : 5,
    },
  ]

  const rawScore = signals.reduce((s, sig) => s + sig.weight, 0)
  const conversionPct = Math.min(97, Math.max(12, Math.round(rawScore * 0.9 + 10)))
  const temp = getLeadTemp(lead)

  // Qualification narrative
  const style = lead.travel_style?.toLowerCase().replace('_', ' ') || 'travel'
  const dest = lead.destination || 'destination'
  const qualification = temp === 'HOT'
    ? `Strong buying signals across all dimensions. ${lead.full_name?.split(' ')[0] || 'This lead'} shows ${conf}% triage confidence with a ${style} budget of ₹${(totalTrip).toLocaleString('en-IN')} for ${pax} pax. ${lead.status === 'PROPOSAL_SENT' ? 'Proposal has been sent — follow up within 24h.' : 'Ready for proposal — strike while the iron is hot.'}`
    : temp === 'WARM'
    ? `Moderate intent with ${conf}% confidence. ${lead.full_name?.split(' ')[0] || 'This lead'} is interested in ${dest} ${style} but needs nurturing. ${budget < 50000 ? 'Budget is in the value range — emphasise value and inclusions.' : 'Budget qualifies for a good package.'}`
    : `Early-stage lead with low conversion signals. ${conf < 60 ? 'Low triage confidence suggests the inquiry may be exploratory.' : 'Has potential but needs stronger qualification.'} Nurture with destination content before investing heavy effort.`

  // Strengths
  const strengths: string[] = []
  if (conf >= 85) strengths.push(`High AI triage confidence (${conf}%)`)
  if (budget >= 100000) strengths.push(`Premium budget: ₹${budget.toLocaleString('en-IN')}/pax`)
  if (pax >= 6) strengths.push(`Large group (${pax} pax) — high revenue potential`)
  if (pax >= 2 && pax <= 4) strengths.push('Ideal group size for packages')
  if (['LUXURY', 'HONEYMOON'].includes(lead.travel_style || '')) strengths.push('High-margin travel segment')
  if (lead.source === 'PHONE') strengths.push('Phone inquiry = highest intent signal')
  if (lead.status === 'QUALIFIED' || lead.status === 'PROPOSAL_SENT') strengths.push('Advanced pipeline stage')
  if (strengths.length === 0) strengths.push('Lead is in system and can be nurtured')

  // Risks
  const risks: string[] = []
  if (conf < 65) risks.push('Low triage confidence — verify intent manually')
  if (!budget || budget < 15000) risks.push('Budget unspecified or below minimum threshold')
  if (lead.status === 'LOST') risks.push('Already marked as lost — re-engagement needed')
  if (!lead.email && !lead.phone) risks.push('No contact details — cannot follow up')
  if (risks.length === 0) risks.push('No significant risks identified')

  // Recommendation
  const recommendation = temp === 'HOT'
    ? `🔥 Priority action: Call within 2h. Prepare a tailored ${dest} proposal with 3 options (good/better/best). Offer a 24h booking hold.`
    : temp === 'WARM'
    ? `☀️ Send a personalised ${dest} destination guide. Follow up in 2-3 days. Ask budget & dates questions to qualify further.`
    : `❄️ Add to nurture sequence. Send ${dest || 'travel'} inspiration content. Re-engage in 1 week with a new offer or deal.`

  const nextBestAction = temp === 'HOT'
    ? 'Send proposal now →'
    : temp === 'WARM'
    ? 'Share destination guide →'
    : 'Add to nurture sequence →'

  return { conversionPct, temp, signals, qualification, recommendation, risks, strengths, nextBestAction }
}

// ── Import Leads Modal ─────────────────────────────────────────────────────────
function ImportLeadsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [result, setResult] = useState<{ imported: number; skipped_duplicates: number; errors: string[]; total_rows: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleDownloadTemplate = async () => {
    const res = await fetch('/api/v1/leads/import/template')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads_import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return
    setFile(selected)
    // Preview first 4 lines
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      const lines = text.split('\n').filter(l => l.trim())
      const parsed = lines.slice(0, 4).map(line => {
        // Simple CSV split (handles basic cases)
        const cols: string[] = []
        let cur = ''
        let inQuote = false
        for (const ch of line) {
          if (ch === '"') { inQuote = !inQuote }
          else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
          else { cur += ch }
        }
        cols.push(cur.trim())
        return cols
      })
      setPreviewRows(parsed)
      setTotalRows(Math.max(0, lines.length - 1)) // minus header
      setStep('preview')
    }
    reader.readAsText(selected)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/v1/leads/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Import failed')
      setResult(data)
      setStep('result')
    } catch (err: any) {
      setResult({ imported: 0, skipped_duplicates: 0, errors: [err.message || 'Unknown error'], total_rows: totalRows })
      setStep('result')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-[28px] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-[#0F172A]">Import Leads</h2>
            <p className="text-xs text-slate-400 mt-0.5">Upload a CSV or Excel file to bulk-import leads</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
            <X size={18} />
          </button>
        </div>

        {/* Step 1 — Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-200 hover:border-slate-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              <Upload size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600 text-sm">Drop your CSV or Excel file here</p>
              <p className="text-xs text-slate-400 mt-1">or click to browse · Max 500 rows</p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0] || null)}
              />
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 text-[#14B8A6] hover:text-teal-600 text-sm font-semibold py-2 border border-[#14B8A6]/30 rounded-xl hover:bg-teal-50 transition-colors"
            >
              <FileText size={14} />
              Download Template CSV
            </button>
          </div>
        )}

        {/* Step 2 — Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
              <span className="font-bold text-slate-700">{file?.name}</span>
              {' · '}
              ~{totalRows} data row{totalRows !== 1 ? 's' : ''}
            </div>
            {previewRows.length > 1 && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      {previewRows[0].slice(0, 5).map((h, i) => (
                        <th key={i} className="text-left px-3 py-2 font-bold text-slate-500 whitespace-nowrap">{h}</th>
                      ))}
                      {previewRows[0].length > 5 && <th className="px-3 py-2 text-slate-400">…</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(1, 4).map((row, ri) => (
                      <tr key={ri} className="border-t border-slate-100">
                        {row.slice(0, 5).map((cell, ci) => (
                          <td key={ci} className="px-3 py-2 text-slate-600 max-w-[120px] truncate">{cell}</td>
                        ))}
                        {row.length > 5 && <td className="px-3 py-2 text-slate-300">…</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setStep('upload'); setFile(null); setPreviewRows([]) }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                Change File
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 py-3 bg-[#00236f] hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <><Loader size={14} className="animate-spin" /> Importing...</> : `Import ${totalRows} rows`}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Result */}
        {step === 'result' && result && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <CheckCircle size={16} />
                {result.imported} lead{result.imported !== 1 ? 's' : ''} imported
              </div>
              {result.skipped_duplicates > 0 && (
                <div className="text-amber-700 text-sm flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  {result.skipped_duplicates} duplicate{result.skipped_duplicates !== 1 ? 's' : ''} skipped
                </div>
              )}
              <div className="text-slate-500 text-xs">{result.total_rows} total rows processed</div>
            </div>
            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                <div className="text-xs font-bold text-red-700 mb-1">Row errors ({result.errors.length})</div>
                {result.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="text-xs text-red-600">{err}</div>
                ))}
                {result.errors.length > 5 && <div className="text-xs text-red-400">+{result.errors.length - 5} more</div>}
              </div>
            )}
            <button
              onClick={() => { onSuccess(); onClose() }}
              className="w-full py-3.5 bg-[#14B8A6] hover:bg-teal-600 text-white rounded-xl font-black text-sm uppercase tracking-widest transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LeadsPage() {
  const [leads, setLeads]                 = useState<Lead[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [searchTerm, setSearchTerm]       = useState('')
  const [statusFilter, setStatusFilter]   = useState('')
  const [tempFilter, setTempFilter]       = useState<LeadTemp | ''>('')
  const [page, setPage]                   = useState(1)
  const [total, setTotal]                 = useState(0)

  // Detail panel
  const [selectedLead, setSelectedLead]   = useState<Lead | null>(null)
  const [activeTab, setActiveTab]         = useState<TabType>('overview')
  const [updating, setUpdating]           = useState(false)

  // Notes
  const [notes, setNotes]                 = useState<Record<number, Note[]>>({})
  const [newNote, setNewNote]             = useState('')
  const [addingNote, setAddingNote]       = useState(false)

  // Follow-up
  const [followUps, setFollowUps]         = useState<Record<number, string>>({})

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false)

  // New inquiry modal
  const [showInquiry, setShowInquiry]     = useState(false)
  const [inquiryMode, setInquiryMode]     = useState<InquiryMode>('ai')
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquirySuccess, setInquirySuccess] = useState<string | null>(null)
  const [rawMessage, setRawMessage]       = useState('')
  const [manualForm, setManualForm]       = useState({
    full_name: '', email: '', phone: '', destination: '',
    duration_days: '', travelers_count: '2', budget_per_person: '',
    currency: 'INR', travel_style: 'Luxury', source: 'MANUAL',
  })

  // LLM AI Scores (keyed by lead id)
  const [llmScores, setLlmScores]         = useState<Record<number, AIScore & { loading: boolean; provider: string }>>({})

  // Toast
  const [toast, setToast]                 = useState<string | null>(null)

  // Product tour
  const [showTour, setShowTour]           = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // ── Tour trigger (first visit only) ─────────────────────────────────────────
  useEffect(() => {
    if (!isTourDone('leads')) {
      // Small delay so the page content renders before highlighting
      const t = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  // ── LLM Scoring ─────────────────────────────────────────────────────────────
  const fetchLLMScore = useCallback(async (lead: Lead) => {
    if (llmScores[lead.id]?.provider && !llmScores[lead.id]?.loading) return // already scored
    setLlmScores(prev => ({ ...prev, [lead.id]: { ...computeAIScore(lead), loading: true, provider: '' } }))
    try {
      const res = await fetch('/api/v1/copilot/score-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: lead.id,
          full_name: lead.full_name,
          destination: lead.destination,
          duration_days: lead.duration_days,
          travelers_count: lead.travelers_count,
          budget_per_person: lead.budget_per_person,
          currency: lead.currency,
          travel_style: lead.travel_style,
          status: lead.status,
          source: lead.source,
          priority: lead.priority,
          triage_confidence: lead.triage_confidence,
          email: lead.email,
          phone: lead.phone,
          created_at: lead.created_at,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Map backend response → AIScore shape
      const scored: AIScore & { loading: boolean; provider: string } = {
        conversionPct: data.probability,
        temp: data.temp as LeadTemp,
        signals: data.signals.map((s: { label: string; value: string; positive: boolean; weight: number }) => ({
          label: s.label, value: s.value, positive: s.positive, weight: s.weight,
        })),
        qualification: data.reasoning,
        recommendation: `${data.temp === 'HOT' ? '🔥' : data.temp === 'WARM' ? '☀️' : '❄️'} ${data.urgency}. ${data.next_action}`,
        risks: data.risks,
        strengths: data.strengths,
        nextBestAction: data.next_action,
        loading: false,
        provider: data.provider,
      }
      setLlmScores(prev => ({ ...prev, [lead.id]: scored }))
    } catch {
      // Fallback to heuristic silently
      setLlmScores(prev => ({
        ...prev,
        [lead.id]: { ...computeAIScore(lead), loading: false, provider: 'heuristic' },
      }))
    }
  }, [llmScores])

  // ── Data ────────────────────────────────────────────────────────────────────
  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await leadsApi.list({ status: statusFilter || undefined, page })
      if (data.items && data.items.length > 0) {
        setLeads(data.items)
        setTotal(data.total)
      } else {
        setLeads(SEED_LEADS)
        setTotal(SEED_LEADS.length)
      }
    } catch {
      setLeads(SEED_LEADS)
      setTotal(SEED_LEADS.length)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Persist notes + follow-ups in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nama_lead_notes')
      if (saved) setNotes(JSON.parse(saved))
      const savedFU = localStorage.getItem('nama_lead_followups')
      if (savedFU) setFollowUps(JSON.parse(savedFU))
    } catch {}
  }, [])

  const saveNotes = (updated: Record<number, Note[]>) => {
    setNotes(updated)
    try { localStorage.setItem('nama_lead_notes', JSON.stringify(updated)) } catch {}
  }

  const saveFollowUps = (updated: Record<number, string>) => {
    setFollowUps(updated)
    try { localStorage.setItem('nama_lead_followups', JSON.stringify(updated)) } catch {}
  }

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (leadId: number, newStatus: string) => {
    setUpdating(true)
    const prev = leads.find(l => l.id === leadId)
    try {
      await leadsApi.update(leadId, { status: newStatus })
      setLeads(ls => ls.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
      if (selectedLead?.id === leadId) setSelectedLead(sl => sl ? { ...sl, status: newStatus } : sl)
      // Log activity
      const activity: Note = {
        id: Date.now().toString(),
        text: `Status changed from ${prev?.status || '?'} → ${newStatus}`,
        timestamp: new Date().toISOString(),
        type: 'status_change',
      }
      const updated = { ...notes, [leadId]: [...(notes[leadId] || []), activity] }
      saveNotes(updated)
      showToast(`Status updated to ${newStatus}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddNote = (leadId: number, type: Note['type'] = 'note', text?: string) => {
    const noteText = text || newNote.trim()
    if (!noteText) return
    setAddingNote(true)
    const note: Note = {
      id: Date.now().toString(),
      text: noteText,
      timestamp: new Date().toISOString(),
      type,
    }
    const updated = { ...notes, [leadId]: [...(notes[leadId] || []), note] }
    saveNotes(updated)
    setNewNote('')
    setAddingNote(false)
    showToast('Note saved!')
  }

  const handleSetFollowUp = (leadId: number, date: string) => {
    const updated = { ...followUps, [leadId]: date }
    saveFollowUps(updated)
    showToast(`Follow-up set for ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
  }

  const handleWhatsApp = (lead: Lead, customText?: string) => {
    const text = customText || `Hi ${lead.full_name?.split(' ')[0] || 'there'}! Following up on your ${lead.destination} travel inquiry. Happy to help plan your perfect trip! 🌟`
    window.open(`https://wa.me/${(lead.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank')
    handleAddNote(lead.id, 'whatsapp', `WhatsApp message sent: "${text.slice(0, 60)}..."`)
    showToast('WhatsApp opened!')
  }

  const handleCall = (lead: Lead) => {
    if (lead.phone) {
      window.open(`tel:${lead.phone.replace(/\s/g, '')}`)
      handleAddNote(lead.id, 'call', `Call initiated to ${lead.phone}`)
    }
  }

  const handleEmail = (lead: Lead) => {
    if (lead.email) {
      window.open(`mailto:${lead.email}?subject=Your ${lead.destination} Travel Plan&body=Hi ${lead.full_name?.split(' ')[0] || 'there'},`)
      handleAddNote(lead.id, 'email', `Email draft opened for ${lead.email}`)
    }
  }

  const handleAiIngest = async () => {
    if (!rawMessage.trim()) return
    setInquiryLoading(true)
    setInquirySuccess(null)
    try {
      const result = await queriesApi.ingest({ raw_message: rawMessage, source: 'DASHBOARD' })
      setInquirySuccess(`Lead #${result.lead_id} created — ${result.destination || 'TBD'}, ${result.triage_confidence}% confidence`)
      setRawMessage('')
      fetchLeads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI triage failed')
      setShowInquiry(false)
    } finally {
      setInquiryLoading(false)
    }
  }

  const handleManualCreate = async () => {
    setInquiryLoading(true)
    setInquirySuccess(null)
    try {
      const lead = await leadsApi.create({
        full_name: manualForm.full_name || undefined,
        email: manualForm.email || undefined,
        phone: manualForm.phone || undefined,
        destination: manualForm.destination || undefined,
        duration_days: manualForm.duration_days ? Number(manualForm.duration_days) : undefined,
        travelers_count: Number(manualForm.travelers_count) || 1,
        budget_per_person: manualForm.budget_per_person ? Number(manualForm.budget_per_person) : undefined,
        currency: manualForm.currency,
        travel_style: manualForm.travel_style,
        source: 'MANUAL',
      })
      setInquirySuccess(`Lead #${lead.id} — ${lead.full_name || 'Unnamed'} created`)
      setManualForm({ full_name: '', email: '', phone: '', destination: '', duration_days: '', travelers_count: '2', budget_per_person: '', currency: 'INR', travel_style: 'Luxury', source: 'MANUAL' })
      fetchLeads()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead')
      setShowInquiry(false)
    } finally {
      setInquiryLoading(false)
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    const q = searchTerm.toLowerCase()
    const matchSearch = !q || (l.full_name?.toLowerCase().includes(q) || l.destination?.toLowerCase().includes(q) || l.email?.toLowerCase().includes(q))
    const matchStatus = !statusFilter || l.status === statusFilter
    const matchTemp   = !tempFilter || getLeadTemp(l) === tempFilter
    return matchSearch && matchStatus && matchTemp
  })

  const pageSize = 15
  const totalPages = Math.ceil(total / pageSize)

  const stats = {
    total: leads.length,
    hot: leads.filter(l => getLeadTemp(l) === 'HOT').length,
    won: leads.filter(l => l.status === 'WON').length,
    pipeline: leads.filter(l => !['WON','LOST'].includes(l.status)).reduce((s, l) => s + (l.budget_per_person || 0) * (l.travelers_count || 1), 0),
    overdue: Object.entries(followUps).filter(([, d]) => new Date(d) < new Date()).length,
  }

  const leadNotes = selectedLead ? (notes[selectedLead.id] || []) : []
  const activityLog = leadNotes.filter(n => n.type !== 'note')
  const noteLog     = leadNotes.filter(n => n.type === 'note')
  const selectedTemp = selectedLead ? getLeadTemp(selectedLead) : null

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex gap-6 h-full">
      {/* ── LEFT: Lead List ── */}
      <div className={`flex-1 min-w-0 space-y-6 transition-all ${selectedLead ? 'hidden xl:block xl:max-w-[55%]' : ''}`}>

        {/* Header */}
        <div data-tour="leads-header" className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0F172A]">Leads Pipeline</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Track, qualify, and convert every opportunity.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-bold transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <button
              onClick={() => { setShowInquiry(true); setInquirySuccess(null) }}
              className="bg-[#00236f] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#00236f]/10 hover:bg-slate-800 transition-all active:scale-95 text-sm"
            >
              <Plus size={16} /> New Inquiry
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Leads', value: stats.total, icon: BarChart3, color: 'text-blue-600 bg-blue-50' },
            { label: 'Hot Leads 🔥', value: stats.hot, icon: Flame, color: 'text-red-600 bg-red-50' },
            { label: 'Pipeline Value', value: `₹${(stats.pipeline/100000).toFixed(1)}L`, icon: TrendingUp, color: 'text-[#14B8A6] bg-teal-50' },
            { label: stats.overdue > 0 ? `${stats.overdue} Overdue` : `Won: ${stats.won}`, value: stats.overdue > 0 ? '⚠️' : stats.won, icon: stats.overdue > 0 ? Bell : CheckCircle, color: stats.overdue > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-9 h-9 ${s.color.split(' ')[1]} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <s.icon size={17} className={s.color.split(' ')[0]} />
              </div>
              <div>
                <div className="text-lg font-extrabold text-[#0F172A]">{s.value}</div>
                <div className="text-[10px] text-slate-400 font-semibold">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div data-tour="leads-filter" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px] relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text" placeholder="Search leads..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6]"
              />
            </div>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6] bg-white">
              <option value="">All Statuses</option>
              {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
            </select>
            {/* Temperature filter */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              {(['','HOT','WARM','COLD'] as const).map(t => (
                <button key={t} onClick={() => setTempFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${tempFilter === t ? 'bg-white shadow-sm text-[#0F172A]' : 'text-slate-500'}`}>
                  {t === '' ? 'All' : t === 'HOT' ? '🔥 Hot' : t === 'WARM' ? '🌡️ Warm' : '❄️ Cold'}
                </button>
              ))}
            </div>
          </div>

          {/* Funnel bar */}
          <div className="flex gap-1 items-center text-[10px] font-bold flex-wrap">
            {STATUS_ORDER.map((s, i) => {
              const count = leads.filter(l => l.status === s).length
              return (
                <React.Fragment key={s}>
                  <button onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
                    className={`px-2.5 py-1 rounded-full transition-all ${statusFilter === s ? STATUS_COLORS[s] + ' border' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {s.replace('_', ' ')} ({count})
                  </button>
                  {i < STATUS_ORDER.length - 1 && <ChevronRight size={10} className="text-slate-300 flex-shrink-0" />}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Lead Cards */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader size={28} className="animate-spin text-slate-300" /></div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100">
            <EmptyState
              icon={Users}
              title="No leads found"
              description="No leads match your current filters. Try adjusting your search or stage filter."
              compact
            />
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLeads.map(lead => {
              const temp = getLeadTemp(lead)
              const fu = followUps[lead.id]
              const fuLabel = followUpLabel(fu || null)
              const noteCount = (notes[lead.id] || []).length
              const isSelected = selectedLead?.id === lead.id
              return (
                <div key={lead.id}
                  onClick={() => { setSelectedLead(isSelected ? null : lead); setActiveTab('overview') }}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${isSelected ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/20' : 'border-slate-100 hover:border-slate-200'}`}>
                  <div className="flex items-start gap-3">
                    {/* Temp indicator */}
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 text-sm
                      ${temp === 'HOT' ? 'bg-red-50' : temp === 'WARM' ? 'bg-amber-50' : 'bg-blue-50'}`}>
                      {temp === 'HOT' ? '🔥' : temp === 'WARM' ? '🌡️' : '❄️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0F172A] text-sm">{lead.full_name || `Lead #${lead.id}`}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[lead.status] || 'bg-slate-100 text-slate-600'}`}>
                          {lead.status.replace('_', ' ')}
                        </span>
                        {fuLabel.text && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${fuLabel.color}`}>
                            <Bell size={9} /> {fuLabel.text}
                          </span>
                        )}
                        {noteCount > 0 && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <StickyNote size={9} /> {noteCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><span>📍</span>{lead.destination || 'TBD'}</span>
                        <span>{lead.duration_days}d · {lead.travelers_count} pax</span>
                        {lead.budget_per_person && <span className="font-semibold text-slate-700">{fmt(lead.budget_per_person, lead.currency)}/pax</span>}
                        <span className="text-slate-400">{timeAgo(lead.created_at)}</span>
                      </div>
                    </div>
                    {/* Quick actions */}
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      {lead.phone && (
                        <button onClick={() => handleWhatsApp(lead)} title="WhatsApp"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all">
                          <MessageSquare size={15} />
                        </button>
                      )}
                      {lead.phone && (
                        <button onClick={() => handleCall(lead)} title="Call"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                          <Phone size={15} />
                        </button>
                      )}
                      {lead.email && (
                        <button onClick={() => handleEmail(lead)} title="Email"
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-all">
                          <Mail size={15} />
                        </button>
                      )}
                      <ChevronRight size={14} className={`text-slate-300 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Detail Panel ── */}
      {selectedLead && (
        <div className="w-full xl:w-[44%] flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm sticky top-4 max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
            {/* Panel header */}
            <div className="p-5 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{selectedTemp === 'HOT' ? '🔥' : selectedTemp === 'WARM' ? '🌡️' : '❄️'}</span>
                    <h2 className="font-black text-[#0F172A] text-lg">{selectedLead.full_name || `Lead #${selectedLead.id}`}</h2>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[selectedLead.status]}`}>
                      {selectedLead.status.replace('_',' ')}
                    </span>
                    <span className="text-xs text-slate-500">{selectedLead.destination} · {selectedLead.duration_days}d</span>
                  </div>
                </div>
                <button onClick={() => setSelectedLead(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                  <X size={16} />
                </button>
              </div>
              {/* Tabs */}
              <div data-tour="leads-ai-score" className="flex gap-1 mt-4 bg-slate-100 p-1 rounded-xl">
                {(['overview','notes','activity','ai'] as TabType[]).map(t => (
                  <button key={t} onClick={() => { setActiveTab(t); if (t === 'ai' && selectedLead) fetchLLMScore(selectedLead) }}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all capitalize ${activeTab === t ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}>
                    {t === 'notes' ? `Notes (${noteLog.length})` : t === 'activity' ? `Activity (${activityLog.length})` : t === 'ai' ? '✦ AI Score' : 'Overview'}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel body */}
            <div className="overflow-y-auto flex-1 p-5">
              {/* ── OVERVIEW TAB ── */}
              {activeTab === 'overview' && (
                <div className="space-y-5">
                  {/* Contact info */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { icon: Phone, label: selectedLead.phone || '—', action: () => handleCall(selectedLead), color: 'text-blue-600' },
                        { icon: Mail,  label: selectedLead.email || '—', action: () => handleEmail(selectedLead), color: 'text-purple-600' },
                      ].map(({ icon: Icon, label, action, color }) => (
                        <button key={label} onClick={action} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-all text-left w-full">
                          <Icon size={14} className={color} />
                          <span className="text-xs text-slate-700 font-medium truncate">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trip details */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Trip Details</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: 'Destination', value: selectedLead.destination || '—' },
                        { label: 'Duration', value: `${selectedLead.duration_days || '?'} days` },
                        { label: 'Travelers', value: `${selectedLead.travelers_count} pax` },
                        { label: 'Style', value: selectedLead.travel_style || '—' },
                        { label: 'Budget/Person', value: selectedLead.budget_per_person ? fmt(selectedLead.budget_per_person, selectedLead.currency) : '—' },
                        { label: 'Source', value: selectedLead.source || '—' },
                        { label: 'Confidence', value: `${selectedLead.triage_confidence}%` },
                        { label: 'Created', value: new Date(selectedLead.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                          <div className="text-xs font-bold text-slate-800">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Follow-up scheduler */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Follow-up Reminder</div>
                    <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                      {followUps[selectedLead.id] ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell size={14} className="text-amber-600" />
                            <span className="text-xs font-bold text-amber-800">
                              {followUpLabel(followUps[selectedLead.id]).text}
                            </span>
                            <span className="text-xs text-amber-600">
                              {new Date(followUps[selectedLead.id]).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                            </span>
                          </div>
                          <button onClick={() => saveFollowUps({ ...followUps, [selectedLead.id]: '' })}
                            className="text-amber-400 hover:text-amber-600"><X size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-amber-500 flex-shrink-0" />
                          <input type="date" min={new Date().toISOString().slice(0,10)}
                            onChange={e => e.target.value && handleSetFollowUp(selectedLead.id, e.target.value)}
                            className="text-xs bg-transparent outline-none text-amber-800 font-bold flex-1"
                            placeholder="Set follow-up date" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status changer */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Move Stage</div>
                    <div className="flex flex-wrap gap-1.5">
                      {STATUS_ORDER.map(s => (
                        <button key={s} disabled={updating || selectedLead.status === s}
                          onClick={() => handleStatusUpdate(selectedLead.id, s)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                            selectedLead.status === s ? 'bg-[#14B8A6] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          } disabled:opacity-40`}>
                          {s.replace('_',' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick comms */}
                  <div className="space-y-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Quick Actions</div>
                    <div className="grid grid-cols-3 gap-2">
                      <button onClick={() => handleWhatsApp(selectedLead)}
                        className="flex flex-col items-center gap-1.5 p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-all text-green-700">
                        <MessageSquare size={18} />
                        <span className="text-[10px] font-black">WhatsApp</span>
                      </button>
                      <button onClick={() => handleCall(selectedLead)}
                        className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all text-blue-700">
                        <Phone size={18} />
                        <span className="text-[10px] font-black">Call</span>
                      </button>
                      <button onClick={() => handleEmail(selectedLead)}
                        className="flex flex-col items-center gap-1.5 p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-all text-purple-700">
                        <Mail size={18} />
                        <span className="text-[10px] font-black">Email</span>
                      </button>
                    </div>
                  </div>

                  {/* AI suggested reply */}
                  {selectedLead.suggested_reply && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles size={10} className="text-[#14B8A6]" /> AI Suggested Reply
                      </div>
                      <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-xs text-teal-800 leading-relaxed italic">
                        "{selectedLead.suggested_reply}"
                      </div>
                      <button onClick={() => handleWhatsApp(selectedLead, selectedLead.suggested_reply)}
                        className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-green-600 transition-all">
                        <MessageSquare size={13} /> Send via WhatsApp
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── NOTES TAB ── */}
              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {/* Add note */}
                  <div className="space-y-2">
                    <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
                      placeholder="Add a note... (call summary, client preferences, pricing discussed)"
                      rows={3}
                      className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-[#14B8A6] resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleAddNote(selectedLead.id)} disabled={!newNote.trim() || addingNote}
                        className="flex-1 bg-[#0F172A] text-white py-2.5 rounded-xl text-xs font-black hover:bg-slate-700 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                        <StickyNote size={13} /> Save Note
                      </button>
                      <button onClick={() => handleAddNote(selectedLead.id, 'call', newNote || 'Call logged')}
                        className="px-3 py-2.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                        📞 Log Call
                      </button>
                    </div>
                  </div>
                  {/* Note list */}
                  {noteLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <StickyNote size={28} className="mx-auto mb-2 opacity-30" />
                      No notes yet. Add your first note above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...noteLog].reverse().map(n => (
                        <div key={n.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <p className="text-sm text-slate-700 leading-relaxed">{n.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.timestamp).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── AI SCORE TAB ── */}
              {activeTab === 'ai' && (() => {
                const llm = llmScores[selectedLead.id]
                const score = llm && !llm.loading ? llm : computeAIScore(selectedLead)
                const isLoading = llm?.loading ?? false
                const provider = llm?.provider ?? ''
                const ringColor = score.temp === 'HOT' ? '#ef4444' : score.temp === 'WARM' ? '#f59e0b' : '#94a3b8'
                const circumference = 2 * Math.PI * 36
                const dashOffset = circumference * (1 - score.conversionPct / 100)
                return (
                  <div className="space-y-5">
                    {/* Provider badge / loading indicator */}
                    <div className="flex items-center justify-between">
                      {isLoading ? (
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <Loader size={11} className="animate-spin" />
                          <span>Running LLM analysis…</span>
                        </div>
                      ) : provider && provider !== 'heuristic' ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-[#14B8A6] font-semibold">
                          <Sparkles size={10} />
                          <span>AI-powered · {provider === 'openrouter' ? 'Llama 3.3 70B' : 'Claude Haiku'}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">Heuristic scoring</div>
                      )}
                      {!isLoading && !provider && (
                        <button onClick={() => fetchLLMScore(selectedLead)}
                          className="text-[10px] text-[#14B8A6] font-semibold flex items-center gap-1 hover:opacity-80">
                          <Sparkles size={10} /> Analyze with AI
                        </button>
                      )}
                    </div>
                    {/* Conversion Probability Ring */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Conversion Probability</div>
                      <div className="relative w-24 h-24 mx-auto mb-3">
                        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="36" fill="none" stroke="#e2e8f0" strokeWidth="7" />
                          <circle
                            cx="40" cy="40" r="36" fill="none"
                            stroke={ringColor} strokeWidth="7"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            strokeLinecap="round"
                            style={{ transition: 'stroke-dashoffset 1s ease' }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-2xl font-black text-slate-800">{score.conversionPct}%</span>
                        </div>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${score.temp === 'HOT' ? 'bg-red-50 text-red-600' : score.temp === 'WARM' ? 'bg-amber-50 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>
                        {score.temp === 'HOT' ? '🔥' : score.temp === 'WARM' ? '☀️' : '❄️'} {score.temp} Lead
                      </div>
                    </div>

                    {/* Qualification */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">AI Assessment</div>
                      <p className="text-xs text-slate-700 leading-relaxed">{score.qualification}</p>
                    </div>

                    {/* Signal Breakdown */}
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Intent Signals</div>
                      <div className="space-y-2">
                        {score.signals.map(sig => (
                          <div key={sig.label} className="flex items-center gap-3">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sig.positive ? 'bg-green-500' : 'bg-red-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-semibold text-slate-600 truncate">{sig.label}</span>
                                <span className="text-[10px] text-slate-400 ml-2 flex-shrink-0">{sig.value}</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${sig.positive ? 'bg-green-400' : 'bg-red-300'}`}
                                  style={{ width: `${Math.min(100, sig.weight * 4)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                      <div className="text-[10px] font-black uppercase tracking-widest text-green-700 mb-2">Strengths</div>
                      <div className="space-y-1">
                        {score.strengths.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-green-800">
                            <span className="flex-shrink-0 mt-0.5">✓</span>
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Risks */}
                    <div className="bg-red-50 rounded-xl p-4 border border-red-100">
                      <div className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Risk Flags</div>
                      <div className="space-y-1">
                        {score.risks.map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-red-700">
                            <span className="flex-shrink-0 mt-0.5">⚠</span>
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="bg-[#0f172a] rounded-xl p-4 text-white">
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#14B8A6] mb-2">NAMA Recommendation</div>
                      <p className="text-xs leading-relaxed opacity-90">{score.recommendation}</p>
                      <button
                        onClick={() => {
                          const wa = `Hello ${selectedLead.full_name?.split(' ')[0]}! I wanted to follow up on your ${selectedLead.destination || 'trip'} inquiry 🌏`
                          window.open(`https://wa.me/${selectedLead.phone?.replace(/\s+/g, '')}?text=${encodeURIComponent(wa)}`, '_blank')
                        }}
                        className="mt-3 w-full py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-bold hover:bg-[#0d9488] transition-colors"
                      >
                        {score.nextBestAction}
                      </button>
                    </div>
                  </div>
                )
              })()}

              {/* ── ACTIVITY TAB ── */}
              {activeTab === 'activity' && (
                <div className="space-y-1">
                  {activityLog.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <Activity size={28} className="mx-auto mb-2 opacity-30" />
                      No activity yet. Actions you take on this lead appear here.
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
                      <div className="space-y-3">
                        {[...activityLog].reverse().map(a => {
                          const icon = a.type === 'status_change' ? '🔄' : a.type === 'call' ? '📞' : a.type === 'email' ? '📧' : a.type === 'whatsapp' ? '💬' : '📝'
                          return (
                            <div key={a.id} className="flex items-start gap-3 pl-1">
                              <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center flex-shrink-0 text-xs z-10">
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0 pb-3">
                                <p className="text-xs text-slate-700 font-medium leading-relaxed">{a.text}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(a.timestamp)}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── New Inquiry Modal ── */}
      {showInquiry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-[#0F172A]">New Inquiry</h2>
              <button onClick={() => setShowInquiry(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <X size={20} />
              </button>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
              <button onClick={() => setInquiryMode('ai')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${inquiryMode === 'ai' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}>
                <Sparkles size={15} /> AI Triage
              </button>
              <button onClick={() => setInquiryMode('manual')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${inquiryMode === 'manual' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-slate-500'}`}>
                <UserPlus size={15} /> Manual Entry
              </button>
            </div>
            {inquirySuccess ? (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
                <p className="font-bold text-slate-800 mb-1">Lead Created</p>
                <p className="text-sm text-slate-500 mb-6">{inquirySuccess}</p>
                <div className="flex gap-3">
                  <button onClick={() => setInquirySuccess(null)} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50">Add Another</button>
                  <button onClick={() => setShowInquiry(false)} className="flex-1 py-3 bg-[#0F172A] text-white rounded-xl font-bold text-sm">Done</button>
                </div>
              </div>
            ) : inquiryMode === 'ai' ? (
              <div className="space-y-4">
                <textarea value={rawMessage} onChange={e => setRawMessage(e.target.value)}
                  placeholder="Paste the client's message — WhatsApp, email, or any text..."
                  rows={5} className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none resize-none text-sm" />
                <button onClick={handleAiIngest} disabled={inquiryLoading || !rawMessage.trim()}
                  className="w-full bg-[#14B8A6] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-teal-600 disabled:opacity-50">
                  {inquiryLoading ? <><Loader size={16} className="animate-spin" /> Analysing...</> : <><Sparkles size={16} /> Triage with AI</>}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: 'full_name', label: 'Full Name', placeholder: 'Jane Doe', type: 'text' },
                    { key: 'email', label: 'Email', placeholder: 'jane@example.com', type: 'email' },
                    { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
                    { key: 'destination', label: 'Destination', placeholder: 'Bali, Maldives...', type: 'text' },
                    { key: 'duration_days', label: 'Duration (days)', placeholder: '7', type: 'number' },
                    { key: 'budget_per_person', label: 'Budget/Person', placeholder: '150000', type: 'number' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                      <input type={f.type} value={manualForm[f.key]} placeholder={f.placeholder}
                        onChange={e => setManualForm({ ...manualForm, [f.key]: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-[#14B8A6] outline-none text-sm" />
                    </div>
                  ))}
                </div>
                <button onClick={handleManualCreate} disabled={inquiryLoading}
                  className="w-full bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50">
                  {inquiryLoading ? <><Loader size={16} className="animate-spin" /> Creating...</> : <><UserPlus size={16} /> Create Lead</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportLeadsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => fetchLeads()}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold">
          <span className="text-[#14B8A6]">✓</span>{toast}
        </div>
      )}

      {error && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 max-w-sm shadow-lg">
          <AlertCircle size={18} />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Product Tour — first visit only */}
      {showTour && (
        <ProductTour
          steps={LEADS_TOUR}
          startDelay={0}
          onDone={() => {
            setShowTour(false)
            markTourDone('leads')
          }}
        />
      )}
    </div>
  )
}
