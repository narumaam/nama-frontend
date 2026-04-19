'use client'
import { useAuth } from './auth-context'

// Role-based default permissions — mirrors SEED_ROLES in roles/page.tsx
// Used for instant client-side checks without an API call.
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  R0_NAMA_OWNER:   ['*'],  // wildcard — all permissions
  R1_SUPER_ADMIN:  ['*'],
  R2_ORG_ADMIN:    [
    'clients:view_all','clients:create','clients:edit','clients:delete','clients:export',
    'leads:view_all','leads:export','bookings:view_all','bookings:export',
    'reports:view_company','reports:export','finance:export',
  ],
  R3_SALES_MANAGER: [
    'clients:view_all','clients:create','clients:edit','clients:export',
    'leads:view_all','leads:export','bookings:view_all',
    'reports:view_team','reports:export',
  ],
  R4_OPS_EXECUTIVE: [
    'clients:view_all','clients:create','clients:edit',
    'leads:view_all','bookings:view_all','bookings:create','bookings:edit',
  ],
  R5_FINANCE_ADMIN: [
    'clients:view_all','clients:export',
    'finance:view_full','finance:export','reports:view_company',
  ],
  R6_SUB_AGENT: [
    'clients:view_all','leads:view_own','bookings:view_own',
  ],
  R7_CLIENT_PORTAL: [],
}

/**
 * Check if the current user has a specific permission.
 * Checks local role defaults first (instant), no API call needed.
 * Returns true for demo mode users (R3_SALES_MANAGER defaults).
 */
export function usePermission(module: string, action: string): boolean {
  const { user } = useAuth()
  const role = user?.role || 'R6_SUB_AGENT'
  const perms = ROLE_PERMISSION_MAP[role] || []
  if (perms.includes('*')) return true
  return perms.includes(`${module}:${action}`)
}

/**
 * Synchronous check — use when you can't use hooks (e.g. in callbacks).
 */
export function hasPermission(role: string, module: string, action: string): boolean {
  const perms = ROLE_PERMISSION_MAP[role] || []
  if (perms.includes('*')) return true
  return perms.includes(`${module}:${action}`)
}
