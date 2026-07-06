"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { relativeTime, shortDate } from "@/lib/format";
import { toast } from "sonner";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

export function AccountingStep() {
  const connection = useQuery(api.qbo.getConnection);
  const getConnectUrl = useMutation(api.qbo.getConnectUrl);
  const disconnect = useMutation(api.qbo.disconnect);
  const requestSync = useAction(api.qbo.requestSync);

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await getConnectUrl({});
      window.location.href = url;
      // No setConnecting(false) on success — the browser is navigating away.
    } catch (err) {
      setConnecting(false);
      toast.error(
        err instanceof Error ? err.message : "Couldn't start the QuickBooks connection."
      );
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    try {
      await requestSync({});
      toast.success("Sync running — fresh invoice lines in a minute or two");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't start the sync.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnect({});
      toast.success("QuickBooks disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't disconnect.");
    }
  }

  if (connection === undefined) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-44" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connection === null ? (
        <>
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="eyebrow mb-2 text-muted-foreground">What we read</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li>
                Read-only accounting scope — TrueUp pulls your{" "}
                <span className="text-foreground">recurring invoice templates</span> and
                recent invoices to see what each client is billed per seat.
              </li>
              <li>
                We never write to QuickBooks: no invoices created, edited, or sent.
                The diff lives entirely in TrueUp.
              </li>
            </ul>
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? <Loader2 className="animate-spin" /> : <ExternalLink />}
            {connecting ? "Redirecting to Intuit…" : "Connect QuickBooks"}
          </Button>
        </>
      ) : (
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="min-w-0 flex-1 basis-40">
              <p className="truncate text-sm font-medium">{connection.companyName}</p>
              <p className="text-xs text-muted-foreground">
                Connected <span className="money">{shortDate(connection.connectedAt)}</span>
                {connection.lastSyncAt && (
                  <>
                    {" · last sync "}
                    <span className="money">{relativeTime(connection.lastSyncAt)}</span>
                  </>
                )}
              </p>
            </div>
            {connection.status === "connected" ? (
              <Badge variant="outline" className="border-gain/40 bg-gain/10 text-gain">
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-leak/40 bg-leak/10 text-leak">
                {connection.status === "expired" ? "Connection expired" : "Connection error"}
              </Badge>
            )}
          </div>

          {connection.status !== "connected" && (
            <p className="text-xs text-leak">
              {connection.statusDetail ||
                "QuickBooks stopped accepting our token. Reconnect to resume the nightly invoice pull — your mappings are kept."}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {connection.status === "connected" ? (
              <Button variant="outline" size="sm" onClick={handleSyncNow} disabled={syncing}>
                {syncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="animate-spin" /> : <ExternalLink />}
                {connecting ? "Redirecting to Intuit…" : "Reconnect QuickBooks"}
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect QuickBooks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Invoice lines stop syncing and the money screen loses billed
                    amounts until you reconnect. Your client and SKU mappings are
                    kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Xero — coming in the next few weeks. Email support to get pinged the day it
        ships.
      </p>
    </div>
  );
}
