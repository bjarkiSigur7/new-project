"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAction } from "convex/react";
import { CheckoutLink, CustomerPortalLink } from "@convex-dev/polar/react";
import { api } from "@/convex/_generated/api";

export default function SectionBilling() {
  const products = useQuery(api.example.getConfiguredProducts);
  const changeSubscription = useAction(api.example.changeCurrentSubscription);
  const cancelSubscription = useAction(api.example.cancelCurrentSubscription);
  const sync = useAction(api.polarSync.syncProducts);
  const subscription = useQuery(api.example.getCurrentUser);
  const ensureMe = useMutation(api.users.ensureMePublic);
  const [renderedAt] = useState(() => Date.now());

  useEffect(() => {
    // Ensure a user document exists so Polar can create a customer.
    void ensureMe({});
  }, [ensureMe]);

  const { productIds } = useMemo(() => {
    if (!products) {
      return { productIds: [] as string[] };
    }
    const monthly = products.premiumMonthly ?? null;
    const ids = [monthly?.id].filter((v) => Boolean(v)) as string[];
    return { productIds: ids };
  }, [products]);

  if (!products) return null;

  const sub = subscription?.subscription;
  const isCancelled = Boolean(
    sub?.cancelAtPeriodEnd === true ||
      sub?.status === "canceled" ||
      sub?.status === "cancelled"
  );
  const periodEndDate = sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  const msLeft = periodEndDate ? periodEndDate.getTime() - renderedAt : 0;
  const daysLeft = msLeft > 0 ? Math.ceil(msLeft / (1000 * 60 * 60 * 24)) : 0;

  return (
    <section className="flex flex-col gap-4 max-w-xl">
      <h2 className="text-2xl font-semibold">Billing</h2>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded-md border p-4">
          <div className="flex flex-col">
            <span className="font-medium">{subscription?.subscription?.product?.name ?? "Free"}</span>
            <span className="text-sm text-muted-foreground">
              ${(((subscription?.subscription?.product?.prices[0]?.priceAmount ?? 0) / 100)).toFixed(2)} / month
            </span>
            {isCancelled && (
              <span className="text-xs text-destructive mt-1">
                Subscription is cancelled{periodEndDate ? ` • ends ${periodEndDate.toLocaleDateString()} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left)` : ""}
              </span>
            )}
          </div>
          {!sub && (
            <CheckoutLink polarApi={api.example} productIds={productIds} embed={false}>
              <button className="bg-foreground text-background px-3 py-2 rounded-md">Upgrade</button>
            </CheckoutLink>
          )}
          {sub && isCancelled && (
            <CustomerPortalLink
            polarApi={{
              generateCustomerPortalUrl: api.example.generateCustomerPortalUrl,
            }}
          >
            <button className="bg-foreground text-background px-3 py-2 rounded-md">Resubscribe</button>
          </CustomerPortalLink>
          )}
          {sub && !isCancelled && (
            <CustomerPortalLink
              polarApi={{
                generateCustomerPortalUrl: api.example.generateCustomerPortalUrl,
              }}
            >
              <button className="bg-secondary text-secondary-foreground px-3 py-2 rounded-md">Manage Subscription</button>
            </CustomerPortalLink>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="border px-3 py-2 rounded-md"
          onClick={async () => {
            if (productIds.length > 0) {
              await changeSubscription({ productId: productIds[0] });
            }
          }}
        >
          Change to first plan
        </button>
        <button
          className="border px-3 py-2 rounded-md"
          onClick={async () => {
            await cancelSubscription({ revokeImmediately: false });
          }}
        >
          Cancel at period end
        </button>
        {productIds.length === 0 && (
          <button
            className="border px-3 py-2 rounded-md"
            onClick={async () => {
              await sync({});
            }}
          >
            Sync Products
          </button>
        )}
      </div>
    </section>
  );
}


