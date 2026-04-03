"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BadgeIndianRupee, Bot, CheckCircle2, MessageSquare, Shield, Sparkles, Target } from "lucide-react";

import { apiUrl } from "@/lib/api";
import { DEFAULT_DEMO_PROFILE, readDemoProfile } from "@/lib/demo-profile";

type DemoCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  organization: string;
  priority: string;
  query: string;
  triage: {
    destination: string;
    duration_days: number;
    travelers_count: number;
    travel_dates: string;
    preferences: string[];
    style: string;
    confidence_score: number;
    suggested_reply: string;
    reasoning: string;
  };
  itinerary: {
    title: string;
    total_price: number;
    currency: string;
    agent_reasoning?: string;
    social_post?: {
      caption: string;
      hooks: string[];
      image_suggestions: string[];
    };
    days: Array<{
      day_number: number;
      title: string;
      narrative: string;
      blocks: Array<{
        type: string;
        title: string;
        description: string;
        price_gross: number;
        currency?: string;
      }>;
    }>;
  };
  finance: {
    quote_total: number;
    cost_total: number;
    gross_profit: number;
    margin_percent: number;
    deposit_due: number;
    status: string;
  };
  communications: {
    channel: string;
    latest_message: string;
    suggested_follow_up: string;
  };
  bidding: {
    vendor: string;
    status: string;
    note: string;
  };
  capture: {
    website: string;
    whatsapp: string;
    email: string;
    phone: string;
    transcript: string[];
  };
};

const LEAD_FALLBACK_MAP: Record<string, string> = {
  "1": "maldives-honeymoon",
  "2": "kerala-family",
  "3": "dubai-bleisure",
};

