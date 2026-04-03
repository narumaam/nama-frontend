import { NextResponse } from "next/server";

import { DEMO_CASE_ROUTES } from "@/lib/demo-cases";

export async function GET() {
  const cases = DEMO_CASE_ROUTES.map((item) => ({
    slug: item.slug,
    lead_id: item.leadId,
    guest_name: item.guest,
    priority: item.priority,
    query: item.query,
    destination: item.destination,
    quote_total: item.quoteTotal,
    status: item.financeStatus,
  }));

  return NextResponse.json(cases);
}
