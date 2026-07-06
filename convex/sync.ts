import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";
import {
  GraphAuthError,
  fetchCompanySubscriptions,
  fetchOrgDisplayName,
  fetchSubscribedSkus,
  getAppToken,
} from "./lib/graph";

/** Pull seats + renewal dates for one client tenant from Microsoft Graph. */
export const syncTenant = internalAction({
  args: { tenantDocId: v.id("msTenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await ctx.runQuery(internal.tenants.getTenantInternal, {
      tenantDocId: args.tenantDocId,
    });
    if (!tenant || tenant.status === "disabled") return null;

    try {
      const token = await getAppToken(tenant.tenantId);
      const [skus, subscriptions, orgName] = await Promise.all([
        fetchSubscribedSkus(token),
        fetchCompanySubscriptions(token).catch(() => []),
        fetchOrgDisplayName(token),
      ]);

      await ctx.runMutation(internal.sync.storeTenantSync, {
        tenantDocId: args.tenantDocId,
        skus,
        subscriptions: subscriptions.map((s) => ({
          subscriptionId: s.subscriptionId,
          skuId: s.skuId,
          skuPartNumber: s.skuPartNumber,
          offerName: s.offerName,
          totalLicenses: s.totalLicenses,
          isTrial: s.isTrial,
          status: s.status,
          nextLifecycleDateTime: s.nextLifecycleDateTime,
        })),
        orgName: orgName ?? undefined,
      });
    } catch (error) {
      const isConsent =
        error instanceof GraphAuthError && error.code === "consent_missing";
      await ctx.runMutation(internal.sync.markSyncError, {
        tenantDocId: args.tenantDocId,
        status: isConsent ? "pending_consent" : "error",
        detail:
          error instanceof Error ? error.message.slice(0, 500) : "Unknown error",
      });
    }
    return null;
  },
});

/** Nightly: fan out one sync per active tenant, spaced to be polite. */
export const syncAllTenants = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const tenants = await ctx.runQuery(
      internal.tenants.listActiveTenantsInternal,
      {}
    );
    for (let i = 0; i < tenants.length; i++) {
      await ctx.scheduler.runAfter(i * 3000, internal.sync.syncTenant, {
        tenantDocId: tenants[i]._id,
      });
    }
    return null;
  },
});

const SNAPSHOTS_TO_KEEP = 120;

export const storeTenantSync = internalMutation({
  args: {
    tenantDocId: v.id("msTenants"),
    skus: v.array(
      v.object({
        skuId: v.string(),
        skuPartNumber: v.string(),
        prepaidEnabled: v.number(),
        prepaidSuspended: v.number(),
        prepaidWarning: v.number(),
        consumedUnits: v.number(),
        appliesTo: v.optional(v.string()),
      })
    ),
    subscriptions: v.array(
      v.object({
        subscriptionId: v.string(),
        skuId: v.optional(v.string()),
        skuPartNumber: v.optional(v.string()),
        offerName: v.optional(v.string()),
        totalLicenses: v.number(),
        isTrial: v.boolean(),
        status: v.string(),
        nextLifecycleDateTime: v.optional(v.number()),
      })
    ),
    orgName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantDocId);
    if (!tenant) return null;
    const now = Date.now();

    await ctx.db.insert("seatSnapshots", {
      workspaceId: tenant.workspaceId,
      tenantDocId: tenant._id,
      capturedAt: now,
      skus: args.skus,
    });

    // Prune history beyond the retention window.
    const snapshots = await ctx.db
      .query("seatSnapshots")
      .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
      .order("desc")
      .collect();
    for (const old of snapshots.slice(SNAPSHOTS_TO_KEEP)) {
      await ctx.db.delete(old._id);
    }

    // Replace renewal rows wholesale — they're a mirror, not a log.
    const existing = await ctx.db
      .query("renewals")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .collect();
    for (const row of existing) await ctx.db.delete(row._id);
    for (const sub of args.subscriptions) {
      await ctx.db.insert("renewals", {
        workspaceId: tenant.workspaceId,
        tenantDocId: tenant._id,
        ...sub,
        capturedAt: now,
      });
    }

    await ctx.db.patch(tenant._id, {
      status: "connected",
      statusDetail: undefined,
      lastSyncAt: now,
      // First successful sync: replace a GUID-ish placeholder with the org name.
      ...(args.orgName && tenant.displayName === tenant.tenantId
        ? { displayName: args.orgName }
        : {}),
    });
    return null;
  },
});

export const markSyncError = internalMutation({
  args: {
    tenantDocId: v.id("msTenants"),
    status: v.union(v.literal("pending_consent"), v.literal("error")),
    detail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantDocId);
    if (!tenant) return null;
    await ctx.db.patch(args.tenantDocId, {
      status: args.status,
      statusDetail: args.detail,
    });
    return null;
  },
});
