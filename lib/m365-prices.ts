// USD list prices per seat per month (annual commitment) for common CSP-resold
// Microsoft SKUs, before and after Microsoft's July 1, 2026 price increase.
// Verified 2026-07-06 against microsoft.com/licensing/news (2026 M365 packaging
// & pricing updates + FAQ), cross-checked with redriver.com and uscloud.com.
// Education/consumer unchanged; existing subscriptions keep old pricing until
// their first renewal after 2026-07-01. Monthly billing of annual terms adds
// the separate +5% premium (since 2025-04-01) on top of list.

export type SkuPrice = {
  partNumber: string;
  name: string;
  oldPriceUsd: number;
  newPriceUsd: number;
  pctIncrease: number;
  estimated: boolean;
  source?: string;
};

export const PRICE_INCREASE_EFFECTIVE = "2026-07-01";
export const PRICE_SOURCE_URL =
  "https://www.microsoft.com/en-us/licensing/news/2026-m365-packaging-pricing-updates";

// Extended Service Term: since May 4, 2026 there is no free grace period after
// an NCE term ends. Non-renewed subscriptions convert to a month-to-month EST
// billed at the monthly rate +3% (or +23% when the product has no monthly
// plan). Trap: auto-renew OFF without a scheduled cancel converts to EST
// automatically. Source: learn.microsoft.com/partner-center/customers/extended-service-terms
export const EST_RULES = {
  effectiveDate: "2026-05-04",
  monthlySurchargePct: 3,
  prepaidSurchargePct: 23,
  summary:
    "Since May 4, 2026 an expired NCE subscription no longer gets a free grace period: it converts to a month-to-month Extended Service Term billed at the monthly rate +3% (+23% for products without a monthly plan). Auto-renew off without a scheduled cancellation converts to EST automatically — the main billing trap for CSP partners.",
  source:
    "https://learn.microsoft.com/en-us/partner-center/customers/extended-service-terms",
};

export const SKU_PRICES: SkuPrice[] = [
  { partNumber: "O365_BUSINESS_ESSENTIALS", name: "Microsoft 365 Business Basic", oldPriceUsd: 6.0, newPriceUsd: 7.0, pctIncrease: 16.7, estimated: false },
  { partNumber: "O365_BUSINESS_PREMIUM", name: "Microsoft 365 Business Standard", oldPriceUsd: 12.5, newPriceUsd: 14.0, pctIncrease: 12.0, estimated: false },
  { partNumber: "SPB", name: "Microsoft 365 Business Premium", oldPriceUsd: 22.0, newPriceUsd: 22.0, pctIncrease: 0, estimated: false },
  { partNumber: "O365_BUSINESS", name: "Microsoft 365 Apps for Business", oldPriceUsd: 8.25, newPriceUsd: 10.0, pctIncrease: 21.2, estimated: false },
  { partNumber: "SMB_BUSINESS", name: "Microsoft 365 Apps for Business", oldPriceUsd: 8.25, newPriceUsd: 10.0, pctIncrease: 21.2, estimated: false },
  { partNumber: "OFFICESUBSCRIPTION", name: "Microsoft 365 Apps for Enterprise", oldPriceUsd: 12.0, newPriceUsd: 14.0, pctIncrease: 16.7, estimated: false },
  { partNumber: "STANDARDPACK", name: "Office 365 E1", oldPriceUsd: 10.0, newPriceUsd: 10.0, pctIncrease: 0, estimated: false },
  { partNumber: "ENTERPRISEPACK", name: "Office 365 E3", oldPriceUsd: 23.0, newPriceUsd: 26.0, pctIncrease: 13.0, estimated: false },
  { partNumber: "ENTERPRISEPREMIUM", name: "Office 365 E5", oldPriceUsd: 38.0, newPriceUsd: 41.0, pctIncrease: 7.9, estimated: false },
  { partNumber: "SPE_E3", name: "Microsoft 365 E3", oldPriceUsd: 36.0, newPriceUsd: 39.0, pctIncrease: 8.3, estimated: false },
  { partNumber: "SPE_E5", name: "Microsoft 365 E5", oldPriceUsd: 57.0, newPriceUsd: 60.0, pctIncrease: 5.3, estimated: false },
  { partNumber: "M365_F1_COMM", name: "Microsoft 365 F1", oldPriceUsd: 2.25, newPriceUsd: 3.0, pctIncrease: 33.3, estimated: false },
  { partNumber: "SPE_F1", name: "Microsoft 365 F3", oldPriceUsd: 8.0, newPriceUsd: 10.0, pctIncrease: 25.0, estimated: false },
  { partNumber: "EMS", name: "Enterprise Mobility + Security E3", oldPriceUsd: 10.6, newPriceUsd: 12.0, pctIncrease: 13.2, estimated: false },
  { partNumber: "EMSPREMIUM", name: "Enterprise Mobility + Security E5", oldPriceUsd: 16.4, newPriceUsd: 18.0, pctIncrease: 9.8, estimated: false },
  { partNumber: "AAD_PREMIUM", name: "Microsoft Entra ID P1", oldPriceUsd: 6.0, newPriceUsd: 7.0, pctIncrease: 16.7, estimated: false },
  { partNumber: "AAD_PREMIUM_P2", name: "Microsoft Entra ID P2", oldPriceUsd: 9.0, newPriceUsd: 10.0, pctIncrease: 11.1, estimated: false },
  // Not part of the July 2026 increase (standalone Teams/Copilot/Exchange/
  // Defender SKUs are excluded per Microsoft's FAQ). Current list verified.
  { partNumber: "EXCHANGESTANDARD", name: "Exchange Online (Plan 1)", oldPriceUsd: 4.0, newPriceUsd: 4.0, pctIncrease: 0, estimated: false },
  { partNumber: "EXCHANGEENTERPRISE", name: "Exchange Online (Plan 2)", oldPriceUsd: 8.0, newPriceUsd: 8.0, pctIncrease: 0, estimated: false },
  { partNumber: "MCOEV", name: "Microsoft Teams Phone Standard", oldPriceUsd: 10.0, newPriceUsd: 10.0, pctIncrease: 0, estimated: false },
  { partNumber: "ATP_ENTERPRISE", name: "Defender for Office 365 (Plan 1)", oldPriceUsd: 2.0, newPriceUsd: 2.0, pctIncrease: 0, estimated: false },
  { partNumber: "THREAT_INTELLIGENCE", name: "Defender for Office 365 (Plan 2)", oldPriceUsd: 5.0, newPriceUsd: 5.0, pctIncrease: 0, estimated: false },
  { partNumber: "Microsoft_365_Copilot", name: "Microsoft 365 Copilot", oldPriceUsd: 30.0, newPriceUsd: 30.0, pctIncrease: 0, estimated: false },
];

const byPart = new Map(SKU_PRICES.map((p) => [p.partNumber, p]));

export function priceRow(partNumber: string): SkuPrice | undefined {
  return byPart.get(partNumber);
}

/** Current (post-increase) list price used to estimate unmapped SKU value. */
export function estimatedMonthlyPrice(partNumber: string): number | null {
  return byPart.get(partNumber)?.newPriceUsd ?? null;
}

/** SKUs whose list price rises July 1, 2026 — the repricing checklist set. */
export function increasedSkus(): SkuPrice[] {
  return SKU_PRICES.filter((p) => p.pctIncrease > 0);
}
