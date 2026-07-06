import { query } from "./_generated/server";
import { skuName } from "../lib/m365";
import { priceRow } from "../lib/m365-prices";

/** All upcoming renewals across the workspace, soonest first. */
export const listRenewals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .first();
    if (!workspace) return null;

    const renewals = await ctx.db
      .query("renewals")
      .withIndex("by_workspace_next", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    const tenantNames = new Map<string, string>();
    const now = Date.now();
    const rows = [];
    for (const renewal of renewals) {
      let clientName = tenantNames.get(renewal.tenantDocId);
      if (!clientName) {
        const tenant = await ctx.db.get(renewal.tenantDocId);
        clientName = tenant?.displayName ?? "Unknown client";
        tenantNames.set(renewal.tenantDocId, clientName);
      }
      const next = renewal.nextLifecycleDateTime ?? null;
      const daysLeft = next === null ? null : Math.ceil((next - now) / 86_400_000);
      rows.push({
        _id: renewal._id,
        tenantDocId: renewal.tenantDocId,
        clientName,
        skuPartNumber: renewal.skuPartNumber ?? null,
        skuName: renewal.skuPartNumber ? skuName(renewal.skuPartNumber) : null,
        offerName: renewal.offerName ?? null,
        totalLicenses: renewal.totalLicenses,
        isTrial: renewal.isTrial,
        status: renewal.status,
        nextLifecycleDateTime: next,
        daysLeft,
        // Past term end (or in Warning) = at risk of Extended Service Term
        // surcharges (+3% monthly / +23% prepaid) under the post-May-2026 rules.
        estRisk:
          (daysLeft !== null && daysLeft < 0) || renewal.status === "Warning",
        // A price-increased SKU renewing after 2026-07-01 lands at the new list
        // price — flag so the MSP re-prices the client before it hits.
        repriceOnRenewal: Boolean(
          renewal.skuPartNumber &&
            (priceRow(renewal.skuPartNumber)?.pctIncrease ?? 0) > 0
        ),
      });
    }

    rows.sort(
      (a, b) =>
        (a.nextLifecycleDateTime ?? Infinity) - (b.nextLifecycleDateTime ?? Infinity)
    );
    return rows;
  },
});

/**
 * July 2026 repricing checklist: recurring lines mapped to SKUs whose
 * Microsoft list price rose — anywhere the MSP's per-seat price is below the
 * new list, margin shrinks (or goes negative) at the client's next renewal.
 */
export const repricingChecklist = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const workspace = await ctx.db
      .query("workspaces")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .first();
    if (!workspace) return null;

    const skuMappings = await ctx.db
      .query("skuMappings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const lines = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const lineByKey = new Map(lines.map((l) => [l.key, l]));

    const tenantSkuPart = new Map<string, string>();
    const snapshotsCache = new Map<string, Map<string, string>>();

    const rows = [];
    for (const mapping of skuMappings) {
      if (!mapping.lineKey || mapping.ignore) continue;
      const line = lineByKey.get(mapping.lineKey);
      if (!line) continue;

      // Resolve the SKU part number from the latest snapshot.
      let partBySkuId = snapshotsCache.get(mapping.tenantDocId);
      if (!partBySkuId) {
        const snapshot = await ctx.db
          .query("seatSnapshots")
          .withIndex("by_tenant_captured", (q) =>
            q.eq("tenantDocId", mapping.tenantDocId)
          )
          .order("desc")
          .first();
        partBySkuId = new Map(
          (snapshot?.skus ?? []).map((s) => [s.skuId, s.skuPartNumber])
        );
        snapshotsCache.set(mapping.tenantDocId, partBySkuId);
      }
      const partNumber = partBySkuId.get(mapping.skuId);
      if (!partNumber) continue;
      const price = priceRow(partNumber);
      if (!price || price.pctIncrease <= 0) continue;

      let clientName = tenantSkuPart.get(mapping.tenantDocId);
      if (!clientName) {
        const tenant = await ctx.db.get(mapping.tenantDocId);
        clientName = tenant?.displayName ?? "Unknown client";
        tenantSkuPart.set(mapping.tenantDocId, clientName);
      }

      const monthlyCharge =
        mapping.monthlyPricePerSeat ??
        (line.intervalMonths > 0 ? line.unitPrice / line.intervalMonths : line.unitPrice);

      rows.push({
        tenantDocId: mapping.tenantDocId,
        clientName,
        skuPartNumber: partNumber,
        skuName: skuName(partNumber),
        lineDescription: line.itemName ?? line.description ?? line.key,
        quantity: line.quantity,
        monthlyChargePerSeat: Math.round(monthlyCharge * 100) / 100,
        oldCost: price.oldPriceUsd,
        newCost: price.newPriceUsd,
        pctIncrease: price.pctIncrease,
        marginNowPerSeat: Math.round((monthlyCharge - price.oldPriceUsd) * 100) / 100,
        marginAfterPerSeat:
          Math.round((monthlyCharge - price.newPriceUsd) * 100) / 100,
        // Needs action: margin shrinks below 20% of the new cost, or negative.
        flagged: monthlyCharge < price.newPriceUsd * 1.2,
      });
    }

    rows.sort((a, b) => a.marginAfterPerSeat - b.marginAfterPerSeat);
    return rows;
  },
});
