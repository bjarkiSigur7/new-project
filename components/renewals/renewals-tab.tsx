"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { AlertTriangle, CalendarClock, ExternalLink } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { EST_RULES } from "@/lib/m365-prices";
import { cn } from "@/lib/utils";

type RenewalRow = NonNullable<
  FunctionReturnType<typeof api.renewals.listRenewals>
>[number];

/** "2026-05-04" -> "May 4, 2026" without timezone drift. */
function fmtIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function EstCallout() {
  return (
    <Card className="border-l-4 border-l-caution py-4">
      <CardContent className="flex gap-3 px-4 sm:px-5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-caution" />
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">No more grace period</p>
          <p className="text-muted-foreground">{EST_RULES.summary}</p>
          <p className="font-medium text-caution">
            Auto-renew OFF without a scheduled cancel converts to a surcharged
            Extended Service Term automatically.
          </p>
          <p className="text-xs text-muted-foreground">
            In effect since {fmtIsoDate(EST_RULES.effectiveDate)} &middot;{" "}
            <a
              href={EST_RULES.source}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
            >
              Microsoft Partner Center: Extended Service Terms
              <ExternalLink className="size-3" />
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryChip({
  value,
  label,
  activeClass,
}: {
  value: number;
  label: string;
  activeClass: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5 rounded-md border bg-card px-3 py-1.5">
      <span
        className={cn(
          "money text-sm font-semibold",
          value > 0 ? activeClass : "text-muted-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Enabled") {
    return (
      <Badge variant="outline" className="border-gain/40 text-gain">
        Enabled
      </Badge>
    );
  }
  if (status === "Warning") {
    return (
      <Badge variant="outline" className="border-caution/40 text-caution">
        Warning
      </Badge>
    );
  }
  if (status === "Suspended" || status === "LockedOut") {
    return (
      <Badge variant="outline" className="border-leak/40 text-leak">
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {status}
    </Badge>
  );
}

function FlagBadges({ row }: { row: RenewalRow }) {
  if (!row.estRisk && !row.repriceOnRenewal) return null;
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {row.estRisk && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="cursor-default border-transparent bg-leak/10 text-leak">
              EST risk +{EST_RULES.monthlySurchargePct}%/+
              {EST_RULES.prepaidSurchargePct}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Past its term end (or in Warning) without a scheduled cancel, this
            subscription converts to a month-to-month Extended Service Term:
            the monthly rate +{EST_RULES.monthlySurchargePct}%, or +
            {EST_RULES.prepaidSurchargePct}% for products with no monthly plan.
            You pay the surcharge whether or not you bill it on.
          </TooltipContent>
        </Tooltip>
      )}
      {row.repriceOnRenewal && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="cursor-default border-transparent bg-caution/10 text-caution">
              Renews at new price
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            Microsoft&rsquo;s July 2026 list increase applies at this
            subscription&rsquo;s first renewal &mdash; re-price the client
            first.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function RenewalsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <CalendarClock className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">No renewal dates yet</p>
          <p className="text-sm text-muted-foreground">
            Renewal dates appear after your first tenant sync.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/onboarding">Connect a tenant</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function RenewalsTab() {
  const renewals = useQuery(api.renewals.listRenewals);

  if (renewals === undefined) {
    return (
      <div className="space-y-4">
        <EstCallout />
        <RenewalsSkeleton />
      </div>
    );
  }

  if (renewals === null || renewals.length === 0) {
    return (
      <div className="space-y-4">
        <EstCallout />
        <EmptyState />
      </div>
    );
  }

  const renewingSoon = renewals.filter(
    (r) => r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 30
  ).length;
  const estRiskCount = renewals.filter((r) => r.estRisk).length;
  const repriceCount = renewals.filter((r) => r.repriceOnRenewal).length;

  return (
    <div className="space-y-4">
      <EstCallout />

      <div className="flex flex-wrap items-center gap-2">
        <SummaryChip
          value={renewingSoon}
          label="renewing in 30 days"
          activeClass="text-foreground"
        />
        <SummaryChip
          value={estRiskCount}
          label="at EST risk"
          activeClass="text-leak"
        />
        <SummaryChip
          value={repriceCount}
          label="repricing due"
          activeClass="text-caution"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Client</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead className="text-right">Seats</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Renewal date</TableHead>
            <TableHead className="text-right">Flags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {renewals.map((r) => {
            const overdue = r.daysLeft !== null && r.daysLeft < 0;
            const emphasized = r.daysLeft !== null && r.daysLeft <= 30;
            const name =
              r.offerName ?? r.skuName ?? r.skuPartNumber ?? "Unknown subscription";
            return (
              <TableRow key={r._id} className={cn(emphasized && "font-medium")}>
                <TableCell>{r.clientName}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="max-w-[22rem] truncate">{name}</span>
                    {r.isTrial && (
                      <Badge
                        variant="outline"
                        className="border-caution/40 font-normal text-caution"
                      >
                        Trial
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="money text-right">
                  {r.totalLicenses}
                </TableCell>
                <TableCell>
                  <StatusBadge status={r.status} />
                </TableCell>
                <TableCell className="text-right">
                  {r.nextLifecycleDateTime === null ? (
                    <span className="text-muted-foreground">&mdash;</span>
                  ) : (
                    <span className={cn("money", overdue && "text-leak")}>
                      {shortDate(r.nextLifecycleDateTime)}
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          overdue ? "text-leak" : "text-muted-foreground"
                        )}
                      >
                        {daysUntilLabel(r.daysLeft)}
                      </span>
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <FlagBadges row={r} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
