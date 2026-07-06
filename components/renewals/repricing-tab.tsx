"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";

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
import { money, moneyPerMonth } from "@/lib/format";
import { PRICE_INCREASE_EFFECTIVE, PRICE_SOURCE_URL } from "@/lib/m365-prices";
import { cn } from "@/lib/utils";

type ChecklistRow = NonNullable<
  FunctionReturnType<typeof api.renewals.repricingChecklist>
>[number];

/** "2026-07-01" -> "July 1, 2026" without timezone drift. */
function fmtIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function exportCsv(rows: ChecklistRow[]) {
  const header = [
    "Client",
    "Invoice line",
    "SKU",
    "Seats",
    "You charge /seat/mo",
    "Cost now /seat/mo",
    "Cost after /seat/mo",
    "Increase %",
    "Margin/seat now",
    "Margin/seat after",
    "Flagged",
  ];
  const esc = (v: string | number | boolean) =>
    `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    header,
    ...rows.map((r) => [
      r.clientName,
      r.lineDescription,
      r.skuPartNumber,
      r.quantity,
      r.monthlyChargePerSeat,
      r.oldCost,
      r.newCost,
      r.pctIncrease,
      r.marginNowPerSeat,
      r.marginAfterPerSeat,
      r.flagged ? "yes" : "no",
    ]),
  ]
    .map((row) => row.map(esc).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "trueup-july-2026-repricing.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success("Repricing checklist exported");
}

function Intro() {
  return (
    <p className="text-sm text-muted-foreground">
      Microsoft list prices rose {fmtIsoDate(PRICE_INCREASE_EFFECTIVE)} (
      <a
        href={PRICE_SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
      >
        Microsoft&rsquo;s announcement
        <ExternalLink className="size-3" />
      </a>
      ). Existing subscriptions keep the old cost until their first renewal
      &mdash; this checklist shows every mapped invoice line on an increased
      SKU and what happens to your margin at the client&rsquo;s next renewal.
    </p>
  );
}

function CalculatorCrossLink() {
  return (
    <p className="text-xs text-muted-foreground">
      Quick math for unmapped tenants: the public{" "}
      <Link
        href="/tools/m365-price-checklist"
        className="underline underline-offset-2 hover:text-foreground"
      >
        M365 price-increase calculator
      </Link>
      .
    </p>
  );
}

function RepricingSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-28 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function marginAfterClass(row: ChecklistRow): string {
  if (row.marginAfterPerSeat <= 0) return "text-leak";
  if (row.flagged) return "text-caution";
  return "text-gain";
}

export function RepricingTab() {
  const rows = useQuery(api.renewals.repricingChecklist);
  const status = useQuery(api.workspaces.getWorkspaceStatus);

  if (rows === undefined || status === undefined) {
    return (
      <div className="space-y-4">
        <Intro />
        <RepricingSkeleton />
      </div>
    );
  }

  if (rows === null || rows.length === 0) {
    const hasMappedClients = (status?.mappedClientCount ?? 0) > 0;
    return (
      <div className="space-y-4">
        <Intro />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            {hasMappedClients ? (
              <>
                <CheckCircle2 className="size-8 text-gain" />
                <div className="space-y-1">
                  <p className="font-medium text-gain">
                    None of your mapped SKUs are in the increase &mdash;
                    you&rsquo;re clear.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We checked every mapped invoice line against
                    Microsoft&rsquo;s July 2026 list. Nothing you resell gets
                    more expensive at renewal.
                  </p>
                </div>
              </>
            ) : (
              <>
                <FileSpreadsheet className="size-8 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">No mapped invoice lines yet</p>
                  <p className="text-sm text-muted-foreground">
                    The checklist reads your SKU-to-invoice-line mappings. Map
                    tenants to QuickBooks customers and SKUs to recurring lines
                    first.
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/mapping">Go to mapping</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        <CalculatorCrossLink />
      </div>
    );
  }

  const totalChange =
    Math.round(
      rows.reduce(
        (sum, r) =>
          sum + (r.marginAfterPerSeat - r.marginNowPerSeat) * r.quantity,
        0
      ) * 100
    ) / 100;
  const flaggedCount = rows.filter((r) => r.flagged).length;

  return (
    <div className="space-y-4">
      <Intro />

      <Card>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">
              Margin change if you change nothing
            </p>
            <p className="money mt-1.5 text-3xl font-semibold text-leak">
              {moneyPerMonth(totalChange)}
            </p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              across <span className="money">{rows.length}</span> mapped{" "}
              {rows.length === 1 ? "line" : "lines"} on increased SKUs &middot;{" "}
              <span className="money font-medium text-caution">
                {flaggedCount}
              </span>{" "}
              flagged for re-pricing before renewal
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportCsv(rows)}>
            <Download />
            Export CSV
          </Button>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Client</TableHead>
            <TableHead>Line</TableHead>
            <TableHead className="text-right">Seats</TableHead>
            <TableHead className="text-right">You charge</TableHead>
            <TableHead className="text-right">Cost /seat/mo</TableHead>
            <TableHead className="text-right">Margin /seat</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={`${r.tenantDocId}-${r.skuPartNumber}-${i}`}>
              <TableCell>{r.clientName}</TableCell>
              <TableCell>
                <div className="max-w-[18rem]">
                  <p className="truncate">{r.lineDescription}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.skuName}
                  </p>
                </div>
              </TableCell>
              <TableCell className="money text-right">{r.quantity}</TableCell>
              <TableCell className="money text-right">
                {money(r.monthlyChargePerSeat)}
              </TableCell>
              <TableCell className="text-right">
                <span className="money text-muted-foreground">
                  {money(r.oldCost)}
                </span>
                <ArrowRight className="mx-1 inline size-3 text-muted-foreground" />
                <span className="money">{money(r.newCost)}</span>
                <span className="money ml-1.5 text-xs text-caution">
                  +{r.pctIncrease.toFixed(1)}%
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className="money text-muted-foreground">
                  {money(r.marginNowPerSeat)}
                </span>
                <ArrowRight className="mx-1 inline size-3 text-muted-foreground" />
                <span className={cn("money font-medium", marginAfterClass(r))}>
                  {money(r.marginAfterPerSeat)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {r.flagged ? (
                  <Badge
                    className={cn(
                      "border-transparent",
                      r.marginAfterPerSeat <= 0
                        ? "bg-leak/10 text-leak"
                        : "bg-caution/10 text-caution"
                    )}
                  >
                    Re-price before renewal
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">&mdash;</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <CalculatorCrossLink />
    </div>
  );
}
