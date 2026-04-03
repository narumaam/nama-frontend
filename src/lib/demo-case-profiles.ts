export type DemoDealCase = {
  slug: string;
  lead_id: number;
  guest_name: string;
  organization: string;
  priority: string;
  query: string;
  triage: {
    destination: string;
    duration_days: number;
    travelers_count: number;
    travel_dates: string;
    preferences: string[];
    style: string;
    confidence_score: number;
    suggested_reply: string;
    reasoning: string;
  };
  itinerary: {
    title: string;
    total_price: number;
    currency: string;
    agent_reasoning?: string;
    social_post?: {
      caption: string;
      hooks: string[];
      image_suggestions: string[];
    };
    days: Array<{
      day_number: number;
      title: string;
      narrative: string;
      blocks: Array<{
        type: string;
        title: string;
        description: string;
        price_gross: number;
        currency?: string;
      }>;
    }>;
  };
  finance: {
    quote_total: number;
    cost_total: number;
    gross_profit: number;
    margin_percent: number;
    deposit_due: number;
    status: string;
  };
  communications: {
    channel: string;
    latest_message: string;
    suggested_follow_up: string;
  };
  bidding: {
    vendor: string;
    status: string;
    note: string;
    options: Array<{
      vendor: string;
      net_rate: number;
      position: string;
      decision: string;
    }>;
  };
  capture: {
    website: string;
    whatsapp: string;
    email: string;
    phone: string;
    transcript: string[];
  };
};

export type DemoLeadProfileMeta = {
  owner: string;
  source: "Website" | "WhatsApp" | "Email" | "Phone";
  stage: "New" | "Qualified" | "Quoted" | "Follow Up" | "Won";
  fitScore: number;
  urgency: "High" | "Medium";
  sla: string;
  risk: string;
  nextAction: string;
  nextActionAt: string;
  contactLabel: string;
  lastTouch: string;
  company: string;
  email: string;
  phone: string;
  enrichment: {
    linkedin: string;
    instagram: string;
    facebook: string;
    publicWeb: string;
    summary: string;
    confidence: string;
  };
};

export const DEMO_LEAD_FALLBACK_MAP: Record<string, string> = {
  "1": "maldives-honeymoon",
  "2": "kerala-family",
  "3": "dubai-bleisure",
};

