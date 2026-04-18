'use client'

/**
 * NAMA OS — Login Page
 * ─────────────────────
 * Neon.tech-inspired split layout:
 *   LEFT  → dark brand panel with feature highlights + social proof
 *   RIGHT → clean login form with NAMA design system tokens
 *
 * Design tokens:
 *   bg-[#0F172A]   navy (brand dark)
 *   text-[#14B8A6] teal (accent)
 *   #F97316        orange (highlight)
 */

import React, { useState, useEffect, Suspense } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Eye, EyeOff, Loader, AlertCircle, CheckCircle2,
  ArrowRight, Zap, BarChart2, Globe, Shield,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

const FEATURES = [
  { icon: Zap,        text: 'Quotation in < 2 minutes — AI-native from day one' },
  { icon: BarChart2,  text: 'Real-time P&L on every booking, to the rupee' },
  { icon: Globe,      text: '19 modules — triage → CRM → bid → book → invoice' },
  { icon: Shield,     text: 'Bank-grade security — JWT + RLS + HMAC webhooks' },
]

const TESTIMONIALS = [
  { name: 'Arjun S.',  company: 'Wanderlust DMC',    quote: 'Cut quoting time from 3 hours to 8 minutes.',      avatar: 'A' },
  { name: 'Priya M.',  company: 'Elite Holidays',     quote: 'Our vendor P&L was always a mystery. Not anymore.', avatar: 'P' },
  { name: 'Karan T.',  company: 'Horizon Travels',    quote: 'NAMA replaced 3 tools and 2 spreadsheets.',        avatar: 'K' },
]

function LoginPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { login, user } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  // Detect session-expired redirect from API layer
  const sessionExpired = searchParams.get('expired') === '1'

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.push('/dashboard')
  }, [user, router])

  // Cycle testimonials
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 4000)
    return () => clearInterval(t)
  }, [])


  const handleGoogleLogin = async (credential: string) => {
    setError(''); setLoading(true)
    const API = process.env.NEXT_PUBLIC_API_URL ?? ''
    try {
      const resp = await fetch(`${API}/api/v1/auth/google/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: credential }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({})) as { detail?: string }
        throw new Error(err.detail ?? `Google login failed (${resp.status})`)
      }
      const session = await resp.json() as {
        id: string; email: string; display_name: string; role: string; tenant_name: string
        access_token?: string; user_id?: number; tenant_id?: number
      }
      localStorage.setItem('nama_session_id', session.id)
      localStorage.setItem('nama_session_email', session.email)
      localStorage.setItem('nama_session_role', session.role)
      localStorage.setItem('nama_session_tenant', session.tenant_name)
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
      setTimeout(() => router.push('/dashboard'), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.')
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError('Please enter both email and password.'); return }
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      setSuccess(true)
      const params = new URLSearchParams(window.location.search)
      setTimeout(() => router.push(params.get('redirect') || '/dashboard'), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex font-sans">

      {/* ── LEFT — Brand Panel ────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[52%] bg-[#0F172A] flex-col relative overflow-hidden">

        {/* Background glow blobs */}
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-[400px] h-[400px] bg-[#F97316]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Grid overlay */}
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
            <span className="text-[10px] font-black text-[#14B8A6] bg-[#14B8A6]/10 border border-[#14B8A6]/20 px-2 py-0.5 rounded-full uppercase tracking-widest ml-1">v0.3</span>
          </div>

          {/* Hero text */}
          <div className="mt-20 mb-12">
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
              The operating system<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#14B8A6] to-[#F97316]">
                travel companies
              </span><br />
              actually deserve.
            </h1>
            <p className="mt-6 text-slate-400 text-base font-medium leading-relaxed max-w-md">
              19 AI-native modules. One workspace. From the first WhatsApp enquiry to the final invoice — fully automated.
            </p>
          </div>

          {/* Feature list */}
          <div className="space-y-4 mb-auto">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <f.icon size={15} className="text-[#14B8A6]" />
                </div>
                <p className="text-sm text-slate-300 font-medium leading-snug pt-1">{f.text}</p>
              </div>
            ))}
          </div>

          {/* Testimonial carousel */}
          <div className="mt-12 border-t border-white/5 pt-8">
            <div className="relative h-24 overflow-hidden">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={t.name}
                  className={`absolute inset-0 transition-all duration-700 ${
                    i === activeTestimonial ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                >
                  <p className="text-sm text-slate-300 font-medium italic mb-4">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/30 flex items-center justify-center font-black text-[#14B8A6] text-xs">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{t.name}</p>
                      <p className="text-[11px] text-slate-500">{t.company}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div className="flex gap-1.5 mt-4">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-1 rounded-full transition-all ${
                    i === activeTestimonial ? 'w-6 bg-[#14B8A6]' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── RIGHT — Login Form ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">

        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          {/* Mobile logo only */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 bg-[#0F172A] rounded-lg flex items-center justify-center font-black text-white text-sm">N</div>
            <span className="font-black text-[#0F172A]">NAMA OS</span>
          </div>
          <div className="hidden lg:block" />
          <p className="text-sm text-slate-500 font-medium">
            No account?{' '}
            <Link href="/register" className="text-[#14B8A6] font-bold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-[400px]">

            <div className="mb-10">
              <h2 className="text-3xl font-black text-[#0F172A] tracking-tight">Welcome back</h2>
              <p className="text-slate-500 font-medium mt-2 text-sm">Sign in to your NAMA workspace</p>
            </div>

            {/* Session expired notice */}
            {sessionExpired && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm font-medium mb-5">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-amber-500" />
                Your session has expired. Please sign in again to continue.
              </div>
            )}

            <div>
              <div className="mb-6">
                <p className="text-xs text-slate-400 mb-3 font-medium">Continue with Google</p>
                <GoogleLogin
                  onSuccess={(cred) => { if (cred.credential) void handleGoogleLogin(cred.credential) }}
                  onError={() => setError('Google sign-in failed.')}
                  theme="filled_black" text="signin_with" shape="rectangular" width="360"
                />
                <div className="flex items-center gap-3 mt-5">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-xs text-slate-500">or sign in with email</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>
              </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">

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
                  Signed in! Redirecting…
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2 uppercase tracking-widest">
                  Work Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-slate-600 uppercase tracking-widest">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[#14B8A6] font-bold hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full px-4 py-3.5 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#0F172A] placeholder-slate-400 focus:bg-white focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || success}
                className="w-full flex items-center justify-center gap-2 bg-[#0F172A] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-slate-800 active:scale-[0.98] transition-all shadow-lg shadow-[#0F172A]/15 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading ? (
                  <><Loader size={16} className="animate-spin" /> Signing in…</>
                ) : success ? (
                  <><CheckCircle2 size={16} /> Done!</>
                ) : (
                  <>Sign in to Dashboard <ArrowRight size={16} /></>
                )}
              </button>

              {/* Divider */}
              <div className="relative flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              {/* Demo access — bypasses Railway auth entirely */}
              <div className="bg-[#14B8A6]/5 border border-[#14B8A6]/15 rounded-xl p-4 text-center">
                <p className="text-[11px] text-slate-500 font-medium mb-2">Testing? Explore the full dashboard</p>
                <button
                  type="button"
                  onClick={() => router.push('/demo')}
                  className="text-[11px] font-black text-[#14B8A6] hover:underline"
                >
                  Enter demo mode →
                </button>
              </div>

            </form>

            <p className="mt-8 text-center text-[11px] text-slate-400 font-medium">
              By signing in you agree to NAMA's{' '}
              <Link href="/terms" className="underline hover:text-slate-600">Terms</Link> &{' '}
              <Link href="/privacy" className="underline hover:text-slate-600">Privacy Policy</Link>
            </p>

          </div>
        </div>

      </div>

    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  )
}
