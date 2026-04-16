'use client'

/**
 * NAMA OS — Onboarding Wizard
 * ────────────────────────────
 * 5-step guided setup for new tenants:
 *   Step 1 → Company Profile (name, logo upload, GST, currency, timezone)
 *   Step 2 → WhatsApp Connection (verify token, webhook URL display)
 *   Step 3 → First Vendor (quick-add one hotel/airline/activity vendor)
 *   Step 4 → Invite Team (optional — add ops/sales seats)
 *   Step 5 → Launch! (summary + go to dashboard)
 *
 * Each step is independently skippable. Progress is stored in localStorage
 * so the wizard can be resumed if the user closes the tab.
 */

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2, Phone, Store, Users, Rocket, Check,
  ChevronRight, ChevronLeft, Copy, CheckCircle2,
  Loader, AlertCircle, Globe, Zap, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

// ── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Company',   icon: Building2, title: 'Set up your company profile',   subtitle: 'Your brand on NAMA — logos, currency, and GST details.' },
  { id: 2, label: 'WhatsApp',  icon: Phone,     title: 'Connect WhatsApp Business',     subtitle: 'Receive enquiries directly from WhatsApp into your Query Inbox.' },
  { id: 3, label: 'Vendors',   icon: Store,     title: 'Add your first vendor',         subtitle: 'Start your supplier directory — hotels, airlines, activities.' },
  { id: 4, label: 'Team',      icon: Users,     title: 'Invite your team',              subtitle: 'Add ops, sales, or finance — each with the right role.' },
  { id: 5, label: 'Launch',    icon: Rocket,    title: "You're ready to launch!",       subtitle: 'Your NAMA workspace is configured and ready.' },
]

const CURRENCIES  = ['INR', 'USD', 'EUR', 'AED', 'GBP', 'SGD', 'THB']
const TIMEZONES   = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Europe/London', 'Asia/Singapore', 'Asia/Bangkok']
const VENDOR_CATS = ['HOTEL', 'AIRLINE', 'TRANSFER', 'ACTIVITY', 'RESTAURANT', 'CRUISE', 'INSURANCE', 'OTHER']
const ROLES       = ['OPS_EXECUTIVE', 'SALES_AGENT', 'FINANCE_MANAGER', 'ORG_ADMIN']

// ── Types ────────────────────────────────────────────────────────────────────
interface CompanyForm  { name: string; gst: string; currency: string; timezone: string; website: string }
interface VendorForm   { name: string; category: string; contact_email: string; city: string; country: string }
interface InviteRow    { email: string; role: string }

// ── Helpers ──────────────────────────────────────────────────────────────────
const WEBHOOK_URL = typeof window !== 'undefined'
  ? `${window.location.origin}/api/v1/webhooks/whatsapp`
  : 'https://app.namatravel.com/api/v1/webhooks/whatsapp'

function useCopyToClipboard(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false)
  const copy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return [copied, copy]
}

