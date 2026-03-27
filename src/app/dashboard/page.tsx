"use client";

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Map, 
  CreditCard,
  Plus,
  ArrowRight,
  Zap,
  Activity
} from 'lucide-react';

const StatCard = ({ label, value, trend, status, icon: Icon }) => (
  <div className="bg-[#111111] p-6 rounded-2xl border border-[#C9A84C]/15 shadow-sm hover:border-[#C9A84C]/30 transition-all group">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-[#1A1A1A] rounded-xl flex items-center justify-center text-[#C9A84C] border border-[#C9A84C]/10 group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      <div className={`flex items-center text-[10px] font-mono font-bold px-2 py-1 rounded-full ${
        status === 'UP' ? 'bg-[#1D9E75]/10 text-[#1D9E75]' : 'bg-red-500/10 text-red-500'
      }`}>
        {status === 'UP' ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
        {trend}%
      </div>
    </div>
    <div className="text-[#B8B0A0] text-xs font-mono uppercase tracking-widest mb-1">{label}</div>
    <div className="text-3xl font-black font-headline text-[#F5F0E8]">{value}</div>
  </div>
);

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('https://stunning-joy-production-87bb.app.railway.app/api/v1/analytics/dashboard', {
          headers: { 'Authorization': 'Bearer test-token' }
        });
        const data = await response.json();
        setSummary(data);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-[#C9A84C] font-mono gap-4">
      <div className="w-12 h-12 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin"></div>
      <div className="animate-pulse tracking-widest uppercase text-xs">Initializing NAMA OS...</div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-[#F5F0E8] font-headline uppercase">Operations Overview</h1>
          <p className="text-[#B8B0A0] mt-2 font-body text-sm">Real-time performance across your DMC supply chain.</p>
        </div>
        <button className="bg-[#C9A84C] text-[#0A0A0A] px-6 py-3 rounded-xl font-bold flex items-center shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:scale-105 transition-all active:scale-95 uppercase tracking-widest text-xs">
          <Plus size={18} className="mr-2" strokeWidth={3} /> New Itinerary
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue (GMV)" 
          value={`₹${summary?.gmv?.value?.toLocaleString() || '0'}`} 
          trend={summary?.gmv?.trend || '0'} 
          status={summary?.gmv?.status || 'UP'} 
          icon={CreditCard} 
        />
        <StatCard 
          label="Conversion Rate" 
          value={`${summary?.conversion_rate?.value || '0'}%`} 
          trend={summary?.conversion_rate?.trend || '0'} 
          status={summary?.conversion_rate?.status || 'UP'} 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Total Leads" 
          value={summary?.total_leads?.value || '0'} 
          trend={summary?.total_leads?.trend || '0'} 
          status={summary?.total_leads?.status || 'UP'} 
          icon={Users} 
        />
        <StatCard 
          label="Active Itineraries" 
          value={summary?.active_itineraries?.value || '0'} 
          trend={summary?.active_itineraries?.trend || '0'} 
          status={summary?.active_itineraries?.status || 'UP'} 
          icon={Map} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        <div className="lg:col-span-2 bg-[#111111] rounded-3xl border border-[#C9A84C]/15 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-[#F5F0E8] font-headline uppercase tracking-tight">Recent Leads</h3>
            <button className="text-[#C9A84C] font-bold text-xs flex items-center hover:opacity-80 transition-opacity uppercase tracking-widest">
              View All <ArrowRight size={14} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { name: "Radhika Iyer", dest: "Bali, Indonesia", style: "Luxury", status: "In Triage", score: 98 },
              { name: "Narayan Mallapur", dest: "Dubai, UAE", style: "Standard", status: "Quoted", score: 85 },
              { name: "Alice Zhang", dest: "Phuket, Thailand", style: "Luxury", status: "Bidding", score: 92 }
            ].map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[#1A1A1A]/50 hover:bg-[#1A1A1A] transition-all border border-transparent hover:border-[#C9A84C]/20 group cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-[#C9A84C]/10 flex items-center justify-center font-bold text-[#C9A84C] border border-[#C9A84C]/20">
                    {lead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-[#F5F0E8] font-body">{lead.name}</div>
                    <div className="text-[10px] text-[#B8B0A0] font-mono uppercase tracking-tighter">{lead.dest} • {lead.style}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${
                    lead.status === 'Quoted' ? 'border-[#1D9E75]/30 text-[#1D9E75] bg-[#1D9E75]/5' : 
                    lead.status === 'Bidding' ? 'border-[#ff8c00]/30 text-[#ff8c00] bg-[#ff8c00]/5' : 'border-[#B8B0A0]/30 text-[#B8B0A0] bg-[#B8B0A0]/5'
                  }`}>
                    {lead.status}
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-[#B8B0A0] font-black font-mono uppercase tracking-widest">SCORE</div>
                    <div className="text-sm font-black text-[#C9A84C] font-mono">{lead.score}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#C9A84C] rounded-3xl p-8 text-[#0A0A0A] relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_rgba(201,168,76,0.1)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-[#0A0A0A] rounded-xl flex items-center justify-center mb-6 shadow-xl">
              <Zap size={24} className="text-[#C9A84C]" fill="currentColor" />
            </div>
            <h3 className="text-2xl font-black font-headline uppercase mb-2 tracking-tighter">Kinetic Intelligence</h3>
            <p className="text-[#0A0A0A]/70 text-sm leading-relaxed mb-8 font-body font-medium">
              The AI Agent Swarm is currently monitoring 12 active supply chains. No critical anomalies detected.
            </p>
            
            <div className="space-y-4">
              <div className="bg-[#0A0A0A]/5 rounded-2xl p-4 border border-[#0A0A0A]/10 backdrop-blur-sm">
                <div className="text-[10px] font-black text-[#0A0A0A]/50 uppercase tracking-[0.2em] mb-1 font-mono">Last AI Action</div>
                <div className="text-sm text-[#0A0A0A] font-bold">Bidding Agent countered bid for Hyatt Dubai at ₹42,500.</div>
              </div>
              <div className="bg-[#0A0A0A]/5 rounded-2xl p-4 border border-[#0A0A0A]/10 backdrop-blur-sm">
                <div className="text-[10px] font-black text-[#0A0A0A]/50 uppercase tracking-[0.2em] mb-1 font-mono">Market Insight</div>
                <div className="text-sm text-[#0A0A0A] font-bold">Bali demand is up 12% this week. Adjust luxury margins?</div>
              </div>
            </div>
          </div>
          
          <button className="relative z-10 w-full bg-[#0A0A0A] text-[#C9A84C] py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl mt-8 hover:scale-[1.02] transition-transform active:scale-95 border border-[#C9A84C]/20">
            Switch to Kinetic OS
          </button>
        </div>
      </div>
    </div>
  );
}
