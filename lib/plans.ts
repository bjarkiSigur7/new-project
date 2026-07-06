// Plan definitions and limits. Plan detection lives in convex/billing.ts;
// this file is shared by UI and backend so limits render consistently.

export type PlanKey = "trial" | "starter" | "pro" | "scale";

export type Plan = {
  key: PlanKey;
  name: string;
  priceMonthlyUsd: number | null;
  tenantLimit: number | null; // null = unlimited
  blurb: string;
  features: string[];
};

export const TRIAL_DAYS = 14;

export const PLANS: Record<PlanKey, Plan> = {
  trial: {
    key: "trial",
    name: "Trial",
    priceMonthlyUsd: null,
    tenantLimit: 25,
    blurb: "Full product for 14 days. No card required.",
    features: [
      "Everything in Pro",
      "Up to 25 client tenants",
      "The free scan is the sales pitch — see your unbilled dollars in the first session",
    ],
  },
  starter: {
    key: "starter",
    name: "Starter",
    priceMonthlyUsd: 79,
    tenantLimit: 25,
    blurb: "For MSPs getting their first 25 client tenants reconciled.",
    features: [
      "Up to 25 client tenants",
      "Nightly Microsoft Graph seat sync",
      "QuickBooks Online or Xero invoice diff",
      "Per-client unbilled-seats dashboard",
      "NCE renewal calendar with surcharge warnings",
      "Monthly pre-billing email digest",
    ],
  },
  pro: {
    key: "pro",
    name: "Pro",
    priceMonthlyUsd: 149,
    tenantLimit: 75,
    blurb: "The workhorse tier for established shops.",
    features: [
      "Up to 75 client tenants",
      "QuickBooks Online and Xero",
      "July 2026 price-increase repricing checklist",
      "Client renewal-confirmation emails with approve/decline links",
      "CSV / audit exports",
      "Priority support",
    ],
  },
  scale: {
    key: "scale",
    name: "Scale",
    priceMonthlyUsd: 249,
    tenantLimit: null,
    blurb: "For growing shops that aren't ready to graduate to a PSA.",
    features: [
      "Unlimited client tenants",
      "Multi-user seats",
      "White-labeled client emails",
      "API access",
      "Early access to Pax8 line-item reconciliation",
    ],
  },
};

export function tenantLimitFor(plan: PlanKey): number | null {
  return PLANS[plan].tenantLimit;
}
