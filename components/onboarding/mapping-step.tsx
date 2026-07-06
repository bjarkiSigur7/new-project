"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MappingStep({
  done,
  ready,
  mappedClientCount,
}: {
  done: boolean;
  ready: boolean;
  mappedClientCount: number;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pair each tenant with its QuickBooks customer, then each SKU with the invoice
        line that bills it. TrueUp suggests the matches — you confirm them. The diff
        runs immediately: seats you&apos;re licensed for but not billing show up in
        dollars, per client.
      </p>

      {done ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href="/dashboard">
              Dashboard
              <ArrowRight />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/mapping">Revisit mapping</Link>
          </Button>
          <span className="text-xs text-muted-foreground">
            <span className="money text-foreground">{mappedClientCount}</span>{" "}
            {mappedClientCount === 1 ? "client" : "clients"} mapped
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <Button asChild>
            <Link href="/mapping">
              Open mapping
              <ArrowRight />
            </Link>
          </Button>
          {!ready && (
            <p className="text-xs text-muted-foreground">
              Works best once steps 1 and 2 are done — suggestions need synced seat
              counts on one side and invoice lines on the other.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
