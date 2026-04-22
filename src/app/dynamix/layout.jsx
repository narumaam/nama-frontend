'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Moon, Sun } from 'lucide-react'

export default function DynamixLayout({ children }) {
  const router = useRouter()
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('nama_token')
    const isDemoMode =
      typeof document !== 'undefined' &&
      document.cookie.split(';').some((item) => item.trim().startsWith('nama_demo=1'))

    if (!hasToken && !isDemoMode) {
      router.replace('/login')
    }
  }, [router])

  useEffect(() => {
    const savedTheme =
      typeof window !== 'undefined' ? localStorage.getItem('nama_dynamix_theme') || 'dark' : 'dark'
    setTheme(savedTheme)
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('nama_dynamix_theme', nextTheme)
    }
  }

  return (
    <div data-dynamix-theme={theme} className="dynamix-shell min-h-screen">
      <header className="sticky top-0 z-30 border-b backdrop-blur-xl" style={{ borderColor: 'var(--dynamix-border)', backgroundColor: 'var(--dynamix-bg-muted)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20">
              <span className="font-display font-bold text-sm">N</span>
            </div>
            <div>
              <p className="font-display font-semibold text-sm tracking-tight">NAMA DYNAMIX</p>
              <p className="text-[10px] uppercase tracking-[0.22em] dynamix-subtle">Dynamix Holidays</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm dynamix-muted">
            <Link href="/dynamix" className="transition-opacity hover:opacity-100 opacity-80">Search</Link>
            <Link href="/dynamix/classic" className="transition-opacity hover:opacity-100 opacity-80">Classic</Link>
            <Link href="/dynamix/ai-categories" className="transition-opacity hover:opacity-100 opacity-80">AI First</Link>
            <Link href="/dynamix/results" className="transition-opacity hover:opacity-100 opacity-80">Results</Link>
            <Link href="/dynamix/builder" className="transition-opacity hover:opacity-100 opacity-80">Builder</Link>
            <Link href="/dynamix/send" className="transition-opacity hover:opacity-100 opacity-80">Send</Link>
            <Link href="/dynamix/approval" className="transition-opacity hover:opacity-100 opacity-80">Approval</Link>
          </nav>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border dynamix-card-soft text-sm dynamix-muted transition-opacity hover:opacity-100 opacity-90"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'dark' ? 'Day' : 'Night'}
            </button>
            <Link href="/dashboard" className="px-4 py-2 rounded-full border dynamix-card-soft text-sm dynamix-muted transition-opacity hover:opacity-100 opacity-90">Back to dashboard</Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
