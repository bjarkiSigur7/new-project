import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { randomToken, requireTenant, requireWorkspace } from "./lib/access";
import { isTenantGuid } from "../lib/m365";

export const listTenants = query({
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

    const tenants = await ctx.db
      .query("msTenants")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    return await Promise.all(
      tenants.map(async (tenant) => {
        const mapping = await ctx.db
          .query("clientMappings")
          .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
          .first();
        const latestSnapshot = await ctx.db
          .query("seatSnapshots")
          .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
          .order("desc")
          .first();
        const totalSeats = latestSnapshot
          ? latestSnapshot.skus.reduce((s, x) => s + x.prepaidEnabled, 0)
          : null;
        return {
          ...tenant,
          customerName: mapping?.customerName ?? null,
          totalSeats,
          skuCount: latestSnapshot?.skus.length ?? null,
        };
      })
    );
  },
});

export const addTenant = mutation({
  args: { tenantId: v.string(), displayName: v.string() },
  returns: v.object({ tenantDocId: v.id("msTenants"), consentUrl: v.string() }),
  handler: async (ctx, args) => {
    const { user, workspace } = await requireWorkspace(ctx);
    const tenantId = args.tenantId.trim().toLowerCase();
    if (!isTenantGuid(tenantId)) {
      throw new Error(
        "That doesn't look like a tenant ID. It's a GUID like 3f2504e0-4f89-11d3-9a0c-0305e82c3301 — find it in the client's Entra admin center under Overview."
      );
    }

    const existing = await ctx.db
      .query("msTenants")
      .withIndex("by_workspace_tenant", (q) =>
        q.eq("workspaceId", workspace._id).eq("tenantId", tenantId)
      )
      .first();
    if (existing) throw new Error("That tenant is already added.");

    const planInfo = await ctx.runQuery(internal.billing.planInfoInternal, {
      userId: user._id,
    });
    if (planInfo.locked) {
      throw new Error("Your trial has ended — pick a plan to keep adding tenants.");
    }
    const tenants = await ctx.db
      .query("msTenants")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    if (planInfo.tenantLimit !== null && tenants.length >= planInfo.tenantLimit) {
      throw new Error(
        `Your ${planInfo.plan} plan covers ${planInfo.tenantLimit} client tenants. Upgrade to add more.`
      );
    }

    const tenantDocId = await ctx.db.insert("msTenants", {
      workspaceId: workspace._id,
      tenantId,
      displayName: args.displayName.trim().slice(0, 80) || tenantId,
      status: "pending_consent",
      addedAt: Date.now(),
    });

    const state = randomToken();
    await ctx.db.insert("oauthStates", {
      state,
      workspaceId: workspace._id,
      provider: "ms_consent",
      tenantDocId,
      createdAt: Date.now(),
    });

    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    const clientId = process.env.MS_CLIENT_ID ?? "";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${siteUrl}/ms/consent-callback`,
      state,
    });
    const consentUrl = `https://login.microsoftonline.com/${encodeURIComponent(
      tenantId
    )}/adminconsent?${params.toString()}`;

    return { tenantDocId, consentUrl };
  },
});

/** Re-issue the admin-consent URL for a pending or errored tenant. */
export const getConsentUrl = mutation({
  args: { tenantDocId: v.id("msTenants") },
  returns: v.string(),
  handler: async (ctx, args) => {
    const { workspace, tenant } = await requireTenant(ctx, args.tenantDocId);
    const state = randomToken();
    await ctx.db.insert("oauthStates", {
      state,
      workspaceId: workspace._id,
      provider: "ms_consent",
      tenantDocId: tenant._id,
      createdAt: Date.now(),
    });
    const siteUrl = process.env.CONVEX_SITE_URL ?? "";
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID ?? "",
      redirect_uri: `${siteUrl}/ms/consent-callback`,
      state,
    });
    return `https://login.microsoftonline.com/${encodeURIComponent(
      tenant.tenantId
    )}/adminconsent?${params.toString()}`;
  },
});

export const renameTenant = mutation({
  args: { tenantDocId: v.id("msTenants"), displayName: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireTenant(ctx, args.tenantDocId);
    await ctx.db.patch(args.tenantDocId, {
      displayName: args.displayName.trim().slice(0, 80),
    });
    return null;
  },
});

export const removeTenant = mutation({
  args: { tenantDocId: v.id("msTenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { tenant } = await requireTenant(ctx, args.tenantDocId);

    const snapshots = await ctx.db
      .query("seatSnapshots")
      .withIndex("by_tenant_captured", (q) => q.eq("tenantDocId", tenant._id))
      .collect();
    for (const doc of snapshots) await ctx.db.delete(doc._id);
    const renewals = await ctx.db
      .query("renewals")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .collect();
    for (const doc of renewals) await ctx.db.delete(doc._id);
    const skuMappings = await ctx.db
      .query("skuMappings")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .collect();
    for (const doc of skuMappings) await ctx.db.delete(doc._id);
    const mapping = await ctx.db
      .query("clientMappings")
      .withIndex("by_tenant", (q) => q.eq("tenantDocId", tenant._id))
      .first();
    if (mapping) await ctx.db.delete(mapping._id);

    await ctx.db.delete(tenant._id);
    return null;
  },
});

/** Kick a manual sync for one tenant (runs in the background). */
export const requestSync = mutation({
  args: { tenantDocId: v.id("msTenants") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { user } = await requireWorkspace(ctx);
    const planInfo = await ctx.runQuery(internal.billing.planInfoInternal, {
      userId: user._id,
    });
    if (planInfo.locked) {
      throw new Error("Your trial has ended — pick a plan to keep syncing.");
    }
    await requireTenant(ctx, args.tenantDocId);
    await ctx.scheduler.runAfter(0, internal.sync.syncTenant, {
      tenantDocId: args.tenantDocId,
    });
    return null;
  },
});

// ---- internal helpers used by sync + http callbacks ----

export const getTenantInternal = internalQuery({
  args: { tenantDocId: v.id("msTenants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tenantDocId);
  },
});

export const listActiveTenantsInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const tenants = await ctx.db.query("msTenants").collect();
    return tenants
      .filter((t) => t.status === "connected" || t.status === "error")
      .map((t) => ({ _id: t._id }));
  },
});

export const consumeOauthState = internalMutation({
  args: { state: v.string(), provider: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("oauthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();
    if (!row || row.provider !== args.provider) return null;
    // One-time use; expire after 24h.
    await ctx.db.delete(row._id);
    if (Date.now() - row.createdAt > 24 * 60 * 60 * 1000) return null;
    return {
      workspaceId: row.workspaceId,
      tenantDocId: row.tenantDocId ?? null,
    };
  },
});

export const markConsentResult = internalMutation({
  args: {
    tenantDocId: v.id("msTenants"),
    ok: v.boolean(),
    detail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tenantDocId, {
      status: args.ok ? "connected" : "error",
      statusDetail: args.detail,
    });
    return null;
  },
});
