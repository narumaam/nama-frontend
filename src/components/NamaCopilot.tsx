"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import {
  Zap, X, Send, Paperclip, RotateCcw, Copy, Check,
  Sparkles, MessageSquare, FileText, DollarSign, Users, Plane,
  ArrowUpRight, Bot, ShieldAlert, CheckCircle2, XCircle
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActionRequired {
  type: string;
  display: string;
  params: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  streaming?: boolean;
  pendingAction?: ActionRequired | null;  // if set, show Approve/Reject UI
  actionResult?: 'approved' | 'rejected';  // outcome after user chooses
}

interface PaperclipContext {
  module: string;
  recentLeads: string[];
  recentItinerary: string | null;
  recentVendor: string | null;
}

// ─── Quick Action Chips ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Draft follow-up', icon: MessageSquare, prompt: 'Draft a warm follow-up message for my most recent lead who inquired about a honeymoon package.' },
  { label: 'Write itinerary', icon: Plane, prompt: 'Help me create a 7-night itinerary for Bali with a mix of culture, beaches, and adventure for a couple.' },
  { label: 'Price this trip', icon: DollarSign, prompt: 'Help me calculate a competitive price for a 7N Bali honeymoon package for 2 pax including hotel, transfers, and 2 experiences.' },
  { label: 'Qualify lead', icon: Users, prompt: 'What questions should I ask to quickly qualify a lead who asked about a Maldives family trip?' },
  { label: 'Write proposal', icon: FileText, prompt: 'Draft a compelling proposal opening paragraph for a luxury Maldives overwater villa experience for a family of 4.' },
  { label: 'Market insight', icon: Sparkles, prompt: 'What are the current travel trends for Indian outbound tourists for Q1 2025? Focus on Southeast Asia and Maldives.' },
];

// ─── Simulated AI Responses ───────────────────────────────────────────────────

const DEMO_RESPONSES: Record<string, string> = {
  'follow-up': `Here's a warm follow-up for your lead:

---
Hi [Name]! 👋

Hope you're doing well! Just checking in on your enquiry for the **honeymoon package** — have you had a chance to think about dates?

We have some amazing options ready for you and I'd love to share a personalised itinerary. This week we also have exclusive rates at 3 properties that I think you'll love.

Shall I send over a quick proposal? Won't take more than a few minutes to put together! 🌺

Warm regards,
[Your Name] | NAMA Travel
---

*Tip: Send within 24h of their last message for best response rates.*`,

  'itinerary': `**7-Night Bali Honeymoon — Culture, Beaches & Romance** ✈️

**Day 1 — Arrival & Seminyak**
Check into a private pool villa. Sunset drinks at Ku De Ta. Welcome dinner at Merah Putih.

**Day 2 — Ubud Highlands**
Morning rice terrace walk at Tegalalang. Cooking class at Casa Luna. Sacred Monkey Forest. Dinner at Locavore.

**Day 3 — Spiritual Bali**
Tirta Empul temple purification. Lunch at Alaya. Afternoon spa. Kecak fire dance at Uluwatu at sunset.

**Day 4 — Nusa Penida**
Full-day island tour: Kelingking Beach, Angel's Billabong, Crystal Bay snorkeling. Picnic lunch included.

**Day 5 — Beach Day**
Leisure morning at villa. Private beach club at Finns. Jimbaran Bay seafood dinner on the beach.

**Day 6 — Adventure**
White-water rafting on Ayung River. Afternoon ATV through rice paddies. Rooftop dinner at Merevale.

**Day 7 — Spa & Shopping**
Full-day Balinese spa retreat. Evening at Seminyak Square. Farewell dinner at Sarong.

**Day 8 — Departure**
Airport transfer. *Selamat jalan!* 🌺

*Want me to add pricing or hotel options?*`,

  'price': `**Bali Honeymoon Pricing Guide — 2 Pax, 7N/8D** 💰

| Component | Budget | Mid | Luxury |
|---|---|---|---|
| Hotel (7N) | ₹42,000 | ₹84,000 | ₹1,75,000 |
| Transfers | ₹8,000 | ₹12,000 | ₹18,000 |
| 2 Experiences | ₹6,000 | ₹14,000 | ₹28,000 |
| Meals (incl.) | ₹4,000 | ₹8,000 | ₹14,000 |
| **Net Cost** | **₹60,000** | **₹1,18,000** | **₹2,35,000** |
| Margin (25%) | ₹15,000 | ₹29,500 | ₹58,750 |
| **Sell Price** | **₹75,000** | **₹1,47,500** | **₹2,93,750** |

**Recommendation:** Pitch mid-tier first. Upsell to luxury by showing the villa difference.

*Add GST (5%) on top of sell price for final invoice.*`,

  'default': `Great question! As your NAMA Copilot, I can help you:

• **Draft messages** — follow-ups, proposals, confirmations
• **Build itineraries** — day-by-day plans for any destination
• **Price packages** — cost breakdowns + margin calculations
• **Qualify leads** — the right questions to ask
• **Market intel** — trends, demand signals, competitor insights

What would you like to work on today? 🚀`,
};

