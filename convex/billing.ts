import { Polar } from "@convex-dev/polar";
import { v } from "convex/values";
import { components, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { action, internalQuery, query } from "./_generated/server";
import { getWorkspaceForUser, requireUser } from "./lib/access";
import { tenantLimitFor, type PlanKey } from "../lib/plans";

export const polar = new Polar(components.polar, {
  getUserInfo: async (ctx) => {
    const user: { _id: Id<"users">; email: string } = await ctx.runQuery(
      api.user.getMe,
      {}
    );
    return { userId: user._id, email: user.email };
  },
  products: {
    starterMonthly: process.env.POLAR_PRODUCT_STARTER_MONTHLY ?? "",
    proMonthly: process.env.POLAR_PRODUCT_PRO_MONTHLY ?? "",
    scaleMonthly: process.env.POLAR_PRODUCT_SCALE_MONTHLY ?? "",
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

export const syncProducts = action({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await polar.syncProducts(ctx);
    return null;
  },
});

function planFromProductId(productId: string | undefined): PlanKey | null {
  if (!productId) return null;
  if (productId === process.env.POLAR_PRODUCT_STARTER_MONTHLY) return "starter";
  if (productId === process.env.POLAR_PRODUCT_PRO_MONTHLY) return "pro";
  if (productId === process.env.POLAR_PRODUCT_SCALE_MONTHLY) return "scale";
  return null;
}

export type PlanInfo = {
  plan: PlanKey;
  tenantLimit: number | null;
  /** Trial over and no subscription: views stay open, syncs/additions stop. */
  locked: boolean;
  trialDaysLeft: number;
  subscriptionProductName: string | null;
};

async function planInfoForUser(
  ctx: Parameters<typeof getWorkspaceForUser>[0],
  userId: Id<"users">
): Promise<PlanInfo> {
  const workspace = await getWorkspaceForUser(ctx, userId);
  const subscription = await polar.getCurrentSubscription(ctx, { userId });
  const paidPlan = planFromProductId(subscription?.productId);
  const trialDaysLeft = workspace
    ? Math.max(
        0,
        Math.ceil((workspace.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))
      )
    : 0;

  if (paidPlan) {
    return {
      plan: paidPlan,
      tenantLimit: tenantLimitFor(paidPlan),
      locked: false,
      trialDaysLeft,
      subscriptionProductName: subscription?.product?.name ?? null,
    };
  }
  return {
    plan: "trial",
    tenantLimit: tenantLimitFor("trial"),
    locked: trialDaysLeft <= 0,
    trialDaysLeft,
    subscriptionProductName: null,
  };
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    const planInfo = await planInfoForUser(ctx, user._id);
    return { ...user, subscription, isFree: !subscription, planInfo };
  },
});

/** Gating info for mutations/actions (tenant limits, lock state). */
export const planInfoInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<PlanInfo> => {
    return await planInfoForUser(ctx, args.userId);
  },
});
