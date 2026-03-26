"use client";

import { Bell, MessageSquare, HelpCircle, Search, ChevronDown } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 flex items-center justify-between px-8 bg-surface-container-lowest/80 backdrop-blur-[20px] sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Search agencies, bookings, or leads..."
            className="w-full bg-surface-container-low border-none rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-secondary/30 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-on-surface-variant">
          <button className="hover:text-on-surface transition-colors p-1 rounded-full hover:bg-surface-container-low">
            <Bell className="w-5 h-5" />
          </button>
          <button className="hover:text-on-surface transition-colors p-1 rounded-full hover:bg-surface-container-low">
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="hover:text-on-surface transition-colors p-1 rounded-full hover:bg-surface-container-low">
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="h-8 w-px bg-outline-variant/20 mx-2" />

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold leading-none">Alex Thompson</p>
            <p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-tight">Super Admin</p>
          </div>
          <div className="w-9 h-9 bg-surface-container-high rounded-full overflow-hidden flex items-center justify-center border-2 border-primary-container/20 group-hover:border-primary-container/40 transition-all">
            <div className="w-full h-full bg-gradient-to-br from-primary to-primary-container" />
          </div>
          <ChevronDown className="w-4 h-4 text-on-surface-variant group-hover:text-on-surface transition-colors" />
        </div>
      </div>
    </header>
  );
}