const LOCAL_CASES: Record<string, DemoCase> = {
  "maldives-honeymoon": {
    slug: "maldives-honeymoon",
    lead_id: 1,
    guest_name: "Meera Nair",
    organization: "Nair Luxury Escapes",
    priority: "CRITICAL",
    query: "Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.",
    triage: {
      destination: "Maldives",
      duration_days: 6,
      travelers_count: 2,
      travel_dates: "Flexible in April 2026",
      preferences: ["Overwater villa", "Private beach dinner", "Spa", "Seaplane transfer"],
      style: "Luxury",
      confidence_score: 0.93,
      suggested_reply: "Perfect choice for a honeymoon. I have curated a 6-night Maldives plan with a luxury overwater villa, seaplane transfer, sunset cruise, and a private beach dinner. Shall I send the itinerary now?",
      reasoning: "Detected honeymoon intent, luxury preference, Maldives destination, and 2-traveler profile from the inbound request.",
    },
    itinerary: {
      title: "The Ultimate 6-Day Luxury Escape in Maldives",
      currency: "INR",
      total_price: 486000.0,
      agent_reasoning: "Selected a premium overwater villa stay, high-romance experiences, and private transfers to maximize conversion for a honeymoon segment.",
      social_post: {
        caption: "6 nights in the Maldives, zero stress, pure luxury. Overwater villa, floating breakfast, private beach dinner, and a sunset cruise curated by NAMA. #Maldives #LuxuryTravel #TravelWithNAMA",
        hooks: [
          "Would you say yes to this Maldives honeymoon?",
          "Your dream overwater villa is waiting.",
          "Luxury travel, autonomously planned.",
        ],
        image_suggestions: [
          "Overwater villa at sunset",
          "Floating breakfast on lagoon deck",
          "Private beach dinner under lanterns",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Arrival in Paradise",
          narrative: "Touch down in Malé and transition by seaplane to a luxury overwater villa for a slow first evening.",
          blocks: [
            { type: "TRANSFER", title: "Seaplane Transfer", description: "Shared luxury seaplane from Malé to the resort.", price_gross: 45000, currency: "INR" },
            { type: "HOTEL", title: "Soneva Jani Water Retreat", description: "1-bedroom overwater villa with private pool and lagoon slide.", price_gross: 214000, currency: "INR" },
            { type: "MEAL", title: "Romantic Welcome Dinner", description: "Chef-curated dinner by the lagoon deck.", price_gross: 12500, currency: "INR" },
          ],
        },
        {
          day_number: 2,
          title: "Spa and Sandbank",
          narrative: "Ease into island life with a private spa session and an exclusive sandbank brunch.",
          blocks: [
            { type: "ACTIVITY", title: "Couples Spa Ritual", description: "90-minute signature massage and aromatherapy ritual.", price_gross: 21000, currency: "INR" },
            { type: "ACTIVITY", title: "Private Sandbank Brunch", description: "Curated brunch setup on a secluded sandbank with butler service.", price_gross: 16000, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Lagoon Leisure",
          narrative: "A free-flow day with snorkeling, floating breakfast, and a golden-hour sunset cruise.",
          blocks: [
            { type: "MEAL", title: "Floating Breakfast", description: "Breakfast served in-villa pool with tropical fruit and champagne.", price_gross: 9000, currency: "INR" },
            { type: "ACTIVITY", title: "Sunset Dolphin Cruise", description: "Shared luxury yacht cruise with champagne service.", price_gross: 14500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 486000.0,
      cost_total: 391500.0,
      gross_profit: 94500.0,
      margin_percent: 19.44,
      deposit_due: 180000.0,
      status: "Deposit pending within 24 hours",
    },
    communications: {
      channel: "WHATSAPP",
      latest_message: "Client opened itinerary 3 times in the last 90 minutes.",
      suggested_follow_up: "Hi Meera, I’ve held the Maldives villa and private beach dinner window for the next 24 hours. Shall I lock it with the deposit link?",
    },
    bidding: {
      vendor: "Soneva Jani",
      status: "Counter accepted",
      note: "Negotiated honeymoon add-ons while protecting 19.4% margin.",
    },
    capture: {
      website: "Landing page enquiry",
      whatsapp: "WhatsApp follow-up from the sales team",
      email: "Confirmation thread stored in CRM",
      phone: "Call transcript linked after discovery call",
      transcript: [
        "Sales: I’ve captured the honeymoon request and I’m moving it into CRM now.",
        "Client: Great, please keep the private dinner and seaplane transfer.",
        "Sales: Noted. The whole conversation stays attached to the deal card for the team.",
      ],
    },
  },
  "dubai-bleisure": {
    slug: "dubai-bleisure",
    lead_id: 3,
    guest_name: "Arjun Mehta",
    organization: "Velocity Corporate Travel",
    priority: "ATTENTION",
    query: "Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around ₹2L all-in.",
    triage: {
      destination: "Dubai",
      duration_days: 4,
      travelers_count: 1,
      travel_dates: "May 2026",
      preferences: ["Downtown hotel", "Airport transfers", "Desert safari", "Executive comfort"],
      style: "Premium",
      confidence_score: 0.89,
      suggested_reply: "I’ve prepared a 4-night Dubai business-leisure program with Downtown stay, seamless transfers, and one premium desert experience. Would you like the executive version or a softer leisure-heavy version?",
      reasoning: "Detected a blended business-plus-leisure pattern with mid-premium positioning and solo traveler profile.",
    },
    itinerary: {
      title: "4-Day Premium Business + Leisure in Dubai",
      currency: "INR",
      total_price: 212000.0,
      agent_reasoning: "Balanced executive convenience, central location, and one premium leisure block to support a high conversion corporate-bleisure pitch.",
      social_post: {
        caption: "Business in Dubai, but better. Meetings by day, skyline dining and a premium desert evening by night. #Dubai #Bleisure #TravelWithNAMA",
        hooks: [
          "Who said work trips can’t feel premium?",
          "Dubai, reimagined for the modern executive.",
          "Smart travel for high-performing teams.",
        ],
        image_suggestions: [
          "Downtown skyline evening view",
          "Executive hotel suite workspace",
          "Desert dinner setup at dusk",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Arrival and Downtown Check-in",
          narrative: "Private transfer to a centrally located premium hotel with an evening free for client dinner.",
          blocks: [
            { type: "TRANSFER", title: "Private DXB Transfer", description: "Chauffeur-driven airport transfer to Downtown Dubai.", price_gross: 4000, currency: "INR" },
            { type: "HOTEL", title: "Address Boulevard", description: "Executive room close to DIFC and Downtown meeting zones.", price_gross: 76000, currency: "INR" },
          ],
        },
        {
          day_number: 2,
          title: "Meetings and Skyline Dining",
          narrative: "Business through the day, capped with a skyline dinner and Burj views.",
          blocks: [
            { type: "MEAL", title: "Executive Dinner at At.mosphere", description: "Window table dinner with city skyline views.", price_gross: 13000, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Premium Desert Evening",
          narrative: "A curated premium desert experience with private transfer and gourmet setup.",
          blocks: [
            { type: "ACTIVITY", title: "Premium Desert Safari", description: "Private 4x4, sunset dune drive, and gourmet camp dinner.", price_gross: 18500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 212000.0,
      cost_total: 169500.0,
      gross_profit: 42500.0,
      margin_percent: 20.05,
      deposit_due: 85000.0,
      status: "Quote approved and ready to send",
    },
    communications: {
      channel: "EMAIL",
      latest_message: "Lead scoring has increased after response to premium options.",
      suggested_follow_up: "Hi Arjun, your Dubai executive itinerary is ready. I’ve included Downtown stay, airport transfers, and one premium desert evening. Shall I send the final quote PDF?",
    },
    bidding: {
      vendor: "Address Boulevard",
      status: "Rate held for 18 hours",
      note: "Secured executive rate with breakfast inclusion and flexible cancellation.",
    },
    capture: {
      website: "Corporate enquiry form",
      whatsapp: "WhatsApp recap from client",
      email: "Executive email thread",
      phone: "Call notes synced from sales",
      transcript: [
        "Sales: I’ve captured the Dubai request from your email and WhatsApp recap.",
        "Client: Perfect, we need a premium business plus leisure balance.",
        "Sales: I’ll keep the transcript with the CRM record so the next handoff is seamless.",
      ],
    },
  },
  "kerala-family": {
    slug: "kerala-family",
    lead_id: 2,
    guest_name: "Sharma Family",
    organization: "BluePalm Holidays",
    priority: "CRITICAL",
    query: "Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about ₹1.2L total.",
    triage: {
      destination: "Kerala",
      duration_days: 5,
      travelers_count: 3,
      travel_dates: "June 2026",
      preferences: ["Munnar", "Houseboat", "Family-friendly", "Easy pacing"],
      style: "Comfort",
      confidence_score: 0.9,
      suggested_reply: "I’ve prepared a relaxed 5-day Kerala family itinerary with Munnar hills, a private Alleppey houseboat, and child-friendly pacing. Would you like the standard or upgraded resort option?",
      reasoning: "Detected a family segment, 5-day duration, and strong product anchors around Munnar and Alleppey.",
    },
    itinerary: {
      title: "5-Day Family Comfort Escape in Kerala",
      currency: "INR",
      total_price: 124000.0,
      agent_reasoning: "Built a low-friction family journey with comfortable transit times and one standout product moment on the houseboat.",
      social_post: {
        caption: "Tea gardens, misty mornings, and a private houseboat in Kerala. A soft-paced family trip built to feel effortless. #Kerala #FamilyTravel #TravelWithNAMA",
        hooks: [
          "What if family travel actually felt calm?",
          "Kerala, slowed down beautifully.",
          "A houseboat stay your child will remember forever.",
        ],
        image_suggestions: [
          "Munnar tea gardens at sunrise",
          "Private houseboat on Alleppey backwaters",
          "Family breakfast with hill view",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Cochin to Munnar",
          narrative: "Private transfer into the hills and check-in at a family-friendly tea valley resort.",
          blocks: [
            { type: "TRANSFER", title: "Private SUV Transfer", description: "Cochin to Munnar with one scenic tea stop.", price_gross: 6000, currency: "INR" },
            { type: "HOTEL", title: "Fragrant Nature Munnar", description: "Valley-view family suite with breakfast.", price_gross: 23500, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Houseboat Highlight",
          narrative: "Transition to Alleppey for a private overnight houseboat experience with all meals.",
          blocks: [
            { type: "ACTIVITY", title: "Private Alleppey Houseboat", description: "Family-exclusive houseboat with meals and sunset cruise.", price_gross: 18500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 124000.0,
      cost_total: 98750.0,
      gross_profit: 25250.0,
      margin_percent: 20.36,
      deposit_due: 45000.0,
      status: "Payment reminder queued",
    },
    communications: {
      channel: "WHATSAPP",
      latest_message: "Deposit reminder pending for 26 hours.",
      suggested_follow_up: "Hi Mr. Sharma, your Kerala family itinerary is still on hold. I can keep the Munnar suite and private houseboat for a few more hours if you’d like me to secure them now.",
    },
    bidding: {
      vendor: "Private Houseboat Operator",
      status: "Pending confirmation",
      note: "Alternate operator already staged in case primary vendor doesn’t respond.",
    },
    capture: {
      website: "Family holiday form",
      whatsapp: "WhatsApp family follow-up",
      email: "Email with dates and children count",
      phone: "Discovery call transcript",
      transcript: [
        "Sales: I’ve captured the Kerala family trip and attached the call notes to the lead.",
        "Client: We want it calm, simple, and easy for our child.",
        "Sales: Understood. The CRM now has the whole conversation and the houseboat preference.",
      ],
    },
  },
};

export default function DealsClientPage() {
  const profile = useMemo(() => readDemoProfile(), []);
  const params = useSearchParams();
  const leadParam = params.get("lead") ?? "1";
  const resolvedSlug = params.get("case") ?? LEAD_FALLBACK_MAP[leadParam] ?? "maldives-honeymoon";
  const slugParam = LOCAL_CASES[resolvedSlug] ? resolvedSlug : "maldives-honeymoon";

  const [data, setData] = useState<DemoCase | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/demo/case/${slugParam}`));
        const json = await res.json();
        if (!cancelled) {
          const fallback = LOCAL_CASES[slugParam];
          setData(json?.slug ? { ...fallback, ...json, capture: fallback.capture } : fallback);
        }
      } catch {
        if (!cancelled) setData(LOCAL_CASES[slugParam]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  if (loading) {
    return <div className="text-[#F5F0E8] font-mono text-sm">Loading demo deal...</div>;
  }

  if (!data) {
    const fallback = LOCAL_CASES["maldives-honeymoon"];
    return (
      <div className="space-y-4 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <p className="text-red-400 font-mono text-sm">Demo deal unavailable. Loading the primary Maldives showcase instead.</p>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/deals?lead=1" className="rounded-full border border-[#C9A84C]/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#C9A84C]">
            Open {fallback.guest_name}
          </Link>
          <Link href="/dashboard/autopilot" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#B8B0A0]">
            Back to Autopilot
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={12} className="text-[#C9A84C]" />
            <span className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C]">Demo Deal Intelligence</span>
          </div>
          <h1 className="text-4xl font-black font-headline tracking-tight text-[#F5F0E8]">{data.guest_name}</h1>
          <p className="text-[#B8B0A0] text-sm mt-2">{data.organization} · {data.triage.destination} · {data.triage.duration_days} days</p>
          <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-widest">
            <span className="rounded-full border border-[#C9A84C]/15 bg-[#111111] px-3 py-1.5 text-[#C9A84C]">
              {profile.company || DEFAULT_DEMO_PROFILE.company}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.roles.length ? profile.roles.join(" + ") : DEFAULT_DEMO_PROFILE.roles.join(" + ")}
            </span>
            <span className="rounded-full border border-white/10 bg-[#111111] px-3 py-1.5 text-[#B8B0A0]">
              {profile.market.country} · {profile.baseCurrency} · {profile.market.gateway}
            </span>
          </div>
        </div>
        <Link href="/dashboard/autopilot" className="inline-flex w-fit items-center gap-2 rounded-full border border-[#C9A84C]/20 px-4 py-2 text-[#C9A84C] text-xs uppercase tracking-widest font-black">
          Back to Autopilot <ArrowRight size={12} />
        </Link>
      </header>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.25em] font-mono text-[#C9A84C] mb-2">Case Orchestration</div>
            <h2 className="text-xl font-black text-[#F5F0E8]">One deal, five coordinated layers</h2>
            <p className="mt-2 text-sm text-[#B8B0A0] leading-relaxed">
              This is the stitched operating view: CRM capture, itinerary intelligence, supplier normalization, finance control, and execution readiness around one traveler case.
            </p>
          </div>
          <Link
            href="/dashboard/dmc"
            className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-4 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] hover:bg-[#C9A84C]/10 transition-colors"
          >
            Open DMC Hub
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "CRM", detail: "Inbound source, contact context, transcript", state: "Ready" },
            { label: "Itinerary", detail: data.itinerary.title, state: "Drafted" },
            { label: "Supplier", detail: data.bidding.vendor, state: data.bidding.status },
            { label: "Finance", detail: `Margin ${data.finance.margin_percent}%`, state: data.finance.status },
            { label: "Execution", detail: "Awaiting deposit + ops release", state: "Staged" },
          ].map((step) => (
            <div key={step.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">{step.label}</div>
              <div className="mt-2 text-sm font-semibold text-[#F5F0E8] leading-relaxed">{step.detail}</div>
              <div className="mt-3 text-[9px] font-mono uppercase tracking-widest text-[#4A453E]">{step.state}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Quote Value" value={`₹${data.finance.quote_total.toLocaleString("en-IN")}`} icon={<BadgeIndianRupee size={16} />} />
        <StatCard label="Gross Profit" value={`₹${data.finance.gross_profit.toLocaleString("en-IN")}`} icon={<Target size={16} />} />
        <StatCard label="Margin" value={`${data.finance.margin_percent}%`} icon={<CheckCircle2 size={16} />} />
        <StatCard label="Deposit Due" value={`₹${data.finance.deposit_due.toLocaleString("en-IN")}`} icon={<Shield size={16} />} />
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={14} className="text-[#C9A84C]" />
          <h2 className="text-lg font-black text-[#F5F0E8]">Omnichannel CRM Intake</h2>
        </div>
        <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">
          Website, WhatsApp, email, and phone-call transcripts are captured into the same CRM record so the handoff never loses context.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Website", value: data.capture.website },
            { label: "WhatsApp", value: data.capture.whatsapp },
            { label: "Email", value: data.capture.email },
            { label: "Phone", value: data.capture.phone },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C] mb-1">{item.label}</div>
              <div className="text-sm text-[#F5F0E8] leading-relaxed">{item.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-3">
          {data.capture.transcript.map((line, index) => (
            <div key={index} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4 text-sm text-[#F5F0E8] leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2 rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bot size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Lead Understanding</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-5">{data.query}</p>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <InfoPill label="Style" value={data.triage.style} />
            <InfoPill label="Travelers" value={`${data.triage.travelers_count}`} />
            <InfoPill label="Travel Dates" value={data.triage.travel_dates} />
            <InfoPill label="Confidence" value={`${Math.round(data.triage.confidence_score * 100)}%`} />
          </div>
          <div className="mt-5">
            <div className="text-[11px] uppercase tracking-widest text-[#4A453E] font-mono mb-2">Preferences</div>
            <div className="flex flex-wrap gap-2">
              {data.triage.preferences.map((pref) => (
                <span key={pref} className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-1 text-xs text-[#F5F0E8]">
                  {pref}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={14} className="text-[#C9A84C]" />
            <h2 className="text-lg font-black text-[#F5F0E8]">Client Reply</h2>
          </div>
          <p className="text-sm text-[#B8B0A0] leading-relaxed mb-4">{data.communications.latest_message}</p>
          <div className="rounded-2xl border border-[#1D9E75]/15 bg-[#1D9E75]/8 p-4 text-sm text-[#F5F0E8] leading-relaxed">
            {data.communications.suggested_follow_up}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black text-[#F5F0E8]">Itinerary Snapshot</h2>
          <div className="text-sm font-mono text-[#C9A84C]">{data.itinerary.currency} {data.itinerary.total_price.toLocaleString("en-IN")}</div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.itinerary.days.map((day) => (
            <div key={day.day_number} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[10px] uppercase tracking-widest text-[#C9A84C] font-mono mb-2">Day {day.day_number}</div>
              <h3 className="text-sm font-black text-[#F5F0E8] mb-2">{day.title}</h3>
              <p className="text-xs text-[#B8B0A0] leading-relaxed mb-4">{day.narrative}</p>
              <div className="space-y-3">
                {day.blocks.map((block, index) => (
                  <div key={`${block.title}-${index}`} className="rounded-xl border border-[#C9A84C]/10 bg-[#111111] p-3">
                    <div className="text-[10px] uppercase tracking-widest text-[#4A453E] font-mono mb-1">{block.type}</div>
                    <div className="text-sm font-semibold text-[#F5F0E8]">{block.title}</div>
                    <div className="text-xs text-[#B8B0A0] mt-1">{block.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <h2 className="text-lg font-black text-[#F5F0E8] mb-4">Finance Summary</h2>
          <div className="space-y-3 text-sm">
            <LineItem label="Quoted to Client" value={`₹${data.finance.quote_total.toLocaleString("en-IN")}`} />
            <LineItem label="Expected Cost" value={`₹${data.finance.cost_total.toLocaleString("en-IN")}`} />
            <LineItem label="Gross Profit" value={`₹${data.finance.gross_profit.toLocaleString("en-IN")}`} />
            <LineItem label="Margin" value={`${data.finance.margin_percent}%`} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4 text-sm text-[#C9A84C]">
            {data.finance.status}
          </div>
        </div>

        <div className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6">
          <h2 className="text-lg font-black text-[#F5F0E8] mb-4">Vendor Negotiation</h2>
          <div className="space-y-3 text-sm">
            <LineItem label="Primary Vendor" value={data.bidding.vendor} />
            <LineItem label="Status" value={data.bidding.status} />
          </div>
          <div className="mt-5 rounded-2xl border border-[#C9A84C]/15 bg-[#0A0A0A] p-4 text-sm text-[#B8B0A0] leading-relaxed">
            {data.bidding.note}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#111111] p-5">
      <div className="flex items-center gap-2 text-[#C9A84C] mb-3">{icon}<span className="text-[10px] uppercase tracking-widest font-mono">{label}</span></div>
      <div className="text-2xl font-black text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
      <div className="text-[10px] uppercase tracking-widest text-[#4A453E] font-mono mb-1">{label}</div>
      <div className="text-sm text-[#F5F0E8]">{value}</div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#C9A84C]/5 pb-2">
      <span className="text-[#B8B0A0]">{label}</span>
      <span className="text-[#F5F0E8] font-semibold">{value}</span>
    </div>
  );
}
