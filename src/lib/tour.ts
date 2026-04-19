// src/lib/tour.ts
// Lightweight custom product tour — no external packages required.

export interface TourStep {
  target: string; // CSS selector matching a data-tour="..." attribute
  title: string;
  body: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export const LEADS_TOUR: TourStep[] = [
  {
    target: '[data-tour="leads-header"]',
    title: 'Your Lead Pipeline',
    body: 'Every enquiry lands here. HOT leads need same-day response to maximise conversion.',
    position: 'bottom',
  },
  {
    target: '[data-tour="leads-filter"]',
    title: 'Smart Filters',
    body: 'Filter by temperature (HOT/WARM/COLD), status, or search by name — find any lead instantly.',
    position: 'bottom',
  },
  {
    target: '[data-tour="leads-ai-score"]',
    title: 'AI Lead Scoring',
    body: 'NAMA scores each lead 0–100 based on budget, destination, group size, and intent signals. Click the AI Score tab on any lead to see the full breakdown.',
    position: 'left',
  },
];

export const ITINERARY_TOUR: TourStep[] = [
  {
    target: '[data-tour="itinerary-generate"]',
    title: 'AI Itinerary Builder',
    body: 'Describe the trip in plain English — NAMA builds the full day-by-day plan in seconds, complete with flights, hotels, and activities.',
    position: 'bottom',
  },
  {
    target: '[data-tour="itinerary-rate"]',
    title: 'Rate Lookup',
    body: 'Select a vendor block and NAMA auto-fetches your contracted rate for that date — no more manual rate lookups.',
    position: 'right',
  },
];

export const TOUR_KEYS = {
  leads: 'nama_tour_leads_done',
  itinerary: 'nama_tour_itinerary_done',
} as const;

export function isTourDone(key: keyof typeof TOUR_KEYS): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(TOUR_KEYS[key]) === '1';
}

export function markTourDone(key: keyof typeof TOUR_KEYS): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOUR_KEYS[key], '1');
}
