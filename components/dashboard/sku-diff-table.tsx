"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
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
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SkuDiffRow } from "@/lib/diff";

function StatusChip({ status }: { status: SkuDiffRow["status"] }) {
  switch (status) {
    case "underbilled":
      return (
        <Badge className="border-transparent bg-leak text-leak-foreground">
          underbilled
        </Badge>
      );
    case "overbilled":
      return (
        <Badge variant="outline" className="border-caution/50 text-caution">
          overbilled
        </Badge>
      );
    case "unmapped":
      return (
        <Badge variant="outline" className="border-caution/50 text-caution">
          unmapped
        </Badge>
      );
    case "ignored":
      return <Badge variant="secondary">ignored</Badge>;
    case "ok":
      return (
        <Badge variant="outline" className="border-gain/40 text-gain">
          ok
        </Badge>
      );
  }
}

function DeltaCell({ row }: { row: SkuDiffRow }) {
  if (row.status === "underbilled") {
    return (
      <span className="money font-medium text-leak">
        {money(row.monthlyLeak)}
      </span>
    );
  }
  if (row.status === "overbilled") {
    return (
      <span className="money text-caution">
        {money(row.monthlyOverbilled)}
      </span>
    );
  }
  if (row.status === "unmapped") {
    if (row.estimatedUnbilledValue > 0) {
      return (
        <span>
          <span className="money text-caution">
            ~{money(row.estimatedUnbilledValue)}
          </span>{" "}
          <span className="text-[11px] text-caution/80">potential</span>
        </span>
      );
    }
    return <span className="text-muted-foreground">—</span>;
  }
  if (row.status === "ok") {
    return <span className="money text-muted-foreground">{money(0)}</span>;
  }
  return <span className="text-muted-foreground">—</span>;
}

function SkuRow({ row, dimmed }: { row: SkuDiffRow; dimmed?: boolean }) {
  return (
    <TableRow className={cn("hover:bg-accent", dimmed && "opacity-60")}>
      <TableCell className="py-3">
        <div className="font-medium">{row.skuName}</div>
        <div className="money mt-0.5 text-[11px] text-muted-foreground">
          {row.skuPartNumber}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <span className="money">
          {row.seatsOwned.toLocaleString("en-US")}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="money text-muted-foreground">
              {" / "}
              {row.seatsAssigned.toLocaleString("en-US")}
            </span>
          </TooltipTrigger>
          <TooltipContent>Assigned to users</TooltipContent>
        </Tooltip>
      </TableCell>
      <TableCell className="text-right">
        {row.seatsBilled !== null ? (
          <span className="money">
            {row.seatsBilled.toLocaleString("en-US")}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {row.monthlyPricePerSeat !== null ? (
          <span className="money">{money(row.monthlyPricePerSeat)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <DeltaCell row={row} />
      </TableCell>
      <TableCell className="text-right">
        <StatusChip status={row.status} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Per-SKU diff for one client tenant. Ignored (free/viral or user-ignored)
 * SKUs are collapsed behind a toggle so they never read as leaks.
 */
export function SkuDiffTable({ rows }: { rows: SkuDiffRow[] }) {
  const [showIgnored, setShowIgnored] = useState(false);
  const visible = rows.filter((r) => r.status !== "ignored");
  const ignored = rows.filter((r) => r.status === "ignored");

  if (rows.length === 0) {
    return (
      <p className="border-y py-8 text-center text-sm text-muted-foreground">
        No SKUs yet — seat data arrives with the first Graph sync.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>SKU</TableHead>
          <TableHead className="text-right">Owned / assigned</TableHead>
          <TableHead className="text-right">Billed</TableHead>
          <TableHead className="text-right">$/seat/mo</TableHead>
          <TableHead className="text-right">Monthly delta</TableHead>
          <TableHead className="w-28 text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.map((row) => (
          <SkuRow key={row.skuId} row={row} />
        ))}
        {ignored.length > 0 && (
          <>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6} className="p-0">
                <button
                  type="button"
                  onClick={() => setShowIgnored((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-2 py-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showIgnored ? (
                    <ChevronDown className="size-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="size-3.5" aria-hidden />
                  )}
                  <span className="money">{ignored.length}</span> ignored SKU
                  {ignored.length === 1 ? "" : "s"} (free or marked
                  non-billable)
                </button>
              </TableCell>
            </TableRow>
            {showIgnored &&
              ignored.map((row) => (
                <SkuRow key={row.skuId} row={row} dimmed />
              ))}
          </>
        )}
      </TableBody>
    </Table>
  );
}
