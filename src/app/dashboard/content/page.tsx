"use client";

import React from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  BookOpen, 
  Video, 
  Upload, 
  Plus, 
  TrendingUp, 
  CheckCircle,
  MoreVertical,
  Star,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  FileJson,
  AlertTriangle
} from 'lucide-react';

export default function ContentLibraryPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-144px)] overflow-hidden animate-in fade-in duration-700">
      {/* Page Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 shrink-0">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2 font-black">
            <span>Operations Hub</span>
            <ChevronRight size={10} />
            <span className="opacity-50 font-bold">Content Repository</span>
          </nav>
          <h1 className="font-headline text-5xl font-black tracking-tighter text-[#F5F0E8] uppercase leading-none">Asset Repository</h1>
          <p className="font-mono text-xs text-[#B8B0A0] mt-4 flex items-center gap-3 font-bold uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] shadow-[0_0_10px_rgba(29,158,117,0.5)] animate-pulse"></span>
            ACTIVE STORAGE NODES: 1,248 ASSETS SYNCED
          </p>
        </div>
        <div className="flex gap-4">
          <button className="bg-[#111111] border border-[#C9A84C]/20 text-[#C9A84C] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all flex items-center gap-2 font-mono shadow-xl shadow-black/20">
            <Upload size={16} />
            Bulk Upload
          </button>
          <button className="bg-[#C9A84C] text-[#0A0A0A] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_30px_rgba(201,168,76,0.3)] font-mono">
            <Plus size={16} strokeWidth={3} />
            New Template
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 shrink-0">
        <StatCard label="Total Assets" value="2.4 TB" trend="+12.4% THIS CYCLE" color="border-[#C9A84C]" trendColor="text-[#1D9E75]" />
        <StatCard label="Storage Capacity" value="98.2%" trend="SYSTEM OPTIMIZED" color="border-[#1D9E75]" trendColor="text-[#1D9E75]" isCheck={true} />
        <StatCard label="Itinerary Templates" value="412" trend="86% USAGE RATE" color="border-[#C9A84C]/30" trendColor="text-[#B8B0A0]" isIcon={<FileText size={14} />} />
        <StatCard label="Media Assets" value="8,421" trend="14 REGIONS LIVE" color="border-[#C9A84C]/30" trendColor="text-[#B8B0A0]" isIcon={<ImageIcon size={14} />} />
      </div>

      {/* Main Directory Pane */}
      <div className="flex-1 bg-[#111111]/40 rounded-3xl overflow-hidden shadow-2xl border border-[#C9A84C]/15 backdrop-blur-md flex flex-col">
        {/* Table Controls */}
        <div className="px-8 py-6 border-b border-[#C9A84C]/10 flex justify-between items-center bg-black/20">
          <div className="flex gap-4">
            <select className="bg-[#111111] border border-[#C9A84C]/20 rounded-xl text-[10px] font-black uppercase px-4 py-2.5 outline-none focus:border-[#C9A84C] text-[#F5F0E8] font-mono tracking-widest transition-all">
              <option>Filter: ALL TYPES</option>
              <option>TEMPLATES</option>
              <option>PHOTOS</option>
              <option>BROCHURES</option>
              <option>VIDEO</option>
            </select>
            <select className="bg-[#111111] border border-[#C9A84C]/20 rounded-xl text-[10px] font-black uppercase px-4 py-2.5 outline-none focus:border-[#C9A84C] text-[#F5F0E8] font-mono tracking-widest transition-all">
              <option>Region: GLOBAL</option>
              <option>EUROPE</option>
              <option>ASIA</option>
              <option>AFRICA</option>
              <option>AMERICAS</option>
            </select>
          </div>
          <div className="text-[10px] font-black font-mono text-[#B8B0A0] uppercase tracking-[0.2em] opacity-60">
            SHOWING 1-12 OF 1,248 MEDIA ASSETS
          </div>
        </div>

        {/* Directory Table */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/10 border-b border-[#C9A84C]/10 sticky top-0 z-10">
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">Asset Identity</th>
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">Type</th>
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">Regional Hub</th>
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C] text-center">Version</th>
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">Rating</th>
                <th className="px-8 py-5 font-black font-mono text-[10px] uppercase tracking-[0.3em] text-[#C9A84C]">State</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A84C]/5">
              <AssetRow 
                name="Classic Rajasthan Heritage" 
                id="TMP-7742-RAJ" 
                type="Itinerary" 
                region="Rajasthan, India" 
                version="v4.2" 
                rating="4.8" 
                status="Optimized" 
                statusColor="text-[#1D9E75]" 
                icon={<FileJson size={18} className="text-[#C9A84C]" />} 
                typeBg="bg-[#C9A84C]/10" 
                typeText="text-[#C9A84C]"
                typeBorder="border-[#C9A84C]/20"
              />
              <AssetRow 
                name="Santorini Sunset Collection" 
                id="IMG-1029-SAN" 
                type="Photos" 
                region="Greece, EU" 
                version="4K RAW" 
                rating="4.5" 
                status="Live" 
                statusColor="text-[#1D9E75]" 
                icon={<ImageIcon size={18} className="text-[#C9A84C]" />} 
                typeBg="bg-[#C9A84C]/10" 
                typeText="text-[#C9A84C]"
                typeBorder="border-[#C9A84C]/20"
              />
              <AssetRow 
                name="Luxury Wellness Retreats" 
                id="DOC-4491-WEL" 
                type="Brochure" 
                region="Bali, Indonesia" 
                version="v1.0" 
                rating="4.9" 
                status="In Review" 
                statusColor="text-[#ff8c00]" 
                icon={<BookOpen size={18} className="text-[#F5F0E8]" />} 
                typeBg="bg-[#F5F0E8]/10" 
                typeText="text-[#F5F0E8]"
                typeBorder="border-[#F5F0E8]/20"
                pulse={true}
              />
              <AssetRow 
                name="Adventure Sports Pack" 
                id="VID-0032-ADV" 
                type="Video" 
                region="Alps, Switzerland" 
                version="v2.1" 
                rating="4.7" 
                status="Optimized" 
                statusColor="text-[#1D9E75]" 
                icon={<Video size={18} className="text-[#1D9E75]" />} 
                typeBg="bg-[#1D9E75]/10" 
                typeText="text-[#1D9E75]"
                typeBorder="border-[#1D9E75]/20"
              />
              <AssetRow 
                name="Broken Asset Links" 
                id="ERR-2210-SYS" 
                type="System" 
                region="Global Hub" 
                version="ERROR" 
                rating="3.2" 
                status="Corrupted" 
                statusColor="text-red-500" 
                icon={<AlertTriangle size={18} className="text-red-500" />} 
                typeBg="bg-red-500/10" 
                typeText="text-red-500"
                typeBorder="border-red-500/20"
              />
            </tbody>
          </table>
        </div>

        {/* Node Pagination */}
        <div className="px-8 py-6 flex justify-between items-center bg-black/30 border-t border-[#C9A84C]/10 shrink-0">
          <button className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-[#B8B0A0] hover:text-[#C9A84C] flex items-center gap-3 transition-colors active:scale-95">
            <ArrowLeft size={16} strokeWidth={3} />
            Previous Node
          </button>
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-xl bg-[#C9A84C] text-[#0A0A0A] font-black font-mono text-xs flex items-center justify-center shadow-lg shadow-[#C9A84C]/20">01</button>
            <button className="w-10 h-10 rounded-xl border border-[#C9A84C]/20 text-[#B8B0A0] font-black font-mono text-xs flex items-center justify-center hover:bg-[#1A1A1A] transition-all hover:text-[#C9A84C]">02</button>
            <button className="w-10 h-10 rounded-xl border border-[#C9A84C]/20 text-[#B8B0A0] font-black font-mono text-xs flex items-center justify-center hover:bg-[#1A1A1A] transition-all hover:text-[#C9A84C]">03</button>
            <span className="text-[#C9A84C]/30 self-end px-3 font-mono font-black mb-2">...</span>
            <button className="w-10 h-10 rounded-xl border border-[#C9A84C]/20 text-[#B8B0A0] font-black font-mono text-xs flex items-center justify-center hover:bg-[#1A1A1A] transition-all hover:text-[#C9A84C]">42</button>
          </div>
          <button className="text-[10px] font-black font-mono uppercase tracking-[0.2em] text-[#C9A84C] hover:opacity-80 flex items-center gap-3 transition-colors active:scale-95">
            Next Node
            <ArrowRight size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  trend,
  color,
  trendColor,
  isCheck = false,
  isIcon = null,
}: {
  label: string;
  value: string;
  trend: string;
  color: string;
  trendColor: string;
  isCheck?: boolean;
  isIcon?: React.ReactNode | null;
}) {
  return (
    <div className={`bg-[#111111] p-8 rounded-3xl border-l-4 ${color} shadow-xl group border border-y-[#C9A84C]/10 border-r-[#C9A84C]/10 hover:scale-[1.02] transition-transform`}>
      <p className="text-[9px] font-black font-mono uppercase tracking-[0.3em] text-[#B8B0A0] mb-3 opacity-60">{label}</p>
      <p className="text-3xl font-black font-headline text-[#F5F0E8] uppercase tracking-tighter">{value}</p>
      <div className={`flex items-center gap-2 mt-4 ${trendColor} text-[10px] font-black uppercase font-mono tracking-widest`}>
        {isCheck ? <CheckCircle size={12} strokeWidth={3} /> : (isIcon || <TrendingUp size={12} strokeWidth={3} />)}
        {trend}
      </div>
    </div>
  );
}

