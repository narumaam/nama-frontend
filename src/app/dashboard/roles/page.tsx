'use client'

/**
 * NAMA OS — Dynamic Role Builder
 * ──────────────────────────────
 * Full RBAC + ABAC hybrid role management system.
 *
 * Three-panel layout:
 *   Left   → Role List (create, clone, delete, templates)
 *   Centre → Permission Matrix (module groups + ABAC condition editor)
 *   Right  → Live Preview (what this role can/cannot do, assign users)
 *
 * Seed data mirrors the ABAC schema. When /api/v1/roles is available,
 * all writes go to the real API — falls back to local state on error.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Plus, Copy, Trash2, Lock,
  Globe, Clock, DollarSign, Users, Building2, AlertTriangle,
  CheckCircle, X, Search, Eye, Save, ArrowRight, UserPlus,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Sliders, AlertCircle, Sparkles, Loader2,
} from 'lucide-react'
import { rolesApi } from '@/lib/api'

// ─── Permission atoms ─────────────────────────────────────────────────────────

const ALL_MODULES = [
  {
    id: 'leads',
    label: 'Leads & CRM',
    icon: '🎯',
    color: 'blue',
    actions: [
      { id: 'view_own',       label: 'View own leads',          risk: 1 },
      { id: 'view_team',      label: 'View team leads',         risk: 1 },
      { id: 'view_all',       label: 'View all leads',          risk: 2 },
      { id: 'create',         label: 'Create leads',            risk: 1 },
      { id: 'edit_own',       label: 'Edit own leads',          risk: 1 },
      { id: 'edit_all',       label: 'Edit any lead',           risk: 2 },
      { id: 'delete',         label: 'Delete leads',            risk: 3 },
      { id: 'assign',         label: 'Assign leads',            risk: 2 },
      { id: 'export',         label: 'Export leads',            risk: 3 },
      { id: 'view_ai_score',  label: 'View AI scoring',         risk: 1 },
    ],
  },
  {
    id: 'quotations',
    label: 'Quotations',
    icon: '📋',
    color: 'teal',
    actions: [
      { id: 'view',              label: 'View quotations',        risk: 1 },
      { id: 'create',            label: 'Create quotes',          risk: 1 },
      { id: 'edit',              label: 'Edit quotes',            risk: 2 },
      { id: 'send',              label: 'Send to client',         risk: 2 },
      { id: 'approve_discount',  label: 'Approve discounts',      risk: 3 },
      { id: 'view_margin',       label: 'View profit margin',     risk: 3 },
      { id: 'override_price',    label: 'Override pricing',       risk: 4 },
    ],
  },
  {
    id: 'bookings',
    label: 'Bookings',
    icon: '✈️',
    color: 'indigo',
    actions: [
      { id: 'view_own',       label: 'View own bookings',       risk: 1 },
      { id: 'view_all',       label: 'View all bookings',       risk: 2 },
      { id: 'create',         label: 'Create bookings',         risk: 2 },
      { id: 'edit',           label: 'Edit bookings',           risk: 2 },
      { id: 'cancel',         label: 'Cancel bookings',         risk: 3 },
      { id: 'approve',        label: 'Approve bookings',        risk: 3 },
      { id: 'process_refund', label: 'Process refunds',         risk: 4 },
      { id: 'export',         label: 'Export bookings',         risk: 2 },
    ],
  },
  {
    id: 'itineraries',
    label: 'Itineraries',
    icon: '🗺️',
    color: 'amber',
    actions: [
      { id: 'view',    label: 'View itineraries',  risk: 1 },
      { id: 'create',  label: 'Create itineraries',risk: 1 },
      { id: 'edit',    label: 'Edit itineraries',  risk: 2 },
      { id: 'delete',  label: 'Delete itineraries',risk: 3 },
      { id: 'publish', label: 'Publish to client', risk: 2 },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & P&L',
    icon: '💰',
    color: 'emerald',
    actions: [
      { id: 'view_basic',       label: 'View basic financials', risk: 2 },
      { id: 'view_full',        label: 'View full P&L',         risk: 3 },
      { id: 'view_margin',      label: 'View all margins',      risk: 3 },
      { id: 'approve_payment',  label: 'Approve payments',      risk: 4 },
      { id: 'export',           label: 'Export financial data', risk: 4 },
      { id: 'reconcile',        label: 'Reconcile accounts',    risk: 4 },
    ],
  },
  {
    id: 'vendors',
    label: 'Vendors',
    icon: '🏨',
    color: 'orange',
    actions: [
      { id: 'view',            label: 'View vendors',          risk: 1 },
      { id: 'create',          label: 'Add vendors',           risk: 2 },
      { id: 'edit',            label: 'Edit vendors',          risk: 2 },
      { id: 'delete',          label: 'Delete vendors',        risk: 3 },
      { id: 'negotiate_rates', label: 'Negotiate rates',       risk: 3 },
    ],
  },
  {
    id: 'comms',
    label: 'Communications',
    icon: '💬',
    color: 'green',
    actions: [
      { id: 'view',             label: 'View messages',         risk: 1 },
      { id: 'send',             label: 'Send messages',         risk: 1 },
      { id: 'bulk_send',        label: 'Bulk messaging',        risk: 3 },
      { id: 'view_all_threads', label: 'View all threads',      risk: 2 },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Analytics',
    icon: '📊',
    color: 'violet',
    actions: [
      { id: 'view_own',     label: 'View own reports',     risk: 1 },
      { id: 'view_team',    label: 'View team reports',    risk: 2 },
      { id: 'view_company', label: 'View company reports', risk: 3 },
      { id: 'export',       label: 'Export reports',       risk: 3 },
    ],
  },
  {
    id: 'team',
    label: 'Team Management',
    icon: '👥',
    color: 'pink',
    actions: [
      { id: 'view',        label: 'View team members',    risk: 1 },
      { id: 'invite',      label: 'Invite members',       risk: 3 },
      { id: 'edit_roles',  label: 'Change member roles',  risk: 4 },
      { id: 'suspend',     label: 'Suspend members',      risk: 4 },
      { id: 'remove',      label: 'Remove members',       risk: 4 },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: '👥',
    color: 'teal',
    actions: [
      { id: 'view_all', label: 'View all clients',     risk: 1 },
      { id: 'create',   label: 'Add / import clients', risk: 2 },
      { id: 'edit',     label: 'Edit client profiles', risk: 2 },
      { id: 'delete',   label: 'Delete clients',       risk: 4 },
      { id: 'export',   label: 'Export contacts',      risk: 4 },
    ],
  },
  {
    id: 'settings',
    label: 'Settings & Admin',
    icon: '⚙️',
    color: 'slate',
    actions: [
      { id: 'view',           label: 'View settings',       risk: 1 },
      { id: 'edit_company',   label: 'Edit company profile',risk: 3 },
      { id: 'manage_billing', label: 'Manage billing',      risk: 4 },
      { id: 'manage_api_keys',label: 'Manage API keys',     risk: 4 },
      { id: 'manage_roles',   label: 'Manage roles',        risk: 4 },
    ],
  },
]

// ─── Types ─────────────────────────────────────────────────────────────────────

type PermState = 'off' | 'on' | 'conditional'
type PermKey   = string // `${moduleId}:${actionId}`

interface AbacCondition {
  geography:     string[]   // ['south_india', 'rajasthan']
  product_types: string[]   // ['international', 'domestic', 'honeymoon', 'MICE', 'corporate']
  customer_types:string[]   // ['B2B', 'B2C']
  deal_size_min: number
  deal_size_max: number
  own_data_only: boolean
  shift_start:   string     // '09:00'
  shift_end:     string     // '19:00'
  valid_until:   string     // '2026-12-31' or ''
}

const EMPTY_CONDITION: AbacCondition = {
  geography: [], product_types: [], customer_types: [],
  deal_size_min: 0, deal_size_max: 0,
  own_data_only: false,
  shift_start: '', shift_end: '',
  valid_until: '',
}

interface Permission {
  state:      PermState
  conditions: AbacCondition
}

interface Role {
  id:          string
  name:        string
  description: string
  color:       string
  icon:        string
  isTemplate:  boolean
  isLocked:    boolean   // Owner role cannot be edited
  memberCount: number
  permissions: Record<PermKey, Permission>
  createdAt:   string
  version:     number
}

interface UserAssignment {
  id:       string
  name:     string
  email:    string
  initials: string
  roles:    string[]  // role ids
  hasOverride: boolean
}

// ─── Seed data ─────────────────────────────────────────────────────────────────

function buildRolePerms(grants: string[], conditionals: Record<string, Partial<AbacCondition>> = {}): Record<PermKey, Permission> {
  const perms: Record<PermKey, Permission> = {}
  grants.forEach(key => {
    perms[key] = {
      state: conditionals[key] ? 'conditional' : 'on',
      conditions: conditionals[key] ? { ...EMPTY_CONDITION, ...conditionals[key] } : { ...EMPTY_CONDITION },
    }
  })
  return perms
}

const SEED_ROLES: Role[] = [
  {
    id: 'owner', name: 'Company Owner', description: 'Full system access — cannot be modified',
    color: '#0F172A', icon: '👑', isTemplate: false, isLocked: true, memberCount: 1,
    version: 1, createdAt: '2026-01-01',
    permissions: buildRolePerms([
      'clients:view_all','clients:create','clients:edit','clients:delete','clients:export',
      'leads:view_own','leads:view_team','leads:view_all','leads:create','leads:edit_own','leads:edit_all','leads:delete','leads:assign','leads:export','leads:view_ai_score',
      'quotations:view','quotations:create','quotations:edit','quotations:send','quotations:approve_discount','quotations:view_margin','quotations:override_price',
      'bookings:view_own','bookings:view_all','bookings:create','bookings:edit','bookings:cancel','bookings:approve','bookings:process_refund','bookings:export',
      'itineraries:view','itineraries:create','itineraries:edit','itineraries:delete','itineraries:publish',
      'finance:view_basic','finance:view_full','finance:view_margin','finance:approve_payment','finance:export','finance:reconcile',
      'vendors:view','vendors:create','vendors:edit','vendors:delete','vendors:negotiate_rates',
      'comms:view','comms:send','comms:bulk_send','comms:view_all_threads',
      'reports:view_own','reports:view_team','reports:view_company','reports:export',
      'team:view','team:invite','team:edit_roles','team:suspend','team:remove',
      'settings:view','settings:edit_company','settings:manage_billing','settings:manage_api_keys','settings:manage_roles',
    ]),
  },
  {
    id: 'org_admin', name: 'Org Admin', description: 'Full operational access, no billing/owner settings',
    color: '#6d28d9', icon: '🛡️', isTemplate: true, isLocked: false, memberCount: 2,
    version: 2, createdAt: '2026-01-15',
    permissions: buildRolePerms([
      'clients:view_all','clients:create','clients:edit','clients:delete','clients:export',
      'leads:view_own','leads:view_team','leads:view_all','leads:create','leads:edit_own','leads:edit_all','leads:assign','leads:export','leads:view_ai_score',
      'quotations:view','quotations:create','quotations:edit','quotations:send','quotations:approve_discount','quotations:view_margin',
      'bookings:view_own','bookings:view_all','bookings:create','bookings:edit','bookings:cancel','bookings:approve','bookings:export',
      'itineraries:view','itineraries:create','itineraries:edit','itineraries:publish',
      'finance:view_basic','finance:view_full','finance:view_margin',
      'vendors:view','vendors:create','vendors:edit','vendors:negotiate_rates',
      'comms:view','comms:send','comms:view_all_threads',
      'reports:view_own','reports:view_team','reports:view_company','reports:export',
      'team:view','team:invite','team:edit_roles',
      'settings:view','settings:edit_company','settings:manage_roles',
    ]),
  },
  {
    id: 'sales_manager', name: 'Sales Manager', description: 'Full lead & quote access, team visibility, no finance',
    color: '#0369a1', icon: '📈', isTemplate: true, isLocked: false, memberCount: 3,
    version: 1, createdAt: '2026-02-01',
    permissions: buildRolePerms([
      'clients:view_all','clients:create','clients:edit','clients:export',
      'leads:view_own','leads:view_team','leads:view_all','leads:create','leads:edit_own','leads:edit_all','leads:assign','leads:view_ai_score',
      'quotations:view','quotations:create','quotations:edit','quotations:send','quotations:approve_discount',
      'bookings:view_own','bookings:view_all','bookings:create',
      'itineraries:view','itineraries:create','itineraries:edit','itineraries:publish',
      'comms:view','comms:send',
      'reports:view_own','reports:view_team',
      'vendors:view',
      'team:view',
    ]),
  },
  {
    id: 'sales_agent', name: 'Sales Agent', description: 'Own leads, create quotes, basic comms',
    color: '#0284c7', icon: '💼', isTemplate: true, isLocked: false, memberCount: 6,
    version: 1, createdAt: '2026-02-15',
    permissions: buildRolePerms([
      'clients:view_all',
      'leads:view_own','leads:create','leads:edit_own','leads:view_ai_score',
      'quotations:view','quotations:create','quotations:edit','quotations:send',
      'bookings:view_own',
      'itineraries:view','itineraries:create','itineraries:edit',
      'comms:view','comms:send',
      'reports:view_own',
      'vendors:view',
    ]),
  },
  {
    id: 'ops_executive', name: 'Ops Executive', description: 'Booking & vendor ops, no financial visibility',
    color: '#d97706', icon: '⚙️', isTemplate: true, isLocked: false, memberCount: 4,
    version: 1, createdAt: '2026-03-01',
    permissions: buildRolePerms([
      'clients:view_all','clients:create','clients:edit',
      'leads:view_team',
      'bookings:view_own','bookings:view_all','bookings:create','bookings:edit',
      'itineraries:view','itineraries:create','itineraries:edit','itineraries:publish',
      'vendors:view','vendors:create','vendors:edit','vendors:negotiate_rates',
      'comms:view','comms:send',
      'reports:view_own',
    ]),
  },
  {
    id: 'finance_admin', name: 'Finance Admin', description: 'Full financial access, no leads or booking ops',
    color: '#059669', icon: '💰', isTemplate: true, isLocked: false, memberCount: 1,
    version: 1, createdAt: '2026-03-15',
    permissions: buildRolePerms([
      'clients:view_all','clients:export',
      'bookings:view_all','bookings:export',
      'finance:view_basic','finance:view_full','finance:view_margin','finance:approve_payment','finance:export','finance:reconcile',
      'reports:view_own','reports:view_team','reports:view_company','reports:export',
      'settings:view',
    ]),
  },
  {
    id: 'regional_south', name: 'Regional Head — South India', description: 'Leads + bookings restricted to South India geography',
    color: '#7c3aed', icon: '🗺️', isTemplate: false, isLocked: false, memberCount: 1,
    version: 1, createdAt: '2026-03-20',
    permissions: buildRolePerms(
      ['leads:view_all','leads:create','leads:edit_all','leads:assign','leads:view_ai_score',
       'quotations:view','quotations:create','quotations:edit','quotations:send',
       'bookings:view_all','bookings:approve'],
      {
        'leads:view_all':   { geography: ['andhra_pradesh','telangana','karnataka','kerala','tamil_nadu'] },
        'leads:edit_all':   { geography: ['andhra_pradesh','telangana','karnataka','kerala','tamil_nadu'] },
        'bookings:view_all':{ geography: ['andhra_pradesh','telangana','karnataka','kerala','tamil_nadu'] },
        'bookings:approve': { deal_size_max: 500000, geography: ['andhra_pradesh','telangana','karnataka','kerala','tamil_nadu'] },
      }
    ),
  },
  {
    id: 'freelancer', name: 'Freelancer (Limited)', description: 'Own leads only, time-bound until project end',
    color: '#64748b', icon: '🔗', isTemplate: false, isLocked: false, memberCount: 2,
    version: 1, createdAt: '2026-04-01',
    permissions: buildRolePerms(
      ['leads:view_own','leads:create','leads:edit_own',
       'quotations:view','quotations:create',
       'itineraries:view','itineraries:create'],
      {
        'leads:view_own':   { own_data_only: true, valid_until: '2026-06-30' },
        'leads:create':     { valid_until: '2026-06-30' },
        'quotations:create':{ valid_until: '2026-06-30' },
      }
    ),
  },
]

const SEED_USERS: UserAssignment[] = [
  { id: '1', name: 'Priya Sharma',  email: 'priya@co.travel',  initials: 'PS', roles: ['org_admin'],    hasOverride: false },
  { id: '2', name: 'Rahul Verma',   email: 'rahul@co.travel',  initials: 'RV', roles: ['sales_manager'],hasOverride: false },
  { id: '3', name: 'Divya K.',      email: 'divya@co.travel',  initials: 'DK', roles: ['ops_executive'],hasOverride: false },
  { id: '4', name: 'Amit Gupta',    email: 'amit@co.travel',   initials: 'AG', roles: ['sales_agent'],  hasOverride: true  },
  { id: '5', name: 'Sneha Rao',     email: 'sneha@co.travel',  initials: 'SR', roles: ['sales_agent','ops_executive'], hasOverride: false },
  { id: '6', name: 'Karan Mehta',   email: 'karan@co.travel',  initials: 'KM', roles: ['finance_admin'],hasOverride: false },
]

const GEOGRAPHY_OPTIONS = [
  'All India','North India','South India','East India','West India',
  'andhra_pradesh','telangana','karnataka','kerala','tamil_nadu',
  'maharashtra','gujarat','rajasthan','delhi','uttar_pradesh',
  'International','South East Asia','Europe','Middle East','Americas',
]
const PRODUCT_OPTIONS = ['domestic','international','honeymoon','adventure','MICE','corporate','luxury','pilgrimage','wildlife']
const CUSTOMER_OPTIONS = ['B2B','B2C']

const MODULE_COLORS: Record<string, string> = {
  blue:   'bg-blue-50 text-blue-700 border-blue-100',
  teal:   'bg-teal-50 text-teal-700 border-teal-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  amber:  'bg-amber-50 text-amber-700 border-amber-100',
  emerald:'bg-emerald-50 text-emerald-700 border-emerald-100',
  orange: 'bg-orange-50 text-orange-700 border-orange-100',
  green:  'bg-green-50 text-green-700 border-green-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  pink:   'bg-pink-50 text-pink-700 border-pink-100',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
}

const RISK_LABEL: Record<number, { label: string; cls: string }> = {
  1: { label: 'Low',      cls: 'text-green-600 bg-green-50' },
  2: { label: 'Medium',   cls: 'text-amber-600 bg-amber-50' },
  3: { label: 'High',     cls: 'text-orange-600 bg-orange-50' },
  4: { label: 'Critical', cls: 'text-red-600 bg-red-50' },
}

const ROLE_COLORS = [
  '#0F172A','#6d28d9','#0369a1','#0284c7','#d97706',
  '#059669','#7c3aed','#db2777','#dc2626','#64748b',
]
const ROLE_ICONS = ['👑','🛡️','📈','💼','⚙️','💰','🗺️','🔗','🎯','🌏','🏢','💡']

// ─── Helper: summarise permissions for preview ──────────────────────────────

function summariseRole(role: Role): { can: string[]; cannot: string[]; conditional: string[] } {
  const can: string[] = []
  const cannot: string[] = []
  const conditional: string[] = []

  ALL_MODULES.forEach(mod => {
    mod.actions.forEach(action => {
      const key: PermKey = `${mod.id}:${action.id}`
      const perm = role.permissions[key]
      if (!perm || perm.state === 'off') {
        if (action.risk <= 2) cannot.push(`${action.label}`)
      } else if (perm.state === 'conditional') {
        conditional.push(`${action.label} (restricted)`)
      } else {
        can.push(`${action.label}`)
      }
    })
  })

  return {
    can: can.slice(0, 10),
    cannot: cannot.slice(0, 8),
    conditional: conditional.slice(0, 6),
  }
}

function countHighRisk(role: Role): number {
  return Object.entries(role.permissions).filter(([key, perm]) => {
    if (perm.state === 'off') return false
    const [modId, actionId] = key.split(':')
    const mod = ALL_MODULES.find(m => m.id === modId)
    const action = mod?.actions.find(a => a.id === actionId)
    return action && action.risk >= 3
  }).length
}

function countGranted(role: Role): number {
  return Object.values(role.permissions).filter(p => p.state !== 'off').length
}

// ─── ABAC Condition Editor ────────────────────────────────────────────────────

function ConditionEditor({
  conditions, onChange, onClose,
}: {
  conditions: AbacCondition
  onChange: (c: AbacCondition) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState<AbacCondition>({ ...conditions })

  const toggle = (field: 'geography' | 'product_types' | 'customer_types', val: string) => {
    setLocal(prev => ({
      ...prev,
      [field]: prev[field].includes(val)
        ? prev[field].filter(v => v !== val)
        : [...prev[field], val],
    }))
  }

  const hasAnyCondition = local.geography.length > 0 || local.product_types.length > 0
    || local.customer_types.length > 0 || local.deal_size_max > 0
    || local.own_data_only || local.shift_start || local.valid_until

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <p className="text-sm font-black text-slate-800">Conditional Access</p>
            <p className="text-xs text-slate-500 mt-0.5">This permission only applies when these conditions are met</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={16} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

          {/* Geography */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Geography</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GEOGRAPHY_OPTIONS.map(g => (
                <button key={g} onClick={() => toggle('geography', g)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    local.geography.includes(g)
                      ? 'bg-[#14B8A6] text-white border-[#14B8A6]'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-[#14B8A6]'
                  }`}>
                  {g.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Product Types */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Product Type</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRODUCT_OPTIONS.map(p => (
                <button key={p} onClick={() => toggle('product_types', p)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all capitalize ${
                    local.product_types.includes(p)
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-400'
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Customer Type</span>
            </div>
            <div className="flex gap-2">
              {CUSTOMER_OPTIONS.map(c => (
                <button key={c} onClick={() => toggle('customer_types', c)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    local.customer_types.includes(c)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Deal Size */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Deal Size Limit (₹)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Min value</label>
                <input type="number" value={local.deal_size_min || ''} placeholder="0"
                  onChange={e => setLocal(p => ({ ...p, deal_size_min: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Max value (0 = no limit)</label>
                <input type="number" value={local.deal_size_max || ''} placeholder="No limit"
                  onChange={e => setLocal(p => ({ ...p, deal_size_max: Number(e.target.value) }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none" />
              </div>
            </div>
          </div>

          {/* Time Window */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-[#14B8A6]" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Shift Hours</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">From</label>
                <input type="time" value={local.shift_start}
                  onChange={e => setLocal(p => ({ ...p, shift_start: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-1">Until</label>
                <input type="time" value={local.shift_end}
                  onChange={e => setLocal(p => ({ ...p, shift_end: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none" />
              </div>
            </div>
          </div>

          {/* Other flags */}
          <div className="flex items-center justify-between py-3 border-t border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-700">Own data only</p>
              <p className="text-[11px] text-slate-400">User can only access records they created</p>
            </div>
            <button onClick={() => setLocal(p => ({ ...p, own_data_only: !p.own_data_only }))}
              className="flex-shrink-0">
              {local.own_data_only
                ? <ToggleRight size={28} className="text-[#14B8A6]" />
                : <ToggleLeft size={28} className="text-slate-300" />}
            </button>
          </div>

          {/* Expiry */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-amber-500" />
              <span className="text-xs font-black text-slate-700 uppercase tracking-widest">Time-Bound Access</span>
            </div>
            <input type="date" value={local.valid_until}
              onChange={e => setLocal(p => ({ ...p, valid_until: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none" />
            {local.valid_until && (
              <p className="text-[11px] text-amber-600 mt-1 font-medium">
                ⚠ This permission will expire on {new Date(local.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
          <div className={`text-xs font-semibold ${hasAnyCondition ? 'text-amber-600' : 'text-slate-400'}`}>
            {hasAnyCondition ? `${[
              local.geography.length > 0 && `${local.geography.length} regions`,
              local.product_types.length > 0 && `${local.product_types.length} product types`,
              local.deal_size_max > 0 && `up to ₹${(local.deal_size_max/100000).toFixed(1)}L`,
              local.own_data_only && 'own data only',
              local.valid_until && `expires ${local.valid_until}`,
            ].filter(Boolean).join(' · ')}` : 'No conditions set — permission is unconditional'}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700">Cancel</button>
            <button onClick={() => { onChange(local); onClose() }}
              className="px-4 py-2 bg-[#0F172A] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-all">
              Apply Conditions
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Permission Row ────────────────────────────────────────────────────────────

function PermRow({
  modId, action, perm, locked, onChange,
}: {
  modId: string
  action: { id: string; label: string; risk: number }
  perm: Permission | undefined
  locked: boolean
  onChange: (key: PermKey, perm: Permission) => void
}) {
  const [showCondEditor, setShowCondEditor] = useState(false)
  const key: PermKey = `${modId}:${action.id}`
  const state = perm?.state ?? 'off'
  const risk = RISK_LABEL[action.risk]

  const cycle = () => {
    if (locked) return
    const next: PermState = state === 'off' ? 'on' : state === 'on' ? 'off' : 'off'
    onChange(key, { state: next, conditions: perm?.conditions ?? { ...EMPTY_CONDITION } })
  }

  const makeConditional = () => {
    if (locked) return
    onChange(key, { state: 'conditional', conditions: perm?.conditions ?? { ...EMPTY_CONDITION } })
    setShowCondEditor(true)
  }

  const hasConditions = perm?.conditions && (
    (perm.conditions.geography?.length ?? 0) > 0 ||
    (perm.conditions.product_types?.length ?? 0) > 0 ||
    (perm.conditions.deal_size_max ?? 0) > 0 ||
    perm.conditions.own_data_only ||
    perm.conditions.valid_until
  )

  return (
    <>
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
        state !== 'off' ? 'bg-white border border-slate-100 shadow-sm' : 'hover:bg-slate-50'
      }`}>
        {/* Toggle */}
        <button onClick={cycle} disabled={locked} className="flex-shrink-0">
          {state === 'off'
            ? <ToggleLeft size={22} className="text-slate-300" />
            : state === 'conditional'
            ? <ToggleRight size={22} className="text-amber-500" />
            : <ToggleRight size={22} className="text-[#14B8A6]" />}
        </button>

        {/* Label */}
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-semibold ${state !== 'off' ? 'text-slate-800' : 'text-slate-400'}`}>
            {action.label}
          </span>
          {state === 'conditional' && hasConditions && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {(perm?.conditions.geography?.length ?? 0) > 0 && (
                <span className="text-[10px] bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded font-medium">
                  📍 {perm!.conditions.geography.length} regions
                </span>
              )}
              {perm?.conditions.deal_size_max ? (
                <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-medium">
                  ₹ up to {(perm.conditions.deal_size_max/100000).toFixed(1)}L
                </span>
              ) : null}
              {perm?.conditions.own_data_only && (
                <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium">
                  🔒 own data
                </span>
              )}
              {perm?.conditions.valid_until && (
                <span className="text-[10px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-medium">
                  ⏳ {perm.conditions.valid_until}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Risk badge */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${risk.cls}`}>
          {risk.label}
        </span>

        {/* Condition button */}
        {!locked && state !== 'off' && (
          <button onClick={makeConditional}
            className={`flex-shrink-0 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
              state === 'conditional' ? 'opacity-100 bg-amber-50 text-amber-600' : 'hover:bg-slate-100 text-slate-400'
            }`} title="Add conditions (geography, deal size, time...)">
            <Sliders size={12} />
          </button>
        )}
      </div>

      {showCondEditor && (
        <ConditionEditor
          conditions={perm?.conditions ?? { ...EMPTY_CONDITION }}
          onChange={c => onChange(key, { state: 'conditional', conditions: c })}
          onClose={() => setShowCondEditor(false)}
        />
      )}
    </>
  )
}

