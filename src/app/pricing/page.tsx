"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Check, X, Zap, ChevronRight, ArrowRight,
  Shield, Globe, BarChart2, Bot, Key, MessageSquare, Calculator,
} from 'lucide-react';
import { billingApi, SubscriptionPlan, PlansResponse } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Plan {
  id: string;
  name: string;
  tagline: string;
  price: number | null;
  priceLabel?: string;
  period: string;
  seats: string;
  highlight: boolean;
  badge?: string;
  color: string;
  cta: string;
  ctaHref: string;
  features: Array<{ label: string; included: boolean | string }>;
}

// ── Pricing Data ───────────────────────────────────────────────────────────────
const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    tagline: 'For solo operators & boutique agencies',
    price: 4999,
    period: '/month',
    seats: '1 seat',
    highlight: false,
    color: 'slate',
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=starter',
    features: [
      { label: 'AI Query Triage (M1)', included: true },
      { label: 'Lead CRM — up to 100 leads/mo', included: true },
      { label: 'Itinerary Builder (M8)', included: true },
      { label: 'Quotations (M3)', included: true },
      { label: 'Booking Management (M7)', included: true },
      { label: 'Document Generation (M4)', included: true },
      { label: 'Basic Analytics (M9)', included: true },
      { label: 'NAMA-hosted AI (shared pool)', included: true },
      { label: 'BYOK — Bring Your Own Key', included: false },
      { label: 'Vendor Registry (M6)', included: false },
      { label: 'White-label Portal (M10)', included: false },
      { label: 'Corporate Travel (M13)', included: false },
      { label: 'Finance Module (M11)', included: false },
      { label: 'API Access', included: false },
      { label: 'Priority Support', included: false },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    tagline: 'For growing DMCs & travel agencies',
    price: 14999,
    period: '/month',
    seats: '5 seats',
    highlight: true,
    badge: 'Most Popular',
    color: 'teal',
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=growth',
    features: [
      { label: 'AI Query Triage (M1)', included: true },
      { label: 'Lead CRM — unlimited leads', included: true },
      { label: 'Itinerary Builder (M8)', included: true },
      { label: 'Quotations (M3)', included: true },
      { label: 'Booking Management (M7)', included: true },
      { label: 'Document Generation (M4)', included: true },
      { label: 'Full Analytics + BI (M9/M18)', included: true },
      { label: 'NAMA-hosted AI (dedicated)', included: true },
      { label: 'BYOK — optional (save 60–95% AI cost)', included: 'Optional' },
      { label: 'Vendor Registry (M6)', included: true },
      { label: 'White-label Portal (M10)', included: true },
      { label: 'Corporate Travel (M13)', included: false },
      { label: 'Finance Module (M11)', included: true },
      { label: 'API Access', included: false },
      { label: 'Priority Support', included: true },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    tagline: 'For established DMCs & tour operators',
    price: 39999,
    period: '/month',
    seats: '15 seats',
    highlight: false,
    badge: 'Best Value',
    color: 'violet',
    cta: 'Start Free Trial',
    ctaHref: '/register?plan=scale',
    features: [
      { label: 'AI Query Triage (M1)', included: true },
      { label: 'Lead CRM — unlimited leads', included: true },
      { label: 'Itinerary Builder (M8)', included: true },
      { label: 'Quotations (M3)', included: true },
      { label: 'Booking Management (M7)', included: true },
      { label: 'Document Generation (M4)', included: true },
      { label: 'Full Analytics + BI (M9/M18)', included: true },
      { label: 'NAMA-hosted AI (dedicated)', included: true },
      { label: 'BYOK — recommended (save up to 95%)', included: 'Recommended' },
      { label: 'Vendor Registry (M6)', included: true },
      { label: 'White-label Portal (M10)', included: true },
      { label: 'Corporate Travel (M13)', included: true },
      { label: 'Finance Module (M11)', included: true },
      { label: 'API Access', included: true },
      { label: 'Priority Support + SLA', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For large tour operators & travel groups',
    price: null,
    priceLabel: 'Custom',
    period: '',
    seats: 'Unlimited seats',
    highlight: false,
    color: 'amber',
    cta: 'Contact Sales',
    ctaHref: 'mailto:sales@namatravel.com',
    features: [
      { label: 'AI Query Triage (M1)', included: true },
      { label: 'Lead CRM — unlimited leads', included: true },
      { label: 'Itinerary Builder (M8)', included: true },
      { label: 'Quotations (M3)', included: true },
      { label: 'Booking Management (M7)', included: true },
      { label: 'Document Generation (M4)', included: true },
      { label: 'Full Analytics + BI (M9/M18)', included: true },
      { label: 'NAMA-hosted AI (dedicated cluster)', included: true },
      { label: 'BYOK — required (max cost control)', included: 'Required' },
      { label: 'Vendor Registry (M6)', included: true },
      { label: 'White-label Portal (M10)', included: true },
      { label: 'Corporate Travel (M13)', included: true },
      { label: 'Finance Module (M11)', included: true },
      { label: 'API Access + Webhooks', included: true },
      { label: 'Dedicated CSM + 24/7 SLA', included: true },
    ],
  },
];

// ── Feature Comparison Row ─────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  { category: 'Core Platform', features: [
    { name: 'AI Query Triage & Auto-routing', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Lead CRM', starter: '100/mo', growth: 'Unlimited', scale: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Itinerary Builder', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Quotations & Proposals', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Booking Management', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Document Generation', starter: true, growth: true, scale: true, enterprise: true },
  ]},
  { category: 'AI & Automation', features: [
    { name: 'NAMA-hosted AI', starter: 'Shared', growth: 'Dedicated', scale: 'Dedicated', enterprise: 'Cluster' },
    { name: 'BYOK (Bring Your Own Key)', starter: false, growth: 'Optional', scale: 'Recommended', enterprise: 'Required' },
    { name: 'AI Token Budget Controls', starter: false, growth: true, scale: true, enterprise: true },
    { name: 'Automation Workflows (M16)', starter: false, growth: false, scale: true, enterprise: true },
  ]},
  { category: 'Finance & Commerce', features: [
    { name: 'Finance Module (P&L, ledger)', starter: false, growth: true, scale: true, enterprise: true },
    { name: 'Corporate Travel Portals (M13)', starter: false, growth: false, scale: true, enterprise: true },
    { name: 'Payment Processing', starter: false, growth: true, scale: true, enterprise: true },
    { name: 'White-label Customer Portal (M10)', starter: false, growth: true, scale: true, enterprise: true },
  ]},
  { category: 'Analytics & Integrations', features: [
    { name: 'Basic Analytics Dashboard', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Advanced BI & Custom Reports (M18)', starter: false, growth: true, scale: true, enterprise: true },
    { name: 'API Access', starter: false, growth: false, scale: true, enterprise: true },
    { name: 'Webhook Integrations', starter: false, growth: false, scale: true, enterprise: true },
    { name: 'WhatsApp Business (M19)', starter: false, growth: true, scale: true, enterprise: true },
  ]},
  { category: 'Support', features: [
    { name: 'In-app chat support', starter: true, growth: true, scale: true, enterprise: true },
    { name: 'Priority email support', starter: false, growth: true, scale: true, enterprise: true },
    { name: 'SLA guarantee', starter: false, growth: false, scale: '99.9%', enterprise: '99.99%' },
    { name: 'Dedicated CSM', starter: false, growth: false, scale: false, enterprise: true },
  ]},
];

// ── FAQ Data ───────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'What is BYOK and why does it matter?',
    a: 'BYOK (Bring Your Own Key) lets you use your own OpenAI, Anthropic, or Google AI API key instead of NAMA\'s shared pool. A typical Growth-tier DMC doing 200 leads + 80 itineraries per month saves ₹8,500–₹12,000/month on AI costs alone — often more than half their subscription back.',
  },
  {
    q: 'How does the 14-day free trial work?',
    a: 'You get full access to your chosen plan for 14 days, no credit card required. At the end, you choose to subscribe or your data is exported for you.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Yes, you can upgrade or downgrade at any time. Upgrades are prorated immediately. Downgrades apply at the end of your billing cycle.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is tenant-isolated with row-level security (RLS). BYOK keys are AES-256 encrypted at rest. Payments use HMAC-verified webhooks and idempotency keys. We\'re built from the ground up for multi-tenant SaaS security.',
  },
  {
    q: 'Do you offer annual billing?',
    a: 'Yes — annual billing saves 20% vs monthly. Contact us to set up annual billing.',
  },
  {
    q: 'What support is included?',
    a: 'All plans include in-app chat support. Growth and above get priority email. Scale and above get a 99.9% SLA. Enterprise gets a dedicated Customer Success Manager and 24/7 phone support.',
  },
];

