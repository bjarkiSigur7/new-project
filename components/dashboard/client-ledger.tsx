"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { money } from "@/lib/format";
import type { ClientDiff } from "@/lib/diff";

/** Seats the MSP is actually paying for — ignored (free/viral) SKUs excluded. */
export function billableSeatsOwned(client: ClientDiff): number {
  return client.rows
    .filter((r) => r.status !== "ignored")
    .reduce((sum, r) => sum + r.seatsOwned, 0);
}

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Client-side CSV of the ledger table, downloaded via a Blob. */
export function exportLedgerCsv(clients: ClientDiff[]) {
  const header = [
    "Client",
    "QuickBooks customer",
    "Mapped",
    "Seats owned",
    "Monthly leak (USD)",
    "Monthly overbilled (USD)",
    "Potential unmapped, est. (USD)",
    "Unmapped SKUs",
  ];
  const rows = clients.map((c) => [
    c.clientName,
    c.customerName ?? "",
    c.mapped ? "yes" : "no",
    billableSeatsOwned(c),
    c.monthlyLeak.toFixed(2),
    c.monthlyOverbilled.toFixed(2),
    c.estimatedUnmappedValue.toFixed(2),
    c.unmappedSkuCount,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `trueup-unbilled-seats-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** The per-client ruled ledger on the money screen. */
export function ClientLedger({ clients }: { clients: ClientDiff[] }) {
  const router = useRouter();

  if (clients.length === 0) {
    return (
      <p className="border-y py-8 text-center text-sm text-muted-foreground">
        No client tenants yet.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Client</TableHead>
          <TableHead className="w-28">Mapping</TableHead>
          <TableHead className="text-right">Seats owned</TableHead>
          <TableHead className="text-right">Monthly leak</TableHead>
          <TableHead className="text-right">~Potential</TableHead>
          <TableHead className="w-8" aria-label="Open client" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const href = `/clients/${client.tenantKey}` as Route;
          return (
            <TableRow
              key={client.tenantKey}
              className="cursor-pointer hover:bg-accent"
              onClick={() => router.push(href)}
            >
              <TableCell className="py-3">
                <div className="font-medium">{client.clientName}</div>
                {client.customerName ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {client.customerName}
                  </div>
                ) : null}
              </TableCell>
              <TableCell>
                {client.mapped ? (
                  <Badge
                    variant="outline"
                    className="border-gain/40 text-gain"
                  >
                    mapped
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-caution/50 text-caution"
                  >
                    unmapped
                  </Badge>
                )}
              </TableCell>
              <TableCell className="money text-right">
                {billableSeatsOwned(client).toLocaleString("en-US")}
              </TableCell>
              <TableCell className="text-right">
                {client.monthlyLeak > 0 ? (
                  <span className="money font-medium text-leak">
                    {money(client.monthlyLeak)}
                  </span>
                ) : (
                  <span className="text-xs text-gain">clean</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {client.estimatedUnmappedValue > 0 ? (
                  <span>
                    <span className="money text-caution">
                      ~{money(client.estimatedUnmappedValue)}
                    </span>
                    {client.unmappedSkuCount > 0 ? (
                      <span className="ml-2 rounded-sm border border-caution/40 px-1 py-px text-[10px] text-caution">
                        <span className="money">
                          {client.unmappedSkuCount}
                        </span>{" "}
                        unmapped SKU{client.unmappedSkuCount === 1 ? "" : "s"}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="pr-2 text-right">
                <Link
                  href={href}
                  aria-label={`Open ${client.clientName}`}
                  className="inline-flex text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ChevronRight className="size-4" aria-hidden />
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
