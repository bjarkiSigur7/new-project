import { Polar } from "@convex-dev/polar";
import { components, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { query } from "./_generated/server";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user: { _id: Id<"users">; email: string } = await ctx.runQuery(
      api.user.getMe,
      {}
    );
    return {
      userId: user._id,
      email: user.email,
    };
  },
  products: {
    premiumMonthly: process.env.POLAR_PRODUCT_PREMIUM_MONTHLY ?? "",
  },
});

export const {
  changeCurrentSubscription,
  cancelCurrentSubscription,
  getConfiguredProducts,
  listAllProducts,
  generateCheckoutLink,
  generateCustomerPortalUrl,
} = polar.api();

export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!user) throw new Error("No user found");

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });

    return {
      ...user,
      subscription,
      isFree: !subscription,
    };
  },
});
