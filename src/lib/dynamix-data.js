export const dynamixQuery = {
  destination: 'Bali',
  duration: '5 nights / 6 days',
  pax: '2 adults',
  startDate: '12 Jun 2026',
  endDate: '18 Jun 2026',
  packageType: 'Full package',
  travelerType: 'Couple',
}

export const dynamixWeather = {
  title: 'Weather for selected dates',
  summary: '27°-31°C, low rain probability, strong outdoor touring conditions.',
  salesHint: 'Best for sunset cruise, island day, and premium leisure positioning.',
}

export const dynamixAi = {
  trip: 'Suggested package type: Full package. This traveler mix and date range has the strongest close rate with a ready-to-sell Bali 5N holiday.',
  match: 'Best match because it balances conversion comfort, outdoor suitability, and straightforward inclusions.',
  itinerary: 'Keep one flexible day for upgrades and higher-conversion add-ons without making the package feel heavy.',
  pricing: 'Protect the per-person floor. Remove premium add-ons before reducing core sell price if the customer resists pricing.',
  send: 'Use a warm, confident message. Mention weather-friendly dates, per-person price, and a direct approval call to action.',
}

export const destinationCatalog = {
  Bali: {
    heroLabel: 'Island reset',
    heroSummary:
      'Seminyak, Ubud, and island-day combinations shaped for fast selling, strong visuals, and easy client understanding.',
    tripHighlights: ['Villa-ready stays', 'Beach + nature mix', 'Easy upsell moments'],
    trustNotes: ['Flexible hotel combinations', 'Strong visual sellability', 'Good for couples and families'],
    inclusions: [
      'Airport transfers',
      'Daily breakfast',
      'Core sightseeing',
      'On-ground support',
      'Optional premium add-ons',
    ],
    packages: [
      {
        slug: 'bali-sunset-reset',
        title: 'Bali Sunset Reset',
        summary:
          'Seminyak (3N) + Ubud (2N) with villa stay, transfers, breakfast, and the strongest close path for the selected dates and traveler profile.',
        price: 'Rs 64,000 per person',
        badges: ['Best Match', 'Full package', 'Couple', 'High conversion'],
      },
      {
        slug: 'bali-honeymoon-upgrade',
        title: 'Bali Honeymoon Upgrade',
        summary:
          'A more premium route with private transfers, romantic dinner add-on potential, and stronger margin headroom for upsell-led selling.',
        price: 'Rs 78,500 per person',
        badges: ['Higher Margin', 'Premium', 'Upsell ready'],
      },
      {
        slug: 'bali-land-flex',
        title: 'Bali Land Flex',
        summary:
          'Transfers, touring, and key experiences are packaged, but the hotel is left open so the agent can attach the preferred stay in the next step.',
        price: 'Rs 38,000 per person',
        badges: ['Land only', 'Hotel later', 'Flexible'],
      },
      {
        slug: 'bali-family-ease',
        title: 'Bali Family Ease',
        summary:
          'Nusa Dua + Ubud with easy transfers, lighter day pacing, breakfast, and a stronger fit for families travelling with one child.',
        price: 'Rs 57,500 per person',
        badges: ['Family-safe', 'Full package', 'Easy pacing'],
      },
      {
        slug: 'bali-celebration-escape',
        title: 'Bali Celebration Escape',
        summary:
          'Seminyak-led route with premium dinner moment, better optics, and stronger suitability for birthdays, anniversaries, or proposal-led trips.',
        price: 'Rs 81,000 per person',
        badges: ['Celebration', 'Premium', 'High conversion'],
      },
      {
        slug: 'bali-fast-close-flex',
        title: 'Bali Fast Close Flex',
        summary:
          'A quick-close option with confirmed land arrangements, core touring, and flexible hotel attachment for the agent to finish later.',
        price: 'Rs 42,500 per person',
        badges: ['Land only', 'Fast close', 'Flexible'],
      },
    ],
  },
  Dubai: {
    heroLabel: 'City + desert',
    heroSummary:
      'Downtown, marina, and desert-led combinations designed for quick confirmation, premium positioning, and strong family appeal.',
    tripHighlights: ['Fast close potential', 'Premium hotel optics', 'Great for guaranteed confirmations'],
    trustNotes: ['Easy to position by budget', 'Strong family demand', 'High upgrade headroom'],
    inclusions: [
      'Airport transfers',
      'Breakfast',
      'City highlights',
      'Support for visa-era planning',
      'Optional desert and cruise add-ons',
    ],
    packages: [
      {
        slug: 'dubai-city-lights',
        title: 'Dubai City Lights',
        summary:
          'Downtown stay, airport transfers, city tour, and a straightforward close path for a fast-moving Dubai requirement.',
        price: 'Rs 72,000 per person',
        badges: ['Best match', 'Full package', 'City classic'],
      },
      {
        slug: 'dubai-family-ease',
        title: 'Dubai Family Ease',
        summary:
          'Family-friendly Dubai route with smoother pacing, headline attractions, and stronger fit for parents travelling with a child.',
        price: 'Rs 68,500 per person',
        badges: ['Family-safe', 'Easy pacing', 'High conversion'],
      },
      {
        slug: 'dubai-premium-desert',
        title: 'Dubai Premium Desert',
        summary:
          'Premium hotel optics, private transfer upgrades, and margin room around desert and dinner-led upsells.',
        price: 'Rs 91,000 per person',
        badges: ['Premium', 'Higher margin', 'Upsell ready'],
      },
    ],
  },
  London: {
    heroLabel: 'Classic city',
    heroSummary:
      'Central London combinations meant for first-time Europe travellers who want clarity, comfort, and easy city-led sightseeing.',
    tripHighlights: ['First-time friendly', 'Strong city landmarks', 'Premium upsell room'],
    trustNotes: ['Simple city format', 'Predictable sightseeing value', 'Good for premium client briefs'],
    inclusions: [
      'Airport transfers',
      'Breakfast',
      'Central-city exploration',
      'Optional premium experiences',
      'Trip support',
    ],
    packages: [
      {
        slug: 'london-classic-discovery',
        title: 'London Classic Discovery',
        summary:
          'Central stay, airport transfers, London city highlights, and a straightforward close path for first-time UK travellers.',
        price: 'Rs 96,000 per person',
        badges: ['Best match', 'Full package', 'City classic'],
      },
      {
        slug: 'london-family-favourite',
        title: 'London Family Favourite',
        summary:
          'Family-friendly pace with key attractions, smoother transport planning, and stronger suitability for travellers with one child.',
        price: 'Rs 88,500 per person',
        badges: ['Family-safe', 'Easy pacing', 'High conversion'],
      },
      {
        slug: 'london-premium-week',
        title: 'London Premium Week',
        summary:
          'Premium stay optics, private transfer upgrades, and stronger margin room for a higher-spend city break.',
        price: 'Rs 1,18,000 per person',
        badges: ['Premium', 'Higher margin', 'Upsell ready'],
      },
    ],
  },
  Mauritius: {
    heroLabel: 'Beach resort',
    heroSummary:
      'Romantic and family resort-led structures built for easy storytelling, strong resort appeal, and higher-value leisure positioning.',
    tripHighlights: ['Resort-first experience', 'Great couple appeal', 'High visual conversion value'],
    trustNotes: ['Clean leisure format', 'Strong occasion travel fit', 'Simple resort-led selling'],
    inclusions: [
      'Airport transfers',
      'Breakfast and resort stay',
      'Island highlights',
      'Support during travel',
      'Optional catamaran or spa add-ons',
    ],
    packages: [
      {
        slug: 'mauritius-lagoon-escape',
        title: 'Mauritius Lagoon Escape',
        summary:
          'Beach resort stay, transfers, and a clean romantic holiday structure built for easy selling and stronger visual appeal.',
        price: 'Rs 1,12,000 per person',
        badges: ['Best match', 'Couple', 'Resort stay'],
      },
      {
        slug: 'mauritius-family-shores',
        title: 'Mauritius Family Shores',
        summary:
          'A softer-paced island plan with family-friendly resort comfort and lower-friction day movement.',
        price: 'Rs 1,04,500 per person',
        badges: ['Family-safe', 'Beach holiday', 'Easy pacing'],
      },
      {
        slug: 'mauritius-premium-sails',
        title: 'Mauritius Premium Sails',
        summary:
          'Premium island positioning with catamaran-day potential and higher occasion-led conversion value.',
        price: 'Rs 1,36,000 per person',
        badges: ['Premium', 'Celebration', 'High conversion'],
      },
    ],
  },
}

