export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'] as const
export type Currency = typeof CURRENCIES[number]

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SGD: 'S$',
}

/** Default conversion rates FROM INR (i.e. 1 INR = x currency) */
export const DEFAULT_RATES: Record<string, number> = {
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0095,
  AED: 0.044,
  SGD: 0.016,
}

/**
 * Format an amount (stored in INR) in the target currency.
 * Uses live rates when provided, falls back to DEFAULT_RATES.
 */
export function formatCurrency(
  amountInINR: number,
  currency: Currency,
  rates: Record<string, number> = DEFAULT_RATES,
): string {
  const rate =
    currency === 'INR'
      ? 1
      : rates[currency] ?? DEFAULT_RATES[currency as keyof typeof DEFAULT_RATES] ?? 1
  const converted = amountInINR * rate
  const symbol = CURRENCY_SYMBOLS[currency] || ''

  if (currency === 'INR') {
    return `₹${converted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  return `${symbol}${converted.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}
