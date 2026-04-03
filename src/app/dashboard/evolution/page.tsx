"use client";

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Brain, 
  TrendingUp, 
  Target, 
  History, 
  ChevronRight,
  ArrowUpRight,
  Activity,
  Cpu,
  RefreshCcw,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

export default function EvolutionPage() {
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => setIsOptimizing(false), 5000);
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#C9A84C] uppercase tracking-[0.3em] mb-2">
            <span>Evolution Workspace</span>
            <ChevronRight size={10} />
            <span className="opacity-50">Learning Feedback Loops</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter uppercase font-headline text-[#F5F0E8]">
            Agentic Evolution
          </h1>
          <p className="text-[#B8B0A0] font-mono text-xs mt-2 uppercase tracking-wide">
            Self-optimizing feedback loops · <span className="text-[#7B61FF] font-black uppercase">Active analysis</span> · Preview-safe learning view
          </p>
        </div>
        <button 
          onClick={handleOptimize}
          disabled={isOptimizing}
          className={`flex items-center gap-2 px-8 py-3 bg-[#7B61FF] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(123,97,255,0.2)] ${isOptimizing ? 'animate-pulse opacity-80' : 'hover:scale-[1.02]'}`}
        >
          {isOptimizing ? <><RefreshCcw size={16} className="animate-spin" /> Recalculating Learning Loop...</> : <><Zap size={16} /> Run Manual Learning Pass</>}
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Conversion Delta" value="+18.4%" trend="vs Last Month" color="text-[#1D9E75]" icon={TrendingUp} />
        <StatCard label="Agent Accuracy" value="96.2%" sub="Global Avg" icon={Target} />
        <StatCard label="Prompt Iterations" value="142" sub="Current Gen" icon={Cpu} />
        <StatCard label="Learning Cycles" value="12" sub="Today" icon={RefreshCcw} />
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: RSI Live Analysis (2/3) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Learning Loop */}
          <div className="bg-[#111111] border border-[#C9A84C]/15 rounded-3xl p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#7B61FF]/5 blur-[80px] rounded-full" />
            <div className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-3">
                <Brain size={20} className="text-[#7B61FF]" />
                <h4 className="font-black text-[14px] uppercase tracking-tighter text-[#F5F0E8]">Recursive Self-Improvement Feed</h4>
              </div>
              <span className={`px-3 py-1 ${isOptimizing ? 'bg-[#7B61FF]/20 text-[#7B61FF] animate-pulse' : 'bg-[#1D9E75]/20 text-[#1D9E75]'} text-[9px] font-black uppercase rounded-lg border border-current`}>
                {isOptimizing ? 'Evolution Active' : 'Live Monitor'}
              </span>
            </div>

            <div className="space-y-6 relative">
              {isOptimizing ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                   <RefreshCcw size={40} className="text-[#7B61FF] animate-spin mb-6" />
                   <p className="text-[14px] font-black uppercase text-[#F5F0E8] mb-2">Analyzing Conversion Vectors</p>
                   <p className="text-[10px] font-mono text-[#4A453E] uppercase tracking-widest max-w-sm">Recalculating learning weights from recent itinerary, quote, and follow-up patterns...</p>
                </div>
              ) : (
                <>
                  <RSILogItem 
                    type="SUCCESS" 
                    agent="Itinerary Agent" 
                    msg="Recent luxury itineraries convert better when premium differentiators are surfaced earlier in the reply and pricing story." 
                    delta="+4.2% Weighting" 
                  />
                  <RSILogItem 
                    type="ADJUSTMENT" 
                    agent="Triage Agent" 
                    msg="Refining tone for HNI (High Net-worth) queries. Decreasing verbosity by 15% to match user engagement patterns." 
                    delta="Prompt Rev v142.2" 
                  />
                  <RSILogItem 
                    type="DISCOVERY" 
                    agent="Bidding Agent" 
                    msg="A faster supplier-response cluster is outperforming slower fallback options and is being promoted for premium routing." 
                    delta="Cluster Updated" 
                  />
                  <RSILogItem 
                    type="OPTIMIZATION" 
                    agent="Core OS" 
                    msg="Sentiment analysis indicates high satisfaction for 'Quick Quote' WhatsApp template. Standardizing as Global Default." 
                    delta="NPS Target Hit" 
                  />
                </>
              )}
            </div>
          </div>

          {/* Prompt Evolution Graph Placeholder */}
          <div className="bg-[#111111] border border-[#C9A84C]/15 rounded-3xl p-8 shadow-xl">
             <h4 className="font-black text-[12px] uppercase tracking-tighter text-[#F5F0E8] mb-8">Agent Performance Evolution</h4>
             <div className="h-64 flex items-end gap-3 px-4">
                {[45, 62, 58, 72, 85, 91, 88, 96, 94, 98].map((h, i) => (
                  <div key={i} className="flex-1 group relative">
                    <div 
                      className="w-full bg-gradient-to-t from-[#7B61FF]/40 to-[#7B61FF] rounded-t-lg transition-all duration-1000 group-hover:opacity-80" 
                      style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                    />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black border border-white/10 px-2 py-1 rounded font-mono text-[9px]">
                      {h}%
                    </div>
                  </div>
                ))}
             </div>
             <div className="flex justify-between mt-6 text-[9px] font-mono text-[#4A453E] uppercase tracking-widest">
                <span>Week 1</span>
                <span>Week 2</span>
                <span>Week 3</span>
                <span>Week 4</span>
                <span>Week 5 (Current)</span>
             </div>
          </div>
        </div>

        {/* Right: Model Config & Health (1/3) */}
        <div className="space-y-8">
          
          {/* Active Model */}
          <div className="bg-[#111111] border border-[#C9A84C]/15 rounded-3xl p-8 shadow-xl">
            <h4 className="font-black text-[11px] uppercase tracking-[0.2em] font-mono text-[#F5F0E8] mb-8">Model Configuration</h4>
            <div className="space-y-6">
              <ModelParam label="Learning Baseline" value="Preview operator model" />
              <ModelParam label="Fine-Tuning" value="NAMA Travel Instruct v3" />
              <ModelParam label="Temperature" value="0.4 (Optimized)" />
              <div className="pt-4 border-t border-[#C9A84C]/10">
                <label className="text-[9px] font-black text-[#4A453E] uppercase tracking-widest font-mono mb-4 block">Learning Threshold</label>
                <div className="h-1.5 w-full bg-[#1A1A1A] rounded-full overflow-hidden border border-[#C9A84C]/5 mb-3">
                   <div className="h-full bg-[#7B61FF] w-[75%]" />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-[#B8B0A0] uppercase font-black">
                   <span>Safety</span>
                   <span>75% Efficiency</span>
                </div>
              </div>
            </div>
          </div>

          {/* Self-Improvement Status */}
          <div className="bg-[#0A0A0A] border border-[#7B61FF]/20 rounded-3xl p-8 shadow-2xl">
             <div className="flex items-center gap-3 mb-6">
                <Activity size={18} className="text-[#1D9E75]" />
                <h4 className="font-black text-[11px] uppercase tracking-[0.2em] font-mono text-[#F5F0E8]">System Health</h4>
             </div>
             <div className="space-y-4">
                <HealthItem label="Context Recall" status="99.2%" color="text-[#1D9E75]" />
                <HealthItem label="Token Efficiency" status="+22%" color="text-[#1D9E75]" />
                <HealthItem label="Latent space Audit" status="PASS" color="text-[#1D9E75]" />
                <HealthItem label="Bias Detection" status="ZERO" color="text-[#1CB5E0]" />
             </div>
          </div>

          {/* RSI Explanation */}
          <div className="bg-[#7B61FF]/5 border border-[#7B61FF]/20 rounded-3xl p-6">
            <p className="text-[10px] text-[#B8B0A0] leading-relaxed italic">
              &ldquo;This view shows how NAMA improves prompts, routing, and operating decisions over time. Present it as a preview-safe learning layer, not as unchecked autonomous retraining in production.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  color = "text-[#F5F0E8]",
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  icon: LucideIcon;
  color?: string;
}) {
  return (
    <div className="bg-[#111111] border border-[#C9A84C]/15 p-6 rounded-3xl shadow-xl hover:border-[#7B61FF]/30 transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-2xl bg-[#1A1A1A] flex items-center justify-center text-[#7B61FF] border border-[#7B61FF]/10 group-hover:scale-110 transition-transform">
          <Icon size={20} />
        </div>
        {trend && <span className="text-[9px] font-mono font-black text-[#1D9E75] uppercase tracking-widest">{trend}</span>}
      </div>
      <p className="text-[10px] font-black text-[#4A453E] uppercase tracking-widest font-mono mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black font-headline tracking-tighter ${color}`}>{value}</span>
        {sub && <span className="text-[10px] font-mono text-[#B8B0A0] opacity-50 uppercase tracking-widest">{sub}</span>}
      </div>
    </div>
  );
}

