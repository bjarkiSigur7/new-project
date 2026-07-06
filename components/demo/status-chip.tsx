"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SkuDiffRow } from "@/lib/diff";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

const CHIP_STYLES: Record<SkuDiffRow["status"], string> = {
  underbilled: "border-leak/30 bg-leak/10 text-leak",
  overbilled: "border-caution/40 bg-caution/10 text-caution",
  unmapped: "border-caution/40 bg-caution/10 text-caution",
  ok: "border-gain/40 bg-transparent text-gain",
  ignored: "border-border bg-transparent text-muted-foreground",
};

function chipLabel(row: SkuDiffRow): string {
  switch (row.status) {
    case "underbilled":
      return `${money(row.monthlyLeak)}/mo under-billed`;
    case "overbilled":
      return `${money(row.monthlyOverbilled)}/mo over-billed`;
    case "unmapped":
      return row.estimatedUnbilledValue > 0
        ? `~${money(row.estimatedUnbilledValue)}/mo potential`
        : "unmapped";
    case "ok":
      return "ok";
    case "ignored":
      return "ignored";
  }
}

function chipTooltip(row: SkuDiffRow): string {
  switch (row.status) {
    case "underbilled":
      return `The tenant owns ${row.seatsOwned} seats but the mapped invoice line bills ${row.seatsBilled}. Confirmed at your own price of ${money(row.monthlyPricePerSeat ?? 0)}/seat/mo — this is real money, not an estimate.`;
    case "overbilled":
      return `The invoice bills ${row.seatsBilled} seats but the tenant only owns ${row.seatsOwned}. Credit risk if the client counts seats before you do.`;
    case "unmapped":
      return "No invoice line is mapped to this SKU, so nothing is billed against it. Value is estimated at Microsoft list price — potential, not confirmed dollars, until you map or ignore it.";
    case "ok":
      return "Seats owned match seats billed. Nothing to do here.";
    case "ignored":
      return "Marked non-billable, so it is excluded from the diff.";
  }
}

export function SkuStatusChip({ row }: { row: SkuDiffRow }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          tabIndex={0}
          className={cn("money cursor-help", CHIP_STYLES[row.status])}
        >
          {chipLabel(row)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-64">
        {chipTooltip(row)}
      </TooltipContent>
    </Tooltip>
  );
}