export const dynamixResults = destinationCatalog.Bali.packages

export function normalizeDestinationName(destination = '') {
  return Object.keys(destinationCatalog).find(
    (key) => key.toLowerCase() === String(destination).trim().toLowerCase()
  )
}

export function getDestinationPackageBundle(destination = '') {
  const normalizedDestination = normalizeDestinationName(destination)

  if (!normalizedDestination) {
    return {
      normalizedDestination: null,
      destinationDetails: null,
      packages: [],
    }
  }

  return {
    normalizedDestination,
    destinationDetails: destinationCatalog[normalizedDestination],
    packages: destinationCatalog[normalizedDestination].packages,
  }
}

export function getPackageBySlug(destination = '', slug = '') {
  const { normalizedDestination, packages } = getDestinationPackageBundle(destination)
  const selectedPackage = packages.find((item) => item.slug === slug) || null

  return {
    normalizedDestination,
    selectedPackage,
  }
}

export function getWeatherForDestination(destination = 'Bali') {
  const weatherMap = {
    Bali: {
      title: 'Weather for selected dates',
      summary: '27°-31°C, low rain probability, strong outdoor touring conditions.',
      salesHint: 'Best for sunset cruise, island day, and premium leisure positioning.',
    },
    Dubai: {
      title: 'Weather for selected dates',
      summary: '31°-37°C, dry conditions, best suited for evening-led and indoor-luxury planning.',
      salesHint: 'Position desert sunset, dinner cruise, and premium hotel leisure over daytime outdoor density.',
    },
    London: {
      title: 'Weather for selected dates',
      summary: '16°-23°C, mild city conditions, strong for walking routes and landmark-led touring.',
      salesHint: 'Lead with city discovery, smooth pacing, and optional premium evenings.',
    },
    Mauritius: {
      title: 'Weather for selected dates',
      summary: '23°-28°C, beach-friendly weather with good resort and lagoon-day positioning.',
      salesHint: 'Position resort time, lagoon activities, and celebration-led stays.',
    },
    Thailand: {
      title: 'Weather for selected dates',
      summary: '26°-32°C, mixed tropical showers possible, still strong for flexible island and city combinations.',
      salesHint: 'Keep one buffer day and lead with indoor spa, market, and evening cruise alternatives.',
    },
  }

  return weatherMap[destination] || dynamixWeather
}

