// Plan card shared by the landing-page pricing preview (compact) and the
// /pricing page (detailed, with feature lists). Server component.

import Link from "next/link";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { money } from "@/lib/format";
import type { Plan } from "@/lib/plans";

export function PlanCard({
  plan,
  featured = false,
  detailed = false,
}: {
  plan: Plan;
  featured?: boolean;
  detailed?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-card p-6",
        featured && "border-primary shadow-sm ring-1 ring-primary/25"
      )}
    >
      {featured && (
        <Badge className="absolute -top-2.5 left-6">Most popular</Badge>
      )}

      <p className="eyebrow text-muted-foreground">{plan.name}</p>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="money text-4xl font-semibold tracking-tight">
          {money(plan.priceMonthlyUsd ?? 0, { cents: false })}
        </span>
        <span className="text-sm text-muted-foreground">/mo</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {plan.blurb}
      </p>

      {detailed ? (
        <ul className="mt-6 flex-1 space-y-2.5 border-t pt-6">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-gain" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 flex-1 text-sm">
          {plan.tenantLimit === null ? (
            <>Unlimited client tenants</>
          ) : (
            <>
              Up to <span className="money">{plan.tenantLimit}</span> client
              tenants
            </>
          )}
        </p>
      )}

      <Button
        asChild
        className="mt-6"
        variant={featured ? "default" : "outline"}
      >
        <Link href="/dashboard">Start free trial</Link>
      </Button>
    </div>
  );
}
