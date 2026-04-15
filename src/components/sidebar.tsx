"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  HelpCircle,
  FileText,
  CreditCard,
  Building2,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Leads", href: "/leads" },
  { icon: Calendar, label: "Bookings", href: "/bookings" },
  { icon: Package, label: "Group Tours", href: "/group-tours" },
  { icon: FileText, label: "Visa/Passport", href: "/visa-passport" },
  { icon: CreditCard, label: "Finance", href: "/finance" },
  { icon: Building2, label: "Vendors", href: "/vendors" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-surface-container-lowest flex flex-col h-screen border-r border-outline-variant/10">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center text-white font-bold">N</div>
          <div>
            <h1 className="text-lg font-bold leading-none">NAMA Travel</h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Agency OS</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive 
                    ? "bg-surface-container-high text-primary font-medium" 
                    : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 space-y-4">
        <button className="w-full btn-primary text-sm flex items-center justify-center gap-2">
          <span className="text-xl">+</span>
          Create New Booking
        </button>

        <div className="space-y-1">
          <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface text-sm">
            <Settings className="w-4 h-4" />
            Settings
          </Link>
          <Link href="/support" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-on-surface text-sm">
            <HelpCircle className="w-4 h-4" />
            Support
          </Link>
        </div>
      </div>
    </aside>
  );
}
