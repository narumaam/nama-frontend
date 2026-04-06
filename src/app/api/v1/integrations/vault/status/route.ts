import { NextResponse } from "next/server";

import { requireRouteSession } from "@/app/api/v1/_session-auth";

function status(enabled: boolean, liveLabel = "CONNECTED") {
  return enabled ? liveLabel : "NOT_CONFIGURED";
}

function localVaultStatus() {
  const whatsappEnabled = Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_ID);
  const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
  const razorpayEnabled = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  const resendEnabled = Boolean(process.env.RESEND_API_KEY);
  const sendgridEnabled = Boolean(process.env.SENDGRID_API_KEY);
  const bokunEnabled = Boolean(process.env.BOKUN_API_KEY && process.env.BOKUN_API_SECRET);
  const amadeusEnabled = Boolean(process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET);
  const tboEnabled = Boolean(process.env.TBO_CLIENT_ID && process.env.TBO_CLIENT_SECRET);

  return {
    whatsapp: status(whatsappEnabled),
    stripe: status(stripeEnabled, "LIVE_READY"),
    razorpay: status(razorpayEnabled, "LIVE_READY"),
    resend: status(resendEnabled),
    sendgrid: status(sendgridEnabled),
    bokun: status(bokunEnabled, "ACTIVE"),
    amadeus: status(amadeusEnabled, "ACTIVE"),
    tbo: status(tboEnabled, "ACTIVE"),
  };
}

export async function GET() {
  const session = await requireRouteSession({
    tenantName: null,
    allowedRoles: ["customer-admin", "finance", "super-admin"],
  });
  if (session instanceof NextResponse) {
    return session;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
  if (apiBaseUrl) {
    try {
      const response = await fetch(`${apiBaseUrl}/integrations/vault/status`, {
        method: "GET",
        cache: "no-store",
      });
      if (response.ok) {
        return NextResponse.json(await response.json());
      }
    } catch {
      // Fall back to local env inspection for same-origin demo mode.
    }
  }

  return NextResponse.json(localVaultStatus());
}
