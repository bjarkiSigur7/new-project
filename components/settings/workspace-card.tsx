"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function SettingRow({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_280px] sm:gap-8">
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </Label>
        {help ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            {help}
          </p>
        ) : null}
      </div>
      <div className="sm:justify-self-end sm:pt-0.5 w-full sm:w-[280px]">
        {children}
      </div>
    </div>
  );
}

export function WorkspaceCard() {
  const status = useQuery(api.workspaces.getWorkspaceStatus);
  const updateWorkspace = useMutation(api.workspaces.updateWorkspace);

  // Local drafts override server values while the user is editing.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [billingDayDraft, setBillingDayDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [digestOverride, setDigestOverride] = useState<boolean | null>(null);

  if (status === undefined) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow text-muted-foreground">01 · Workspace</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-9 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (status === null) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow text-muted-foreground">01 · Workspace</p>
          <CardDescription>
            No workspace yet — finish{" "}
            <Link href="/onboarding" className="underline underline-offset-2">
              onboarding
            </Link>{" "}
            to create one.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const ws = status.workspace;
  const digestEnabled = digestOverride ?? ws.digestEnabled;

  async function save(
    patch: Parameters<typeof updateWorkspace>[0],
    onError?: () => void
  ) {
    try {
      await updateWorkspace(patch);
      toast.success("Saved");
    } catch (e) {
      onError?.();
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function commitName() {
    if (nameDraft === null) return;
    const next = nameDraft.trim();
    setNameDraft(null);
    if (next === "" || next === ws.name) return;
    void save({ name: next });
  }

  function commitBillingDay() {
    if (billingDayDraft === null) return;
    const raw = billingDayDraft.trim();
    setBillingDayDraft(null);
    if (raw === "") return;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 28) {
      toast.error("Billing day must be between 1 and 28");
      return;
    }
    if (n === ws.billingDayOfMonth) return;
    void save({ billingDayOfMonth: n });
  }

  function commitEmail() {
    if (emailDraft === null) return;
    const next = emailDraft.trim();
    setEmailDraft(null);
    if (next === (ws.digestEmail ?? "")) return;
    if (next !== "" && !EMAIL_RE.test(next)) {
      toast.error("That doesn't look like a valid email address");
      return;
    }
    void save({ digestEmail: next });
  }

  function toggleDigest(checked: boolean) {
    setDigestOverride(checked);
    void save({ digestEnabled: checked }, () => setDigestOverride(null));
  }

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-muted-foreground">01 · Workspace</p>
        <CardDescription>
          Fields save when you click away from them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border">
          <SettingRow
            label="Workspace name"
            help="Shown in digests and exports."
            htmlFor="ws-name"
          >
            <Input
              id="ws-name"
              value={nameDraft ?? ws.name}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              placeholder="Acme Managed IT"
            />
          </SettingRow>

          <SettingRow
            label="Billing day of month"
            help="Your monthly digest lands 3 days before this so fixes hit the next invoice."
            htmlFor="ws-billing-day"
          >
            <Input
              id="ws-billing-day"
              type="number"
              min={1}
              max={28}
              inputMode="numeric"
              className="money w-24 sm:ml-auto"
              value={billingDayDraft ?? ws.billingDayOfMonth ?? ""}
              onChange={(e) => setBillingDayDraft(e.target.value)}
              onBlur={commitBillingDay}
              placeholder="1"
            />
          </SettingRow>

          <SettingRow
            label="Monthly digest"
            help="One email a month with every client's unbilled seats, timed to your billing day."
            htmlFor="ws-digest"
          >
            <div className="flex w-full items-center justify-between gap-3 sm:justify-end">
              <Switch
                id="ws-digest"
                checked={digestEnabled}
                onCheckedChange={toggleDigest}
              />
            </div>
          </SettingRow>

          <SettingRow
            label="Digest email"
            help="Where the digest is sent."
            htmlFor="ws-digest-email"
          >
            <Input
              id="ws-digest-email"
              type="email"
              disabled={!digestEnabled}
              value={emailDraft ?? ws.digestEmail ?? ""}
              onChange={(e) => setEmailDraft(e.target.value)}
              onBlur={commitEmail}
              placeholder="billing@yourmsp.com"
            />
          </SettingRow>
        </div>
      </CardContent>
    </Card>
  );
}
