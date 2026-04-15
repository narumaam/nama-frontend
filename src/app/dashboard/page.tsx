'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Briefcase,
  Map,
  CreditCard,
  Plus,
  ArrowRight,
  Zap,
  Loader,
  AlertCircle
} from 'lucide-react'
import { analyticsApi, leadsApi, DashboardStats, Lead } from '@/lib/api'

const StatCard = ({ label, value, trend, status, icon: Icon }: any) => (
  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#00236f]">
        <Icon size={24} />
      </div>
      <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
        status === 'UP' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
      }`}>
        {status === 'UP' ? <TrendingUp size={14} className="mr-1" /> : <TrendingDown size={14} className="mr-1" />}
        {trend}%
      </div>
    </div>
    <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
    <div className="text-3xl font-extrabold text-[#00236f]">{value}</div>
  </div>
)

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardStats | null>(null)
  const [recentLeads, setRecentLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsData, leadsData] = await Promise.all([
        analyticsApi.dashboard(),
        leadsApi.list({ size: 5 }).catch(() => ({ items: [], total: 0 })),
      ])
      setSummary(statsData)
      setRecentLeads(leadsData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-96 text-slate-400">
        <Loader size={32} className="animate-spin" />
      </div>
    )

  return (
    <div className="space-y-10">
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-[#00236f]">Operations Overview</h1>
          <p className="text-slate-500 mt-2 font-medium">Real-time performance across your DMC supply chain.</p>
        </div>
        <Link
          href="/dashboard/itineraries"
          className="bg-[#00236f] text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-[#00236f]/10 hover:bg-slate-800 transition-all active:scale-95"
        >
          <Plus size={20} className="mr-2" /> New Itinerary
        </Link>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Revenue (GMV)"
            value={`₹${summary.gmv.value.toLocaleString()}`}
            trend={summary.gmv.trend}
            status={summary.gmv.status}
            icon={CreditCard}
          />
          <StatCard
            label="Conversion Rate"
            value={`${summary.conversion_rate.value}%`}
            trend={summary.conversion_rate.trend}
            status={summary.conversion_rate.status}
            icon={TrendingUp}
          />
          <StatCard
            label="Total Leads"
            value={summary.total_leads.value}
            trend={summary.total_leads.trend}
            status={summary.total_leads.status}
            icon={Users}
          />
          <StatCard
            label="Active Itineraries"
            value={summary.active_itineraries.value}
            trend={summary.active_itineraries.trend}
            status={summary.active_itineraries.status}
            icon={Map}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-slate-100 shadow-sm p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-bold text-[#00236f]">Recent Leads</h3>
            <Link href="/dashboard/leads" className="text-[#14B8A6] font-bold text-sm flex items-center hover:underline">
              View All <ArrowRight size={16} className="ml-1" />
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No leads yet. Create a new inquiry to get started.</div>
          ) : (
            <div className="space-y-4">
              {recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-[#00236f]/5 flex items-center justify-center font-bold text-[#00236f]">
                      {(lead.full_name || `Lead ${lead.id}`).split(' ').map((n) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">{lead.full_name || `Lead #${lead.id}`}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        {lead.destination || 'N/A'} • {lead.travel_style}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-8">
                    <div
                      className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                        lead.status === 'QUALIFIED'
                          ? 'bg-blue-50 text-blue-600'
                          : lead.status === 'PROPOSAL_SENT'
                            ? 'bg-orange-50 text-orange-600'
                            : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {lead.status}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-bold">CONFIDENCE</div>
                      <div className="text-sm font-black text-[#14B8A6]">{lead.triage_confidence}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#00236f] rounded-[32px] p-8 text-white relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6]/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6">
              <Zap size={24} className="text-[#14B8A6]" fill="currentColor" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Kinetic Intelligence</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              The AI Agent Swarm is monitoring active supply chains. No critical anomalies detected.
            </p>

            <div className="space-y-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
                  AI Status
                </div>
                <div className="text-sm text-slate-200">Autonomous agents active and monitoring vendor networks.</div>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">
                  Next Action
                </div>
                <div className="text-sm text-slate-200">Review itinerary proposals and confirm bookings.</div>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="relative z-10 w-full bg-[#14B8A6] text-[#00236f] py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[#14B8A6]/10 mt-8 hover:scale-[1.02] transition-transform inline-block text-center"
          >
            Switch to Kinetic OS
          </Link>
        </div>
      </div>
    </div>
  )
}
