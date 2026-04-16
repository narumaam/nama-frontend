'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Shield, LogOut, BarChart3, Users, Building2, Settings } from 'lucide-react'
import Link from 'next/link'

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/?redirect=/owner')
        return
      }
      if (user.role !== 'R0_NAMA_OWNER') {
        router.push('/dashboard')
      }
    }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'R0_NAMA_OWNER') {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-white/50 text-sm font-medium animate-pulse">Loading NAMA OS…</div>
      </div>
    )
  }

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const navItems = [
    { href: '/owner', label: 'Overview', icon: BarChart3 },
    { href: '/owner/tenants', label: 'Tenants', icon: Building2 },
    { href: '/owner/users', label: 'Users', icon: Users },
    { href: '/owner/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-red-500 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">NAMA Owner</div>
              <div className="text-white/40 text-xs">Platform Control</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 font-bold text-sm">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.email}</div>
              <div className="text-red-400 text-[10px] font-bold uppercase">NAMA Owner</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-white/40 hover:text-white text-xs font-medium w-full transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        {children}
      </main>
    </div>
  )
}
