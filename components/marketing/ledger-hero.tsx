// The hero's one bold moment: a static ledger card rendered from the demo
// workspace — real output of the production diff engine, not invented numbers.
// Server component; all data is computed at render time from lib/demo-fixtures.

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ClientDiff, WorkspaceDiff } from "@/lib/diff";
import { money } from "@/lib/format";

function RowNote({ client }: { client: ClientDiff }) {
  const under = client.rows.filter((r) => r.status === "underbilled");
  if (under.length > 0) {
    const top = under[0];
    return (
      <>
        {top.skuName}: <span className="money">{top.seatsOwned}</span> seats
        owned, <span className="money">{top.seatsBilled ?? 0}</span> on the
        invoice
        {under.length > 1 ? (
          <>
            {" "}
            · <span className="money">+{under.length - 1}</span> more SKU
          </>
        ) : null}
      </>
    );
  }
  const unmapped = client.rows.filter((r) => r.status === "unmapped");
  const seats = unmapped.reduce((sum, r) => sum + r.seatsOwned, 0);
  return (
    <>
      <span className="money">{seats}</span> seats across{" "}
      <span className="money">{unmapped.length}</span> SKUs not mapped to any
      invoice yet
    </>
  );
}

function AmountCell({ client }: { client: ClientDiff }) {
  if (client.monthlyLeak > 0) {
    return (
      <div className="shrink-0 text-right">
        <div className="money text-base font-medium text-leak sm:text-lg">
          {money(client.monthlyLeak)}
        </div>
        <div className="eyebrow text-muted-foreground/80">confirmed / mo</div>
      </div>
    );
  }
  return (
    <div className="shrink-0 text-right">
      <div className="money text-base font-medium text-caution sm:text-lg">
        ~{money(client.estimatedUnmappedValue)}
      </div>
      <div className="eyebrow text-muted-foreground/80">potential / mo</div>
    </div>
  );
}

export function LedgerHero({ diff }: { diff: WorkspaceDiff }) {
  const topClients = diff.clients.slice(0, 3);

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Classic ledger margin rule. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-7 hidden w-px bg-leak/25 sm:block"
      />

      <div className="px-6 py-8 sm:px-12 sm:py-10">
        <p className="eyebrow text-muted-foreground">
          Found last night · sample workspace ·{" "}
          <span className="money">{diff.totalClients}</span> client tenants
        </p>
        <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="display text-6xl font-medium tracking-tight text-leak sm:text-7xl">
            {money(diff.totalMonthlyLeak, { cents: false })}
          </span>
          <span className="display text-2xl text-leak/80 sm:text-3xl">/mo</span>
        </div>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Confirmed under-billing —{" "}
          <span className="money">
            {money(diff.totalAnnualLeak, { cents: false })}
          </span>{" "}
          a year — plus{" "}
          <span className="money text-caution">
            ~{money(diff.totalEstimatedUnmappedValue, { cents: false })}/mo
          </span>{" "}
          potential on seats not yet mapped to an invoice line.
        </p>
      </div>

      <div className="border-t">
        <div className="flex items-center justify-between gap-4 border-b bg-muted/40 px-6 py-2 sm:px-12">
          <span className="eyebrow text-muted-foreground/80">Client</span>
          <span className="eyebrow text-muted-foreground/80">Unbilled</span>
        </div>
        {topClients.map((client) => (
          <div
            key={client.tenantKey}
            className="flex items-center justify-between gap-4 border-b px-6 py-4 last:border-b-0 sm:px-12"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {client.clientName}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                <RowNote client={client} />
              </p>
            </div>
            <AmountCell client={client} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-6 py-3 sm:px-12">
        <p className="text-xs text-muted-foreground">
          Same diff engine as production, run on the demo workspace.
        </p>
        <Link
          href="/demo"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Walk through all <span className="money">{diff.totalClients}</span>{" "}
          tenants
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}
