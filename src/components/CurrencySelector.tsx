'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useCurrency } from '@/lib/currency-context'
import { CURRENCIES, CURRENCY_SYMBOLS } from '@/lib/currency'

export default function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        title="Switch currency"
      >
        {CURRENCY_SYMBOLS[currency]}{currency}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          {/* Backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 min-w-[100px] overflow-hidden">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => { setCurrency(c); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${
                  c === currency ? 'text-emerald-400 font-bold' : 'text-slate-300'
                }`}
              >
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
