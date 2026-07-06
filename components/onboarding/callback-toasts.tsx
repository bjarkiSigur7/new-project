"use client";

import { useEffect, useRef } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * Reads OAuth/consent callback results from the query string, toasts them
 * exactly once, then strips the params so a refresh doesn't re-toast.
 * Must be rendered inside a <Suspense> boundary (useSearchParams).
 */
export function CallbackToasts() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const fired = useRef(false);

  useEffect(() => {
    const consent = searchParams.get("consent");
    const qbo = searchParams.get("qbo");
    if (!consent && !qbo) return;
    if (fired.current) return;
    fired.current = true;

    if (consent === "success") {
      toast.success("Consent received — first sync is running");
    } else if (consent === "declined") {
      toast.error(
        "Consent was declined. Only a Global Admin of the client tenant can approve it — resend them the link from the tenant row below."
      );
    } else if (consent === "invalid") {
      toast.error(
        "That consent link was invalid or expired. Generate a fresh one from the tenant row below."
      );
    }

    if (qbo === "connected") {
      toast.success("QuickBooks connected — pulling your recurring invoices now");
    } else if (qbo === "declined") {
      toast.error(
        "QuickBooks connection was declined. The scope is read-only — retry whenever you're ready."
      );
    } else if (qbo === "error") {
      toast.error(
        "QuickBooks returned an error during connection. Try again; if it keeps failing, email support."
      );
    } else if (qbo === "invalid") {
      toast.error("That QuickBooks callback was invalid. Start the connection again from step 2.");
    }

    router.replace(pathname as Route, { scroll: false });
  }, [searchParams, router, pathname]);

  return null;
}
