import { v } from "convex/values";
import { query } from "./_generated/server";
import { buildClientDiff, buildWorkspaceDiff } from "./lib/moneyScreen";
import { requireTenant } from "./lib/access";

/** The money screen: every client's seats-owned vs seats-billed diff. */
export const getMoneyScreen = query({
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

    const diff = await buildWorkspaceDiff(ctx, workspace._id);
    const connection = await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();

    return {
      diff,
      setup: {
        hasTenants: diff.totalClients > 0,
        hasAccounting: connection?.status === "connected",
        accountingProvider: connection?.provider ?? null,
        syncedTenants: diff.clients.filter((c) => c.lastSyncAt).length,
        mappedClients: diff.clients.filter((c) => c.mapped).length,
      },
    };
  },
});

/** One client: full diff, seat history for the trend line, renewals. */
export const getClientDetail = query({
  args: { tenantDocId: v.id("msTenants") },
  handler: async (ctx, args) => {
    const { workspace, tenant } = await requireTenant(ctx, args.tenantDocId);

    const allLines = await ctx.db
      .query("invoiceLines")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const diff = await buildClientDiff(ctx, tenant, allLines);

    const snapshots = await ctx.db
      .query("seatSnapshots")
      .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
      .order("desc")
      .take(60);
    const seatHistory = snapshots
      .map((s) => ({
        capturedAt: s.capturedAt,
        totalSeats: s.skus.reduce((sum, x) => sum + x.prepaidEnabled, 0),
        assignedSeats: s.skus.reduce((sum, x) => sum + x.consumedUnits, 0),
      }))
      .reverse();

    const renewals = await ctx.db
      .query("renewals")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .collect();

    return {
      tenant: {
        _id: tenant._id,
        displayName: tenant.displayName,
        tenantId: tenant.tenantId,
        status: tenant.status,
        statusDetail: tenant.statusDetail ?? null,
        lastSyncAt: tenant.lastSyncAt ?? null,
      },
      diff,
      seatHistory,
      renewals: renewals.sort(
        (a, b) =>
          (a.nextLifecycleDateTime ?? Infinity) -
          (b.nextLifecycleDateTime ?? Infinity)
      ),
    };
  },
});
