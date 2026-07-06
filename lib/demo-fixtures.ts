// Demo workspace: realistic sample data for the public /demo page and
// screenshots. Runs through the same diff engine as production data.

import type { BilledLine, SeatSku, SkuMapRule } from "./diff";
import { computeClientDiff, computeWorkspaceDiff, type WorkspaceDiff } from "./diff";

type DemoTenant = {
  tenantKey: string;
  clientName: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  lastSyncAt: number;
  skus: SeatSku[];
  rules: SkuMapRule[];
  lines: BilledLine[];
};

const line = (
  key: string,
  customerId: string,
  customerName: string,
  itemName: string,
  quantity: number,
  unitPrice: number
): BilledLine => ({
  key,
  customerId,
  customerName,
  itemName,
  description: itemName,
  quantity,
  unitPrice,
  amount: quantity * unitPrice,
  intervalMonths: 1,
  source: "recurring",
});

const sku = (
  skuId: string,
  skuPartNumber: string,
  prepaidEnabled: number,
  consumedUnits: number
): SeatSku => ({
  skuId,
  skuPartNumber,
  prepaidEnabled,
  prepaidSuspended: 0,
  prepaidWarning: 0,
  consumedUnits,
});

// "Last night" for stable demo rendering — a fixed recent timestamp is fine.
const LAST_SYNC = new Date("2026-07-06T03:12:00Z").getTime();

export const DEMO_TENANTS: DemoTenant[] = [
  {
    tenantKey: "demo-harbor",
    clientName: "Harbor Dental Group",
    tenantId: "3f1c7a2e-demo-0001",
    customerId: "qbo-101",
    customerName: "Harbor Dental Group",
    lastSyncAt: LAST_SYNC,
    // Bought 4 more Business Premium seats in May; invoice never updated.
    skus: [
      sku("s-spb-h", "SPB", 22, 21),
      sku("s-exo-h", "EXCHANGESTANDARD", 6, 6),
      sku("s-cop-h", "Microsoft_365_Copilot", 3, 3),
    ],
    rules: [
      { skuId: "s-spb-h", lineKey: "rt-101:0" },
      { skuId: "s-exo-h", lineKey: "rt-101:1" },
      { skuId: "s-cop-h", lineKey: "rt-101:2" },
    ],
    lines: [
      line("rt-101:0", "qbo-101", "Harbor Dental Group", "Microsoft 365 Business Premium", 18, 33.0),
      line("rt-101:1", "qbo-101", "Harbor Dental Group", "Exchange Online mailbox", 6, 8.5),
      line("rt-101:2", "qbo-101", "Harbor Dental Group", "Microsoft Copilot license", 3, 45.0),
    ],
  },
  {
    tenantKey: "demo-anderson",
    clientName: "Anderson & Wolfe LLP",
    tenantId: "3f1c7a2e-demo-0002",
    customerId: "qbo-102",
    customerName: "Anderson & Wolfe LLP",
    lastSyncAt: LAST_SYNC,
    // Two paralegals onboarded in June — seats added, never invoiced.
    skus: [
      sku("s-std-a", "O365_BUSINESS_PREMIUM", 14, 14),
      sku("s-p1-a", "AAD_PREMIUM", 14, 12),
    ],
    rules: [
      { skuId: "s-std-a", lineKey: "rt-102:0" },
      { skuId: "s-p1-a", lineKey: "rt-102:1" },
    ],
    lines: [
      line("rt-102:0", "qbo-102", "Anderson & Wolfe LLP", "Microsoft 365 Business Standard", 12, 19.0),
      line("rt-102:1", "qbo-102", "Anderson & Wolfe LLP", "Entra ID P1 security add-on", 12, 10.0),
    ],
  },
  {
    tenantKey: "demo-ridgeline",
    clientName: "Ridgeline Construction",
    tenantId: "3f1c7a2e-demo-0003",
    customerId: "qbo-103",
    customerName: "Ridgeline Construction Inc",
    lastSyncAt: LAST_SYNC,
    // Clean except Teams Phone was never put on the invoice at all.
    skus: [
      sku("s-bas-r", "O365_BUSINESS_ESSENTIALS", 25, 24),
      sku("s-tp-r", "MCOEV", 8, 8),
    ],
    rules: [{ skuId: "s-bas-r", lineKey: "rt-103:0" }],
    lines: [
      line("rt-103:0", "qbo-103", "Ridgeline Construction Inc", "Microsoft 365 Business Basic", 25, 11.0),
    ],
  },
  {
    tenantKey: "demo-bayview",
    clientName: "BayView Physiotherapy",
    tenantId: "3f1c7a2e-demo-0004",
    customerId: "qbo-104",
    customerName: "BayView Physio",
    lastSyncAt: LAST_SYNC,
    // Fully clean — most clients are; that's what makes the leaks credible.
    skus: [sku("s-spb-b", "SPB", 9, 9)],
    rules: [{ skuId: "s-spb-b", lineKey: "rt-104:0" }],
    lines: [
      line("rt-104:0", "qbo-104", "BayView Physio", "Microsoft 365 Business Premium", 9, 33.0),
    ],
  },
  {
    tenantKey: "demo-cornerstone",
    clientName: "Cornerstone Realty",
    tenantId: "3f1c7a2e-demo-0005",
    customerId: "qbo-105",
    customerName: "Cornerstone Realty Partners",
    lastSyncAt: LAST_SYNC,
    // Downsized in April — MSP is overbilling 3 seats (credit risk, flagged too).
    skus: [sku("s-std-c", "O365_BUSINESS_PREMIUM", 17, 16)],
    rules: [{ skuId: "s-std-c", lineKey: "rt-105:0" }],
    lines: [
      line("rt-105:0", "qbo-105", "Cornerstone Realty Partners", "Microsoft 365 Business Standard", 20, 19.0),
    ],
  },
  {
    tenantKey: "demo-nordic",
    clientName: "Nordic Coffee Co.",
    tenantId: "3f1c7a2e-demo-0006",
    customerId: "qbo-106",
    customerName: "Nordic Coffee Co",
    lastSyncAt: LAST_SYNC,
    // A whole tenant onboarded in June and never mapped to an invoice.
    skus: [
      sku("s-bas-n", "O365_BUSINESS_ESSENTIALS", 12, 11),
      sku("s-spb-n", "SPB", 4, 4),
    ],
    rules: [],
    lines: [],
  },
];

