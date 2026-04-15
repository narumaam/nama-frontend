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
  Search
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
    { name: 'Finance', href: '/dashboard/finance', icon: CreditCard },
    { name: 'Content', href: '/dashboard/content', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-left">
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-[#0F172A] text-white transition-all duration-300 flex flex-col fixed inset-y-0 z-50`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center font-bold text-primary">N</div>
            {isSidebarOpen && <span className="text-xl font-bold tracking-tight">NAMA OS</span>}
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden text-left">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 text-left">
          {navigation.map((item) => (
            <Link 
              key={item.name} 
              href={item.href}
              className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <item.icon size={20} className="text-slate-400 group-hover:text-[#14B8A6] transition-colors" />
              {isSidebarOpen && <span className="font-medium text-slate-200 group-hover:text-white">{item.name}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 text-left">
          <Link 
            href="/kinetic" 
            className="flex items-center space-x-3 px-4 py-4 rounded-2xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] hover:bg-[#14B8A6]/20 transition-all"
          >
            <Zap size={20} fill="currentColor" />
            {isSidebarOpen && <span className="font-bold tracking-wide">KINETIC MODE</span>}
          </Link>
        </div>

        <div className="p-6 flex items-center space-x-3 text-left">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">RI</div>
          {isSidebarOpen && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate text-white">Radhika Iyer</p>
              <p className="text-xs text-slate-400 truncate">DMC Admin</p>
            </div>
          )}
        </div>
      </aside>

      <main className={`${isSidebarOpen ? 'ml-64' : 'ml-20'} flex-1 flex flex-col transition-all duration-300 text-left`}>
        <header className="h-20 bg-white border-b border-slate-100 px-8 flex items-center justify-between sticky top-0 z-40 text-left">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-2 w-96 text-left">
            <Search size={18} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="Search leads, itineraries, or bookings..." 
              className="bg-transparent border-none outline-none text-sm w-full text-left"
            />
          </div>
          <div className="flex items-center space-x-6 text-right">
            <button className="relative p-2 text-slate-400 hover:text-primary transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 text-slate-400 hover:text-primary transition-colors">
              <Settings size={22} />
            </button>
          </div>
        </header>

        <div className="p-8 text-left">
          {children}
        </div>
      </main>
    </div>
  );
}
