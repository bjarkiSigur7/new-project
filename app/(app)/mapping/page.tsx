"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Building2, ReceiptText, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TenantCard } from "@/components/mapping/tenant-card";
import { errorMessage, type MappingData } from "@/components/mapping/types";

function buildSuggestionPairs(data: MappingData) {
  const tenants = data.tenants.filter((t) => t.status !== "disabled");

  const clientPairs = tenants.flatMap((t) =>
    t.suggestedCustomer !== null && !t.customerId
      ? [{ tenantDocId: t.tenantDocId, customerId: t.suggestedCustomer.customerId }]
      : []
  );
  const gettingCustomer = new Set(clientPairs.map((p) => p.tenantDocId));

  const skuPairs = tenants.flatMap((t) => {
    // Line suggestions only count for tenants that have — or are about to
    // get — a QuickBooks customer.
    if (t.customerId === null && !gettingCustomer.has(t.tenantDocId)) return [];
    return t.skus.flatMap((s) =>
      s.suggestedLineKey !== null && s.mapping === null
        ? [{ tenantDocId: t.tenantDocId, skuId: s.skuId, lineKey: s.suggestedLineKey }]
        : []
    );
  });

  return { clientPairs, skuPairs };
}

function PageHeader() {
  return (
    <div>
      <p className="eyebrow text-muted-foreground">Reconciliation</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">
        Map tenants to your books
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        TrueUp only counts dollars for mapped SKUs — everything else shows as
        potential.
      </p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: typeof Building2;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Card className="items-center gap-3 px-6 py-14 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{body}</p>
      <Button asChild size="sm" className="mt-2">
        <Link href="/onboarding">{cta}</Link>
      </Button>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1].map((i) => (
        <Card key={i} className="gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between gap-4 border-b bg-muted/30 px-5 py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3.5 w-28" />
            </div>
            <Skeleton className="h-8 w-64" />
          </div>
          <div className="space-y-3 px-5 py-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function MappingPage() {
  const data = useQuery(api.mappings.getMappingData);
  const acceptAllSuggestions = useMutation(api.mappings.acceptAllSuggestions);
  const [accepting, setAccepting] = useState(false);

  // Loading
  if (data === undefined) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader />
        <LoadingSkeleton />
      </div>
    );
  }

  const tenants = (data?.tenants ?? []).filter((t) => t.status !== "disabled");
  const customers = data?.customers ?? [];

  // No tenants at all (or no workspace yet)
  if (data === null || tenants.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader />
        <EmptyState
          icon={Building2}
          title="No Microsoft tenants yet"
          body="Add your first client tenant and grant admin consent so TrueUp can pull seat counts from Microsoft Graph."
          cta="Go to onboarding"
        />
      </div>
    );
  }

  // Tenants, but nothing on the books side to map against
  if (customers.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeader />
        <EmptyState
          icon={ReceiptText}
          title="Connect QuickBooks and sync first"
          body="TrueUp needs your customers and recurring invoice lines from QuickBooks before you can map tenants and SKUs."
          cta="Connect QuickBooks"
        />
      </div>
    );
  }

  const { clientPairs, skuPairs } = buildSuggestionPairs(data);
  const suggestionCount = clientPairs.length + skuPairs.length;
  const mappedCount = tenants.filter((t) => t.customerId !== null).length;

  async function handleAcceptAll() {
    setAccepting(true);
    try {
      await acceptAllSuggestions({ clientPairs, skuPairs });
      toast.success(
        `Accepted ${suggestionCount} suggestion${suggestionCount === 1 ? "" : "s"}`
      );
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAccepting(false);
    }
  }

  const suggestionParts: string[] = [];
  if (clientPairs.length > 0) {
    suggestionParts.push(
      `${clientPairs.length} customer match${clientPairs.length === 1 ? "" : "es"}`
    );
  }
  if (skuPairs.length > 0) {
    suggestionParts.push(
      `${skuPairs.length} invoice-line match${skuPairs.length === 1 ? "" : "es"}`
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader />
        <p className="text-sm text-muted-foreground">
          <span className="money">{mappedCount}</span> of{" "}
          <span className="money">{tenants.length}</span> tenants mapped
        </p>
      </div>

      {suggestionCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-lg border border-caution/40 bg-caution/5 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Sparkles className="size-4 shrink-0 text-caution" />
            <div className="min-w-0 text-sm">
              <span className="font-medium">Name-match suggestions ready.</span>{" "}
              <span className="text-muted-foreground">
                {suggestionParts.join(" · ")} — matched on name similarity, so
                review anything that looks off.
              </span>
            </div>
          </div>
          <Button size="sm" disabled={accepting} onClick={() => void handleAcceptAll()}>
            {accepting
              ? "Accepting…"
              : `Accept ${suggestionCount} suggestion${suggestionCount === 1 ? "" : "s"}`}
          </Button>
        </div>
      )}

      <div className="space-y-5">
        {tenants.map((tenant) => (
          <TenantCard
            key={tenant.tenantDocId}
            tenant={tenant}
            customers={customers}
          />
        ))}
      </div>
    </div>
  );
}
