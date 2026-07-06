"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { relativeTime } from "@/lib/format";
import { copyText } from "@/components/onboarding/clipboard";
import { toast } from "sonner";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Loader2,
  Mail,
  RefreshCw,
  Trash2,
} from "lucide-react";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TenantRow = NonNullable<
  FunctionReturnType<typeof api.tenants.listTenants>
>[number];

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function consentEmail(consentUrl: string) {
  return `Subject: One-minute approval — read-only license count access

Hi — as part of tightening up our Microsoft 365 billing, we use a tool called TrueUp that reads license seat counts from your tenant (read-only, Organization.Read.All only — it cannot see mail, files, or user data). Could you open the link below signed in as a Global Admin and click Accept? It takes about a minute, and you can revoke it any time under Entra → Enterprise applications.

${consentUrl}`;
}

const POWERSHELL_SCRIPT = `# Optional: grant consent from PowerShell instead of clicking the link.
# Run as a Global Admin of the CLIENT tenant. Same result, same single
# read-only permission (Organization.Read.All).

# One-time install of the Graph module, if you don't have it:
#   Install-Module Microsoft.Graph.Authentication -Scope CurrentUser

# Sign in to the client tenant:
Connect-MgGraph -TenantId "<client-tenant-id>" -Scopes "Application.ReadWrite.All"

# Register TrueUp's app in the tenant (this is the consent step —
# the app ID is the client_id parameter in the consent link):
New-MgServicePrincipal -AppId "<trueup-app-id-from-consent-link>"

# Verify under Entra -> Enterprise applications -> TrueUp:
# exactly one permission, Organization.Read.All. Revoke any time.`;

