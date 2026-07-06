import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";

// Internal mutations for webhook handling
export const internalCreateUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) {
      console.log("User already exists:", args.clerkId);
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
  },
});

export const internalUpdateUser = internalMutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      // If user doesn't exist, create them
      console.log("User not found, creating:", args.clerkId);
      return await ctx.db.insert("users", {
        clerkId: args.clerkId,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
      });
    }

    // Update the user
    await ctx.db.patch(user._id, {
      name: args.name,
      email: args.email,
      imageUrl: args.imageUrl,
    });
    
    return user._id;
  },
});

export const internalDeleteUser = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      console.log("User not found, skipping deletion:", args.clerkId);
      return;
    }

    await ctx.db.delete(user._id);
  },
});

// Ensure a user document exists for the current authenticated identity.
// Returns the user's Convex id and email for downstream consumers.
export const ensureMe = internalMutation({
  args: {},
  returns: v.object({ userId: v.id("users"), email: v.string() }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      // Keep email fresh if it changed on the auth provider
      if (identity.email && identity.email !== existing.email) {
        await ctx.db.patch(existing._id, { email: identity.email });
      }
      return { userId: existing._id, email: identity.email ?? existing.email };
    }

    const createdId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? undefined,
    });
    // Fetch the created doc to return a guaranteed email string
    const created = await ctx.db.get(createdId);
    return { userId: createdId, email: created?.email ?? "" };
  },
});

// Public wrapper to ensure the current user exists; useful from client or actions.
export const ensureMePublic = mutation({
  args: {},
  returns: v.object({ userId: v.id("users"), email: v.string() }),
  handler: async (ctx) => {
    // Reuse the internal logic by directly calling it here
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (existing) {
      if (identity.email && identity.email !== existing.email) {
        await ctx.db.patch(existing._id, { email: identity.email });
      }
      return { userId: existing._id, email: identity.email ?? existing.email };
    }

    const createdId = await ctx.db.insert("users", {
      clerkId: identity.subject,
      name: identity.name ?? "",
      email: identity.email ?? "",
      imageUrl: identity.pictureUrl ?? undefined,
    });
    const created = await ctx.db.get(createdId);
    return { userId: createdId, email: created?.email ?? "" };
  },
});