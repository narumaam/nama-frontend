"use client";

import React, { useState, useEffect, useCallback } from 'react';
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
  Tag,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import { BentoCard } from '@/components/BentoCard';
import { itinerariesApi, leadsApi, bookingsApi, vendorsApi, ItineraryOut, Lead, ItineraryRequest, ItineraryBlock, RateLookupResult, Vendor } from '@/lib/api';
import ProductTour from '@/components/ProductTour';
import { ITINERARY_TOUR, isTourDone, markTourDone } from '@/lib/tour';

const STYLES = ['Luxury', 'Adventure', 'Cultural', 'Family', 'Budget', 'Wellness'];

// ── Seed itineraries (shown when backend is empty or unreachable) ──────────────
const ITS = (d: number) => new Date(Date.now() - d * 86400000).toISOString()
const SEED_ITINERARIES: ItineraryOut[] = [
  {
    id: 1, tenant_id: 1, lead_id: 2, status: 'DRAFT', currency: 'INR',
    title: '7-Day Maldives Luxury Escape',
    destination: 'Maldives', duration_days: 7, total_price: 504000,
    created_at: ITS(1),
    agent_reasoning: 'Tailored for honeymoon couple with a luxury travel style and ₹2.5L/person budget. Selected over-water bungalow resorts with direct speedboat transfers and curated sunset experiences.',
    social_caption: '✨ 7 nights of pure paradise — where the Indian Ocean meets absolute luxury. Your own private overwater villa, sunrise yoga, and dinner under a million stars. 🌊🌅 #MaldivesDream #LuxuryTravel #NAMA',
    social_hooks: ['What if your floor was the ocean?', 'She said yes in the Maldives 💍', 'This is what ₹5L looks like in paradise'],
    days_json: [
      { day_number: 1, title: 'Arrival & Welcome', narrative: 'Private seaplane transfer from Malé to your resort. Champagne check-in.', blocks: [
        { type: 'FLIGHT', title: 'IndiGo 6E-501 BOM→MLE', description: 'Economy class. Check-in 3 hrs early.', price_gross: 32000, currency: 'INR' },
        { type: 'TRANSFER', title: 'Seaplane Transfer', description: 'Trans Maldivian Airways — 25 min scenic flight to resort.', price_gross: 18000, currency: 'INR' },
        { type: 'HOTEL', title: 'Overwater Bungalow – Niyama Private Islands', description: 'King bedroom, private deck, direct ocean access. Breakfast included.', price_gross: 45000, currency: 'INR' },
      ]},
      { day_number: 2, title: 'Reef Snorkel & Spa', narrative: 'Morning house reef snorkel, afternoon couples spa, candlelight dinner on the sandbank.', blocks: [
        { type: 'ACTIVITY', title: 'House Reef Guided Snorkel', description: '2-hr guided snorkel with marine biologist. Equipment included.', price_gross: 6000, currency: 'INR' },
        { type: 'ACTIVITY', title: 'Couples Spa — 90 min', description: 'Balinese massage + hot stone therapy with ocean views.', price_gross: 14000, currency: 'INR' },
        { type: 'MEAL', title: 'Sandbank Dinner', description: 'Private 5-course dinner on a secluded sandbank. Butler service.', price_gross: 22000, currency: 'INR' },
      ]},
      { day_number: 3, title: 'Scuba & Sunset Cruise', narrative: 'Intro scuba for beginners, followed by a sunset dolphin cruise.', blocks: [
        { type: 'ACTIVITY', title: 'Intro Scuba Dive', description: 'PADI certified instructor. 40-min dive to 6m depth with reef fish.', price_gross: 9500, currency: 'INR' },
        { type: 'ACTIVITY', title: 'Sunset Dolphin Cruise', description: '90-min dhoni cruise. Dolphins sighted 95% of evenings.', price_gross: 8000, currency: 'INR' },
        { type: 'HOTEL', title: 'Niyama Private Islands', description: 'Night 3 of 7. Overwater Bungalow.', price_gross: 45000, currency: 'INR' },
      ]},
    ],
  },
  {
    id: 2, tenant_id: 1, lead_id: 4, status: 'SENT', currency: 'INR',
    title: '12-Day Kenya Wildlife Safari',
    destination: 'Kenya', duration_days: 12, total_price: 802400,
    created_at: ITS(5),
    agent_reasoning: 'Group of 6, wildlife travel style, ₹4.5L/person. Combines Big Five in Masai Mara with coastal Mombasa to maximise diverse experiences. Peak great migration window (July–Sept).',
    social_caption: '🦁 The Maasai Mara at sunrise — silence broken only by a lion\'s roar. 12 days. 6 friends. One continent that changes you forever. 🌍 #KenyaSafari #WildlifeMagic #NAMA',
    social_hooks: ['We watched a lioness hunt at 6am', '1,000 wildebeest crossed right in front of us', 'This is what ₹8L looks like in Africa'],
    days_json: [
      { day_number: 1, title: 'Nairobi Arrival', narrative: 'Night flight from Mumbai. Hotel transfer and acclimatisation day.', blocks: [
        { type: 'FLIGHT', title: 'Kenya Airways KQ-101 BOM→NBO', description: 'Direct overnight flight. Departs 22:45.', price_gross: 58000, currency: 'INR' },
        { type: 'HOTEL', title: 'Nairobi Serena Hotel', description: 'Superior Room. Pool access. Airport transfer included.', price_gross: 12000, currency: 'INR' },
      ]},
      { day_number: 2, title: 'Masai Mara Drive', narrative: '8-hour road transfer to Masai Mara with game viewing en route.', blocks: [
        { type: 'TRANSFER', title: 'Nairobi to Masai Mara — Safari Vehicle', description: 'Luxury 4×4 Land Cruiser, guide included, picnic lunch.', price_gross: 8500, currency: 'INR' },
        { type: 'HOTEL', title: 'Mahali Mzuri — Tented Camp', description: 'Luxury tented suite with Mara valley views. Full board.', price_gross: 28000, currency: 'INR' },
        { type: 'ACTIVITY', title: 'Evening Game Drive', description: '3-hr sunset game drive with private guide. Gin & tonic sundowner.', price_gross: 5000, currency: 'INR' },
      ]},
    ],
  },
  {
    id: 3, tenant_id: 1, lead_id: 1, status: 'DRAFT', currency: 'INR',
    title: '7-Day Royal Rajasthan Discovery',
    destination: 'Rajasthan', duration_days: 7, total_price: 317200,
    created_at: ITS(0),
    agent_reasoning: 'Cultural style, family of 4, ₹75K/person. Heritage havelis, camel safari, and jaipur cooking class. March travel window — cool, dry, ideal for sightseeing.',
    social_caption: '🏰 From the Pink City to the Blue City — Rajasthan is not a destination, it\'s a time machine. Forts, camels, spice markets, and starlit desert camps. 🐪🌟 #RoyalRajasthan #IncredibleIndia #NAMA',
    social_hooks: ['Slept in a 400-year-old palace', 'Sunrise camel ride in Jaisalmer', 'Why Delhi is just the intro — Rajasthan is the book'],
    days_json: [
      { day_number: 1, title: 'Jaipur — Pink City', narrative: 'Arrive Jaipur. Hawa Mahal sunrise visit, Amber Fort by elephant, old city market.', blocks: [
        { type: 'FLIGHT', title: 'IndiGo DEL→JAI', description: '1-hr morning flight. Convenient for Mumbai connections.', price_gross: 6800, currency: 'INR' },
        { type: 'ACTIVITY', title: 'Amber Fort & City Palace', description: 'Half-day heritage tour with licensed ASI guide.', price_gross: 3200, currency: 'INR' },
        { type: 'HOTEL', title: 'Taj Rambagh Palace', description: 'Deluxe room. Former royal hunting lodge. UNESCO World Heritage.', price_gross: 22000, currency: 'INR' },
      ]},
      { day_number: 2, title: 'Jaisalmer — Desert Gateway', narrative: 'Morning flight to Jaisalmer. Golden Fort exploration, sunset camel safari.', blocks: [
        { type: 'FLIGHT', title: 'SpiceJet JAI→JSA', description: 'Domestic connection. 1 hr 10 min.', price_gross: 5500, currency: 'INR' },
        { type: 'ACTIVITY', title: 'Camel Safari & Desert Camp', description: '2-hr camel trek to Sam Sand Dunes. Overnight luxury camp with cultural performance.', price_gross: 8500, currency: 'INR' },
        { type: 'HOTEL', title: 'Suryagarh — Desert Fort Hotel', description: 'Pool villa with dune views. Award-winning Rajasthani cuisine.', price_gross: 18000, currency: 'INR' },
      ]},
    ],
  },
]

