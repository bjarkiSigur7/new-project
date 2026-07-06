"use client";

import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DEMO_RENEWALS, DEMO_TENANTS } from "@/lib/demo-fixtures";
import { daysUntilLabel } from "@/lib/format";
import { EST_RULES } from "@/lib/m365-prices";
import { cn } from "@/lib/utils";
import { utcDate } from "./utc-date";

// Fixed reference point so the demo renders identically on server and client.
const DEMO_NOW = DEMO_TENANTS[0].lastSyncAt;
const DAY_MS = 86_400_000;

export function RenewalsRail() {
  const renewals = [...DEMO_RENEWALS].sort(
    (a, b) => a.nextLifecycleDateTime - b.nextLifecycleDateTime
  );

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="eyebrow text-muted-foreground">Upcoming renewals</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          NCE lifecycle dates, pulled with the nightly seat sync.
        </p>
      </header>
      <ul className="divide-y">
        {renewals.map((r) => {
          const daysLeft = Math.ceil(
            (r.nextLifecycleDateTime - DEMO_NOW) / DAY_MS
          );
          const soon = daysLeft <= 14;
          return (
            <li key={`${r.tenantKey}-${r.skuPartNumber}`} className="px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {r.clientName}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  {r.isTrial && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground"
                    >
                      trial
                    </Badge>
                  )}
                  {r.status === "Warning" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          tabIndex={0}
                          className="cursor-help border-caution/40 bg-caution/10 text-caution"
                        >
                          <TriangleAlert />
                          EST risk
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-72">
                        {EST_RULES.summary}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </span>
              </div>
              <div className="mt-0.5 truncate text-xs text-muted-foreground">
                {r.offerName}
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-2 text-xs">
                <span className="money text-muted-foreground">
                  {r.totalLicenses} seats
                </span>
                <span
                  className={cn(
                    "money",
                    soon ? "text-caution" : "text-muted-foreground"
                  )}
                >
                  {utcDate(r.nextLifecycleDateTime)} ·{" "}
                  {daysUntilLabel(daysLeft)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="border-t px-4 py-3 text-xs text-muted-foreground">
        {`"Warning" usually means auto-renew is off. Since ${utcDate(
          new Date(EST_RULES.effectiveDate + "T00:00:00Z").getTime()
        )} a lapsed NCE sub gets no free grace period — it converts to a month-to-month Extended Service Term at +${EST_RULES.monthlySurchargePct}%.`}
      </footer>
    </section>
  );
}
