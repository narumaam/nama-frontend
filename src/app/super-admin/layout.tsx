'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ShieldCheck, LogOut, BarChart3, Users, Building2, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const ALLOWED_ROLES = ['R0_NAMA_OWNER', 'R1_SUPER_ADMIN']

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/?redirect=/super-admin')
        return
      }
      if (!ALLOWED_ROLES.includes(user.role)) {
        router.push('/dashboard')
      }
    }
  }, [user, isLoading, router])

  if (isLoading || !user || !ALLOWED_ROLES.includes(user.role)) {
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

  const isOwner = user.role === 'R0_NAMA_OWNER'

  const navItems = [
    { href: '/super-admin', label: 'Overview', icon: BarChart3 },
    { href: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
    { href: '/super-admin/users', label: 'Users', icon: Users },
    { href: '/super-admin/support', label: 'Support', icon: MessageSquare },
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0F172A] border-r border-white/10 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#14B8A6] rounded-lg flex items-center justify-center">
              <ShieldCheck size={18} className="text-[#0F172A]" />
            </div>
            <div>
              <div className="text-white font-bold text-sm">NAMA Admin</div>
              <div className="text-white/40 text-xs">Super Admin Portal</div>
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
          {isOwner && (
            <Link
              href="/owner"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium mt-4 border-t border-white/10 pt-4"
            >
              <ShieldCheck size={16} />
              Owner Console
            </Link>
          )}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#14B8A6]/20 rounded-lg flex items-center justify-center text-[#14B8A6] font-bold text-sm">
              {user.email?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-medium truncate">{user.email}</div>
              <div className="text-[#14B8A6] text-[10px] font-bold uppercase">
                {isOwner ? 'NAMA Owner' : 'Super Admin'}
              </div>
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
