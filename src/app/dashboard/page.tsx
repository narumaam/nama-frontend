"use client";

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Briefcase, 
  Map, 
  CreditCard,
  Plus,
  ArrowRight,
  Zap
} from 'lucide-react';

const StatCard = ({ label, value, trend, status, icon: Icon }) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-primary">
        <Icon size={24} />
      </div>
      <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
        status === 'UP' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
      }`}>
        {status === 'UP' ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
        {trend}%
      </div>
    </div>
    <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
    <div className="text-3xl font-extrabold text-primary">{value}</div>
  </div>
);

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch('https://stunning-joy-production-87bb.up.railway.app/api/v1/analytics/dashboard', {
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

  if (loading) return <div className="flex items-center justify-center h-96 text-slate-400 animate-pulse">Initializing NAMA OS...</div>;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary">Operations Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time performance across your DMC supply chain.</p>
        </div>
        <button className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-primary/10 hover:bg-slate-800 transition-all active:scale-95">
          <Plus size={20} className="mr-2" /> New Itinerary
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Revenue (GMV)" 
          value={`₹${summary?.gmv?.value?.toLocaleString()}`} 
          trend={summary?.gmv?.trend} 
          status={summary?.gmv?.status} 
          icon={CreditCard} 
        />
        <StatCard 
          label="Conversion Rate" 
          value={`${summary?.conversion_rate?.value}%`} 
          trend={summary?.conversion_rate?.trend} 
          status={summary?.conversion_rate?.status} 
          icon={TrendingUp} 
        />
        <StatCard 
          label="Total Leads" 
          value={summary?.total_leads?.value} 
          trend={summary?.total_leads?.trend} 
          status={summary?.total_leads?.status} 
          icon={Users} 
        />
        <StatCard 
          label="Active Itineraries" 
          value={summary?.active_itineraries?.value} 
          trend={summary?.active_itineraries?.trend} 
          status={summary?.active_itineraries?.status} 
          icon={Map} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-primary">Recent Leads</h3>
            <button className="text-secondary font-bold text-sm flex items-center hover:underline">
              View All <ArrowRight size={16} className="ml-1" />
            </button>
          </div>
          
          <div className="space-y-4">
            {[
              { name: "Radhika Iyer", dest: "Bali, Indonesia", style: "Luxury", status: "In Triage", score: 98 },
              { name: "Narayan Mallapur", dest: "Dubai, UAE", style: "Standard", status: "Quoted", score: 85 },
              { name: "Alice Zhang", dest: "Phuket, Thailand", style: "Luxury", status: "Bidding", score: 92 }
            ].map((lead, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center font-bold text-primary">
                    {lead.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800">{lead.name}</div>
                    <div className="text-xs text-slate-400 font-medium">{lead.dest} • {lead.style}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                    lead.status === 'Quoted' ? 'bg-blue-50 text-blue-600' : 
                    lead.status === 'Bidding' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {lead.status}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 font-bold">SCORE</div>
                    <div className="text-sm font-black text-secondary">{lead.score}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-primary rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-secondary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
              <Zap size={24} className="text-secondary" fill="currentColor" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Kinetic Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              The AI Agent Swarm is currently monitoring 12 active supply chains. No critical anomalies detected.
            </p>
            
            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Last AI Action</div>
                <div className="text-sm text-slate-200">Bidding Agent countered bid for Hyatt Dubai at ₹42,500.</div>
              </div>
