import { v } from "convex/values";
import { mutation } from "./_generated/server";

/** Lead-magnet email capture (repricing calculator, landing page). Public. */
export const captureLead = mutation({
  args: {
    email: v.string(),
    source: v.string(),
    meta: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("That doesn't look like an email address.");
    }
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    if (existing.some((l) => l.source === args.source)) return null;
    await ctx.db.insert("leads", {
      email,
      source: args.source.slice(0, 40),
      meta: args.meta?.slice(0, 500),
      createdAt: Date.now(),
    });
    return null;
  },
});
