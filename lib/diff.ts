// The diff engine: seats an MSP owns per client tenant (from Microsoft Graph)
// vs seats they bill (from QuickBooks/Xero recurring invoice lines).
// Pure functions — shared by Convex queries, the demo page, and tests.

import { skuName, NON_BILLABLE_SKUS } from "./m365";
import { estimatedMonthlyPrice } from "./m365-prices";

export type SeatSku = {
  skuId: string;
  skuPartNumber: string;
  /** Seats purchased/prepaid for the tenant (what the MSP pays the distributor for). */
  prepaidEnabled: number;
  prepaidSuspended: number;
  prepaidWarning: number;
  /** Seats actually assigned to users. */
  consumedUnits: number;
};

export type BilledLine = {
  /** Stable key: `${templateOrInvoiceId}:${lineIndex}` */
  key: string;
  customerId: string;
  customerName: string;
  itemName?: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  /** 1 = monthly, 12 = annual, etc. */
  intervalMonths: number;
  source: "recurring" | "invoice";
};

export type SkuMapRule = {
  skuId: string;
  /** BilledLine.key this SKU is billed on. */
  lineKey?: string;
  /** Manual override of the per-seat monthly price the MSP charges. */
  monthlyPricePerSeat?: number;
  ignore?: boolean;
};

export type SkuDiffStatus =
  | "ok"
  | "underbilled"
  | "overbilled"
  | "unmapped"
  | "ignored";

export type SkuDiffRow = {
  skuId: string;
  skuPartNumber: string;
  skuName: string;
  seatsOwned: number;
  seatsAssigned: number;
  /** null when the SKU has no mapped invoice line. */
  seatsBilled: number | null;
  /** Monthly per-seat price used for the $ calculation; null when unknown. */
  monthlyPricePerSeat: number | null;
  /** Confirmed under-billing in $/mo (mapped lines only). */
  monthlyLeak: number;
  /** Billing for more seats than owned, in $/mo. */
  monthlyOverbilled: number;
  /** For unmapped SKUs: estimated $/mo at list price — potential, not confirmed. */
  estimatedUnbilledValue: number;
  status: SkuDiffStatus;
  lineKey?: string;
};

export type ClientDiff = {
  /** msTenants doc id (or a fixture key in demo mode). */
  tenantKey: string;
  clientName: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  mapped: boolean;
  lastSyncAt?: number;
  rows: SkuDiffRow[];
  monthlyLeak: number;
  monthlyOverbilled: number;
  estimatedUnmappedValue: number;
  unmappedSkuCount: number;
};

export type WorkspaceDiff = {
  clients: ClientDiff[];
  totalMonthlyLeak: number;
  totalAnnualLeak: number;
  totalMonthlyOverbilled: number;
  totalEstimatedUnmappedValue: number;
  clientsWithLeaks: number;
  clientsUnmapped: number;
  totalClients: number;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function computeSkuRow(
  sku: SeatSku,
  rule: SkuMapRule | undefined,
  line: BilledLine | undefined
): SkuDiffRow {
  const base: Omit<SkuDiffRow, "status"> = {
    skuId: sku.skuId,
    skuPartNumber: sku.skuPartNumber,
    skuName: skuName(sku.skuPartNumber),
    seatsOwned: sku.prepaidEnabled,
    seatsAssigned: sku.consumedUnits,
    seatsBilled: null,
    monthlyPricePerSeat: null,
    monthlyLeak: 0,
    monthlyOverbilled: 0,
    estimatedUnbilledValue: 0,
    lineKey: rule?.lineKey,
  };

  if (rule?.ignore || NON_BILLABLE_SKUS.has(sku.skuPartNumber)) {
    return { ...base, status: "ignored" };
  }

  if (!rule?.lineKey || !line) {
    const est = rule?.monthlyPricePerSeat ?? estimatedMonthlyPrice(sku.skuPartNumber);
    return {
      ...base,
      monthlyPricePerSeat: rule?.monthlyPricePerSeat ?? null,
      estimatedUnbilledValue: est ? round2(est * sku.prepaidEnabled) : 0,
      status: "unmapped",
    };
  }

  const seatsBilled = line.quantity;
  const monthlyPricePerSeat =
    rule.monthlyPricePerSeat ??
    (line.intervalMonths > 0 ? line.unitPrice / line.intervalMonths : line.unitPrice);
  const delta = sku.prepaidEnabled - seatsBilled;

  return {
    ...base,
    seatsBilled,
    monthlyPricePerSeat: round2(monthlyPricePerSeat),
    monthlyLeak: delta > 0 ? round2(delta * monthlyPricePerSeat) : 0,
    monthlyOverbilled: delta < 0 ? round2(-delta * monthlyPricePerSeat) : 0,
    status: delta > 0 ? "underbilled" : delta < 0 ? "overbilled" : "ok",
  };
}

export function computeClientDiff(input: {
  tenantKey: string;
  clientName: string;
  tenantId: string;
  customerId?: string;
  customerName?: string;
  lastSyncAt?: number;
  skus: SeatSku[];
  rules: SkuMapRule[];
  lines: BilledLine[];
}): ClientDiff {
  const ruleBySku = new Map(input.rules.map((r) => [r.skuId, r]));
  const lineByKey = new Map(input.lines.map((l) => [l.key, l]));

  const rows = input.skus
    .map((sku) =>
      computeSkuRow(sku, ruleBySku.get(sku.skuId), lineByKey.get(ruleBySku.get(sku.skuId)?.lineKey ?? ""))
    )
    // Ledger order: biggest confirmed leak first, then unmapped potential, then the rest.
    .sort(
      (a, b) =>
        b.monthlyLeak - a.monthlyLeak ||
        b.estimatedUnbilledValue - a.estimatedUnbilledValue ||
        b.seatsOwned - a.seatsOwned
    );

  const visible = rows.filter((r) => r.status !== "ignored");
  return {
    tenantKey: input.tenantKey,
    clientName: input.clientName,
    tenantId: input.tenantId,
    customerId: input.customerId,
    customerName: input.customerName,
    mapped: Boolean(input.customerId),
    lastSyncAt: input.lastSyncAt,
    rows,
    monthlyLeak: round2(visible.reduce((s, r) => s + r.monthlyLeak, 0)),
    monthlyOverbilled: round2(visible.reduce((s, r) => s + r.monthlyOverbilled, 0)),
    estimatedUnmappedValue: round2(
      visible.reduce((s, r) => s + r.estimatedUnbilledValue, 0)
    ),
    unmappedSkuCount: visible.filter((r) => r.status === "unmapped").length,
  };
}

export function computeWorkspaceDiff(clients: ClientDiff[]): WorkspaceDiff {
  const sorted = [...clients].sort(
    (a, b) =>
      b.monthlyLeak - a.monthlyLeak ||
      b.estimatedUnmappedValue - a.estimatedUnmappedValue
  );
  const totalMonthlyLeak = round2(sorted.reduce((s, c) => s + c.monthlyLeak, 0));
  return {
    clients: sorted,
    totalMonthlyLeak,
    totalAnnualLeak: round2(totalMonthlyLeak * 12),
    totalMonthlyOverbilled: round2(
      sorted.reduce((s, c) => s + c.monthlyOverbilled, 0)
    ),
    totalEstimatedUnmappedValue: round2(
      sorted.reduce((s, c) => s + c.estimatedUnmappedValue, 0)
    ),
    clientsWithLeaks: sorted.filter((c) => c.monthlyLeak > 0).length,
    clientsUnmapped: sorted.filter((c) => !c.mapped).length,
    totalClients: sorted.length,
  };
}
