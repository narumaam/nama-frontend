"use client";

import React, { useState, useEffect } from 'react';
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
  CreditCard,
  Loader,
  AlertCircle,
  List,
  X,
} from 'lucide-react';
import { BentoCard } from '@/components/BentoCard';
import { itinerariesApi, leadsApi, bookingsApi, ItineraryOut, Lead, ItineraryRequest } from '@/lib/api';

const STYLES = ['Luxury', 'Adventure', 'Cultural', 'Family', 'Budget', 'Wellness'];

export default function ItinerariesPage() {
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryOut | null>(null);
  const [savedItineraries, setSavedItineraries] = useState<ItineraryOut[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<ItineraryRequest>({
    lead_id: 0,
    destination: '',
    duration_days: 3,
    traveler_count: 2,
    preferences: [],
    style: 'Luxury',
    travel_dates: '',
    budget_range: '',
  });

  useEffect(() => {
    // Load existing itineraries and leads for the form
    loadSavedItineraries();
    loadLeads();
  }, []);

  const loadSavedItineraries = async () => {
    try {
      const data = await itinerariesApi.list();
      setSavedItineraries(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical — backend may not be up yet
    }
  };

  const loadLeads = async () => {
    try {
      const data = await leadsApi.list({ size: 50 });
      setLeads(data.items || []);
    } catch {
      // Non-critical
    }
  };

  const handleGenerate = async () => {
    if (!form.destination.trim()) {
      setError('Please enter a destination');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await itinerariesApi.generate({
        ...form,
        lead_id: form.lead_id || undefined as any,
      });
      setItinerary(data);
      setShowForm(false);
      // Refresh saved list
      loadSavedItineraries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI engine connection failed. Ensure the backend is active.');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToBooking = async () => {
    if (!itinerary?.id) {
      setError('Save the itinerary first before converting to booking.')
      return
    }
    setBookingLoading(true)
    setBookingSuccess(null)
    try {
      const booking = await bookingsApi.create({
        itinerary_id: itinerary.id,
        lead_id: itinerary.lead_id || form.lead_id || 0,
      })
      setBookingSuccess(`Booking #${booking.id} created — status: ${booking.status}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setBookingLoading(false)
    }
  }

  const handleCopyCaption = () => {
    const caption = itinerary?.social_post?.caption || itinerary?.social_caption;
    if (caption) {
      navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const days = itinerary?.days_json || itinerary?.days || [];
  const socialCaption = itinerary?.social_post?.caption || itinerary?.social_caption;
  const socialHooks = itinerary?.social_post?.hooks || itinerary?.social_hooks || [];

  return (
    <div className="space-y-10 text-left">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#0F172A]">AI Itinerary Builder</h1>
          <p className="text-slate-500 mt-2 font-medium">Generate high-conversion Bento plans in under 2 minutes.</p>
        </div>
        <div className="flex space-x-3">
          {savedItineraries.length > 0 && (
            <button
              onClick={() => setItinerary(savedItineraries[0])}
              className="border border-slate-200 text-slate-600 px-5 py-3 rounded-xl font-bold text-sm flex items-center hover:bg-slate-50 transition-all"
            >
              <List size={18} className="mr-2" /> Saved ({savedItineraries.length})
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            disabled={loading}
            className="bg-[#14B8A6] text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest flex items-center shadow-lg shadow-[#14B8A6]/10 hover:scale-[1.02] transition-all disabled:opacity-50"
          >
            <Sparkles size={18} className="mr-2" fill="currentColor" /> {loading ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* Generation Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-extrabold text-[#0F172A]">New Itinerary</h2>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {leads.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Lead (optional)</label>
                  <select
                    value={form.lead_id || ''}
                    onChange={(e) => setForm({ ...form, lead_id: Number(e.target.value) || 0 })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                  >
                    <option value="">No specific lead</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.full_name || `Lead #${l.id}`} — {l.destination || 'N/A'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Destination *</label>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  placeholder="e.g. Dubai, Maldives, Rajasthan"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Duration (days)</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={form.duration_days}
                    onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Travelers</label>
                  <input
                    type="number"
                    min={1}
                    value={form.traveler_count}
                    onChange={(e) => setForm({ ...form, traveler_count: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Travel Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm({ ...form, style: s })}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        form.style === s
                          ? 'bg-[#14B8A6] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Budget Range (optional)</label>
                <input
                  type="text"
                  value={form.budget_range}
                  onChange={(e) => setForm({ ...form, budget_range: e.target.value })}
                  placeholder="e.g. ₹1,50,000 per person"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Travel Dates (optional)</label>
                <input
                  type="text"
                  value={form.travel_dates}
                  onChange={(e) => setForm({ ...form, travel_dates: e.target.value })}
                  placeholder="e.g. October 2025"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="mt-6 w-full bg-[#0F172A] text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              {loading ? (
                <><Loader size={18} className="animate-spin" /> Generating...</>
              ) : (
                <><Sparkles size={18} fill="currentColor" /> Generate Itinerary</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-24 text-center">
          <Loader size={40} className="animate-spin text-[#14B8A6] mx-auto mb-4" />
          <p className="text-slate-500 font-medium">AI is crafting your itinerary...</p>
        </div>
      )}

      {/* Empty state */}
      {!itinerary && !loading && (
        <div className="bg-white rounded-[40px] border-2 border-dashed border-slate-200 p-24 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <MapPin size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-400 mb-2 tracking-tight">No active itinerary selected</h3>
          <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed mb-6">
            Click "Generate with AI" to build a personalized travel plan for your client.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[#14B8A6] text-white px-8 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2 hover:bg-teal-600 transition-all"
          >
            <Plus size={18} /> Create your first itinerary
          </button>
        </div>
      )}

      {/* Itinerary Display */}
      {itinerary && !loading && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          <div className="xl:col-span-2 space-y-12">
            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <MapPin size={160} fill="currentColor" className="text-primary" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center space-x-2 text-[#14B8A6] font-black text-[10px] uppercase tracking-[0.3em] mb-4">
                  <Calendar size={12} />
                  <span>{itinerary.duration_days || form.duration_days} DAY {(itinerary.status || form.style || 'CUSTOM').toUpperCase()} EXPERIENCE</span>
                </div>
                <h2 className="text-3xl font-black text-[#0F172A] tracking-tighter mb-6">{itinerary.title}</h2>
                <div className="flex flex-wrap gap-8 text-slate-400 text-sm font-bold tracking-tight">
                  <div className="flex items-center"><Clock size={16} className="mr-2" /> {(itinerary.duration_days || form.duration_days) * 24} Hours</div>
                  <div className="flex items-center"><Info size={16} className="mr-2" /> {form.traveler_count} Travelers</div>
                  <div className="flex items-center text-[#14B8A6]">
                    <CreditCard size={16} className="mr-2" />
                    {itinerary.currency || 'INR'} {itinerary.total_price?.toLocaleString() || 0} Total
                  </div>
                </div>
              </div>
            </div>

            {days.map((day) => (
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
                  {day.blocks.map((block, idx) => (
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

          {/* Marketing Sidebar */}
          <div className="space-y-10 text-left">
            <div className="bg-[#0F172A] rounded-[40px] p-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#14B8A6]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center space-x-3 text-[#14B8A6] mb-8">
                  <Instagram size={24} />
                  <span className="font-black text-xs uppercase tracking-[0.3em]">Insta Post Generator</span>
                </div>
                {socialCaption && (
                  <>
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10 mb-8">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                        "{socialCaption}"
                      </p>
                    </div>
                    {socialHooks.length > 0 && (
                      <div className="space-y-4 mb-8">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viral Hooks</h4>
                        {socialHooks.map((hook: string, i: number) => (
                          <div key={i} className="flex items-start space-x-3">
                            <div className="w-5 h-5 bg-[#14B8A6] text-[#0F172A] rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">
                              {i + 1}
                            </div>
                            <p className="text-xs font-bold text-slate-200">{hook}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <button
                  onClick={handleCopyCaption}
                  disabled={!socialCaption}
                  className="w-full bg-[#14B8A6] text-[#0F172A] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#14B8A6]/10 hover:scale-[1.02] transition-transform disabled:opacity-40"
                >
                  {copied ? '✓ Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm text-left">
              <h3 className="text-xl font-black text-[#0F172A] tracking-tighter mb-6">Actions</h3>
              <div className="space-y-4">
                {bookingSuccess && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-emerald-700 text-xs font-bold">
                    ✓ {bookingSuccess}
                  </div>
                )}
                <button
                  onClick={() => setShowForm(true)}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-[#14B8A6]/5 hover:bg-[#14B8A6]/10 transition-colors group"
                >
                  <div className="flex items-center font-bold text-sm text-[#14B8A6]">
                    <Plus size={18} className="mr-3" /> New Itinerary
                  </div>
                  <ChevronRight size={16} className="text-[#14B8A6] group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={handleConvertToBooking}
                  disabled={bookingLoading || !itinerary?.id}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center font-bold text-sm text-green-700">
                    {bookingLoading ? <Loader size={18} className="mr-3 animate-spin" /> : <CreditCard size={18} className="mr-3" />}
                    Convert to Booking
                  </div>
                  <ChevronRight size={16} className="text-green-400 group-hover:text-green-600 transition-colors" />
                </button>
                <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <Download size={18} className="mr-3" /> Export as PDF
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                </button>
                <button className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group">
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <Share2 size={18} className="mr-3" /> Share with Client
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