function getSimulatedResponse(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('follow-up') || lower.includes('message') || lower.includes('reply')) return DEMO_RESPONSES['follow-up'];
  if (lower.includes('itinerary') || lower.includes('day') || lower.includes('bali') || lower.includes('plan')) return DEMO_RESPONSES['itinerary'];
  if (lower.includes('price') || lower.includes('cost') || lower.includes('margin') || lower.includes('calculat')) return DEMO_RESPONSES['price'];
  return DEMO_RESPONSES['default'];
}

// ─── Context Builder ──────────────────────────────────────────────────────────

function buildContext(ctx: PaperclipContext): string {
  const parts = [`📍 Module: ${ctx.module}`];
  if (ctx.recentLeads.length > 0) parts.push(`👤 Recent leads: ${ctx.recentLeads.join(', ')}`);
  if (ctx.recentItinerary) parts.push(`🗺️ Last itinerary: ${ctx.recentItinerary}`);
  if (ctx.recentVendor) parts.push(`🏨 Last vendor: ${ctx.recentVendor}`);
  return parts.join(' · ');
}

function moduleFromPath(path: string): string {
  const map: Record<string, string> = {
    '/dashboard/leads': 'CRM / Leads',
    '/dashboard/itineraries': 'Itineraries',
    '/dashboard/quotations': 'Quotations',
    '/dashboard/bookings': 'Bookings',
    '/dashboard/vendors': 'Vendors',
    '/dashboard/comms': 'Communications',
    '/dashboard/documents': 'Documents Hub',
    '/dashboard/finance': 'Finance',
    '/dashboard/content': 'Content',
    '/dashboard/intentra': 'Intentra Intelligence',
    '/dashboard': 'Dashboard',
  };
  for (const [k, v] of Object.entries(map)) {
    if (path === k || path.startsWith(k + '/')) return v;
  }
  return 'Dashboard';
}

// ─── Copilot Component ────────────────────────────────────────────────────────

