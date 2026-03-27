"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from 'react';
import { 
  Plus, 
  Sparkles, 
  Instagram, 
  Download, 
  Share2, 
  MapPin, 
  Calendar, 
  Clock, 
  Info,
  ChevronRight,
  MoreVertical,
  CreditCard
} from 'lucide-react';

const BentoCard = ({ type, title, description, price, currency }) => (
  <div className="bg-slate-50 rounded-[24px] p-6 border border-slate-100 hover:shadow-md transition-shadow">
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{type}</div>
    <h4 className="font-black text-[#0F172A] tracking-tight mb-2">{title}</h4>
    <p className="text-sm text-slate-500 leading-relaxed mb-4">{description}</p>
    {price && (
      <div className="text-sm font-black text-[#14B8A6]">
        {currency} {price?.toLocaleString()}
      </div>
    )}
  </div>
);

export default function ItinerariesPage() {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);

  const generateAIItinerary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://stunning-joy-production-87bb.up.railway.app/api/v1/itineraries/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: 1,
          destination: "Dubai",
          duration_days: 3,
          traveler_count: 2,
          preferences: ["Fine Dining", "Luxury"],
          style: "Luxury"
        })
      });
      
      if (!response.ok) throw new Error(`Server Error: ${response.status}`);
      
      const data = await response.json();
      setItinerary(data);
    } catch (err) {
      console.error("Failed to generate itinerary:", err);
      setError("AI Engine connection failed. Please ensure the backend is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 text-left">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">AI Itinerary Builder</h1>
          <p className="text-slate-500 mt-2 font-medium">Generate high-conversion Bento plans in under 2 minutes.</p>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={generateAIItinerary}
            disabled={loading}
            className="bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center shadow-lg shadow-[#14B8A6]/10 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            <Sparkles size={18} className="mr-2" fill="currentColor" /> {loading ? "Generating..." : "Generate with AI"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-2xl p-4 text-sm font-medium">
          {error}
        </div>
      )}

      {!itinerary ? (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MapPin size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-400 mb-2 tracking-tight">No active itinerary selected</h3>
          <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
            Select a lead from the pipeline or click "Generate with AI" to build a new travel plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 space-y-12">
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <MapPin size={160} fill="currentColor" className="text-primary" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 text-[#14B8A6] font-black text-[10px] uppercase tracking-[0.3em] mb-4">
                  <Calendar size={12} /> <span>3 DAY LUXURY EXPERIENCE</span>
                </div>
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tighter mb-6">{itinerary.title}</h2>
                <div className="flex space-x-10 text-slate-400 text-sm font-bold tracking-tight">
                  <div className="flex items-center"><Clock size={16} className="mr-2" /> 72 Hours</div>
                  <div className="flex items-center"><Info size={16} className="mr-2" /> 2 Travelers</div>
                  <div className="flex items-center text-primary"><CreditCard size={16} className="mr-2" /> ₹{itinerary.total_price?.toLocaleString()} Total</div>
                </div>
              </div>
            </div>

            {itinerary.days?.map((day) => (
              <div key={day.day_number} className="space-y-6 text-left">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#0F172A] text-white rounded-2xl flex items-center justify-center font-black text-xl">
                    {day.day_number}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0F172A] tracking-tighter">{day.title}</h3>
                    <p className="text-sm text-slate-500 font-medium">{day.narrative}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-16">
                  {day.blocks?.map((block, idx) => (
                    <BentoCard 
                      key={idx}
                      type={block.type}
                      title={block.title}
                      description={block.description}
                      price={block.price_gross}
                      currency={block.currency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-10 text-left">
            <div className="bg-[#0F172A] rounded-[40px] p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#14B8A6]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center space-x-3 text-[#14B8A6] mb-8">
                  <Instagram size={24} />
                  <span className="font-black text-xs uppercase tracking-[0.3em]">Insta Post Generator</span>
                </div>
                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                    "{itinerary.social_post?.caption}"
                  </p>
                </div>
                <div className="space-y-4 mb-8">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viral Hooks</h4>
                  {itinerary.social_post?.hooks?.map((hook, i) => (
                    <div key={i} className="flex items-start space-x-3">
                      <div className="w-5 h-5 bg-[#14B8A6] text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">
                        {i+1}
                      </div>
                      <p className="text-xs font-bold text-slate-200">{hook}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full bg-[#14B8A6] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#14B8A6]/10 hover:scale-[1.02] transition-transform">
                  Copy to Clipboard
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm text-left">
              <h3 className="text-xl font-black text-[#0F172A] tracking-tighter mb-6">Actions</h3>
              <div className="space-y-4">
                <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <Download size={18} className="mr-3" /> Export as PDF
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                </button>
                <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <Share2 size={18} className="mr-3" /> Share with Client
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                </button>
                <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <MoreVertical size={18} className="mr-3" /> Advanced Settings
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
