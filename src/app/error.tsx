'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[NAMA OS] Unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans px-6">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={24} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-black text-[#0F172A] mb-3 tracking-tight">Something went wrong</h2>
        <p className="text-slate-500 font-medium text-sm leading-relaxed mb-8">
          An unexpected error occurred. Our team has been notified.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs text-slate-400">Ref: {error.digest}</span>
          )}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#0F172A] text-white font-bold text-sm px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} /> Try again
          </button>
          <Link
            href="/dashboard"
            className="text-slate-500 hover:text-slate-700 font-bold text-sm px-5 py-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