function AssetRow({
  name,
  id,
  type,
  region,
  version,
  rating,
  status,
  statusColor,
  icon,
  typeBg,
  typeText,
  typeBorder,
  pulse = false,
}: {
  name: string;
  id: string;
  type: string;
  region: string;
  version: string;
  rating: string;
  status: string;
  statusColor: string;
  icon: React.ReactNode;
  typeBg: string;
  typeText: string;
  typeBorder: string;
  pulse?: boolean;
}) {
  return (
    <tr className="hover:bg-[#C9A84C]/5 transition-all group cursor-pointer">
      <td className="px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#1A1A1A] flex items-center justify-center border border-[#C9A84C]/10 group-hover:scale-110 group-hover:border-[#C9A84C]/30 transition-all shadow-sm">
            {icon}
          </div>
          <div>
            <p className="font-black text-sm tracking-tight text-[#F5F0E8] font-headline uppercase">{name}</p>
            <p className="font-mono text-[10px] text-[#B8B0A0] uppercase font-bold tracking-widest opacity-40">{id}</p>
          </div>
        </div>
      </td>
      <td className="px-8 py-6">
        <span className={`px-3 py-1.5 rounded-lg ${typeBg} ${typeText} text-[9px] font-black font-mono uppercase border ${typeBorder} tracking-widest`}>
          {type}
        </span>
      </td>
      <td className="px-8 py-6">
        <p className="text-xs font-bold text-[#F5F0E8] uppercase tracking-tight">{region}</p>
        <p className="text-[9px] text-[#B8B0A0] uppercase font-black font-mono tracking-[0.2em] opacity-40 mt-1">Global Storage Node</p>
      </td>
      <td className="px-8 py-6 text-center">
        <span className="font-mono text-sm font-black text-[#F5F0E8] tracking-widest">{version}</span>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-1.5 text-[#C9A84C]">
          <Star size={14} fill="currentColor" />
          <span className="font-mono text-xs font-black">{rating}</span>
        </div>
      </td>
      <td className="px-8 py-6">
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${statusColor.replace('text-', 'bg-')} ${pulse ? 'animate-pulse shadow-[0_0_12px_rgba(201,168,76,0.5)]' : 'shadow-[0_0_8px_rgba(29,158,117,0.3)]'}`}></span>
          <span className={`text-[10px] font-black font-mono uppercase ${statusColor} tracking-widest`}>{status}</span>
        </div>
      </td>
      <td className="px-8 py-6 text-right">
        <button className="text-[#B8B0A0] hover:text-[#C9A84C] transition-all p-2 rounded-xl hover:bg-[#1A1A1A]">
          <MoreVertical size={18} />
        </button>
      </td>
    </tr>
  );
}
