"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  NONE_VALUE,
  errorMessage,
  intervalSuffix,
  lineLabel,
  type MappingSku,
  type MappingTenant,
} from "@/components/mapping/types";

export function SkuRow({
  tenant,
  sku,
}: {
  tenant: MappingTenant;
  sku: MappingSku;
}) {
  const setSkuMapping = useMutation(api.mappings.setSkuMapping);
  const [busy, setBusy] = useState(false);

  const ignored = sku.mapping?.ignore ?? false;
  const lineKey = sku.mapping?.lineKey ?? null;
  const serverPrice = sku.mapping?.monthlyPricePerSeat ?? null;

  // Local draft for the price override; re-synced whenever the server value
  // changes (Convex reactivity pushes the committed value back down).
  const [price, setPrice] = useState(serverPrice === null ? "" : String(serverPrice));
  useEffect(() => {
    setPrice(serverPrice === null ? "" : String(serverPrice));
  }, [serverPrice]);

  const selectedLine = lineKey
    ? tenant.lines.find((l) => l.key === lineKey) ?? null
    : null;
  const suggestedLine = sku.suggestedLineKey
    ? tenant.lines.find((l) => l.key === sku.suggestedLineKey) ?? null
    : null;
  // "Use suggestion" affordance: a suggested line exists and no line is mapped.
  const suggestionPending = sku.suggestedLineKey !== null && !lineKey;
  // Stronger highlight: nothing about this SKU has been touched at all.
  const highlight = sku.suggestedLineKey !== null && sku.mapping === null;

  async function commit(patch: {
    lineKey?: string | null;
    monthlyPricePerSeat?: number | null;
    ignore?: boolean;
  }) {
    setBusy(true);
    try {
      await setSkuMapping({
        tenantDocId: tenant.tenantDocId,
        skuId: sku.skuId,
        ...patch,
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function handleLineChange(value: string) {
    const next = value === NONE_VALUE ? null : value;
    if (next === lineKey) return;
    void commit({ lineKey: next });
  }

  function commitPrice() {
    const trimmed = price.trim();
    const next = trimmed === "" ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      toast.error("Enter a valid per-seat price, or leave blank for auto.");
      setPrice(serverPrice === null ? "" : String(serverPrice));
      return;
    }
    if (next === serverPrice) return;
    void commit({ monthlyPricePerSeat: next });
  }

  const dim = ignored ? "opacity-50" : undefined;

  return (
    <tr className="border-b align-middle last:border-b-0">
      {/* SKU name + part number */}
      <td className="py-3 pr-4">
        <div className={cn("min-w-0", dim)}>
          <div className="truncate text-sm font-medium">{sku.skuName}</div>
          <div className="money truncate text-xs text-muted-foreground">
            {sku.skuPartNumber}
          </div>
        </div>
      </td>

      {/* Seats */}
      <td className="py-3 pr-4 text-right">
        <div className={dim}>
          <div className="money text-sm">{sku.seatsOwned}</div>
          <div className="money text-xs text-muted-foreground">
            {sku.seatsAssigned} assigned
          </div>
        </div>
      </td>

      {/* Invoice line */}
      <td className="py-3 pr-4">
        <div className={cn("flex items-center gap-1", dim)}>
          <Select
            value={lineKey ?? NONE_VALUE}
            onValueChange={handleLineChange}
            disabled={busy || ignored}
          >
            <SelectTrigger
              size="sm"
              aria-label={`Invoice line for ${sku.skuName}`}
              className={cn(
                "w-full max-w-[16rem] min-w-[10rem]",
                highlight && "border-caution/60 ring-1 ring-caution/30"
              )}
            >
              <span
                className={cn(
                  "flex-1 truncate text-left",
                  !selectedLine &&
                    (suggestionPending && suggestedLine
                      ? "text-caution"
                      : "text-muted-foreground")
                )}
              >
                {selectedLine
                  ? lineLabel(selectedLine)
                  : suggestionPending && suggestedLine
                    ? `Suggested: ${lineLabel(suggestedLine)}`
                    : "— none —"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>
                <span className="text-muted-foreground">— none —</span>
              </SelectItem>
              {tenant.lines.map((line) => (
                <SelectItem key={line.key} value={line.key}>
                  <span className="flex min-w-0 flex-col items-start gap-0.5">
                    <span className="flex items-center gap-2">
                      <span className="max-w-[18rem] truncate">
                        {lineLabel(line)}
                      </span>
                      {suggestionPending && line.key === sku.suggestedLineKey && (
                        <Badge
                          variant="outline"
                          className="h-4 border-caution/50 px-1 text-[10px] text-caution"
                        >
                          suggested
                        </Badge>
                      )}
                    </span>
                    <span className="money max-w-[18rem] truncate text-xs text-muted-foreground">
                      {line.quantity} × {money(line.unitPrice)}
                      {intervalSuffix(line.intervalMonths)} · {line.source}
                      {line.templateName ? ` · ${line.templateName}` : ""}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {suggestionPending && !ignored && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-caution hover:text-caution"
                  disabled={busy}
                  onClick={() => void commit({ lineKey: sku.suggestedLineKey })}
                >
                  <Sparkles className="size-4" />
                  <span className="sr-only">Use suggested line</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Use suggested line</TooltipContent>
            </Tooltip>
          )}
        </div>
      </td>

      {/* Price override */}
      <td className="py-3 pr-4">
        <div className={cn("flex items-center gap-1.5", dim)}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="auto"
              aria-label={`Price override for ${sku.skuName}`}
              value={price}
              disabled={busy || ignored}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              className="money h-8 w-24 pr-2 pl-5 text-sm"
            />
          </div>
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            /seat/mo
          </span>
        </div>
      </td>

      {/* Ignore */}
      <td className="py-3 text-right">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <Switch
                checked={ignored}
                disabled={busy}
                onCheckedChange={(checked) => void commit({ ignore: checked })}
                aria-label={`Ignore ${sku.skuName}`}
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Free or internal SKU — exclude from the diff
          </TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}
