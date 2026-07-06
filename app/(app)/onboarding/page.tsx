"use client";

import { Suspense } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CallbackToasts } from "@/components/onboarding/callback-toasts";
import { StepCard, StepConnector } from "@/components/onboarding/step-card";
import { TenantStep } from "@/components/onboarding/tenant-step";
import { AccountingStep } from "@/components/onboarding/accounting-step";
import { MappingStep } from "@/components/onboarding/mapping-step";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const status = useQuery(api.workspaces.getWorkspaceStatus);

  const step1Done = (status?.connectedTenantCount ?? 0) > 0;
  const step2Done = Boolean(status?.hasAccounting);
  const step3Done = (status?.mappedClientCount ?? 0) > 0;
  const doneCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Toast OAuth/consent callback results once, then strip the params. */}
      <Suspense fallback={null}>
        <CallbackToasts />
      </Suspense>

      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground">Setup</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            First dollars in 30 minutes
          </h1>
          <p className="mt-2 max-w-prose text-sm text-muted-foreground">
            Three steps: your clients approve read-only seat access, QuickBooks shares
            your invoice lines, and you map the two. Read-only end to end — TrueUp
            never writes to a tenant or an invoice.
          </p>
        </div>
        {status === undefined ? (
          <Skeleton className="h-5 w-20" />
        ) : status !== null ? (
          <p className="money text-sm text-muted-foreground">{doneCount} / 3 done</p>
        ) : null}
      </header>

      {status === undefined ? (
        <OnboardingSkeleton />
      ) : status === null ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          We couldn&apos;t load your workspace. Refresh the page — if it persists,
          sign out and back in.
        </p>
      ) : (
        <>
          <div className="flex flex-col">
            <StepCard index={1} title="Connect client tenants" done={step1Done}>
              <TenantStep />
            </StepCard>
            <StepConnector />
            <StepCard index={2} title="Connect QuickBooks Online" done={step2Done}>
              <AccountingStep />
            </StepCard>
            <StepConnector />
            <StepCard index={3} title="Map & see your money" done={step3Done}>
              <MappingStep
                done={step3Done}
                ready={step1Done && step2Done}
                mappedClientCount={status.mappedClientCount}
              />
            </StepCard>
          </div>

          <Separator className="my-8" />

          <footer className="flex flex-wrap items-center justify-between gap-2 pb-8 text-xs text-muted-foreground">
            <p>
              {typeof status.trialDaysLeft === "number" ? (
                <span
                  className={cn(
                    status.trialDaysLeft <= 3 && "font-medium text-caution"
                  )}
                >
                  Trial — <span className="money">{Math.max(status.trialDaysLeft, 0)}</span>{" "}
                  {status.trialDaysLeft === 1 ? "day" : "days"} left
                </span>
              ) : (
                <>Workspace: {status.workspace.name}</>
              )}
            </p>
            <p>
              Nightly sync runs at <span className="money">3:00 UTC</span>; manual sync
              any time.
            </p>
          </footer>
        </>
      )}
    </div>
  );
}

function OnboardingSkeleton() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col">
          {i > 1 && <div className="ml-[2.4rem] h-6 w-px bg-border" />}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-52" />
              </div>
            </div>
            <Skeleton className="mt-5 h-20 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
