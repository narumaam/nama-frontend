export type DemoCaseRoute = {
  slug: string;
  leadId: number;
  guest: string;
  caseName: string;
  destination: string;
  priority: "CRITICAL" | "ATTENTION" | "INFO";
  query: string;
  quoteTotal: number;
  financeStatus: string;
  paymentState: string;
  depositDue: number;
  collectionOwner: string;
  collectionRisk: "High" | "Medium" | "Watch";
  collectionNote: string;
  autopilotHeadline: string;
  autopilotSubtext: string;
  autopilotCta: string;
  autopilotCtaType: "call" | "payment" | "approve" | "review";
  autopilotConfidence: number;
  autopilotAgo: string;
  intakeChannel: "Website" | "Phone" | "Email" | "WhatsApp";
  intakeSource: string;
  intakeTone: string;
  intakeNote: string;
};

export const DEMO_CASE_ROUTES: DemoCaseRoute[] = [
  {
    slug: "maldives-honeymoon",
    leadId: 1,
    guest: "Meera Nair",
    caseName: "Maldives honeymoon",
    destination: "Maldives",
    priority: "CRITICAL",
    query:
      "Hi NAMA! We want a honeymoon in Maldives - 6 nights, luxury overwater villa, private beach. Budget Rs5L for 2 people. Flexible on dates in April.",
    quoteTotal: 486000,
    financeStatus: "Deposit pending within 24 hours",
    paymentState: "Awaiting hold confirmation",
    depositDue: 180000,
    collectionOwner: "Meera Shah",
    collectionRisk: "High",
    collectionNote:
      "Deposit timing is the priority finance talking point because it controls whether the case can move cleanly into execution.",
    autopilotHeadline:
      "Website enquiry captured and staged for the quote-to-close walkthrough.",
    autopilotSubtext:
      "Use this card to open the deal view, then show triage, itinerary, finance, and the CRM transcript in one flow.",
    autopilotCta: "Open Deal",
    autopilotCtaType: "call",
    autopilotConfidence: 91,
    autopilotAgo: "Just now",
    intakeChannel: "Website",
    intakeSource: "Public enquiry form",
    intakeTone: "High intent",
    intakeNote: "Luxury demand lands in CRM with urgency and intent already visible to sales.",
  },
  {
    slug: "kerala-family",
    leadId: 2,
    guest: "Sharma Family",
    caseName: "Kerala family trip",
    destination: "Kerala",
    priority: "CRITICAL",
    query:
      "Need a Kerala family trip for 5 days in June for 2 adults and 1 child. Want Munnar, Alleppey houseboat, and easy pacing. Budget about Rs1.2L total.",
    quoteTotal: 124000,
    financeStatus: "Payment reminder queued",
    paymentState: "Deposit reminder stage",
    depositDue: 45000,
    collectionOwner: "Farah Khan",
    collectionRisk: "Watch",
    collectionNote:
      "This case needs softer reminder timing without losing visibility on fare movement and payment intent.",
    autopilotHeadline:
      "Email-captured family request is staged with pacing, houseboat, and reminder context.",
    autopilotSubtext:
      "This is the backup story if you want to show a slower booking path that still converts.",
    autopilotCta: "Send Reminder",
    autopilotCtaType: "payment",
    autopilotConfidence: 90,
    autopilotAgo: "5m ago",
    intakeChannel: "Email",
    intakeSource: "Sales inbox parse",
    intakeTone: "Context rich",
    intakeNote: "Threaded itinerary requests retain dates, pacing notes, and family context before the deal opens.",
  },
  {
    slug: "dubai-bleisure",
    leadId: 3,
    guest: "Arjun Mehta",
    caseName: "Dubai bleisure",
    destination: "Dubai",
    priority: "ATTENTION",
    query:
      "Need 4 nights in Dubai for one executive traveler. Mix of meetings and leisure. Downtown hotel, airport transfers, one desert experience. Budget around Rs2L all-in.",
    quoteTotal: 212000,
    financeStatus: "Quote approved and ready to send",
    paymentState: "Quote approval stage",
    depositDue: 85000,
    collectionOwner: "Ravi Menon",
    collectionRisk: "Medium",
    collectionNote:
      "The quote is ready, but finance framing should sit next to the approver summary so the release feels controlled.",
    autopilotHeadline:
      "Phone-captured executive lead is staged with a premium business + leisure blend.",
    autopilotSubtext:
      "Perfect for showing a quote that feels tailored, fast, and still margin aware.",
    autopilotCta: "Approve & Send",
    autopilotCtaType: "approve",
    autopilotConfidence: 89,
    autopilotAgo: "2m ago",
    intakeChannel: "Phone",
    intakeSource: "Call transcript capture",
    intakeTone: "Call-to-CRM",
    intakeNote: "Inbound calls become structured cases with source, owner, and next action already framed.",
  },
];

export function getDemoCaseRoute(slug: string): DemoCaseRoute {
  return DEMO_CASE_ROUTES.find((item) => item.slug === slug) ?? DEMO_CASE_ROUTES[0];
}

export function dealHrefFromSlug(slug: string): string {
  return `/dashboard/deals?case=${slug}`;
}

export function dealHrefFromLeadId(leadId: number): string {
  const match = DEMO_CASE_ROUTES.find((item) => item.leadId === leadId);
  return dealHrefFromSlug(match?.slug ?? DEMO_CASE_ROUTES[0].slug);
}

export function dealHrefFromCaseName(caseName: string): string {
  const normalized = caseName.trim().toLowerCase();
  const match = DEMO_CASE_ROUTES.find((item) => normalized.includes(item.caseName.toLowerCase()));
  return dealHrefFromSlug(match?.slug ?? DEMO_CASE_ROUTES[0].slug);
}

export function normalizeDemoCaseSlug(input: string | null | undefined): string {
  if (!input) return DEMO_CASE_ROUTES[0].slug;
  return DEMO_CASE_ROUTES.some((item) => item.slug === input) ? input : DEMO_CASE_ROUTES[0].slug;
}

export function getPrimaryDemoCase(): DemoCaseRoute {
  return DEMO_CASE_ROUTES[0];
}
