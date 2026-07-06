"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RenewalsTab } from "@/components/renewals/renewals-tab";
import { RepricingTab } from "@/components/renewals/repricing-tab";

export default function RenewalsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div className="space-y-1">
        <p className="eyebrow text-muted-foreground">NCE lifecycle</p>
        <h1 className="text-2xl font-semibold tracking-tight">Renewals</h1>
        <p className="text-sm text-muted-foreground">
          Every subscription&rsquo;s next lifecycle date across your tenants
          &mdash; and the re-pricing work Microsoft&rsquo;s July 2026 list
          increase creates.
        </p>
      </div>

      <Tabs defaultValue="renewals">
        <TabsList>
          <TabsTrigger value="renewals">Renewals</TabsTrigger>
          <TabsTrigger value="repricing">July 2026 repricing</TabsTrigger>
        </TabsList>
        <TabsContent value="renewals" className="mt-4">
          <RenewalsTab />
        </TabsContent>
        <TabsContent value="repricing" className="mt-4">
          <RepricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
