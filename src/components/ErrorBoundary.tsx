'use client'

/**
 * NAMA OS — React Error Boundary
 * ─────────────────────────────────
 * Catches unhandled React render errors and shows a graceful fallback
 * instead of a full white-screen crash. Wraps each dashboard module.
 *
 * Usage:
 *   <ErrorBoundary module="Leads">
 *     <LeadsPage />
 *   </ErrorBoundary>
 */

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  module?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })
    // In production: send to Sentry / Datadog
    // Sentry.captureException(error, { extra: errorInfo })
    console.error(`[NAMA ErrorBoundary] ${this.props.module || 'Module'} crashed:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-6">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="text-xl font-black text-slate-800 mb-2">
            {this.props.module ? `${this.props.module} ran into a problem` : 'Something went wrong'}
          </h2>
          <p className="text-sm text-slate-500 font-medium max-w-sm mb-6">
            An unexpected error occurred. Your data is safe — this is a display issue only.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="text-left bg-slate-900 text-red-300 text-xs font-mono p-4 rounded-xl mb-6 max-w-lg w-full overflow-auto max-h-40">
              <p className="font-bold text-red-400 mb-1">{this.state.error.name}: {this.state.error.message}</p>
              <pre className="whitespace-pre-wrap text-slate-400 text-[10px]">
                {this.state.errorInfo?.componentStack?.slice(0, 400)}
              </pre>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 bg-[#0F172A] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95"
            >
              <RefreshCw size={14} />
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-sm font-bold text-slate-500 px-5 py-2.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
