# TrueUp

**Stop leaking Microsoft 365 margin.** TrueUp is a billing-leak detector for
small MSPs that resell Microsoft 365 and bill from QuickBooks Online instead of
a PSA. Every night it pulls live seat counts from each client tenant via
Microsoft Graph and diffs them against the recurring-invoice lines in the
MSP's books, then shows one number: **"$X/mo you're licensed for but not
billing."**

Category vendors report finding an average of ~$1,200/mo in unbilled licenses
per MSP. TrueUp's wedge: every credible incumbent reconciles into a PSA
(ConnectWise, Autotask, Halo) that sub-15-person shops don't run — TrueUp
reconciles into the books they actually bill from, works for **indirect** CSP
resellers (Pax8 / Ingram / Sherweb) via Graph + admin consent, and sells
self-serve at flat prices ($79 / $149 / $249) with a 14-day no-card trial.

## Product surfaces

| Route | What it is |
|---|---|
| `/` | Marketing site (positioning, wedge, pricing preview, FAQ) |
| `/pricing`, `/security` | Plans; honest security/permissions page |
| `/demo` | Public interactive money screen on sample data — the sales pitch |
| `/tools/m365-price-checklist` | Free July-2026 Microsoft price-increase calculator (lead magnet) |
| `/onboarding` | Tenant consent wizard + QuickBooks connect |
| `/dashboard` | The money screen: per-client unbilled-seats ledger |
| `/clients/[id]` | Per-client SKU diff, seat history, renewals |
| `/mapping` | Tenant→customer and SKU→invoice-line mapping with suggestions |
| `/renewals` | NCE renewal calendar with EST-surcharge flags + repricing checklist |
| `/settings` | Workspace, Polar billing, tenants, accounting connection |

## How the sync works

- **Microsoft:** one multi-tenant Entra app; each client's Global Admin grants
  app-only `Organization.Read.All` via an admin-consent link. Nightly Convex
  cron pulls `subscribedSkus` (seats) and `directory/subscriptions` (renewal
  dates) per tenant. Deliberately Graph-first — the Partner Center API is
  closed to indirect resellers, which is exactly who we serve.
- **QuickBooks:** OAuth (read-only accounting scope) entirely on Convex HTTP
  routes — tokens never touch the Next.js server. Pulls recurring-transaction
  templates (fallback: latest invoice per customer).
- **Diff engine:** pure TypeScript in `lib/diff.ts`, shared by the dashboard,
  the public demo, and the email digest.

## Stack

Next.js 16 (App Router) · Convex (DB, crons, HTTP actions) · Clerk (auth) ·
Polar (merchant-of-record billing) · shadcn/ui + Tailwind 4 · Resend (digest).

## Development

```bash
yarn install
npx convex dev   # first run: creates deployment + .env.local
yarn dev
```

Full production setup (Entra app registration, QBO app, Clerk, Polar, deploy):
**[docs/SETUP.md](docs/SETUP.md)**.

Works without any Microsoft/QBO credentials for UI development: `/demo` and the
calculator run on fixtures, and the app pages render their empty/setup states.

## Repo map

```
app/(marketing)/   landing, pricing, security
app/demo/          public sample-data money screen
app/tools/         repricing calculator (lead magnet)
app/(app)/         authed product: dashboard, clients, mapping, renewals, onboarding, settings
components/        app shell, per-surface components, shadcn/ui
convex/            schema, sync engine (Graph/QBO), diff queries, billing, crons, webhooks
lib/               diff engine, SKU catalog, verified July-2026 price table, plans, fixtures
docs/SETUP.md      production setup guide
```
