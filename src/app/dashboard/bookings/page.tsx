"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  MessageCircle, 
  MoreVertical, 
  Info, 
  CheckCircle, 
  Clock, 
  Send, 
  Sparkles, 
  Receipt, 
  ChevronRight,
  Plane,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState('Flights');

  return (
    <div className="flex flex-col h-[calc(100vh-144px)] overflow-hidden animate-in fade-in duration-700">
      {/* Booking Header Section */}
      <section className="mb-8 shrink-0">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[#C9A84C] font-black text-[10px] uppercase tracking-[0.2em] font-mono">Booking ID: <span className="text-[#F5F0E8] ml-1">B-2024-001</span></span>
              <span className="px-3 py-1 bg-[#1D9E75]/10 text-[#1D9E75] text-[9px] font-black rounded-full uppercase tracking-widest border border-[#1D9E75]/20 animate-pulse">Confirmed</span>
            </div>
            <h2 className="text-4xl font-black text-[#F5F0E8] tracking-tighter uppercase font-headline">Anjali Sharma</h2>
          </div>
          <div className="flex gap-8 items-center bg-[#111111] px-8 py-5 rounded-3xl border border-[#C9A84C]/15 shadow-xl">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B8B0A0] mb-2 font-mono font-black">Total Value</p>
              <p className="text-2xl font-black text-[#C9A84C] font-headline">₹4,50,000</p>
            </div>
            <div className="h-10 w-px bg-[#C9A84C]/15"></div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B8B0A0] mb-2 font-mono font-black">Margin</p>
              <p className="text-2xl font-black text-[#1D9E75] font-headline">₹85,000</p>
            </div>
          </div>
        </div>

        <nav className="flex gap-1 border-b border-[#C9A84C]/10 overflow-x-auto no-scrollbar scroll-smooth">
          {['Overview', 'Flights', 'Hotels', 'Transport', 'Itinerary', 'Documents', 'Payments', 'Notes'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-[11px] uppercase tracking-[0.2em] font-black transition-all relative ${
                activeTab === tab 
                  ? 'text-[#C9A84C]' 
                  : 'text-[#B8B0A0] hover:text-[#F5F0E8]'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C9A84C] shadow-[0_0_10px_rgba(201,168,76,0.5)]"></div>
              )}
            </button>
          ))}
        </nav>
      </section>

      {/* Workspace Area */}
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-[#C9A84C]/15 bg-[#111111]/30 backdrop-blur-sm shadow-2xl">
        {/* Main Content Pane */}
        <section className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-[#F5F0E8] uppercase tracking-tight font-headline">Flight Segments</h3>
            <button className="flex items-center gap-2 bg-[#1D9E75] text-[#0A0A0A] px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[#1D9E75]/10 hover:scale-105 transition-all active:scale-95">
              <Plus size={16} strokeWidth={3} /> Add Flight
            </button>
          </div>

          <div className="bg-[#111111] rounded-3xl shadow-sm overflow-hidden border border-[#C9A84C]/15">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#1A1A1A]/50 border-b border-[#C9A84C]/10">
                  {['Airline', 'Route', 'Departure', 'Arrival', 'Class', 'PNR', ''].map((header, i) => (
                    <th key={i} className="px-6 py-5 text-[10px] uppercase tracking-widest text-[#B8B0A0] font-black font-mono">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9A84C]/5">
                <FlightRow 
                  airline="Emirates" 
                  flightNo="EK-511" 
                  route="DEL → DXB" 
                  depTime="10:45 AM" 
                  depDate="Oct 24, 2024" 
                  arrTime="01:15 PM" 
                  arrDate="Oct 24, 2024" 
                  cabin="Economy" 
                  pnr="EK8R2P" 
                  logo="https://lh3.googleusercontent.com/aida-public/AB6AXuB6UJHhHEJyPhI8ojEWQdxlDTERqOE941CUxcbnZZXyUkdZqEvpdiYFXC6YdCwWX2crSsL_HkdX3_LCXsbZq1tJcedXwrLD0OkZ2ksyXgj1ietByaU_mtdfhS2opp03dSf5X4I2zHlSTVFxwk2Ydd1zXb0CsJ6zK0K1TxcOiqoP6P9YZW75EA9vikvKtOvYdd6DWINU3TRl2goGX1TKX94a7Rfe3QdE8Tj3YuGXzMMjkQsYI-PtPWcAx-xuw_Qknqpp1TMJEH-kiDw2"
                />
                <FlightRow 
                  airline="Emirates" 
                  flightNo="EK-512" 
                  route="DXB → DEL" 
                  depTime="09:10 PM" 
                  depDate="Oct 30, 2024" 
                  arrTime="01:55 AM" 
                  arrDate="Oct 31, 2024" 
                  cabin="Economy" 
                  pnr="EK8R2P" 
                  logo="https://lh3.googleusercontent.com/aida-public/AB6AXuBWiYUCZblbaO-I9c4j9BMRJs5BuJv6hffQJPdFt9jRyYUh6XimU923Yu23qmCqafH_MmTfYqsxqdm1slp-bJGGh4kxqR-mRWEHIdJp1nb8iMXDxnSZEnLvt5AicJbugmxvxjDOov84wXmfEhMDAzudyXKFJWEpHG9rpB12TvyWZ-DUTVNRcM6YORbkhiopeKQGpNAHqqGMcMu6YJ3id92xXpnGZ8fhdacv8z9q3E8tT8tnNenu0R4_ZkW_3VdqnFA9hr82221rma4o"
                />
              </tbody>
            </table>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <div className="bg-[#C9A84C]/5 rounded-3xl p-8 border border-[#C9A84C]/15">
              <div className="flex items-center gap-2 mb-6 text-[#C9A84C]">
                <Info size={18} />
                <h4 className="font-black text-[11px] uppercase tracking-[0.2em] font-mono">Flight Requirements</h4>
              </div>
              <ul className="space-y-4">
                <RequirementItem label="Visa for UAE required (E-Visa initiated)" status="check" />
                <RequirementItem label="Return ticket confirmed" status="check" />
                <RequirementItem label="Meal preference: Vegetarian (Pending confirm)" status="pending" />
              </ul>
            </div>

            <div className="bg-[#111111] rounded-3xl p-8 border border-[#C9A84C]/15 flex flex-col justify-center">
              <h4 className="font-black text-[11px] uppercase tracking-[0.2em] text-[#B8B0A0] mb-6 font-mono">Price Analysis</h4>
              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-[#B8B0A0] font-mono uppercase tracking-widest opacity-60">Base Fare (2x)</span>
                  <span className="font-black text-[#F5F0E8] font-mono">₹1,10,000</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#B8B0A0] font-mono uppercase tracking-widest opacity-60">Taxes & Fees</span>
                  <span className="font-black text-[#F5F0E8] font-mono">₹24,550</span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-[#C9A84C]/10 mt-4">
                  <span className="font-black text-[#F5F0E8] font-headline uppercase tracking-tighter">Total Flight Cost</span>
                  <span className="font-black text-[#C9A84C] font-headline">₹1,34,550</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Operations Sidebar */}
        <aside className="w-80 bg-[#111111] border-l border-[#C9A84C]/15 flex flex-col shrink-0 overflow-y-auto no-scrollbar">
          <div className="p-8 border-b border-[#C9A84C]/10">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] font-black font-mono mb-6">Quick Notes</h3>
            <div className="space-y-6">
              <div className="bg-[#1A1A1A] p-6 rounded-2xl relative group border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 transition-all shadow-sm">
                <p className="text-sm text-[#F5F0E8] leading-relaxed font-medium">Client prefers window seats on all legs. Check for bulkhead availability for extra legroom.</p>
                <p className="text-[10px] text-[#B8B0A0] font-mono mt-4 opacity-40 uppercase tracking-widest font-bold">Updated 2h ago</p>
                <button className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-[#C9A84C]"><Plus size={14} /></button>
              </div>
              <div className="bg-[#1D9E75]/5 p-6 rounded-2xl border border-[#1D9E75]/20">
                <p className="text-sm text-[#F5F0E8] leading-relaxed italic opacity-80">&ldquo;Please include airport transfers in the final quote.&rdquo;</p>
                <p className="text-[9px] text-[#1D9E75] font-black font-mono mt-4 uppercase tracking-[0.2em]">Live WhatsApp Update</p>
              </div>
              <button className="w-full py-5 border-2 border-dashed border-[#C9A84C]/15 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-[#B8B0A0] hover:bg-[#C9A84C]/5 hover:border-[#C9A84C]/30 transition-all flex items-center justify-center gap-2 font-mono">
                <Plus size={16} /> New Workspace Note
              </button>
            </div>
          </div>

          <div className="p-8 mt-auto bg-[#141414]/50">
            <h3 className="text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] font-black font-mono mb-6">Deployment</h3>
            <div className="space-y-3">
              <ActionLink icon={Send} label="Send Quote" />
              <ActionLink icon={Sparkles} label="Generate Itinerary" />
              <ActionLink icon={Receipt} label="Print Invoice" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function FlightRow({
  airline,
  flightNo,
  route,
  depTime,
  depDate,
  arrTime,
  arrDate,
  cabin,
  pnr,
  logo,
}: {
  airline: string;
  flightNo: string;
  route: string;
  depTime: string;
  depDate: string;
  arrTime: string;
  arrDate: string;
  cabin: string;
  pnr: string;
  logo: string;
}) {
  return (
    <tr className="hover:bg-[#1A1A1A]/50 transition-all group cursor-pointer">
      <td className="px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center p-2 border border-[#C9A84C]/10 group-hover:scale-110 transition-transform">
            <img alt={airline} className="w-full h-full object-contain grayscale group-hover:grayscale-0 transition-all" src={logo} />
          </div>
          <div>
            <p className="font-black text-sm text-[#F5F0E8] tracking-tight uppercase font-headline">{airline}</p>
            <p className="text-[10px] text-[#B8B0A0] font-mono font-bold tracking-widest">{flightNo}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-6 font-black text-xs text-[#F5F0E8] tracking-[0.2em] font-mono">{route}</td>
      <td className="px-6 py-6">
        <p className="text-xs font-black text-[#F5F0E8] font-mono">{depTime}</p>
        <p className="text-[10px] text-[#B8B0A0] font-mono uppercase tracking-tighter mt-1 opacity-50">{depDate}</p>
      </td>
      <td className="px-6 py-6">
        <p className="text-xs font-black text-[#F5F0E8] font-mono">{arrTime}</p>
        <p className="text-[10px] text-[#B8B0A0] font-mono uppercase tracking-tighter mt-1 opacity-50">{arrDate}</p>
      </td>
      <td className="px-6 py-6">
        <span className="px-3 py-1 bg-[#111111] text-[9px] font-black rounded-full text-[#C9A84C] uppercase tracking-widest border border-[#C9A84C]/15 font-mono">{cabin}</span>
      </td>
      <td className="px-6 py-6 font-mono text-xs font-black text-[#C9A84C] tracking-widest uppercase">{pnr}</td>
      <td className="px-6 py-6 text-right">
        <button className="p-2 hover:bg-[#1A1A1A] rounded-xl transition-all text-[#B8B0A0] hover:text-[#C9A84C]"><MoreVertical size={18} /></button>
      </td>
    </tr>
  );
}

function RequirementItem({
  label,
  status,
}: {
  label: string;
  status: 'check' | 'pending';
}) {
  return (
    <li className="flex items-start gap-3 text-xs">
      {status === 'check' ? (
        <CheckCircle size={16} className="text-[#1D9E75] mt-0.5" />
      ) : (
        <Clock size={16} className="text-[#C9A84C] mt-0.5 opacity-50 animate-pulse" />
      )}
      <span className="text-[#B8B0A0] font-medium font-body leading-tight">{label}</span>
    </li>
  );
}

function ActionLink({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <button className="w-full flex items-center justify-between bg-[#1A1A1A] px-5 py-4 rounded-2xl border border-[#C9A84C]/10 hover:border-[#C9A84C] transition-all group shadow-sm active:scale-95">
      <div className="flex items-center gap-4">
        <Icon size={18} className="text-[#B8B0A0] group-hover:text-[#C9A84C] transition-colors" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F0E8] font-mono">{label}</span>
      </div>
      <ChevronRight size={16} className="text-[#B8B0A0] opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </button>
  );
}
