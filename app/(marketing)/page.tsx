import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LedgerHero } from "@/components/marketing/ledger-hero";
import { PlanCard } from "@/components/marketing/plan-card";
import { demoWorkspaceDiff } from "@/lib/demo-fixtures";
import { money } from "@/lib/format";
import {
  EST_RULES,
  PRICE_INCREASE_EFFECTIVE,
  increasedSkus,
  priceRow,
} from "@/lib/m365-prices";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

export const metadata: Metadata = {
  title: { absolute: "TrueUp — You bought the seats. Bill them." },
  description:
    "TrueUp diffs your clients' live Microsoft 365 seat counts against your QuickBooks recurring invoices every night and shows the exact dollars you're licensed for but not billing. Built for MSPs without a PSA.",
};

const dateLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`)
    .toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();

const STEPS = [
  {
    n: "01",
    title: "Admin-consent the read-only app",
    body: "Add each client tenant by its tenant ID and send the Microsoft admin-consent link — copy-paste, about 15 minutes for a whole book of clients. No GDAP relationship required; the app gets app-only read access to license counts and nothing else.",
  },
  {
    n: "02",
    title: "Connect QuickBooks Online",
    body: "One OAuth screen, read-only accounting scope. TrueUp reads your recurring transactions and invoice lines and never writes anything back. On Xero instead? That works too.",
  },
  {
    n: "03",
    title: "Wake up to the diff",
    body: "A nightly sync compares seats owned to seats billed for every mapped SKU, client by client. Check the dashboard over coffee, or let the monthly pre-billing digest land before you run invoices.",
  },
];

const COMPARISON: { label: string; psa: string; trueup: string }[] = [
  {
    label: "Reconciles into",
    psa: "ConnectWise, Autotask, HaloPSA — PSAs you may not run",
    trueup: "QuickBooks Online or Xero — the books you actually bill from",
  },
  {
    label: "Reseller model",
    psa: "Typically assume Partner Center or direct CSP API access",
    trueup:
      "Reads seat counts straight from Microsoft Graph, so indirect resellers buying through Pax8, Ingram Micro, or Sherweb work on day one — no Partner Center access needed",
  },
  {
    label: "Buying it",
    psa: "Demo call, quote, onboarding project",
    trueup: "Flat transparent pricing, self-serve signup, cancel anytime",
  },
];

export default function LandingPage() {
  const diff = demoWorkspaceDiff();

  const increased = increasedSkus();
  const minPct = Math.round(
    Math.min(...increased.map((s) => s.pctIncrease))
  );
  const maxPct = Math.round(
    Math.max(...increased.map((s) => s.pctIncrease))
  );
  const basic = priceRow("O365_BUSINESS_ESSENTIALS");
  const f1 = priceRow("M365_F1_COMM");

  const faq: { q: string; a: React.ReactNode }[] = [
    {
      q: "What permissions do you need in my clients' tenants?",
      a: (
        <p>
          One app-only, read-only Graph permission —{" "}
          <span className="money">Organization.Read.All</span> — granted by
          your client&rsquo;s admin through Microsoft&rsquo;s standard
          admin-consent screen. It lets us read license counts, renewal dates,
          and the org&rsquo;s display name. We never touch mail, files, or
          user accounts. The exact scopes and Graph calls are spelled out on
          the <Link href="/security" className="text-primary underline underline-offset-4">security page</Link>.
        </p>
      ),
    },
    {
      q: "Do you write anything to QuickBooks?",
      a: (
        <p>
          No. The QuickBooks connection is read-only — we read recurring
          transactions and invoice lines to see what you bill. You keep
          invoicing exactly the way you do today; TrueUp just tells you where
          the invoices and the tenants disagree.
        </p>
      ),
    },
    {
      q: "I buy through Pax8 / Ingram / Sherweb. Does this work for me?",
      a: (
        <p>
          Yes — that&rsquo;s the point. TrueUp reads seat counts from
          Microsoft Graph in each client tenant, not from Partner Center, so
          it works no matter which distributor you buy through. Direct-bill
          CSPs work the same way.
        </p>
      ),
    },
    {
      q: "How long until I see real numbers?",
      a: (
        <p>
          About 30 minutes for the first tenant: consent takes a couple of
          minutes per tenant, the QuickBooks OAuth takes one screen, and the
          first sync runs right away. Map the tenant to its QuickBooks
          customer and the diff is on screen in the same session — the nightly
          sync keeps it current from then on.
        </p>
      ),
    },
    {
      q: "How do you handle security?",
      a: (
        <p>
          Read-only everywhere, least-privilege scopes, tokens encrypted at
          rest, no mailbox or file access — and an honest note about where we
          are on compliance. The full memo, including how to revoke our
          access in minutes, is at{" "}
          <Link href="/security" className="text-primary underline underline-offset-4">/security</Link>.
        </p>
      ),
    },
    {
      q: "Can I cancel anytime?",
      a: (
        <p>
          Yes. Billing is monthly and self-serve — cancel from the billing
          portal in two clicks, and your plan simply runs out at the end of
          the period. Email support afterward and we delete your workspace
          data.
        </p>
      ),
    },
  ];

  return (
    <>
      {/* ---------------------------------------------------------- HERO */}
      <section className="mx-auto w-full max-w-6xl px-6 pt-20 pb-16 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow text-muted-foreground">
            For MSPs that bill M365 from QuickBooks — no PSA required
          </p>
          <h1 className="display mt-6 text-5xl font-medium tracking-tight text-balance sm:text-6xl md:text-7xl">
            You bought the seats.{" "}
            <span className="text-primary">Bill them.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Every night, TrueUp pulls live seat counts from each client tenant
            via Microsoft Graph and diffs them against the recurring invoice
            lines in your QuickBooks. The seats you&rsquo;re paying your
            distributor for — but never put on an invoice — show up as
            dollars, client by client, SKU by SKU.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/dashboard">Start free trial — no card</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/demo">See the live demo</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            First diff in about 30 minutes: one admin-consent link per tenant,
            one QuickBooks OAuth.
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-3xl">
          <LedgerHero diff={diff} />
        </div>
      </section>

      {/* -------------------------------------------------- HOW IT WORKS */}
      <section id="how" className="scroll-mt-24 border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <p className="eyebrow text-muted-foreground">How it works</p>
          <h2 className="display mt-4 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
            Three connections. No agents, no PSA, no migration.
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-8 md:first:border-l-0 md:first:pl-0"
              >
                <span className="money text-3xl text-primary/50">
                  {step.n}
                </span>
                <h3 className="mt-3 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- WEDGE */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <p className="eyebrow text-muted-foreground">The wedge</p>
          <h2 className="display mt-4 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
            Built for the shops the big tools skip.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            License-reconciliation tools exist — Gradient MSP, CloudOlive —
            but they&rsquo;re built PSA-first. If you bill Microsoft 365 out
            of QuickBooks, you&rsquo;re not who they had in mind. You&rsquo;re
            who we had in mind.
          </p>

          <div className="mt-10 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="w-36 px-5 py-3" />
                  <th className="eyebrow px-5 py-3 text-left font-normal text-muted-foreground">
                    PSA-first tools
                  </th>
                  <th className="eyebrow px-5 py-3 text-left font-normal text-primary">
                    TrueUp
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-b last:border-b-0">
                    <td className="eyebrow px-5 py-4 align-top text-muted-foreground/80">
                      {row.label}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed text-muted-foreground">
                      {row.psa}
                    </td>
                    <td className="px-5 py-4 align-top leading-relaxed font-medium">
                      {row.trueup}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- TIMELINESS */}
      <section className="border-t bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <p className="eyebrow text-caution">On the calendar · 2026</p>
          <h2 className="display mt-4 max-w-2xl text-3xl font-medium tracking-tight sm:text-4xl">
            Microsoft just made sloppy billing more expensive.
          </h2>

          <div className="mt-10 max-w-3xl space-y-0 border-t">
            <div className="grid gap-2 border-b py-6 sm:grid-cols-[140px_1fr] sm:gap-8">
              <div className="money text-sm font-medium text-caution">
                {dateLabel(PRICE_INCREASE_EFFECTIVE)}
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  List-price increase on{" "}
                  <span className="money">{increased.length}</span> core SKUs
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="money">+{minPct}%</span> to{" "}
                  <span className="money">+{maxPct}%</span> depending on SKU
                  {basic && f1 ? (
                    <>
                      {" "}
                      — Business Basic{" "}
                      <span className="money">
                        +{Math.round(basic.pctIncrease)}%
                      </span>
                      , M365 F1{" "}
                      <span className="money">
                        +{Math.round(f1.pctIncrease)}%
                      </span>
                    </>
                  ) : null}
                  . Every NCE renewal after this date reprices your cost. If
                  your client invoices don&rsquo;t move with it, the increase
                  comes straight out of your margin.
                </p>
              </div>
            </div>

            <div className="grid gap-2 border-b py-6 sm:grid-cols-[140px_1fr] sm:gap-8">
              <div className="money text-sm font-medium text-caution">
                {dateLabel(EST_RULES.effectiveDate)}
              </div>
              <div>
                <h3 className="text-base font-semibold">
                  Extended Service Term surcharges
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  An expired NCE subscription no longer gets a free grace
                  period — it converts to month-to-month at the monthly rate{" "}
                  <span className="money">
                    +{EST_RULES.monthlySurchargePct}%
                  </span>{" "}
                  (or{" "}
                  <span className="money">
                    +{EST_RULES.prepaidSurchargePct}%
                  </span>{" "}
                  when the product has no monthly plan). Auto-renew off
                  without a scheduled cancellation converts automatically —
                  the quiet billing trap for CSP partners.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild variant="outline">
              <Link href="/tools/m365-price-checklist">
                Check your SKUs against the new list
                <ArrowRight />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">
              Free, no signup — old vs. new price for every SKU that moved.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- HONEST STAT */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
          <p className="eyebrow text-muted-foreground">The honest number</p>
          <p className="display mt-6 text-3xl leading-snug font-medium tracking-tight text-balance sm:text-4xl">
            Vendors in this category report finding around{" "}
            <span className="money text-[0.85em] text-leak">$1,200/mo</span>{" "}
            in unbilled licenses per MSP.
          </p>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            That&rsquo;s what category vendors report — not a TrueUp number,
            and your book is your book. Our demo shows what a{" "}
            <span className="money">{diff.totalClients}</span>-client scan
            actually looks like:{" "}
            <span className="money text-leak">
              {money(diff.totalMonthlyLeak)}/mo
            </span>{" "}
            confirmed and{" "}
            <span className="money text-caution">
              ~{money(diff.totalEstimatedUnmappedValue)}/mo
            </span>{" "}
            potential.{" "}
            <Link
              href="/demo"
              className="font-medium text-primary underline underline-offset-4"
            >
              Walk through it
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------- PRICING */}
      <section className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">Pricing</p>
              <h2 className="display mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
                Flat. Public. Self-serve.
              </h2>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Compare plans in full
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <PlanCard plan={PLANS.starter} />
            <PlanCard plan={PLANS.pro} featured />
            <PlanCard plan={PLANS.scale} />
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Every plan starts with a{" "}
            <span className="money">{TRIAL_DAYS}</span>-day free trial of
            everything in Pro. No card required.
          </p>
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ */}
      <section className="border-t">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
          <p className="eyebrow text-muted-foreground">Questions</p>
          <h2 className="display mt-4 text-3xl font-medium tracking-tight sm:text-4xl">
            Asked by skeptical MSP owners.
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {faq.map((item) => (
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
      </section>

      {/* ------------------------------------------------------ FINAL CTA */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="rounded-xl bg-primary px-8 py-16 text-center text-primary-foreground sm:px-16">
          <p className="eyebrow text-primary-foreground/70">
            {TRIAL_DAYS}-day trial · no card · up to{" "}
            <span className="money">{PLANS.trial.tenantLimit}</span> tenants
          </p>
          <h2 className="display mt-4 text-3xl font-medium tracking-tight text-balance sm:text-5xl">
            Know what you&rsquo;re leaking by tomorrow morning.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
            Consent one tenant, connect QuickBooks, and the nightly sync does
            the rest. If the diff comes back clean, at least now you know.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard">Start free trial — no card</Link>
            </Button>
            <Link
              href="/demo"
              className="text-sm font-medium text-primary-foreground underline underline-offset-4 hover:no-underline"
            >
              or walk the live demo first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
