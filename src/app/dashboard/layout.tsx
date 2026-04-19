"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Map, Briefcase, MessageSquare,
  CreditCard, FileText, Settings, Zap, X, Bell,
  LogOut, Store, FileQuestion, Menu,
  Inbox, GitBranch, BarChart2, Plug, Activity, Play, ArrowRight, Radar, FolderOpen, ShieldCheck, TrendingUp,
  UserCheck, Contact, Building2, Shield, Calendar,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import NamaCopilot from '@/components/NamaCopilot';
import GlobalSearch from '@/components/GlobalSearch';
import ErrorBoundary from '@/components/ErrorBoundary';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import ChecklistWidget from '@/components/ChecklistWidget';
import { CurrencyProvider } from '@/lib/currency-context';
import CurrencySelector from '@/components/CurrencySelector';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const SEED_NOTIFICATIONS = [
    { id: 1, title: 'New lead: Priya Sharma', body: 'Maldives luxury — 2 pax · ₹4.5L budget', time: '2m ago', unread: true },
    { id: 2, title: 'Booking confirmed', body: 'Karan Mehta — Dubai 5N confirmed', time: '1h ago', unread: true },
    { id: 3, title: 'Quote accepted', body: 'Rahul Verma accepted Bali proposal ✓', time: '3h ago', unread: false },
  ];
  const unreadCount = SEED_NOTIFICATIONS.filter(n => n.unread).length;
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
      const isLocal = localStorage.getItem('nama_demo_mode') === '1';
      const isCookie = document.cookie.split(';').some((item) => item.trim().startsWith('nama_demo=1'));
      
      if (isCookie && !isLocal) {
        localStorage.setItem('nama_demo_mode', '1');
      }
      setIsDemoMode(isLocal || isCookie);
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

  // Role-based navigation — each item declares which roles can see it.
  // null/undefined means visible to all authenticated users (and demo mode).
  // Roles: R0_NAMA_OWNER  R1_SUPER_ADMIN  R2_ORG_ADMIN  R3_SALES_MANAGER
  //        R4_OPS_EXECUTIVE  R5_FINANCE_ADMIN  R6_SUB_AGENT  R7_CLIENT_PORTAL
  const ALL_NAV = [
    {
      name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard,
      roles: null, // all roles
    },
    {
      name: 'Query Inbox', href: '/dashboard/queries', icon: Inbox,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R6_SUB_AGENT'],
    },
    {
      name: 'Leads', href: '/dashboard/leads', icon: Users,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R6_SUB_AGENT'],
    },
    {
      name: 'Quotations', href: '/dashboard/quotations', icon: FileQuestion,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R6_SUB_AGENT'],
    },
    {
      name: 'Itineraries', href: '/dashboard/itineraries', icon: Map,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R6_SUB_AGENT'],
    },
    {
      name: 'Bookings', href: '/dashboard/bookings', icon: Briefcase,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R6_SUB_AGENT','R7_CLIENT_PORTAL'],
    },
    {
      name: 'Calendar', href: '/dashboard/calendar', icon: Calendar,
      roles: null, // all roles
    },
    {
      name: 'Clients', href: '/dashboard/clients', icon: Contact,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE'],
    },
    {
      name: 'Vendors', href: '/dashboard/vendors', icon: Store,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R4_OPS_EXECUTIVE'],
    },
    {
      name: 'Comms', href: '/dashboard/comms', icon: MessageSquare,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE'],
    },
    {
      name: 'Intentra', href: '/dashboard/intentra', icon: Radar, badge: 'Live',
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER'],
    },
    {
      name: 'Documents', href: '/dashboard/documents', icon: FolderOpen,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R4_OPS_EXECUTIVE','R5_FINANCE_ADMIN','R7_CLIENT_PORTAL'],
    },
    {
      name: 'Finance', href: '/dashboard/finance', icon: CreditCard, badge: 'Preview',
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R5_FINANCE_ADMIN'],
    },
    {
      name: 'Content', href: '/dashboard/content', icon: FileText,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R4_OPS_EXECUTIVE'],
    },
    {
      name: 'Automations', href: '/dashboard/automations', icon: GitBranch,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'Reports', href: '/dashboard/reports', icon: BarChart2,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN','R3_SALES_MANAGER','R5_FINANCE_ADMIN'],
    },
    {
      name: 'Integrations', href: '/dashboard/integrations', icon: Plug,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'Org & Control', href: '/dashboard/org', icon: Building2, badge: 'New',
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'Role Builder', href: '/dashboard/roles', icon: Shield,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'Team', href: '/dashboard/team', icon: UserCheck,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'Settings', href: '/dashboard/settings', icon: Settings,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN','R2_ORG_ADMIN'],
    },
    {
      name: 'System Status', href: '/dashboard/status', icon: Activity,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN'],
    },
    {
      name: 'Audit Agent', href: '/dashboard/audit', icon: ShieldCheck,
      roles: ['R0_NAMA_OWNER','R1_SUPER_ADMIN'],
    },
    {
      name: 'Investor', href: '/dashboard/investor', icon: TrendingUp, badge: 'R0',
      roles: ['R0_NAMA_OWNER'],
    },
  ];

  // Filter nav based on current user's role.
  // Demo mode acts as R3_SALES_MANAGER — shows operational pages but NOT
  // admin-only items (Investor R0, Audit Agent R0/R1, System Status R0/R1).
  const userRole = auth.user?.role ?? null;
  const DEMO_ROLE = 'R3_SALES_MANAGER';
  const navigation = isDemoMode
    ? ALL_NAV.filter((item) => !item.roles || item.roles.includes(DEMO_ROLE))
    : ALL_NAV.filter((item) => !item.roles || (userRole ? item.roles.includes(userRole) : false));

  const Sidebar = ({ mobile = false }: { mobile?: boolean }) => (
    <aside className={`
      ${mobile
        ? `fixed inset-y-0 left-0 z-50 w-72 shadow-2xl transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
        : 'fixed inset-y-0 z-50'}
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

      {/* Nav — overflow-x visible so collapsed tooltips can peek outside the sidebar */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto overflow-x-visible">
        {navigation.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
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
              {/* Custom tooltip — only shown when sidebar is collapsed (icon-only mode) */}
              {!sidebarOpen && !mobile && (
                <span className="
                  pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3
                  px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap
                  bg-[#1E293B] text-white border border-white/10 shadow-xl
                  opacity-0 group-hover:opacity-100
                  translate-x-1 group-hover:translate-x-0
                  transition-all duration-150 z-[60]
                ">
                  {item.name}
                  {'badge' in item && item.badge && (
                    <span className="ml-1.5 text-[9px] font-black text-[#14B8A6]">● {item.badge}</span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Kinetic */}
      <div className="px-3 pb-2">
        <Link
          href="/kinetic"
          className="relative flex items-center gap-3 px-3 py-3 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-all group"
        >
          <Zap size={18} fill="currentColor" className="flex-shrink-0" />
          {(sidebarOpen || mobile) && <span className="text-xs font-black tracking-widest uppercase">Kinetic Mode</span>}
          {!sidebarOpen && !mobile && (
            <span className="
              pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3
              px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap
              bg-[#14B8A6] text-[#0F172A] shadow-xl
              opacity-0 group-hover:opacity-100
              translate-x-1 group-hover:translate-x-0
              transition-all duration-150 z-[60]
            ">
              Kinetic Mode
            </span>
          )}
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
    <CurrencyProvider>
    <div className="min-h-screen bg-slate-50 flex font-sans text-left">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-200 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className="lg:hidden">
        <Sidebar mobile />
      </div>

      {/* Main content — no left margin on mobile (sidebar is overlay); margin only on lg+ */}
      <main className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]'}`}>
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
            {/* Global Search — cmd+K */}
            <GlobalSearch />
          </div>
          <div className="flex items-center gap-2 md:gap-4 relative">
            {/* Currency selector */}
            <CurrencySelector />
            {/* Notification bell */}
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute top-10 right-0 z-50 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-black text-slate-800">Notifications</p>
                    <span className="text-[10px] font-bold text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-full">{unreadCount} new</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {SEED_NOTIFICATIONS.map(n => (
                      <div key={n.id} className={`px-4 py-3 ${n.unread ? 'bg-[#14B8A6]/5' : ''}`}>
                        <div className="flex items-start gap-2.5">
                          {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] mt-1.5 flex-shrink-0" />}
                          {!n.unread && <span className="w-1.5 h-1.5 flex-shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-100 text-center">
                    <button className="text-xs font-bold text-[#14B8A6] hover:underline">View all notifications</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* UAT Environment Banner */}
        {process.env.NEXT_PUBLIC_ENV === 'staging' && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
            <span className="text-amber-300 text-xs font-medium">
              UAT / Staging Environment — changes here do not affect <strong>getnama.app</strong> (LIVE)
            </span>
          </div>
        )}

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

        {/* Page content — wrapped in ErrorBoundary to prevent full-page crashes */}
        <div className="p-4 md:p-6 lg:p-8 flex-1">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* NAMA Copilot — floating AI assistant, available on all dashboard pages */}
      <NamaCopilot />

      {/* Feedback / NPS widget (P4-10) */}
      <FeedbackWidget />

      {/* Get Started onboarding checklist — floating bottom-right */}
      <ChecklistWidget />
    </div>
    </CurrencyProvider>
  );
}

