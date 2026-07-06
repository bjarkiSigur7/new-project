"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { demoWorkspaceDiff, DEMO_TENANTS } from "@/lib/demo-fixtures";
import { money } from "@/lib/format";
import { TRIAL_DAYS } from "@/lib/plans";
import { ClientLedger } from "./client-ledger";
import { RenewalsRail } from "./renewals-rail";
import { utcDate } from "./utc-date";

const LAST_SYNC = DEMO_TENANTS[0].lastSyncAt;

/** Ledger-style hero numeral: superscripted cents, display serif. */
function HeroMoney({ amount }: { amount: number }) {
  const formatted = money(amount);
  const dot = formatted.indexOf(".");
  const dollars = dot === -1 ? formatted : formatted.slice(0, dot);
  const cents = dot === -1 ? "" : formatted.slice(dot);
  return (
    <span className="display text-6xl font-semibold leading-none tracking-tight text-leak sm:text-7xl lg:text-8xl">
      {dollars}
      {cents && (
        <span className="align-super text-[0.42em] font-medium">{cents}</span>
      )}
    </span>
  );
}

function Substat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "leak" | "caution";
}) {
  return (
    <div>
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd
        className={`money mt-1.5 text-lg font-medium ${
          tone === "leak"
            ? "text-leak"
            : tone === "caution"
              ? "text-caution"
              : ""
        }`}
      >
        {value}
      </dd>
      <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

export function DemoMoneyScreen() {
  const diff = demoWorkspaceDiff();
  const [showExplainer, setShowExplainer] = useState(true);
  const syncedNote = `${diff.totalClients} tenants · synced ${utcDate(LAST_SYNC)}, 03:12 UTC`;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky sample-data banner — doubles as the page header. */}
      <div className="sticky top-0 z-50 border-b border-primary-foreground/15 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <p className="min-w-0 text-xs sm:text-sm">
            <Link href="/" className="display font-semibold tracking-tight">
              TrueUp
            </Link>
            <span className="mx-2 opacity-40">·</span>
            <span className="opacity-90">
              Sample data — six fictional clients, real math.{" "}
              <span className="hidden md:inline">
                This is your first sync.
              </span>
            </span>
          </p>
          <Button asChild size="sm" variant="secondary" className="shrink-0">
            <Link href="/dashboard">
              Run it on your tenants
              <span className="hidden lg:inline">
                {" "}
                — free {TRIAL_DAYS}-day trial
              </span>
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        {/* The one bold moment: the number the MSP is not billing. */}
        <header>
          <p className="eyebrow text-muted-foreground">
            Money screen · sample workspace
          </p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <HeroMoney amount={diff.totalMonthlyLeak} />
            <span className="text-lg text-muted-foreground sm:text-xl">
              /mo unbilled across {diff.totalClients} clients
            </span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {
              "Confirmed at the prices on your own invoices — seats you pay the distributor for that never made it onto a QuickBooks line."
            }
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 border-y py-6 lg:grid-cols-4">
            <Substat
              label="Annual run-rate"
              value={money(diff.totalAnnualLeak)}
              hint="if nothing changes"
              tone="leak"
            />
            <Substat
              label="Over-billed"
              value={`${money(diff.totalMonthlyOverbilled)}/mo`}
              hint="credit risk — client counts seats too"
              tone="caution"
            />
            <Substat
              label="Unmapped SKUs"
              value={`~${money(diff.totalEstimatedUnmappedValue)}/mo`}
              hint="potential at list price, not confirmed"
              tone="caution"
            />
            <Substat
              label="Clients under-billed"
              value={`${diff.clientsWithLeaks} of ${diff.totalClients}`}
              hint="confirmed against invoice lines"
            />
          </dl>
        </header>

        {/* Dismissible explainer. */}
        {showExplainer && (
          <div className="relative mt-8 flex gap-3 rounded-lg border border-primary/25 bg-accent/50 px-4 py-4 pr-10 sm:px-5">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">How to read this screen</p>
              <p className="text-muted-foreground">
                {
                  "Every night TrueUp pulls each tenant's subscribedSkus from Microsoft Graph and diffs the seats you pay for against the quantities on your QuickBooks recurring invoice lines. Red is confirmed under-billing at your own price. Amber \"~ potential\" means a SKU has no invoice line mapped yet — valued at Microsoft list, an estimate until you map or ignore it. Expand a client to see the SKU-level diff."
                }
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExplainer(false)}
              aria-label="Dismiss explanation"
              className="absolute right-3 top-3 rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <ClientLedger clients={diff.clients} syncedNote={syncedNote} />
          <div className="space-y-4">
            <RenewalsRail />
            <p className="px-1 text-xs text-muted-foreground">
              {
                "In the product, every row links to the client's mapping screen and seat history. Here, it's all fixture data — poke around."
              }
            </p>
          </div>
        </div>
      </main>

      {/* End CTA band. */}
      <section className="mt-8 bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h2 className="display text-3xl font-semibold tracking-tight sm:text-4xl">
              {`${money(diff.totalMonthlyLeak)}/mo was hiding in six sample invoices.`}
            </h2>
            <p className="mt-3 max-w-xl text-sm opacity-85 sm:text-base">
              {
                "TrueUp runs this exact diff on your real tenants every night. Add each tenant with read-only admin consent, connect QuickBooks Online, map clients once — your first number shows up in the first session."
              }
            </p>
            <p className="mt-4 text-xs opacity-70">
              {`${TRIAL_DAYS} days free, no card. TrueUp reads seat counts and invoice lines; it never edits licenses or invoices.`}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">
                Start your free {TRIAL_DAYS}-day trial
                <ArrowRight />
              </Link>
            </Button>
            <Link
              href="/tools/m365-price-checklist"
              className="text-sm underline-offset-4 opacity-85 hover:underline"
            >
              {"Check the July 2026 price increase against your book →"}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>
            {
              "TrueUp · Sample workspace — all six clients are fictional; the math is the production diff engine."
            }
          </p>
          <nav className="flex gap-4">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            <Link
              href="/tools/m365-price-checklist"
              className="hover:text-foreground"
            >
              July 2026 repricing checklist
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
