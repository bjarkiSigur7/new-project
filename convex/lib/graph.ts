// Microsoft Graph client for multi-tenant app-only access.
// Uses client-credentials per client tenant (the MSP's customers admin-consent
// our multi-tenant Entra app). Deliberately Graph-only: the Partner Center API
// is not available to indirect resellers, which is exactly who we serve.

export type GraphSku = {
  skuId: string;
  skuPartNumber: string;
  prepaidEnabled: number;
  prepaidSuspended: number;
  prepaidWarning: number;
  consumedUnits: number;
  appliesTo?: string;
};

export type GraphCompanySubscription = {
  subscriptionId: string;
  skuId?: string;
  skuPartNumber?: string;
  offerName?: string;
  totalLicenses: number;
  isTrial: boolean;
  status: string;
  nextLifecycleDateTime?: number;
};

export class GraphAuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "consent_missing"
      | "tenant_not_found"
      | "credentials"
      | "unknown"
  ) {
    super(message);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new GraphAuthError(
      `${name} is not configured on this deployment`,
      "credentials"
    );
  }
  return value;
}

export async function getAppToken(tenantId: string): Promise<string> {
  const clientId = requireEnv("MS_CLIENT_ID");
  const clientSecret = requireEnv("MS_CLIENT_SECRET");

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  const body = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !body.access_token) {
    const description = body.error_description ?? body.error ?? `HTTP ${res.status}`;
    if (body.error === "unauthorized_client" || description.includes("AADSTS700016")) {
      throw new GraphAuthError(
        "The TrueUp app is not consented in this tenant yet. Complete the admin-consent step.",
        "consent_missing"
      );
    }
    if (description.includes("AADSTS90002")) {
      throw new GraphAuthError("Tenant not found — check the tenant ID.", "tenant_not_found");
    }
    throw new GraphAuthError(`Token request failed: ${description}`, "unknown");
  }
  return body.access_token;
}

async function graphGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph GET ${path} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

type SubscribedSkusResponse = {
  value: Array<{
    skuId: string;
    skuPartNumber: string;
    appliesTo?: string;
    consumedUnits: number;
    prepaidUnits: { enabled: number; suspended: number; warning: number };
  }>;
};

export async function fetchSubscribedSkus(
  token: string
): Promise<GraphSku[]> {
  const data = await graphGet<SubscribedSkusResponse>(token, "/subscribedSkus");
  return data.value.map((s) => ({
    skuId: s.skuId,
    skuPartNumber: s.skuPartNumber,
    prepaidEnabled: s.prepaidUnits?.enabled ?? 0,
    prepaidSuspended: s.prepaidUnits?.suspended ?? 0,
    prepaidWarning: s.prepaidUnits?.warning ?? 0,
    consumedUnits: s.consumedUnits ?? 0,
    appliesTo: s.appliesTo,
  }));
}

type CompanySubscriptionResponse = {
  value: Array<{
    id?: string;
    commerceSubscriptionId?: string;
    skuId?: string;
    skuPartNumber?: string;
    offerId?: string;
    totalLicenses?: number;
    isTrial?: boolean;
    status?: string;
    nextLifecycleDateTime?: string;
  }>;
};

export async function fetchCompanySubscriptions(
  token: string
): Promise<GraphCompanySubscription[]> {
  const data = await graphGet<CompanySubscriptionResponse>(
    token,
    "/directory/subscriptions"
  );
  return data.value.map((s) => ({
    subscriptionId: s.commerceSubscriptionId ?? s.id ?? "",
    skuId: s.skuId,
    skuPartNumber: s.skuPartNumber,
    offerName: s.offerId,
    totalLicenses: s.totalLicenses ?? 0,
    isTrial: s.isTrial ?? false,
    status: s.status ?? "Unknown",
    nextLifecycleDateTime: s.nextLifecycleDateTime
      ? Date.parse(s.nextLifecycleDateTime)
      : undefined,
  }));
}

/** Fetch the org display name — used to auto-name a tenant after consent. */
export async function fetchOrgDisplayName(token: string): Promise<string | null> {
  try {
    const data = await graphGet<{ value: Array<{ displayName?: string }> }>(
      token,
      "/organization?$select=displayName"
    );
    return data.value[0]?.displayName ?? null;
  } catch {
    return null;
  }
}

/** Admin-consent URL a client's Global Admin opens to grant the app access. */
export function buildAdminConsentUrl(args: {
  tenantId: string;
  state: string;
  redirectUri: string;
}): string {
  const clientId = requireEnv("MS_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: args.redirectUri,
    state: args.state,
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(
    args.tenantId
  )}/adminconsent?${params.toString()}`;
}
