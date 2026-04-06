import { apiUrl } from "@/lib/api";
import { createApiAuthHeaders } from "@/lib/api-auth";

export type IntegrationProviderStatus =
  | "CONNECTED"
  | "LIVE_READY"
  | "ACTIVE"
  | "NOT_CONFIGURED";

export type IntegrationVaultStatus = {
  whatsapp: IntegrationProviderStatus;
  stripe: IntegrationProviderStatus;
  razorpay: IntegrationProviderStatus;
  resend: IntegrationProviderStatus;
  sendgrid: IntegrationProviderStatus;
  bokun: IntegrationProviderStatus;
  amadeus: IntegrationProviderStatus;
  tbo: IntegrationProviderStatus;
};

export async function fetchIntegrationVaultStatus() {
  const response = await fetch(apiUrl("/integrations/vault/status"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...createApiAuthHeaders(),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Integration vault status request failed: ${response.status}`);
  }

  return (await response.json()) as IntegrationVaultStatus;
}
