'use client'
export const dynamic = 'force-dynamic'

/**
 * NAMA OS — Register / Sign-up Page
 * ────────────────────────────────────
 * Neon.tech-inspired split layout:
 *   LEFT  → dark brand panel with 4-step "what happens next" journey
 *   RIGHT → clean multi-field signup form with NAMA design tokens
 *
 * After successful registration → redirects to /onboarding
 * (5-step guided setup wizard for new tenants)
 */

import React, { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Eye, EyeOff, Loader, AlertCircle, CheckCircle2,
  ArrowRight, Check, Zap, Users, Map, TrendingUp,
} from 'lucide-react'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const JOURNEY_STEPS = [
  { icon: Zap,        title: 'Set up your workspace',   desc: 'Company profile, WhatsApp, and first vendor — takes 4 minutes.' },
  { icon: Users,      title: 'Invite your team',        desc: 'Ops, sales, finance — each with their own role and permissions.' },
  { icon: Map,        title: 'Create your first quote', desc: 'AI-generated, structured, sent in under 2 minutes.' },
  { icon: TrendingUp, title: 'Watch the P&L move',      desc: 'Every booking tracked. Margin health visible in real time.' },
]

const PASSWORD_RULES = [
  { rule: (p: string) => p.length >= 8,                label: '8+ characters' },
  { rule: (p: string) => /[A-Z]/.test(p),              label: 'Uppercase letter' },
  { rule: (p: string) => /[0-9]/.test(p),              label: 'Number' },
  { rule: (p: string) => /[!@#$%^&*()_+\-=]/.test(p), label: 'Special character' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()

  const [form, setForm] = useState({
    fullName:    '',
    companyName: '',
    email:       '',
    password:    '',
    confirmPassword: '',
    agreed: false,
  })
  const [showPw,      setShowPw]      = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [focusPw,     setFocusPw]     = useState(false)
  const [googleToken, setGoogleToken] = useState<string | null>(null)
  const [googleEmail, setGoogleEmail] = useState('')

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
    setError('')
  }

  const pwStrength = PASSWORD_RULES.filter(r => r.rule(form.password)).length

  const validate = (): string | null => {
    if (!form.fullName.trim())       return 'Full name is required'
    if (!form.companyName.trim())    return 'Company name is required'
    if (!form.email.trim())          return 'Business email is required'
    if (pwStrength < 3)              return 'Password is too weak — meet at least 3 requirements'
    if (form.password !== form.confirmPassword) return 'Passwords do not match'
    if (!form.agreed)                return 'Please accept the Terms & Privacy Policy to continue'
    return null
  }

  async function enterWithGoogle(idToken: string) {
    setError('')
    setLoading(true)
    const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://intuitive-blessing-production-30de.up.railway.app'
    try {
      const resp = await fetch(`${API}/api/v1/auth/google/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken, tenant_name: form.companyName.trim() }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string }
        throw new Error(err.detail ?? `Registration failed (${resp.status})`)
      }
      const session = await resp.json() as {
        id: string; email: string; display_name: string; role: string; tenant_name: string
        access_token?: string; user_id?: number; tenant_id?: number
      }
      localStorage.setItem('nama_session_id', session.id)
      localStorage.setItem('nama_session_email', session.email)
      localStorage.setItem('nama_session_role', session.role)
      localStorage.setItem('nama_session_tenant', session.tenant_name || form.companyName.trim())
      if (session.access_token) {
        localStorage.setItem('nama_token', session.access_token)
        localStorage.setItem('nama_user', JSON.stringify({
          userId: session.user_id, tenantId: session.tenant_id,
          role: session.role, email: session.email,
        }))
        await fetch('/api/auth/set-cookie', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.access_token }),
        }).catch(() => {})
      }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      // Step 1: register org → get tenant_id
      const orgRes = await authApi.registerOrg({
        organization_name: form.companyName,
        admin_email:       form.email,
        admin_password:    form.password,
      })

      // Step 2: register admin user under that tenant
      await authApi.registerUser({
        email:     form.email,
        password:  form.password,
        full_name: form.fullName,
        role:      'R2_ORG_ADMIN',
        tenant_id: orgRes.tenant_id,
      })

      // Step 3: auto-login
      await login(form.email, form.password)

      setSuccess(true)
      // Go to onboarding wizard
      setTimeout(() => router.push('/onboarding'), 800)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">

      {/* ── LEFT — Brand Panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] bg-[#0F172A] flex-col relative overflow-hidden">

        {/* Glow blobs */}
        <div className="absolute top-[-150px] right-[-100px] w-[500px] h-[500px] bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#F97316]/8 rounded-full blur-3xl pointer-events-none" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.3) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative z-10 flex flex-col h-full p-12">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#14B8A6] rounded-xl flex items-center justify-center font-black text-[#0F172A] text-base">N</div>
            <span className="text-xl font-black text-white tracking-tight">NAMA OS</span>
          </div>

          {/* Hero */}
          <div className="mt-20 mb-12">
            <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-3 py-1.5 rounded-full mb-6">
              <div className="w-1.5 h-1.5 bg-[#14B8A6] rounded-full animate-pulse" />
              <span className="text-[11px] font-black text-[#14B8A6] uppercase tracking-widest">Free pilot — no card required</span>
            </div>
            <h1 className="text-4xl xl:text-[44px] font-black text-white leading-tight tracking-tight">
              Your entire travel<br />
              ops in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-[#F97316]">
                one dashboard.
              </span>
            </h1>
            <p className="mt-5 text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
              Join hundreds of travel DMCs already running on NAMA. Set up takes 4 minutes.
            </p>
          </div>

          {/* Journey steps */}
          <div className="space-y-5 mb-auto">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">What happens after you sign up</p>
            {JOURNEY_STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center flex-shrink-0">
                    <step.icon size={14} className="text-[#14B8A6]" />
                  </div>
                  {i < JOURNEY_STEPS.length - 1 && (
                    <div className="w-px h-6 bg-white/5 mt-1" />
                  )}
                </div>
                <div className="pt-1">
                  <p className="text-sm font-bold text-white">{step.title}</p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-12 border-t border-white/5 pt-8">
            <div className="flex items-center gap-6 flex-wrap">
              {['SOC 2 Type II', 'GDPR Ready', 'AES-256', '99.9% SLA'].map(b => (
                <div key={b} className="flex items-center gap-1.5">
                  <Check size={12} className="text-[#14B8A6]" />
                  <span className="text-[11px] text-slate-400 font-semibold">{b}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT — Registration Form ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center font-black text-white text-sm">N</div>
            <span className="font-black text-[#0F172A]">NAMA OS</span>
          </div>
          <div className="hidden lg:block" />
          <p className="text-sm text-slate-500 font-medium">
            Have an account?{' '}
            <Link href="/login" className="text-[#14B8A6] font-bold hover:underline">
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-10 overflow-y-auto">
          <div className="w-full max-w-[420px]">

            <div className="mb-8">
              <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Create your workspace</h2>
              <p className="text-slate-500 font-medium mt-2 text-sm">Start your free pilot — no credit card needed.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">


              {/* Google Sign-In — primary option at top, like Notion/Linear */}
              <div className="mb-2">
                <GoogleLogin
                  onSuccess={(cred) => {
                    if (cred.credential) {
                      setGoogleToken(cred.credential)
                      try {
                        const p = JSON.parse(atob(cred.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
                        if (p.name && !form.fullName) setForm(f => ({ ...f, fullName: p.name as string }))
                        setGoogleEmail((p.email as string) ?? '')
                      } catch {}
                      setError('')
                      void enterWithGoogle(cred.credential)
                    }
                  }}
                  onError={() => setError('Google sign-in failed. Use email & password below instead.')}
                  theme="outline" text="continue_with" shape="rectangular" width="360"
                  useOneTap
                />
                {googleEmail && loading && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium animate-pulse">
                    ✓ Signed in as <strong>{googleEmail}</strong> — creating your workspace…
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-xs text-slate-400 font-medium">or continue with email</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
                  <CheckCircle2 size={16} />
                  Account created! Opening your workspace…
                </div>
              )}

              {/* Full Name */}
              <Field label="Full Name">
                <input
                  type="text"
                  value={form.fullName}
                  onChange={update('fullName')}
                  placeholder="Priya Sharma"
                  autoComplete="name"
                  className={INPUT_CLS}
                  disabled={loading}
                />
              </Field>

              {/* Company Name */}
              <Field label="Travel Company Name">
                <input
                  type="text"
                  value={form.companyName}
                  onChange={update('companyName')}
                  placeholder="Horizon Holidays Pvt. Ltd."
                  autoComplete="organization"
                  className={INPUT_CLS}
                  disabled={loading}
                />
              </Field>

              {/* Email */}
              <Field label="Business Email">
                <input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  placeholder="admin@yourtravelco.com"
                  autoComplete="email"
                  className={INPUT_CLS}
                  disabled={loading}
                />
              </Field>

              {/* Password */}
              <Field label="Password">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={update('password')}
                    onFocus={() => setFocusPw(true)}
                    onBlur={() => setFocusPw(false)}
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    className={INPUT_CLS + ' pr-11'}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {/* Password strength bar */}
                {(focusPw || form.password) && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      {[0,1,2,3].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i < pwStrength
                              ? pwStrength <= 1 ? 'bg-red-400'
                              : pwStrength <= 2 ? 'bg-amber-400'
                              : pwStrength <= 3 ? 'bg-[#14B8A6]'
                              : 'bg-emerald-500'
                              : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                      {PASSWORD_RULES.map(r => (
                        <div key={r.label} className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                            r.rule(form.password) ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-200'
                          }`}>
                            {r.rule(form.password) && <Check size={8} className="text-white" strokeWidth={3} />}
                          </div>
                          <span className={`text-[10px] font-medium transition-colors ${
                            r.rule(form.password) ? 'text-[#14B8A6]' : 'text-slate-400'
                          }`}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Field>

              {/* Confirm Password */}
              <Field label="Confirm Password">
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={update('confirmPassword')}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    className={INPUT_CLS + ' pr-11' + (form.confirmPassword && form.confirmPassword !== form.password ? ' border-red-300 focus:border-red-400 focus:ring-red-100' : '')}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  {form.confirmPassword && form.confirmPassword === form.password && (
                    <CheckCircle2 size={15} className="absolute right-9 top-1/2 -translate-y-1/2 text-emerald-500 mr-1" />
                  )}
                </div>
              </Field>

              {/* Google Sign-In */}
              <div className="mb-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 border-t border-slate-200" />
                  <span className="text-xs text-slate-400 font-medium">Sign in faster with Google</span>
                  <div className="flex-1 border-t border-slate-200" />
                </div>
                <GoogleLogin
                  onSuccess={(cred) => {
                    if (cred.credential) {
                      setGoogleToken(cred.credential)
                      try {
                        const p = JSON.parse(atob(cred.credential.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
                        if (p.name && !form.fullName) setForm(f => ({ ...f, fullName: p.name as string }))
                        setGoogleEmail((p.email as string) ?? '')
                      } catch {}
                      setError('')
                      void enterWithGoogle(cred.credential)
                    }
                  }}
                  onError={() => setError('Google sign-in failed. Enter details below instead.')}
                  theme="outline" text="continue_with" shape="rectangular" width="360"
                />
                {googleEmail && loading && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium animate-pulse">
                    ✓ Signed in as <strong>{googleEmail}</strong> — creating your workspace…
                  </p>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={form.agreed}
                    onChange={update('agreed')}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                    form.agreed ? 'bg-[#14B8A6] border-[#14B8A6]' : 'border-slate-300'
                  }`}>
                    {form.agreed && <Check size={10} className="text-white" strokeWidth={3} />}
                  </div>
                </div>
                <span className="text-xs text-slate-500 font-medium leading-relaxed">
                  I agree to NAMA's{' '}
                  <Link href="/terms" className="text-[#14B8A6] font-bold hover:underline">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-[#14B8A6] font-bold hover:underline">Privacy Policy</Link>.
                  Your data is encrypted at rest and in transit.
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-[#0F172A]/15 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <><Loader size={16} className="animate-spin" /> Creating your workspace…</>
                ) : success ? (
                  <><CheckCircle2 size={16} /> Workspace created!</>
                ) : (
                  <>Start Free Pilot <ArrowRight size={16} /></>
                )}
              </button>

            </form>

            <p className="mt-6 text-center text-[11px] text-slate-400 font-medium">
              Already have an account?{' '}
              <Link href="/login" className="text-[#14B8A6] font-bold hover:underline">
                Sign in →
              </Link>
            </p>

          </div>
        </div>
      </div>

    </div>
  )
}

// ── Shared sub-components ──────────────────────────────────────────────────
const INPUT_CLS = 'w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all disabled:opacity-60'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-widest">
        {label}
      </label>
      {children}
    </div>
  )
}
