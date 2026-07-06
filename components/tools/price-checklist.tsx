"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import {
  ArrowRight,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money } from "@/lib/format";
import {
  EST_RULES,
  PRICE_INCREASE_EFFECTIVE,
  PRICE_SOURCE_URL,
  SKU_PRICES,
  increasedSkus,
  priceRow,
  type SkuPrice,
} from "@/lib/m365-prices";
import { TRIAL_DAYS } from "@/lib/plans";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data prep

function dedupeByName(list: SkuPrice[]): SkuPrice[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

const INCREASED = dedupeByName(increasedSkus());
const UNCHANGED = dedupeByName(SKU_PRICES.filter((p) => p.pctIncrease === 0));

function longUtcDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

const EFFECTIVE_LABEL = longUtcDate(PRICE_INCREASE_EFFECTIVE); // "July 1, 2026"
const EST_EFFECTIVE_LABEL = longUtcDate(EST_RULES.effectiveDate); // "May 4, 2026"

// ---------------------------------------------------------------------------
// Row model

type RowInput = { id: number; part: string; seats: string; charge: string };

const PREFILL: RowInput[] = [
  { id: 1, part: "O365_BUSINESS_ESSENTIALS", seats: "120", charge: "9" },
  { id: 2, part: "O365_BUSINESS_PREMIUM", seats: "80", charge: "19" },
  { id: 3, part: "ENTERPRISEPACK", seats: "40", charge: "30" },
];

type ComputedRow = {
  input: RowInput;
  price: SkuPrice | undefined;
  seats: number | null;
  charge: number | null;
  valid: boolean;
  oldCost: number;
  newCost: number;
  marginNow: number;
  marginAfter: number;
  delta: number;
};

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeRow(input: RowInput): ComputedRow {
  const price = input.part ? priceRow(input.part) : undefined;
  const seats = parseNum(input.seats);
  const charge = parseNum(input.charge);
  const valid =
    !!price && seats !== null && seats > 0 && charge !== null && charge >= 0;
  if (!valid || !price || seats === null || charge === null) {
    return {
      input,
      price,
      seats,
      charge,
      valid: false,
      oldCost: 0,
      newCost: 0,
      marginNow: 0,
      marginAfter: 0,
      delta: 0,
    };
  }
  const oldCost = seats * price.oldPriceUsd;
  const newCost = seats * price.newPriceUsd;
  const marginNow = seats * charge - oldCost;
  const marginAfter = seats * charge - newCost;
  return {
    input,
    price,
    seats,
    charge,
    valid: true,
    oldCost,
    newCost,
    marginNow,
    marginAfter,
    delta: marginAfter - marginNow,
  };
}

// ---------------------------------------------------------------------------
// Cells

function MoneyCell({
  value,
  valid,
  className,
}: {
  value: number;
  valid: boolean;
  className?: string;
}) {
  return (
    <td className={cn("money px-3 py-3 text-right align-middle", className)}>
      {valid ? money(value) : "—"}
    </td>
  );
}

// ---------------------------------------------------------------------------

export function PriceChecklist() {
  const [rows, setRows] = useState<RowInput[]>(PREFILL);
  const nextId = useRef(PREFILL.length + 1);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const captureLead = useMutation(api.leads.captureLead);

  const computed = useMemo(() => rows.map(computeRow), [rows]);
  const validRows = computed.filter((c) => c.valid);
  const totals = validRows.reduce(
    (t, c) => ({
      oldCost: t.oldCost + c.oldCost,
      newCost: t.newCost + c.newCost,
      marginNow: t.marginNow + c.marginNow,
      marginAfter: t.marginAfter + c.marginAfter,
      delta: t.delta + c.delta,
    }),
    { oldCost: 0, newCost: 0, marginNow: 0, marginAfter: 0, delta: 0 }
  );
  const hasValid = validRows.length > 0;

  function updateRow(id: number, patch: Partial<RowInput>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((rs) => [
      ...rs,
      { id: nextId.current++, part: "", seats: "", charge: "" },
    ]);
  }
  function removeRow(id: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("That doesn't look like an email address.");
      return;
    }
    setSending(true);
    try {
      await captureLead({
        email: trimmed,
        source: "m365-checklist",
        meta: JSON.stringify({
          deltaPerMonth: Math.round(totals.delta * 100) / 100,
          rows: validRows
            .slice(0, 6)
            .map((c) => ({ sku: c.input.part, seats: c.seats, charge: c.charge })),
        }),
      });
      setSent(true);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Couldn't save your email — try again."
      );
    } finally {
      setSending(false);
    }
  }

  const action = !hasValid
    ? "Add a SKU, a seat count, and your per-seat price to see the math."
    : totals.delta < 0
      ? `Suggested action: reprice each client at their first NCE renewal on or after ${EFFECTIVE_LABEL} — that's the day your cost moves — and send price-change notices at least 30 days before each renewal date.`
      : "None of these SKUs move in July — Business Premium, E1, Exchange Online, Teams Phone, Defender and Copilot are unchanged. Check your book against the suites in the picker that do rise.";

  return (
    <div className="min-h-screen bg-background">
      {/* Slim public header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="display text-lg font-semibold tracking-tight">
            TrueUp
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/demo"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Live demo
            </Link>
            <Button asChild size="sm">
              <Link href="/dashboard">Free trial</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-10 sm:px-6 sm:py-12">
        {/* Intro */}
        <section>
          <p className="eyebrow text-muted-foreground">
            Free tool · July 2026 CSP repricing
          </p>
          <h1 className="display mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {"Microsoft's July 2026 price increase, run against your book"}
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-muted-foreground sm:text-base">
            {`On ${EFFECTIVE_LABEL}, Microsoft raised USD list prices across most Microsoft 365 business and enterprise suites. Existing subscriptions keep their old price until their first renewal after that date — then your cost jumps whether or not your invoices moved. Pick what you resell, enter what you charge per seat, and see exactly where the margin compresses.`}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            <a
              href={PRICE_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
            >
              {"Microsoft's pricing announcement"}
              <ExternalLink className="size-3" />
            </a>
            {
              " · USD list, annual commitment. Monthly-billed annual terms carry a separate +5% premium on top."
            }
          </p>
        </section>

        {/* Builder */}
        <section>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b">
                  <th className="eyebrow px-3 py-2.5 text-left font-normal text-muted-foreground">
                    SKU
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Seats
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    You charge /seat
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Cost now /mo
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Cost after /mo
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Margin now /mo
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Margin after /mo
                  </th>
                  <th className="eyebrow px-3 py-2.5 text-right font-normal text-muted-foreground">
                    Δ margin /mo
                  </th>
                  <th className="w-10 px-2 py-2.5">
                    <span className="sr-only">Remove row</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {computed.map((c) => (
                  <tr key={c.input.id} className="border-b last:border-b-0">
                    <td className="px-3 py-3 align-middle">
                      <Select
                        value={c.input.part || undefined}
                        onValueChange={(v) => updateRow(c.input.id, { part: v })}
                      >
                        <SelectTrigger
                          size="sm"
                          className="w-full min-w-56 max-w-72"
                        >
                          <SelectValue placeholder="Pick a SKU" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              Price rises {EFFECTIVE_LABEL}
                            </SelectLabel>
                            {INCREASED.map((p) => (
                              <SelectItem key={p.partNumber} value={p.partNumber}>
                                <span>{p.name}</span>
                                <span className="money text-xs text-muted-foreground">
                                  {money(p.oldPriceUsd)} → {money(p.newPriceUsd)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>No increase</SelectLabel>
                            {UNCHANGED.map((p) => (
                              <SelectItem key={p.partNumber} value={p.partNumber}>
                                <span>{p.name}</span>
                                <span className="money text-xs text-muted-foreground">
                                  {money(p.oldPriceUsd)}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {c.price && (
                        <p
                          className={cn(
                            "money mt-1 text-[11px]",
                            c.price.pctIncrease > 0
                              ? "text-caution"
                              : "text-muted-foreground"
                          )}
                        >
                          {c.price.pctIncrease > 0
                            ? `list +${c.price.pctIncrease}% at first renewal after Jul 1`
                            : "not in the July increase"}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right align-middle">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={c.input.seats}
                        onChange={(e) =>
                          updateRow(c.input.id, { seats: e.target.value })
                        }
                        aria-label="Seat count"
                        className="money h-8 w-20 text-right"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-3 text-right align-middle">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        value={c.input.charge}
                        onChange={(e) =>
                          updateRow(c.input.id, { charge: e.target.value })
                        }
                        aria-label="Your price per seat per month"
                        className="money h-8 w-24 text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <MoneyCell value={c.oldCost} valid={c.valid} />
                    <MoneyCell value={c.newCost} valid={c.valid} />
                    <MoneyCell
                      value={c.marginNow}
                      valid={c.valid}
                      className={c.valid && c.marginNow < 0 ? "text-leak" : ""}
                    />
                    <MoneyCell
                      value={c.marginAfter}
                      valid={c.valid}
                      className={
                        c.valid && c.marginAfter < 0 ? "text-leak" : ""
                      }
                    />
                    <MoneyCell
                      value={c.delta}
                      valid={c.valid}
                      className={cn(
                        "font-medium",
                        c.valid && c.delta < 0
                          ? "text-leak"
                          : c.valid && c.delta > 0
                            ? "text-gain"
                            : "text-muted-foreground"
                      )}
                    />
                    <td className="px-2 py-3 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-leak"
                        onClick={() => removeRow(c.input.id)}
                        disabled={rows.length === 1}
                        aria-label="Remove row"
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t bg-muted/40">
                  <td colSpan={3} className="eyebrow px-3 py-3 text-right text-muted-foreground">
                    Totals
                  </td>
                  <MoneyCell value={totals.oldCost} valid={hasValid} />
                  <MoneyCell value={totals.newCost} valid={hasValid} />
                  <MoneyCell
                    value={totals.marginNow}
                    valid={hasValid}
                    className={hasValid && totals.marginNow < 0 ? "text-leak" : ""}
                  />
                  <MoneyCell
                    value={totals.marginAfter}
                    valid={hasValid}
                    className={
                      hasValid && totals.marginAfter < 0 ? "text-leak" : ""
                    }
                  />
                  <MoneyCell
                    value={totals.delta}
                    valid={hasValid}
                    className={cn(
                      "font-semibold",
                      !hasValid
                        ? "text-muted-foreground"
                        : totals.delta < 0
                          ? "text-leak"
                          : "text-gain"
                    )}
                  />
                  <td className="px-2 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus />
              Add SKU
            </Button>
            <p className="text-xs text-muted-foreground">
              {
                "Cost columns assume distributor cost ≈ USD list. Apply your Pax8 / Ingram discount to both sides — the delta holds."
              }
            </p>
          </div>

          {/* The bold moment: total margin change. */}
          <div className="mt-6 flex flex-col gap-4 rounded-lg border bg-card px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="eyebrow text-muted-foreground">
                Margin change across your book
              </p>
              <p className="mt-1.5">
                <span
                  className={cn(
                    "display text-4xl font-semibold tracking-tight",
                    !hasValid
                      ? "text-muted-foreground"
                      : totals.delta < 0
                        ? "text-leak"
                        : "text-gain"
                  )}
                >
                  {hasValid ? `${money(totals.delta)}/mo` : "—"}
                </span>
                {hasValid && (
                  <span className="money ml-3 text-sm text-muted-foreground">
                    {money(totals.delta * 12)}/yr
                  </span>
                )}
              </p>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">{action}</p>
          </div>
        </section>

        {/* EST callout + email capture */}
        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-caution/50 bg-caution/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className="size-4 text-caution" />
                {"The other trap: Extended Service Terms"}
              </CardTitle>
              <CardDescription>
                Separate from the July increase — effective {EST_EFFECTIVE_LABEL}
                .
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                {`A lapsed NCE subscription no longer gets a free grace period. It converts to a month-to-month Extended Service Term billed at the monthly rate +${EST_RULES.monthlySurchargePct}% — or +${EST_RULES.prepaidSurchargePct}% when the product has no monthly plan.`}
              </p>
              <p className="font-medium">
                {
                  "The trap: auto-renew OFF without a scheduled cancellation converts to EST automatically. Eat that surcharge without rebilling it and the July math above is the least of your problems."
                }
              </p>
              <a
                href={EST_RULES.source}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Microsoft Partner Center: Extended Service Terms
                <ExternalLink className="size-3" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Take the checklist with you</CardTitle>
              <CardDescription>
                {
                  "Email me this checklist as a spreadsheet + the client-notice template."
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sent ? (
                <div className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-gain" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {"Sent-ish: we'll email it within the day."}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      One email to{" "}
                      <span className="font-medium text-foreground">
                        {email.trim()}
                      </span>
                      {" — spreadsheet plus a ready-to-send notice."}
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={submitEmail}
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  <div className="flex-1">
                    <Label htmlFor="checklist-email" className="sr-only">
                      Email address
                    </Label>
                    <Input
                      id="checklist-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourmsp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={sending}>
                    {sending ? "Sending…" : "Email it to me"}
                  </Button>
                </form>
              )}
              {!sent && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {
                    "One email, no drip sequence, no sales calls. Skip it — the calculator above works without it."
                  }
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Cross-CTA */}
        <section className="rounded-lg bg-primary px-6 py-8 text-primary-foreground sm:px-8">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="display text-2xl font-semibold tracking-tight">
                Renewal-date repricing, without the spreadsheet
              </h2>
              <p className="mt-2 max-w-xl text-sm opacity-85">
                {`TrueUp flags every invoice line still at old prices automatically and shows which client hits the new cost at which NCE renewal — free ${TRIAL_DAYS}-day trial, no card.`}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2">
              <Button asChild variant="secondary">
                <Link href="/dashboard">
                  Start free trial
                  <ArrowRight />
                </Link>
              </Button>
              <Link
                href="/demo"
                className="text-sm underline-offset-4 opacity-85 hover:underline"
              >
                {"See the sample workspace →"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>
            {`TrueUp · Prices are USD list from Microsoft's ${EFFECTIVE_LABEL} update — verify your distributor cost before repricing.`}
          </p>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <Link href="/demo" className="hover:text-foreground">
              Live demo
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
