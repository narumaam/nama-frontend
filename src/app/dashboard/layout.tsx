"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Map,
  Briefcase,
  MessageSquare,
  CreditCard,
  FileText,
  Settings,
  Zap,
  X,
  Bell,
  Search,
  Activity,
  Target,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showHeaderNotice, setShowHeaderNotice] = useState<null | "notifications" | "settings">(null);
  const [demoCompany, setDemoCompany] = useState("Nair Luxury Escapes");
  const [demoOperator, setDemoOperator] = useState("Demo Operator");
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDemoCompany(window.localStorage.getItem("nama-demo-company") || "Nair Luxury Escapes");
    setDemoOperator(window.localStorage.getItem("nama-demo-operator") || "Demo Operator");
  }, []);

  const navGroups = [
    {
      label: 'AI Control',
      items: [
        { name: 'Autopilot OS',  href: '/dashboard/autopilot', icon: Zap,             badge: '2', badgeColor: 'bg-red-500' },
        { name: 'Deals',         href: '/dashboard/deals',     icon: Target,           badge: null },
      ],
    },
    {
      label: 'Operations',
      items: [
        { name: 'Overview',      href: '/dashboard',           icon: LayoutDashboard,  badge: null },
        { name: 'Leads',         href: '/dashboard/leads',     icon: Users,            badge: null },
        { name: 'Itineraries',   href: '/dashboard/itineraries', icon: Map,            badge: null },
        { name: 'Bookings',      href: '/dashboard/bookings',  icon: Briefcase,        badge: null },
        { name: 'Comms',         href: '/dashboard/comms',     icon: MessageSquare,    badge: null },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Analytics',     href: '/dashboard/analytics', icon: Activity,         badge: null },
        { name: 'Finance',       href: '/dashboard/finance',   icon: CreditCard,       badge: null },
        { name: 'Content',       href: '/dashboard/content',   icon: FileText,         badge: null },
      ],
    },
  ];

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex font-body text-left text-[#F5F0E8]">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`${collapsed ? 'w-[68px]' : 'w-60'} bg-[#111111] transition-all duration-300 flex flex-col fixed inset-y-0 z-50 border-r border-[#C9A84C]/10 shrink-0`}>

        {/* Logo */}
        <div className={`h-[60px] flex items-center border-b border-[#C9A84C]/10 ${collapsed ? 'px-4 justify-center' : 'px-5 justify-between'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#C9A84C] rounded-lg flex items-center justify-center font-black text-[#0A0A0A] text-xs shadow-[0_0_12px_rgba(201,168,76,0.25)] shrink-0">N</div>
            {!collapsed && <span className="text-base font-black tracking-tighter font-headline text-[#C9A84C] uppercase">NAMA OS</span>}
          </div>
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} className="text-[#4A453E] hover:text-[#C9A84C] transition-colors">
              <ChevronLeft size={15} />
            </button>
          )}
        </div>

        {/* Collapse expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} className="mx-auto mt-3 text-[#4A453E] hover:text-[#C9A84C] transition-colors">
            <ChevronRight size={15} />
          </button>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto no-scrollbar">
          {navGroups.map(group => (
            <div key={group.label} className="mb-5">
              {!collapsed && (
                <div className="text-[7px] font-black uppercase tracking-[0.25em] text-[#4A453E] font-mono px-3 mb-2">{group.label}</div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${
                        active
                          ? 'bg-[#C9A84C]/10 text-[#C9A84C]'
                          : 'text-[#4A453E] hover:text-[#B8B0A0] hover:bg-white/3'
                      } ${collapsed ? 'justify-center' : ''}`}
                    >
                      {/* Active indicator */}
                      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#C9A84C] rounded-r-full" />}
                      <item.icon size={17} className={active ? 'text-[#C9A84C]' : 'text-[#4A453E] group-hover:text-[#B8B0A0] transition-colors'} />
                      {!collapsed && (
                        <span className={`text-[11px] font-semibold tracking-wide ${active ? 'text-[#C9A84C]' : 'text-[#B8B0A0] group-hover:text-[#F5F0E8]'}`}>
                          {item.name}
                        </span>
                      )}
                      {!collapsed && item.badge && (
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
        <div className={`p-3 border-t border-[#C9A84C]/10 ${collapsed ? 'flex justify-center' : ''}`}>
          <Link
            href="/kinetic"
            className={`flex items-center gap-3 px-3 py-3 rounded-2xl bg-[#C9A84C]/8 border border-[#C9A84C]/15 text-[#C9A84C] hover:bg-[#C9A84C]/15 transition-all shadow-[0_0_16px_rgba(201,168,76,0.06)] ${collapsed ? 'justify-center' : ''}`}
          >
            <Zap size={16} fill="currentColor" />
            {!collapsed && <span className="font-black tracking-widest uppercase text-[9px]">Kinetic Engine</span>}
          </Link>
        </div>

        {/* User profile */}
        <div className={`p-3 border-t border-[#C9A84C]/10 flex items-center gap-3 bg-[#0A0A0A]/30 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center font-bold border border-[#C9A84C]/20 text-[#C9A84C] text-xs shrink-0">RI</div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-[11px] font-bold truncate text-[#F5F0E8]">{demoOperator}</p>
              <p className="text-[8px] text-[#4A453E] truncate uppercase tracking-widest font-mono">{demoCompany}</p>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className={`${collapsed ? 'ml-[68px]' : 'ml-60'} flex-1 flex flex-col transition-all duration-300`}>

        {/* Top header */}
        <header className="h-[60px] bg-[#0A0A0A]/90 backdrop-blur-md border-b border-[#C9A84C]/10 px-7 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center bg-[#111111] rounded-full px-4 py-2 w-80 border border-[#C9A84C]/10 focus-within:border-[#C9A84C]/30 transition-all">
            <Search size={14} className="text-[#4A453E] mr-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search leads, deals, itineraries..."
              className="bg-transparent border-none outline-none text-[11px] w-full text-[#F5F0E8] font-body placeholder:text-[#4A453E]"
            />
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setShowHeaderNotice(showHeaderNotice === "notifications" ? null : "notifications")}
              className="relative p-1.5 text-[#4A453E] hover:text-[#C9A84C] transition-colors"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-[#0A0A0A] animate-pulse" />
            </button>
            <button
              type="button"
              onClick={() => setShowHeaderNotice(showHeaderNotice === "settings" ? null : "settings")}
              className="p-1.5 text-[#4A453E] hover:text-[#C9A84C] transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        <div className="p-8 bg-[#0A0A0A] min-h-[calc(100vh-60px)]">
          {showHeaderNotice && (
            <div className="mb-6 rounded-2xl border border-[#C9A84C]/15 bg-[#111111] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#C9A84C]">
                {showHeaderNotice === "notifications" ? "Notifications Snapshot" : "Demo Workspace Settings"}
              </p>
              <p className="mt-2 text-sm text-[#B8B0A0] leading-relaxed">
                {showHeaderNotice === "notifications"
                  ? `Three high-priority actions are queued for ${demoCompany}: follow up on Maldives, confirm Kerala payment, and send the Dubai executive quote.`
                  : `This workspace is currently branded for ${demoCompany}, operated by ${demoOperator}. Live provider credentials can be connected later without changing the operator flow.`}
              </p>
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
