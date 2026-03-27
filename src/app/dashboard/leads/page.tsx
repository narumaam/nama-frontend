"use client";

import React, { useState, useEffect } from 'react';
import { 
  Kanban, 
  List, 
  GripVertical, 
  TrendingUp, 
  Zap,
  Plus,
  Search,
  MoreVertical,
  ChevronRight
} from 'lucide-react';

export default function LeadsPage() {
  const [activeView, setActiveView] = useState('kanban');
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await fetch('https://stunning-joy-production-87bb.app.railway.app/api/v1/leads');
        if (response.ok) {
          const data = await response.json();
          setLeads(data);
        }
      } catch (error) {
        console.error("Error fetching leads:", error);
      }
    };
    fetchLeads();
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Sales Operations</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Global Pipeline</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4 uppercase font-headline text-[#F5F0E8]">
            Lead Pipeline
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] bg-[#1D9E75]/10 px-3 py-1 rounded-full text-[#1D9E75] border border-[#1D9E75]/20 animate-pulse">ACTIVE_SQUADRON</span>
          </h1>
          <p className="text-[#B8B0A0] font-mono text-xs mt-2 uppercase tracking-wide">Orchestrating ₹12,45,000 in active procurement leads</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#111111] p-1 rounded-xl border border-[#C9A84C]/15 shadow-inner">
            <button 
              onClick={() => setActiveView('kanban')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                activeView === 'kanban' ? 'bg-[#C9A84C] text-[#0A0A0A] shadow-lg' : 'text-[#B8B0A0] hover:text-[#F5F0E8]'
              }`}
            >
              <Kanban size={14} /> Kanban
            </button>
            <button 
              onClick={() => setActiveView('list')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2 ${
                activeView === 'list' ? 'bg-[#C9A84C] text-[#0A0A0A] shadow-lg' : 'text-[#B8B0A0] hover:text-[#F5F0E8]'
              }`}
            >
              <List size={14} /> List
            </button>
          </div>
          <button className="bg-[#111111] text-[#C9A84C] border border-[#C9A84C]/20 p-2.5 rounded-xl hover:bg-[#C9A84C]/10 transition-all active:scale-95">
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start pb-40">
        {/* Prospecting */}
        <Column title="Prospecting" count="04" color="border-[#C9A84C]/30">
          <LeadCard 
            title="Industrial Pump Supply" 
            company="Reliance Petrochem Ltd." 
            value="₹4,20,000" 
            tag="HOT" 
            tagColor="text-[#ff8c00]" 
            tagBg="bg-[#ff8c00]/10"
            initials="JD"
          />
          <LeadCard 
            title="Logistics Hub Solar" 
            company="Adani Green Logistics" 
            value="₹8,75,000" 
            tag="LUKE" 
            tagColor="text-[#B8B0A0]" 
            tagBg="bg-[#1A1A1A]"
            time="2D AGO"
          />
        </Column>

        {/* Negotiation */}
        <Column title="Negotiation" count="02" color="border-[#1D9E75]/30">
          <LeadCard 
            title="Steel Wire Bulk" 
            company="Tata Construction" 
            value="₹1,50,000" 
            tag="WARM" 
            tagColor="text-[#1D9E75]" 
            tagBg="bg-[#1D9E75]/10"
            avatar="https://lh3.googleusercontent.com/aida-public/AB6AXuCorR89fvq6vQo9ND-3pfRL7GbynS0RiojArZQKCrpKDAiSQ33FnFqLR5_fp1i4sxcv2FWa5THWixmZcgvzeHEje8EVfvRCq93B4eiVbFQH1fGWcbx_FyeINn7DndoFP4D-HXtT34tgn94yWWJrEagmigTIIoMud7eruN-qYlHBj_wU6MiRbprcdCoAIM1_SB4YGm2IBppIUu_ZMy3cjdYDqJoEPHYrPFCXSONbm2vAlP1u0vqLsptL9WNxjKfeR9cRecozBjSr3wiV"
          />
        </Column>

        {/* Procurement */}
        <Column title="Procurement" count="03" accent="text-[#C9A84C]" color="border-[#C9A84C]">
          <LeadCard 
            title="Heavy Machinery Spare" 
            company="JCB India South" 
            value="₹55,000" 
            tag="HOT" 
            tagColor="text-[#ff8c00]" 
            tagBg="bg-[#ff8c00]/10"
            status="URGENT"
          />
        </Column>

        {/* Discarded */}
        <Column title="Junk / On Hold" count="12" muted color="border-white/5">
          <div className="grayscale opacity-50">
            <LeadCard 
              title="Small Part Retail" 
              company="Local Hardware Store" 
              value="₹1,200" 
              tag="JUNK" 
              tagColor="text-red-500" 
              tagBg="bg-red-500/10"
            />
          </div>
        </Column>
      </div>

      {/* Floating Stats Panel */}
      <div className="fixed bottom-8 right-8 left-[calc(16rem+2rem)] lg:left-[calc(16rem+4rem)] pointer-events-none z-30">
        <div className="pointer-events-auto bg-[#111111]/80 backdrop-blur-2xl p-6 rounded-3xl border border-[#C9A84C]/15 grid grid-cols-2 lg:grid-cols-4 gap-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <StatItem label="Total Pipeline" value="₹42.8M" progress={75} />
          <StatItem label="Avg. Cycle Time" value="14.2D" sub="▼ 1.4D FROM LAST WEEK" subColor="text-[#1D9E75]" />
          <StatItem label="Hot Lead Rate" value="24%" sub="▲ 8% PEAK LOAD" subColor="text-[#C9A84C]" />
          <div className="flex items-center justify-end">
            <button className="bg-[#1A1A1A] border border-[#C9A84C]/20 text-[#F5F0E8] hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all p-4 rounded-2xl flex items-center gap-3 active:scale-95 duration-150 group">
              <span className="font-black uppercase tracking-widest text-[10px] font-mono">Analyze Pipeline</span>
              <TrendingUp size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <button className="fixed bottom-32 right-12 w-14 h-14 bg-[#C9A84C] text-[#0A0A0A] rounded-full shadow-[0_0_30px_rgba(201,168,76,0.4)] flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 group">
        <Zap size={24} fill="currentColor" className="group-hover:animate-pulse" />
      </button>
    </div>
  );
}

