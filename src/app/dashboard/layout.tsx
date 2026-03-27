"use client";

import React, { useState } from 'react';
import Link from 'next/link';
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
  Menu,
  X,
  Bell,
  Search,
  Activity
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Leads', href: '/dashboard/leads', icon: Users },
    { name: 'Itineraries', href: '/dashboard/itineraries', icon: Map },
    { name: 'Bookings', href: '/dashboard/bookings', icon: Briefcase },
    { name: 'Comms', href: '/dashboard/comms', icon: MessageSquare },
    { name: 'Analytics', href: '/dashboard/analytics', icon: Activity },
    { name: 'Finance', href: '/dashboard/finance', icon: CreditCard },
    { name: 'Content', href: '/dashboard/content', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex font-body text-left text-[#F5F0E8]">
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#111111] text-[#F5F0E8] transition-all duration-300 flex flex-col fixed inset-y-0 z-50 border-r border-[#C9A84C]/15`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#C9A84C] rounded-lg flex items-center justify-center font-bold text-[#0A0A0A] shadow-[0_0_15px_rgba(201,168,76,0.3)]">N</div>
            {isSidebarOpen && <span className="text-xl font-black tracking-tighter font-headline text-[#C9A84C]">NAMA OS</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-left text-[#C9A84C]">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 text-left">
          {navigation.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all group relative overflow-hidden"
            >
              <item.icon size={20} className="text-[#B8B0A0] group-hover:text-[#C9A84C] transition-colors" />
              {isSidebarOpen && <span className="font-medium text-[#B8B0A0] group-hover:text-[#F5F0E8]">{item.name}</span>}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-[#C9A84C] rounded-r-full group-hover:h-6 transition-all duration-300"></div>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#C9A84C]/15 text-left">
          <Link 
            href="/kinetic" 
            className="flex items-center space-x-3 px-4 py-4 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] hover:bg-[#C9A84C]/20 transition-all shadow-[0_0_20px_rgba(201,168,76,0.1)]"
          >
            <Zap size={20} fill="currentColor" />
            {isSidebarOpen && <span className="font-bold tracking-widest uppercase text-xs">KINETIC MODE</span>}
          </Link>
        </div>

        <div className="p-6 flex items-center space-x-3 text-left bg-[#1A1A1A]/50">
          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] flex items-center justify-center font-bold border border-[#C9A84C]/20 text-[#C9A84C]">RI</div>
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-[#F5F0E8]">Radhika Iyer</p>
              <p className="text-[10px] text-[#B8B0A0] truncate uppercase tracking-widest font-mono">DMC Admin</p>
            </div>
          )}
        </div>
      </aside>

      <main className={`${isSidebarOpen ? 'ml-64' : 'ml-20'} flex-1 flex flex-col transition-all duration-300 text-left`}>
        <header className="h-20 bg-[#0A0A0A]/80 backdrop-blur-md border-b border-[#C9A84C]/15 px-8 flex items-center justify-between sticky top-0 z-40 text-left">
          <div className="flex items-center bg-[#111111] rounded-full px-4 py-2 w-96 text-left border border-[#C9A84C]/10 focus-within:border-[#C9A84C]/40 transition-all">
            <Search size={18} className="text-[#B8B0A0] mr-2" />
            <input 
              type="text" 
              placeholder="Search leads, itineraries, or bookings..." 
              className="bg-transparent border-none outline-none text-sm w-full text-left text-[#F5F0E8] font-body placeholder:text-[#4A453E]"
            />
          </div>
          <div className="flex items-center space-x-6 text-right">
            <button className="relative p-2 text-[#B8B0A0] hover:text-[#C9A84C] transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#C9A84C] rounded-full border-2 border-[#0A0A0A] animate-pulse"></span>
            </button>
            <button className="p-2 text-[#B8B0A0] hover:text-[#C9A84C] transition-colors">
              <Settings size={22} />
            </button>
          </div>
        </header>

        <div className="p-8 text-left bg-[#0A0A0A] min-h-[calc(100vh-80px)]">
          {children}
        </div>
      </main>
    </div>
  );
}
