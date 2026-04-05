"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { appSessionFromContract, clearServerSession, fetchCurrentSession } from '@/lib/session-api';
import { canAccessPath, clearAppSession, getDefaultRouteForRole, getRoleLabel, readAppSession, type AppSession, writeAppSession } from '@/lib/auth-session';
import { DEMO_CASE_ROUTES, getPrimaryDemoCase } from '@/lib/demo-cases';
import { DEFAULT_SHELL_BRAND } from '@/lib/demo-config';
import { getDemoBrandTheme, getDemoDomainMode, getDemoWorkspaceDomain } from '@/lib/demo-profile';
import { useDemoProfile } from '@/lib/use-demo-profile';
import {
  LayoutDashboard,
  Users,
  Map,
  Briefcase,
  MessageSquare,
  CreditCard,
  FileText,
  Settings,
  Shield,
  Zap,
  X,
  Bell,
  Search,
  Activity,
  Target,
  Cpu,
  Globe2,
  Landmark,
  ChevronLeft,
  ChevronRight,
  Menu
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const primaryCase = getPrimaryDemoCase();
  const profile = useDemoProfile();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showHeaderNotice, setShowHeaderNotice] = useState<null | "notifications" | "settings">(null);
  const [artifactCaseSlug, setArtifactCaseSlug] = useState(primaryCase.slug);
  const [superAdminAccess, setSuperAdminAccess] = useState(false);
  const [accessReady, setAccessReady] = useState(false);
  const [session, setSession] = useState<AppSession | null>(null);
  const pathname = usePathname();
  const demoCompany = profile.company;
  const demoOperator = profile.operator;
  const demoRoles = profile.roles;
  const demoMarket = profile.market;
  const enabledCurrencies = profile.enabledCurrencies;
  const brandTheme = getDemoBrandTheme(profile);
  const workspaceDomain = getDemoWorkspaceDomain(brandTheme);
  const domainMode = getDemoDomainMode(brandTheme);
  const accentHex = brandTheme.enabled ? brandTheme.accentHex : "#1e3a8a";
  const accentSoft = `${accentHex}14`;
  const accentBorder = `${accentHex}33`;
  const shellBrand = brandTheme.enabled
    ? {
        shortName: brandTheme.workspaceName,
        badgeGlyph: brandTheme.badgeGlyph,
      }
    : DEFAULT_SHELL_BRAND;
  const operatorInitials = demoOperator
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("") || shellBrand.badgeGlyph;

  useEffect(() => {
    let cancelled = false;

    async function syncAccess() {
      try {
        const current = await fetchCurrentSession();
        const nextSession = current ? writeAppSession(appSessionFromContract(current), { dispatch: false }) : readAppSession();
        if (cancelled) return;

        if (!nextSession) {
          clearAppSession();
          setSession(null);
          setAccessReady(false);
          router.replace(pathname.startsWith('/dashboard/admin') ? '/super-admin/login' : '/register');
          return;
        }

        if (!canAccessPath(nextSession, pathname)) {
          setSession(nextSession);
          setSuperAdminAccess(nextSession.role === 'super-admin');
          setAccessReady(false);
          router.replace(getDefaultRouteForRole(nextSession.role));
          return;
        }

        setSession(nextSession);
        setSuperAdminAccess(nextSession.role === 'super-admin');
        setAccessReady(true);
      } catch {
        const nextSession = readAppSession();
        if (cancelled) return;

        if (!nextSession) {
          setSession(null);
          setAccessReady(false);
          router.replace(pathname.startsWith('/dashboard/admin') ? '/super-admin/login' : '/register');
          return;
        }

        setSession(nextSession);
        setSuperAdminAccess(nextSession.role === 'super-admin');
        setAccessReady(canAccessPath(nextSession, pathname));
      }
    }

    void syncAccess();
    window.addEventListener('storage', syncAccess);
    window.addEventListener('nama-app-session-updated', syncAccess as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncAccess);
      window.removeEventListener('nama-app-session-updated', syncAccess as EventListener);
    };
  }, [pathname, router]);

  const navGroups = [
    {
      label: 'Operations',
      items: [
        { name: 'Overview',      href: '/dashboard',           icon: LayoutDashboard,  badge: null },
        { name: 'Leads',         href: '/dashboard/leads',     icon: Users,            badge: null },
        { name: 'Deals',         href: '/dashboard/deals',     icon: Target,           badge: null },
        { name: 'DMC Hub',       href: '/dashboard/dmc',       icon: FileText,         badge: null },
        { name: 'Team & Access', href: '/dashboard/team',      icon: Settings,         badge: null },
        { name: 'Itineraries',   href: '/dashboard/itineraries', icon: Map,            badge: null },
        { name: 'Bookings',      href: '/dashboard/bookings',  icon: Briefcase,        badge: null },
        { name: 'Comms',         href: '/dashboard/comms',     icon: MessageSquare,    badge: null },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        ...(superAdminAccess ? [{ name: 'Super Admin', href: '/dashboard/admin', icon: Shield, badge: null }] : []),
        { name: 'Analytics',     href: '/dashboard/analytics', icon: Activity,         badge: null },
        { name: 'Finance',       href: '/dashboard/finance',   icon: CreditCard,       badge: null },
        { name: 'Content',       href: '/dashboard/content',   icon: FileText,         badge: null },
      ],
    },
    {
      label: 'Orchestration',
      items: [
        { name: 'Ekla',          href: '/dashboard/ekla',      icon: Cpu,             badge: 'New', badgeColor: 'bg-[#1e3a8a]' },
        { name: 'Autopilot OS',   href: '/dashboard/autopilot', icon: Zap,             badge: '2', badgeColor: 'bg-red-500' },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  function handleNavigate() {
    setMobileNavOpen(false);
  }

  async function handleExitSuperAdmin() {
    try {
      await clearServerSession();
    } finally {
      clearAppSession();
      setSession(null);
      setSuperAdminAccess(false);
      router.push('/super-admin/login');
    }
  }

  const visibleNavGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => (session ? canAccessPath(session, item.href) : false)),
    }))
    .filter((group) => group.items.length > 0);

  if (!accessReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef4fb] px-6 text-sm text-[#5b6b8a]">
        Checking workspace access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(30,58,138,0.08),_transparent_28%),linear-gradient(180deg,_#f7f9fb_0%,_#eef4fb_100%)] flex font-body text-left text-[#191c1e]">

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`${collapsed ? 'md:w-[68px]' : 'md:w-64'} ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 w-[82vw] max-w-[320px] bg-white/90 backdrop-blur-xl transition-all duration-300 flex flex-col fixed inset-y-0 left-0 z-50 border-r border-slate-200 shadow-[0_24px_70px_rgba(15,23,42,0.08)] shrink-0`}>

        {/* Logo */}
        <div className={`h-[64px] flex items-center border-b border-slate-200/80 ${collapsed ? 'md:px-4 md:justify-center' : 'px-5 justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-[0_12px_28px_rgba(30,58,138,0.22)] shrink-0"
              style={{ backgroundColor: accentHex }}
            >
              {shellBrand.badgeGlyph}
            </div>
            {(!collapsed || mobileNavOpen) && (
              <span className="text-base font-black tracking-tighter font-headline uppercase text-[#10234d]">
                {shellBrand.shortName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="hidden md:block text-slate-400 hover:text-[#1e3a8a] transition-colors">
              <ChevronLeft size={15} />
            </button>
          )}
            <button onClick={() => setMobileNavOpen(false)} className="text-slate-400 hover:text-[#1e3a8a] transition-colors md:hidden">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Collapse expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto mt-3 text-slate-400 hover:text-[#1e3a8a] transition-colors hidden md:block">
            <ChevronRight size={15} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {visibleNavGroups.map(group => (
            <div key={group.label} className="mb-5">
              {(!collapsed || mobileNavOpen) && (
                <div className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400 font-mono px-3 mb-2">{group.label}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={handleNavigate}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all relative group ${
                        active
                          ? 'bg-[#1e3a8a]/10 text-[#1e3a8a] shadow-sm ring-1 ring-[#1e3a8a]/10'
                          : 'text-slate-500 hover:text-[#1e3a8a] hover:bg-slate-50'
                      } ${collapsed && !mobileNavOpen ? 'justify-center' : ''}`}
                    >
                      {/* Active indicator */}
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#1e3a8a] rounded-r-full" />}
                      <item.icon size={17} className={active ? 'text-[#1e3a8a]' : 'text-slate-400 group-hover:text-[#1e3a8a] transition-colors'} />
                      {(!collapsed || mobileNavOpen) && (
                        <span className={`text-[12px] font-semibold tracking-wide ${active ? 'text-[#1e3a8a]' : 'text-slate-500 group-hover:text-slate-800'}`}>
                          {item.name}
                        </span>
                      )}
                      {(!collapsed || mobileNavOpen) && item.badge && (
                        <span className={`ml-auto text-[7px] font-black px-1.5 py-0.5 rounded-full text-white ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {collapsed && item.badge && (
                        <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${item.badgeColor}`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Kinetic mode button */}
        <div className={`p-3 border-t border-slate-200/80 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/kinetic"
            onClick={handleNavigate}
            className={`flex items-center gap-3 px-3 py-3 rounded-2xl transition-all shadow-[0_0_16px_rgba(201,168,76,0.06)] ${collapsed && !mobileNavOpen ? 'justify-center' : ''}`}
            style={{ backgroundColor: accentSoft, borderColor: accentBorder, borderWidth: 1, color: accentHex }}
          >
            <Zap size={16} fill="currentColor" />
            {(!collapsed || mobileNavOpen) && <span className="font-black tracking-widest uppercase text-[9px]">Kinetic Engine</span>}
          </Link>
        </div>

        {/* User profile */}
        <div className={`p-3 border-t border-slate-200/80 flex items-center gap-3 bg-slate-50/80 ${collapsed && !mobileNavOpen ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#1e3a8a] flex items-center justify-center font-bold border border-[#1e3a8a]/20 text-white text-xs shrink-0">{operatorInitials}</div>
          {(!collapsed || mobileNavOpen) && (
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold truncate text-slate-900">{demoOperator}</p>
              <p className="text-[8px] text-slate-400 truncate uppercase tracking-widest font-mono">{demoCompany}</p>
              <p className="text-[8px] text-[#1e3a8a] truncate uppercase tracking-widest font-mono">
                {demoRoles.join(" + ")} · Base {demoMarket.currency} · {enabledCurrencies.join(", ")}
              </p>
              {session && (
                <p className="text-[8px] truncate uppercase tracking-widest font-mono text-slate-500">
                  {getRoleLabel(session.role)} · {session.scope}
                </p>
              )}
              {brandTheme.enabled && (
                <p className="text-[8px] truncate uppercase tracking-widest font-mono" style={{ color: accentHex }}>
                  {domainMode === "nama-subdomain" ? "NAMA Subdomain" : "Custom Domain"} · {workspaceDomain}
                </p>
              )}
              {superAdminAccess && (
                <button
                  type="button"
                  onClick={handleExitSuperAdmin}
                  className="mt-2 text-left text-[9px] font-black uppercase tracking-[0.2em] text-[#1e3a8a]"
                >
                  Exit Super Admin
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className={`${collapsed ? 'md:ml-[68px]' : 'md:ml-64'} ml-0 flex-1 flex flex-col transition-all duration-300`}>

        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-7 py-3 md:h-[64px] flex flex-col md:flex-row md:items-center md:justify-between gap-3 sticky top-0 z-40 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden rounded-xl border border-slate-200 bg-white p-2 text-[#1e3a8a]"
              aria-label="Open navigation"
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center bg-slate-100/80 rounded-full px-4 py-2 flex-1 md:w-80 border border-slate-200 focus-within:border-[#1e3a8a]/30 transition-all min-w-0 shadow-sm">
              <Search size={14} className="text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search leads, deals, itineraries..."
                className="bg-transparent border-none outline-none text-[11px] w-full min-w-0 text-slate-900 font-body placeholder:text-slate-400"
              />
            </div>
            <div className="hidden xl:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Artifacts</span>
              <select
                value={artifactCaseSlug}
                onChange={(event) => setArtifactCaseSlug(event.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none"
              >
                {DEMO_CASE_ROUTES.map((item) => (
                  <option key={item.slug} value={item.slug} className="bg-white text-slate-900">
                    {item.destination}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/invoices/${artifactCaseSlug}`)}
                className="rounded-xl border border-blue-200 bg-[#1e3a8a] px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white"
              >
                Invoice
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/traveler-pdf/${artifactCaseSlug}`)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500"
              >
                PDF
              </button>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setShowHeaderNotice(showHeaderNotice === "notifications" ? null : "notifications")}
              className="relative p-1.5 text-slate-400 hover:text-[#1e3a8a] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-[#0A0A0A] animate-pulse" />
            </button>
            <button
              type="button"
              onClick={() => setShowHeaderNotice(showHeaderNotice === "settings" ? null : "settings")}
              className="p-1.5 text-slate-400 hover:text-[#1e3a8a] transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 bg-[radial-gradient(circle_at_top_right,_rgba(30,58,138,0.05),_transparent_24%),linear-gradient(180deg,_#f7f9fb_0%,_#eef4fb_100%)] min-h-[calc(100vh-64px)]">
          {showHeaderNotice && (
            <div className="mb-6 rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#1e3a8a]">
                {showHeaderNotice === "notifications" ? "Notifications Snapshot" : "Demo Workspace Settings"}
              </p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                {showHeaderNotice === "notifications"
                  ? `Three high-priority actions are queued for ${demoCompany}: follow up on ${primaryCase.destination}, confirm ${DEMO_CASE_ROUTES[1].destination} payment, and send the ${DEMO_CASE_ROUTES[2].destination} executive quote.`
                  : `This workspace is branded for ${demoCompany}, operated by ${demoOperator}, with ${demoRoles.join(" + ")} enabled. Base market is ${demoMarket.country} with ${demoMarket.currency} as the control currency, ${enabledCurrencies.join(", ")} available across sales flows, and the tenant can run on either a NAMA-hosted subdomain or its own domain.`}
              </p>
              {showHeaderNotice === "settings" && (
                <div className="mt-4 grid gap-3 md:grid-cols-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-[#1e3a8a]">
                      <Globe2 size={13} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Operating Market</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{demoMarket.country}</div>
                    <div className="mt-1 text-xs text-slate-500">{demoMarket.language}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-[#1e3a8a]">
                      <Landmark size={13} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Currency Model</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{demoMarket.currency} base</div>
                    <div className="mt-1 text-xs text-slate-500">{enabledCurrencies.join(", ")} enabled</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-[#1e3a8a]">
                      <Cpu size={13} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Business Profile</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{demoRoles.join(" + ")}</div>
                    <div className="mt-1 text-xs text-slate-500">{demoMarket.gateway} routed by default</div>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 px-4 py-3" style={{ borderColor: accentBorder }}>
                    <div className="flex items-center gap-2" style={{ color: accentHex }}>
                      <Globe2 size={13} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Workspace Domain</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{workspaceDomain}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {domainMode === "nama-subdomain" ? "Hosted under NAMA" : "Bring your own domain"}
                    </div>
                  </div>
                  <div className="rounded-2xl border bg-slate-50 px-4 py-3" style={{ borderColor: accentBorder }}>
                    <div className="flex items-center gap-2" style={{ color: accentHex }}>
                      <Bell size={13} />
                      <span className="text-[9px] font-black uppercase tracking-widest">Support Route</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-slate-900">{brandTheme.supportEmail}</div>
                    <div className="mt-1 text-xs text-slate-500">Visible tenant-facing support mailbox</div>
                  </div>
                </div>
              )}
            </div>
          )}
          {children}
        </div>
      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