// ─── Module Section ────────────────────────────────────────────────────────────

function ModuleSection({
  mod, permissions, locked, onChange,
}: {
  mod: typeof ALL_MODULES[0]
  permissions: Record<PermKey, Permission>
  locked: boolean
  onChange: (key: PermKey, perm: Permission) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const granted = mod.actions.filter(a => permissions[`${mod.id}:${a.id}`]?.state !== 'off' && permissions[`${mod.id}:${a.id}`]).length
  const colorCls = MODULE_COLORS[mod.color] ?? MODULE_COLORS.slate

  const toggleAll = () => {
    if (locked) return
    const allOn = granted === mod.actions.length
    mod.actions.forEach(action => {
      onChange(`${mod.id}:${action.id}`, {
        state: allOn ? 'off' : 'on',
        conditions: { ...EMPTY_CONDITION },
      })
    })
  }

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 bg-white hover:bg-slate-50 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <span className="text-xl leading-none">{mod.icon}</span>
        <div className="flex-1">
          <span className="text-sm font-black text-slate-800">{mod.label}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorCls}`}>
              {granted}/{mod.actions.length} granted
            </span>
            {granted > 0 && (
              <div className="flex gap-0.5">
                {mod.actions.map(a => {
                  const state = permissions[`${mod.id}:${a.id}`]?.state
                  return (
                    <div key={a.id} className={`w-1.5 h-1.5 rounded-full ${
                      state === 'on' ? 'bg-[#14B8A6]' : state === 'conditional' ? 'bg-amber-400' : 'bg-slate-200'
                    }`} />
                  )
                })}
              </div>
            )}
          </div>
        </div>
        {!locked && (
          <button
            onClick={e => { e.stopPropagation(); toggleAll() }}
            className="text-[10px] font-bold text-slate-400 hover:text-[#14B8A6] transition-colors px-2 py-1 rounded-lg hover:bg-teal-50 flex-shrink-0"
          >
            {granted === mod.actions.length ? 'Remove all' : 'Grant all'}
          </button>
        )}
        {expanded ? <ChevronUp size={16} className="text-slate-400 flex-shrink-0" /> : <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-1 bg-slate-50 space-y-1">
          {mod.actions.map(action => (
            <PermRow
              key={action.id}
              modId={mod.id}
              action={action}
              perm={permissions[`${mod.id}:${action.id}`]}
              locked={locked}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function RolesPage() {
  const [roles, setRoles]               = useState<Role[]>(SEED_ROLES)
  const [selectedRoleId, setSelectedId] = useState<string>('sales_manager')
  const [search, setSearch]             = useState('')
  const [saving, setSaving]             = useState(false)
  const [saved, setSaved]               = useState(false)
  const [creating, setCreating]         = useState(false)
  const [toast, setToast]               = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [showCreateModal, setShowCreate]= useState(false)
  const [showAssignPanel, setShowAssign]= useState(false)
  const [users]                         = useState<UserAssignment[]>(SEED_USERS)

  // New role form
  const [newName, setNewName]           = useState('')
  const [newDesc, setNewDesc]           = useState('')
  const [newColor, setNewColor]         = useState(ROLE_COLORS[2])
  const [newIcon, setNewIcon]           = useState('💼')
  const [cloneFrom, setCloneFrom]       = useState('')

  const selectedRole = roles.find(r => r.id === selectedRoleId) ?? roles[0]

  const filteredRoles = roles.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // On mount: fetch roles from backend.
  // If backend returns ANY array (including empty), use it as the authoritative
  // source — do NOT keep seed roles around because that creates phantom roles
  // whose permission saves will 404 against backend.
  // Seed only persists if the API itself is unreachable.
  useEffect(() => {
    rolesApi.list().then(backendRoles => {
      if (!Array.isArray(backendRoles)) return
      // Empty backend = empty UI (no phantom roles).
      if (backendRoles.length === 0) {
        setRoles([])
        return
      }
      // Backend roles override seed entirely; build a fresh list from backend.
      setRoles(() => backendRoles.map(br => {
        const perms: Record<PermKey, Permission> = {}
        br.permissions.forEach(p => {
          perms[p] = { state: 'on', conditions: { ...EMPTY_CONDITION } }
        })
        return {
          id: br.id,
          name: br.name,
          description: br.description ?? '',
          color: '#64748b',
          icon: '🔑',
          isTemplate: false,
          isLocked: false,
          memberCount: 0,
          version: 1,
          createdAt: br.created_at ?? new Date().toISOString().split('T')[0],
          permissions: perms,
        }
      }))
    }).catch(() => {
      // Backend unreachable — silently use seed data
    })
  }, [])

  const updatePermission = useCallback((key: PermKey, perm: Permission) => {
    setRoles(prev => prev.map(r =>
      r.id === selectedRoleId
        ? { ...r, permissions: { ...r.permissions, [key]: perm } }
        : r
    ))
  }, [selectedRoleId])

  const saveRole = async () => {
    if (!selectedRole || selectedRole.isLocked) return
    setSaving(true)
    try {
      // Collect all granted/conditional permission keys
      const permissionKeys = Object.entries(selectedRole.permissions)
        .filter(([, p]) => p.state !== 'off')
        .map(([key]) => key)

      await rolesApi.updatePermissions(selectedRole.id, permissionKeys)
      setSaved(true)
      showToast('Role permissions saved successfully', 'success')
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save role', 'error')
    } finally {
      setSaving(false)
    }
  }

  const createRole = async () => {
    if (!newName.trim()) return
    setCreating(true)
    const base = cloneFrom ? roles.find(r => r.id === cloneFrom) : null
    const basePermKeys = base
      ? Object.entries(base.permissions).filter(([, p]) => p.state !== 'off').map(([k]) => k)
      : []

    try {
      const created = await rolesApi.create({
        name: newName.trim(),
        description: newDesc.trim() || 'Custom role',
        permissions: basePermKeys,
      })

      const perms: Record<PermKey, Permission> = {}
      created.permissions.forEach(p => {
        perms[p] = { state: 'on', conditions: { ...EMPTY_CONDITION } }
      })

      const newRole: Role = {
        id:          created.id,
        name:        created.name,
        description: (created.description ?? newDesc.trim()) || 'Custom role',
        color:       newColor,
        icon:        newIcon,
        isTemplate:  false,
        isLocked:    false,
        memberCount: 0,
        version:     1,
        createdAt:   created.created_at ?? new Date().toISOString().split('T')[0],
        permissions: perms,
      }
      setRoles(prev => [...prev, newRole])
      setSelectedId(newRole.id)
      showToast(`Role "${newRole.name}" created`, 'success')
    } catch (err) {
      // Fallback: create locally if API fails
      const newRole: Role = {
        id:          `role_${Date.now()}`,
        name:        newName.trim(),
        description: newDesc.trim() || 'Custom role',
        color:       newColor,
        icon:        newIcon,
        isTemplate:  false,
        isLocked:    false,
        memberCount: 0,
        version:     1,
        createdAt:   new Date().toISOString().split('T')[0],
        permissions: base ? { ...base.permissions } : {},
      }
      setRoles(prev => [...prev, newRole])
      setSelectedId(newRole.id)
      showToast(err instanceof Error ? err.message : 'Created locally (backend offline)', 'error')
    } finally {
      setCreating(false)
      setShowCreate(false)
      setNewName(''); setNewDesc(''); setCloneFrom('')
    }
  }

  const deleteRole = (id: string) => {
    if (id === 'owner') return
    setRoles(prev => prev.filter(r => r.id !== id))
    setSelectedId('sales_manager')
  }

  const preview = selectedRole ? summariseRole(selectedRole) : { can: [], cannot: [], conditional: [] }
  const highRiskCount = selectedRole ? countHighRisk(selectedRole) : 0
  const grantedCount  = selectedRole ? countGranted(selectedRole) : 0
  const roleUsers     = users.filter(u => u.roles.includes(selectedRoleId))

  return (
    <div className="space-y-6">

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-bold transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-600 text-white'
            : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
          <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#0F172A] tracking-tight">Role Builder</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create and manage dynamic roles with granular permissions and contextual access rules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAssign(a => !a)}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all"
          >
            <UserPlus size={15} /> Assign Users
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
          >
            <Plus size={15} /> New Role
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="grid grid-cols-12 gap-5 items-start">

        {/* ── LEFT: Role List ───────────────────────────────────────────────── */}
        <div className="col-span-3 space-y-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search roles…"
              className="w-full pl-8 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-[#14B8A6] outline-none bg-white" />
          </div>

          <div className="space-y-1.5">
            {filteredRoles.map(role => {
              const isActive = role.id === selectedRoleId
              const rc = countHighRisk(role)
              return (
                <button key={role.id} onClick={() => setSelectedId(role.id)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl border transition-all group ${
                    isActive
                      ? 'bg-[#0F172A] border-[#0F172A] shadow-lg'
                      : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                  }`}>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{role.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-black truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {role.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] font-medium ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                          {role.memberCount} member{role.memberCount !== 1 ? 's' : ''}
                        </span>
                        {rc > 0 && (
                          <span className={`text-[10px] font-bold ${isActive ? 'text-red-300' : 'text-red-500'}`}>
                            ⚠ {rc} high-risk
                          </span>
                        )}
                        {role.isLocked && (
                          <Lock size={9} className={isActive ? 'text-slate-400' : 'text-slate-300'} />
                        )}
                      </div>
                    </div>
                    {role.isTemplate && !isActive && (
                      <span className="text-[9px] font-black text-[#14B8A6] bg-teal-50 px-1.5 py-0.5 rounded-full border border-teal-100">
                        TEMPLATE
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Templates callout */}
          <div className="bg-gradient-to-br from-[#14B8A6]/10 to-teal-50 border border-teal-100 rounded-xl p-3">
            <p className="text-[10px] font-black text-teal-700 uppercase tracking-widest mb-1">Templates</p>
            <p className="text-[11px] text-teal-600 leading-relaxed">
              6 pre-built role templates for common travel agency structures. Clone any to customise.
            </p>
          </div>
        </div>

        {/* ── CENTRE: Permission Matrix ──────────────────────────────────────── */}
        <div className="col-span-6 space-y-3">
          {selectedRole && (
            <>
              {/* Role header */}
              <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: selectedRole.color + '20', border: `2px solid ${selectedRole.color}40` }}>
                  {selectedRole.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-black text-[#0F172A]">{selectedRole.name}</h2>
                    {selectedRole.isLocked && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <Lock size={9} /> Locked
                      </span>
                    )}
                    {selectedRole.isTemplate && (
                      <span className="text-[10px] font-bold text-[#14B8A6] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                        TEMPLATE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedRole.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!selectedRole.isLocked && (
                    <>
                      <button
                        onClick={() => {
                          setCloneFrom(selectedRole.id)
                          setNewName(`${selectedRole.name} (copy)`)
                          setShowCreate(true)
                        }}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors" title="Clone role">
                        <Copy size={15} className="text-slate-500" />
                      </button>
                      {selectedRole.id !== 'owner' && (
                        <button onClick={() => deleteRole(selectedRole.id)}
                          className="p-2 hover:bg-red-50 rounded-xl transition-colors" title="Delete role">
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      )}
                    </>
                  )}
                  {!selectedRole.isLocked && (
                    <button onClick={saveRole} disabled={saving}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#14B8A6] text-white rounded-xl text-xs font-bold hover:bg-teal-600 transition-all disabled:opacity-60">
                      {saving
                        ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                        : saved
                        ? <><CheckCircle size={13} /> Saved!</>
                        : <><Save size={13} /> Save</>}
                    </button>
                  )}
                </div>
              </div>

              {/* High-risk warning */}
              {highRiskCount > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700 font-medium">
                    <strong>{highRiskCount} high-risk permission{highRiskCount !== 1 ? 's' : ''}</strong> granted —
                    includes financial access, overrides, or deletion rights. Ensure this is intentional.
                  </p>
                </div>
              )}

              {/* Module sections */}
              <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
                {ALL_MODULES.map(mod => (
                  <ModuleSection
                    key={mod.id}
                    mod={mod}
                    permissions={selectedRole.permissions}
                    locked={selectedRole.isLocked}
                    onChange={updatePermission}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── RIGHT: Preview + Assign ────────────────────────────────────────── */}
        <div className="col-span-3 space-y-4">

          {/* Stats */}
          <div className="bg-[#0F172A] rounded-2xl p-4 text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Role Stats</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Permissions', value: grantedCount, icon: '✓', color: 'text-[#14B8A6]' },
                { label: 'High Risk', value: highRiskCount, icon: '⚠', color: highRiskCount > 0 ? 'text-red-400' : 'text-green-400' },
                { label: 'Members', value: selectedRole?.memberCount ?? 0, icon: '👤', color: 'text-blue-400' },
                { label: 'Version', value: `v${selectedRole?.version ?? 1}`, icon: '📌', color: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-2.5">
                  <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={13} className="text-[#14B8A6]" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Preview</p>
            </div>

            {preview.can.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1.5">Can do</p>
                <div className="space-y-1">
                  {preview.can.slice(0, 6).map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-700">
                      <CheckCircle size={10} className="text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                  {preview.can.length > 6 && (
                    <p className="text-[10px] text-slate-400 pl-4">+{preview.can.length - 6} more</p>
                  )}
                </div>
              </div>
            )}

            {preview.conditional.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Conditional</p>
                <div className="space-y-1">
                  {preview.conditional.map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <Sliders size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {preview.cannot.length > 0 && (
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1.5">Cannot do</p>
                <div className="space-y-1">
                  {preview.cannot.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-slate-400">
                      <X size={10} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Members with this role */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-slate-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {roleUsers.length} Member{roleUsers.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button onClick={() => setShowAssign(true)}
                className="text-[10px] font-bold text-[#14B8A6] hover:underline">+ Assign</button>
            </div>

            {roleUsers.length === 0 ? (
              <div className="text-center py-4">
                <Users size={20} className="mx-auto mb-1.5 text-slate-200" />
                <p className="text-[11px] text-slate-400">No members assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {roleUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#14B8A6] to-teal-600 flex items-center justify-center text-white text-[10px] font-black flex-shrink-0">
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                    {u.hasOverride && (
                      <span title="Has user-level overrides" className="text-[9px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-full border border-violet-100">
                        OVR
                      </span>
                    )}
                    {u.roles.length > 1 && (
                      <span className="text-[9px] text-slate-400" title={`Also has: ${u.roles.filter(r => r !== selectedRoleId).join(', ')}`}>
                        +{u.roles.length - 1}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI suggestion */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-violet-600" />
              <p className="text-[10px] font-black text-violet-700 uppercase tracking-widest">AI Suggestion</p>
            </div>
            <p className="text-[11px] text-violet-700 leading-relaxed">
              {selectedRoleId === 'sales_agent'
                ? "Based on 47 similar agencies, Sales Agents rarely need 'Delete leads'. Consider removing to reduce risk."
                : selectedRoleId === 'finance_admin'
                ? "Finance Admins at similar agencies typically also get 'View all bookings' for reconciliation. Consider adding."
                : selectedRoleId === 'ops_executive'
                ? "Ops staff at similar companies often need 'Comms: bulk send' for vendor confirmations. Consider adding."
                : "This role looks well-configured based on similar travel agencies in your segment."}
            </p>
            <button className="mt-2.5 text-[11px] font-bold text-violet-600 hover:underline flex items-center gap-1">
              Apply suggestion <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* ── CREATE ROLE MODAL ───────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-100"
            onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-base font-black text-[#0F172A]">Create New Role</p>
                <p className="text-xs text-slate-500 mt-0.5">Design a custom role for your team structure</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Icon + color row */}
              <div className="flex gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Icon</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {ROLE_ICONS.map(ic => (
                      <button key={ic} onClick={() => setNewIcon(ic)}
                        className={`text-lg p-1.5 rounded-lg border transition-all ${newIcon === ic ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-100 hover:border-slate-300'}`}>
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Colour</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ROLE_COLORS.map(c => (
                      <button key={c} onClick={() => setNewColor(c)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${newColor === c ? 'border-white scale-110 shadow-md' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Role Name *</label>
                <input value={newName} onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Europe Specialist, Senior Closer, MICE Head"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] outline-none" />
              </div>

              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">Description</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="What does this role do?"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] outline-none" />
              </div>

              {/* Clone from */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                  Start from (optional — clone permissions)
                </label>
                <select value={cloneFrom} onChange={e => setCloneFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:border-[#14B8A6] outline-none bg-white">
                  <option value="">Blank role</option>
                  {roles.filter(r => !r.isLocked).map(r => (
                    <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                  ))}
                </select>
                {cloneFrom && (
                  <p className="text-[11px] text-[#14B8A6] mt-1 font-medium">
                    ✓ Will clone all {countGranted(roles.find(r => r.id === cloneFrom)!)} permissions from {roles.find(r => r.id === cloneFrom)?.name}
                  </p>
                )}
              </div>

              {/* Preview */}
              {newName && (
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: newColor + '25', border: `2px solid ${newColor}50` }}>
                    {newIcon}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-800">{newName}</p>
                    <p className="text-[11px] text-slate-400">{newDesc || 'Custom role'}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={createRole} disabled={!newName.trim() || creating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#0F172A] text-white rounded-xl text-sm font-bold hover:bg-slate-800 disabled:opacity-40 transition-all">
                {creating
                  ? <><Loader2 size={14} className="animate-spin" /> Creating…</>
                  : <><Plus size={14} /> Create Role</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN USERS SLIDE-OVER ─────────────────────────────────────────── */}
      {showAssignPanel && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAssign(false)} />
          <div className="relative bg-white w-full max-w-sm h-full flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-[#0F172A]">Assign to &quot;{selectedRole?.name}&quot;</p>
                <p className="text-xs text-slate-500 mt-0.5">{roleUsers.length} member{roleUsers.length !== 1 ? 's' : ''} currently assigned</p>
              </div>
              <button onClick={() => setShowAssign(false)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                <X size={16} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {users.map(u => {
                const hasRole = u.roles.includes(selectedRoleId)
                return (
                  <div key={u.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    hasRole ? 'border-[#14B8A6] bg-teal-50' : 'border-slate-100 bg-white hover:border-slate-200'
                  }`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#14B8A6] to-teal-700 flex items-center justify-center text-white text-xs font-black flex-shrink-0">
                      {u.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                      {u.roles.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {u.roles.map(rid => {
                            const r = roles.find(r => r.id === rid)
                            return r ? (
                              <span key={rid} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ backgroundColor: r.color + '20', color: r.color }}>
                                {r.icon} {r.name}
                              </span>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        hasRole
                          ? 'bg-red-50 text-red-500 hover:bg-red-100'
                          : 'bg-[#0F172A] text-white hover:bg-slate-800'
                      }`}>
                      {hasRole ? 'Remove' : 'Assign'}
                    </button>
                  </div>
                )
              })}
            </div>
            <div className="p-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 text-center">
                Changes take effect immediately on next login
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
