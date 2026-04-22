const STORAGE_KEY = 'nama_dynamix_workflow';

export function normalizeItineraryItems(items = []) {
  return items.map((item, index) => ({
    ...item,
    day: `D${index + 1}`,
  }));
}

export const defaultWorkflow = {
  searchId: null,
  query: {
    destination: 'Bali',
    duration: '5 nights / 6 days',
    pax: '2 adults',
    startDate: '2026-06-12',
    endDate: '2026-06-18',
    packageType: 'Full package',
    travelerType: 'Couple',
  },
  selectedHoliday: {
    id: null,
    slug: 'bali-sunset-reset',
    title: 'Bali Sunset Reset',
    price: 'Rs 1,28,000 per person',
  },
  quote: {
    customerEmail: 'aarav@example.com',
    customerWhatsapp: '+91 98765 43210',
    message: 'Hi Aarav, sharing your Bali Sunset Reset quote at Rs 1,28,000 per person.',
    selectedChannels: ['email', 'whatsapp'],
    status: 'draft',
    quoteId: null,
    sentAt: null,
  },
  itinerary: {
    items: [],
    source: 'classic',
  },
  meta: {
    persisted: false,
  },
  aiFlow: {
    enabled: false,
    categorySlug: null,
    categoryTitle: null,
    blueprint: null,
    composerMode: null,
    selectedModules: [],
  },
};

export function loadWorkflow() {
  if (typeof window === 'undefined') return defaultWorkflow;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultWorkflow;
    const parsed = JSON.parse(raw);
    return {
      ...defaultWorkflow,
      ...parsed,
      query: {
        ...defaultWorkflow.query,
        ...(parsed.query || {}),
      },
      selectedHoliday: {
        ...defaultWorkflow.selectedHoliday,
        ...(parsed.selectedHoliday || {}),
      },
      quote: {
        ...defaultWorkflow.quote,
        ...(parsed.quote || {}),
      },
      itinerary: {
        ...defaultWorkflow.itinerary,
        ...(parsed.itinerary || {}),
        items: normalizeItineraryItems(parsed.itinerary?.items || defaultWorkflow.itinerary.items),
      },
      meta: {
        ...defaultWorkflow.meta,
        ...(parsed.meta || {}),
      },
      aiFlow: {
        ...defaultWorkflow.aiFlow,
        ...(parsed.aiFlow || {}),
      },
    };
  } catch {
    return defaultWorkflow;
  }
}

export function saveWorkflow(nextState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}