export const DEMO_RENEWALS = [
  {
    tenantKey: "demo-harbor",
    clientName: "Harbor Dental Group",
    skuPartNumber: "SPB",
    offerName: "Microsoft 365 Business Premium (Annual)",
    totalLicenses: 22,
    isTrial: false,
    status: "Enabled",
    nextLifecycleDateTime: new Date("2026-07-19T00:00:00Z").getTime(),
  },
  {
    tenantKey: "demo-anderson",
    clientName: "Anderson & Wolfe LLP",
    skuPartNumber: "O365_BUSINESS_PREMIUM",
    offerName: "Microsoft 365 Business Standard (Annual)",
    totalLicenses: 14,
    isTrial: false,
    status: "Warning",
    nextLifecycleDateTime: new Date("2026-07-09T00:00:00Z").getTime(),
  },
  {
    tenantKey: "demo-ridgeline",
    clientName: "Ridgeline Construction",
    skuPartNumber: "O365_BUSINESS_ESSENTIALS",
    offerName: "Microsoft 365 Business Basic (Annual)",
    totalLicenses: 25,
    isTrial: false,
    status: "Enabled",
    nextLifecycleDateTime: new Date("2026-09-02T00:00:00Z").getTime(),
  },
  {
    tenantKey: "demo-nordic",
    clientName: "Nordic Coffee Co.",
    skuPartNumber: "SPB",
    offerName: "Microsoft 365 Business Premium (Monthly)",
    totalLicenses: 4,
    isTrial: true,
    status: "Enabled",
    nextLifecycleDateTime: new Date("2026-07-28T00:00:00Z").getTime(),
  },
];

export function demoWorkspaceDiff(): WorkspaceDiff {
  return computeWorkspaceDiff(
    DEMO_TENANTS.map((t) =>
      computeClientDiff({
        tenantKey: t.tenantKey,
        clientName: t.clientName,
        tenantId: t.tenantId,
        customerId: t.customerId,
        customerName: t.customerName,
        lastSyncAt: t.lastSyncAt,
        skus: t.skus,
        rules: t.rules,
        lines: t.lines,
      })
    )
  );
}
