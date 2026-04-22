export const dynamixAiPrinciples = [
  {
    title: 'Category-first intelligence',
    summary: 'AI should start from travel intent categories like reset, celebration, family bonding, or premium escape, not from static destination inventory.',
    detail: 'This lets NAMA shape the commercial story before it shapes the package.'
  },
  {
    title: 'Commercial co-pilot',
    summary: 'AI should recommend the best close path, margin-safe configuration, and upsell sequence for an agent, not just build a prettier itinerary.',
    detail: 'The goal is faster sell-through, not only faster planning.'
  },
  {
    title: 'Dynamic packaging brain',
    summary: 'AI should assemble the right holiday blocks, risk flags, tone, and category fit in one pass so agents spend less time manually stitching trips together.',
    detail: 'This is where Dynamix becomes category-first instead of search-first.'
  },
]

export const categoryOptions = [
  {
    slug: 'reset-retreat',
    title: 'Reset Retreat',
    signal: 'For overworked couples and premium calm seekers',
    outputs: ['slower pace', 'wellness add-ons', 'sunset-led evenings'],
  },
  {
    slug: 'family-memory-maker',
    title: 'Family Memory Maker',
    signal: 'For parents who need easy wins and child-safe pacing',
    outputs: ['kid-safe routing', 'buffer windows', 'high-conversion inclusions'],
  },
  {
    slug: 'celebration-escape',
    title: 'Celebration Escape',
    signal: 'For birthdays, anniversaries, proposals, and emotional triggers',
    outputs: ['wow moments', 'premium optics', 'higher margin headroom'],
  },
  {
    slug: 'flexi-land-hack',
    title: 'Flexi Land Hack',
    signal: 'For agents who want land-only speed with hotel freedom',
    outputs: ['fast quoting', 'hotel left open', 'price elasticity'],
  },
]

export const aiBlueprint = {
  primaryCategory: 'Reset Retreat',
  idealDestination: 'Bali',
  confidence: '94%',
  reasons: [
    'Travel dates fit outdoor, sunset, and wellness positioning',
    'Couple profile supports a slower, premium story',
    'This category protects markup better than a generic Bali classic',
  ],
  commercialSignals: [
    'Lead with villa + spa optics',
    'Hold one optional day for premium upsells',
    'Keep the price story anchored per person with lifestyle language',
  ],
}

export const aiComposer = {
  itineraryMode: 'AI Modular Build',
  modules: [
    { label: 'Arrival decompression', status: 'Selected', summary: 'Light-touch arrival, private transfer upgrade recommended.' },
    { label: 'Core scenic day', status: 'Selected', summary: 'Kintamani + curated scenic route for early trust.' },
    { label: 'Wellness / slow day', status: 'Suggested', summary: 'Protects category identity and opens spa margin.' },
    { label: 'Signature wow moment', status: 'Selected', summary: 'Sunset cruise or beach club close moment for sales value.' },
  ],
  pricingAdvice: 'Do not reduce base sell price first. Hold category value and swap modules before discounting.',
  salesNarrative: 'Sell this as a reset holiday, not a Bali commodity. The category story is the differentiator.',
}

