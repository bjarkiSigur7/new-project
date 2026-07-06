"use client";

import { useQuery } from "convex/react";
import { Download } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { money, relativeTime } from "@/lib/format";
import { MoneyHero, Stat, StatStrip } from "@/components/dashboard/money-hero";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import {
  ClientLedger,
  exportLedgerCsv,
} from "@/components/dashboard/client-ledger";

export default function DashboardPage() {
  const data = useQuery(api.dashboard.getMoneyScreen);

  // Loading — the query hasn't resolved yet.
  if (data === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-10">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-16 w-80" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 gap-8 border-y py-5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (
    data === null ||
    !data.setup.hasTenants ||
    !data.setup.hasAccounting ||
    data.setup.mappedClients === 0
  ) {
    const setup = data?.setup;
    return (
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="eyebrow text-muted-foreground">Money screen</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Unbilled seats
          </h1>
        </header>
        <SetupChecklist
          hasTenants={setup?.hasTenants ?? false}
          hasAccounting={setup?.hasAccounting ?? false}
          hasMappedClients={(setup?.mappedClients ?? 0) > 0}
        />
      </div>
    );
  }

  const { diff } = data;
  const lastSyncAt = diff.clients.reduce<number | null>(
    (max, c) =>
      c.lastSyncAt != null && (max === null || c.lastSyncAt > max)
        ? c.lastSyncAt
        : max,
    null
  );

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-muted-foreground">Money screen</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Unbilled seats
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportLedgerCsv(diff.clients)}
        >
          <Download aria-hidden />
          Export CSV
        </Button>
      </header>

      <MoneyHero
        monthlyLeak={diff.totalMonthlyLeak}
        annualLeak={diff.totalAnnualLeak}
        size="lg"
        cleanNote="every mapped seat across your tenants is on an invoice line."
      />

      <StatStrip>
        <Stat
          label="Overbilled"
          value={
            diff.totalMonthlyOverbilled > 0
              ? `${money(diff.totalMonthlyOverbilled)}/mo`
              : money(0)
          }
          sub={
            diff.totalMonthlyOverbilled > 0
              ? "credit risk — billing seats you don't hold"
              : "no credit risk"
          }
          tone={diff.totalMonthlyOverbilled > 0 ? "caution" : "default"}
        />
        <Stat
          label="Potential unmapped"
          value={
            diff.totalEstimatedUnmappedValue > 0
              ? `~${money(diff.totalEstimatedUnmappedValue)}/mo`
              : money(0)
          }
          sub={
            diff.totalEstimatedUnmappedValue > 0
              ? "potential, at list price — map SKUs to confirm"
              : "every SKU is mapped"
          }
          tone={diff.totalEstimatedUnmappedValue > 0 ? "caution" : "default"}
        />
        <Stat
          label="Clients affected"
          value={`${diff.clientsWithLeaks}/${diff.totalClients}`}
          sub="tenants with a confirmed leak"
          tone={diff.clientsWithLeaks > 0 ? "leak" : "gain"}
        />
        <Stat
          label="Last sync"
          value={lastSyncAt ? relativeTime(lastSyncAt) : "never"}
          sub="most recent Graph pull"
        />
      </StatStrip>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow text-muted-foreground">Client ledger</h2>
          {diff.clientsUnmapped > 0 ? (
            <span className="text-xs text-muted-foreground">
              <span className="money">{diff.clientsUnmapped}</span> of{" "}
              <span className="money">{diff.totalClients}</span> tenants not
              yet mapped
            </span>
          ) : null}
        </div>
        <ClientLedger clients={diff.clients} />
      </section>
    </div>
  );
}
