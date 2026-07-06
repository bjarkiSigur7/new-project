"use client";

import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";

/**
 * The one bold moment on a money page: a giant leak figure.
 * Leak > 0 → under-billing red; leak === 0 → "All clean" in gain green.
 */
export function MoneyHero({
  monthlyLeak,
  annualLeak,
  size = "lg",
  cleanNote,
}: {
  monthlyLeak: number;
  annualLeak: number;
  size?: "lg" | "md";
  cleanNote?: string;
}) {
  const clean = monthlyLeak <= 0;
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span
          className={cn(
            "display money font-semibold tracking-tight",
            size === "lg" ? "text-6xl sm:text-7xl" : "text-5xl",
            clean ? "text-gain" : "text-leak"
          )}
        >
          {money(monthlyLeak)}
        </span>
        <span
          className={cn(
            "text-muted-foreground",
            size === "lg" ? "text-lg" : "text-base"
          )}
        >
          /mo unbilled
        </span>
      </div>
      {clean ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-gain">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>
            All clean —{" "}
            {cleanNote ?? "every mapped seat is on an invoice line."}
          </span>
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          <span className="money text-leak">{money(annualLeak)}</span>/yr at the
          current run rate — seats you pay your distributor for but aren&apos;t
          invoicing.
        </p>
      )}
    </div>
  );
}

/** One labeled figure in the substat strip under the hero. */
export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "caution" | "leak" | "gain";
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow text-muted-foreground">{label}</div>
      <div
        className={cn(
          "money mt-1.5 text-lg font-medium",
          tone === "caution" && "text-caution",
          tone === "leak" && "text-leak",
          tone === "gain" && "text-gain"
        )}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
      ) : null}
    </div>
  );
}

/** Ruled horizontal strip of Stats. */
export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-5 border-y py-5 sm:grid-cols-4">
      {children}
    </div>
  );
}
