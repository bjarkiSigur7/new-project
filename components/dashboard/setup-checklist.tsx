"use client";

import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Step = {
  title: string;
  description: string;
  href: Route;
  cta: string;
  done: boolean;
};

/**
 * First-run state for the money screen: the three things that must exist
 * before a diff can be computed.
 */
export function SetupChecklist({
  hasTenants,
  hasAccounting,
  hasMappedClients,
}: {
  hasTenants: boolean;
  hasAccounting: boolean;
  hasMappedClients: boolean;
}) {
  const steps: Step[] = [
    {
      title: "Add & consent client tenants",
      description:
        "Paste each client's tenant ID, then grant read-only admin consent (GDAP-friendly) so TrueUp can read seat counts from Microsoft Graph.",
      href: "/onboarding",
      cta: "Add tenants",
      done: hasTenants,
    },
    {
      title: "Connect QuickBooks",
      description:
        "Authorize QuickBooks Online so TrueUp can read your recurring invoice lines — the seats you actually bill.",
      href: "/onboarding",
      cta: "Connect QuickBooks",
      done: hasAccounting,
    },
    {
      title: "Map tenants to customers",
      description:
        "Match each M365 tenant to its QuickBooks customer and each SKU to an invoice line. The nightly diff starts from there.",
      href: "/mapping",
      cta: "Open mapping",
      done: hasMappedClients,
    },
  ];

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="text-lg">
          Three steps to your first diff
        </CardTitle>
        <CardDescription>
          TrueUp compares seats you&apos;re licensed for against seats you
          invoice — nightly, per tenant, per SKU. It needs both sides connected
          first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="divide-y">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 py-4">
              {step.done ? (
                <CheckCircle2
                  className="mt-0.5 size-6 shrink-0 text-gain"
                  aria-label="Done"
                />
              ) : (
                <span
                  className="money mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs text-muted-foreground"
                  aria-hidden
                >
                  {i + 1}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-sm font-medium",
                    step.done && "text-muted-foreground line-through decoration-border"
                  )}
                >
                  {step.title}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
              {!step.done && (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={step.href}>{step.cta}</Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-4 border-t pt-4 text-sm">
          <Link
            href="/demo"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            See what it looks like with data
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