export default function NamaCopilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Paperclip context — reads from localStorage (set by other modules)
  const [ctx, setCtx] = useState<PaperclipContext>({
    module: 'Dashboard',
    recentLeads: [],
    recentItinerary: null,
    recentVendor: null,
  });

  // Update context when route changes
  useEffect(() => {
    const currentModule = moduleFromPath(pathname || '');
    try {
      const leads = JSON.parse(localStorage.getItem('nama_recent_leads') || '[]');
      const itinerary = localStorage.getItem('nama_recent_itinerary');
      const vendor = localStorage.getItem('nama_recent_vendor');
      setCtx({ module: currentModule, recentLeads: leads.slice(0, 3), recentItinerary: itinerary, recentVendor: vendor });
    } catch {
      setCtx(prev => ({ ...prev, module: currentModule }));
    }
  }, [pathname]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setShowQuickActions(false);
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '', ts: Date.now(), streaming: true }]);

    try {
      // Build history from current messages (exclude the new assistant placeholder)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const token = typeof window !== 'undefined' ? localStorage.getItem('nama_token') : null;
      const res = await fetch('/api/v1/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history,
          context: buildContext(ctx),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');

      let accumulated = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              accumulated += data.content;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m
              ));
            } else if (data.type === 'retract_suffix') {
              // Strip the ACTION_REQUIRED footer from display
              if (data.suffix) {
                accumulated = accumulated.replace(data.suffix, '').trimEnd();
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: accumulated } : m
                ));
              }
            } else if (data.type === 'action_required') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, pendingAction: data.action, streaming: false } : m
              ));
            } else if (data.type === 'done') {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, streaming: false } : m
              ));
            } else if (data.type === 'error') {
              accumulated = `⚠️ ${data.content || 'AI error'}`;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: accumulated, streaming: false } : m
              ));
            }
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch {
      // Fallback to demo responses if backend unavailable
      const responseText = getSimulatedResponse(text);
      let i = 0;
      const interval = setInterval(() => {
        i += 5;
        setMessages(prev => prev.map(m =>
          m.id === assistantId ? { ...m, content: responseText.slice(0, i), streaming: i < responseText.length } : m
        ));
        if (i >= responseText.length) { clearInterval(interval); }
      }, 16);
    } finally {
      setLoading(false);
      setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, streaming: false } : m));
    }
  }, [loading, messages, ctx]);

  // ── Write-Action Confirmation handlers ───────────────────────────────────────

  async function handleActionApprove(msgId: string, action: ActionRequired) {
    // Optimistically mark as approved in the message
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, pendingAction: null, actionResult: 'approved' } : m
    ));

    // Execute the action by calling the relevant API
    try {
      const { type, params } = action;
      let successMsg = '✅ Done!';

      if (type === 'UPDATE_LEAD_STATUS' || type === 'MARK_CONTACTED') {
        const leadId = params.lead_id;
        const status = params.status ?? 'CONTACTED';
        await fetch(`/api/v1/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nama_token')}` },
          body: JSON.stringify({ status }),
        });
        successMsg = `✅ Lead status updated to **${status}**.`;
      } else if (type === 'SEND_QUOTE') {
        const quoteId = params.quote_id ?? params.quotation_id;
        await fetch(`/api/v1/quotations/${quoteId}/send`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('nama_token')}` },
        });
        successMsg = `✅ Quotation sent to client.`;
      } else if (type === 'ARCHIVE_LEAD') {
        const leadId = params.lead_id;
        await fetch(`/api/v1/leads/${leadId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nama_token')}` },
          body: JSON.stringify({ status: 'LOST' }),
        });
        successMsg = `✅ Lead archived.`;
      } else {
        successMsg = `✅ Action **${type}** completed.`;
      }

      const ackMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: successMsg,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, ackMsg]);
    } catch {
      const errMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ Action failed — please try again or do it manually in the relevant module.`,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    }
  }

  function handleActionReject(msgId: string) {
    setMessages(prev => prev.map(m =>
      m.id === msgId ? { ...m, pendingAction: null, actionResult: 'rejected' } : m
    ));
    const ackMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `OK, no action taken. Let me know if you'd like to do something else.`,
      ts: Date.now(),
    };
    setMessages(prev => [...prev, ackMsg]);
  }

  function handleCopy(content: string, id: string) {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleReset() {
    setMessages([]);
    setInput('');
    setShowQuickActions(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Pulse ring when closed */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0891b2] text-white shadow-2xl hover:shadow-[0_0_30px_rgba(20,184,166,0.5)] transition-all duration-300 hover:scale-110 flex items-center justify-center group"
            title="NAMA Copilot"
          >
            <div className="absolute inset-0 rounded-full bg-[#14B8A6] animate-ping opacity-20" />
            <Bot size={24} />
            {messages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#F59E0B] text-[10px] font-black text-white flex items-center justify-center">
                {messages.filter(m => m.role === 'assistant').length}
              </span>
            )}
          </button>
        )}

        {/* Chat Panel */}
        {open && (
          <div className="w-[400px] h-[580px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#0f172a] to-[#1e3a5f] text-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#14B8A6]/20 border border-[#14B8A6]/40 flex items-center justify-center">
                  <Bot size={16} className="text-[#14B8A6]" />
                </div>
                <div>
                  <div className="font-bold text-sm leading-none">NAMA Copilot</div>
                  <div className="text-[10px] text-[#14B8A6] mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] inline-block animate-pulse" />
                    AI-powered · Paperclip context
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={handleReset} title="New conversation" className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <RotateCcw size={14} />
                </button>
                <button onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Paperclip Context Bar */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
              <Paperclip size={11} className="text-[#14B8A6] flex-shrink-0" />
              <span className="text-[10px] text-slate-500 truncate font-medium">{buildContext(ctx)}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && showQuickActions && (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#14B8A6]/20 to-[#0891b2]/20 flex items-center justify-center mx-auto mb-2">
                      <Zap size={18} className="text-[#14B8A6]" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Your AI travel business assistant</p>
                    <p className="text-[11px] text-slate-400 mt-1">Context-aware · Fast · Always available</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_ACTIONS.map(({ label, icon: Icon, prompt }) => (
                      <button
                        key={label}
                        onClick={() => sendMessage(prompt)}
                        className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:border-[#14B8A6]/40 hover:bg-[#14B8A6]/5 text-left text-xs font-semibold text-slate-700 transition-all group"
                      >
                        <Icon size={13} className="text-[#14B8A6] flex-shrink-0" />
                        <span>{label}</span>
                        <ArrowUpRight size={10} className="ml-auto text-slate-300 group-hover:text-[#14B8A6] transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#14B8A6] to-[#0891b2] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] group relative ${msg.role === 'user' ? 'bg-[#0f172a] text-white rounded-2xl rounded-tr-sm' : 'bg-slate-50 text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'} px-3 py-2.5`}>
                    <div className="text-xs leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                      {msg.streaming && <span className="inline-block w-1.5 h-3.5 bg-[#14B8A6] ml-0.5 animate-pulse rounded-sm" />}
                    </div>

                    {/* ── REQUIRES_CONFIRMATION action card ────────────── */}
                    {msg.pendingAction && !msg.actionResult && (
                      <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                        <div className="flex items-start gap-2 mb-2">
                          <ShieldAlert size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wide">Action Requires Confirmation</p>
                            <p className="text-xs text-amber-800 mt-0.5">{msg.pendingAction.display}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleActionApprove(msg.id, msg.pendingAction!)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors"
                          >
                            <CheckCircle2 size={11} /> Approve
                          </button>
                          <button
                            onClick={() => handleActionReject(msg.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 text-[11px] font-bold transition-colors"
                          >
                            <XCircle size={11} /> Reject
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Outcome badge after decision */}
                    {msg.actionResult === 'approved' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold">
                        <CheckCircle2 size={10} /> Action approved
                      </div>
                    )}
                    {msg.actionResult === 'rejected' && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                        <XCircle size={10} /> Action rejected
                      </div>
                    )}

                    {msg.role === 'assistant' && !msg.streaming && !msg.pendingAction && (
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="absolute -bottom-5 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"
                      >
                        {copied === msg.id ? <Check size={9} className="text-green-500" /> : <Copy size={9} />}
                        {copied === msg.id ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-slate-100">
              <div className="flex items-end gap-2 bg-slate-50 rounded-xl border border-slate-200 focus-within:border-[#14B8A6] transition-colors px-3 py-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (⏎ to send)"
                  rows={1}
                  className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none max-h-20"
                  style={{ lineHeight: '1.5' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-7 h-7 rounded-lg bg-[#14B8A6] disabled:bg-slate-200 text-white disabled:text-slate-400 flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#0d9488]"
                >
                  <Send size={13} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-1.5 px-1">
                <span className="text-[10px] text-slate-400">Shift+Enter for new line</span>
                <span className="text-[10px] text-slate-400">
                  {typeof window !== 'undefined' && localStorage.getItem('nama_token') ? 'NAMA Copilot · Live AI' : 'NAMA Copilot · Demo mode'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