// ── Cell renderer ──────────────────────────────────────────────────────────────
function Cell({ val }: { val: boolean | string }) {
  if (val === false) return <X size={16} className="text-slate-300 mx-auto" />;
  if (val === true) return <Check size={16} className="text-[#14B8A6] mx-auto" />;
  return <span className="text-xs font-semibold text-[#14B8A6]">{val}</span>;
}

// ── Feature badge ──────────────────────────────────────────────────────────────
function FeatureRow({ label, included }: { label: string; included: boolean | string }) {
  const ok = included !== false;
  return (
    <li className={`flex items-start gap-2.5 text-sm ${ok ? 'text-slate-700' : 'text-slate-400'}`}>
      <span className="mt-0.5 flex-shrink-0">
        {ok ? (
          typeof included === 'string' ? (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-100 text-amber-600 text-[9px] font-black">★</span>
          ) : (
            <Check size={14} className="text-[#14B8A6]" />
          )
        ) : (
          <X size={14} className="text-slate-300" />
        )}
      </span>
      <span className="leading-snug">
        {label}
        {typeof included === 'string' && (
          <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
            {included}
          </span>
        )}
      </span>
    </li>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [billingAnnual, setBillingAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Live prices + currency from backend; fall back to hardcoded PLANS on failure.
  // Match backend plans to the local PLANS array by slug (starter/growth/scale).
  const [livePlans, setLivePlans] = useState<SubscriptionPlan[] | null>(null);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');

  useEffect(() => {
    billingApi.getPlans()
      .then((res: PlansResponse | SubscriptionPlan[]) => {
        // Backend may return either { plans, detected_currency } or a bare array.
        if (Array.isArray(res)) {
          setLivePlans(res);
        } else {
          setLivePlans(res.plans);
          if (res.detected_currency === 'USD' || res.detected_currency === 'INR') {
            setCurrency(res.detected_currency);
          }
        }
      })
      .catch((err) => {
        // Network / 5xx — hardcoded PLANS stay; pricing page still renders.
        console.warn('[pricing] backend unreachable, using fallback prices', err);
      });
  }, []);

  // Resolve display price for a plan slug. Backend price wins; fallback uses
  // the hardcoded `Plan.price` (which is INR-based). Returned in the active
  // currency.
  const planPrice = (plan: Plan): number | null => {
    if (plan.price === null) return null;
    const live = livePlans?.find((p) => p.slug === plan.id);
    if (live) {
      const monthly = currency === 'USD' ? (live.price_monthly_usd ?? live.price_monthly) : live.price_monthly;
      const yearly  = currency === 'USD' ? (live.price_yearly_usd  ?? live.price_yearly)  : live.price_yearly;
      return billingAnnual ? Math.round((yearly ?? monthly * 12) / 12) : monthly;
    }
    return billingAnnual ? Math.round(plan.price * 0.8) : plan.price;
  };

  // Currency symbol for rendering.
  const currencySymbol = currency === 'USD' ? '$' : '₹';
  const formatPrice = (n: number) =>
    currency === 'USD' ? n.toLocaleString('en-US') : n.toLocaleString('en-IN');

  const colorMap: Record<string, { card: string; cta: string; badge: string; border: string }> = {
    slate:  { card: 'bg-white border-slate-200',                 cta: 'bg-slate-800 hover:bg-slate-700 text-white',          badge: '', border: 'border-slate-200' },
    teal:   { card: 'bg-[#0F172A] border-[#14B8A6]/30',          cta: 'bg-[#14B8A6] hover:bg-[#0FA898] text-[#0F172A]',     badge: 'bg-[#14B8A6] text-[#0F172A]', border: 'border-[#14B8A6]/50' },
    violet: { card: 'bg-white border-violet-200',                cta: 'bg-violet-600 hover:bg-violet-700 text-white',        badge: 'bg-violet-100 text-violet-700', border: 'border-violet-200' },
    amber:  { card: 'bg-white border-amber-200',                 cta: 'bg-amber-500 hover:bg-amber-600 text-white',          badge: 'bg-amber-100 text-amber-700', border: 'border-amber-200' },
  };

  return (
    <div className="min-h-screen bg-[#0B1120] font-sans">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#14B8A6] rounded-lg flex items-center justify-center font-black text-[#0F172A] text-sm">N</div>
          <span className="text-white font-black text-lg tracking-tight">NAMA OS</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/byok-calculator" className="text-sm text-[#14B8A6] font-semibold hover:text-[#14B8A6]/80 flex items-center gap-1.5">
            <Calculator size={14} />
            ROI Calculator
          </Link>
          <Link href="/register" className="bg-[#14B8A6] text-[#0F172A] font-black text-sm px-4 py-2 rounded-xl hover:bg-[#0FA898] transition-colors">
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto text-center px-6 pt-20 pb-14">
        <div className="inline-flex items-center gap-2 bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-[#14B8A6] text-xs font-bold px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} fill="currentColor" />
          AI-First Travel Operating System
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
          Transparent pricing.<br />
          <span className="text-[#14B8A6]">No surprises.</span>
        </h1>
        <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
          Every plan includes a 14-day free trial. BYOK users on Growth save an average of
          <strong className="text-white"> ₹8,500–₹12,000/month</strong> on AI costs alone.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 mb-2">
          <button
            onClick={() => setBillingAnnual(false)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${!billingAnnual ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingAnnual(true)}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${billingAnnual ? 'bg-white text-slate-900' : 'text-slate-400 hover:text-white'}`}
          >
            Annual
            <span className="text-[10px] font-black bg-green-500 text-white px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
        {billingAnnual && <p className="text-[#14B8A6] text-xs font-semibold">Annual billing — save 2+ months free</p>}
      </section>

      {/* ── Plan Cards ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const c = colorMap[plan.color];
          const price = planPrice(plan);
          const textColor = plan.highlight ? 'text-white' : 'text-slate-800';
          const mutedColor = plan.highlight ? 'text-slate-400' : 'text-slate-500';
          const divider = plan.highlight ? 'border-white/10' : 'border-slate-100';
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-3xl border-2 ${c.card} ${plan.highlight ? '' : ''} p-7 transition-all hover:scale-[1.01]`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${c.badge} text-[11px] font-black tracking-widest uppercase px-3 py-1 rounded-full`}>
                  {plan.badge}
                </div>
              )}
              <div className="mb-5">
                <h2 className={`text-xl font-black ${textColor}`}>{plan.name}</h2>
                <p className={`text-xs ${mutedColor} mt-1 leading-snug`}>{plan.tagline}</p>
              </div>

              <div className="mb-5">
                {price !== null ? (
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-black ${textColor}`}>{currencySymbol}{formatPrice(price)}</span>
                    <span className={`text-sm ${mutedColor} mb-1.5`}>{plan.period}</span>
                  </div>
                ) : (
                  <span className={`text-4xl font-black ${textColor}`}>{plan.priceLabel}</span>
                )}
                <p className={`text-xs ${mutedColor} mt-1`}>{plan.seats}</p>
                {billingAnnual && price !== null && (
                  <p className="text-xs text-green-400 font-semibold mt-0.5">
                    {currencySymbol}{formatPrice(price * 12)}/year
                    {plan.price !== null && (
                      <> · saves ~20%</>
                    )}
                  </p>
                )}
              </div>

              <Link
                href={plan.ctaHref}
                className={`w-full text-center py-3 rounded-2xl text-sm font-black transition-all ${c.cta} mb-6 block`}
              >
                {plan.cta}
              </Link>

              <div className={`border-t ${divider} pt-5`}>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <FeatureRow key={f.label} label={f.label} included={f.included} />
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </section>

      {/* ── BYOK Savings Banner ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-[#14B8A6]/10 to-violet-500/10 border border-[#14B8A6]/20 rounded-3xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Key size={18} className="text-[#14B8A6]" />
              <span className="text-[#14B8A6] font-black text-sm uppercase tracking-widest">BYOK Savings</span>
            </div>
            <h3 className="text-white text-2xl font-black mb-2">A Growth-tier DMC saves ₹10,200/month with BYOK</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              200 leads/month · 80 itineraries · 300 communications. Switching from NAMA-hosted AI
              to Claude Haiku BYOK saves <strong className="text-white">₹8,500–₹12,000/month</strong> — that&apos;s
              more than half your subscription cost back every month.
            </p>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Lead Triage', manual: '20 min', ai: '2 min', save: '90%' },
                { label: 'Itinerary', manual: '3 hrs', ai: '8 min', save: '96%' },
                { label: 'Comms', manual: '12 min', ai: '1 min', save: '92%' },
                { label: 'Bid Response', manual: '45 min', ai: '3 min', save: '93%' },
              ].map((row) => (
                <div key={row.label} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{row.label}</p>
                  <p className="text-white font-black text-sm mt-1">{row.manual} → {row.ai}</p>
                  <p className="text-[#14B8A6] font-black text-xs mt-0.5">{row.save} faster</p>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0">
            <Link
              href="/byok-calculator"
              className="flex items-center gap-2 bg-[#14B8A6] text-[#0F172A] font-black px-5 py-3.5 rounded-2xl hover:bg-[#0FA898] transition-colors text-sm"
            >
              <Calculator size={16} />
              Calculate Your Savings
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Feature Comparison Table ──────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center mb-8">
          <h2 className="text-white text-3xl font-black mb-2">Full Feature Comparison</h2>
          <p className="text-slate-400 text-sm">Every feature, every plan — no asterisks</p>
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="mt-4 text-[#14B8A6] text-sm font-bold underline underline-offset-4"
          >
            {showComparison ? 'Hide comparison ↑' : 'Show full comparison ↓'}
          </button>
        </div>

        {showComparison && (
          <div className="overflow-x-auto rounded-3xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-left text-slate-400 font-semibold px-6 py-4 w-64">Feature</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className={`text-center px-4 py-4 font-black ${p.highlight ? 'text-[#14B8A6]' : 'text-white'}`}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((section) => (
                  <React.Fragment key={section.category}>
                    <tr className="bg-white/[0.03]">
                      <td colSpan={5} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500">
                        {section.category}
                      </td>
                    </tr>
                    {section.features.map((feat) => (
                      <tr key={feat.name} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="text-slate-300 px-6 py-3.5 font-medium">{feat.name}</td>
                        <td className="text-center px-4 py-3.5"><Cell val={feat.starter} /></td>
                        <td className="text-center px-4 py-3.5 bg-[#14B8A6]/5"><Cell val={feat.growth} /></td>
                        <td className="text-center px-4 py-3.5"><Cell val={feat.scale} /></td>
                        <td className="text-center px-4 py-3.5"><Cell val={feat.enterprise} /></td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Trust Signals ─────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Shield, label: 'AES-256 Encryption', sub: 'BYOK keys at rest' },
            { icon: Globe, label: 'Multi-tenant RLS', sub: 'Data isolation guaranteed' },
            { icon: BarChart2, label: '99.9% Uptime SLA', sub: 'Scale & Enterprise' },
            { icon: Bot, label: 'AI Kill-switch', sub: 'Per-tenant budget controls' },
          ].map((item) => (
            <div key={item.label} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-center">
              <item.icon size={24} className="text-[#14B8A6] mx-auto mb-3" />
              <p className="text-white text-sm font-black">{item.label}</p>
              <p className="text-slate-500 text-xs mt-1">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-white text-3xl font-black text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left text-white font-semibold text-sm hover:bg-white/[0.03] transition-colors"
              >
                {faq.q}
                <ChevronRight size={16} className={`text-slate-500 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-90' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-slate-400 text-sm leading-relaxed border-t border-white/5">
                  <p className="pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Footer ────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 pb-24 text-center">
        <div className="bg-gradient-to-br from-[#14B8A6]/10 to-[#0F172A] border border-[#14B8A6]/20 rounded-3xl p-12">
          <div className="w-12 h-12 bg-[#14B8A6] rounded-2xl flex items-center justify-center font-black text-[#0F172A] text-xl mx-auto mb-5">N</div>
          <h2 className="text-white text-3xl font-black mb-3">Start your free trial today</h2>
          <p className="text-slate-400 mb-8">14 days free. No credit card. Full access to your plan.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="bg-[#14B8A6] text-[#0F172A] font-black px-8 py-3.5 rounded-2xl hover:bg-[#0FA898] transition-colors flex items-center justify-center gap-2">
              Get Started Free
              <ArrowRight size={16} />
            </Link>
            <Link href="mailto:sales@namatravel.com" className="border border-white/20 text-white font-bold px-8 py-3.5 rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2">
              <MessageSquare size={16} />
              Talk to Sales
            </Link>
          </div>
          <p className="text-slate-600 text-xs mt-5">Questions? Email us at <a href="mailto:sales@namatravel.com" className="text-[#14B8A6]">sales@namatravel.com</a></p>
        </div>
      </section>
    </div>
  );
}