function RSILogItem({
  type,
  agent,
  msg,
  delta,
}: {
  type: 'SUCCESS' | 'ADJUSTMENT' | 'DISCOVERY' | 'OPTIMIZATION';
  agent: string;
  msg: string;
  delta: string;
}) {
  const isAdjustment = type === 'ADJUSTMENT';
  return (
    <div className="flex gap-4 p-4 rounded-2xl border border-transparent hover:border-[#7B61FF]/10 hover:bg-[#1A1A1A]/50 transition-all cursor-default">
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${type === 'SUCCESS' ? 'bg-[#1D9E75]' : type === 'ADJUSTMENT' ? 'bg-[#7B61FF]' : 'bg-[#1CB5E0]'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] font-black font-mono text-[#4A453E] uppercase tracking-widest">{agent}</span>
          <span className={`text-[9px] font-black font-mono uppercase tracking-widest ${type === 'SUCCESS' ? 'text-[#1D9E75]' : 'text-[#7B61FF]'}`}>{delta}</span>
        </div>
        <p className="text-[12px] text-[#F5F0E8] leading-relaxed font-body">{msg}</p>
      </div>
    </div>
  );
}

function ModelParam({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 border-b border-[#C9A84C]/5">
      <p className="text-[9px] font-black text-[#4A453E] uppercase tracking-widest font-mono">{label}</p>
      <p className="text-[11px] font-bold text-[#F5F0E8] text-right">{value}</p>
    </div>
  );
}

function HealthItem({
  label,
  status,
  color,
}: {
  label: string;
  status: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-black text-[#4A453E] uppercase tracking-widest font-mono">{label}</span>
      <span className={`text-[10px] font-black font-mono uppercase tracking-widest ${color}`}>{status}</span>
    </div>
  );
}
