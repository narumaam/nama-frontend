"use client";

import React from 'react';
import Link from 'next/link';
import ScreenInfoTip from '@/components/screen-info-tip';
import { SCREEN_HELP } from '@/lib/screen-help';
import { 
  Download, 
  IndianRupee, 
  ArrowRightLeft, 
  Clock, 
  Network, 
  MoreVertical, 
  Zap,
  Activity,
  ChevronRight,
  Info,
  TrendingUp,
  ExternalLink,
  PlusCircle,
  LogOut,
  Terminal,
  Settings,
  Bell,
  Search
} from 'lucide-react';

const ANALYTICS_PATHWAYS = [
  { label: 'Overview', href: '/dashboard', note: 'Start the walkthrough from the command center.' },
  { label: 'Leads', href: '/dashboard/leads', note: 'Show capture, urgency, and owner load.' },
  { label: 'Deals', href: '/dashboard/deals?case=maldives-honeymoon', note: 'Open the decision-rich conversion story.' },
  { label: 'Finance', href: '/dashboard/finance', note: 'Move into margin and deposit control.' },
  { label: 'Bookings', href: '/dashboard/bookings', note: 'Finish in execution and handoff.' },
  { label: 'Artifacts', href: '/dashboard/artifacts', note: 'Jump straight to invoice and traveler outputs.' },
];

const ANALYTICS_CONTINUITY = [
  { label: 'Decision traces', value: 'Captured', note: 'Human edits, overrides, and approvals feed the learning loop.' },
  { label: 'Path integrity', value: 'Linked', note: 'Analytics now points back into the live operating surfaces.' },
  { label: 'Demo story', value: 'Investor-safe', note: 'Use this page to narrate the business, not just the charts.' },
];

