"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { daysUntilLabel, shortDate } from "@/lib/format";
import { skuName } from "@/lib/m365";
import { EST_RULES } from "@/lib/m365-prices";

export type RenewalRow = {
  subscriptionId: string;
  skuPartNumber?: string | null;
  offerName?: string | null;
  totalLicenses: number;
  isTrial: boolean;
  status: string;
  nextLifecycleDateTime?: number | null;
};

function SubStatusBadge({ status }: { status: string }) {
  if (status === "Enabled") {
    return (
      <Badge variant="outline" className="border-gain/40 text-gain">
        enabled
      </Badge>
    );
  }
  if (status === "Warning") {
    return (
      <Badge variant="outline" className="border-caution/50 text-caution">
        warning
      </Badge>
    );
  }
  if (["Suspended", "Deleted", "LockedOut"].includes(status)) {
    return (
      <Badge className="border-transparent bg-leak text-leak-foreground">
        {status.toLowerCase()}
      </Badge>
    );
  }
  return <Badge variant="secondary">{status.toLowerCase()}</Badge>;
}

/** NCE renewal dates for one tenant, with the EST billing-trap flag. */
export function RenewalsTable({ renewals }: { renewals: RenewalRow[] }) {
  // Stable per mount — a render-time Date.now() would drift across re-renders.
  const [now] = useState(() => Date.now());
  if (renewals.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        No subscription data yet — renewal dates arrive with the nightly Graph
        sync.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Subscription</TableHead>
          <TableHead className="text-right">Seats</TableHead>
          <TableHead className="text-right">Status</TableHead>
          <TableHead className="text-right">Next lifecycle</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {renewals.map((r) => {
          const next = r.nextLifecycleDateTime ?? null;
          const daysLeft =
            next === null ? null : Math.ceil((next - now) / 86_400_000);
          const estRisk =
            r.status === "Warning" || (daysLeft !== null && daysLeft < 0);
          const name =
            r.offerName ??
            (r.skuPartNumber ? skuName(r.skuPartNumber) : "Subscription");

          return (
            <TableRow key={r.subscriptionId} className="hover:bg-accent">
              <TableCell className="py-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{name}</span>
                  {r.isTrial && <Badge variant="secondary">trial</Badge>}
                  {estRisk && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="border-caution/50 text-caution"
                        >
                          <AlertTriangle aria-hidden />
                          EST risk
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-80">
                        {EST_RULES.summary}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                {r.skuPartNumber ? (
                  <div className="money mt-0.5 text-[11px] text-muted-foreground">
                    {r.skuPartNumber}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="money text-right">
                {r.totalLicenses.toLocaleString("en-US")}
              </TableCell>
              <TableCell className="text-right">
                <SubStatusBadge status={r.status} />
              </TableCell>
              <TableCell className="text-right">
                {next !== null ? (
                  <>
                    <span className="money">{shortDate(next)}</span>
                    <span className="money ml-2 text-xs text-muted-foreground">
                      {daysUntilLabel(daysLeft)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
