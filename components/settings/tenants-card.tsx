"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { relativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tenant = NonNullable<
  FunctionReturnType<typeof api.tenants.listTenants>
>[number];

function StatusBadge({ tenant }: { tenant: Tenant }) {
  switch (tenant.status) {
    case "connected":
      return (
        <Badge variant="outline" className="border-gain/40 bg-gain/10 text-gain">
          Connected
        </Badge>
      );
    case "pending_consent":
      return (
        <Badge
          variant="outline"
          className="border-caution/40 bg-caution/10 text-caution"
        >
          Awaiting consent
        </Badge>
      );
    case "error":
      return (
        <Badge
          variant="outline"
          className="border-leak/40 bg-leak/10 text-leak"
          title={tenant.statusDetail ?? undefined}
        >
          Error
        </Badge>
      );
    case "disabled":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Disabled
        </Badge>
      );
  }
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const renameTenant = useMutation(api.tenants.renameTenant);
  const removeTenant = useMutation(api.tenants.removeTenant);

  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(tenant.displayName);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  async function handleRename() {
    const next = nameDraft.trim();
    if (next === "" || next === tenant.displayName) {
      setRenameOpen(false);
      return;
    }
    setSaving(true);
    try {
      await renameTenant({ tenantDocId: tenant._id, displayName: next });
      toast.success("Saved");
      setRenameOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    setRemoving(true);
    try {
      await removeTenant({ tenantDocId: tenant._id });
      toast.success(`Removed ${tenant.displayName}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <TableRow>
      <TableCell>
        <div className="font-medium">{tenant.displayName}</div>
        <div className="text-xs text-muted-foreground">
          {tenant.customerName ?? "Not mapped to a customer"}
        </div>
      </TableCell>
      <TableCell>
        <StatusBadge tenant={tenant} />
      </TableCell>
      <TableCell className="money text-right">
        {tenant.totalSeats !== null ? tenant.totalSeats.toLocaleString("en-US") : "—"}
      </TableCell>
      <TableCell className="money text-right text-muted-foreground">
        {tenant.lastSyncAt ? relativeTime(tenant.lastSyncAt) : "never"}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Popover
            open={renameOpen}
            onOpenChange={(open) => {
              if (open) setNameDraft(tenant.displayName);
              setRenameOpen(open);
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground"
                aria-label={`Rename ${tenant.displayName}`}
              >
                <Pencil className="size-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 space-y-2">
              <p className="text-sm font-medium">Rename tenant</p>
              <Input
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleRename();
                }}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNameDraft(tenant.displayName);
                    setRenameOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button size="sm" onClick={() => void handleRename()} disabled={saving}>
                  {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-leak"
                aria-label={`Remove ${tenant.displayName}`}
                disabled={removing}
              >
                {removing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Remove {tenant.displayName}?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Removes seat history, renewals and mappings for this tenant.
                  This does not touch the client&apos;s Microsoft 365 tenant or
                  revoke admin consent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-leak text-leak-foreground hover:bg-leak/90"
                  onClick={() => void handleRemove()}
                >
                  Remove tenant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function TenantsCard() {
  const tenants = useQuery(api.tenants.listTenants);
  const me = useQuery(api.billing.getCurrentUser);

  if (tenants === undefined || me === undefined) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow text-muted-foreground">03 · Client tenants</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  const list = tenants ?? [];
  const limit = me.planInfo.tenantLimit;
  const used = list.length;
  const nearLimit = limit !== null && used / limit >= 0.8;

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-muted-foreground">03 · Client tenants</p>
        <CardDescription>
          The Microsoft 365 tenants TrueUp syncs seat counts from every night.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <span className={cn("money font-medium", nearLimit && "text-caution")}>
              {used}
            </span>{" "}
            <span className="text-muted-foreground">
              of <span className="money">{limit ?? "∞"}</span> tenants used
            </span>
          </p>
          {limit !== null ? (
            <Progress
              value={Math.min(100, (used / limit) * 100)}
              className="h-1.5"
            />
          ) : null}
        </div>

        {list.length === 0 ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium">No client tenants yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add your first tenant and grant admin consent to start syncing
              seat counts.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link href="/onboarding">Go to Onboarding</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Seats</TableHead>
                  <TableHead className="text-right">Last sync</TableHead>
                  <TableHead className="w-20 text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((t) => (
                  <TenantRow key={t._id} tenant={t} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Adding tenants happens in{" "}
          <Link
            href="/onboarding"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Onboarding
          </Link>
          , where you grant admin consent per tenant.
        </p>
      </CardContent>
    </Card>
  );
}
