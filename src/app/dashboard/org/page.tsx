'use client'

import React, { useState, useEffect } from 'react'
import {
  TrendingUp, Users, Clock, Target, AlertTriangle, ChevronRight,
  Shield, Plus, Search, UserPlus, Mail,
  MoreVertical, Edit3, Trash2, RefreshCw, CheckCircle, X, Zap,
  CreditCard, BarChart3, Star, Award, ArrowUp, ArrowDown, ArrowRight,
  Building2, UserCheck, DollarSign, Activity, Lock,
  AlertCircle, Download, Settings, Loader2,
} from 'lucide-react'
import { rolesApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

type OrgTab = 'overview' | 'orgchart' | 'roles' | 'team' | 'subscription'

interface AgentStat {
  id: string
  name: string
  initials: string
  role: string
  revenue: number
  conversion: number
  responseMin: number
  aiScore: number
  leads: number
  bookings: number
  trend: 'up' | 'down' | 'flat'
}

interface RiskItem {
  id: string
  label: string
  amount?: string
  urgency: 'high' | 'medium' | 'low'
  timeAgo: string
  icon: 'lead' | 'vendor' | 'finance'
}

interface OrgNode {
  id: string
  name: string
  role: string
  roleBadge: string
  stat: string
  statLabel: string
  active: boolean
  color: string
  children?: OrgNode[]
}

type PermKey = string

interface RoleDef {
  id: string
  label: string
  memberCount: number
  color: string
  bg: string
  locked?: boolean
  perms: Record<PermKey, boolean>
}

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
  roleLabel: string
  roleBadge: string
  status: 'active' | 'invited' | 'suspended'
  lastActive: string
  avatar: string
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const AGENTS: AgentStat[] = [
  { id: '1', name: 'Narayan M.', initials: 'NM', role: 'Owner', revenue: 2340000, conversion: 74, responseMin: 8, aiScore: 94, leads: 0, bookings: 48, trend: 'up' },
  { id: '2', name: 'Priya Sharma', initials: 'PS', role: 'Org Admin', revenue: 1820000, conversion: 67, responseMin: 14, aiScore: 88, leads: 42, bookings: 31, trend: 'up' },
  { id: '3', name: 'Rahul Verma', initials: 'RV', role: 'Sales Manager', revenue: 1140000, conversion: 58, responseMin: 22, aiScore: 76, leads: 38, bookings: 22, trend: 'flat' },
  { id: '4', name: 'Divya K.', initials: 'DK', role: 'Ops Lead', revenue: 680000, conversion: 52, responseMin: 31, aiScore: 71, leads: 19, bookings: 14, trend: 'down' },
  { id: '5', name: 'Anil Gupta', initials: 'AG', role: 'Sales Agent', revenue: 310000, conversion: 43, responseMin: 45, aiScore: 62, leads: 11, bookings: 6, trend: 'down' },
]

const RISKS: RiskItem[] = [
  { id: '1', label: 'Lead #204 unattended 3h 12m · ₹2.8L at risk', amount: '₹2.8L', urgency: 'high', timeAgo: '3h 12m ago', icon: 'lead' },
  { id: '2', label: 'Vendor Ritz-Carlton contract expiring in 7 days', urgency: 'medium', timeAgo: '7 days', icon: 'vendor' },
  { id: '3', label: 'Finance reconciliation 4 days overdue', urgency: 'high', timeAgo: '4 days', icon: 'finance' },
]

const ORG_TREE: OrgNode = {
  id: 'root',
  name: 'Priya Sharma',
  role: 'R2_ORG_ADMIN',
  roleBadge: 'Company Admin',
  stat: '₹62.8L',
  statLabel: 'total revenue',
  active: true,
  color: 'border-[#14B8A6]',
  children: [
    {
      id: 'sales',
      name: 'Rahul Verma',
      role: 'R3_SALES_MANAGER',
      roleBadge: 'Sales Manager',
      stat: '38 leads',
      statLabel: 'active',
      active: true,
      color: 'border-blue-400',
      children: [
        { id: 'sa1', name: 'Anil Gupta', role: 'R3_SALES_AGENT', roleBadge: 'Sales Agent', stat: '11 leads', statLabel: 'assigned', active: true, color: 'border-blue-200' },
        { id: 'sa2', name: 'Meera Nair', role: 'R3_SALES_AGENT', roleBadge: 'Sales Agent', stat: '9 leads', statLabel: 'assigned', active: true, color: 'border-blue-200' },
        { id: 'sa3', name: 'Suresh Pillai', role: 'R3_SALES_AGENT', roleBadge: 'Sales Agent', stat: '7 leads', statLabel: 'assigned', active: false, color: 'border-blue-200' },
      ],
    },
    {
      id: 'ops',
      name: 'Divya K.',
      role: 'R4_OPS_EXECUTIVE',
      roleBadge: 'Ops Lead',
      stat: '8 bookings',
      statLabel: 'in-progress',
      active: true,
      color: 'border-amber-400',
      children: [
        { id: 'oe1', name: 'Kavya Reddy', role: 'R4_OPS_EXECUTIVE', roleBadge: 'Ops Staff', stat: '14 bookings', statLabel: 'managed', active: true, color: 'border-amber-200' },
        { id: 'oe2', name: 'Deepak Singh', role: 'R4_OPS_EXECUTIVE', roleBadge: 'Ops Staff', stat: '6 bookings', statLabel: 'managed', active: true, color: 'border-amber-200' },
      ],
    },
  ],
}

const PERM_SECTIONS = [
  {
    section: 'Leads',
    perms: ['leads.view_all', 'leads.edit_own', 'leads.edit_all', 'leads.delete', 'leads.export'],
    labels: ['View All', 'Edit Own', 'Edit All', 'Delete', 'Export'],
  },
  {
    section: 'Quotes',
    perms: ['quotes.create', 'quotes.send', 'quotes.approve_discounts', 'quotes.view_margins'],
    labels: ['Create', 'Send', 'Approve Discounts', 'View Margins'],
  },
  {
    section: 'Bookings',
    perms: ['bookings.create', 'bookings.cancel', 'bookings.process_refunds'],
    labels: ['Create', 'Cancel', 'Process Refunds'],
  },
  {
    section: 'Finance',
    perms: ['finance.view_pl', 'finance.export', 'finance.approve_payments'],
    labels: ['View P&L', 'Export', 'Approve Payments'],
  },
  {
    section: 'Team',
    perms: ['team.invite', 'team.change_roles', 'team.remove'],
    labels: ['Invite Members', 'Change Roles', 'Remove Members'],
  },
  {
    section: 'System',
    perms: ['system.api_keys', 'system.audit_logs', 'system.billing'],
    labels: ['API Keys', 'Audit Logs', 'Billing'],
  },
]

const ALL_PERMS = PERM_SECTIONS.flatMap(s => s.perms)
const ALL_TRUE = Object.fromEntries(ALL_PERMS.map(p => [p, true]))
const SALES_PERMS = Object.fromEntries(ALL_PERMS.map(p => [p,
  ['leads.view_all','leads.edit_own','quotes.create','quotes.send','bookings.create'].includes(p)
]))
const OPS_PERMS = Object.fromEntries(ALL_PERMS.map(p => [p,
  ['leads.view_all','bookings.create','bookings.cancel'].includes(p)
]))
const FINANCE_PERMS = Object.fromEntries(ALL_PERMS.map(p => [p,
  ['finance.view_pl','finance.export','finance.approve_payments'].includes(p)
]))
const ADMIN_PERMS = Object.fromEntries(ALL_PERMS.map(p => [p,
  !['system.billing'].includes(p)
]))

const ROLES_DEF: RoleDef[] = [
  { id: 'owner', label: 'Owner', memberCount: 1, color: 'text-slate-100', bg: 'bg-[#0F172A]', locked: true, perms: ALL_TRUE },
  { id: 'org_admin', label: 'Org Admin', memberCount: 1, color: 'text-violet-700', bg: 'bg-violet-50', perms: ADMIN_PERMS },
  { id: 'sales_manager', label: 'Sales Manager', memberCount: 2, color: 'text-blue-700', bg: 'bg-blue-50', perms: SALES_PERMS },
  { id: 'sales_agent', label: 'Sales Agent', memberCount: 3, color: 'text-sky-700', bg: 'bg-sky-50', perms: SALES_PERMS },
  { id: 'ops_executive', label: 'Ops Executive', memberCount: 2, color: 'text-amber-700', bg: 'bg-amber-50', perms: OPS_PERMS },
  { id: 'finance_admin', label: 'Finance Admin', memberCount: 1, color: 'text-emerald-700', bg: 'bg-emerald-50', perms: FINANCE_PERMS },
]

const TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Narayan M.', email: 'narayan@nama.travel', role: 'owner', roleLabel: 'Owner', roleBadge: 'bg-[#0F172A] text-white', status: 'active', lastActive: '5m ago', avatar: 'NM' },
  { id: '2', name: 'Priya Sharma', email: 'priya@nama.travel', role: 'org_admin', roleLabel: 'Org Admin', roleBadge: 'bg-violet-100 text-violet-700', status: 'active', lastActive: '12m ago', avatar: 'PS' },
  { id: '3', name: 'Rahul Verma', email: 'rahul@nama.travel', role: 'sales_manager', roleLabel: 'Sales Manager', roleBadge: 'bg-blue-100 text-blue-700', status: 'active', lastActive: '1h ago', avatar: 'RV' },
  { id: '4', name: 'Divya K.', email: 'divya@nama.travel', role: 'ops_executive', roleLabel: 'Ops Executive', roleBadge: 'bg-amber-100 text-amber-700', status: 'active', lastActive: '2h ago', avatar: 'DK' },
  { id: '5', name: 'Anil Gupta', email: 'anil@nama.travel', role: 'sales_agent', roleLabel: 'Sales Agent', roleBadge: 'bg-sky-100 text-sky-700', status: 'active', lastActive: '3h ago', avatar: 'AG' },
  { id: '6', name: 'Kavya Reddy', email: 'kavya@nama.travel', role: 'ops_executive', roleLabel: 'Ops Executive', roleBadge: 'bg-amber-100 text-amber-700', status: 'active', lastActive: '4h ago', avatar: 'KR' },
  { id: '7', name: 'Rohan Joshi', email: 'rohan@partner.com', role: 'sales_agent', roleLabel: 'Sales Agent', roleBadge: 'bg-sky-100 text-sky-700', status: 'invited', lastActive: '—', avatar: 'RJ' },
  { id: '8', name: 'Finance Lead', email: 'finance@nama.travel', role: 'finance_admin', roleLabel: 'Finance Admin', roleBadge: 'bg-emerald-100 text-emerald-700', status: 'suspended', lastActive: '—', avatar: 'FL' },
]

const AI_CALL_HISTORY = [
  { month: 'Nov', calls: 1240 },
  { month: 'Dec', calls: 1580 },
  { month: 'Jan', calls: 1920 },
  { month: 'Feb', calls: 2310 },
  { month: 'Mar', calls: 2640 },
  { month: 'Apr', calls: 2847 },
]
const MAX_CALLS = Math.max(...AI_CALL_HISTORY.map(h => h.calls))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

function avatarGradient(initials: string) {
  const gradients = [
    'from-teal-400 to-cyan-500',
    'from-blue-400 to-indigo-500',
    'from-violet-400 to-purple-500',
    'from-amber-400 to-orange-500',
    'from-emerald-400 to-green-500',
    'from-rose-400 to-pink-500',
  ]
  return gradients[initials.charCodeAt(0) % gradients.length]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Toggle({ value, onChange, locked }: { value: boolean; onChange: (v: boolean) => void; locked?: boolean }) {
  return (
    <button
      onClick={() => !locked && onChange(!value)}
      disabled={locked}
      className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${
        locked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
      } ${value ? 'bg-[#14B8A6]' : 'bg-slate-200'}`}
    >
      <span className={`absolute top-[3px] left-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-[18px]' : ''}`} />
    </button>
  )
}

// ─── Org Chart Node ───────────────────────────────────────────────────────────

function OrgNodeCard({ node, isRoot = false }: { node: OrgNode; isRoot?: boolean }) {
  const initials = node.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex flex-col items-center">
      <div className={`relative bg-white border-2 ${node.color} rounded-2xl p-4 w-44 shadow-sm hover:shadow-md transition-all ${isRoot ? 'bg-[#0F172A] border-[#14B8A6]' : ''}`}>
        {node.active && (
          <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
        )}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(initials)} flex items-center justify-center font-black text-white text-sm mx-auto mb-2`}>
          {initials}
        </div>
        <p className={`text-xs font-black text-center truncate ${isRoot ? 'text-white' : 'text-[#0F172A]'}`}>{node.name}</p>
        <p className={`text-[10px] text-center mt-0.5 font-bold px-2 py-0.5 rounded-full mx-auto w-fit ${
          isRoot ? 'bg-[#14B8A6]/20 text-[#14B8A6]' : 'bg-slate-100 text-slate-500'
        }`}>{node.roleBadge}</p>
        <div className={`mt-2 text-center text-[10px] ${isRoot ? 'text-slate-400' : 'text-slate-400'}`}>
          <span className={`font-black ${isRoot ? 'text-[#14B8A6]' : 'text-slate-700'}`}>{node.stat}</span>
          {' '}{node.statLabel}
        </div>
      </div>
    </div>
  )
}

function OrgBranch({ node, isRoot = false }: { node: OrgNode; isRoot?: boolean }) {
  const hasChildren = node.children && node.children.length > 0
  return (
    <div className="flex flex-col items-center">
      <OrgNodeCard node={node} isRoot={isRoot} />
      {hasChildren && (
        <>
          {/* vertical line down from parent */}
          <div className="w-px h-6 bg-slate-200" />
          {/* horizontal bar */}
          <div className="relative flex items-start">
            {/* horizontal connector line */}
            <div
              className="absolute top-0 left-[50%] -translate-x-1/2 h-px bg-slate-200"
              style={{ width: node.children!.length > 1 ? '100%' : '0' }}
            />
            <div className="flex gap-6 items-start">
              {node.children!.map((child) => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-slate-200" />
                  <OrgBranch node={child} />
                </div>
              ))}
              {/* Add member ghost */}
              <div className="flex flex-col items-center">
                <div className="w-px h-6 bg-slate-200" />
                <button className="w-44 h-[148px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-all group">
                  <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center group-hover:bg-[#14B8A6]/10 transition-all">
                    <Plus size={14} />
                  </div>
                  <span className="text-[10px] font-bold">Add Member</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Tab: Overview ────────────────────────────────────────────────────────────

function TabOverview() {
  const KPI_CARDS = [
    { label: 'Revenue This Month', value: '₹24.8L', delta: '+12%', deltaUp: true, sub: 'vs last month', icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Active Leads', value: '47', delta: '8 HOT', deltaUp: true, sub: 'in pipeline', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg Response Time', value: '18 min', delta: '-3m', deltaUp: true, sub: 'to new leads', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Conversion Rate', value: '64%', delta: '+4%', deltaUp: true, sub: 'lead → booking', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  const scoreColor = (score: number) =>
    score >= 80 ? 'text-emerald-600' : score >= 65 ? 'text-amber-500' : 'text-red-500'

  const respColor = (min: number) =>
    min <= 15 ? 'text-emerald-600' : min <= 30 ? 'text-amber-500' : 'text-red-500'

  const riskIcon = (icon: RiskItem['icon']) => {
    if (icon === 'lead') return <Users size={14} className="text-red-400" />
    if (icon === 'vendor') return <Building2 size={14} className="text-amber-400" />
    return <DollarSign size={14} className="text-orange-400" />
  }

  const urgencyBg = (u: RiskItem['urgency']) =>
    u === 'high' ? 'bg-red-50 border-red-100' : u === 'medium' ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</span>
              <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                <kpi.icon size={17} className={kpi.color} />
              </div>
            </div>
            <div className="text-2xl font-black text-[#0F172A]">{kpi.value}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold ${kpi.deltaUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {kpi.deltaUp ? '▲' : '▼'} {kpi.delta}
              </span>
              <span className="text-xs text-slate-400">{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Insight Banner */}
      <div className="bg-[#0F172A] rounded-2xl p-5 border border-[#14B8A6]/20">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-[#14B8A6]/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <Zap size={18} className="text-[#14B8A6]" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-[#14B8A6] uppercase tracking-widest">Revenue Intelligence</span>
              <span className="text-[9px] font-black bg-[#14B8A6]/20 text-[#14B8A6] px-2 py-0.5 rounded-full">LIVE</span>
            </div>
            <p className="text-sm font-bold text-slate-100 leading-relaxed">
              <span className="text-[#14B8A6]">You lost ₹8.4L this week</span> due to slow response time on 6 leads.{' '}
              <span className="text-[#14B8A6]">Assign Priya to WhatsApp duty</span> — her 14-min avg response is 3× faster than team average.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <button className="flex items-center gap-1.5 bg-[#14B8A6] text-[#0F172A] text-xs font-black px-3 py-1.5 rounded-lg hover:bg-teal-400 transition-all">
                <UserCheck size={12} /> Assign Priya
              </button>
              <button className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium">
                View 6 affected leads →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column: Leaderboard + Risk Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Agent Leaderboard */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-[#0F172A]">Agent Leaderboard</h3>
              <p className="text-xs text-slate-400 mt-0.5">Performance this month · ranked by revenue</p>
            </div>
            <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full flex items-center gap-1">
              <Star size={10} fill="currentColor" /> Apr 2026
            </span>
          </div>

          <div className="space-y-1">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 px-3 py-1">
              <div className="col-span-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Agent</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Revenue</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Conv%</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Resp</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">AI Score</div>
            </div>

            {AGENTS.map((agent, idx) => (
              <div key={agent.id} className={`grid grid-cols-12 gap-2 items-center px-3 py-3 rounded-xl transition-all hover:bg-slate-50 ${idx === 0 ? 'bg-amber-50/60' : ''}`}>
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient(agent.initials)} flex items-center justify-center font-black text-white text-[10px]`}>
                      {agent.initials}
                    </div>
                    {idx === 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center border border-white">
                        <Award size={8} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#0F172A] truncate">{agent.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{agent.role}</p>
                  </div>
                </div>
                <div className="col-span-2 text-right">
                  <span className="text-xs font-black text-[#0F172A]">{fmtCurrency(agent.revenue)}</span>
                  {agent.trend === 'up' && <ArrowUp size={10} className="inline ml-0.5 text-emerald-500" />}
                  {agent.trend === 'down' && <ArrowDown size={10} className="inline ml-0.5 text-red-500" />}
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-xs font-black ${agent.conversion >= 65 ? 'text-emerald-600' : agent.conversion >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                    {agent.conversion}%
                  </span>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-xs font-black ${respColor(agent.responseMin)}`}>{agent.responseMin}m</span>
                </div>
                <div className="col-span-2 text-right">
                  <span className={`text-xs font-black ${scoreColor(agent.aiScore)}`}>{agent.aiScore}</span>
                  <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                    <div
                      className={`h-1 rounded-full ${agent.aiScore >= 80 ? 'bg-emerald-400' : agent.aiScore >= 65 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${agent.aiScore}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Feed */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-black text-[#0F172A]">Risk Feed</h3>
              <p className="text-xs text-slate-400 mt-0.5">Items needing your attention</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle size={12} className="text-red-500" />
            </div>
          </div>

          <div className="space-y-3">
            {RISKS.map(risk => (
              <div key={risk.id} className={`border rounded-xl p-3.5 ${urgencyBg(risk.urgency)}`}>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">{riskIcon(risk.icon)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 leading-snug">{risk.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                        risk.urgency === 'high' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {risk.urgency.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">{risk.timeAgo}</span>
                    </div>
                  </div>
                </div>
                <button className="mt-2.5 w-full text-[10px] font-black text-[#14B8A6] hover:underline text-right">
                  Resolve →
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-[10px] text-slate-400 text-center">
              Auto-refreshes every 30s · <button className="text-[#14B8A6] font-bold hover:underline">View all alerts</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Org Chart ───────────────────────────────────────────────────────────

function TabOrgChart() {
  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-black text-[#0F172A]">Organisation Hierarchy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Visual team structure · drag to reassign (coming soon)</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 border border-dashed border-slate-200 px-2.5 py-1 rounded-lg">
              Drag to reassign
            </span>
            <button className="flex items-center gap-1.5 bg-[#0F172A] text-white text-xs font-bold px-3 py-2 rounded-xl hover:bg-slate-700 transition-all">
              <Plus size={13} /> Add Member
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {[
            { label: 'Company Admin', color: 'border-[#14B8A6]' },
            { label: 'Sales', color: 'border-blue-400' },
            { label: 'Operations', color: 'border-amber-400' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border-2 ${l.color} bg-white`} />
              <span className="text-[10px] font-bold text-slate-500">{l.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold text-slate-500">Online</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] text-slate-400">10 members · 2 teams</span>
          </div>
        </div>

        {/* Tree — horizontal scroll on mobile */}
        <div className="overflow-x-auto pb-4">
          <div className="min-w-max flex justify-center">
            <OrgBranch node={ORG_TREE} isRoot />
          </div>
        </div>
      </div>

      {/* Mobile list view hint */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 xl:hidden">
        <AlertCircle size={16} className="text-slate-400 flex-shrink-0" />
        <p className="text-xs text-slate-500">Scroll horizontally to explore the full org tree. Best viewed on desktop.</p>
      </div>
    </div>
  )
}

// ─── Tab: Role Builder ────────────────────────────────────────────────────────

function TabRoleBuilder() {
  const [selectedRole, setSelectedRole] = useState<string>('owner')
  const [roles, setRoles] = useState<RoleDef[]>(ROLES_DEF)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [copyFrom, setCopyFrom] = useState('sales_manager')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const currentRole = roles.find(r => r.id === selectedRole)!

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Fetch roles from backend on mount and merge with seed data
  useEffect(() => {
    rolesApi.list().then(backendRoles => {
      if (!backendRoles || backendRoles.length === 0) return
      setRoles(prev => {
        const byId = new Map(prev.map(r => [r.id, r]))
        backendRoles.forEach(br => {
          const existing = byId.get(br.id)
          if (existing) {
            // Rebuild boolean perm map from backend flat permission array
            const perms = Object.fromEntries(ALL_PERMS.map(p => [p, br.permissions.includes(p)]))
            byId.set(br.id, { ...existing, perms })
          } else {
            const perms = Object.fromEntries(ALL_PERMS.map(p => [p, br.permissions.includes(p)]))
            byId.set(br.id, {
              id: br.id,
              label: br.name,
              memberCount: 0,
              color: 'text-pink-700',
              bg: 'bg-pink-50',
              perms,
            })
          }
        })
        return Array.from(byId.values())
      })
    }).catch(() => {
      // Backend unreachable — silently use seed data
    })
  }, [])

  const togglePerm = (perm: string) => {
    if (currentRole.locked) return
    setRoles(prev => prev.map(r =>
      r.id === selectedRole
        ? { ...r, perms: { ...r.perms, [perm]: !r.perms[perm] } }
        : r
    ))
  }

  const handleSave = async () => {
    if (currentRole.locked) return
    setSaving(true)
    try {
      const permissions = Object.entries(currentRole.perms)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)

      await rolesApi.updatePermissions(currentRole.id, permissions)
      setSaved(true)
      showToast('Role permissions saved', 'success')
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save role', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const original = ROLES_DEF.find(r => r.id === selectedRole)
    if (!original) return
    setRoles(prev => prev.map(r => r.id === selectedRole ? { ...original } : r))
  }

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    setCreating(true)
    const source = roles.find(r => r.id === copyFrom)
    const sourcePerms = source
      ? Object.entries(source.perms).filter(([, v]) => v).map(([k]) => k)
      : []

    try {
      const created = await rolesApi.create({
        name: newRoleName.trim(),
        description: newRoleDesc.trim() || undefined,
        permissions: sourcePerms,
      })
      const perms = Object.fromEntries(ALL_PERMS.map(p => [p, created.permissions.includes(p)]))
      const newRole: RoleDef = {
        id: created.id,
        label: created.name,
        memberCount: 0,
        color: 'text-pink-700',
        bg: 'bg-pink-50',
        perms,
      }
      setRoles(prev => [...prev, newRole])
      setSelectedRole(newRole.id)
      showToast(`Role "${newRole.label}" created`, 'success')
    } catch (err) {
      // Fallback: create locally
      const newRole: RoleDef = {
        id: `custom_${Date.now()}`,
        label: newRoleName,
        memberCount: 0,
        color: 'text-pink-700',
        bg: 'bg-pink-50',
        perms: source ? { ...source.perms } : Object.fromEntries(ALL_PERMS.map(p => [p, false])),
      }
      setRoles(prev => [...prev, newRole])
      setSelectedRole(newRole.id)
      showToast(err instanceof Error ? err.message : 'Created locally (backend offline)', 'error')
    } finally {
      setCreating(false)
      setShowCreateForm(false)
      setNewRoleName('')
      setNewRoleDesc('')
    }
  }

  return (
    <div className="space-y-5">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold transition-all ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upgrade banner → dedicated Role Builder */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-teal-900">Advanced Role Builder available</p>
            <p className="text-xs text-teal-700 mt-0.5">Full ABAC conditions, 80 permission atoms, per-user overrides, audit trail</p>
          </div>
        </div>
        <a
          href="/dashboard/roles"
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
        >
          Open Role Builder <ArrowRight size={13} />
        </a>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Role List */}
        <div className="xl:col-span-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-black text-[#0F172A] mb-4 text-sm">Roles</h3>
          <div className="space-y-2">
            {roles.map(role => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  selectedRole === role.id
                    ? 'border-[#14B8A6] bg-teal-50/60'
                    : 'border-slate-100 hover:border-slate-200 bg-white'
                }`}
              >
                <div className={`flex-1 min-w-0`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${role.bg} ${role.color}`}>
                      {role.label}
                    </span>
                    {role.locked && <Lock size={10} className="text-slate-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{role.memberCount} member{role.memberCount !== 1 ? 's' : ''}</p>
                </div>
                {selectedRole === role.id && (
                  <ChevronRight size={14} className="text-[#14B8A6] flex-shrink-0" />
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-3 text-xs font-bold text-slate-500 hover:border-[#14B8A6] hover:text-[#14B8A6] transition-all"
          >
            <Plus size={13} /> Create Custom Role
          </button>

          {showCreateForm && (
            <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Role Name</label>
                <input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. Senior Agent"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <input
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#14B8A6] focus:ring-2 focus:ring-[#14B8A6]/10 outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Copy Permissions From</label>
                <select
                  value={copyFrom}
                  onChange={e => setCopyFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:border-[#14B8A6] outline-none bg-white"
                >
                  {roles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreateRole} disabled={creating || !newRoleName.trim()} className="flex-1 flex items-center justify-center gap-1.5 bg-[#0F172A] text-white py-2 rounded-lg text-xs font-black hover:bg-slate-700 disabled:opacity-50 transition-all">
                  {creating ? <><Loader2 size={12} className="animate-spin" /> Creating…</> : 'Create Role'}
                </button>
                <button onClick={() => setShowCreateForm(false)} className="px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${currentRole.bg} ${currentRole.color}`}>
                  {currentRole.label}
                </span>
                {currentRole.locked && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Lock size={9} /> Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentRole.locked ? 'Owner role has all permissions — cannot be modified.' : 'Toggle permissions for this role. Changes apply immediately.'}
              </p>
            </div>
            {!currentRole.locked && (
              <div className="flex items-center gap-2">
                <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all">
                  <RefreshCw size={12} /> Reset
                </button>
                <button onClick={handleSave} disabled={saving} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all disabled:opacity-60 ${saved ? 'bg-emerald-500 text-white' : 'bg-[#14B8A6] text-white hover:bg-teal-600'}`}>
                  {saving
                    ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                    : saved
                    ? <><CheckCircle size={12} /> Saved!</>
                    : <><Settings size={12} /> Save Role</>}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {PERM_SECTIONS.map(section => (
              <div key={section.section}>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 border-b border-slate-50 pb-1.5">
                  {section.section}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {section.perms.map((perm, i) => (
                    <div key={perm} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition-all">
                      <span className="text-xs font-medium text-slate-700">{section.labels[i]}</span>
                      <Toggle
                        value={currentRole.perms[perm] ?? false}
                        onChange={() => togglePerm(perm)}
                        locked={currentRole.locked}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Team Management ─────────────────────────────────────────────────────

function TabTeam() {
  const [members, setMembers] = useState<TeamMember[]>(TEAM_MEMBERS)
  const [search, setSearch] = useState('')
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('sales_agent')
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('')
  const [flash, setFlash] = useState<string | null>(null)

  const showFlash = (msg: string) => {
    setFlash(msg)
    setTimeout(() => setFlash(null), 3000)
  }

  const filtered = members.filter(m => {
    const q = search.toLowerCase()
    return !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.roleLabel.toLowerCase().includes(q)
  })

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: '',
      email: inviteEmail,
      role: inviteRole,
      roleLabel: ROLES_DEF.find(r => r.id === inviteRole)?.label ?? inviteRole,
      roleBadge: (ROLES_DEF.find(r => r.id === inviteRole)?.bg ?? '') + ' ' + (ROLES_DEF.find(r => r.id === inviteRole)?.color ?? ''),
      status: 'invited',
      lastActive: '—',
      avatar: inviteEmail[0].toUpperCase() + (inviteEmail[1] ?? '').toUpperCase(),
    }
    setMembers(prev => [...prev, newMember])
    setInviteEmail('')
    setShowInviteForm(false)
    showFlash(`Invite sent to ${newMember.email}`)
  }

  const handleSuspend = (id: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'suspended' as const } : m))
    setOpenMenu(null)
    showFlash('Member suspended')
  }

  const handleReactivate = (id: string) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, status: 'active' as const } : m))
    setOpenMenu(null)
    showFlash('Member reactivated')
  }

  const handleRemove = (id: string) => {
    setMembers(prev => prev.filter(m => m.id !== id))
    setOpenMenu(null)
    showFlash('Member removed')
  }

  const handleResend = (email: string) => {
    setOpenMenu(null)
    showFlash(`Invite resent to ${email}`)
  }

  const handleBulk = () => {
    if (!bulkAction || selected.length === 0) return
    if (bulkAction === 'suspend') {
      setMembers(prev => prev.map(m => selected.includes(m.id) ? { ...m, status: 'suspended' as const } : m))
      showFlash(`${selected.length} member(s) suspended`)
    }
    setSelected([])
    setBulkAction('')
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const statusBg = (status: TeamMember['status']) =>
    status === 'active' ? 'bg-emerald-50 text-emerald-700' :
    status === 'invited' ? 'bg-amber-50 text-amber-600' :
    'bg-slate-100 text-slate-400'

  const statusLabel = (status: TeamMember['status']) =>
    status === 'active' ? '● Active' : status === 'invited' ? '◌ Invited' : '✕ Suspended'

  const INVITE_ROLES = [
    { id: 'org_admin', label: 'Org Admin', desc: 'Full access, can manage team and settings' },
    { id: 'sales_manager', label: 'Sales Manager', desc: 'Manages leads and bookings' },
    { id: 'sales_agent', label: 'Sales Agent', desc: 'Assigned leads and quotes only' },
    { id: 'ops_executive', label: 'Ops Executive', desc: 'Operations, vendors, documents' },
    { id: 'finance_admin', label: 'Finance Admin', desc: 'Finance and reports access only' },
  ]

  return (
    <div className="space-y-5">
      {/* Flash */}
      {flash && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-4 text-sm font-medium">
          <CheckCircle size={16} />
          {flash}
          <button onClick={() => setFlash(null)} className="ml-auto opacity-60 hover:opacity-100"><X size={14} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search members..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none"
          />
        </div>

        {selected.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{selected.length} selected</span>
            <select
              value={bulkAction}
              onChange={e => setBulkAction(e.target.value)}
              className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 focus:border-[#14B8A6] outline-none bg-white"
            >
              <option value="">Bulk Action</option>
              <option value="suspend">Suspend</option>
              <option value="change_role">Change Role</option>
            </select>
            <button onClick={handleBulk} className="px-3 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-all">
              Apply
            </button>
          </div>
        )}

        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="ml-auto flex items-center gap-2 bg-[#14B8A6] text-white px-4 py-2.5 rounded-xl text-sm font-black hover:bg-teal-600 transition-all"
        >
          <UserPlus size={15} /> Invite Member
        </button>
      </div>

      {/* Invite Form (inline) */}
      {showInviteForm && (
        <div className="bg-slate-50 border-2 border-[#14B8A6]/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-[#0F172A] text-sm">Invite New Member</h4>
            <button onClick={() => setShowInviteForm(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@agency.com"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] focus:ring-4 focus:ring-[#14B8A6]/10 outline-none bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 mb-1.5 uppercase tracking-wider">Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:border-[#14B8A6] outline-none bg-white"
              >
                {INVITE_ROLES.map(r => <option key={r.id} value={r.id}>{r.label} — {r.desc}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleInvite} className="flex items-center gap-2 bg-[#0F172A] text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-slate-700 transition-all">
              <Mail size={14} /> Send Invite
            </button>
            <p className="text-xs text-slate-400">An email link will be sent to join your workspace.</p>
          </div>
        </div>
      )}

      {/* Member Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-100">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selected.length === filtered.filter(m => m.status !== 'invited').length && filtered.filter(m => m.status !== 'invited').length > 0}
                    onChange={e => setSelected(e.target.checked ? filtered.filter(m => m.status !== 'invited').map(m => m.id) : [])}
                  />
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Member</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider hidden md:table-cell">Role</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider hidden lg:table-cell">Last Active</th>
                <th className="px-4 py-3.5 text-right text-[10px] font-black text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(member => (
                <tr key={member.id} className={`hover:bg-slate-50 transition-colors ${selected.includes(member.id) ? 'bg-teal-50/40' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={selected.includes(member.id)}
                      onChange={() => toggleSelect(member.id)}
                      disabled={member.status === 'invited'}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(member.avatar)} flex items-center justify-center font-black text-white text-xs`}>
                          {member.avatar}
                        </div>
                        {member.status === 'active' && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0F172A] truncate">
                          {member.name || <span className="italic text-slate-400 font-medium">Pending</span>}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${member.roleBadge}`}>
                      {member.roleLabel}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusBg(member.status)}`}>
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-slate-400 hidden lg:table-cell">{member.lastActive}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-end">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenu(openMenu === member.id ? null : member.id)}
                          className="p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenu === member.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                            <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 overflow-hidden">
                              <button className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Edit3 size={11} /> Edit Role
                              </button>
                              {member.status === 'invited' && (
                                <button onClick={() => handleResend(member.email)} className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                  <RefreshCw size={11} /> Resend Invite
                                </button>
                              )}
                              {member.status === 'active' && (
                                <button onClick={() => handleSuspend(member.id)} className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-2">
                                  <Lock size={11} /> Suspend
                                </button>
                              )}
                              {member.status === 'suspended' && (
                                <button onClick={() => handleReactivate(member.id)} className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2">
                                  <CheckCircle size={11} /> Reactivate
                                </button>
                              )}
                              <button onClick={() => handleRemove(member.id)} className="w-full text-left px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2">
                                <Trash2 size={11} /> Remove
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invited-only empty state */}
        {filtered.filter(m => m.status === 'invited').length > 0 && (
          <div className="border-t border-slate-50 px-4 py-3 bg-amber-50/40">
            <p className="text-xs text-amber-700 font-medium">
              {filtered.filter(m => m.status === 'invited').length} invite pending acceptance ·{' '}
              <button className="font-black hover:underline">Resend all</button>
            </p>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Users size={36} className="mx-auto mb-3 text-slate-200" />
            <p className="font-bold text-sm">No members match your search</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: Subscription & Usage ────────────────────────────────────────────────

// Fallback plan data used when API is unavailable
const PLANS_FALLBACK = [
  {
    id: 1, slug: 'starter', name: 'Starter', price: '₹4,999', price_monthly: 4999, period: '/mo',
    features: ['1 seat', '50 AI leads/mo', 'M1–M9 modules', 'Email support'],
    highlight: false,
  },
  {
    id: 2, slug: 'growth', name: 'Growth', price: '₹14,999', price_monthly: 14999, period: '/mo',
    features: ['5 seats', '200 AI leads/mo', 'M1–M13 modules', 'Vendor registry', 'Priority support'],
    highlight: false,
  },
  {
    id: 3, slug: 'scale', name: 'Scale', price: '₹39,999', price_monthly: 39999, period: '/mo',
    features: ['15 seats', 'Unlimited leads', 'All M1–M19 modules', 'White-label portal', 'BYOK recommended', 'Dedicated CSM'],
    highlight: true,
  },
]

function TabSubscription() {
  const maxCalls = MAX_CALLS

  const [plans, setPlans] = React.useState(PLANS_FALLBACK)
  const [subscription, setSubscription] = React.useState<{
    plan_id: number; plan_name: string; status: string; billing_cycle: string; current_period_end?: string | null
  } | null>(null)
  const [plansLoading, setPlansLoading] = React.useState(true)
  const [pricingCurrency, setPricingCurrency] = React.useState<'INR' | 'USD'>('INR')

  // Proration modal state
  const [prorationTarget, setProrationTarget] = React.useState<{ planId: number; cycle: 'monthly' | 'yearly' } | null>(null)
  const [proration, setProration] = React.useState<{
    current_plan_name: string; new_plan_name: string; net_charge: number; credit: number; is_upgrade: boolean; days_remaining: number
  } | null>(null)
  const [prorationLoading, setProrationLoading] = React.useState(false)
  const [planChanging, setPlanChanging] = React.useState(false)
  const [planChangeSuccess, setPlanChangeSuccess] = React.useState(false)

  React.useEffect(() => {
    // Detect currency based on user location
    import('@/lib/geo-currency').then(({ detectPricingCurrency }) => {
      detectPricingCurrency().then(setPricingCurrency)
    })
  }, [])

  React.useEffect(() => {
    let cancelled = false
    async function loadPlans() {
      setPlansLoading(true)
      try {
        const { billingApi } = await import('@/lib/api')
        const [plansResponse, sub] = await Promise.all([
          billingApi.getPlans(),
          billingApi.getSubscription(),
        ])
        // billingApi.getPlans() may return an array or a PlansResponse object
        const apiPlans = Array.isArray(plansResponse)
          ? plansResponse
          : (plansResponse as unknown as { plans?: typeof PLANS_FALLBACK }).plans ?? plansResponse
        if (cancelled) return
        if (apiPlans && Array.isArray(apiPlans) && apiPlans.length > 0) {
          setPlans((apiPlans as unknown as Array<{ id: number; slug: string; name: string; price_monthly: number; price_monthly_usd?: number | null; sort_order: number; features?: Record<string, boolean> | null }>).map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            price: '₹' + p.price_monthly.toLocaleString('en-IN'),
            price_monthly: p.price_monthly,
            price_monthly_usd: p.price_monthly_usd ?? null,
            period: '/mo',
            features: Object.entries(p.features ?? {}).filter(([, v]) => v).map(([k]) => k).slice(0, 6),
            highlight: p.sort_order >= 3,
          })))
        }
        if (sub) {
          setSubscription({
            plan_id: sub.plan_id,
            plan_name: sub.plan?.name ?? 'Growth',
            status: sub.status,
            billing_cycle: sub.billing_cycle,
            current_period_end: sub.current_period_end,
          })
        }
      } catch {
        // Keep fallback data
      } finally {
        if (!cancelled) setPlansLoading(false)
      }
    }
    loadPlans()
    return () => { cancelled = true }
  }, [])

  const currentPlanId = subscription?.plan_id ?? 2

  async function openProration(planId: number, cycle: 'monthly' | 'yearly') {
    setProrationTarget({ planId, cycle })
    setProration(null)
    setProrationLoading(true)
    try {
      const { billingApi } = await import('@/lib/api')
      const preview = await billingApi.previewProration(planId, cycle)
      setProration(preview)
    } catch {
      setProration({
        current_plan_name: subscription?.plan_name ?? 'Growth',
        new_plan_name: plans.find(p => p.id === planId)?.name ?? '',
        net_charge: 0,
        credit: 0,
        is_upgrade: planId > currentPlanId,
        days_remaining: 15,
      })
    } finally {
      setProrationLoading(false)
    }
  }

  async function confirmPlanChange() {
    if (!prorationTarget) return
    setPlanChanging(true)
    try {
      const { billingApi } = await import('@/lib/api')
      await billingApi.changePlan(prorationTarget.planId, prorationTarget.cycle)
      setPlanChangeSuccess(true)
      setTimeout(() => {
        setProrationTarget(null)
        setProration(null)
        setPlanChangeSuccess(false)
      }, 2000)
    } catch { /* no-op */ } finally {
      setPlanChanging(false)
    }
  }

  const PLANS = plans

  const USAGE_BARS = [
    { label: 'Seats', used: 4, total: 5, unit: 'seats', color: 'bg-teal-400' },
    { label: 'AI Calls', used: 2847, total: 5000, unit: 'this month', color: 'bg-blue-400' },
    { label: 'Storage', used: 2.1, total: 10, unit: 'GB', color: 'bg-violet-400' },
  ]

  const currentPlan = plans.find(p => p.id === currentPlanId) ?? plans[1]
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    trial:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
    cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  }
  const statusLabel = subscription?.status ?? 'active'

  return (
    <div className="space-y-6">

      {/* Proration confirmation modal */}
      {prorationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-100">
              <h2 className="font-black text-[#0F172A]">Confirm Plan Change</h2>
            </div>
            <div className="p-6 space-y-4">
              {planChangeSuccess && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm font-bold">
                  <CheckCircle size={14} /> Plan changed successfully!
                </div>
              )}
              {prorationLoading ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 size={20} className="animate-spin mr-2" /> Calculating proration…
                </div>
              ) : proration && (
                <>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Current plan</span>
                      <span className="font-bold text-slate-700">{proration.current_plan_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">New plan</span>
                      <span className="font-bold text-slate-700">{proration.new_plan_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Days remaining</span>
                      <span className="font-bold text-slate-700">{proration.days_remaining}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Credit</span>
                      <span className="font-bold text-emerald-600">₹{Math.abs(proration.credit).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between">
                      <span className="font-black text-[#0F172A]">{proration.is_upgrade ? 'Amount due now' : 'Refund credit'}</span>
                      <span className={`font-black ${proration.is_upgrade ? 'text-[#14B8A6]' : 'text-emerald-600'}`}>
                        ₹{Math.abs(proration.net_charge).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {proration.is_upgrade ? 'Upgrade takes effect immediately.' : 'Downgrade takes effect at next billing cycle.'}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => { setProrationTarget(null); setProration(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-black border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmPlanChange}
                disabled={planChanging || prorationLoading || planChangeSuccess}
                className="flex-1 py-2.5 rounded-xl text-sm font-black bg-[#14B8A6] text-[#0F172A] hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {planChanging ? <><Loader2 size={14} className="animate-spin" /> Changing…</> : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-[#0F172A] rounded-2xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#14B8A6]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Star size={22} className="text-[#14B8A6]" fill="currentColor" />
          </div>
          <div>
            <div className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">Current Plan</div>
            <div className="text-2xl font-black flex items-center gap-2">
              {currentPlan?.name ?? 'Growth'} Plan
              {plansLoading && <Loader2 size={14} className="animate-spin text-white/40" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColors[statusLabel] ?? statusColors.active}`}>
                {statusLabel}
              </span>
              {subscription?.current_period_end && (
                <span className="text-xs text-white/50">
                  Renews {new Date(subscription.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
              {!subscription?.current_period_end && (
                <span className="text-xs text-white/50">5 seats · 200 AI leads/mo · Renews May 16, 2026</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-[#14B8A6]">{currentPlan?.price ?? '₹14,999'}</div>
          <div className="text-xs text-white/40">/month</div>
          <div className="flex items-center gap-2 mt-2 justify-end">
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
              <CreditCard size={12} /> Manage Billing
            </button>
            <button className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
              <Download size={12} /> Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Usage Bars */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-black text-[#0F172A] mb-5">Usage This Month</h3>
        <div className="space-y-5">
          {USAGE_BARS.map(bar => {
            const pct = Math.round((bar.used / bar.total) * 100)
            const isWarning = pct >= 80
            return (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-bold text-slate-700">{bar.label}</span>
                  <span className={`text-xs font-black ${isWarning ? 'text-amber-600' : 'text-slate-600'}`}>
                    {bar.used} / {bar.total} {bar.unit}
                    {isWarning && ' ⚠'}
                  </span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isWarning ? 'bg-amber-400' : bar.color}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-400">{pct}% used</span>
                  {isWarning && <span className="text-[10px] text-amber-600 font-bold">Approaching limit</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plan Comparison */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-[#0F172A]">Plans</h3>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-full">
            {pricingCurrency === 'USD' ? 'Prices in $ USD' : 'Prices in ₹ INR'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlanId
            const isUpgrade = plan.id > currentPlanId
            return (
              <div key={plan.id} className={`relative rounded-2xl p-6 border-2 transition-all ${
                plan.highlight
                  ? 'border-[#0F172A] bg-[#0F172A] text-white'
                  : isCurrent
                  ? 'border-[#14B8A6] bg-teal-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#14B8A6] text-[#0F172A] text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Recommended
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4 bg-[#14B8A6] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    Current
                  </div>
                )}
                <div className={`text-[10px] font-black uppercase tracking-widest mb-2 ${plan.highlight ? 'text-white/40' : 'text-slate-400'}`}>
                  {plan.name}
                </div>
                <div className={`text-3xl font-black mb-0.5 ${plan.highlight ? 'text-white' : 'text-[#0F172A]'}`}>
                  {pricingCurrency === 'USD' && (plan as unknown as { price_monthly_usd?: number | null }).price_monthly_usd != null
                    ? `$${(plan as unknown as { price_monthly_usd: number }).price_monthly_usd.toLocaleString()}`
                    : plan.price}
                </div>
                <div className={`text-xs mb-4 ${plan.highlight ? 'text-white/40' : 'text-slate-400'}`}>{plan.period}</div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className={`text-xs flex items-start gap-2 ${plan.highlight ? 'text-white/70' : 'text-slate-600'}`}>
                      <CheckCircle size={11} className="mt-0.5 flex-shrink-0 text-[#14B8A6]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  onClick={() => openProration(plan.id, subscription?.billing_cycle as 'monthly' | 'yearly' ?? 'monthly')}
                  className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    plan.highlight ? 'bg-[#14B8A6] text-[#0F172A] hover:opacity-90'
                      : isCurrent ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : isUpgrade ? 'Upgrade' : 'Downgrade'}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI Call History — CSS Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-black text-[#0F172A]">AI Call Volume</h3>
            <p className="text-xs text-slate-400 mt-0.5">Last 6 months · calls to OpenRouter</p>
          </div>
          <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-full flex items-center gap-1.5">
            <Activity size={12} /> +14% MoM
          </span>
        </div>

        <div className="flex items-end gap-3 h-32">
          {AI_CALL_HISTORY.map(h => {
            const heightPct = Math.round((h.calls / maxCalls) * 100)
            const isCurrent = h.month === 'Apr'
            return (
              <div key={h.month} className="flex-1 flex flex-col items-center gap-1.5">
                <span className={`text-[10px] font-black ${isCurrent ? 'text-teal-600' : 'text-slate-400'}`}>
                  {h.calls >= 1000 ? `${(h.calls / 1000).toFixed(1)}K` : h.calls}
                </span>
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-lg transition-all ${isCurrent ? 'bg-[#14B8A6]' : 'bg-slate-100 hover:bg-slate-200'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold ${isCurrent ? 'text-teal-600' : 'text-slate-400'}`}>
                  {h.month}
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
          <span>5,000 calls/mo included in Growth plan</span>
          <span className="font-bold text-teal-600">2,153 calls remaining</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS: { id: OrgTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',     label: 'Overview',       icon: BarChart3 },
  { id: 'orgchart',     label: 'Org Chart',      icon: Building2 },
  { id: 'roles',        label: 'Role Builder',   icon: Shield },
  { id: 'team',         label: 'Team',           icon: Users },
  { id: 'subscription', label: 'Subscription',   icon: CreditCard },
]

export default function OrgPage() {
  const [tab, setTab] = useState<OrgTab>('overview')

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#0F172A]">Org & Control</h1>
          <p className="text-slate-500 mt-1 font-medium">Your company control room · 10 members · Growth Plan</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold text-emerald-600">All systems operational</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-max min-w-full md:w-fit">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                tab === id
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'overview'     && <TabOverview />}
      {tab === 'orgchart'     && <TabOrgChart />}
      {tab === 'roles'        && <TabRoleBuilder />}
      {tab === 'team'         && <TabTeam />}
      {tab === 'subscription' && <TabSubscription />}
    </div>
  )
}
