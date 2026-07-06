// Assembles the workspace diff (the money screen) from Convex tables.
// Shared by the dashboard query and the email digest.

import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import {
  computeClientDiff,
  computeWorkspaceDiff,
  type BilledLine,
  type ClientDiff,
  type SkuMapRule,
  type WorkspaceDiff,
} from "../../lib/diff";

export function toBilledLine(row: Doc<"invoiceLines">): BilledLine {
  return {
    key: row.key,
    customerId: row.customerId,
    customerName: row.customerName,
    itemName: row.itemName,
    description: row.description,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    amount: row.amount,
    intervalMonths: row.intervalMonths,
    source: row.source,
  };
}

export async function buildClientDiff(
  ctx: QueryCtx,
  tenant: Doc<"msTenants">,
  allLines: Doc<"invoiceLines">[]
): Promise<ClientDiff> {
  const snapshot = await ctx.db
    .query("seatSnapshots")
    .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
    .order("desc")
    .first();
  const clientMapping = await ctx.db
    .query("clientMappings")
    .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
    .first();
  const skuMappings = await ctx.db
    .query("skuMappings")
    .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
    .collect();

  const rules: SkuMapRule[] = skuMappings.map((m) => ({
    skuId: m.skuId,
    lineKey: m.lineKey,
    monthlyPricePerSeat: m.monthlyPricePerSeat,
    ignore: m.ignore,
  }));

  const customerLines = clientMapping
    ? allLines
        .filter((l) => l.customerId === clientMapping.customerId)
        .map(toBilledLine)
    : [];

  return computeClientDiff({
    tenantKey: tenant._id,
    clientName: tenant.displayName,
    tenantId: tenant.tenantId,
    customerId: clientMapping?.customerId,
    customerName: clientMapping?.customerName,
    lastSyncAt: tenant.lastSyncAt,
    skus: snapshot?.skus ?? [],
    rules,
    lines: customerLines,
  });
}

export async function buildWorkspaceDiff(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">
): Promise<WorkspaceDiff> {
  const tenants = await ctx.db
    .query("msTenants")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  const allLines = await ctx.db
    .query("invoiceLines")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const clients: ClientDiff[] = [];
  for (const tenant of tenants) {
    if (tenant.status === "disabled") continue;
    clients.push(await buildClientDiff(ctx, tenant, allLines));
  }
  return computeWorkspaceDiff(clients);
}