export const DEMO_DEAL_CASES: Record<string, DemoDealCase> = {
  "maldives-honeymoon": {
    slug: "maldives-honeymoon",
    lead_id: 1,
    guest_name: "Meera Nair",
    organization: "Nair Luxury Escapes",
    priority: "CRITICAL",
    query: "Hi NAMA! We want a honeymoon in Maldives — 6 nights, luxury overwater villa, private beach. Budget ₹5L for 2 people. Flexible on dates in April.",
    triage: {
      destination: "Maldives",
      duration_days: 6,
      travelers_count: 2,
      travel_dates: "Flexible in April 2026",
      preferences: ["Overwater villa", "Private beach dinner", "Spa", "Seaplane transfer"],
      style: "Luxury",
      confidence_score: 0.93,
      suggested_reply: "Perfect choice for a honeymoon. I have curated a 6-night Maldives plan with a luxury overwater villa, seaplane transfer, sunset cruise, and a private beach dinner. Shall I send the itinerary now?",
      reasoning: "Detected honeymoon intent, luxury preference, Maldives destination, and 2-traveler profile from the inbound request.",
    },
    itinerary: {
      title: "The Ultimate 6-Day Luxury Escape in Maldives",
      currency: "INR",
      total_price: 486000.0,
      agent_reasoning: "Selected a premium overwater villa stay, high-romance experiences, and private transfers to maximize conversion for a honeymoon segment.",
      social_post: {
        caption: "6 nights in the Maldives, zero stress, pure luxury. Overwater villa, floating breakfast, private beach dinner, and a sunset cruise curated by NAMA. #Maldives #LuxuryTravel #TravelWithNAMA",
        hooks: [
          "Would you say yes to this Maldives honeymoon?",
          "Your dream overwater villa is waiting.",
          "Luxury travel, autonomously planned.",
        ],
        image_suggestions: [
          "Overwater villa at sunset",
          "Floating breakfast on lagoon deck",
          "Private beach dinner under lanterns",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Arrival in Paradise",
          narrative: "Touch down in Malé and transition by seaplane to a luxury overwater villa for a slow first evening.",
          blocks: [
            { type: "TRANSFER", title: "Seaplane Transfer", description: "Shared luxury seaplane from Malé to the resort.", price_gross: 45000, currency: "INR" },
            { type: "HOTEL", title: "Soneva Jani Water Retreat", description: "1-bedroom overwater villa with private pool and lagoon slide.", price_gross: 214000, currency: "INR" },
            { type: "MEAL", title: "Romantic Welcome Dinner", description: "Chef-curated dinner by the lagoon deck.", price_gross: 12500, currency: "INR" },
          ],
        },
        {
          day_number: 2,
          title: "Spa and Sandbank",
          narrative: "Ease into island life with a private spa session and an exclusive sandbank brunch.",
          blocks: [
            { type: "ACTIVITY", title: "Couples Spa Ritual", description: "90-minute signature massage and aromatherapy ritual.", price_gross: 21000, currency: "INR" },
            { type: "ACTIVITY", title: "Private Sandbank Brunch", description: "Curated brunch setup on a secluded sandbank with butler service.", price_gross: 16000, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Lagoon Leisure",
          narrative: "A free-flow day with snorkeling, floating breakfast, and a golden-hour sunset cruise.",
          blocks: [
            { type: "MEAL", title: "Floating Breakfast", description: "Breakfast served in-villa pool with tropical fruit and champagne.", price_gross: 9000, currency: "INR" },
            { type: "ACTIVITY", title: "Sunset Dolphin Cruise", description: "Shared luxury yacht cruise with champagne service.", price_gross: 14500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 486000.0,
      cost_total: 391500.0,
      gross_profit: 94500.0,
      margin_percent: 19.44,
      deposit_due: 180000.0,
      status: "Deposit pending within 24 hours",
    },
    communications: {
      channel: "WHATSAPP",
      latest_message: "Client opened itinerary 3 times in the last 90 minutes.",
      suggested_follow_up: "Hi Meera, I’ve held the Maldives villa and private beach dinner window for the next 24 hours. Shall I lock it with the deposit link?",
    },
    bidding: {
      vendor: "Soneva Jani",
      status: "Counter accepted",
      note: "Negotiated honeymoon add-ons while protecting 19.4% margin.",
      options: [
        { vendor: "Soneva Jani", net_rate: 391500, position: "Primary", decision: "Best romance fit and strongest close probability" },
        { vendor: "Joali Maldives", net_rate: 428000, position: "Premium fallback", decision: "Beautiful alternative, but pushes quote above comfort band" },
        { vendor: "Ozen Reserve Bolifushi", net_rate: 404500, position: "Commercial fallback", decision: "Good value, slightly weaker honeymoon wow factor" },
      ],
    },
    capture: {
      website: "Landing page enquiry",
      whatsapp: "WhatsApp follow-up from the sales team",
      email: "Confirmation thread stored in CRM",
      phone: "Call transcript linked after discovery call",
      transcript: [
        "Sales: I’ve captured the honeymoon request and I’m moving it into CRM now.",
        "Client: Great, please keep the private dinner and seaplane transfer.",
        "Sales: Noted. The whole conversation stays attached to the deal card for the team.",
      ],
    },
  },
  "dubai-bleisure": {
    slug: "dubai-bleisure",
    lead_id: 3,
    guest_name: "Arjun Mehta",
    organization: "Velocity Corporate Travel",
    priority: "ATTENTION",
    query: "Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around ₹2L all-in.",
    triage: {
      destination: "Dubai",
      duration_days: 4,
      travelers_count: 1,
      travel_dates: "May 2026",
      preferences: ["Downtown hotel", "Airport transfers", "Desert safari", "Executive comfort"],
      style: "Premium",
      confidence_score: 0.89,
      suggested_reply: "I’ve prepared a 4-night Dubai business-leisure program with Downtown stay, seamless transfers, and one premium desert experience. Would you like the executive version or a softer leisure-heavy version?",
      reasoning: "Detected a blended business-plus-leisure pattern with mid-premium positioning and solo traveler profile.",
    },
    itinerary: {
      title: "4-Day Premium Business + Leisure in Dubai",
      currency: "INR",
      total_price: 212000.0,
      agent_reasoning: "Balanced executive convenience, central location, and one premium leisure block to support a high conversion corporate-bleisure pitch.",
      social_post: {
        caption: "Business in Dubai, but better. Meetings by day, skyline dining and a premium desert evening by night. #Dubai #Bleisure #TravelWithNAMA",
        hooks: [
          "Who said work trips can’t feel premium?",
          "Dubai, reimagined for the modern executive.",
          "Smart travel for high-performing teams.",
        ],
        image_suggestions: [
          "Downtown skyline evening view",
          "Executive hotel suite workspace",
          "Desert dinner setup at dusk",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Arrival and Downtown Check-in",
          narrative: "Private transfer to a centrally located premium hotel with an evening free for client dinner.",
          blocks: [
            { type: "TRANSFER", title: "Private DXB Transfer", description: "Chauffeur-driven airport transfer to Downtown Dubai.", price_gross: 4000, currency: "INR" },
            { type: "HOTEL", title: "Address Boulevard", description: "Executive room close to DIFC and Downtown meeting zones.", price_gross: 76000, currency: "INR" },
          ],
        },
        {
          day_number: 2,
          title: "Meetings and Skyline Dining",
          narrative: "Business through the day, capped with a skyline dinner and Burj views.",
          blocks: [
            { type: "MEAL", title: "Executive Dinner at At.mosphere", description: "Window table dinner with city skyline views.", price_gross: 13000, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Premium Desert Evening",
          narrative: "A curated premium desert experience with private transfer and gourmet setup.",
          blocks: [
            { type: "ACTIVITY", title: "Premium Desert Safari", description: "Private 4x4, sunset dune drive, and gourmet camp dinner.", price_gross: 18500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 212000.0,
      cost_total: 169500.0,
      gross_profit: 42500.0,
      margin_percent: 20.05,
      deposit_due: 85000.0,
      status: "Quote approved and ready to send",
    },
    communications: {
      channel: "EMAIL",
      latest_message: "Lead scoring has increased after response to premium options.",
      suggested_follow_up: "Hi Arjun, your Dubai executive itinerary is ready. I’ve included Downtown stay, airport transfers, and one premium desert evening. Shall I send the final quote PDF?",
    },
    bidding: {
      vendor: "Address Boulevard",
      status: "Rate held for 18 hours",
      note: "Secured executive rate with breakfast inclusion and flexible cancellation.",
      options: [
        { vendor: "Address Boulevard", net_rate: 169500, position: "Primary", decision: "Best downtown proximity with executive comfort" },
        { vendor: "JW Marriott Marquis", net_rate: 176000, position: "Fallback", decision: "Strong brand, but weaker airport-to-meeting convenience" },
        { vendor: "Sofitel Downtown", net_rate: 171250, position: "Fallback", decision: "Competitive but slightly softer premium perception" },
      ],
    },
    capture: {
      website: "Corporate enquiry form",
      whatsapp: "WhatsApp recap from client",
      email: "Executive email thread",
      phone: "Call notes synced from sales",
      transcript: [
        "Sales: I’ve captured the Dubai request from your email and WhatsApp recap.",
        "Client: Perfect, we need a premium business plus leisure balance.",
        "Sales: I’ll keep the transcript with the CRM record so the next handoff is seamless.",
      ],
    },
  },
  "kerala-family": {
    slug: "kerala-family",
    lead_id: 2,
    guest_name: "Sharma Family",
    organization: "BluePalm Holidays",
    priority: "CRITICAL",
    query: "Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about ₹1.2L total.",
    triage: {
      destination: "Kerala",
      duration_days: 5,
      travelers_count: 3,
      travel_dates: "June 2026",
      preferences: ["Munnar", "Houseboat", "Family-friendly", "Easy pacing"],
      style: "Comfort",
      confidence_score: 0.9,
      suggested_reply: "I’ve prepared a relaxed 5-day Kerala family itinerary with Munnar hills, a private Alleppey houseboat, and child-friendly pacing. Would you like the standard or upgraded resort option?",
      reasoning: "Detected a family segment, 5-day duration, and strong product anchors around Munnar and Alleppey.",
    },
    itinerary: {
      title: "5-Day Family Comfort Escape in Kerala",
      currency: "INR",
      total_price: 124000.0,
      agent_reasoning: "Built a low-friction family journey with comfortable transit times and one standout product moment on the houseboat.",
      social_post: {
        caption: "Tea gardens, misty mornings, and a private houseboat in Kerala. A soft-paced family trip built to feel effortless. #Kerala #FamilyTravel #TravelWithNAMA",
        hooks: [
          "What if family travel actually felt calm?",
          "Kerala, slowed down beautifully.",
          "A houseboat stay your child will remember forever.",
        ],
        image_suggestions: [
          "Munnar tea gardens at sunrise",
          "Private houseboat on Alleppey backwaters",
          "Family breakfast with hill view",
        ],
      },
      days: [
        {
          day_number: 1,
          title: "Cochin to Munnar",
          narrative: "Private transfer into the hills and check-in at a family-friendly tea valley resort.",
          blocks: [
            { type: "TRANSFER", title: "Private SUV Transfer", description: "Cochin to Munnar with one scenic tea stop.", price_gross: 6000, currency: "INR" },
            { type: "HOTEL", title: "Fragrant Nature Munnar", description: "Valley-view family suite with breakfast.", price_gross: 23500, currency: "INR" },
          ],
        },
        {
          day_number: 3,
          title: "Houseboat Highlight",
          narrative: "Transition to Alleppey for a private overnight houseboat experience with all meals.",
          blocks: [
            { type: "ACTIVITY", title: "Private Alleppey Houseboat", description: "Family-exclusive houseboat with meals and sunset cruise.", price_gross: 18500, currency: "INR" },
          ],
        },
      ],
    },
    finance: {
      quote_total: 124000.0,
      cost_total: 98750.0,
      gross_profit: 25250.0,
      margin_percent: 20.36,
      deposit_due: 45000.0,
      status: "Payment reminder queued",
    },
    communications: {
      channel: "WHATSAPP",
      latest_message: "Deposit reminder pending for 26 hours.",
      suggested_follow_up: "Hi Mr. Sharma, your Kerala family itinerary is still on hold. I can keep the Munnar suite and private houseboat for a few more hours if you’d like me to secure them now.",
    },
    bidding: {
      vendor: "Private Houseboat Operator",
      status: "Pending confirmation",
      note: "Alternate operator already staged in case primary vendor doesn’t respond.",
      options: [
        { vendor: "Private Houseboat Operator", net_rate: 98750, position: "Primary", decision: "Best pacing and family-fit narrative" },
        { vendor: "Lake & Palm Cruises", net_rate: 101500, position: "Fallback", decision: "Reliable, but lowers margin slightly" },
        { vendor: "Backwater Comfort Fleet", net_rate: 96000, position: "Backup", decision: "Cheaper option, but less premium family positioning" },
      ],
    },
    capture: {
      website: "Family holiday form",
      whatsapp: "WhatsApp family follow-up",
      email: "Email with dates and children count",
      phone: "Discovery call transcript",
      transcript: [
        "Sales: I’ve captured the Kerala family trip and attached the call notes to the lead.",
        "Client: We want it calm, simple, and easy for our child.",
        "Sales: Understood. The CRM now has the whole conversation and the houseboat preference.",
      ],
    },
  },
};

export const PRIMARY_DEMO_DEAL_CASE = DEMO_DEAL_CASES["maldives-honeymoon"];

export const DEMO_LEAD_PROFILE_META: Record<string, DemoLeadProfileMeta> = {
  "maldives-honeymoon": {
    owner: "Aisha Khan",
    source: "Website",
    stage: "Follow Up",
    fitScore: 94,
    urgency: "High",
    sla: "18 min to next touch",
    risk: "Deposit hold expires today",
    nextAction: "Deposit follow-up call",
    nextActionAt: "Today · 09:30",
    contactLabel: "High-intent honeymoon lead",
    lastTouch: "Viewed itinerary 3 times in 90 minutes",
    company: "Nair Luxury Escapes",
    email: "meera@nairluxury.com",
    phone: "+91 98765 11001",
    enrichment: {
      linkedin: "Luxury founder profile detected",
      instagram: "@meera.escapejournal",
      facebook: "Private profile with Maldives interest clusters",
      publicWeb: "Travel and lifestyle blog mentions honeymoon content",
      summary: "High-affinity luxury traveler with strong visual preference and premium-experience bias.",
      confidence: "91%",
    },
  },
  "dubai-bleisure": {
    owner: "Ravi Menon",
    source: "Phone",
    stage: "Quoted",
    fitScore: 88,
    urgency: "Medium",
    sla: "42 min to quote send",
    risk: "Corporate approver summary pending",
    nextAction: "Send executive quote PDF",
    nextActionAt: "Today · 11:00",
    contactLabel: "Corporate bleisure traveler",
    lastTouch: "Requested premium option set",
    company: "Velocity Corporate Travel",
    email: "arjun.mehta@velocitycorp.in",
    phone: "+91 98110 33003",
    enrichment: {
      linkedin: "Senior corporate decision-maker profile",
      instagram: "@arjun.globalroutes",
      facebook: "Sparse activity, mostly business travel check-ins",
      publicWeb: "Conference speaker references and executive travel footprint",
      summary: "Corporate traveler with premium efficiency preference and business-leisure blending pattern.",
      confidence: "88%",
    },
  },
  "kerala-family": {
    owner: "Farah Khan",
    source: "Email",
    stage: "Qualified",
    fitScore: 81,
    urgency: "High",
    sla: "1 hr to payment reminder",
    risk: "Fare tier may move if delayed",
    nextAction: "Payment reminder sequence",
    nextActionAt: "Today · 14:30",
    contactLabel: "Family pacing and budget case",
    lastTouch: "Asked for easier payment timing",
    company: "Sharma Family Travels",
    email: "booking@sharmafamilytravels.in",
    phone: "+91 98989 22002",
    enrichment: {
      linkedin: "Family business operator reference",
      instagram: "@sharmafamilyweekends",
      facebook: "Active family-travel planning groups detected",
      publicWeb: "Kid-friendly itinerary searches and Kerala interest signals",
      summary: "Value-conscious family planner with strong convenience and pacing sensitivity.",
      confidence: "84%",
    },
  },
};

export const DEMO_CASE_ASSIGNMENTS = [
  { lead: DEMO_DEAL_CASES["maldives-honeymoon"].guest_name, owner: "Aisha Khan", role: "Sales", note: "Primary luxury case assigned for quick quote turn-around." },
  { lead: DEMO_DEAL_CASES["dubai-bleisure"].guest_name, owner: "Nikhil", role: "Operations", note: "Executive premium case handed to itinerary operations." },
  { lead: DEMO_DEAL_CASES["kerala-family"].guest_name, owner: "Farah", role: "Finance", note: "Payment reminder and deposit monitoring." },
] as const;

export const DEMO_ITINERARY_WORKSPACE_CASE = DEMO_DEAL_CASES["dubai-bleisure"];
