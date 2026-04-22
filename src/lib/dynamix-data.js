export const dynamixQuery = {
  destination: 'Bali',
  duration: '5 nights / 6 days',
  pax: '2 adults',
  startDate: '12 Jun 2026',
  endDate: '18 Jun 2026',
  packageType: 'Full package',
  travelerType: 'Couple',
};

export const dynamixWeather = {
  title: 'Weather for selected dates',
  summary: '27°-31°C, low rain probability, strong outdoor touring conditions.',
  salesHint: 'Best for sunset cruise, island day, and premium leisure positioning.',
};

export const dynamixAi = {
  trip: 'Suggested package type: Full package. This traveler mix and date range has the strongest close rate with a ready-to-sell Bali 5N holiday.',
  match: 'Best match because it balances conversion comfort, outdoor suitability, and straightforward inclusions.',
  itinerary: 'Keep Nusa Penida and the free day flexible. These dates favor outdoor experiences and sunset-led upsells.',
  pricing: 'Protect the per-person floor. Remove premium add-ons before reducing core sell price if the customer resists pricing.',
  send: 'Use a warm, confident message. Mention weather-friendly dates, per-person price, and a direct approval call to action.',
};

export const dynamixResults = [
  {
    slug: 'bali-sunset-reset',
    title: 'Bali Sunset Reset',
    summary: 'Seminyak (3N) + Ubud (2N) with villa stay, transfers, breakfast, and the strongest close path for the selected dates and traveler profile.',
    price: 'Rs 64,000 per person',
    badges: ['Best Match', 'Full package', 'Couple', 'High conversion'],
  },
  {
    slug: 'bali-honeymoon-upgrade',
    title: 'Bali Honeymoon Upgrade',
    summary: 'A more premium route with private transfers, romantic dinner add-on potential, and stronger margin headroom for upsell-led selling.',
    price: 'Rs 78,500 per person',
    badges: ['Higher Margin', 'Premium', 'Upsell ready'],
  },
  {
    slug: 'bali-land-flex',
    title: 'Bali Land Flex',
    summary: 'Transfers, touring, and key experiences are packaged, but the hotel is left open so the agent can attach the preferred stay in the next step.',
    price: 'Rs 38,000 per person',
    badges: ['Land only', 'Hotel later', 'Flexible'],
  },
];

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
    Thailand: {
      title: 'Weather for selected dates',
      summary: '26°-32°C, mixed tropical showers possible, still strong for flexible island and city combinations.',
      salesHint: 'Keep one buffer day and lead with indoor spa, market, and evening cruise alternatives.',
    },
  };

  return weatherMap[destination] || dynamixWeather;
}

export function getAiAssist(kind = 'trip', destination = 'Bali') {
  const destinationPrefix = destination ? `${destination}: ` : '';

  return {
    kind,
    message: `${destinationPrefix}${dynamixAi[kind] || dynamixAi.trip}`,
  };
}

export const builderItinerary = [
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
];
