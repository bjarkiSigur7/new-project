"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TenantStatus = "pending_consent" | "connected" | "error" | "disabled";

/** Graph connection state for a client tenant, as a ledger-style chip. */
export function TenantStatusBadge({
  status,
  statusDetail,
}: {
  status: TenantStatus;
  statusDetail?: string | null;
}) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="border-gain/40 text-gain">
          connected
        </Badge>
      );
    case "pending_consent":
      return (
        <Badge variant="outline" className="border-caution/50 text-caution">
          awaiting consent
        </Badge>
      );
    case "error": {
      const badge = (
        <Badge className="border-transparent bg-leak text-leak-foreground">
          error
        </Badge>
      );
      if (!statusDetail) return badge;
      return (
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent className="max-w-72">{statusDetail}</TooltipContent>
        </Tooltip>
      );
    }
    case "disabled":
      return <Badge variant="secondary">disabled</Badge>;
    default:
      return null;
  }
}
