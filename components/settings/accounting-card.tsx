"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import { relativeTime, shortDate } from "@/lib/format";
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
import { Skeleton } from "@/components/ui/skeleton";

function ConnectionStatusBadge({
  status,
}: {
  status: "connected" | "expired" | "error";
}) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="border-gain/40 bg-gain/10 text-gain">
          Connected
        </Badge>
      );
    case "expired":
      return (
        <Badge
          variant="outline"
          className="border-caution/40 bg-caution/10 text-caution"
        >
          Token expired
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="border-leak/40 bg-leak/10 text-leak">
          Error
        </Badge>
      );
  }
}

export function AccountingCard() {
  const connection = useQuery(api.qbo.getConnection);
  const getConnectUrl = useMutation(api.qbo.getConnectUrl);
  const disconnect = useMutation(api.qbo.disconnect);
  const requestSync = useAction(api.qbo.requestSync);

  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function handleConnect() {
    setConnecting(true);
    try {
      const url = await getConnectUrl({});
      window.location.href = url;
    } catch (e) {
      setConnecting(false);
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      await requestSync({});
      toast.success("Sync started — invoice lines refresh in a minute or two");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnect({});
      toast.success("Accounting disconnected");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setDisconnecting(false);
    }
  }

  if (connection === undefined) {
    return (
      <Card>
        <CardHeader>
          <p className="eyebrow text-muted-foreground">04 · Accounting</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-64" />
        </CardContent>
      </Card>
    );
  }

  const providerName =
    connection?.provider === "xero" ? "Xero" : "QuickBooks Online";

  return (
    <Card>
      <CardHeader>
        <p className="eyebrow text-muted-foreground">04 · Accounting</p>
        <CardDescription>
          TrueUp diffs live seat counts against the recurring invoice lines it
          syncs from here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {connection === null ? (
          <div className="rounded-md border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm font-medium">Not connected</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
              Connect QuickBooks Online so TrueUp can compare what you invoice
              against what each tenant is actually licensed for.
            </p>
            <Button
              size="sm"
              className="mt-3"
              onClick={() => void handleConnect()}
              disabled={connecting}
            >
              {connecting ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Connect QuickBooks Online
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-sm font-medium">
                {connection.companyName ?? providerName}
              </p>
              <Badge variant="outline" className="text-muted-foreground">
                {providerName}
              </Badge>
              <ConnectionStatusBadge status={connection.status} />
            </div>
            {connection.status !== "connected" && connection.statusDetail ? (
              <p className="text-xs text-leak">{connection.statusDetail}</p>
            ) : null}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <span>
                Connected{" "}
                <span className="money">{shortDate(connection.connectedAt)}</span>
              </span>
              <span>
                Last sync{" "}
                <span className="money">
                  {connection.lastSyncAt
                    ? relativeTime(connection.lastSyncAt)
                    : "never"}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleSync()}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                Sync now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleConnect()}
                disabled={connecting}
              >
                {connecting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Reconnect
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-leak"
                    disabled={disconnecting}
                  >
                    {disconnecting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : null}
                    Disconnect
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Disconnect {providerName}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Removes synced invoice lines; mappings survive reconnect
                      if customer IDs match. Nightly diffs pause until you
                      reconnect.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-leak text-leak-foreground hover:bg-leak/90"
                      onClick={() => void handleDisconnect()}
                    >
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
