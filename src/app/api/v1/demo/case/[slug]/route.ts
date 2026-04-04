import { NextResponse } from "next/server";

import { DEMO_DEAL_CASES, PRIMARY_DEMO_DEAL_CASE } from "@/lib/demo-case-profiles";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(_request: Request, context: RouteContext) {
  const slug = context.params.slug;
  const deal = DEMO_DEAL_CASES[slug];

  if (!deal) {
    return NextResponse.json(
      {
        detail: `Demo case not found for slug "${slug}"`,
        fallback: PRIMARY_DEMO_DEAL_CASE.slug,
      },
      { status: 404 }
    );
  }

  return NextResponse.json(deal);
}
