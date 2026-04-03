export type DemoCaseRoute = {
  slug: string;
  leadId: number;
  guest: string;
  caseName: string;
};

export const DEMO_CASE_ROUTES: DemoCaseRoute[] = [
  {
    slug: "maldives-honeymoon",
    leadId: 1,
    guest: "Meera Nair",
    caseName: "Maldives honeymoon",
  },
  {
    slug: "kerala-family",
    leadId: 2,
    guest: "Sharma Family",
    caseName: "Kerala family trip",
  },
  {
    slug: "dubai-bleisure",
    leadId: 3,
    guest: "Arjun Mehta",
    caseName: "Dubai bleisure",
  },
];

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