function Column({ title, count, children, accent = "text-[#F5F0E8]", muted = false, color }) {
  return (
    <div className={`flex flex-col h-full bg-[#111111] rounded-2xl border border-[#C9A84C]/10 ${muted ? 'opacity-40' : ''} shadow-sm`}>
      <div className={`p-4 border-b border-[#C9A84C]/10 flex justify-between items-center ${color ? `border-t-2 ${color}` : ''}`}>
        <span className={`font-black tracking-widest text-[10px] uppercase font-mono ${accent}`}>{title}</span>
        <span className="font-mono text-[10px] bg-[#1A1A1A] px-2 py-0.5 rounded-lg text-[#C9A84C] font-bold border border-[#C9A84C]/10">{count}</span>
      </div>
      <div className="p-3 space-y-4 overflow-y-auto flex-1 max-h-[calc(100vh-360px)] no-scrollbar">
        {children}
      </div>
    </div>
  );
}

function LeadCard({ title, company, value, tag, tagColor, tagBg, initials, avatar, time, status }) {
  return (
    <div className="bg-[#1A1A1A] p-4 rounded-xl border border-transparent hover:border-[#C9A84C]/30 transition-all group cursor-pointer relative overflow-hidden shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <span className={`text-[9px] font-mono ${tagBg} ${tagColor} px-2 py-0.5 rounded-md uppercase tracking-widest font-black border border-current/10`}>{tag}</span>
        <GripVertical size={14} className="text-[#B8B0A0] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="font-black text-sm tracking-tight mb-1 text-[#F5F0E8] font-headline uppercase">{title}</h3>
      <p className="text-[10px] font-mono text-[#B8B0A0] uppercase tracking-tighter mb-4">{company}</p>
      <div className="flex justify-between items-center mt-auto border-t border-[#C9A84C]/5 pt-3">
        <span className="text-sm font-mono font-black text-[#C9A84C]">{value}</span>
        <div className="flex items-center gap-2">
          {initials && (
            <div className="w-6 h-6 rounded-full border border-[#C9A84C]/20 bg-[#111111] flex items-center justify-center text-[8px] font-black text-[#C9A84C]">
              {initials}
            </div>
          )}
          {avatar && (
            <div className="w-6 h-6 rounded-full border border-[#C9A84C]/20 bg-[#111111] flex items-center justify-center overflow-hidden">
              <img src={avatar} alt="User" className="w-full h-full object-cover" />
            </div>
          )}
          {time && <span className="text-[9px] font-mono text-[#B8B0A0] opacity-50 uppercase">{time}</span>}
          {status && <span className="text-[9px] font-mono text-red-500 font-black italic uppercase tracking-tighter">{status}</span>}
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, progress, sub, subColor }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-mono text-[#B8B0A0] uppercase tracking-widest font-black opacity-60 mb-1">{label}</span>
      <span className="text-2xl font-black font-headline text-[#F5F0E8] tracking-tighter">{value}</span>
      {progress !== undefined && (
        <div className="w-full h-1 bg-[#1A1A1A] mt-2 rounded-full overflow-hidden border border-[#C9A84C]/5">
          <div className="h-full bg-[#C9A84C] shadow-[0_0_8px_rgba(201,168,76,0.5)]" style={{ width: `${progress}%` }}></div>
        </div>
      )}
      {sub && <span className={`text-[9px] font-mono mt-2 font-black tracking-tighter ${subColor}`}>{sub}</span>}
    </div>
  );
}
