"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Map, Briefcase, MessageSquare,
  CreditCard, FileText, Settings, Zap, X, Bell,
  Search, LogOut, Store, Key, FileQuestion, Menu,
  Inbox, GitBranch, BarChart2, Plug, Activity, Play, ArrowRight, Radar, FolderOpen,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user: _user, logout: _logout } = { user: null, logout: () => {} };
  const auth = useAuth();
  const router = useRouter();

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname]);

  // Close sidebar on small screens by default
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Detect demo mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsDemoMode(localStorage.getItem('nama_demo_mode') === '1');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('nama_demo_mode');
    document.cookie = 'nama_demo=; path=/; max-age=0; SameSite=Lax';
    auth.logout();
    router.push('/');
  };

  const handleExitDemo = () => {
    localStorage.removeItem('nama_demo_mode');
    // Clear the cookie so middleware no longer grants demo access
    document.cookie = 'nama_demo=; path=/; max-age=0; SameSite=Lax';
    router.push('/');
  };

  const initials = auth.user?.email ? auth.user.email[0].toUpperCase() : '?';
  const displayEmail = auth.user?.email ?? 'Loading...';
  const displayRole = auth.user?.role ?? '';

  const navigation = [
    { name: 'Dashboard',    href: '/dashboard',              icon: LayoutDashboard },
    { name: 'Query Inbox',  href: '/dashboard/queries',      icon: Inbox },
    { name: 'Leads',        href: '/dashboard/leads',        icon: Users },
    { name: 'Quotations',   href: '/dashboard/quotations',   icon: FileQuestion },
    { name: 'Itineraries',  href: '/dashboard/itineraries',  icon: Map },
    { name: 'Bookings',     href: '/dashboard/bookings',     icon: Briefcase },
    { name: 'Vendors',      href: '/dashboard/vendors',      icon: Store },
    { name: 'Comms',        href: '/dashboard/comms',        icon: MessageSquare },
    { name: 'Intentra',     href: '/dashboard/intentra',     icon: Radar, badge: 'Live' },
    { name: 'Documents',    href: '/dashboard/documents',    icon: FolderOpen },
    { name: 'Finance',      href: '/dashboard/finance',      icon: CreditCard },
    { name: 'Content',      href: '/dashboard/content',      icon: FileText },
    { name: 'Automations',  href: '/dashboard/automations',  icon: GitBranch },
    { name: 'Reports',      href: '/dashboard/reports',      icon: BarChart2 },
    { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
    { name: 'Settings',     href: '/dashboard/settings',     icon: Settings },
    { name: 'System Status',href: '/dashboard/status',       icon: Activity },
  ];

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`
      ${mobile ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl' : 'fixed inset-y-0 z-50'}
      ${!mobile && (sidebarOpen ? 'w-64' : 'w-[72px]')}
      bg-[#0F172A] text-white flex flex-col transition-all duration-300
    `}>
      {/* Logo */}
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-sm flex-shrink-0">N</div>
          {(sidebarOpen || mobile) && <span className="text-lg font-black tracking-tight">NAMA OS</span>}
        </div>
        {mobile ? (
          <button onClick={() => setMobileOpen(false)} className="p-1.5 text-slate-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        ) : (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 text-slate-500 hover:text-white transition-colors"
          >
            <Menu size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              title={!sidebarOpen && !mobile ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                isActive
                  ? 'bg-[#14B8A6]/15 text-[#14B8A6]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={18} className={`flex-shrink-0 ${isActive ? 'text-[#14B8A6]' : 'text-slate-500 group-hover:text-slate-300'}`} />
              {(sidebarOpen || mobile) && (
                <span className={`text-sm font-semibold flex-1 ${isActive ? 'font-bold text-[#14B8A6]' : ''}`}>
                  {item.name}
                </span>
              )}
              {(sidebarOpen || mobile) && 'badge' in item && item.badge && (
                <span className="ml-auto text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded-full bg-[#14B8A6]/20 text-[#14B8A6] border border-[#14B8A6]/30 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#14B8A6] animate-pulse inline-block" />
                  {item.badge}
                </span>
              )}
              {isActive && !(('badge' in item) && item.badge) && (sidebarOpen || mobile) && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#14B8A6]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Kinetic */}
      <div className="px-3 pb-2">
        <Link
          href="/kinetic"
          className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-all"
        >
          <Zap size={18} fill="currentColor" className="flex-shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-xs font-black tracking-widest uppercase">Kinetic Mode</span>}
        </Link>
      </div>

      {/* User */}
      <div className="px-3 pb-4 pt-2 border-t border-white/5">
        {isDemoMode ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center font-black text-[#14B8A6] text-xs flex-shrink-0">
              <Play size={12} fill="currentColor" />
            </div>
            {(sidebarOpen || mobile) && (
              <>
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-[#14B8A6] truncate">Demo Mode</p>
                  <p className="text-[10px] text-slate-500 truncate">Sample data only</p>
                </div>
                <button onClick={handleExitDemo} title="Exit Demo" className="p-1.5 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center font-black text-[#14B8A6] text-xs flex-shrink-0">
              {initials}
            </div>
            {(sidebarOpen || mobile) && (
              <>
                <div className="flex-1 overflow-hidden min-w-0">
                  <p className="text-xs font-bold text-white truncate">{displayEmail}</p>
                  <p className="text-[10px] text-slate-500 truncate capitalize">{displayRole}</p>
                </div>
                <button onClick={handleLogout} title="Logout" className="p-1.5 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-left">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden">
            <Sidebar mobile />
          </div>
        </>
      )}

      {/* Main content */}
      <main className={`flex-1 flex flex-col transition-all duration-300 lg:${sidebarOpen ? 'ml-64' : 'ml-[72px]'}`}>
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-100 px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl px-3 py-2 w-64 md:w-80">
              <Search size={16} className="text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search leads, itineraries..."
                className="bg-transparent border-none outline-none text-sm w-full text-slate-600 placeholder-slate-400"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        {/* Demo Mode Banner */}
        {isDemoMode && !demoBannerDismissed && (
          <div className="bg-gradient-to-r from-[#14B8A6]/10 via-[#0891b2]/10 to-[#14B8A6]/10 border-b border-[#14B8A6]/20 px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#14B8A6]/20 flex items-center justify-center">
                <Play size={10} fill="currentColor" className="text-[#14B8A6]" />
              </div>
              <p className="text-xs font-semibold text-slate-700 truncate">
                <span className="font-black text-[#14B8A6]">Demo Mode</span>
                {' '}— You&apos;re exploring sample data. No real account needed.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href="/register"
                className="flex items-center gap-1.5 bg-[#0F172A] text-white text-[11px] font-black px-3 py-1.5 rounded-full hover:bg-slate-800 transition-all active:scale-95"
              >
                Get Started Free <ArrowRight size={10} />
              </Link>
              <button
                onClick={() => setDemoBannerDismissed(true)}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors rounded"
                title="Dismiss"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <div className="p-4 md:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
