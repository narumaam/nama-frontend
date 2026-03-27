"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  Activity, 
  Terminal, 
  ShieldCheck, 
  Globe, 
  ChevronLeft,
  Search,
  Cpu,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';

export default function KineticPage() {
  const [logs, setLogs] = useState([
    { time: "14:22:01", agent: "Triage", message: "New Lead detected from WhatsApp (+91...)", status: "SUCCESS" },
    { time: "14:22:05", agent: "Itinerary", message: "Generating 7-day Bali Luxury plan...", status: "IN_PROGRESS" },
    { time: "14:22:12", agent: "Bidding", message: "Broadcasting requirements to 5 Dubai vendors", status: "SUCCESS" },
    { time: "14:22:15", agent: "Finance", message: "Reconciling settlement #TX-1029", status: "SUCCESS" },
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-mono selection:bg-[#14B8A6] selection:text-white overflow-hidden flex flex-col">
      {/* Top Bar - Daylight Version */}
      <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center space-x-6 text-left">
          <Link href="/dashboard" className="text-slate-400 hover:text-primary transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center space-x-3 text-primary">
            <Zap size={20} fill="currentColor" className="text-[#14B8A6]" />
            <span className="font-black tracking-[0.3em] text-sm uppercase">KINETIC ENGINE v3.0</span>
          </div>
        </div>
        <div className="flex items-center space-x-8 text-[10px] font-black tracking-widest uppercase text-right">
          <div className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
            <ShieldCheck size={14} className="mr-2" /> System Healthy
          </div>
          <div className="flex items-center text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <Globe size={14} className="mr-2" /> 12 Nodes Active
          </div>
          <div className="flex items-center text-[#14B8A6] bg-[#14B8A6]/10 px-3 py-1 rounded-full border border-[#14B8A6]/20">
            <Cpu size={14} className="mr-2" /> Swarm: Connected
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden text-left">
        {/* Left Side: Real-time Streams */}
        <div className="w-1/3 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <Terminal size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Agentic Activity Log</span>
            </div>
            <RefreshCw size={14} className="text-slate-300 animate-spin-slow" />
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {logs.map((log, i) => (
              <div key={i} className="flex space-x-4 group">
                <div className="text-[10px] font-bold text-slate-300 mt-1">{log.time}</div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[9px] font-black text-[#14B8A6] bg-[#14B8A6]/10 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-[#14B8A6]/20">
                      {log.agent}
                    </span>
                    <span className={`text-[9px] font-black ${
                      log.status === 'SUCCESS' ? 'text-green-500' : 'text-blue-500'
                    }`}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 group-hover:text-primary transition-colors leading-relaxed">
                    {log.message}
                  </p>
                </div>
              </div>
            ))}
            <div className="animate-pulse text-[10px] font-black text-[#14B8A6] mt-8 tracking-[0.2em] uppercase">
              _ Awaiting inbound signal...
            </div>
          </div>
        </div>

        {/* Center: Command Dashboard - Daylight Style */}
        <div className="flex-1 flex flex-col bg-slate-50/50">
          <div className="p-12 space-y-12">
            <div className="grid grid-cols-3 gap-8 text-left">
              {[
                { label: "Active Negotiations", value: "14", unit: "BIDS", color: "text-[#14B8A6]" },
                { label: "Lead Velocity", value: "1.2", unit: "LPM", color: "text-blue-500" },
                { label: "Risk Factor", value: "0.02", unit: "LOW", color: "text-green-500" }
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-[32px] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group text-left">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 group-hover:text-primary transition-colors">
                    {stat.label}
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <div className={`text-5xl font-black tracking-tighter ${stat.color}`}>{stat.value}</div>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{stat.unit}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-[48px] p-12 border border-slate-200 shadow-sm relative overflow-hidden group text-left">
              <div className="absolute inset-0 bg-gradient-to-br from-[#14B8A6]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative z-10 flex justify-between items-center mb-12">
                <div className="space-y-2 text-left">
                  <h3 className="text-3xl font-black text-primary tracking-tighter">Strategic Value Forecast</h3>
                  <p className="text-sm text-slate-400 font-semibold tracking-tight">Predictive GMV based on current lead velocity and system-wide conversion.</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 text-right shadow-inner">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Projected April Revenue</div>
                  <div className="text-3xl font-black text-primary tracking-tighter">₹1,25,00,000</div>
                </div>
              </div>
              
              <div className="h-64 w-full flex items-end justify-between space-x-6">
                {[45, 60, 55, 80, 75, 95, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-100 rounded-2xl relative group/bar overflow-hidden shadow-inner">
                    <div 
                      className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#14B8A6] to-[#14B8A6]/40 transition-all duration-1000 delay-300 ease-out group-hover/bar:from-[#14B8A6] group-hover/bar:to-[#14B8A6]/60 rounded-t-lg"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
