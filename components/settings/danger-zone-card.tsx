"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

export function DangerZoneCard() {
  return (
    <Card className="border-leak/40">
      <CardHeader>
        <p className="eyebrow text-leak">05 · Danger zone</p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Delete workspace &amp; data</p>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
              Email{" "}
              <a
                href="mailto:support@trueupmsp.com?subject=Delete%20my%20TrueUp%20workspace"
                className="underline underline-offset-2 hover:text-foreground"
              >
                support@trueupmsp.com
              </a>{" "}
              from your account email and we delete your workspace — seat
              snapshots, invoice lines, mappings, everything — within 72 hours.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-leak/40 text-leak hover:bg-leak/10 hover:text-leak"
          >
            <a href="mailto:support@trueupmsp.com?subject=Delete%20my%20TrueUp%20workspace">
              Request deletion
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
