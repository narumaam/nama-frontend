'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Currency, DEFAULT_RATES, formatCurrency } from './currency'

interface CurrencyContextType {
  currency: Currency
  setCurrency: (c: Currency) => void
  rates: Record<string, number>
  formatAmount: (amountInINR: number) => string
  loading: boolean
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: 'INR',
  setCurrency: () => {},
  rates: DEFAULT_RATES,
  formatAmount: (a) => `₹${a.toLocaleString()}`,
  loading: false,
})

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR')
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_RATES)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Restore saved currency preference
    try {
      const saved = localStorage.getItem('nama_currency') as Currency | null
      if (saved) setCurrencyState(saved)
    } catch {}

    // Fetch live FX rates from backend (cached 1hr)
    setLoading(true)
    fetch('/api/v1/settings/fx-rates')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.rates && typeof data.rates === 'object') {
          setRates(data.rates)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const setCurrency = (c: Currency) => {
    setCurrencyState(c)
    try {
      localStorage.setItem('nama_currency', c)
    } catch {}
  }

  const formatAmount = (amountInINR: number) =>
    formatCurrency(amountInINR, currency, rates)

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, formatAmount, loading }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
