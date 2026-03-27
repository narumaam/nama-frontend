"use client";

import React, { useState } from 'react';
import { 
  Signal, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Zap, 
  Smile, 
  PiggyBank, 
  TrendingUp, 
  Activity,
  ChevronRight,
  Phone,
  MessageSquare,
  History
} from 'lucide-react';

export default function CommsPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-144px)] overflow-hidden animate-in fade-in duration-700">
      {/* Page Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Intelligence Hub</span>
            <ChevronRight size={10} />
            <span className="opacity-50">AI Comms Interface</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-headline text-[#F5F0E8] flex items-center gap-4">
            Comms Command
            <div className="flex items-center gap-2 bg-[#1D9E75]/10 px-3 py-1 rounded-full text-[9px] font-black text-[#1D9E75] border border-[#1D9E75]/20 font-mono tracking-widest animate-pulse">
              <Signal size={12} /> SIGNAL_STABLE
            </div>
          </h1>
          <p className="text-[#B8B0A0] font-mono text-xs mt-2 uppercase tracking-wide">Orchestrating AI-driven client communications & recovery</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-[#C9A84C] text-[#0A0A0A] px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(201,168,76,0.2)] hover:scale-105 transition-all active:scale-95">
            Deploy New Agent Mission
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 overflow-hidden grid grid-cols-12 gap-8">
        {/* Left Panel: Session Queue */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-4 overflow-hidden bg-[#111111]/30 rounded-3xl border border-[#C9A84C]/10 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-[#C9A84C] font-mono">Live Call Queue</h2>
            <span className="font-mono text-[9px] text-[#1D9E75] bg-[#1D9E75]/10 px-2 py-0.5 rounded-lg border border-[#1D9E75]/20 font-bold uppercase tracking-widest">8 Active</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
            <QueueCard name="Arjun Sharma" type="AI Inbound" time="04:22" desc="Flight Delay Recovery" active />
            <QueueCard name="Priya Varma" type="AI Outbound" time="01:45" desc="Booking Confirmation" />
            <QueueCard name="Vikram Seth" type="AI Inbound" time="08:12" desc="Itinerary Adjustment" dimmed />
            <QueueCard name="Rohan Mehta" type="AI Outbound" time="00:30" desc="Payment Resolve" urgent />
          </div>
          <button className="w-full mt-4 py-4 border border-[#C9A84C]/10 hover:bg-[#C9A84C]/5 transition-all text-[9px] font-black uppercase tracking-[0.2em] text-[#B8B0A0] rounded-xl font-mono">
            View Mission History
          </button>
        </section>

        {/* Center Panel: Live Session Transcription */}
        <section className="col-span-12 lg:col-span-6 flex flex-col bg-[#111111]/50 border border-[#C9A84C]/15 overflow-hidden rounded-3xl relative shadow-2xl backdrop-blur-md">
          <div className="p-8 border-b border-[#C9A84C]/10 flex items-center justify-between bg-black/20">
            <div>
              <h2 className="font-black text-sm uppercase tracking-[0.2em] font-headline text-[#F5F0E8]">Active Voice Session</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[9px] font-mono text-[#B8B0A0] uppercase opacity-50 tracking-widest font-bold">ID: CALL_VOICE_8829-X</span>
                <span className="text-[9px] font-mono text-[#C9A84C] font-black uppercase tracking-widest border border-[#C9A84C]/20 px-2 py-0.5 rounded-lg">ENCRYPTED</span>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-500/20 transition-all flex items-center gap-2 border border-red-500/20 active:scale-95 shadow-lg shadow-red-500/5">
              <MicOff size={16} strokeWidth={3} /> Interrupt Call
            </button>
          </div>

          {/* Waveform Visualization */}
          <div className="h-24 flex items-center justify-center gap-[3px] px-8 bg-black/40 border-b border-[#C9A84C]/10">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className={`w-1 bg-[#1D9E75] transition-all duration-500 rounded-full ${i % 3 === 0 ? 'h-12 opacity-100 shadow-[0_0_15px_rgba(29,158,117,0.5)] animate-pulse' : 'h-4 opacity-40'}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              ></div>
            ))}
          </div>

          {/* Transcript Feed */}
          <div className="flex-1 overflow-y-auto p-10 space-y-10 no-scrollbar">
            <div className="flex gap-5 max-w-[85%] animate-in slide-in-from-left-4 duration-500">
              <div className="w-10 h-10 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0 border border-[#C9A84C]/20 text-[#C9A84C] shadow-sm">
                <Bot size={20} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-[#C9A84C] uppercase font-black tracking-[0.2em] font-mono opacity-60">AI Agent Delta</span>
                <div className="bg-[#1A1A1A] p-6 rounded-3xl rounded-tl-sm text-sm leading-relaxed border border-[#C9A84C]/10 text-[#F5F0E8] font-body shadow-xl">
                  Hello Mr. Arjun, I noticed your flight 6E-201 from Delhi to Mumbai has been delayed by 2 hours. Would you like me to look for an earlier alternative or perhaps book a lounge access for your wait?
                </div>
              </div>
            </div>

            <div className="flex gap-5 max-w-[85%] ml-auto flex-row-reverse animate-in slide-in-from-right-4 duration-500">
              <div className="w-10 h-10 rounded-2xl bg-[#1D9E75]/10 flex items-center justify-center shrink-0 border border-[#1D9E75]/20 text-[#1D9E75] shadow-sm">
                <User size={20} />
              </div>
              <div className="text-right space-y-2">
                <span className="text-[10px] text-[#1D9E75] uppercase font-black tracking-[0.2em] font-mono opacity-60">Arjun Sharma</span>
                <div className="bg-[#C9A84C] p-6 rounded-3xl rounded-tr-sm text-sm leading-relaxed text-[#0A0A0A] font-body font-bold shadow-xl">
                  Ah, that's frustrating. Is there anything available around 4 PM instead? I have a meeting at 7 PM.
                </div>
              </div>
            </div>

            <div className="flex gap-5 max-w-[85%] animate-pulse duration-1000">
              <div className="w-10 h-10 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0 border border-[#C9A84C]/20 text-[#C9A84C]">
                <Bot size={20} />
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-[#C9A84C] uppercase font-black tracking-[0.2em] font-mono opacity-60">AI Agent Delta</span>
                <div className="bg-[#1A1A1A]/50 p-6 rounded-3xl rounded-tl-sm text-sm text-[#B8B0A0] flex gap-3 items-center font-mono border border-dashed border-[#C9A84C]/20">
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  <span className="ml-2 italic uppercase tracking-widest font-bold">Scanning Flight Inventory Hub...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="p-6 bg-black/40 border-t border-[#C9A84C]/10 flex gap-4 mt-auto">
            <button className="flex-1 py-4 bg-[#1A1A1A] text-[#F5F0E8] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-[#111111] transition-all border border-[#C9A84C]/10 font-mono active:scale-95">
              Request Human Transfer
            </button>
            <button className="flex-1 py-4 bg-[#1D9E75] text-[#0A0A0A] text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-105 transition-all shadow-lg shadow-[#1D9E75]/10 font-mono active:scale-95">
              Force Resolution
            </button>
          </div>
        </section>

        {/* Right Panel: Performance Analytics */}
        <section className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <h2 className="font-black text-[10px] uppercase tracking-[0.2em] text-[#C9A84C] font-mono opacity-60">Live Performance Tracking</h2>
          <div className="grid grid-cols-1 gap-6">
            <KPICard label="Mission Resolution" value="94.2%" change="+2.1%" icon={Zap} accent="text-[#C9A84C]" />
            <KPICard label="Sentiment Analysis" value="4.8/5" change="VERY POSITIVE" icon={Smile} accent="text-[#1D9E75]" progress />
            
            <div className="bg-[#C9A84C] p-8 rounded-3xl relative overflow-hidden group shadow-2xl border border-white/20">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <PiggyBank size={64} className="text-[#0A0A0A]" />
              </div>
              <div className="relative z-10">
                <span className="font-mono text-[9px] text-[#0A0A0A] uppercase tracking-[0.2em] mb-4 block font-black opacity-60">Value Recovered (Cycle)</span>
                <div className="font-black text-3xl text-[#0A0A0A] tracking-tighter font-headline uppercase leading-none">₹8,42,100</div>
                <p className="font-mono text-[9px] text-[#0A0A0A] mt-6 uppercase tracking-widest font-black border-t border-[#0A0A0A]/10 pt-4">Manual overhead saved: ₹1.2L</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col mt-4 bg-[#111111]/30 p-6 rounded-3xl border border-[#C9A84C]/10">
            <div className="flex items-center justify-between mb-6">
              <span className="font-mono text-[10px] text-[#C9A84C] uppercase tracking-widest font-black">Active Campaigns</span>
              <span className="text-[#1D9E75] font-mono text-[9px] font-black uppercase tracking-tighter bg-[#1D9E75]/10 px-2 py-0.5 rounded-md">3 LIVE</span>
            </div>
            <div className="space-y-3">
              <CampaignItem title="Holiday Up-sell" count="442" color="border-[#C9A84C]" icon={TrendingUp} />
              <CampaignItem title="Survey Feedback" count="68%" color="border-[#1D9E75]" icon={Activity} />
            </div>
            <button className="mt-8 w-full py-5 bg-[#111111] text-[#C9A84C] border border-[#C9A84C]/20 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-[#C9A84C] hover:text-[#0A0A0A] transition-all font-mono active:scale-95">
              Deploy AI Campaign
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function QueueCard({ name, type, time, desc, active, dimmed, urgent }) {
  return (
    <div className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-sm ${
      active ? 'bg-[#C9A84C] border-[#C9A84C] text-[#0A0A0A]' : 
      urgent ? 'bg-[#1A1A1A] border-red-500/40 text-[#F5F0E8]' : 'bg-[#1A1A1A] border-[#C9A84C]/10 text-[#F5F0E8] hover:border-[#C9A84C]/40'
    } ${dimmed ? 'opacity-40 grayscale' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <span className={`font-mono text-[9px] uppercase tracking-widest font-black ${active ? 'text-[#0A0A0A]/70' : 'text-[#C9A84C]'}`}>{type}</span>
        <span className={`font-mono text-[9px] font-bold ${active ? 'text-[#0A0A0A]/50' : 'text-[#B8B0A0] opacity-50'}`}>{time}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-[#0A0A0A] shadow-[0_0_8px_rgba(10,10,10,0.5)]' : urgent ? 'bg-red-500 animate-pulse' : 'bg-[#1D9E75]'}`}></div>
        <h3 className={`font-black text-xs uppercase tracking-tight font-headline ${active ? 'text-[#0A0A0A]' : 'text-[#F5F0E8]'}`}>{name}</h3>
      </div>
      <p className={`text-[10px] font-medium leading-tight uppercase tracking-tighter opacity-80 ${active ? 'text-[#0A0A0A]' : 'text-[#B8B0A0]'}`}>{desc}</p>
    </div>
  );
}

function KPICard({ label, value, change, icon: Icon, accent, progress }) {
  return (
    <div className="bg-[#111111] p-6 rounded-3xl border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 transition-all shadow-xl group">
      <div className="flex justify-between items-center mb-6">
        <span className="font-mono text-[10px] text-[#B8B0A0] uppercase tracking-widest font-black opacity-50">{label}</span>
        <Icon size={20} className="text-[#C9A84C] opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
      </div>
      <div className="flex items-baseline gap-3">
        <span className="font-black text-3xl tracking-tighter text-[#F5F0E8] font-headline uppercase">{value}</span>
        <span className={`font-mono text-[9px] ${accent} font-black uppercase tracking-[0.2em] bg-current/10 px-2 py-0.5 rounded-lg border border-current/20`}>{change}</span>
      </div>
      {progress && (
        <div className="mt-6 flex gap-1 h-[2px] w-full bg-[#1A1A1A] rounded-full overflow-hidden">
          <div className="w-[85%] bg-[#1D9E75] h-full shadow-[0_0_10px_#1D9E75]"></div>
          <div className="w-[10%] bg-[#C9A84C] h-full"></div>
          <div className="w-[5%] bg-red-500 h-full"></div>
        </div>
      )}
    </div>
  );
}

function CampaignItem({ title, count, color, icon: Icon }) {
  return (
    <div className={`bg-[#1A1A1A] p-4 rounded-2xl flex items-center justify-between border-l-4 ${color} hover:bg-[#111111] transition-all cursor-pointer group border-y border-r border-transparent hover:border-[#C9A84C]/20 shadow-sm`}>
      <div>
        <div className="text-[11px] font-black uppercase tracking-widest text-[#F5F0E8] font-headline">{title}</div>
        <div className="font-mono text-[9px] text-[#B8B0A0] font-bold uppercase tracking-widest mt-1 opacity-60">{title === 'Holiday Up-sell' ? 'Conversion Rate' : 'System Response'}: <span className="text-[#C9A84C] ml-1">{count}</span></div>
      </div>
      <div className="w-8 h-8 rounded-xl bg-[#111111] flex items-center justify-center border border-[#C9A84C]/10 group-hover:scale-110 transition-transform">
        <Icon size={16} className="text-[#B8B0A0] group-hover:text-[#C9A84C]" />
      </div>
    </div>
  );
}
