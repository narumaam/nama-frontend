"use client";

import React from 'react';
import { 
  Info, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  MoreHorizontal,
  Plus,
  IndianRupee,
  Terminal,
  Activity,
  ChevronRight,
  Download,
  Filter
} from 'lucide-react';

export default function FinancePage() {
  return (
    <div className="bg-[#0A0A0A] text-[#F5F0E8] -m-8 p-8 min-h-screen font-body">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-headline font-black tracking-tighter text-[#F5F0E8] mb-2 uppercase">Financial Ledger</h1>
          <p className="text-[#4A453E] font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
            System Node: <span className="text-[#1D9E75] font-black">ACTIVE // SECURE TRANSMISSION</span>
          </p>
        </div>
        <div className="flex items-center gap-3 bg-[#111111] p-2 rounded-lg border border-[#C9A84C]/15 shadow-xl">
          <div className="text-right px-4">
            <p className="text-[9px] text-[#4A453E] font-mono uppercase tracking-widest font-bold">Base Currency</p>
            <p className="font-mono text-lg font-black text-[#C9A84C]">INR (₹)</p>
          </div>
          <div className="w-[1px] h-8 bg-[#C9A84C]/10"></div>
          <div className="px-4">
            <p className="text-[9px] text-[#4A453E] font-mono uppercase tracking-widest font-bold">Operational Period</p>
            <p className="font-headline font-black text-[#F5F0E8] uppercase tracking-tighter">OCT 2026</p>
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Card 1: Total Revenue */}
        <div className="bg-[#111111] p-6 rounded-xl relative overflow-hidden group hover:bg-[#151515] transition-all border border-[#C9A84C]/10 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="font-headline text-[10px] font-black text-[#B8B0A0] uppercase tracking-[0.2em]">Total Inflow</p>
            <Info size={14} className="text-[#4A453E] cursor-help hover:text-[#C9A84C] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[#C9A84C] font-mono text-2xl font-black">₹</span>
            <h3 className="text-4xl font-mono font-black tracking-tighter text-[#F5F0E8]">8,42,12,000</h3>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[#1D9E75] text-[10px] font-mono font-black tracking-widest">+12.4%</span>
            <div className="h-[1px] flex-1 bg-[#1A1A1A] relative">
              <div className="absolute inset-y-0 left-0 bg-[#C9A84C] w-3/4 shadow-[0_0_10px_#C9A84C]"></div>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none text-[#C9A84C]">
            <TrendingUp size={112} />
          </div>
        </div>

        {/* Card 2: Total Cost */}
        <div className="bg-[#111111] p-6 rounded-xl relative overflow-hidden group hover:bg-[#151515] transition-all border border-[#C9A84C]/10 shadow-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="font-headline text-[10px] font-black text-[#B8B0A0] uppercase tracking-[0.2em]">Operational Drain</p>
            <Info size={14} className="text-[#4A453E] cursor-help hover:text-[#C9A84C] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-[#4A453E] font-mono text-2xl font-black">₹</span>
            <h3 className="text-4xl font-mono font-black tracking-tighter text-[#F5F0E8]">3,12,45,000</h3>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[#C9A84C] text-[10px] font-mono font-black tracking-widest">-2.1%</span>
            <div className="h-[1px] flex-1 bg-[#1A1A1A] relative">
              <div className="absolute inset-y-0 left-0 bg-[#4A453E] w-1/4"></div>
            </div>
          </div>
        </div>

        {/* Card 3: Net Margin */}
        <div className="bg-[#1A1A1A] p-6 rounded-xl relative overflow-hidden border border-[#C9A84C]/30 shadow-[0_20px_50px_rgba(201,168,76,0.1)]">
          <div className="absolute inset-0 bg-gradient-to-br from-[#C9A84C]/5 to-transparent pointer-events-none"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <p className="font-headline text-[10px] font-black text-[#C9A84C] uppercase tracking-[0.2em]">Net Alpha Margin</p>
            <Info size={14} className="text-[#C9A84C]/60 cursor-help hover:text-[#C9A84C] transition-colors" />
          </div>
          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-[#C9A84C] font-mono text-2xl font-black">₹</span>
            <h3 className="text-4xl font-mono font-black tracking-tighter text-[#F5F0E8]">5,29,67,000</h3>
          </div>
          <div className="mt-4 flex items-center gap-3 relative z-10">
            <span className="bg-[#1D9E75]/10 text-[#1D9E75] text-[9px] font-mono font-black px-2 py-0.5 rounded-full uppercase border border-[#1D9E75]/20 tracking-widest">On Target Efficiency</span>
            <span className="text-[#B8B0A0] text-[10px] font-mono uppercase tracking-wider">62.8% Operational Yield</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
        {/* P&L Trend Chart Placeholder */}
        <div className="lg:col-span-8 bg-[#111111] p-6 rounded-xl border border-[#C9A84C]/10 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h4 className="font-headline font-black text-sm uppercase tracking-[0.2em] text-[#F5F0E8]">Performance Vector // Quarterly Evolution</h4>
              <p className="text-[9px] font-mono text-[#4A453E] uppercase mt-1">Real-time consolidated yield metrics</p>
            </div>
            <div className="flex gap-6">
              <LegendItem color="bg-[#C9A84C]" label="Revenue Inflow" />
              <LegendItem color="bg-[#4A453E]" label="Expense Vector" />
            </div>
          </div>
          <div className="h-64 flex items-end justify-between gap-2 px-4">
            <ChartBar height="h-2/3" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
            <ChartBar height="h-3/4" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
            <ChartBar height="h-1/2" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
            <ChartBar height="h-4/5" color="bg-[#C9A84C] shadow-[0_0_20px_rgba(201,168,76,0.3)]" />
            <ChartBar height="h-2/3" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
            <ChartBar height="h-3/5" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
            <ChartBar height="h-full" color="bg-[#1A1A1A] hover:bg-[#C9A84C]/40" />
          </div>
          <div className="flex justify-between mt-6 border-t border-[#C9A84C]/5 pt-4 text-[9px] font-mono text-[#4A453E] uppercase tracking-[0.3em] font-bold">
            <span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span>
          </div>
        </div>

        {/* Cash Flow Snapshot */}
        <div className="lg:col-span-4 bg-[#111111] p-6 rounded-xl flex flex-col justify-between border border-[#C9A84C]/10 shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-8">
              <h4 className="font-headline font-black text-sm uppercase tracking-[0.2em] text-[#F5F0E8]">Flow Velocity</h4>
              <Activity size={18} className="text-[#C9A84C] opacity-50" />
            </div>
            <div className="space-y-8">
              <FlowItem label="Consolidated Inflow" value="₹ 12,410,000" color="text-[#1D9E75]" icon={<ArrowUpRight size={20} />} />
              <FlowItem label="Total Disbursement" value="₹ 8,125,000" color="text-[#C9A84C]" icon={<ArrowDownRight size={20} />} />
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-[#C9A84C]/10">
            <div className="p-5 bg-[#1A1A1A] rounded-xl border border-[#C9A84C]/20 relative group overflow-hidden">
              <div className="absolute top-0 left-0 w-[2px] h-full bg-[#C9A84C]"></div>
              <p className="text-[9px] font-mono text-[#4A453E] mb-2 uppercase tracking-[0.2em] font-black">Autonomous Runway Projection</p>
              <p className="text-3xl font-headline font-black text-[#F5F0E8] tracking-tighter uppercase">14.2 Months</p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Infrastructure */}
      <section className="bg-[#111111] rounded-xl overflow-hidden border border-[#C9A84C]/10 shadow-2xl mb-10">
        <div className="px-8 py-5 flex justify-between items-center border-b border-[#C9A84C]/10 bg-[#151515]">
          <h4 className="font-headline font-black text-sm uppercase tracking-[0.2em] text-[#F5F0E8]">Intelligence Ledger // Recent Transmissions</h4>
          <div className="flex gap-4">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0A] border border-[#C9A84C]/10 rounded text-[9px] font-bold uppercase tracking-widest text-[#B8B0A0] hover:border-[#C9A84C]/30 transition-all">
              <Filter size={12} className="text-[#C9A84C]" />
              Filter
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#C9A84C] border border-[#C9A84C] rounded text-[9px] font-black uppercase tracking-widest text-[#0A0A0A] hover:bg-[#B89840] transition-all">
              <Download size={12} />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0A0A0A] text-[9px] font-mono text-[#4A453E] uppercase tracking-widest font-black border-b border-[#C9A84C]/5">
                <th className="px-8 py-5">Node Timestamp</th>
                <th className="px-8 py-5">Entity / Reference Hash</th>
                <th className="px-8 py-5">Operational Class</th>
                <th className="px-8 py-5">Value Impact</th>
                <th className="px-8 py-5">Status Node</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#C9A84C]/5 text-sm">
              <TransactionRow 
                date="24 OCT 2026" 
                entity="Cloud Infrastructure Systems" 
                txnId="X-NODE-88291-B" 
                category="OPS_INFRA" 
                amount="- ₹ 4,12,000" 
                amountColor="text-[#F5F0E8] opacity-60"
                status="Consolidated" 
                statusColor="text-[#1D9E75]" 
                bgColor="bg-[#1D9E75]/10"
                borderColor="border-[#1D9E75]/20"
              />
              <TransactionRow 
                date="22 OCT 2026" 
                entity="Client: Horizon Global Ventures" 
                txnId="X-NODE-11023-A" 
                category="REV_SUBSCRIPTION" 
                amount="+ ₹ 8,90,000" 
                amountColor="text-[#C9A84C]"
                status="Transmission" 
                statusColor="text-[#C9A84C]" 
                bgColor="bg-[#C9A84C]/10"
                borderColor="border-[#C9A84C]/20"
                pulse={true}
              />
              <TransactionRow 
                date="21 OCT 2026" 
                entity="Tier-1 Office Lease // Tower B" 
                txnId="X-NODE-99212-C" 
                category="FIXED_OPS" 
                amount="- ₹ 12,50,000" 
                amountColor="text-[#F5F0E8] opacity-60"
                status="Consolidated" 
                statusColor="text-[#1D9E75]" 
                bgColor="bg-[#1D9E75]/10"
                borderColor="border-[#1D9E75]/20"
              />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function LegendItem({
  color,
  label,
}: {
  color: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-sm ${color}`}></span>
      <span className="text-[9px] font-mono text-[#4A453E] uppercase tracking-widest font-black">{label}</span>
    </div>
  );
}

function ChartBar({
  height,
  color,
}: {
  height: string;
  color: string;
}) {
  return <div className={`flex-1 ${color} transition-all duration-500 rounded-t-sm ${height}`}></div>;
}

function FlowItem({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between group">
      <div>
        <p className="text-[9px] font-mono text-[#4A453E] mb-1 uppercase tracking-[0.2em] font-black group-hover:text-[#B8B0A0] transition-colors">{label}</p>
        <p className={`font-mono text-2xl ${color} font-black tracking-tighter`}>{value}</p>
      </div>
      <div className={`${color} p-3 bg-[#0A0A0A] rounded-xl border border-[#C9A84C]/10 group-hover:border-[#C9A84C]/30 transition-all`}>{icon}</div>
    </div>
  );
}

function TransactionRow({
  date,
  entity,
  txnId,
  category,
  amount,
  amountColor,
  status,
  statusColor,
  bgColor,
  borderColor,
  pulse = false,
}: {
  date: string;
  entity: string;
  txnId: string;
  category: string;
  amount: string;
  amountColor: string;
  status: string;
  statusColor: string;
  bgColor: string;
  borderColor: string;
  pulse?: boolean;
}) {
  return (
    <tr className="hover:bg-[#1A1A1A] transition-all group">
      <td className="px-8 py-5 font-mono text-[10px] uppercase text-[#4A453E] font-bold">{date}</td>
      <td className="px-8 py-5">
        <div className="font-headline font-black text-[#F5F0E8] uppercase tracking-tighter text-sm group-hover:text-[#C9A84C] transition-colors">{entity}</div>
        <div className="text-[9px] font-mono text-[#4A453E] uppercase tracking-widest mt-0.5">{txnId}</div>
      </td>
      <td className="px-8 py-5">
        <span className="text-[9px] font-mono border border-[#C9A84C]/15 px-2 py-0.5 rounded-full text-[#B8B0A0] uppercase tracking-widest bg-[#0A0A0A]">
          {category}
        </span>
      </td>
      <td className={`px-8 py-5 font-mono font-black ${amountColor} text-sm tracking-tighter`}>{amount}</td>
      <td className="px-8 py-5">
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${borderColor} ${bgColor}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor.replace('text-', 'bg-')} ${pulse ? 'animate-pulse shadow-[0_0_8px_currentColor]' : ''}`}></span>
          <span className={`text-[9px] font-mono uppercase font-black tracking-widest ${statusColor}`}>{status}</span>
        </div>
      </td>
      <td className="px-8 py-5 text-right">
        <MoreHorizontal size={18} className="text-[#4A453E] hover:text-[#C9A84C] cursor-pointer transition-colors ml-auto" />
      </td>
    </tr>
  );
}
