'use client'

/**
 * NAMA OS — Demo Mode Entry Point
 * ────────────────────────────────
 * Sets a demo_mode flag in localStorage, then redirects to the dashboard.
 * All dashboard pages fall back to rich seed data when the backend is
 * unavailable or returns empty results, so visitors get a fully populated
 * experience without needing an account.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Zap } from 'lucide-react'

export default function DemoPage() {
  const router = useRouter()

  useEffect(() => {
    // Set localStorage flag — picked up by dashboard layout for the banner
    localStorage.setItem('nama_demo_mode', '1')
    // Set a cookie so the Edge middleware lets the visitor into /dashboard
    // without a real auth token. SameSite=Lax is safe; no sensitive data.
    document.cookie = 'nama_demo=1; path=/; max-age=3600; SameSite=Lax'
    // Small delay so the loading screen is visible (feels intentional, not broken)
    const t = setTimeout(() => router.replace('/dashboard'), 1200)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-6 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-[#14B8A6] rounded-xl flex items-center justify-center">
          <span className="text-[#0F172A] font-black text-xl">N</span>
        </div>
        <span className="text-3xl font-black tracking-tight">NAMA OS</span>
      </div>

      {/* Animated pulse */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full bg-[#14B8A6]/20 animate-ping" />
        <div className="w-14 h-14 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/30 flex items-center justify-center">
          <Zap size={24} className="text-[#14B8A6]" fill="currentColor" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-lg font-bold text-white">Loading demo dashboard…</p>
        <p className="text-sm text-slate-400 mt-1">No account needed. Explore all 19 modules.</p>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#14B8A6] to-[#0891b2] rounded-full animate-[progress_1.2s_ease-in-out_forwards]" />
      </div>

      <style jsx>{`
        @keyframes progress {
          from { width: 0% }
          to   { width: 100% }
        }
      `}</style>
    </div>
  )
}
