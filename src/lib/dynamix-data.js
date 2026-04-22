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
    heroMedia: [
      {
        eyebrow: 'Stay lens',
        title: 'Villa-led relaxation',
        summary: 'Private pool villas, sunset-facing spaces, and softer pacing that keeps the trip feeling elevated.',
      },
      {
        eyebrow: 'Experience lens',
        title: 'Culture + coast',
        summary: 'Build around Ubud, beach clubs, and one signature island day instead of overloading every day.',
      },
    ],
    tripHighlights: ['Villa-ready stays', 'Beach + nature mix', 'Easy upsell moments'],
    trustNotes: ['Flexible hotel combinations', 'Strong visual sellability', 'Good for couples and families'],
    commercialNotes: [
      'Best sold as a 2-stay holiday with one flexible day left for add-ons.',
      'Works well for honeymoon, celebration, and premium leisure briefs.',
      'Land-only variants protect conversion if airfare resistance starts early.',
    ],
    inclusions: [
      'Airport transfers',
      'Daily breakfast',
      'Core sightseeing',
      'On-ground support',
      'Optional premium add-ons',
    ],
    exclusions: [
      'International airfare if land-only plan is chosen',
      'Visa, travel insurance, and personal spends',
      'Peak-date surcharge if supplier rates change',
    ],
    activityLibrary: [
      {
        slug: 'bali-beach-club',
        title: 'Beach club afternoon',
        timing: 'Afternoon',
        price: 'Rs 6,500 per person',
        summary: 'A relaxed afternoon with a premium beach-club setting and easy upsell optics.',
        tags: ['Upsell', 'Leisure'],
      },
      {
        slug: 'bali-float-breakfast',
        title: 'Floating breakfast',
        timing: 'Morning',
        price: 'Rs 4,200 per person',
        summary: 'Great for honeymoon or celebration positioning with strong visual value.',
        tags: ['Couple', 'Celebration'],
      },
      {
        slug: 'bali-spa-couple',
        title: 'Couple spa ritual',
        timing: 'Evening',
        price: 'Rs 5,800 per person',
        summary: 'A margin-safe premium add-on that keeps the day light and still feels indulgent.',
        tags: ['Premium', 'Relaxed'],
      },
      {
        slug: 'bali-cooking-class',
        title: 'Balinese cooking class',
        timing: 'Morning',
        price: 'Rs 3,600 per person',
        summary: 'Useful for culture-leaning travellers who want a participative local experience.',
        tags: ['Culture', 'Family'],
      },
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
    heroMedia: [
      {
        eyebrow: 'City lens',
        title: 'Downtown optics',
        summary: 'Lead with skyline, retail, and evening experiences so the trip feels premium without feeling tiring.',
      },
      {
        eyebrow: 'Experience lens',
        title: 'Desert + marina',
        summary: 'Anchor the plan around one signature desert or cruise experience and leave room for retail flexibility.',
      },
    ],
    tripHighlights: ['Fast close potential', 'Premium hotel optics', 'Great for guaranteed confirmations'],
    trustNotes: ['Easy to position by budget', 'Strong family demand', 'High upgrade headroom'],
    commercialNotes: [
      'Best for agents who need a quick, clearly priced package with visible upgrade room.',
      'Evening-led experiences usually close better than heavy daytime outdoor plans.',
      'Can split neatly into family-safe and premium variants without rebuilding the whole package.',
    ],
    inclusions: [
      'Airport transfers',
      'Breakfast',
      'City highlights',
      'Support for visa-era planning',
      'Optional desert and cruise add-ons',
    ],
    exclusions: [
      'Visa and insurance unless separately bundled',
      'Tourism dirham or hotel taxes where applicable',
      'Peak-event date surcharges and optional premium seating',
    ],
    activityLibrary: [
      {
        slug: 'dubai-desert-safari',
        title: 'Premium desert safari',
        timing: 'Evening',
        price: 'Rs 7,200 per person',
        summary: 'High-conversion signature add-on with dinner and entertainment optics.',
        tags: ['Signature', 'Popular'],
      },
      {
        slug: 'dubai-marina-cruise',
        title: 'Marina dinner cruise',
        timing: 'Evening',
        price: 'Rs 5,900 per person',
        summary: 'An easy upsell that adds premium feel without complicating logistics.',
        tags: ['Upsell', 'Couple'],
      },
      {
        slug: 'dubai-aquarium',
        title: 'Aquarium and underwater zoo',
        timing: 'Afternoon',
        price: 'Rs 4,100 per person',
        summary: 'Family-safe indoor experience that works well in hotter travel windows.',
        tags: ['Family', 'Indoor'],
      },
      {
        slug: 'dubai-frame',
        title: 'Dubai Frame visit',
        timing: 'Morning',
        price: 'Rs 2,400 per person',
        summary: 'Light-touch add-on for clients who want another landmark without overloading the day.',
        tags: ['City', 'Flexible'],
      },
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
    heroMedia: [
      {
        eyebrow: 'City lens',
        title: 'Landmark-first pace',
        summary: 'Keep movement simple, use one central stay, and make every day feel legible for the client.',
      },
      {
        eyebrow: 'Experience lens',
        title: 'Classic + premium evenings',
        summary: 'Blend essentials with one paid theatre or river experience for a stronger perceived package value.',
      },
    ],
    tripHighlights: ['First-time friendly', 'Strong city landmarks', 'Premium upsell room'],
    trustNotes: ['Simple city format', 'Predictable sightseeing value', 'Good for premium client briefs'],
    commercialNotes: [
      'Works best as a clean city stay rather than an overpacked multi-city Europe plan.',
      'Premium evening experiences create a stronger close than adding too many museums.',
      'First-time travellers respond well to central-stay clarity and airport-transfer certainty.',
    ],
    inclusions: [
      'Airport transfers',
      'Breakfast',
      'Central-city exploration',
      'Optional premium experiences',
      'Trip support',
    ],
    exclusions: [
      'UK visa and insurance unless separately packaged',
      'Premium attraction passes and West End upgrades',
      'Personal spends, intercity rail, and event-date surcharges',
    ],
    activityLibrary: [
      {
        slug: 'london-river-cruise',
        title: 'Thames evening cruise',
        timing: 'Evening',
        price: 'Rs 6,800 per person',
        summary: 'A strong premium add-on that adds wow value without changing hotel logistics.',
        tags: ['Premium', 'Evening'],
      },
      {
        slug: 'london-west-end',
        title: 'West End theatre night',
        timing: 'Night',
        price: 'Rs 8,900 per person',
        summary: 'Good for higher-budget travellers wanting one marquee city experience.',
        tags: ['Premium', 'Culture'],
      },
      {
        slug: 'london-harry-potter',
        title: 'Studio tour excursion',
        timing: 'Full day',
        price: 'Rs 7,500 per person',
        summary: 'A family-leaning add-on that can become the emotional anchor of the trip.',
        tags: ['Family', 'Popular'],
      },
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
    heroMedia: [
      {
        eyebrow: 'Resort lens',
        title: 'Slow luxury rhythm',
        summary: 'The strongest plans feel spacious, with resort time carrying more emotional weight than constant movement.',
      },
      {
        eyebrow: 'Experience lens',
        title: 'Lagoon and leisure',
        summary: 'Use catamaran, lagoon, and spa-led moments as selective upgrades instead of overbuilding excursions.',
      },
    ],
    tripHighlights: ['Resort-first experience', 'Great couple appeal', 'High visual conversion value'],
    trustNotes: ['Clean leisure format', 'Strong occasion travel fit', 'Simple resort-led selling'],
    commercialNotes: [
      'Great for anniversaries, honeymoon, and premium beach-holiday positioning.',
      'Resort differentiation matters more than piling on multiple day tours.',
      'One signature lagoon or catamaran day is usually enough to lift perceived value.',
    ],
    inclusions: [
      'Airport transfers',
      'Breakfast and resort stay',
      'Island highlights',
      'Support during travel',
      'Optional catamaran or spa add-ons',
    ],
    exclusions: [
      'International airfare where not explicitly packaged',
      'Travel insurance, optional watersports, and spa spends',
      'Peak festive supplements and room-category upgrades',
    ],
    activityLibrary: [
      {
        slug: 'mauritius-catamaran',
        title: 'Catamaran lagoon day',
        timing: 'Full day',
        price: 'Rs 8,200 per person',
        summary: 'A premium signature day that instantly lifts the package story.',
        tags: ['Signature', 'Premium'],
      },
      {
        slug: 'mauritius-spa',
        title: 'Resort spa ritual',
        timing: 'Evening',
        price: 'Rs 5,700 per person',
        summary: 'Useful for celebration stays and higher-margin resort-led selling.',
        tags: ['Relaxed', 'Celebration'],
      },
      {
        slug: 'mauritius-south-tour',
        title: 'South island discovery',
        timing: 'Daytime',
        price: 'Rs 4,900 per person',
        summary: 'Adds a sightseeing layer for travellers who want a little more movement than pure resort time.',
        tags: ['Explore', 'Flexible'],
      },
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
  Singapore: {
    heroLabel: 'City + cruise',
    heroSummary:
      'Cruise, skyline, attractions, and city-smooth logistics shaped for family travel, first-time Asia trips, and high-clarity selling.',
    heroMedia: [
      {
        eyebrow: 'City lens',
        title: 'Marina Bay energy',
        summary: 'The strongest itineraries balance iconic skyline moments, light evening experiences, and smooth city movement.',
      },
      {
        eyebrow: 'Trip lens',
        title: 'Cruise + city combo',
        summary: 'Combining a short Singapore cruise with city highlights gives the holiday stronger value perception without feeling overpacked.',
      },
    ],
    tripHighlights: ['Cruise + city twin-stay story', 'Family-safe attractions', 'Easy premium upgrades'],
    trustNotes: ['Very strong for first-time Singapore travellers', 'Works well for families and mixed-age groups', 'Easy to explain and easy to close'],
    commercialNotes: [
      'Cruise-plus-city is easier to position than a pure city stay when the traveller wants more holiday feel.',
      'Night attractions, Sentosa, and Gardens by the Bay add visual value without creating heavy logistics.',
      'A leisure day plus optional add-ons helps keep the package customizable and margin-safe.',
    ],
    inclusions: [
      'Airport transfers',
      'Cruise stay and city stay',
      'Shared attraction transfers where applicable',
      'Core city experiences',
      'On-trip support',
    ],
    exclusions: [
      'Airfare unless bundled in the selected package',
      'Visa, travel insurance, and personal expenses',
      'Optional attraction upgrades and peak-date surcharges',
    ],
    activityLibrary: [
      {
        slug: 'singapore-river-cruise',
        title: 'Singapore river cruise',
        timing: 'Evening',
        price: 'Rs 3,800 per person',
        summary: 'Adds a relaxed skyline experience and works especially well for first-time city visitors.',
        tags: ['City classic', 'Evening'],
      },
      {
        slug: 'singapore-sea-aquarium',
        title: 'S.E.A. Aquarium visit',
        timing: 'Afternoon',
        price: 'Rs 4,900 per person',
        summary: 'A family-safe add-on that is easy to place alongside Sentosa experiences.',
        tags: ['Family', 'Indoor'],
      },
      {
        slug: 'singapore-jewel-changi',
        title: 'Jewel Changi experience',
        timing: 'Morning',
        price: 'Rs 2,600 per person',
        summary: 'A light but memorable city add-on that improves the arrival or departure-day story.',
        tags: ['Flexible', 'Photo moment'],
      },
      {
        slug: 'singapore-skypark',
        title: 'Observation deck evening',
        timing: 'Night',
        price: 'Rs 5,700 per person',
        summary: 'A premium skyline add-on that upgrades the trip story without making the day heavier.',
        tags: ['Premium', 'Skyline'],
      },
    ],
    packages: [
      {
        slug: 'singapore-cruise-city',
        title: 'Singapore Cruise and City',
        summary:
          'A 6-night holiday combining a short Singapore cruise with a city stay, marquee attractions, and easy shared-transfer logistics for a clean family-friendly close.',
        price: 'Rs 86,500 per person',
        badges: ['Best match', 'Cruise + city', 'Family-safe'],
      },
      {
        slug: 'singapore-sentosa-family',
        title: 'Singapore Sentosa Family',
        summary:
          'A family-led city plan with Sentosa, Universal Studios, skyline moments, and pacing that works well with one leisure day.',
        price: 'Rs 79,000 per person',
        badges: ['Family-safe', 'Full package', 'Easy pacing'],
      },
      {
        slug: 'singapore-premium-skyline',
        title: 'Singapore Premium Skyline',
        summary:
          'A more elevated city itinerary with stronger hotel optics, skyline experiences, and higher-margin add-on room.',
        price: 'Rs 97,500 per person',
        badges: ['Premium', 'Higher margin', 'City classic'],
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
    Singapore: [
      {
        day: 'D1',
        title: 'Arrival in Singapore and cruise boarding',
        summary: 'Arrive in Singapore, complete transfers smoothly, and begin the holiday with an easy check-in and first-evening unwind.',
      },
      {
        day: 'D2',
        title: 'Cruise leisure day',
        summary: 'Keep the day open for deck leisure, onboard entertainment, and a lighter luxury rhythm before the city stay begins.',
      },
      {
        day: 'D3',
        title: 'Transfer to Singapore city and Night Safari',
        summary: 'Move into the city stay cleanly and use the evening for a signature Singapore wildlife experience.',
      },
      {
        day: 'D4',
        title: 'City tour and Gardens by the Bay',
        summary: 'A clear landmark day that helps first-time travellers feel they have truly done Singapore well.',
      },
      {
        day: 'D5',
        title: 'Universal Studios Singapore',
        summary: 'The strongest family anchor day and one of the easiest conversion moments in a Singapore package.',
      },
      {
        day: 'D6',
        title: 'Leisure morning and Sentosa evening',
        summary: 'Hold part of the day flexible, then close with a high-visual Sentosa experience and evening show.',
      },
      {
        day: 'D7',
        title: 'Leisure window and departure',
        summary: 'Leave space for light shopping or one optional activity before the airport transfer and flight home.',
      },
    ],
  }

  return itineraryMap[destination] || builderItinerary
}

export function getActivityLibrary(destination = 'Bali') {
  const normalizedDestination = normalizeDestinationName(destination)
  if (!normalizedDestination) return []
  return destinationCatalog[normalizedDestination].activityLibrary || []
}
