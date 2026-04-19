'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Users, Search, MapPin, Phone, Mail, Calendar,
  Briefcase, TrendingUp, Star, ChevronRight, Filter,
  MessageSquare, Eye, Clock, Award, Globe, Tag,
  Upload, X, CheckCircle, AlertCircle, FileText,
  Download, ArrowRight, ArrowLeft, Loader2, ChevronDown,
} from 'lucide-react'
import EmptyState from '@/components/EmptyState'
import { usePermission } from '@/lib/permissions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Client {
  id: string
  name: string
  full_name?: string
  email: string
  phone: string
  city: string
  country: string
  total_bookings: number
  total_spend: number
  last_booking_date: string
  first_booking_date: string
  status: 'active' | 'inactive' | 'vip' | 'ACTIVE' | 'VIP' | 'INACTIVE' | 'BLOCKED'
  assigned_agent: string
  tags: string[]
  preferred_destinations: string[]
  travel_type: string
  last_contact: string
  open_leads: number
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_CLIENTS: Client[] = [
  {
    id: '1', name: 'Rajesh Mehta', email: 'rajesh.m@gmail.com', phone: '+91 98765 43210',
    city: 'Mumbai', country: 'India',
    total_bookings: 6, total_spend: 1840000, last_booking_date: '2026-04-10',
    first_booking_date: '2024-11-15', status: 'vip', assigned_agent: 'Priya Sharma',
    tags: ['VIP', 'Honeymoon', 'Luxury'],
    preferred_destinations: ['Maldives', 'Bali', 'Switzerland'], travel_type: 'Luxury',
    last_contact: '2026-04-15T10:30:00Z', open_leads: 1,
  },
  {
    id: '2', name: 'Ananya Singh', email: 'ananya.s@outlook.com', phone: '+91 87654 32109',
    city: 'Delhi', country: 'India',
    total_bookings: 4, total_spend: 920000, last_booking_date: '2026-03-22',
    first_booking_date: '2025-02-10', status: 'active', assigned_agent: 'Rahul Verma',
    tags: ['Family', 'Budget-conscious'],
    preferred_destinations: ['Kerala', 'Rajasthan', 'Goa'], travel_type: 'Family',
    last_contact: '2026-04-12T14:20:00Z', open_leads: 0,
  },
  {
    id: '3', name: 'Karan Nair', email: 'karan.n@company.io', phone: '+91 76543 21098',
    city: 'Bangalore', country: 'India',
    total_bookings: 8, total_spend: 2640000, last_booking_date: '2026-04-14',
    first_booking_date: '2024-06-01', status: 'vip', assigned_agent: 'Priya Sharma',
    tags: ['VIP', 'Corporate', 'Repeat'],
    preferred_destinations: ['Dubai', 'Singapore', 'Japan'], travel_type: 'Corporate',
    last_contact: '2026-04-16T09:00:00Z', open_leads: 2,
  },
  {
    id: '4', name: 'Meera Patel', email: 'meera.p@gmail.com', phone: '+91 65432 10987',
    city: 'Ahmedabad', country: 'India',
    total_bookings: 2, total_spend: 340000, last_booking_date: '2026-02-14',
    first_booking_date: '2025-08-20', status: 'active', assigned_agent: 'Divya K.',
    tags: ['Honeymoon', 'First-time'],
    preferred_destinations: ['Bali', 'Thailand'], travel_type: 'Honeymoon',
    last_contact: '2026-03-30T11:45:00Z', open_leads: 1,
  },
  {
    id: '5', name: 'Sanjay Rao', email: 'sanjay.r@startup.com', phone: '+91 54321 09876',
    city: 'Hyderabad', country: 'India',
    total_bookings: 1, total_spend: 180000, last_booking_date: '2025-12-20',
    first_booking_date: '2025-12-20', status: 'inactive', assigned_agent: 'Anil Gupta',
    tags: ['Adventure'],
    preferred_destinations: ['Uttarakhand', 'Ladakh'], travel_type: 'Adventure',
    last_contact: '2026-01-10T08:00:00Z', open_leads: 0,
  },
  {
    id: '6', name: 'Pooja Joshi', email: 'pooja.j@email.com', phone: '+91 43210 98765',
    city: 'Pune', country: 'India',
    total_bookings: 3, total_spend: 560000, last_booking_date: '2026-04-05',
    first_booking_date: '2025-04-12', status: 'active', assigned_agent: 'Rahul Verma',
    tags: ['Group', 'Cultural'],
    preferred_destinations: ['Europe', 'Japan', 'Vietnam'], travel_type: 'Cultural',
    last_contact: '2026-04-08T16:30:00Z', open_leads: 1,
  },
  {
    id: '7', name: 'Amit Desai', email: 'amit.d@business.in', phone: '+91 32109 87654',
    city: 'Surat', country: 'India',
    total_bookings: 5, total_spend: 1120000, last_booking_date: '2026-03-30',
    first_booking_date: '2025-01-05', status: 'active', assigned_agent: 'Priya Sharma',
    tags: ['MICE', 'Corporate'],
    preferred_destinations: ['Bangkok', 'Singapore', 'Dubai'], travel_type: 'MICE',
    last_contact: '2026-04-02T13:15:00Z', open_leads: 0,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)   return `${d} days ago`
  if (d < 30)  return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

function avatarColor(name: string) {
  const colors = [
    'from-teal-400 to-cyan-500', 'from-blue-400 to-indigo-500', 'from-purple-400 to-pink-500',
    'from-amber-400 to-orange-500', 'from-green-400 to-emerald-500', 'from-rose-400 to-pink-500',
  ]
  return colors[name.charCodeAt(0) % colors.length]
}

function clientName(c: Client): string {
  return c.full_name || c.name || 'Unknown'
}

function clientStatus(c: Client): 'active' | 'inactive' | 'vip' {
  const s = (c.status || '').toLowerCase()
  if (s === 'vip') return 'vip'
  if (s === 'inactive' || s === 'blocked') return 'inactive'
  return 'active'
}

// ─── Column alias map (client-side mirror of backend) ─────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  'Full Name':      ['name', 'full name', 'full_name', 'given name', 'first name', 'contact name', 'client name', 'display name'],
  'Email':          ['email', 'email address', 'e-mail', 'e-mail 1 - value', 'e-mail address', 'email 1 - value'],
  'Phone':          ['phone', 'phone number', 'mobile', 'mobile phone', 'phone 1 - value', 'business phone', 'whatsapp', 'contact number', 'cell', 'tel'],
  'City':           ['city', 'home city', 'business city', 'location', 'town'],
  'Country':        ['country', 'home country', 'business country', 'nation'],
  'Travel Type':    ['travel type', 'travel style', 'segment', 'category', 'travel_type'],
  'Tags':           ['tags', 'labels', 'groups', 'group membership'],
  'Notes':          ['notes', 'comments', 'remarks', 'description', 'note', 'additional notes'],
  'Total Spend':    ['total spend', 'spend', 'lifetime value', 'ltv', 'revenue'],
  'Total Bookings': ['total bookings', 'bookings', 'trips', 'no of trips', 'number of trips'],
  'Skip':           [],
}

