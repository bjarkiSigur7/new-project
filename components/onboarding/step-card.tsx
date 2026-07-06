"use client";

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Shell for one onboarding step: numbered marker that flips to a green check
 * when the step is complete, eyebrow step label, title, and body content.
 */
export function StepCard({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("gap-4", done && "border-gain/30")}>
      <CardHeader className="grid-cols-[auto_1fr_auto] items-center gap-x-3">
        <span
          aria-hidden
          className={cn(
            "flex size-7 items-center justify-center rounded-full border",
            done
              ? "border-gain/40 bg-gain/15 text-gain"
              : "border-border bg-muted/50 text-muted-foreground"
          )}
        >
          {done ? (
            <Check className="size-3.5" strokeWidth={2.5} />
          ) : (
            <span className="money text-xs">{index}</span>
          )}
        </span>
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground">
            Step {index} of 3{done ? " — done" : ""}
          </p>
          <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {done && (
          <Badge
            variant="outline"
            className="border-gain/40 bg-gain/10 text-gain"
          >
            <Check strokeWidth={2.5} />
            Done
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

/** Thin vertical rule that connects one step card to the next. */
export function StepConnector() {
  return <div aria-hidden className="ml-[2.4rem] h-6 w-px bg-border" />;
}
