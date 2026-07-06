import type { Metadata } from "next";
import Link from "next/link";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PlanCard } from "@/components/marketing/plan-card";
import { money } from "@/lib/format";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Flat, public, self-serve pricing for TrueUp. Three plans, a 14-day free trial with no card, and no demo calls or per-seat quotes.",
};

const FAQ: { q: string; a: string }[] = [
  {
    q: "What counts as a tenant?",
    a: "One client's Microsoft 365 tenant — one directory, one tenant ID. Seats, users, and SKUs inside a tenant are unlimited on every plan, so a 5-seat client and a 500-seat client each count as one tenant.",
  },
  {
    q: "What happens when I hit my plan's tenant limit?",
    a: "Nothing breaks. Existing tenants keep syncing nightly; you just can't connect new ones until you upgrade. Upgrades take effect immediately.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Not yet — monthly only for now, which also keeps canceling painless. Annual billing with a discount is on the roadmap.",
  },
  {
    q: "How do I cancel?",
    a: "Self-serve, from the billing portal (billing runs through Polar). Open Settings, then Billing, then Manage subscription. Your plan runs to the end of the current period — no calls, no retention flow.",
  },
  {
    q: "Is my data deleted when I cancel?",
    a: "Yes, on request. Email support after canceling and we delete the workspace: seat snapshots, invoice line data, mappings, and OAuth tokens.",
  },
];

export default function PricingPage() {
  const starter = PLANS.starter;
  const seatRetail = 33;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16 sm:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-muted-foreground">Pricing</p>
        <h1 className="display mt-4 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Three plans. No quotes, no calls.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Every workspace starts with a{" "}
          <span className="money">{TRIAL_DAYS}</span>-day free trial of
          everything in Pro — no card up front. Pick a plan when the diff has
          already paid for it.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <PlanCard plan={PLANS.starter} detailed />
        <PlanCard plan={PLANS.pro} detailed featured />
        <PlanCard plan={PLANS.scale} detailed />
      </div>

      <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-6">
          <p className="eyebrow text-muted-foreground">The payback math</p>
          <p className="mt-3 text-sm leading-relaxed">
            Starter is{" "}
            <span className="money">
              {money(starter.priceMonthlyUsd ?? 0, { cents: false })}/mo
            </span>
            . At a typical{" "}
            <span className="money">{money(seatRetail, { cents: false })}</span>
            /seat retail for Business Premium, that&rsquo;s{" "}
            <span className="money">2&ndash;3</span> recovered seats (
            <span className="money">{money(seatRetail * 2, { cents: false })}</span>
            &ndash;
            <span className="money">{money(seatRetail * 3, { cents: false })}</span>
            /mo). The demo workspace finds{" "}
            <span className="money">4</span> forgotten seats on its very first
            client.
          </p>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <p className="eyebrow text-muted-foreground">How the trial works</p>
          <p className="mt-3 text-sm leading-relaxed">
            <span className="money">{TRIAL_DAYS}</span> days, everything in
            Pro, up to{" "}
            <span className="money">{PLANS.trial.tenantLimit}</span> tenants,
            no card.
            When it ends, the workspace locks until you pick a plan — nothing
            is deleted, and your mappings and history are waiting when you
            subscribe.
          </p>
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-3xl">
        <h2 className="display text-2xl font-medium tracking-tight sm:text-3xl">
          Pricing questions
        </h2>
        <Accordion type="single" collapsible className="mt-4">
          {FAQ.map((item) => (
            <AccordionItem key={item.q} value={item.q}>
              <AccordionTrigger className="text-base">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="leading-relaxed text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <p className="mx-auto mt-12 max-w-3xl border-t pt-6 text-center text-xs leading-relaxed text-muted-foreground">
        Prices in USD. Billing is handled by Polar, our merchant of record;
        applicable taxes are calculated at checkout. Plans are monthly and can
        be canceled anytime from the billing portal.{" "}
        <Link
          href="/security"
          className="underline underline-offset-4 hover:text-foreground"
        >
          Security details
        </Link>
        .
      </p>
    </div>
  );
}
