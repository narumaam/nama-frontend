'use client'

/**
 * NAMA OS — Reusable Empty State
 * ────────────────────────────────
 * Drop into any list/table view when data is empty.
 * Supports an optional CTA button.
 */

import React from 'react'
import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-12 px-6' : 'py-20 px-8'}`}>
      {/* Icon container */}
      <div className={`rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5 ${compact ? 'w-14 h-14' : 'w-20 h-20'}`}>
        <Icon size={compact ? 22 : 32} className="text-slate-300" strokeWidth={1.5} />
      </div>

      {/* Text */}
      <h3 className={`font-black text-slate-700 mb-2 ${compact ? 'text-base' : 'text-lg'}`}>
        {title}
      </h3>
      <p className={`text-slate-400 font-medium max-w-xs leading-relaxed ${compact ? 'text-xs' : 'text-sm'}`}>
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className={`flex items-center gap-3 ${compact ? 'mt-5' : 'mt-7'}`}>
          {action && (
            <button
              onClick={action.onClick}
              className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="text-sm font-bold text-slate-500 px-5 py-2.5 rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
