"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { ArrowRight, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SkuRow } from "@/components/mapping/sku-row";
import {
  NONE_VALUE,
  errorMessage,
  type MappingCustomer,
  type MappingTenant,
} from "@/components/mapping/types";

function StatusBadge({ status }: { status: MappingTenant["status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="outline" className="gap-1.5 text-muted-foreground">
        <span className="size-1.5 rounded-full bg-gain" />
        Connected
      </Badge>
    );
  }
  if (status === "pending_consent") {
    return (
      <Badge variant="outline" className="gap-1.5 border-caution/50 text-caution">
        <span className="size-1.5 rounded-full bg-caution" />
        Pending consent
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="gap-1.5 border-leak/50 text-leak">
        <span className="size-1.5 rounded-full bg-leak" />
        Error
      </Badge>
    );
  }
  return <Badge variant="outline">Disabled</Badge>;
}

export function TenantCard({
  tenant,
  customers,
}: {
  tenant: MappingTenant;
  customers: MappingCustomer[];
}) {
  const setClientMapping = useMutation(api.mappings.setClientMapping);
  const [busy, setBusy] = useState(false);

  const totalSeats = tenant.skus.reduce((sum, s) => sum + s.seatsOwned, 0);

  async function mapToCustomer(customerId: string | null) {
    if (customerId === tenant.customerId) return;
    setBusy(true);
    try {
      await setClientMapping({ tenantDocId: tenant.tenantDocId, customerId });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const showSuggestion = tenant.suggestedCustomer !== null && !tenant.customerId;

  return (
    <Card className="gap-0 overflow-hidden py-0">
      {/* Header: tenant → customer */}
      <div className="flex flex-col gap-2.5 border-b bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="truncate text-sm font-semibold">
                {tenant.displayName}
              </span>
              <StatusBadge status={tenant.status} />
            </div>
            {tenant.skus.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                <span className="money">{tenant.skus.length}</span>{" "}
                {tenant.skus.length === 1 ? "SKU" : "SKUs"} ·{" "}
                <span className="money">{totalSeats}</span> seats
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
            <Select
              value={tenant.customerId ?? NONE_VALUE}
              onValueChange={(value) =>
                void mapToCustomer(value === NONE_VALUE ? null : value)
              }
              disabled={busy}
            >
              <SelectTrigger
                size="sm"
                aria-label={`QuickBooks customer for ${tenant.displayName}`}
                className="w-56 bg-card sm:w-64"
              >
                <span
                  className={cn(
                    "flex-1 truncate text-left",
                    !tenant.customerId && "text-muted-foreground"
                  )}
                >
                  {tenant.customerName ?? "— not mapped —"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>
                  <span className="text-muted-foreground">— not mapped —</span>
                </SelectItem>
                {customers.map((customer) => (
                  <SelectItem
                    key={customer.customerId}
                    value={customer.customerId}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="max-w-[16rem] truncate">
                        {customer.customerName}
                      </span>
                      <span className="money text-xs text-muted-foreground">
                        {customer.lineCount}{" "}
                        {customer.lineCount === 1 ? "line" : "lines"}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {showSuggestion && tenant.suggestedCustomer && (
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="size-3.5 shrink-0 text-caution" />
            <span className="text-xs text-muted-foreground">
              Suggestion:{" "}
              <span className="font-medium text-foreground">
                &ldquo;{tenant.suggestedCustomer.customerName}&rdquo;
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs"
              disabled={busy}
              onClick={() =>
                void mapToCustomer(tenant.suggestedCustomer!.customerId)
              }
            >
              Use
            </Button>
          </div>
        )}
      </div>

      {/* Body */}
      {!tenant.customerId ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          Pick the QuickBooks customer to unlock SKU mapping.
        </p>
      ) : tenant.skus.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">
          No license data from Microsoft yet — SKUs appear here after the first
          sync completes.
        </p>
      ) : (
        <div className="px-5 pb-2">
          {tenant.lines.length === 0 && (
            <p className="pt-3 text-xs text-caution">
              No recurring invoice lines found for {tenant.customerName} in
              QuickBooks — these SKUs stay as potential until lines are synced.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="eyebrow py-2.5 pr-4 text-left font-normal text-muted-foreground">
                    SKU
                  </th>
                  <th className="eyebrow py-2.5 pr-4 text-right font-normal text-muted-foreground">
                    Seats
                  </th>
                  <th className="eyebrow py-2.5 pr-4 text-left font-normal text-muted-foreground">
                    Invoice line
                  </th>
                  <th className="eyebrow py-2.5 pr-4 text-left font-normal text-muted-foreground">
                    Price override
                  </th>
                  <th className="eyebrow py-2.5 text-right font-normal text-muted-foreground">
                    Ignore
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenant.skus.map((sku) => (
                  <SkuRow key={sku.skuId} tenant={tenant} sku={sku} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