export function getAiAssist(kind = 'trip', destination = 'Bali') {
  const destinationPrefix = destination ? `${destination}: ` : ''

  return {
    kind,
    message: `${destinationPrefix}${dynamixAi[kind] || dynamixAi.trip}`,
  }
}

export const builderItinerary = [
  {
    day: 'D1',
    title: 'Arrival and hotel check-in',
    summary: 'Airport pickup, hotel check-in, and a light first evening to keep the opening day easy.',
  },
  {
    day: 'D2',
    title: 'Core destination exploration',
    summary: 'A curated sightseeing day built around the strongest close path for this destination.',
  },
  {
    day: 'D3',
    title: 'Free day + optional experiences',
    summary: 'Kept open for premium add-ons, local experiences, or a lighter pacing block depending on the traveler profile.',
  },
  {
    day: 'D4',
    title: 'Signature experience day',
    summary: 'A high-intent excursion that gives the package stronger value perception and conversion comfort.',
  },
]

export function getBuilderItinerary(destination = 'Bali') {
  const itineraryMap = {
    Bali: [
      {
        day: 'D1',
        title: 'Arrival in Bali',
        summary: 'Airport pickup, hotel check-in, and evening leisure block to keep the first day light.',
      },
      {
        day: 'D2',
        title: 'Kintamani and Ubud exploration',
        summary: 'Classic Bali scenic day with coffee plantation stop and curated core sightseeing.',
      },
      {
        day: 'D3',
        title: 'Free day + optional experiences',
        summary: 'Kept open for spa, beach club, or premium add-ons depending on the customer profile.',
      },
      {
        day: 'D4',
        title: 'Nusa Penida experience',
        summary: 'High-intent day excursion that gives the package stronger value perception.',
      },
    ],
    Dubai: [
      {
        day: 'D1',
        title: 'Arrival in Dubai',
        summary: 'Airport transfer, hotel check-in, and an easy evening to settle into the city.',
      },
      {
        day: 'D2',
        title: 'Dubai city highlights',
        summary: 'Core Dubai landmarks and curated sightseeing with a pace designed for easy selling.',
      },
      {
        day: 'D3',
        title: 'Free day + optional upgrades',
        summary: 'Keep this open for shopping, premium dining, or hotel-led leisure depending on the customer profile.',
      },
      {
        day: 'D4',
        title: 'Desert or marina signature experience',
        summary: 'A decisive Dubai experience that strengthens value perception and helps the package close faster.',
      },
    ],
    London: [
      {
        day: 'D1',
        title: 'Arrival in London',
        summary: 'Airport transfer, check-in, and a light first evening to keep the travel day comfortable.',
      },
      {
        day: 'D2',
        title: 'Central London discovery',
        summary: 'A curated city day covering the strongest London highlights for first-time travelers.',
      },
      {
        day: 'D3',
        title: 'Flexible city day',
        summary: 'Hold space for shopping, museum time, or a premium optional depending on the trip profile.',
      },
      {
        day: 'D4',
        title: 'Signature London experience',
        summary: 'A high-value day that gives the package a stronger finish and more selling confidence.',
      },
    ],
    Mauritius: [
      {
        day: 'D1',
        title: 'Arrival in Mauritius',
        summary: 'Airport transfer, resort check-in, and a gentle first evening to settle into the island stay.',
      },
      {
        day: 'D2',
        title: 'Island highlights day',
        summary: 'A scenic day built around the strongest Mauritius close path for leisure travelers.',
      },
      {
        day: 'D3',
        title: 'Resort leisure + optional experiences',
        summary: 'Keep this open for catamaran, spa, or premium leisure depending on the customer profile.',
      },
      {
        day: 'D4',
        title: 'Signature lagoon experience',
        summary: 'A high-intent island day that increases trip value perception and strengthens conversion.',
      },
    ],
  }

  return itineraryMap[destination] || builderItinerary
}
