import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export async function requireUser(ctx: Ctx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
    .unique();
  if (!user) throw new Error("No user record — sign in again");
  return user;
}

export async function getWorkspaceForUser(
  ctx: Ctx,
  userId: Doc<"users">["_id"]
): Promise<Doc<"workspaces"> | null> {
  return await ctx.db
    .query("workspaces")
    .withIndex("by_owner", (q) => q.eq("ownerUserId", userId))
    .first();
}

/** Auth + workspace in one step; throws when either is missing. */
export async function requireWorkspace(
  ctx: Ctx
): Promise<{ user: Doc<"users">; workspace: Doc<"workspaces"> }> {
  const user = await requireUser(ctx);
  const workspace = await getWorkspaceForUser(ctx, user._id);
  if (!workspace) throw new Error("No workspace — complete onboarding first");
  return { user, workspace };
}

/** Assert the current user owns the workspace the tenant belongs to. */
export async function requireTenant(ctx: Ctx, tenantDocId: Doc<"msTenants">["_id"]) {
  const { workspace } = await requireWorkspace(ctx);
  const tenant = await ctx.db.get(tenantDocId);
  if (!tenant || tenant.workspaceId !== workspace._id) {
    throw new Error("Tenant not found");
  }
  return { workspace, tenant };
}

export function randomToken(): string {
  // Convex's runtime provides seeded randomness in mutations; this is a nonce,
  // not a secret key — pair it with the row lookup for validation.
  return Array.from({ length: 4 }, () =>
    Math.random().toString(36).slice(2, 10)
  ).join("");
}
