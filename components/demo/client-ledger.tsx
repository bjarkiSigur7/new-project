"use client";

import { Check, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import type { ClientDiff } from "@/lib/diff";
import { money } from "@/lib/format";
import { SkuStatusChip } from "./status-chip";

function seatsSummary(client: ClientDiff) {
  const visible = client.rows.filter((r) => r.status !== "ignored");
  const owned = visible.reduce((s, r) => s + r.seatsOwned, 0);
  const mappedRows = visible.filter((r) => r.seatsBilled !== null);
  const billed = mappedRows.reduce((s, r) => s + (r.seatsBilled ?? 0), 0);
  return { owned, billed: mappedRows.length > 0 ? billed : null };
}

function ClientMoneyCell({ client }: { client: ClientDiff }) {
  if (client.monthlyLeak > 0) {
    return (
      <div className="text-right">
        <div className="money text-sm font-semibold text-leak">
          {money(client.monthlyLeak)}/mo
        </div>
        <div className="text-[11px] text-muted-foreground">under-billed</div>
      </div>
    );
  }
  if (client.monthlyOverbilled > 0) {
    return (
      <div className="text-right">
        <div className="money text-sm font-semibold text-caution">
          {money(client.monthlyOverbilled)}/mo
        </div>
        <div className="text-[11px] text-muted-foreground">
          over-billed · credit risk
        </div>
      </div>
    );
  }
  if (client.estimatedUnmappedValue > 0) {
    return (
      <div className="text-right">
        <div className="money text-sm font-semibold text-caution">
          ~{money(client.estimatedUnmappedValue)}/mo
        </div>
        <div className="text-[11px] text-muted-foreground">
          potential — unmapped
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-end gap-1.5 text-gain">
      <Check className="size-3.5" />
      <span className="text-sm font-medium">Clean</span>
    </div>
  );
}

function HeadHint({ label, hint }: { label: string; hint: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help underline decoration-dotted underline-offset-4">
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">{hint}</TooltipContent>
    </Tooltip>
  );
}

function SkuTable({ client }: { client: ClientDiff }) {
  return (
    <div className="overflow-x-auto border-t bg-muted/30 px-4 py-3 sm:px-6">
      <Table className="min-w-[560px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="eyebrow h-9 text-muted-foreground">
              SKU
            </TableHead>
            <TableHead className="eyebrow h-9 text-right text-muted-foreground">
              <HeadHint
                label="Owned"
                hint="Prepaid seats from Microsoft Graph subscribedSkus — what you pay the distributor for, pulled nightly per tenant."
              />
            </TableHead>
            <TableHead className="eyebrow h-9 text-right text-muted-foreground">
              <HeadHint
                label="Billed"
                hint="Quantity on the QuickBooks recurring invoice line this SKU is mapped to."
              />
            </TableHead>
            <TableHead className="eyebrow h-9 text-right text-muted-foreground">
              $ / seat
            </TableHead>
            <TableHead className="eyebrow h-9 text-right text-muted-foreground">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {client.rows.map((row) => (
            <TableRow key={row.skuId} className="hover:bg-transparent">
              <TableCell className="py-2.5">
                <div className="text-sm">{row.skuName}</div>
                <div className="money text-[11px] text-muted-foreground">
                  {row.skuPartNumber}
                </div>
              </TableCell>
              <TableCell className="money py-2.5 text-right align-top">
                {row.seatsOwned}
              </TableCell>
              <TableCell className="money py-2.5 text-right align-top">
                {row.seatsBilled ?? "—"}
              </TableCell>
              <TableCell className="money py-2.5 text-right align-top">
                {row.monthlyPricePerSeat !== null
                  ? money(row.monthlyPricePerSeat)
                  : "—"}
              </TableCell>
              <TableCell className="py-2.5 text-right align-top">
                <SkuStatusChip row={row} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ClientLedger({
  clients,
  syncedNote,
}: {
  clients: ClientDiff[];
  syncedNote: string;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="eyebrow text-muted-foreground">Client ledger</h2>
        <p className="money text-xs text-muted-foreground">{syncedNote}</p>
      </div>
      <div className="rounded-lg border bg-card">
        <div className="hidden gap-3 border-b px-4 py-2 sm:grid sm:grid-cols-[minmax(0,1fr)_8.5rem_11rem]">
          <span className="eyebrow flex items-center text-muted-foreground">
            Client
          </span>
          <span className="eyebrow text-right text-muted-foreground">
            Seats owned / billed
          </span>
          <span className="eyebrow text-right text-muted-foreground">
            Monthly delta
          </span>
        </div>
        {clients.map((client, i) => {
          const seats = seatsSummary(client);
          return (
            <Collapsible
              key={client.tenantKey}
              defaultOpen={i === 0}
              className="border-b last:border-b-0"
            >
              <CollapsibleTrigger className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/40 sm:grid-cols-[minmax(0,1fr)_8.5rem_11rem]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {client.clientName}
                      </span>
                      {client.unmappedSkuCount > 0 && (
                        <Badge
                          variant="outline"
                          className="border-caution/40 bg-caution/10 text-caution"
                        >
                          <span className="money">
                            {client.unmappedSkuCount}
                          </span>{" "}
                          SKU{client.unmappedSkuCount === 1 ? "" : "s"} unmapped
                        </Badge>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      QuickBooks:{" "}
                      {client.customerName ?? "no customer mapped"}
                    </div>
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <span className="money text-sm">{seats.owned}</span>
                  <span className="text-sm text-muted-foreground"> / </span>
                  <span className="money text-sm">{seats.billed ?? "—"}</span>
                </div>
                <ClientMoneyCell client={client} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SkuTable client={client} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </section>
  );
}