// ── Step progress bar ─────────────────────────────────────────────────────────
function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((s, i) => {
        const done    = s.id < current
        const active  = s.id === current
        return (
          <React.Fragment key={s.id}>
            <div className={`flex flex-col items-center gap-1.5 ${i > 0 ? 'flex-1' : ''}`}>
              {i > 0 && (
                <div className={`h-0.5 w-full mb-4 transition-all ${done ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
              )}
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                done   ? 'bg-[#14B8A6] border-[#14B8A6] text-white' :
                active ? 'bg-white border-[#14B8A6] text-[#14B8A6]' :
                         'bg-white border-slate-200 text-slate-300'
              }`}>
                {done ? <Check size={16} strokeWidth={2.5} /> : <s.icon size={16} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                active ? 'text-[#14B8A6]' : done ? 'text-emerald-600' : 'text-slate-300'
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-9 transition-all ${done ? 'bg-[#14B8A6]' : 'bg-slate-100'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState<Record<number, boolean>>({})

  // Step 1
  const [company, setCompany] = useState<CompanyForm>({
    name: '', gst: '', currency: 'INR', timezone: 'Asia/Kolkata', website: '',
  })

  // Step 2
  const [waToken,    setWaToken]    = useState(() => `nama_${Math.random().toString(36).slice(2, 12)}`)
  const [waCopied,   copyWa]        = useCopyToClipboard()
  const [urlCopied,  copyUrl]       = useCopyToClipboard()

  // Step 3
  const [vendor, setVendor] = useState<VendorForm>({
    name: '', category: 'HOTEL', contact_email: '', city: '', country: 'India',
  })

  // Step 4
  const [invites, setInvites] = useState<InviteRow[]>([{ email: '', role: 'OPS_EXECUTIVE' }])

  // Step 5 — summary
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  // Persist progress
  useEffect(() => {
    const saved = localStorage.getItem('nama_onboarding_step')
    if (saved) setStep(Number(saved))
  }, [])
  useEffect(() => {
    localStorage.setItem('nama_onboarding_step', String(step))
  }, [step])

  const markDone = (s: number) => setCompletedSteps(prev => new Set([...prev, s]))

  const next = async (skip = false) => {
    if (!skip) {
      setSaving(true)
      // Simulate save (real apps: call the respective API)
      await new Promise(r => setTimeout(r, 600))
      setSaving(false)
      markDone(step)
    } else {
      markDone(step) // mark skipped steps as done too
    }
    setStep(s => Math.min(s + 1, 5))
  }

  const prev = () => setStep(s => Math.max(s - 1, 1))

  const finish = () => {
    localStorage.removeItem('nama_onboarding_step')
    router.push('/dashboard')
  }

  const currentStep = STEPS[step - 1]

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">

      {/* Top bar */}
      <div className="h-16 bg-white border-b border-slate-100 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center font-black text-white text-sm">N</div>
          <span className="font-black text-[#0F172A] text-base">NAMA OS</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
          <span>Step {step} of {STEPS.length}</span>
          <span className="text-slate-300">·</span>
          <span className="text-[#14B8A6] font-bold">Setup Wizard</span>
        </div>
        <button
          onClick={finish}
          className="text-xs text-slate-400 hover:text-slate-600 font-bold transition-colors"
        >
          Skip all & go to dashboard →
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Step bar */}
          <StepBar current={step} />

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

            {/* Header */}
            <div className="mb-8 flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center flex-shrink-0">
                <currentStep.icon size={20} className="text-[#14B8A6]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-[#0F172A] tracking-tight">{currentStep.title}</h2>
                <p className="text-sm text-slate-500 font-medium mt-1">{currentStep.subtitle}</p>
              </div>
            </div>

            {/* ── Step 1: Company Profile ───────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <OLabel>Company Name</OLabel>
                    <input value={company.name} onChange={e => setCompany(c => ({...c, name: e.target.value}))}
                      placeholder="e.g. Horizon Holidays Pvt. Ltd." className={OInput} />
                  </div>
                  <div>
                    <OLabel>Currency</OLabel>
                    <select value={company.currency} onChange={e => setCompany(c => ({...c, currency: e.target.value}))} className={OInput}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <OLabel>Timezone</OLabel>
                    <select value={company.timezone} onChange={e => setCompany(c => ({...c, timezone: e.target.value}))} className={OInput}>
                      {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <OLabel>GST Number <span className="text-slate-400 font-normal">(optional)</span></OLabel>
                    <input value={company.gst} onChange={e => setCompany(c => ({...c, gst: e.target.value}))}
                      placeholder="22AAAAA0000A1Z5" className={OInput} />
                  </div>
                  <div>
                    <OLabel>Website <span className="text-slate-400 font-normal">(optional)</span></OLabel>
                    <input value={company.website} onChange={e => setCompany(c => ({...c, website: e.target.value}))}
                      placeholder="https://yourco.com" className={OInput} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: WhatsApp ──────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="bg-[#0F172A] rounded-xl p-5 text-white">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">What you'll need</p>
                  <p className="text-sm font-medium text-slate-300 leading-relaxed">
                    A <span className="text-[#14B8A6] font-bold">WhatsApp Business Platform</span> account from Meta. Go to
                    {' '}<a href="https://developers.facebook.com" target="_blank" rel="noopener noreferrer" className="underline text-[#14B8A6]">developers.facebook.com</a>{' '}
                    → Your App → WhatsApp → Configuration.
                  </p>
                </div>

                <div>
                  <OLabel>Your Verify Token</OLabel>
                  <div className="flex gap-2">
                    <input value={waToken} readOnly className={OInput + ' font-mono flex-1'} />
                    <button onClick={() => copyWa(waToken)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-all flex-shrink-0">
                      {waCopied ? <><CheckCircle2 size={13} className="text-emerald-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Paste this in Meta's "Verify token" field when setting up the webhook.</p>
                </div>

                <div>
                  <OLabel>Your Webhook URL</OLabel>
                  <div className="flex gap-2">
                    <input value={WEBHOOK_URL} readOnly className={OInput + ' font-mono flex-1 text-xs'} />
                    <button onClick={() => copyUrl(WEBHOOK_URL)}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-1.5 transition-all flex-shrink-0">
                      {urlCopied ? <><CheckCircle2 size={13} className="text-emerald-500" /> Copied!</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5 font-medium">Paste this as the "Callback URL" in Meta's webhook configuration panel.</p>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-medium">
                    Subscribe to the <strong>messages</strong> field in the webhook. Enquiries will then appear in your{' '}
                    <strong>Query Inbox → M1 Triage</strong> automatically.
                  </p>
                </div>
              </div>
            )}

            {/* ── Step 3: First Vendor ──────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <OLabel>Vendor Name</OLabel>
                    <input value={vendor.name} onChange={e => setVendor(v => ({...v, name: e.target.value}))}
                      placeholder="e.g. The Ritz-Carlton, Bali" className={OInput} />
                  </div>
                  <div>
                    <OLabel>Category</OLabel>
                    <select value={vendor.category} onChange={e => setVendor(v => ({...v, category: e.target.value}))} className={OInput}>
                      {VENDOR_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <OLabel>Country</OLabel>
                    <input value={vendor.country} onChange={e => setVendor(v => ({...v, country: e.target.value}))}
                      placeholder="India" className={OInput} />
                  </div>
                  <div>
                    <OLabel>City</OLabel>
                    <input value={vendor.city} onChange={e => setVendor(v => ({...v, city: e.target.value}))}
                      placeholder="Mumbai" className={OInput} />
                  </div>
                  <div>
                    <OLabel>Contact Email <span className="text-slate-400 font-normal">(optional)</span></OLabel>
                    <input type="email" value={vendor.contact_email} onChange={e => setVendor(v => ({...v, contact_email: e.target.value}))}
                      placeholder="reservations@hotel.com" className={OInput} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 font-medium">
                  You can add unlimited vendors later from <strong>Vendors → M6</strong>. This is just to get you started.
                </p>
              </div>
            )}

            {/* ── Step 4: Invite Team ───────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                {invites.map((inv, i) => (
                  <div key={i} className="flex gap-3 items-end">
                    <div className="flex-1">
                      {i === 0 && <OLabel>Email Address</OLabel>}
                      <input
                        type="email"
                        value={inv.email}
                        onChange={e => setInvites(arr => arr.map((r, j) => j === i ? {...r, email: e.target.value} : r))}
                        placeholder="colleague@yourco.com"
                        className={OInput}
                      />
                    </div>
                    <div className="w-48">
                      {i === 0 && <OLabel>Role</OLabel>}
                      <select
                        value={inv.role}
                        onChange={e => setInvites(arr => arr.map((r, j) => j === i ? {...r, role: e.target.value} : r))}
                        className={OInput}
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setInvites(a => [...a, { email: '', role: 'OPS_EXECUTIVE' }])}
                  className="text-xs font-bold text-[#14B8A6] hover:underline"
                >
                  + Add another team member
                </button>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-600 mb-2">Role capabilities</p>
                  <div className="grid grid-cols-2 gap-y-1 text-[11px] text-slate-500 font-medium">
                    <span>ORG_ADMIN → Full access</span>
                    <span>OPS_EXECUTIVE → Ops + bookings</span>
                    <span>SALES_AGENT → Leads + quotes</span>
                    <span>FINANCE_MANAGER → Finance only</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Launch! ───────────────────────────────────────── */}
            {step === 5 && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  {STEPS.slice(0, 4).map(s => (
                    <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border ${
                      completedSteps.has(s.id) && !Array.from(completedSteps).some(c => c === s.id && !saved[s.id])
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        completedSteps.has(s.id) ? 'bg-emerald-500' : 'bg-slate-200'
                      }`}>
                        {completedSteps.has(s.id)
                          ? <Check size={15} className="text-white" />
                          : <s.icon size={15} className="text-slate-400" />
                        }
                      </div>
                      <span className="text-xs font-bold text-slate-700">{s.label}</span>
                    </div>
                  ))}
                </div>

                {/* What's waiting */}
                <div className="bg-[#0F172A] rounded-2xl p-6 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 opacity-5"><Zap size={120} fill="white" /></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 relative z-10">Your workspace is ready</p>
                  <div className="grid grid-cols-2 gap-3 relative z-10">
                    {[
                      { label: 'Query Inbox', desc: 'AI-triaged enquiries' },
                      { label: 'Lead CRM',    desc: 'Auto-enriched contacts' },
                      { label: 'Quotations',  desc: '2-min AI-generated' },
                      { label: 'Reports',     desc: 'Real-time P&L & BI' },
                    ].map(f => (
                      <div key={f.label} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-[#14B8A6] flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-white">{f.label}</p>
                          <p className="text-[11px] text-slate-400">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={finish}
                  className="w-full flex items-center justify-center gap-2 bg-[#14B8A6] text-[#0F172A] py-4 rounded-xl font-black text-base hover:bg-teal-400 active:scale-[0.98] transition-all shadow-lg shadow-[#14B8A6]/20"
                >
                  <Rocket size={18} />
                  Enter Your Dashboard
                  <ArrowRight size={18} />
                </button>
              </div>
            )}

            {/* ── Navigation ───────────────────────────────────────────── */}
            {step < 5 && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                <button
                  onClick={prev}
                  disabled={step === 1}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => next(true)}
                    className="px-4 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => next(false)}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-60"
                  >
                    {saving ? <><Loader size={14} className="animate-spin" /> Saving…</> : <>Save & Continue <ChevronRight size={16} /></>}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  )
}

// ── Shared helpers ────────────────────────────────────────────────────────────
const OInput = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all'

function OLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-widest">{children}</label>
}
