import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getWorkspaceForUser, requireWorkspace } from "./lib/access";

const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

/** Idempotent: creates the user's workspace on first sign-in. */
export const ensureWorkspace = mutation({
  args: {},
  returns: v.id("workspaces"),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    let user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        clerkId: identity.subject,
        name: identity.name ?? "",
        email: identity.email ?? "",
        imageUrl: identity.pictureUrl ?? undefined,
      });
      user = (await ctx.db.get(userId))!;
    }

    const existing = await getWorkspaceForUser(ctx, user._id);
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("workspaces", {
      name: user.name ? `${user.name.split(" ")[0]}'s MSP` : "My MSP",
      ownerUserId: user._id,
      createdAt: now,
      trialEndsAt: now + TRIAL_MS,
      digestEnabled: true,
      digestEmail: user.email || undefined,
    });
  },
});

export const getMyWorkspace = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    return await getWorkspaceForUser(ctx, user._id);
  },
});

export const updateWorkspace = mutation({
  args: {
    name: v.optional(v.string()),
    digestEnabled: v.optional(v.boolean()),
    digestEmail: v.optional(v.string()),
    billingDayOfMonth: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { workspace } = await requireWorkspace(ctx);
    const patch: Record<string, unknown> = {};
    if (args.name !== undefined) patch.name = args.name.trim().slice(0, 80);
    if (args.digestEnabled !== undefined) patch.digestEnabled = args.digestEnabled;
    if (args.digestEmail !== undefined) patch.digestEmail = args.digestEmail.trim();
    if (args.billingDayOfMonth !== undefined) {
      if (args.billingDayOfMonth < 1 || args.billingDayOfMonth > 28) {
        throw new Error("Billing day must be between 1 and 28");
      }
      patch.billingDayOfMonth = args.billingDayOfMonth;
    }
    await ctx.db.patch(workspace._id, patch);
    return null;
  },
});

/** Lightweight status used by the app shell (trial banner, setup checklist). */
export const getWorkspaceStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) return null;
    const workspace = await getWorkspaceForUser(ctx, user._id);
    if (!workspace) return null;

    const tenants = await ctx.db
      .query("msTenants")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();
    const connection = await ctx.db
      .query("accountingConnections")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .first();
    const mappings = await ctx.db
      .query("clientMappings")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
      .collect();

    return {
      workspace,
      tenantCount: tenants.length,
      connectedTenantCount: tenants.filter((t) => t.status === "connected").length,
      hasAccounting: connection !== null && connection.status === "connected",
      accountingProvider: connection?.provider ?? null,
      mappedClientCount: mappings.filter((m) => m.confirmed).length,
      trialDaysLeft: Math.max(
        0,
        Math.ceil((workspace.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))
      ),
    };
  },
});
