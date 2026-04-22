'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DynamixLayout({ children }) {
  const router = useRouter()

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('nama_token')
    const isDemoMode =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((item) => item.trim().startsWith('nama_demo=1'))

    if (!hasToken && !isDemoMode) {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="dynamix-shell min-h-screen bg-[#0a0c10] text-white">
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0a0c10]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <span className="font-display font-bold text-sm">N</span>
            </div>
            <div>
              <p className="font-display font-semibold text-sm tracking-tight">NAMA DYNAMIX</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Dynamix Holidays</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-zinc-400">
            <Link href="/dynamix" className="hover:text-white">Search</Link>
            <Link href="/dynamix/classic" className="hover:text-white">Classic</Link>
            <Link href="/dynamix/ai-categories" className="hover:text-white">AI First</Link>
            <Link href="/dynamix/results" className="hover:text-white">Results</Link>
            <Link href="/dynamix/builder" className="hover:text-white">Builder</Link>
            <Link href="/dynamix/send" className="hover:text-white">Send</Link>
            <Link href="/dynamix/approval" className="hover:text-white">Approval</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="px-4 py-2 rounded-full border border-white/10 text-sm text-zinc-300 hover:text-white hover:bg-white/5">Back to dashboard</Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