export default function AnalyticsPage() {
  return (
    <div className="bg-[#0A0A0A] text-[#F5F0E8] -m-8 p-8 min-h-screen font-body">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black font-headline tracking-tighter mb-1 uppercase">
              CRM Analytics <span className="text-[#C9A84C]">&amp;</span> Lead ROI
            </h1>
            <ScreenInfoTip content={SCREEN_HELP.analytics} />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-[#C9A84C] mb-2">
            <span>Analytics Workspace</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Founder Demo Intelligence</span>
          </div>
          <p className="text-[#B8B0A0] text-sm flex items-center gap-2 font-mono uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#1D9E75] animate-pulse shadow-[0_0_8px_#1D9E75]"></span>
            Demo intelligence cycle: April 2026
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-[#111111] rounded-lg p-1 border border-[#C9A84C]/10">
            <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded bg-[#1A1A1A] text-[#C9A84C] border border-[#C9A84C]/20 shadow-[0_0_10px_rgba(201,168,76,0.1)]">Live</button>
            <button className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded text-[#4A453E] hover:text-[#B8B0A0] transition-colors">Historical</button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] border border-[#C9A84C]/15 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-[#222222] transition-all text-[#F5F0E8]">
            <Download size={14} className="text-[#C9A84C]" />
            Export Snapshot
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 mb-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-[#C9A84C]">Dashboard Continuity</div>
            <h2 className="text-lg font-black uppercase tracking-tight text-[#F5F0E8]">Use analytics as the narration layer, not a dead end</h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              This surface shows the story of the operating system, then lets the presenter jump directly back into the live workflow where the action happens.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ANALYTICS_PATHWAYS.map((pathway) => (
              <Link
                key={pathway.label}
                href={pathway.href}
                className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10"
              >
                {pathway.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {ANALYTICS_CONTINUITY.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[#C9A84C]/10 bg-[#0A0A0A] p-4">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#C9A84C]">{item.label}</div>
              <div className="mt-2 text-sm font-black text-[#F5F0E8]">{item.value}</div>
              <div className="mt-2 text-sm leading-relaxed text-[#B8B0A0]">{item.note}</div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/dashboard" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
            Back to overview
          </Link>
          <Link href="/dashboard/leads" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
            Leads
          </Link>
          <Link href="/dashboard/finance" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
            Finance
          </Link>
          <Link href="/dashboard/bookings" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
            Bookings
          </Link>
        </div>
      </section>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <KPICard 
          label="Total Lead Pipeline" 
          value="₹8,42,50,000" 
          change="+12.4%" 
          comparison="vs prior baseline" 
          icon={<IndianRupee className="text-6xl text-[#C9A84C] opacity-5 group-hover:opacity-10 transition-opacity" />}
          borderColor="border-[#C9A84C]"
          isPositive={true}
        />
        <KPICard 
          label="Conversion Efficiency" 
          value="24.8%" 
          change="+3.1%" 
          comparison="close-rate lift" 
          icon={<ArrowRightLeft className="text-6xl text-[#C9A84C] opacity-5 group-hover:opacity-10 transition-opacity" />}
          borderColor="border-[#1D9E75]"
          isPositive={true}
        />
        <KPICard 
          label="Response Latency" 
          value="14m 22s" 
          change="-2m 10s" 
          comparison="faster first response" 
          icon={<Clock className="text-6xl text-[#C9A84C] opacity-5 group-hover:opacity-10 transition-opacity" />}
          borderColor="border-[#C9A84C]/40"
          isPositive={true}
        />
        <KPICard 
          label="Primary Channel" 
          value="Instagram" 
          change="42% Share" 
          comparison="top source mix" 
          icon={<Network className="text-6xl text-[#C9A84C] opacity-5 group-hover:opacity-10 transition-opacity" />}
          borderColor="border-[#1D9E75]"
          isPositive={true}
          secondary={true}
        />
      </div>

      {/* Main Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* Revenue Forecast Chart */}
        <div className="lg:col-span-8 bg-[#111111] p-6 rounded-xl border border-[#C9A84C]/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#C9A84C]/20 to-transparent"></div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="font-headline font-black text-lg tracking-tighter uppercase text-[#F5F0E8]">Revenue Forecast</h3>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#B8B0A0] font-mono">Projected vs Actuals (₹ Million)</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#C9A84C]"></span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#B8B0A0]">Actual</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm bg-[#1D9E75] opacity-50"></span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-[#B8B0A0]">Target</span>
              </div>
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-2">
            <Bar month="APR" height="h-32" actualHeight="h-1/2" targetOffset="bottom-1/2" targetHeight="h-[20%]" />
            <Bar month="MAY" height="h-40" actualHeight="h-3/4" targetOffset="bottom-3/4" targetHeight="h-[10%]" />
            <Bar month="JUN" height="h-48" actualHeight="h-[90%]" targetOffset="bottom-[90%]" targetHeight="h-[5%]" />
            <Bar month="JUL*" height="h-56" actualHeight="h-full" isCurrent={true} animate={true} />
            <Bar month="AUG" height="h-44" isProjection={true} projectionHeight="h-1/2" />
            <Bar month="SEP" height="h-52" isProjection={true} projectionHeight="h-2/3" />
          </div>
        </div>

        {/* Lead Source ROI */}
        <div className="lg:col-span-4 bg-[#171717] p-6 rounded-xl border border-[#C9A84C]/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-black text-lg tracking-tighter uppercase text-[#F5F0E8]">Lead Source ROI</h3>
            <MoreVertical size={20} className="text-[#4A453E]" />
          </div>
          <div className="space-y-6">
            <ProgressBar label="Instagram Ads" value={48} color="bg-[#C9A84C]" glowColor="rgba(201,168,76,0.3)" />
            <ProgressBar label="Web Direct" value={32} color="bg-[#1D9E75]" glowColor="rgba(29,158,117,0.3)" />
            <ProgressBar label="Referrals" value={65} color="bg-[#C9A84C]/60" glowColor="rgba(201,168,76,0.1)" />
            <ProgressBar label="Organic Search" value={18} color="bg-[#1A1A1A] border border-[#C9A84C]/20" />
          </div>
          <div className="mt-8 p-4 bg-[#111111] rounded-lg border border-[#C9A84C]/10">
            <p className="text-[11px] text-[#B8B0A0] italic leading-relaxed">
              <span className="text-[#1D9E75] font-black font-mono mr-2">CORE INSIGHT:</span> Referral leads convert faster in the current set. Strategy: shift acquisition spend toward higher-intent channels.
            </p>
          </div>
        </div>
      </div>

      {/* Bento Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Agent Performance Leaderboard */}
        <div className="lg:col-span-7 bg-[#111111] p-6 rounded-xl border border-[#C9A84C]/10 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-headline font-black text-lg tracking-tighter uppercase text-[#F5F0E8]">Agent Leaderboard</h3>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#C9A84C] border border-[#C9A84C]/30 px-2 py-1 rounded bg-[#C9A84C]/5">Demo Intelligence Cycle</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] border-b border-[#C9A84C]/10">
                  <th className="text-left py-3 font-bold">Identity</th>
                  <th className="text-left py-3 font-bold">Closed Value</th>
                  <th className="text-left py-3 font-bold">Cvr %</th>
                  <th className="text-left py-3 font-bold">Efficiency</th>
                  <th className="text-right py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C9A84C]/5">
                <AgentRow name="Arjun Kapoor" role="SENIOR LEAD" initials="AK" value="₹1.2Cr" cvr="32.4%" status="Peak" statusColor="text-[#1D9E75]" bgColor="bg-[#1D9E75]/10" borderColor="border-[#1D9E75]/20" efficiency={3} efficiencyColor="bg-[#1D9E75]" initialsColor="text-[#C9A84C]" />
                <AgentRow name="Saira Nair" role="ACCOUNT EXEC" initials="SN" value="₹88.5L" cvr="28.1%" status="Steady" statusColor="text-[#C9A84C]" bgColor="bg-[#C9A84C]/10" borderColor="border-[#C9A84C]/20" efficiency={2} efficiencyColor="bg-[#C9A84C]" initialsColor="text-[#1D9E75]" />
                <AgentRow name="Rohan Verma" role="ASSOCIATE" initials="RV" value="₹42.2L" cvr="14.5%" status="Optimize" statusColor="text-red-400" bgColor="bg-red-400/10" borderColor="border-red-400/20" efficiency={1} efficiencyColor="bg-[#C9A84C]/30" initialsColor="text-[#C9A84C]" />
              </tbody>
            </table>
          </div>
        </div>

        {/* Lead Scoring & Profitability */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#171717] p-6 rounded-xl border border-[#C9A84C]/10 flex-1 flex flex-col shadow-xl">
            <h3 className="font-headline font-black text-lg tracking-tighter uppercase text-[#F5F0E8] mb-4">Segment Yield</h3>
            <div className="flex-1 space-y-4">
              <SegmentCard title="Luxury Outbound (Europe)" roi="ALPHA ROI" margin="18.5%" ticket="₹4,50,000" color="border-[#C9A84C]" roiColor="text-[#1D9E75]" />
              <SegmentCard title="Domestic Corporate" roi="VOLUME SCALE" margin="6.2%" ticket="₹85,000" color="border-[#1D9E75]" roiColor="text-[#C9A84C]" />
              <SegmentCard title="Budget Group Tours" roi="MARGIN TRAP" margin="3.1%" ticket="₹25,000" color="border-[#4A453E]" roiColor="text-red-400" />
            </div>
          </div>
          {/* Micro Dashboard Widgets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#111111] p-4 rounded-xl border border-[#C9A84C]/10 flex flex-col justify-between">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-2">Core Health</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#1D9E75] rounded-full shadow-[0_0_8px_rgba(29,158,117,0.8)]"></span>
                <span className="text-xs font-bold font-headline uppercase tracking-tighter">99.9% Autonomous</span>
              </div>
            </div>
            <div className="bg-[#111111] p-4 rounded-xl border border-[#C9A84C]/10 flex flex-col justify-between">
              <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-[#4A453E] mb-2">IO Latency</div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full shadow-[0_0_8px_rgba(201,168,76,0.8)]"></span>
                <span className="text-xs font-bold font-headline uppercase tracking-tighter">42ms Realtime</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tactical Alert */}
      <div className="fixed bottom-6 right-6 z-[60]">
        <div className="bg-[#111111]/90 backdrop-blur-xl border border-[#C9A84C]/30 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 max-w-xs border-b-4 border-b-[#C9A84C]">
          <div className="w-10 h-10 rounded-full bg-[#C9A84C]/20 flex items-center justify-center text-[#C9A84C]">
            <Zap size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-[#C9A84C] font-black">Priority Signal</div>
            <div className="text-xs font-bold text-[#F5F0E8] leading-tight font-headline uppercase tracking-tighter">High-yield inquiry pattern detected in the active pipeline.</div>
          </div>
          <button className="text-[#4A453E] hover:text-[#C9A84C] transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <section className="rounded-3xl border border-[#C9A84C]/10 bg-[#111111] p-6 shadow-xl mb-10">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.25em] text-[#C9A84C]">Demo Continuity</div>
            <div className="mt-2 text-lg font-black uppercase tracking-tight text-[#F5F0E8]">Analytics is the explanation layer, not the exit point</div>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#B8B0A0]">
              Use these metrics to explain why the founder path works, then jump back into the live operating surfaces so the demo stays concrete and grounded.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
              Overview
            </Link>
            <Link href="/dashboard/deals?case=maldives-honeymoon" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
              Core deal
            </Link>
            <Link href="/dashboard/finance" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
              Finance
            </Link>
            <Link href="/dashboard/bookings" className="rounded-full border border-[#C9A84C]/15 bg-[#0A0A0A] px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[#C9A84C] transition-colors hover:bg-[#C9A84C]/10">
              Bookings
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function KPICard({
  label,
  value,
  change,
  comparison,
  icon,
  borderColor,
  isPositive,
  secondary = false,
  error = false,
}: {
  label: string;
  value: string;
  change: string;
  comparison: string;
  icon: React.ReactNode;
  borderColor: string;
  isPositive: boolean;
  secondary?: boolean;
  error?: boolean;
}) {
  return (
    <div className={`bg-[#111111] p-6 rounded-xl border-t border-r border-b border-r-[#C9A84C]/10 border-b-[#C9A84C]/10 border-t-[#C9A84C]/5 border-l-[3px] ${borderColor} relative overflow-hidden group hover:bg-[#151515] transition-all shadow-xl`}>
      <div className="absolute -bottom-4 -right-4 transition-transform group-hover:scale-110">
        {icon}
      </div>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <span className="text-[10px] uppercase tracking-[0.2em] text-[#B8B0A0] font-mono">{label}</span>
        <Info size={12} className="text-[#4A453E] cursor-help" />
      </div>
      <div className="font-headline text-2xl font-black mb-1 tracking-tighter uppercase relative z-10">{value}</div>
      <div className="flex items-center gap-2 text-[10px] font-mono relative z-10">
        <span className={`${isPositive ? 'text-[#1D9E75]' : (error ? 'text-red-400' : 'text-[#C9A84C]')} font-bold`}>
          {change}
        </span>
        <span className="text-[#4A453E] uppercase tracking-wider">{comparison}</span>
      </div>
    </div>
  );
}

function Bar({
  month,
  height,
  actualHeight,
  targetOffset,
  targetHeight,
  isCurrent = false,
  animate = false,
  isProjection = false,
  projectionHeight,
}: {
  month: string;
  height: string;
  actualHeight?: string;
  targetOffset?: string;
  targetHeight?: string;
  isCurrent?: boolean;
  animate?: boolean;
  isProjection?: boolean;
  projectionHeight?: string;
}) {
  return (
    <div className="flex flex-col items-center flex-1 group">
      <div className={`w-full bg-[#1A1A1A] rounded-t-sm relative ${height} mb-2 transition-all group-hover:bg-[#C9A84C]/5`}>
        {isProjection ? (
          <div className={`absolute bottom-0 w-full border-t-2 border-[#C9A84C]/20 border-dashed ${projectionHeight}`}></div>
        ) : (
          <>
            <div className={`absolute bottom-0 w-full ${isCurrent ? 'bg-gradient-to-t from-[#C9A84C] to-[#E5C56E]' : 'bg-[#C9A84C]/80'} ${actualHeight} rounded-t-sm ${animate ? 'shadow-[0_0_15px_rgba(201,168,76,0.3)]' : ''}`}></div>
            {targetHeight && (
              <div className={`absolute ${targetOffset} w-full border-t border-dashed border-[#1D9E75]/40 ${targetHeight}`}></div>
            )}
          </>
        )}
      </div>
      <span className={`text-[9px] font-mono tracking-widest ${isCurrent ? 'text-[#C9A84C] font-black' : 'text-[#4A453E]'} uppercase`}>{month}</span>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  color,
  glowColor,
}: {
  label: string;
  value: number;
  color: string;
  glowColor?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[9px] font-mono mb-2 uppercase tracking-widest">
        <span className="text-[#B8B0A0]">{label}</span>
        <span className={`${color.replace('bg-', 'text-')} font-black`}>{value}% Yield</span>
      </div>
      <div className="w-full h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-1000`} 
          style={{ width: `${value}%`, boxShadow: glowColor ? `0 0 10px ${glowColor}` : 'none' }}
        ></div>
      </div>
    </div>
  );
}

function AgentRow({
  name,
  role,
  initials,
  value,
  cvr,
  status,
  statusColor,
  bgColor,
  borderColor,
  efficiency,
  efficiencyColor,
  initialsColor,
}: {
  name: string;
  role: string;
  initials: string;
  value: string;
  cvr: string;
  status: string;
  statusColor: string;
  bgColor: string;
  borderColor: string;
  efficiency: number;
  efficiencyColor: string;
  initialsColor: string;
}) {
  return (
    <tr className="group hover:bg-[#1A1A1A] transition-colors">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-[#0A0A0A] border border-[#C9A84C]/20 flex items-center justify-center font-black text-[10px] font-mono ${initialsColor}`}>{initials}</div>
          <div>
            <div className="text-xs font-bold font-headline uppercase tracking-tighter">{name}</div>
            <div className="text-[9px] text-[#4A453E] font-mono uppercase tracking-widest">{role}</div>
          </div>
        </div>
      </td>
      <td className="py-4 text-xs font-bold font-mono text-[#F5F0E8]">{value}</td>
      <td className="py-4 text-xs font-mono text-[#B8B0A0]">{cvr}</td>
      <td className="py-4">
        <div className="flex gap-1.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className={`w-1.5 h-3 ${i < efficiency ? efficiencyColor : 'bg-[#1A1A1A]'} rounded-sm border border-white/5`}></div>
          ))}
        </div>
      </td>
      <td className="py-4 text-right">
        <span className={`text-[8px] font-mono font-black uppercase tracking-[0.2em] ${bgColor} ${statusColor} px-2 py-0.5 rounded-full border ${borderColor}`}>{status}</span>
      </td>
    </tr>
  );
}

function SegmentCard({
  title,
  roi,
  margin,
  ticket,
  color,
  roiColor,
}: {
  title: string;
  roi: string;
  margin: string;
  ticket: string;
  color: string;
  roiColor: string;
}) {
  return (
    <div className={`p-4 bg-[#111111] rounded border border-[#C9A84C]/5 border-l-4 ${color} hover:bg-[#151515] transition-all group`}>
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold font-headline uppercase tracking-tighter group-hover:text-[#C9A84C] transition-colors">{title}</span>
        <span className={`text-[9px] font-mono font-black tracking-widest ${roiColor}`}>{roi}</span>
      </div>
      <div className="text-[9px] text-[#B8B0A0] font-mono uppercase tracking-wider">Margin: <span className="text-[#F5F0E8]">{margin}</span> | Ticket: <span className="text-[#F5F0E8]">{ticket}</span></div>
    </div>
  );
}