export const aiCategoryPlaybooks = {
  'reset-retreat': {
    resultBias: ['bali-sunset-reset', 'bali-honeymoon-upgrade', 'bali-land-flex'],
    markupSuggestion: 'Rs 16,800 per person',
    pricingAdvice: 'Hold a calm-premium price posture. Replace luxury extras before cutting the core reset story.',
    sendMessage: 'Hi Aarav, sharing your Reset Retreat holiday for Bali. I have shaped this around slower pacing, stronger stay optics, and a more premium couple-friendly rhythm.',
    approvalTone: 'This holiday has been shaped for slower pacing, stronger room quality, and a more premium reset feel from arrival to the final evening.',
    approvalAdvance: 'Rs 42,000',
    itinerary: [
      { day: 'D1', title: 'Arrival + decompression', summary: 'Private arrival feel, quick check-in, and a low-friction first evening to establish the reset tone.' },
      { day: 'D2', title: 'Scenic Bali day', summary: 'Curated scenic route with enough movement to feel rewarding, but not rushed.' },
      { day: 'D3', title: 'Wellness / leisure block', summary: 'Flexible spa, pool, or beach club rhythm to maintain category identity.' },
      { day: 'D4', title: 'Signature sunset moment', summary: 'A high-emotion close point like sunset cruise or premium beach dinner.' },
    ],
  },
  'family-memory-maker': {
    resultBias: ['bali-sunset-reset', 'bali-land-flex', 'bali-honeymoon-upgrade'],
    markupSuggestion: 'Rs 12,400 per person',
    pricingAdvice: 'Protect the family convenience value. Keep inclusions simple and child-safe instead of adding premium complexity.',
    sendMessage: 'Hi Aarav, sharing your Family Memory Maker holiday for Bali. This one is designed around easier movement, buffer windows, and stronger family-friendly comfort.',
    approvalTone: 'This holiday has been shaped to keep the family experience smooth, easy to manage, and high on shared moments without overloading the trip.',
    approvalAdvance: 'Rs 30,000',
    itinerary: [
      { day: 'D1', title: 'Arrival + easy settle-in', summary: 'Smooth airport transfer and a light first evening so children and parents settle without fatigue.' },
      { day: 'D2', title: 'Core sightseeing day', summary: 'One major sightseeing day with child-safe pace and predictable timing.' },
      { day: 'D3', title: 'Buffer + fun activity day', summary: 'Flexible family activity slot for water play, market time, or hotel leisure.' },
      { day: 'D4', title: 'Memory-maker experience', summary: 'A signature family experience that photographs well and feels worth the trip.' },
    ],
  },
  'celebration-escape': {
    resultBias: ['bali-honeymoon-upgrade', 'bali-sunset-reset', 'bali-land-flex'],
    markupSuggestion: 'Rs 19,600 per person',
    pricingAdvice: 'Protect wow-factor pricing. Celebration trips convert on emotion and optics more than bargain compression.',
    sendMessage: 'Hi Aarav, sharing your Celebration Escape holiday for Bali. I have positioned this around wow moments, premium optics, and stronger celebration value.',
    approvalTone: 'This holiday is designed around stronger celebration moments, elevated optics, and a final experience that feels truly occasion-worthy.',
    approvalAdvance: 'Rs 48,000',
    itinerary: [
      { day: 'D1', title: 'Arrival + celebration setup', summary: 'Arrival transfer and room styling or premium welcome moment to set the tone.' },
      { day: 'D2', title: 'Premium scenic experience', summary: 'A high-visual day that feels elevated and worth sharing.' },
      { day: 'D3', title: 'Open day for styling', summary: 'Hold space for proposal, cake, dinner, photo moment, or premium surprise.' },
      { day: 'D4', title: 'Signature celebration close', summary: 'Sunset dinner, cruise, or a standout final-night memory anchor.' },
    ],
  },
  'flexi-land-hack': {
    resultBias: ['bali-land-flex', 'bali-sunset-reset', 'bali-honeymoon-upgrade'],
    markupSuggestion: 'Rs 8,500 per person',
    pricingAdvice: 'Lead with flexibility and speed. Keep hotel outside the core quote and preserve margin through land efficiency.',
    sendMessage: 'Hi Aarav, sharing your Flexi Land Hack holiday for Bali. This version keeps the land package fast and flexible while leaving hotel choice open.',
    approvalTone: 'This holiday keeps the land package agile and efficient while preserving freedom to attach the final hotel choice later.',
    approvalAdvance: 'Rs 20,000',
    itinerary: [
      { day: 'D1', title: 'Arrival transfer + check-in support', summary: 'Land-only arrival structure with hotel flexibility preserved.' },
      { day: 'D2', title: 'Core destination day', summary: 'Strong sightseeing anchor so the land package still feels complete.' },
      { day: 'D3', title: 'Open inventory day', summary: 'Keep this modular so the final stay choice can shape the day later.' },
      { day: 'D4', title: 'Signature land experience', summary: 'One decisive excursion that keeps the quote compelling even without hotel bundled.' },
    ],
  },
}

export function getAiPlaybook(categorySlug) {
  return aiCategoryPlaybooks[categorySlug] || aiCategoryPlaybooks['reset-retreat']
}

export function rankResultsForCategory(results = [], categorySlug) {
  const playbook = getAiPlaybook(categorySlug)
  const bias = playbook.resultBias || []

  return [...results].sort((a, b) => {
    const aIndex = bias.indexOf(a.slug)
    const bIndex = bias.indexOf(b.slug)
    const normalizedA = aIndex === -1 ? 999 : aIndex
    const normalizedB = bIndex === -1 ? 999 : bIndex
    return normalizedA - normalizedB
  })
}
