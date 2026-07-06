import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Exactly what TrueUp can see, store, and touch: read-only Microsoft Graph and QuickBooks scopes, what we store, what we never do, and how to revoke access in minutes.",
};

function MemoSection({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3 border-t py-10 sm:grid-cols-[72px_1fr] sm:gap-8">
      <div className="money text-sm text-muted-foreground/70">{n}</div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
          {children}
        </div>
      </div>
    </section>
  );
}

function ScopeList({ items }: { items: { call: string; note: string }[] }) {
  return (
    <ul className="money mt-2 space-y-1.5 rounded-md border bg-muted/40 px-4 py-3 text-xs text-foreground">
      {items.map((item) => (
        <li
          key={item.call}
          className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-0.5"
        >
          <span>{item.call}</span>
          <span className="text-muted-foreground">{item.note}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SecurityPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-20">
      <p className="eyebrow text-muted-foreground">Security memo</p>
      <h1 className="display mt-4 text-4xl font-medium tracking-tight text-balance sm:text-5xl">
        What TrueUp can see, store, and touch.
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
        Written for the MSP owner who actually reads consent screens. No
        marketing gloss — this is the whole surface area.{" "}
        <span className="money">Last updated Jul 6, 2026.</span>
      </p>

      <div className="mt-12">
        <MemoSection n="01" title="What we access">
          <p>
            <strong>Microsoft side.</strong> Nothing until your client&rsquo;s
            admin consents. Each client tenant grants our multi-tenant app one
            app-only, read-only permission —{" "}
            <span className="money">Organization.Read.All</span> — through
            Microsoft&rsquo;s standard admin-consent screen. No delegated
            access, no GDAP relationship, no Partner Center. With it we make
            exactly three kinds of Graph reads:
          </p>
          <ScopeList
            items={[
              {
                call: "GET /v1.0/subscribedSkus",
                note: "license counts per SKU",
              },
              {
                call: "GET /v1.0/directory/subscriptions",
                note: "NCE renewal dates & status",
              },
              {
                call: "GET /v1.0/organization",
                note: "the org's display name",
              },
            ]}
          />
          <p>
            <strong>QuickBooks side.</strong> One OAuth connection to your own
            QuickBooks Online company with the read-only accounting scope. We
            read recurring transactions, invoices, and company info — the
            lines that show what you bill each client. Xero connections work
            the same way, read-only.
          </p>
        </MemoSection>

        <MemoSection n="02" title="What we store">
          <p>
            Seat counts per SKU per tenant (nightly snapshots), subscription
            renewal dates, and the invoice line items we diff against — item
            name, quantity, unit price. Plus your own login identity via
            Clerk and your workspace settings.
          </p>
          <p>
            OAuth tokens are encrypted at rest by Convex, our backend
            platform. We store <strong>no mailbox content, no files, and no
            end-user PII</strong> from client tenants — the only person whose
            identity we hold is you, the MSP.
          </p>
        </MemoSection>

        <MemoSection n="03" title="What we never do">
          <p>
            We never <strong>write to your books</strong> — we hold no write
            scopes on QuickBooks or Xero, so we couldn&rsquo;t modify an
            invoice if we wanted to. We never touch client{" "}
            <strong>mailboxes, files, or user accounts</strong> — the
            permission we hold can&rsquo;t read them. And we never{" "}
            <strong>sell or share your data</strong>; your clients&rsquo; seat
            counts are your competitive information, not our product.
          </p>
        </MemoSection>

        <MemoSection n="04" title="Architecture">
          <p>
            Authentication is Clerk. Data and scheduled jobs run on Convex.
            Nightly crons pull seat counts from Microsoft Graph and invoice
            lines from QuickBooks, run the diff, and store the result — there
            are no agents to install and nothing runs inside your or your
            clients&rsquo; environments.
          </p>
          <p>
            Deleting a workspace deletes its data: seat snapshots, invoice
            lines, mappings, and tokens. Today that&rsquo;s an email to
            support; self-serve deletion is on the roadmap.
          </p>
        </MemoSection>

        <MemoSection n="05" title="The honest part">
          <p>
            We&rsquo;re a small company. We don&rsquo;t have SOC 2 yet —
            audits of that size come with scale, and we won&rsquo;t pretend
            otherwise. Here&rsquo;s what we do instead:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Least privilege by design.</strong> Every scope we hold
              is read-only. The worst-case blast radius of our access is
              license counts and invoice line items — not mail, not files,
              not money movement.
            </li>
            <li>
              <strong>Tokens encrypted at rest</strong>, secrets never in
              client-side code, and no third-party analytics running against
              your workspace data.
            </li>
            <li>
              <strong>Revocable in minutes</strong> — by you or your client,
              without asking us. Instructions below.
            </li>
          </ul>
        </MemoSection>

        <MemoSection n="06" title="Revoking our access">
          <p>
            <strong>Microsoft (per client tenant):</strong> in the Microsoft
            Entra admin center, go to{" "}
            <span className="money">
              Enterprise applications &rarr; TrueUp &rarr; Delete
            </span>
            . Consent is revoked and our tokens for that tenant stop working
            immediately. Any client admin can do this without contacting us.
          </p>
          <p>
            <strong>QuickBooks:</strong> disconnect from inside TrueUp
            (Settings &rarr; Accounting), or from Intuit&rsquo;s side under{" "}
            <span className="money">My Apps</span> in your Intuit account.
          </p>
          <p>
            Then email support to have stored data deleted. If you find a
            security issue, email us — we read every report and respond
            fast.
          </p>
        </MemoSection>
      </div>

      <p className="border-t pt-6 text-xs leading-relaxed text-muted-foreground">
        TrueUp is not affiliated with Microsoft or Intuit. Microsoft 365 and
        Microsoft Entra are trademarks of Microsoft Corporation; QuickBooks is
        a trademark of Intuit Inc.
      </p>
    </div>
  );
}
