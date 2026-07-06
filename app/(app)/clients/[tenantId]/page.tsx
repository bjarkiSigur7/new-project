"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { money, relativeTime } from "@/lib/format";
import { MoneyHero, Stat, StatStrip } from "@/components/dashboard/money-hero";
import { TenantStatusBadge } from "@/components/dashboard/tenant-status-badge";
import { SkuDiffTable } from "@/components/dashboard/sku-diff-table";
import { SeatHistoryChart } from "@/components/dashboard/seat-history-chart";
import { RenewalsTable } from "@/components/dashboard/renewals-table";
import { billableSeatsOwned } from "@/components/dashboard/client-ledger";

export default function ClientDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const raw = params?.tenantId;
  const tenantDocId = (Array.isArray(raw) ? raw[0] : raw) as
    | Id<"msTenants">
    | undefined;

  const data = useQuery(
    api.dashboard.getClientDetail,
    tenantDocId ? { tenantDocId } : "skip"
  );
  const requestSync = useMutation(api.tenants.requestSync);
  const [syncDisabled, setSyncDisabled] = useState(false);

  async function handleSync() {
    if (!tenantDocId) return;
    try {
      await requestSync({ tenantDocId });
      toast.success("Sync queued — refresh in a moment");
      setSyncDisabled(true);
      setTimeout(() => setSyncDisabled(false), 10_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    }
  }

  if (data === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-14 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const { tenant, diff, seatHistory, renewals } = data;
  const seatsOwned = billableSeatsOwned(diff);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Money screen
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {tenant.displayName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <span className="money text-muted-foreground">
                {tenant.tenantId}
              </span>
              <TenantStatusBadge
                status={tenant.status}
                statusDetail={tenant.statusDetail}
              />
              <span className="text-muted-foreground">
                {tenant.lastSyncAt
                  ? `synced ${relativeTime(tenant.lastSyncAt)}`
                  : "never synced"}
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncDisabled}
          >
            <RefreshCw aria-hidden />
            {syncDisabled ? "Sync queued" : "Sync now"}
          </Button>
        </div>
      </header>

      <MoneyHero
        monthlyLeak={diff.monthlyLeak}
        annualLeak={Math.round(diff.monthlyLeak * 12 * 100) / 100}
        size="md"
        cleanNote="every mapped seat at this client is on an invoice line."
      />

      <StatStrip>
        <Stat
          label="Seats owned"
          value={seatsOwned.toLocaleString("en-US")}
          sub="billable, across all SKUs"
        />
        <Stat
          label="Overbilled"
          value={
            diff.monthlyOverbilled > 0
              ? `${money(diff.monthlyOverbilled)}/mo`
              : money(0)
          }
          sub={
            diff.monthlyOverbilled > 0 ? "credit risk" : "no credit risk"
          }
          tone={diff.monthlyOverbilled > 0 ? "caution" : "default"}
        />
        <Stat
          label="Potential unmapped"
          value={
            diff.estimatedUnmappedValue > 0
              ? `~${money(diff.estimatedUnmappedValue)}/mo`
              : money(0)
          }
          sub={
            diff.estimatedUnmappedValue > 0
              ? "potential, at list price"
              : "every SKU is mapped"
          }
          tone={diff.estimatedUnmappedValue > 0 ? "caution" : "default"}
        />
        <Stat
          label="Unmapped SKUs"
          value={String(diff.unmappedSkuCount)}
          sub="not tied to an invoice line"
          tone={diff.unmappedSkuCount > 0 ? "caution" : "default"}
        />
      </StatStrip>

      {!diff.mapped && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-caution/50 bg-caution/10 px-4 py-3 text-sm">
          <p>
            This tenant isn&apos;t mapped to a QuickBooks customer yet — dollar
            figures below are list-price estimates, not confirmed billing.
          </p>
          <Link
            href="/mapping"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-caution hover:underline"
          >
            Map it now
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      )}

      <section>
        <h2 className="eyebrow mb-3 text-muted-foreground">
          Seat diff by SKU
        </h2>
        <SkuDiffTable rows={diff.rows} />
      </section>

      <section>
        <h2 className="eyebrow mb-3 text-muted-foreground">Seat history</h2>
        <SeatHistoryChart history={seatHistory} />
      </section>

      <section>
        <h2 className="eyebrow mb-3 text-muted-foreground">NCE renewals</h2>
        <RenewalsTable renewals={renewals} />
      </section>
    </div>
  );
}