const NAMA_FIELDS = Object.keys(FIELD_ALIASES)

function guessField(header: string): string {
  const h = header.trim().toLowerCase()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (field === 'Skip') continue
    if (aliases.includes(h)) return field
  }
  return 'Skip'
}

// ─── Format badge helper ──────────────────────────────────────────────────────

function detectFormatBadge(filename: string): { label: string; color: string } {
  const fn = filename.toLowerCase()
  if (fn.endsWith('.vcf'))  return { label: 'vCard / Phone Contacts', color: 'bg-purple-100 text-purple-700' }
  if (fn.endsWith('.xlsx') || fn.endsWith('.xls')) return { label: 'Excel Spreadsheet', color: 'bg-green-100 text-green-700' }
  if (fn.includes('google')) return { label: 'Google Contacts', color: 'bg-blue-100 text-blue-700' }
  if (fn.includes('outlook')) return { label: 'Outlook Contacts', color: 'bg-blue-100 text-blue-700' }
  return { label: 'CSV File', color: 'bg-slate-100 text-slate-600' }
}

// ─── ImportContactsModal ──────────────────────────────────────────────────────

interface ImportResult {
  imported: number
  skipped_duplicates: number
  errors: string[]
  total_rows: number
  format_detected: string
}

function ImportContactsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [estimatedRows, setEstimatedRows] = useState<number | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setImportError(null)

    const fn = f.name.toLowerCase()

    // For VCF — can't preview columns meaningfully, just go straight to step 2 with placeholder
    if (fn.endsWith('.vcf')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const count = (text.match(/BEGIN:VCARD/g) || []).length
        setEstimatedRows(count)
        setPreviewHeaders(['full_name', 'email', 'phone', 'city', 'country', 'notes'])
        setPreviewRows([])
        setColumnMapping({})
      }
      reader.readAsText(f)
      return
    }

    // CSV: read and parse first few lines
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = (e.target?.result as string) || ''
      const lines = text.split('\n').filter(l => l.trim())
      setEstimatedRows(Math.max(0, lines.length - 1))

      if (lines.length === 0) return

      // Simple CSV header parse (handles quoted fields)
      const parseRow = (line: string): string[] => {
        const result: string[] = []
        let current = ''
        let inQuotes = false
        for (let i = 0; i < line.length; i++) {
          const ch = line[i]
          if (ch === '"') {
            inQuotes = !inQuotes
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseRow(lines[0])
      setPreviewHeaders(headers)

      // Pre-fill mapping
      const mapping: Record<string, string> = {}
      headers.forEach(h => { mapping[h] = guessField(h) })
      setColumnMapping(mapping)

      // Parse up to 3 data rows for preview
      const dataRows: string[][] = []
      for (let i = 1; i < Math.min(4, lines.length); i++) {
        dataRows.push(parseRow(lines[i]))
      }
      setPreviewRows(dataRows)
    }
    reader.readAsText(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }, [handleFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/v1/clients/import/template')
      if (!res.ok) {
        // fallback: create a simple template client-side
        const csv = 'full_name,email,phone,city,country,travel_type,tags,total_spend,total_bookings,notes,status\n' +
          'Rajesh Mehta,rajesh.m@gmail.com,+91 98765 43210,Mumbai,India,Luxury,"VIP,Repeat",1840000,6,Overwater bungalow fan,VIP\n'
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'nama_clients_template.csv'
        a.click()
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nama_clients_template.csv'
      a.click()
    } catch {}
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setStep(3)
    setImportError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null
      const res = await fetch('/api/v1/clients/import', {
        method: 'POST',
        body: form,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (!res.ok) {
        setImportError(data.detail || 'Import failed')
      } else {
        setResult(data)
      }
    } catch (err: any) {
      setImportError(err.message || 'Import failed. Please try again.')
    } finally {
      setImporting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setFile(null)
    setPreviewHeaders([])
    setPreviewRows([])
    setColumnMapping({})
    setEstimatedRows(null)
    setResult(null)
    setImportError(null)
    setImporting(false)
  }

  const formatBadge = file ? detectFormatBadge(file.name) : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-[#0F172A]">Import Contacts</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Step {step} of 3 — {step === 1 ? 'Upload file' : step === 2 ? 'Map columns' : 'Results'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 border-b border-slate-100">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${step >= s ? 'text-[#14B8A6]' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${step > s ? 'bg-[#14B8A6] text-white' : step === s ? 'bg-[#14B8A6] text-white' : 'bg-slate-200 text-slate-400'}`}>
                  {step > s ? '✓' : s}
                </div>
                {s === 1 ? 'Upload' : s === 2 ? 'Preview' : 'Done'}
              </div>
              {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-[#14B8A6]' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="p-6">
          {/* ── STEP 1: Upload ── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Drag-and-drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-50'
                    : file
                    ? 'border-emerald-400 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.vcf"
                  className="hidden"
                  onChange={handleBrowse}
                />
                {file ? (
                  <div className="space-y-3">
                    <CheckCircle size={36} className="mx-auto text-emerald-500" />
                    <div>
                      <p className="font-extrabold text-[#0F172A]">{file.name}</p>
                      <p className="text-sm text-slate-400 mt-1">
                        {(file.size / 1024).toFixed(1)} KB
                        {estimatedRows !== null && ` · ~${estimatedRows} contacts`}
                      </p>
                    </div>
                    {formatBadge && (
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${formatBadge.color}`}>
                        {formatBadge.label}
                      </span>
                    )}
                    <p className="text-xs text-slate-400">Click to change file</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload size={36} className="mx-auto text-slate-300" />
                    <div>
                      <p className="font-extrabold text-[#0F172A]">Drop your contacts file here</p>
                      <p className="text-sm text-slate-400 mt-1">or click to browse</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      {[
                        { label: 'CSV', color: 'bg-slate-100 text-slate-600' },
                        { label: 'Excel (.xlsx)', color: 'bg-green-100 text-green-700' },
                        { label: 'Google Contacts', color: 'bg-blue-100 text-blue-700' },
                        { label: 'Outlook (.csv)', color: 'bg-blue-100 text-blue-700' },
                        { label: 'vCard (.vcf)', color: 'bg-purple-100 text-purple-700' },
                      ].map(({ label, color }) => (
                        <span key={label} className={`px-2.5 py-1 rounded-full font-bold ${color}`}>{label}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Template download */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="text-sm">
                  <p className="font-bold text-slate-700">Need a template?</p>
                  <p className="text-xs text-slate-400">Download our pre-filled CSV template</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDownloadTemplate() }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-slate-300 transition-colors"
                >
                  <Download size={13} /> Download Template
                </button>
              </div>

              <button
                onClick={() => file && setStep(2)}
                disabled={!file}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-colors"
              >
                Next: Preview <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Column Mapping ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-sm">Column Mapping</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  We auto-detected field mappings. Adjust if needed.
                </p>
              </div>

              {/* Mapping table */}
              {file?.name.toLowerCase().endsWith('.vcf') ? (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-3 bg-purple-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-purple-700">
                      vCard file detected — FN, EMAIL, TEL, ADR, NOTE fields will be imported automatically.
                    </p>
                  </div>
                  <div className="px-4 py-3 text-xs text-slate-500">
                    Fields mapped: Full Name, Email, Phone, City, Country, Notes
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <div className="grid grid-cols-2 gap-0 bg-slate-50 px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Your Column</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Maps to</p>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-52 overflow-y-auto">
                    {previewHeaders.map((header) => (
                      <div key={header} className="grid grid-cols-2 gap-0 px-4 py-2.5 items-center">
                        <span className="text-xs font-medium text-slate-600 truncate pr-2">{header}</span>
                        <select
                          value={columnMapping[header] || 'Skip'}
                          onChange={(e) => setColumnMapping(prev => ({ ...prev, [header]: e.target.value }))}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:border-[#14B8A6] outline-none"
                        >
                          {NAMA_FIELDS.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Data preview */}
              {previewRows.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-2">Preview (first {previewRows.length} rows)</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {previewHeaders.slice(0, 5).map(h => (
                            <th key={h} className="px-3 py-2 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider truncate max-w-[120px]">
                              {h}
                            </th>
                          ))}
                          {previewHeaders.length > 5 && <th className="px-3 py-2 text-slate-400">+{previewHeaders.length - 5} more</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {previewRows.map((row, i) => (
                          <tr key={i}>
                            {row.slice(0, 5).map((cell, j) => (
                              <td key={j} className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{cell || '—'}</td>
                            ))}
                            {row.length > 5 && <td className="px-3 py-2 text-slate-400">...</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-slate-400 font-medium">
                  Ready to import{' '}
                  <span className="text-[#0F172A] font-extrabold">
                    {estimatedRows ?? '?'} contacts
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-slate-300 transition-colors"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={handleImport}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors"
                  >
                    Import {estimatedRows ?? ''} Contacts <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Results ── */}
          {step === 3 && (
            <div className="space-y-5 text-center py-4">
              {importing ? (
                <div className="space-y-4">
                  <Loader2 size={40} className="mx-auto text-[#14B8A6] animate-spin" />
                  <p className="font-extrabold text-[#0F172A]">Importing contacts...</p>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-2 bg-[#14B8A6] rounded-full animate-pulse w-2/3" />
                  </div>
                  <p className="text-xs text-slate-400">Please wait, this may take a moment for large files.</p>
                </div>
              ) : importError ? (
                <div className="space-y-4">
                  <AlertCircle size={40} className="mx-auto text-rose-500" />
                  <p className="font-extrabold text-[#0F172A]">Import failed</p>
                  <p className="text-sm text-slate-500">{importError}</p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={resetModal}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-slate-300 transition-colors"
                    >
                      Try again
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-5">
                  <CheckCircle size={48} className="mx-auto text-emerald-500" />
                  <div>
                    <p className="text-xl font-extrabold text-[#0F172A]">Import complete!</p>
                    <p className="text-sm text-slate-400 mt-1">Your contacts have been added to NAMA OS.</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 text-left">
                    <div className="bg-emerald-50 rounded-xl p-3">
                      <div className="text-2xl font-extrabold text-emerald-700">{result.imported}</div>
                      <div className="text-[10px] font-bold text-emerald-600 mt-0.5">Contacts added</div>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3">
                      <div className="text-2xl font-extrabold text-amber-700">{result.skipped_duplicates}</div>
                      <div className="text-[10px] font-bold text-amber-600 mt-0.5">Duplicates skipped</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3">
                      <div className="text-2xl font-extrabold text-slate-700">{result.total_rows}</div>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">Total rows</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <FileText size={13} />
                    Format detected: <span className="font-bold text-slate-600">{result.format_detected}</span>
                  </div>

                  {/* Row errors collapsible */}
                  {result.errors.length > 0 && (
                    <details className="text-left bg-rose-50 rounded-xl p-3">
                      <summary className="text-xs font-bold text-rose-700 cursor-pointer">
                        {result.errors.length} row{result.errors.length > 1 ? 's' : ''} had issues
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {result.errors.slice(0, 10).map((e, i) => (
                          <li key={i} className="text-xs text-rose-600">{e}</li>
                        ))}
                        {result.errors.length > 10 && (
                          <li className="text-xs text-rose-400">... and {result.errors.length - 10} more</li>
                        )}
                      </ul>
                    </details>
                  )}

                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={resetModal}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:border-slate-300 transition-colors"
                    >
                      Import another file
                    </button>
                    <button
                      onClick={() => { onSuccess(); onClose() }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors"
                    >
                      View Contacts
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>(SEED_CLIENTS)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'spend' | 'bookings' | 'recent' | 'name'>('spend')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)

  const canExport = usePermission('clients', 'export')
  const [exporting, setExporting] = useState(false)

  const handleExport = async (fmt: 'csv' | 'xlsx') => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ format: fmt })
      if (search) params.set('search', search)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)

      const res = await fetch(`/api/v1/clients/export?${params}`, {
        headers: { 'x-api-key': process.env.NEXT_PUBLIC_NAMA_API_KEY || '' },
      })
      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nama-clients-${new Date().toISOString().slice(0, 10)}.${fmt}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/v1/clients/')
      if (res.ok) {
        const data = await res.json()
        if (data.clients?.length) {
          // Normalize API response to match local Client shape
          const normalized: Client[] = data.clients.map((c: any) => ({
            ...c,
            id: String(c.id),
            name: c.full_name || c.name || 'Unknown',
            open_leads: c.open_leads || 0,
            assigned_agent: c.assigned_agent || '',
            first_booking_date: c.first_booking_date || c.created_at || '',
            last_contact: c.last_contact || c.updated_at || c.created_at || '',
            preferred_destinations: c.preferred_destinations || [],
            tags: c.tags || [],
          }))
          setClients(normalized)
        }
      }
    } catch {
      // Falls back to SEED_CLIENTS
    }
  }

  useEffect(() => { fetchClients() }, [])

  const filtered = clients
    .filter(c => {
      const name = clientName(c)
      const q = search.toLowerCase()
      const matchSearch = !q || name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.city.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || clientStatus(c) === filterStatus
      const matchType = filterType === 'all' || c.travel_type === filterType
      return matchSearch && matchStatus && matchType
    })
    .sort((a, b) => {
      if (sortBy === 'spend')    return b.total_spend - a.total_spend
      if (sortBy === 'bookings') return b.total_bookings - a.total_bookings
      if (sortBy === 'recent')   return new Date(b.last_booking_date).getTime() - new Date(a.last_booking_date).getTime()
      if (sortBy === 'name')     return clientName(a).localeCompare(clientName(b))
      return 0
    })

  const totalRevenue = clients.reduce((s, c) => s + c.total_spend, 0)
  const vipCount     = clients.filter(c => clientStatus(c) === 'vip').length
  const activeCount  = clients.filter(c => clientStatus(c) === 'active').length
  const avgSpend     = clients.length ? Math.round(totalRevenue / clients.length) : 0

  const travelTypes = [...new Set(clients.map(c => c.travel_type).filter(Boolean))]

  const StatusBadge = ({ c }: { c: Client }) => {
    const s = clientStatus(c)
    const map: Record<string, string> = {
      vip:      'bg-amber-50 text-amber-700',
      active:   'bg-emerald-50 text-emerald-700',
      inactive: 'bg-slate-100 text-slate-500',
    }
    return (
      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${map[s]}`}>
        {s === 'vip' ? '⭐ VIP' : s === 'active' ? '● Active' : '○ Inactive'}
      </span>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">Clients</h1>
          <p className="text-slate-500 mt-1 font-medium">
            {clients.length} clients · {vipCount} VIP · ₹{(totalRevenue / 100000).toFixed(1)}L total spend
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canExport && (
            <div className="relative group">
              <button
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-sm font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exporting ? 'Exporting…' : 'Export'}
                <span className="text-slate-400 text-xs">▾</span>
              </button>
              {/* Dropdown on hover */}
              <div className="absolute right-0 top-11 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-20 min-w-[160px]">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors rounded-t-xl"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors rounded-b-xl border-t border-slate-700"
                >
                  Export as Excel
                </button>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Import Contacts
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Clients', value: clients.length.toString(), sub: `${vipCount} VIP`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Spend', value: fmtCurrency(totalRevenue), sub: 'All time', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Avg Per Client', value: fmtCurrency(avgSpend), sub: 'Lifetime value', icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Clients', value: `${activeCount + vipCount}`, sub: `${clients.filter(c => c.open_leads > 0).length} open leads`, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-[20px] border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-[#0F172A]">{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Statuses</option>
          <option value="vip">VIP</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white">
          <option value="all">All Types</option>
          {travelTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs text-slate-400 font-medium">Sort:</span>
          {([['spend', 'Spend'], ['bookings', 'Bookings'], ['recent', 'Recent'], ['name', 'Name']] as const).map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === id ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {filtered.map((client) => {
          const name = clientName(client)
          const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={client.id}
              className={`bg-white rounded-[20px] border shadow-sm p-5 hover:border-slate-300 transition-all cursor-pointer ${selectedClient?.id === client.id ? 'border-[#14B8A6] ring-2 ring-[#14B8A6]/10' : 'border-slate-100'}`}
              onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-black text-white text-sm flex-shrink-0`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#0F172A]">{name}</span>
                    <StatusBadge c={client} />
                    {client.open_leads > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        {client.open_leads} open lead{client.open_leads > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1"><MapPin size={11} /> {client.city}</span>
                    <span className="flex items-center gap-1"><Tag size={11} /> {client.travel_type || '—'}</span>
                    {client.last_contact && (
                      <span className="flex items-center gap-1"><Clock size={11} /> {timeAgo(client.last_contact)}</span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${selectedClient?.id === client.id ? 'rotate-90' : ''}`} />
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-50">
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{client.total_bookings}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Bookings</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{fmtCurrency(client.total_spend)}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Total Spend</div>
                </div>
                <div>
                  <div className="text-base font-extrabold text-[#0F172A]">{fmtCurrency(Math.round(client.total_spend / Math.max(client.total_bookings, 1)))}</div>
                  <div className="text-[10px] text-slate-400 font-medium">Avg per Trip</div>
                </div>
              </div>

              {/* Expanded detail */}
              {selectedClient?.id === client.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Contact</p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-slate-600"><Mail size={12} /> {client.email || '—'}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Phone size={12} /> {client.phone || '—'}</div>
                        <div className="flex items-center gap-2 text-slate-600"><Globe size={12} /> {client.city}, {client.country}</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium mb-1">Relationship</p>
                      <div className="space-y-1.5">
                        {client.assigned_agent && (
                          <div className="flex items-center gap-2 text-slate-600"><Users size={12} /> Agent: {client.assigned_agent}</div>
                        )}
                        {client.first_booking_date && (
                          <div className="flex items-center gap-2 text-slate-600"><Calendar size={12} /> Since {new Date(client.first_booking_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</div>
                        )}
                        {client.last_booking_date && (
                          <div className="flex items-center gap-2 text-slate-600"><Briefcase size={12} /> Last: {new Date(client.last_booking_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {client.preferred_destinations?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2">Preferred Destinations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {client.preferred_destinations.map(d => (
                          <span key={d} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1">
                            <MapPin size={10} /> {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {client.tags?.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 font-medium mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {client.tags.map(tag => (
                          <span key={tag} className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all">
                      <MessageSquare size={13} /> Message
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-slate-300 transition-all">
                      <Eye size={13} /> View Bookings
                    </button>
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-slate-300 transition-all">
                      <TrendingUp size={13} /> New Lead
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-2 bg-white rounded-2xl border border-slate-100">
            <EmptyState
              icon={Users}
              title="No clients found"
              description="Try clearing your search or travel type filter to see all clients."
              compact
            />
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportContactsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={fetchClients}
        />
      )}
    </div>
  )
}