export function TenantStep() {
  const tenants = useQuery(api.tenants.listTenants);
  const addTenant = useMutation(api.tenants.addTenant);

  const [clientName, setClientName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [adding, setAdding] = useState(false);
  const [consent, setConsent] = useState<{
    displayName: string;
    consentUrl: string;
  } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = clientName.trim();
    const id = tenantId.trim().toLowerCase();
    if (!name) {
      toast.error("Give the tenant a client name — it's how it shows up on the money screen.");
      return;
    }
    if (!GUID_RE.test(id)) {
      toast.error(
        "That doesn't look like a tenant ID. It's a GUID — Entra admin center → Overview → Tenant ID."
      );
      return;
    }
    setAdding(true);
    try {
      const result = await addTenant({ tenantId: id, displayName: name });
      setConsent({ displayName: name, consentUrl: result.consentUrl });
      setClientName("");
      setTenantId("");
      toast.success(`${name} added — send the consent link to their Global Admin`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add the tenant.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* What happens, in plain terms */}
      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <p className="eyebrow mb-2 text-muted-foreground">How consent works</p>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>
            You add the client&apos;s tenant ID below and get a consent link. Their{" "}
            <span className="text-foreground">Global Admin</span> opens it and clicks
            Accept — about a minute of their time.
          </li>
          <li>
            That approves one read-only Graph permission:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">
              Organization.Read.All
            </code>{" "}
            — license and seat counts, nothing else.
          </li>
          <li>
            We never see mail, files, or user data, and the client can revoke it any
            time.{" "}
            <Link href="/security" className="text-primary underline underline-offset-2">
              Full security details
            </Link>
            .
          </li>
        </ul>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
          <div className="space-y-1.5">
            <Label htmlFor="ob-client-name">Client name</Label>
            <Input
              id="ob-client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Contoso Dental"
              autoComplete="off"
              disabled={adding}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ob-tenant-id">Tenant ID</Label>
            <Input
              id="ob-tenant-id"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="3f2a9c1e-0b7d-4e2a-9f31-6c8d5b4a7e10"
              className="font-mono text-xs placeholder:font-mono"
              autoComplete="off"
              spellCheck={false}
              disabled={adding}
            />
            <p className="text-xs text-muted-foreground">
              Entra admin center → Overview → Tenant ID
            </p>
          </div>
        </div>
        <Button type="submit" disabled={adding}>
          {adding && <Loader2 className="animate-spin" />}
          {adding ? "Adding…" : "Add tenant & get consent link"}
        </Button>
      </form>

      {/* Consent card for the tenant just added */}
      {consent && (
        <ConsentCard
          displayName={consent.displayName}
          consentUrl={consent.consentUrl}
          onDismiss={() => setConsent(null)}
        />
      )}

      {/* Tenant list */}
      <TenantList tenants={tenants} />

      {/* PowerShell alternative */}
      <PowerShellCollapsible />
    </div>
  );
}

function ConsentCard({
  displayName,
  consentUrl,
  onDismiss,
}: {
  displayName: string;
  consentUrl: string;
  onDismiss: () => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const email = consentEmail(consentUrl);

  return (
    <div className="space-y-3 rounded-md border border-primary/30 bg-accent/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-muted-foreground">Consent link</p>
          <p className="mt-0.5 text-sm font-medium">
            Send this to {displayName}&apos;s Global Admin
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          readOnly
          value={consentUrl}
          className="flex-1 bg-background font-mono text-xs"
          onFocus={(e) => e.currentTarget.select()}
          aria-label={`Consent link for ${displayName}`}
        />
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => copyText(consentUrl, "Consent link copied")}
          >
            <Copy />
            Copy
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href={consentUrl} target="_blank" rel="noreferrer">
              <ExternalLink />
              Open link
            </a>
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Only a Global Admin of the client tenant can approve it. Once they accept, the
        row below flips to connected and the first sync starts within minutes.
      </p>
      <Collapsible open={emailOpen} onOpenChange={setEmailOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <ChevronRight
              className={`transition-transform ${emailOpen ? "rotate-90" : ""}`}
            />
            <Mail />
            Copy-paste email for the client
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="relative mt-2">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-background p-3 pr-12 font-mono text-xs leading-relaxed text-muted-foreground">
              {email}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1.5"
              aria-label="Copy email snippet"
              onClick={() => copyText(email, "Email snippet copied")}
            >
              <Copy />
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function TenantList({ tenants }: { tenants: TenantRow[] | null | undefined }) {
  if (tenants === undefined) {
    return (
      <div className="divide-y rounded-md border">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4 p-3">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
        No tenants yet. Add your first above — most MSPs start with their own tenant
        as a test.
      </p>
    );
  }

  return (
    <div className="divide-y rounded-md border">
      {tenants.map((t) => (
        <TenantListRow key={t._id} tenant={t} />
      ))}
    </div>
  );
}

function TenantListRow({ tenant }: { tenant: TenantRow }) {
  const getConsentUrl = useMutation(api.tenants.getConsentUrl);
  const requestSync = useMutation(api.tenants.requestSync);
  const removeTenant = useMutation(api.tenants.removeTenant);
  const [busy, setBusy] = useState(false);

  async function copyConsentLink() {
    setBusy(true);
    try {
      const url = await getConsentUrl({ tenantDocId: tenant._id });
      await copyText(url, `Consent link for ${tenant.displayName} copied`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't generate a consent link.");
    } finally {
      setBusy(false);
    }
  }

  async function retrySync() {
    setBusy(true);
    try {
      await requestSync({ tenantDocId: tenant._id });
      toast.success(`Sync requested for ${tenant.displayName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't request a sync.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    try {
      await removeTenant({ tenantDocId: tenant._id });
      toast.success(`${tenant.displayName} removed`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove the tenant.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate text-sm font-medium">{tenant.displayName}</p>
        <p
          className="truncate font-mono text-xs text-muted-foreground"
          title={tenant.tenantId}
        >
          {tenant.tenantId}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {tenant.status === "pending_consent" && (
          <>
            <Badge variant="outline" className="border-caution/40 bg-caution/10 text-caution">
              Awaiting admin consent
            </Badge>
            <Button variant="ghost" size="sm" disabled={busy} onClick={copyConsentLink}>
              <Copy />
              Re-copy consent link
            </Button>
          </>
        )}

        {tenant.status === "connected" && (
          <>
            <Badge variant="outline" className="border-gain/40 bg-gain/10 text-gain">
              Connected
            </Badge>
            <span className="text-xs text-muted-foreground">
              {tenant.lastSyncAt ? (
                <>
                  synced <span className="money">{relativeTime(tenant.lastSyncAt)}</span>
                </>
              ) : (
                <>first sync queued</>
              )}
              {tenant.totalSeats !== null && (
                <>
                  {" · "}
                  <span className="money text-foreground">
                    {tenant.totalSeats.toLocaleString("en-US")}
                  </span>{" "}
                  seats
                </>
              )}
              {tenant.skuCount !== null && (
                <>
                  {" · "}
                  <span className="money">{tenant.skuCount}</span> SKUs
                </>
              )}
            </span>
          </>
        )}

        {tenant.status === "error" && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  tabIndex={0}
                  className="border-leak/40 bg-leak/10 text-leak"
                >
                  Sync error
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">
                {tenant.statusDetail ?? "The last sync failed. Retry, or issue a new consent link if access was revoked."}
              </TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="sm" disabled={busy} onClick={retrySync}>
              <RefreshCw />
              Retry sync
            </Button>
            <Button variant="ghost" size="sm" disabled={busy} onClick={copyConsentLink}>
              <Copy />
              New consent link
            </Button>
          </>
        )}

        {tenant.status === "disabled" && (
          <Badge variant="outline" className="text-muted-foreground">
            Disabled
          </Badge>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-leak"
              aria-label={`Remove ${tenant.displayName}`}
            >
              <Trash2 />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove {tenant.displayName}?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes the tenant&apos;s seat history and mappings from TrueUp.
                The consent in their tenant stays in place until an admin revokes it
                under Entra → Enterprise applications.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={handleRemove}
              >
                Remove tenant
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function PowerShellCollapsible() {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <ChevronRight className={`transition-transform ${open ? "rotate-90" : ""}`} />
          Prefer PowerShell?
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground">
            Optional — for admins who&apos;d rather not click links. Same consent, same
            single read-only permission.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-md border bg-muted/50 p-4 pr-12 font-mono text-xs leading-relaxed">
              {POWERSHELL_SCRIPT}
            </pre>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1.5"
              aria-label="Copy PowerShell script"
              onClick={() => copyText(POWERSHELL_SCRIPT, "PowerShell script copied")}
            >
              <Copy />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
