"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { Zap, ArrowRight, Copy, Check as CheckIcon, Key, Clock, Users, TrendingDown, TrendingUp, Info } from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────────
const MANUAL_MIN = { leads: 20, itins: 180, comms: 12, bids: 45 } as const;
const REVIEW_MIN = { leads: 2,  itins: 8,   comms: 1,  bids: 3  } as const;

const AI_COST = {
  'claude-haiku':   { input: 0.25,  output: 0.125 },
  'claude-sonnet':  { input: 3.00,  output: 1.50  },
  'gpt-4o-mini':    { input: 0.15,  output: 0.60  },
  'gpt-4o':         { input: 2.50,  output: 10.00 },
  'gemini-flash':   { input: 0.075, output: 0.30  },
  'gemini-pro':     { input: 1.25,  output: 5.00  },
} as const;
type ModelKey = keyof typeof AI_COST;

const NAMA_MARKUP = 2.5;  // NAMA charges 2.5x API cost for hosted AI
const USD_INR = 84.5;

// Approximate tokens per task (input+output combined)
const TOKENS = { leads: 1200, itins: 4500, comms: 800, bids: 2200 } as const;

const PLANS = [
  { id: 'starter', name: 'Starter', price: 4999  },
  { id: 'growth',  name: 'Growth',  price: 14999 },
  { id: 'scale',   name: 'Scale',   price: 39999 },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function fmtH(h: number) {
  if (h >= 160) return `${(h / 160).toFixed(1)} FTE-months`;
  if (h > 1)    return `${h.toFixed(1)} hrs`;
  return `${Math.round(h * 60)} min`;
}

function Slider({
  label, min, max, step, value, onChange, format,
  tooltip,
}: {
  label: string; min: number; max: number; step: number;
  value: number; onChange: (v: number) => void;
  format: (v: number) => string; tooltip?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-slate-300 flex items-center gap-1.5">
          {label}
          {tooltip && (
            <span title={tooltip} className="text-slate-600 cursor-help">
              <Info size={12} />
            </span>
          )}
        </span>
        <span className="text-sm font-black text-[#14B8A6]">{format(value)}</span>
      </div>
      <div className="relative h-2 bg-slate-700 rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#14B8A6] to-teal-400 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-2"
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
        <span>{format(min)}</span><span>{format(max)}</span>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, sub, color, icon: Icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ElementType;
}) {
  return (
    <div className={`bg-white/[0.04] border ${color || 'border-white/10'} rounded-2xl p-4`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">{label}</p>
        {Icon && <Icon size={14} className="text-slate-600 mt-0.5" />}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main Calculator ────────────────────────────────────────────────────────────
export default function ByokCalculatorPage() {
  const [leads,   setLeads]   = useState(200);
  const [itins,   setItins]   = useState(80);
  const [comms,   setComms]   = useState(300);
  const [bids,    setBids]    = useState(50);
  const [agents,  setAgents]  = useState(3);
  const [rate,    setRate]    = useState(350);  // ₹/hour
  const [model,   setModel]   = useState<ModelKey>('claude-haiku');
  const [planId,  setPlanId]  = useState('growth');
  const [copied,  setCopied]  = useState(false);

  const plan = PLANS.find((p) => p.id === planId)!;

  // ── Calculations ──────────────────────────────────────────────────────────
  // 1. Manual time saved per month (hours)
  const hLeads = leads * (MANUAL_MIN.leads - REVIEW_MIN.leads) / 60;
  const hItins = itins * (MANUAL_MIN.itins - REVIEW_MIN.itins) / 60;
  const hComms = comms * (MANUAL_MIN.comms - REVIEW_MIN.comms) / 60;
  const hBids  = bids  * (MANUAL_MIN.bids  - REVIEW_MIN.bids)  / 60;
  const totalHoursSaved = hLeads + hItins + hComms + hBids;
  const manualSavingsINR = totalHoursSaved * rate * agents;

  // 2. BYOK AI cost (actual API cost)
  const mc = AI_COST[model];
  // approximate: 60% input tokens, 40% output tokens
  function aiCostUSD(tasks: number, tokens: number) {
    const inputK  = tasks * tokens * 0.6 / 1000;
    const outputK = tasks * tokens * 0.4 / 1000;
    return (inputK * mc.input + outputK * mc.output) / 1000;
  }
  const byokCostUSD = aiCostUSD(leads, TOKENS.leads) + aiCostUSD(itins, TOKENS.itins)
    + aiCostUSD(comms, TOKENS.comms) + aiCostUSD(bids, TOKENS.bids);
  const byokCostINR = byokCostUSD * USD_INR;

  // 3. NAMA-hosted AI cost (BYOK * markup)
  const namaAiCostINR = byokCostINR * NAMA_MARKUP;
  const aiSavingsINR  = namaAiCostINR - byokCostINR;

  // 4. Total value
  const totalValueINR = manualSavingsINR + aiSavingsINR;
  const roiMultiple   = plan.price > 0 ? totalValueINR / plan.price : 0;
  const fteEquivalent = totalHoursSaved * agents / 160;  // 160 hrs = 1 FTE-month

  // 5. Breakdown for tasks
  const taskRows = [
    { label: 'Lead Triage',    count: leads, manual: MANUAL_MIN.leads, review: REVIEW_MIN.leads, hours: hLeads },
    { label: 'Itinerary Build', count: itins, manual: MANUAL_MIN.itins, review: REVIEW_MIN.itins, hours: hItins },
    { label: 'Communications', count: comms, manual: MANUAL_MIN.comms, review: REVIEW_MIN.comms, hours: hComms },
    { label: 'Bid Responses',  count: bids,  manual: MANUAL_MIN.bids,  review: REVIEW_MIN.bids,  hours: hBids  },
  ];

  const handleCopyLink = useCallback(() => {
    const url = new URL(typeof window !== 'undefined' ? window.location.href : 'https://app.namatravel.com/byok-calculator');
    url.searchParams.set('leads', String(leads));
    url.searchParams.set('itins', String(itins));
    url.searchParams.set('comms', String(comms));
    url.searchParams.set('bids', String(bids));
    url.searchParams.set('agents', String(agents));
    url.searchParams.set('rate', String(rate));
    url.searchParams.set('model', model);
    url.searchParams.set('plan', planId);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [leads, itins, comms, bids, agents, rate, model, planId]);

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans">
      {/* ── Nav ───────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-sm">N</div>
          <span className="text-white font-black text-lg tracking-tight">NAMA OS</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/pricing" className="text-sm text-slate-400 font-semibold hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/register" className="bg-[#14B8A6] text-[#0F172A] font-black text-sm px-4 py-2 rounded-xl hover:bg-[#0FA898] transition-colors">
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-14 pb-8">
        <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
          <Key size={12} />
          BYOK — Bring Your Own Key
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-white mb-3">
          How much will <span className="text-[#14B8A6]">NAMA save you</span>?
        </h1>
        <p className="text-slate-400 max-w-xl mx-auto text-base">
          Move sliders to match your monthly volume. See real-time savings in AI costs <em>and</em> agent hours freed.
        </p>
      </section>

      {/* ── Calculator ────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT — Inputs */}
          <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-7">
            <h2 className="text-white font-black text-lg mb-1">Your Monthly Volume</h2>
            <p className="text-slate-500 text-xs mb-6">Adjust to match your typical month</p>

            <Slider label="Leads received / month"     min={10}  max={2000} step={10}  value={leads}  onChange={setLeads}  format={(v) => `${v}`} tooltip="Inquiries from WhatsApp, email, website, phone" />
            <Slider label="Itineraries built / month"  min={5}   max={500}  step={5}   value={itins}  onChange={setItins}  format={(v) => `${v}`} tooltip="Full day-by-day travel proposals" />
            <Slider label="Comms sent / month"         min={50}  max={5000} step={50}  value={comms}  onChange={setComms}  format={(v) => `${v}`} tooltip="Client emails, follow-ups, confirmations" />
            <Slider label="Bid responses / month"      min={5}   max={500}  step={5}   value={bids}   onChange={setBids}   format={(v) => `${v}`} tooltip="Competitive RFP / bid responses" />

            <div className="border-t border-white/10 my-5" />
            <h3 className="text-slate-300 font-black text-sm mb-4">Your Team</h3>
            <Slider label="Number of travel agents"    min={1}   max={20}   step={1}   value={agents} onChange={setAgents} format={(v) => `${v} agents`} />
            <Slider label="Agent hourly cost (fully-loaded)" min={100} max={800} step={50} value={rate} onChange={setRate} format={(v) => `₹${v}/hr`} tooltip="Include salary, benefits, overhead" />

            <div className="border-t border-white/10 my-5" />
            <h3 className="text-slate-300 font-black text-sm mb-3">BYOK Model</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(AI_COST) as ModelKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setModel(key)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all text-left ${
                    model === key
                      ? 'bg-[#14B8A6]/15 border-[#14B8A6]/50 text-[#14B8A6]'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <p className="truncate">{key.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                  {key === 'claude-haiku' && <p className="text-[9px] text-[#14B8A6] font-black mt-0.5">Cheapest ⚡</p>}
                  {key === 'gpt-4o' && <p className="text-[9px] text-amber-500 font-black mt-0.5">Premium</p>}
                </button>
              ))}
            </div>

            <div className="border-t border-white/10 my-5" />
            <h3 className="text-slate-300 font-black text-sm mb-3">Your Plan</h3>
            <div className="grid grid-cols-3 gap-2">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlanId(p.id)}
                  className={`text-xs font-bold px-3 py-2.5 rounded-xl border transition-all ${
                    planId === p.id
                      ? 'bg-[#14B8A6]/15 border-[#14B8A6]/50 text-[#14B8A6]'
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  <p>{p.name}</p>
                  <p className="text-[10px] mt-0.5 font-black">₹{(p.price / 1000).toFixed(0)}K</p>
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT — Results */}
          <div className="flex flex-col gap-4">

            {/* ROI Mega Card */}
            <div className="bg-gradient-to-br from-[#14B8A6]/20 to-[#0F172A] border-2 border-[#14B8A6]/40 rounded-3xl p-7">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-[#14B8A6] text-xs font-black uppercase tracking-widest mb-1">Total Monthly Value</p>
                  <p className="text-5xl font-black text-white">{fmt(totalValueINR)}</p>
                  <p className="text-slate-400 text-sm mt-1">= agent time savings + AI cost savings</p>
                </div>
                <div className="bg-[#14B8A6] rounded-2xl px-4 py-3 text-center flex-shrink-0">
                  <p className="text-[#0F172A] text-2xl font-black">{roiMultiple.toFixed(1)}x</p>
                  <p className="text-[#0F172A] text-[10px] font-black">ROI</p>
                </div>
              </div>
              <p className="text-slate-500 text-xs">
                For every <strong className="text-white">₹1</strong> spent on {plan.name} (₹{(plan.price / 1000).toFixed(0)}K/mo),
                NAMA delivers <strong className="text-[#14B8A6]">₹{roiMultiple.toFixed(1)}</strong> in value back.
              </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard
                label="Agent Hours Freed"
                value={`${Math.round(totalHoursSaved * agents)} hrs`}
                sub={`${agents} agents × ${totalHoursSaved.toFixed(1)} hrs each`}
                icon={Clock}
              />
              <KpiCard
                label="FTE Equivalent"
                value={fteEquivalent >= 0.1 ? `${fteEquivalent.toFixed(1)} FTE` : `${Math.round(fteEquivalent * 160)} hrs`}
                sub="staff freed per month"
                icon={Users}
              />
              <KpiCard
                label="AI Cost Savings"
                value={fmt(aiSavingsINR)}
                sub={`NAMA-hosted: ${fmt(namaAiCostINR)} → BYOK: ${fmt(byokCostINR)}`}
                icon={TrendingDown}
                color="border-[#14B8A6]/20"
              />
              <KpiCard
                label="Labour Savings"
                value={fmt(manualSavingsINR)}
                sub={`${Math.round(totalHoursSaved * agents)} hrs @ ₹${rate}/hr`}
                icon={TrendingUp}
                color="border-violet-500/20"
              />
            </div>

            {/* Task Breakdown */}
            <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6">
              <h3 className="text-white font-black text-sm mb-4">Time Saved Per Task Type</h3>
              <div className="space-y-3">
                {taskRows.map((row) => {
                  const saved = row.manual - row.review;
                  const pct   = Math.round((saved / row.manual) * 100);
                  return (
                    <div key={row.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-300 font-semibold">{row.label}</span>
                        <span className="text-slate-500">
                          {row.count}/mo · {row.manual}min → {row.review}min · saves {fmtH(row.hours * agents)}
                        </span>
                      </div>
                      <div className="relative h-2 bg-slate-800 rounded-full">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#14B8A6] to-teal-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-0.5">
                        <span>0%</span>
                        <span className="text-[#14B8A6] font-bold">{pct}% faster</span>
                        <span>100%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Cost Breakdown */}
            <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6">
              <h3 className="text-white font-black text-sm mb-3">AI Cost Breakdown</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-3">
                  <p className="text-red-400 font-bold uppercase text-[10px] tracking-widest">NAMA-hosted AI</p>
                  <p className="text-white font-black text-xl mt-1">{fmt(namaAiCostINR)}</p>
                  <p className="text-slate-500 mt-0.5">shared pool pricing</p>
                </div>
                <div className="bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-2xl p-3">
                  <p className="text-[#14B8A6] font-bold uppercase text-[10px] tracking-widest">BYOK ({model.replace('-', ' ')})</p>
                  <p className="text-white font-black text-xl mt-1">{fmt(byokCostINR)}</p>
                  <p className="text-slate-500 mt-0.5">direct API cost</p>
                </div>
              </div>
              <div className="mt-3 bg-[#14B8A6]/10 border border-[#14B8A6]/20 rounded-2xl p-3 text-center">
                <p className="text-[#14B8A6] font-black text-base">Save {fmt(aiSavingsINR)}/month switching to BYOK</p>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  {Math.round((aiSavingsINR / namaAiCostINR) * 100)}% reduction · ₹{(aiSavingsINR * 12 / 1000).toFixed(0)}K/year
                </p>
              </div>
            </div>

            {/* Share + CTA */}
            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-slate-300 font-bold text-sm px-4 py-3 rounded-2xl hover:bg-white/10 transition-colors"
              >
                {copied ? <CheckIcon size={14} className="text-[#14B8A6]" /> : <Copy size={14} />}
                {copied ? 'Link copied!' : 'Share calculation'}
              </button>
              <Link
                href="/register?plan=growth"
                className="flex-1 flex items-center justify-center gap-2 bg-[#14B8A6] text-[#0F172A] font-black text-sm px-4 py-3 rounded-2xl hover:bg-[#0FA898] transition-colors"
              >
                Start Free Trial
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Methodology ───────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8">
          <h3 className="text-white font-black text-lg mb-4 flex items-center gap-2">
            <Info size={18} className="text-[#14B8A6]" />
            Methodology & Assumptions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm text-slate-400">
            <div>
              <p className="text-white font-semibold mb-2">Manual time baselines</p>
              <ul className="space-y-1.5">
                <li>Lead triage: <strong className="text-slate-200">20 min</strong> manual → <strong className="text-[#14B8A6]">2 min</strong> AI-review</li>
                <li>Itinerary: <strong className="text-slate-200">3 hours</strong> manual → <strong className="text-[#14B8A6]">8 min</strong> AI-review</li>
                <li>Communications: <strong className="text-slate-200">12 min</strong> manual → <strong className="text-[#14B8A6]">1 min</strong> AI-review</li>
                <li>Bid responses: <strong className="text-slate-200">45 min</strong> manual → <strong className="text-[#14B8A6]">3 min</strong> AI-review</li>
              </ul>
            </div>
            <div>
              <p className="text-white font-semibold mb-2">AI cost model</p>
              <ul className="space-y-1.5">
                <li>Token estimates based on NAMA internal benchmarks</li>
                <li>NAMA-hosted AI priced at 2.5× raw API cost</li>
                <li>BYOK = direct API cost (no markup)</li>
                <li>USD→INR at ₹84.5 exchange rate</li>
                <li>Labour = agents × hours saved × hourly rate</li>
              </ul>
            </div>
          </div>
          <p className="text-slate-600 text-xs mt-5">
            Actual savings may vary based on query complexity, revision cycles, and team workflows.
            These are industry-benchmark estimates validated with NAMA beta customers.
          </p>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20 text-center">
        <h2 className="text-white text-2xl font-black mb-3">Ready to unlock these savings?</h2>
        <p className="text-slate-400 mb-6 text-sm">14-day free trial. No credit card required.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/register"
            className="bg-[#14B8A6] text-[#0F172A] font-black px-8 py-3.5 rounded-2xl hover:bg-[#0FA898] transition-colors flex items-center justify-center gap-2"
          >
            <Zap size={16} fill="currentColor" />
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="border border-white/20 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/5 transition-colors"
          >
            View Pricing →
          </Link>
        </div>
      </section>
    </div>
  );
}
