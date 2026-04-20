// Detect user's currency based on their location
// Uses Vercel's built-in geolocation headers when available,
// falls back to INR for local dev

export type PricingCurrency = 'INR' | 'USD'

export async function detectPricingCurrency(): Promise<PricingCurrency> {
  // In Next.js App Router, we can call our own API to get the Vercel geo header
  try {
    const res = await fetch('/api/geo-currency', { cache: 'force-cache' })
    if (res.ok) {
      const data = await res.json()
      return data.currency as PricingCurrency
    }
  } catch {
    // fall through to default
  }
  return 'INR' // default to INR
}

export function formatPlanPrice(
  plan: { price_monthly: number; price_monthly_usd?: number | null; price_yearly: number; price_yearly_usd?: number | null },
  currency: PricingCurrency,
  cycle: 'monthly' | 'yearly'
): string {
  if (currency === 'USD') {
    const price = cycle === 'monthly' ? plan.price_monthly_usd : plan.price_yearly_usd
    return price != null ? `$${price.toLocaleString()}` : formatPlanPrice(plan, 'INR', cycle)
  }
  const price = cycle === 'monthly' ? plan.price_monthly : plan.price_yearly
  return `₹${price.toLocaleString('en-IN')}`
}

export function getCurrencyLabel(currency: PricingCurrency): string {
  return currency === 'USD' ? 'Prices in $ USD' : 'Prices in ₹ INR'
}
