"use client";

import { WorkspaceCard } from "@/components/settings/workspace-card";
import { BillingCard } from "@/components/settings/billing-card";
import { TenantsCard } from "@/components/settings/tenants-card";
import { AccountingCard } from "@/components/settings/accounting-card";
import { DangerZoneCard } from "@/components/settings/danger-zone-card";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-16">
      <header className="space-y-1">
        <p className="eyebrow text-muted-foreground">Workspace administration</p>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace details, plan, client tenants and your accounting
          connection. Changes save as you go.
        </p>
      </header>

      <WorkspaceCard />
      <BillingCard />
      <TenantsCard />
      <AccountingCard />
      <DangerZoneCard />
    </div>
  );
}
