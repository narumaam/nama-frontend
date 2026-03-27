"use client";

import React, { useState } from 'react';
import { 
  Sparkles, 
  Eye, 
  FileText, 
  Edit2, 
  Trash2, 
  Car, 
  Hotel, 
  Map, 
  Star, 
  Clock, 
  MapPin, 
  Ticket, 
  Plus,
  ChevronRight,
  Info
} from 'lucide-react';

export default function ItinerariesPage() {
  const [activeDay, setActiveDay] = useState(1);
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-144px)] overflow-hidden animate-in fade-in duration-700">
      {/* Page Sub-Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Operations</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Itinerary Builder</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-headline text-[#F5F0E8]">
            Dubai Luxury Escape
          </h1>
          <div className="flex items-center gap-6 mt-2 text-[#B8B0A0] font-mono text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Users size={12} className="text-[#C9A84C]" /> Anjali Sharma + 2</span>
            <span className="flex items-center gap-1.5"><Clock size={12} className="text-[#C9A84C]" /> 15-20 Oct 2024</span>
            <span className="flex items-center gap-1.5"><MapPin size={12} className="text-[#C9A84C]" /> Dubai, UAE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/30 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#1D9E75]/20 transition-all shadow-[0_0_15px_rgba(29,158,117,0.1)]">
            <Sparkles size={14} fill="currentColor" /> Auto Generate (AI)
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#111111] text-[#F5F0E8] border border-[#C9A84C]/15 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#1A1A1A] transition-all">
            <Eye size={14} /> Preview
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-[#0A0A0A] rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_20px_rgba(201,168,76,0.2)]">
            <FileText size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden rounded-3xl border border-[#C9A84C]/15 bg-[#111111]/50 shadow-2xl backdrop-blur-sm">
        {/* Left Panel: Day List */}
        <aside className="w-64 bg-[#111111] p-6 border-r border-[#C9A84C]/15 overflow-y-auto no-scrollbar shrink-0">
          <h3 className="text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em] mb-6 font-mono opacity-50">Trip Timeline</h3>
          <div className="space-y-3">
            {[
              { day: 1, title: 'Arrival & Check-in' },
              { day: 2, title: 'Downtown Exploration' },
              { day: 3, title: 'Desert Adventure' },
              { day: 4, title: 'Old Dubai & Souks' },
              { day: 5, title: 'Leisure & Shopping' },
            ].map((d) => (
              <button 
                key={d.day}
                onClick={() => setActiveDay(d.day)}
                className={`w-full p-4 rounded-2xl flex flex-col items-start gap-1 transition-all group ${
                  activeDay === d.day 
                    ? 'bg-[#C9A84C] text-[#0A0A0A] shadow-lg' 
                    : 'bg-[#1A1A1A]/50 text-[#B8B0A0] hover:bg-[#1A1A1A] hover:text-[#F5F0E8] border border-transparent'
                }`}
              >
                <span className={`text-xs font-black uppercase tracking-widest ${activeDay === d.day ? 'text-[#0A0A0A]' : 'text-[#C9A84C] opacity-70 group-hover:opacity-100'}`}>Day {d.day}</span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-tighter">{d.title}</span>
              </button>
            ))}
          </div>
          <button className="w-full mt-6 py-4 border-2 border-dashed border-[#C9A84C]/15 rounded-2xl text-[#C9A84C] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#C9A84C]/5 hover:border-[#C9A84C]/30 transition-all">
            <Plus size={16} /> Add Day
          </button>
        </aside>

        {/* Canvas Area */}
        <section className="flex-1 overflow-y-auto p-10 no-scrollbar">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end justify-between mb-12 border-b border-[#C9A84C]/10 pb-8">
              <div>
                <h2 className="text-3xl font-black text-[#F5F0E8] tracking-tighter uppercase font-headline">Day {activeDay}: Arrival & Check-in</h2>
                <p className="text-[#B8B0A0] mt-3 max-w-lg text-sm font-body leading-relaxed">Welcome to Dubai! Your first day is designed for comfort and luxury after your flight. Settle into the magnificent Atlantis The Palm.</p>
              </div>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-[#C9A84C]/20 flex items-center justify-center text-[#B8B0A0] hover:text-[#C9A84C] transition-all shadow-sm">
                  <Edit2 size={16} />
                </button>
                <button className="w-10 h-10 rounded-xl bg-[#1A1A1A] border border-red-500/20 flex items-center justify-center text-[#B8B0A0] hover:text-red-500 transition-all shadow-sm">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Timeline Blocks */}
            <div className="space-y-12 relative before:content-[''] before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[1px] before:bg-gradient-to-b before:from-[#C9A84C]/40 before:via-[#C9A84C]/10 before:to-transparent">
              
              {/* Transfer Block */}
              <TimelineBlock 
                icon={Car} 
                type="Transfer" 
                title="Private Luxury Cab to Hotel" 
                time="14:30 - 15:15" 
                location="Dubai Int. Airport (DXB)" 
                price="$45.00" 
                description="Meet & Greet service with a professional driver holding a placard at the arrival hall."
                accentColor="#C9A84C"
              />

              {/* Accommodation Block */}
              <div className="relative pl-14 group">
                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#111111] border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] z-10 shadow-[0_0_15px_rgba(201,168,76,0.2)]">
                  <Hotel size={20} fill="currentColor" />
                </div>
                <div className="bg-[#1A1A1A] border border-[#C9A84C]/15 overflow-hidden rounded-3xl shadow-sm hover:border-[#C9A84C]/40 transition-all duration-300">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 h-52 relative">
                      <img 
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        alt="Atlantis" 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1npYT2RCI2OsPhFrsMgw0jnVCmJCTQ603bz9I-IeorlPkeFGHRrvnV_igEJZ5Gl7YCjB6w8o4BoL-UtslExTPK2I8usTtMaY43Htdce1W63nfpTprcKInQVcNg_uk3I9irw7cdh3-xqpYp1i5ukO2Z-QmYdnPP_tfd1-l0g7RqVFfjIBt1ULXqnCWjqLTRbulAn6zJIyvAEq66PVrkmaV1m9bcSrMFZsSks1AcZBKsRinLq9BgqxXB2wJmSVb4XogxpBQPJ4OoE22" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] to-transparent opacity-60"></div>
                    </div>
                    <div className="md:w-2/3 p-8 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-[9px] font-black text-[#C9A84C] uppercase tracking-[0.2em] bg-[#C9A84C]/10 px-3 py-1 rounded-full border border-[#C9A84C]/20 font-mono">Accommodation</span>
                            <h4 className="text-2xl font-black font-headline text-[#F5F0E8] mt-3 uppercase tracking-tight">Atlantis, The Palm</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-[#C9A84C] font-headline">$850</span>
                            <span className="text-[10px] text-[#B8B0A0] font-mono block opacity-50 uppercase">/ night</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 mb-4">
                          {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill="#C9A84C" className="text-[#C9A84C]" />)}
                          <span className="text-[9px] text-[#B8B0A0] font-black ml-3 uppercase tracking-widest font-mono opacity-60">Ocean View Suite</span>
                        </div>
                        <p className="text-[#B8B0A0] text-xs font-body leading-relaxed mb-6 opacity-80">Confirmed reservation for 5 nights. Check-in priority enabled. Ocean View room guaranteed.</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-[#111111] text-[8px] font-black text-[#C9A84C] rounded-lg uppercase tracking-widest border border-[#C9A84C]/15 font-mono">ALL-INCLUSIVE</span>
                        <span className="px-3 py-1 bg-[#111111] text-[8px] font-black text-[#C9A84C] rounded-lg uppercase tracking-widest border border-[#C9A84C]/15 font-mono">FREE WI-FI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Block */}
              <div className="relative pl-14 group">
                <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#111111] border border-[#1D9E75]/30 flex items-center justify-center text-[#1D9E75] z-10 shadow-[0_0_15px_rgba(29,158,117,0.15)]">
                  <Map size={20} />
                </div>
                <div className="bg-[#1A1A1A] border border-[#C9A84C]/15 p-8 rounded-3xl shadow-sm hover:border-[#C9A84C]/40 transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-8">
                      <div className="w-28 h-28 rounded-2xl overflow-hidden shrink-0 border border-[#C9A84C]/10 relative group-hover:scale-105 transition-transform duration-500">
                        <img 
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                          alt="Activity" 
                          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMjG-qae3qfVKgk7GXqn2tEyFu7BxK0s-n7hLUQLDc0Gs7pqrgpkPYuDaOdrSvkWvLdB46rntKxNST6b0FOYLJLLbvW7lk1am_KCYNQ3Y_c0o5jInkBDF7DdtGHt-KXBfwbD1dA-O5dm7KiS_G_aB4x69pFFcEQB_Q7l0xKavL87c29xlAcTTbeBoBS9Vh3oMzfUX-9VBWhKnKihPP9YJrTkx1rTDMxYv-cRAkGcQo_13dVbRhstzAhvRAkWdBkReGdeoQoZCQ4hJe" 
                        />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-[#1D9E75] uppercase tracking-[0.2em] bg-[#1D9E75]/10 px-3 py-1 rounded-full border border-[#1D9E75]/20 font-mono">Activity</span>
                        <h4 className="text-2xl font-black font-headline text-[#F5F0E8] mt-3 uppercase tracking-tight">Burj Khalifa Observation Deck</h4>
                        <div className="flex items-center gap-6 mt-4 text-[#B8B0A0] text-[10px] font-black font-mono">
                          <span className="flex items-center gap-2 uppercase tracking-widest"><Clock size={14} className="text-[#C9A84C]" /> 18:30 - 20:00</span>
                          <span className="flex items-center gap-2 uppercase tracking-widest"><Ticket size={14} className="text-[#C9A84C]" /> Fast-Track Entry</span>
                        </div>
                        <p className="text-[#B8B0A0] text-xs mt-4 font-body leading-relaxed max-w-md opacity-80">Sunset visit to 'At the Top' levels 124 & 125. Breathtaking 360-degree views.</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#C9A84C] font-headline">$120</span>
                      <span className="text-[9px] text-[#1D9E75] font-black block uppercase tracking-widest font-mono mt-1">2 TICKETS</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Block */}
              <div className="relative pl-14 pt-4">
                <button className="flex items-center gap-4 text-[#B8B0A0] hover:text-[#C9A84C] transition-all group">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#C9A84C]/20 group-hover:border-[#C9A84C] flex items-center justify-center transition-colors">
                    <Plus size={18} />
                  </div>
                  <span className="font-black text-[10px] uppercase tracking-[0.2em] font-mono">Add Activity, Transport or Accommodation</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function TimelineBlock({ icon: Icon, type, title, time, location, price, description, accentColor }) {
  return (
    <div className="relative pl-14 group">
      <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-[#111111] border border-[#C9A84C]/30 flex items-center justify-center text-[#C9A84C] z-10 shadow-[0_0_15px_rgba(201,168,76,0.1)] group-hover:scale-110 transition-transform">
        <Icon size={20} />
      </div>
      <div className="bg-[#1A1A1A] border border-[#C9A84C]/15 p-8 rounded-3xl shadow-sm hover:border-[#C9A84C]/40 transition-all duration-300">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-[9px] font-black text-[#C9A84C] uppercase tracking-[0.2em] bg-[#C9A84C]/10 px-3 py-1 rounded-full border border-[#C9A84C]/20 font-mono">{type}</span>
            <h4 className="text-2xl font-black font-headline text-[#F5F0E8] mt-3 uppercase tracking-tight">{title}</h4>
            <div className="flex items-center gap-6 mt-4 text-[#B8B0A0] text-[10px] font-black font-mono">
              <span className="flex items-center gap-2 uppercase tracking-widest"><Clock size={14} className="text-[#C9A84C]" /> {time}</span>
              <span className="flex items-center gap-2 uppercase tracking-widest"><MapPin size={14} className="text-[#C9A84C]" /> {location}</span>
            </div>
          </div>
          <span className="text-2xl font-black text-[#C9A84C] font-headline">{price}</span>
        </div>
        <p className="text-[#B8B0A0] text-xs font-body leading-relaxed max-w-lg opacity-80">{description}</p>
      </div>
    </div>
  );
}

const Users = ({ size, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