const fmt = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

function generateProposalHTML(it: ItineraryOut): string {
  const days = it.days_json || (it as any).days || [];
  const totalFormatted = fmt(it.total_price || 0, it.currency || 'INR');
  const dayRows = days.map((d: any) => `
    <div class="day">
      <div class="day-header">Day ${d.day_number} — ${d.title}</div>
      <p class="day-narrative">${d.narrative || ''}</p>
      ${(d.blocks || []).map((b: any) => `
        <div class="block">
          <span class="block-type ${(b.type||'').toLowerCase()}">${b.type || ''}</span>
          <strong>${b.title || ''}</strong>
          <span class="block-desc">${b.description || ''}</span>
          ${b.price_gross ? `<span class="block-price">${fmt(b.price_gross, b.currency || it.currency || 'INR')}</span>` : ''}
        </div>
      `).join('')}
    </div>
  `).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${it.title}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;padding:40px;max-width:860px;margin:0 auto}
    .header{border-bottom:3px solid #14B8A6;padding-bottom:24px;margin-bottom:32px}
    .brand{font-size:11px;font-weight:900;letter-spacing:4px;color:#14B8A6;text-transform:uppercase;margin-bottom:8px}
    h1{font-size:28px;font-weight:900;color:#0f172a;line-height:1.2;margin-bottom:8px}
    .meta{display:flex;gap:24px;font-size:13px;color:#64748b;margin-top:12px;flex-wrap:wrap}
    .meta span{display:flex;align-items:center;gap:6px}
    .meta strong{color:#1e293b}
    .reasoning{background:#f0fdfb;border-left:4px solid #14B8A6;padding:16px 20px;margin-bottom:32px;border-radius:0 8px 8px 0}
    .reasoning p{font-size:13px;color:#0f766e;line-height:1.6}
    .day{margin-bottom:28px;break-inside:avoid}
    .day-header{background:#0f172a;color:#14B8A6;font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:10px 16px;border-radius:8px 8px 0 0}
    .day-narrative{font-size:13px;color:#475569;padding:12px 16px;background:#f8fafc;line-height:1.6;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0}
    .block{display:flex;align-items:baseline;gap:10px;padding:10px 16px;border:1px solid #e2e8f0;border-top:none;flex-wrap:wrap}
    .block:last-child{border-radius:0 0 8px 8px}
    .block-type{font-size:9px;font-weight:900;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:4px;background:#f1f5f9;color:#64748b;flex-shrink:0}
    .block-type.hotel{background:#fef3c7;color:#92400e}
    .block-type.flight{background:#dbeafe;color:#1d4ed8}
    .block-type.transfer{background:#f3e8ff;color:#7e22ce}
    .block-type.activity{background:#dcfce7;color:#166534}
    .block-type.meal{background:#fce7f3;color:#9d174d}
    .block strong{font-size:13px;color:#1e293b;flex:1}
    .block-desc{font-size:12px;color:#94a3b8;flex-basis:100%;padding-left:0;margin-top:2px}
    .block-price{font-size:13px;font-weight:700;color:#14B8A6;white-space:nowrap;margin-left:auto}
    .total{margin-top:32px;padding:20px 24px;background:#0f172a;border-radius:12px;display:flex;justify-content:space-between;align-items:center}
    .total-label{font-size:12px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#94a3b8}
    .total-value{font-size:24px;font-weight:900;color:#14B8A6}
    .footer{margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center}
    @media print{body{padding:20px}button{display:none}}
  </style></head><body>
  <div class="header">
    <div class="brand">NAMA OS — Travel Proposal</div>
    <h1>${it.title}</h1>
    <div class="meta">
      <span>📍 <strong>${it.destination}</strong></span>
      <span>📅 <strong>${it.duration_days} days</strong></span>
      <span>🗓️ <strong>${new Date(it.created_at || Date.now()).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</strong></span>
    </div>
  </div>
  ${it.agent_reasoning ? `<div class="reasoning"><p>${it.agent_reasoning}</p></div>` : ''}
  ${dayRows}
  <div class="total">
    <span class="total-label">Total Package Value</span>
    <span class="total-value">${totalFormatted}</span>
  </div>
  <div class="footer">Prepared exclusively for you by NAMA OS · getnama.app · Powered by AI Travel Intelligence</div>
  </body></html>`;
}

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Vendor data (for rate lookup)
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Block editor state
  const [editingBlock, setEditingBlock] = useState<{
    dayIndex: number;
    blockIndex: number;
    block: ItineraryBlock;
    dayDate: string; // YYYY-MM-DD used for rate lookup
  } | null>(null);
  const [rateLookupState, setRateLookupState] = useState<{
    loading: boolean;
    result: RateLookupResult | null;
  }>({ loading: false, result: null });

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
    loadVendors();
  }, []);

  // Tour trigger — first visit only
  useEffect(() => {
    if (!isTourDone('itinerary')) {
      const t = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const loadVendors = async () => {
    try {
      const data = await vendorsApi.list({ status: 'ACTIVE' });
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      // Non-critical — vendor dropdown degrades gracefully
    }
  };

  const loadSavedItineraries = async () => {
    try {
      const data = await itinerariesApi.list();
      const list = Array.isArray(data) && data.length > 0 ? data : SEED_ITINERARIES;
      setSavedItineraries(list);
      // Auto-display first itinerary so the page is never blank
      if (!itinerary) setItinerary(list[0]);
    } catch {
      setSavedItineraries(SEED_ITINERARIES);
      if (!itinerary) setItinerary(SEED_ITINERARIES[0]);
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

  // Called when user selects a vendor in the block editor
  const handleVendorChange = useCallback(async (vendorId: number, dayDate: string, blockType: string) => {
    if (!vendorId) {
      setRateLookupState({ loading: false, result: null });
      return;
    }
    setRateLookupState({ loading: true, result: null });
    try {
      const result = await itinerariesApi.rateLookup({
        vendor_id: vendorId,
        date: dayDate,
        category: blockType || undefined,
      });
      setRateLookupState({ loading: false, result });
    } catch {
      setRateLookupState({ loading: false, result: { found: false, message: 'Rate lookup failed — enter manually' } });
    }
  }, []);

  // Apply the suggested rate to the current editing block
  const handleApplyRate = useCallback(() => {
    if (!editingBlock || !rateLookupState.result?.found) return;
    const rate = rateLookupState.result;
    setEditingBlock((prev) => prev ? {
      ...prev,
      block: {
        ...prev.block,
        price_gross: rate.price_gross ?? prev.block.price_gross,
        currency: rate.currency ?? prev.block.currency,
        vendor_rate_id: rate.rate_id,
      },
    } : null);
  }, [editingBlock, rateLookupState.result]);

  // Save edited block back into the active itinerary's days_json (local state)
  const handleSaveBlock = useCallback(() => {
    if (!editingBlock || !itinerary) return;
    const days = (itinerary.days_json || itinerary.days || []).map((d, di) => {
      if (di !== editingBlock.dayIndex) return d;
      return {
        ...d,
        blocks: d.blocks.map((b, bi) =>
          bi === editingBlock.blockIndex ? { ...editingBlock.block } : b
        ),
      };
    });
    setItinerary({ ...itinerary, days_json: days });
    setEditingBlock(null);
    setRateLookupState({ loading: false, result: null });
  }, [editingBlock, itinerary]);

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

  const handleExportPDF = () => {
    if (!itinerary) return;
    setPdfLoading(true);
    try {
      const html = generateProposalHTML(itinerary);
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => {
          win.print();
          setPdfLoading(false);
        }, 600);
      } else {
        setPdfLoading(false);
        setShareToast('Pop-up blocked — please allow pop-ups and try again.');
        setTimeout(() => setShareToast(null), 3500);
      }
    } catch {
      setPdfLoading(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!itinerary) return;
    const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: itinerary.currency || 'INR', maximumFractionDigits: 0 }).format(itinerary.total_price || 0);
    const text = `✈️ *${itinerary.title}*\n\n📍 Destination: ${itinerary.destination}\n📅 Duration: ${itinerary.duration_days} days\n💰 Total: ${totalFormatted}\n\nYour personalised travel itinerary is ready! Please reply to confirm and we'll lock in your booking.\n\n_Sent via NAMA OS_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    setShareToast('WhatsApp opened with your proposal!');
    setTimeout(() => setShareToast(null), 3000);
  };

  const handleCopyShareText = () => {
    if (!itinerary) return;
    const totalFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: itinerary.currency || 'INR', maximumFractionDigits: 0 }).format(itinerary.total_price || 0);
    const shareLink = typeof window !== 'undefined' ? `${window.location.origin}/proposal/${itinerary.id}` : `/proposal/${itinerary.id}`;
    const text = `✈️ ${itinerary.title}\n📍 ${itinerary.destination} · ${itinerary.duration_days} days · ${totalFormatted}\n\nView your personalised itinerary: ${shareLink}\n\nReply to confirm and we'll lock in your booking!`;
    navigator.clipboard.writeText(text);
    setShareToast('Share link + summary copied!');
    setTimeout(() => setShareToast(null), 2500);
  };

  const handleOpenProposalView = () => {
    if (!itinerary?.id) return;
    window.open(`/proposal/${itinerary.id}`, '_blank');
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
            data-tour="itinerary-generate"
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

      {/* Block Editor Modal */}
      {editingBlock && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] p-8 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-[#0F172A]">Edit Block</h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Day {editingBlock.dayIndex + 1} · {editingBlock.block.type}
                </p>
              </div>
              <button
                onClick={() => { setEditingBlock(null); setRateLookupState({ loading: false, result: null }); }}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editingBlock.block.title}
                  onChange={(e) => setEditingBlock((prev) => prev ? { ...prev, block: { ...prev.block, title: e.target.value } } : null)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingBlock.block.description}
                  onChange={(e) => setEditingBlock((prev) => prev ? { ...prev, block: { ...prev.block, description: e.target.value } } : null)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm resize-none"
                />
              </div>

              {/* Vendor selector + Rate lookup */}
              <div data-tour="itinerary-rate">
              {vendors.length > 0 && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Vendor (optional)</label>
                  <select
                    value={editingBlock.block.vendor_id ?? ''}
                    onChange={(e) => {
                      const vid = Number(e.target.value) || 0;
                      setEditingBlock((prev) => prev ? { ...prev, block: { ...prev.block, vendor_id: vid || undefined } } : null);
                      if (vid) handleVendorChange(vid, editingBlock.dayDate, editingBlock.block.type);
                      else setRateLookupState({ loading: false, result: null });
                    }}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm"
                  >
                    <option value="">— No vendor selected —</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.city ? `· ${v.city}` : ''} [{v.category}]
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Rate lookup feedback */}
              {rateLookupState.loading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm bg-slate-50 rounded-xl px-4 py-3">
                  <Loader size={14} className="animate-spin text-[#14B8A6]" />
                  <span>Looking up rate card…</span>
                </div>
              )}

              {!rateLookupState.loading && rateLookupState.result?.found && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-teal-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-teal-700">
                      Rate found: {fmt(rateLookupState.result.price_gross ?? 0, rateLookupState.result.currency ?? 'INR')}
                      {rateLookupState.result.season ? ` (${rateLookupState.result.season} season)` : ''}
                    </p>
                    {rateLookupState.result.description && (
                      <p className="text-xs text-teal-600 mt-0.5 truncate">{rateLookupState.result.description}</p>
                    )}
                    {rateLookupState.result.price_gross_child != null && (
                      <p className="text-xs text-teal-500 mt-0.5">
                        Child rate: {fmt(rateLookupState.result.price_gross_child, rateLookupState.result.currency ?? 'INR')}
                        {rateLookupState.result.child_age_min != null && rateLookupState.result.child_age_max != null
                          ? ` (ages ${rateLookupState.result.child_age_min}–${rateLookupState.result.child_age_max})`
                          : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleApplyRate}
                    className="text-xs font-black text-[#14B8A6] uppercase tracking-wide whitespace-nowrap hover:underline"
                  >
                    Apply
                  </button>
                </div>
              )}

              {!rateLookupState.loading && rateLookupState.result?.found === false && (
                <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <AlertCircle size={13} />
                  {rateLookupState.result.message ?? 'No rate on file — enter manually'}
                </div>
              )}
              </div>{/* /data-tour="itinerary-rate" */}

              {/* Price (gross) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Price (gross)
                    {editingBlock.block.vendor_rate_id && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-black text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <Tag size={9} /> Rate locked
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editingBlock.block.price_gross}
                    onChange={(e) => setEditingBlock((prev) => prev ? { ...prev, block: { ...prev.block, price_gross: Number(e.target.value), vendor_rate_id: undefined } } : null)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Currency</label>
                  <select
                    value={editingBlock.block.currency}
                    onChange={(e) => setEditingBlock((prev) => prev ? { ...prev, block: { ...prev.block, currency: e.target.value } } : null)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none text-sm"
                  >
                    {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'THB'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => { setEditingBlock(null); setRateLookupState({ loading: false, result: null }); }}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBlock}
                className="flex-1 py-3 rounded-2xl bg-[#0F172A] text-white font-black text-sm uppercase tracking-wide hover:bg-slate-700 transition-all"
              >
                Save Block
              </button>
            </div>
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

            {days.map((day, dayIdx) => {
              // Derive a date string for this day based on travel_dates or fallback to today
              const baseDateStr = (() => {
                const raw = form.travel_dates;
                if (raw) {
                  // Try to parse a start date from free-text like "2025-10-15" or "October 2025"
                  const match = raw.match(/(\d{4}-\d{2}-\d{2})/);
                  if (match) {
                    const base = new Date(match[1]);
                    base.setDate(base.getDate() + dayIdx);
                    return base.toISOString().slice(0, 10);
                  }
                }
                // Fallback: today + day offset
                const d = new Date();
                d.setDate(d.getDate() + dayIdx);
                return d.toISOString().slice(0, 10);
              })();

              return (
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
                      <div key={idx} className="relative group" {...(dayIdx === 0 && idx === 0 ? { 'data-tour': 'itinerary-rate' } : {})}>
                        <BentoCard
                          type={block.type}
                          title={block.title}
                          description={block.description}
                          price={block.price_gross}
                          currency={block.currency}
                        />
                        {/* Rate locked badge */}
                        {block.vendor_rate_id && (
                          <div className="absolute top-3 left-3 flex items-center gap-1 text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                            <Tag size={8} /> Rate locked
                          </div>
                        )}
                        {/* Edit block button */}
                        <button
                          onClick={() => {
                            setRateLookupState({ loading: false, result: null });
                            setEditingBlock({ dayIndex: dayIdx, blockIndex: idx, block: { ...block }, dayDate: baseDateStr });
                          }}
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-slate-200 rounded-lg p-1.5 shadow-sm hover:bg-slate-50"
                          title="Edit block"
                        >
                          <Edit3 size={13} className="text-slate-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
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
                <button
                  onClick={handleExportPDF}
                  disabled={pdfLoading || !itinerary}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group disabled:opacity-40"
                >
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    {pdfLoading ? <Loader size={18} className="mr-3 animate-spin" /> : <Download size={18} className="mr-3" />}
                    Export as PDF
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  disabled={!itinerary}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-green-50 hover:bg-green-100 transition-colors group disabled:opacity-40"
                >
                  <div className="flex items-center font-bold text-sm text-green-700">
                    <Share2 size={18} className="mr-3" /> WhatsApp Proposal
                  </div>
                  <ChevronRight size={16} className="text-green-400 group-hover:text-green-600 transition-colors" />
                </button>
                <button
                  onClick={handleOpenProposalView}
                  disabled={!itinerary}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-[#14B8A6]/5 hover:bg-[#14B8A6]/10 transition-colors group disabled:opacity-40"
                >
                  <div className="flex items-center font-bold text-sm text-[#14B8A6]">
                    <Share2 size={18} className="mr-3" /> Client View ↗
                  </div>
                  <ChevronRight size={16} className="text-[#14B8A6]/40 group-hover:text-[#14B8A6] transition-colors" />
                </button>
                <button
                  onClick={handleCopyShareText}
                  disabled={!itinerary}
                  className="w-full flex justify-between items-center p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors group disabled:opacity-40"
                >
                  <div className="flex items-center font-bold text-sm text-slate-600">
                    <Download size={18} className="mr-3" /> Copy Share Link
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share / PDF Toast */}
      {shareToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-semibold animate-in slide-in-from-bottom-4">
          <span className="text-[#14B8A6]">✓</span>
          {shareToast}
        </div>
      )}

      {/* Product Tour — first visit only */}
      {showTour && (
        <ProductTour
          steps={ITINERARY_TOUR}
          startDelay={0}
          onDone={() => {
            setShowTour(false);
            markTourDone('itinerary');
          }}
        />
      )}
    </div>
  );
}
