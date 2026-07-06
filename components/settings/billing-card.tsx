"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { PLANS, type PlanKey } from "@/lib/plans";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const PAID_PLANS: PlanKey[] = ["starter", "pro", "scale"];

const PRODUCT_KEY: Record<string, "starterMonthly" | "proMonthly" | "scaleMonthly"> = {
  starter: "starterMonthly",
  pro: "proMonthly",
  scale: "scaleMonthly",
};

export function BillingCard() {
  const me = useQuery(api.billing.getCurrentUser);
  const products = useQuery(api.billing.getConfiguredProducts);
  const cancelSubscription = useAction(api.billing.cancelCurrentSubscription);
  const syncProducts = useAction(api.billing.syncProducts);

  const [cancelling, setCancelling] = useState(false);
  const [syncing, setSyncing] = useState(false);

  if (me === undefined || products === undefined) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow text-muted-foreground">02 · Plan &amp; billing</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const { planInfo, subscription, isFree } = me;
  const productIdFor = (plan: PlanKey): string | null =>
    products?.[PRODUCT_KEY[plan]]?.id ?? null;
  const noProductsConfigured = PAID_PLANS.every((p) => productIdFor(p) === null);

  async function handleCancel() {
    setCancelling(true);
    try {
      await cancelSubscription({ revokeImmediately: false });
      toast.success("Subscription will cancel at the end of the period");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCancelling(false);
    }
  }

  async function handleSyncProducts() {
    setSyncing(true);
    try {
      await syncProducts({});
      toast.success("Products synced from Polar");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-muted-foreground">02 · Plan &amp; billing</p>
        <CardDescription>
          Billed monthly through Polar. Change or cancel any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Current plan banner */}
        {planInfo.locked ? (
          <div className="rounded-md border border-leak/50 bg-leak/10 px-4 py-3 text-sm">
            <span className="font-medium text-leak">Trial ended</span>{" "}
            <span className="text-foreground">
              — syncs are paused. Pick a plan to resume.
            </span>
          </div>
        ) : planInfo.plan === "trial" ? (
          <div
            className={cn(
              "flex items-center justify-between rounded-md border px-4 py-3 text-sm",
              planInfo.trialDaysLeft <= 4
                ? "border-caution/50 bg-caution/10"
                : "border-border bg-muted/40"
            )}
          >
            <span>
              You&apos;re on the <span className="font-medium">free trial</span>
            </span>
            <span
              className={cn(
                "money",
                planInfo.trialDaysLeft <= 4
                  ? "font-medium text-caution"
                  : "text-muted-foreground"
              )}
            >
              {planInfo.trialDaysLeft} {planInfo.trialDaysLeft === 1 ? "day" : "days"} left
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-gain/40 bg-gain/10 px-4 py-3 text-sm">
            <span>
              You&apos;re on{" "}
              <span className="font-medium">
                {planInfo.subscriptionProductName ?? PLANS[planInfo.plan].name}
              </span>
            </span>
            <Badge className="border-gain/40 bg-gain/15 text-gain" variant="outline">
              Active
            </Badge>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {PAID_PLANS.map((key) => {
            const plan = PLANS[key];
            const isCurrent = planInfo.plan === key;
            const productId = productIdFor(key);
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col rounded-md border p-4",
                  isCurrent ? "border-gain ring-1 ring-gain/40" : "border-border"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold">{plan.name}</p>
                  {isCurrent ? (
                    <Badge
                      variant="outline"
                      className="border-gain/40 bg-gain/10 text-gain"
                    >
                      Current
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2">
                  <span className="money text-2xl font-semibold tracking-tight">
                    {plan.priceMonthlyUsd !== null
                      ? money(plan.priceMonthlyUsd, { cents: false })
                      : "—"}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {plan.tenantLimit !== null ? (
                    <>
                      Up to <span className="money">{plan.tenantLimit}</span>{" "}
                      client tenants
                    </>
                  ) : (
                    "Unlimited client tenants"
                  )}
                </p>
                <ul className="mt-3 flex-1 space-y-1.5 border-t border-border pt-3">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-3 shrink-0 text-gain" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  {isCurrent ? (
                    <Button variant="outline" className="w-full" disabled>
                      Current plan
                    </Button>
                  ) : productId ? (
                    <CheckoutLink
                      polarApi={api.billing}
                      productIds={[productId]}
                      embed={false}
                      className="block"
                    >
                      <Button className="w-full">Choose {plan.name}</Button>
                    </CheckoutLink>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block w-full" tabIndex={0}>
                          <Button className="w-full" disabled>
                            Choose {plan.name}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Billing not configured yet</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage / cancel for active subscriptions */}
        {subscription ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <CustomerPortalLink
              polarApi={{
                generateCustomerPortalUrl: api.billing.generateCustomerPortalUrl,
              }}
            >
              <Button variant="outline">Manage billing</Button>
            </CustomerPortalLink>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : null}
                  Cancel at period end
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your plan stays active until the end of the current billing
                    period. After that, nightly syncs pause and you keep
                    read-only access to your data.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep subscription</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleCancel()}>
                    Cancel at period end
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        {/* Admin note when no Polar products are configured */}
        {isFree && noProductsConfigured ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs text-muted-foreground">
              No Polar products are configured on this deployment yet, so
              checkout is disabled. If you run this deployment, sync products
              from Polar after setting the product env vars.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleSyncProducts()}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Sync products from Polar
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
