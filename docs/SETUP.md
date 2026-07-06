# TrueUp — Production setup

Everything TrueUp needs, in the order to do it. Budget ~45 minutes.

## 0. Prerequisites

- Node 20.9+ (Node 24 LTS recommended), Yarn
- Accounts: [Convex](https://convex.dev), [Clerk](https://clerk.com), [Polar](https://polar.sh),
  a Microsoft Entra tenant you administer (your MSP tenant), an
  [Intuit developer](https://developer.intuit.com) account

## 1. Convex

```bash
yarn install
npx convex dev        # log in, create project — writes .env.local
```

`.env.local` gets `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.

Your **Convex site URL** (for webhooks/redirects below) is shown in the Convex
dashboard under Settings → URL & Deploy Key. It looks like
`https://<deployment>.convex.site`.

## 2. Clerk

1. Create an application at dashboard.clerk.com
2. API Keys → copy into `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
   CLERK_SECRET_KEY=sk_...
   ```
3. JWT Templates → New template → name it exactly `convex`. Copy the Issuer URL.
4. Convex dashboard → Settings → Environment Variables:
   ```
   CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
   ```
5. Webhooks → Add endpoint `https://<convex-site>/clerk/webhook`, events
   `user.created`, `user.updated`, `user.deleted`. Copy the signing secret →
   Convex env `CLERK_WEBHOOK_SECRET`.

## 3. Microsoft Entra app registration (the sync engine)

TrueUp reads each client tenant with **app-only Microsoft Graph** access that
the client's Global Admin grants through an admin-consent link. One multi-tenant
app registration in **your** tenant serves all clients.

1. [Entra admin center](https://entra.microsoft.com) → App registrations →
   **New registration**
   - Name: `TrueUp Reconciliation` (clients see this on the consent screen)
   - Supported account types: **Accounts in any organizational directory
     (multitenant)**
   - Redirect URI: platform **Web**, value `https://<convex-site>/ms/consent-callback`
2. **API permissions** → Add → Microsoft Graph → **Application permissions** →
   `Organization.Read.All` → Add. Remove the default delegated `User.Read` if
   you want the consent screen minimal. Click **Grant admin consent** for your
   own tenant (lets you test against your own tenant immediately).
3. **Certificates & secrets** → New client secret (24 months) → copy the value.
4. Convex env:
   ```
   MS_CLIENT_ID=<Application (client) ID>
   MS_CLIENT_SECRET=<secret value>
   APP_URL=https://app.yourdomain.com   # where users land after consent
   ```

Notes
- `Organization.Read.All` covers both `GET /subscribedSkus` (seat counts) and
  `GET /directory/subscriptions` (renewal dates). TrueUp requests nothing else.
- Until you complete Microsoft **publisher verification**, client admins see an
  "unverified" note on the consent screen. Do it early (Partner Center → MPN ID
  association) — it materially improves consent completion.
- Consent can take a minute to propagate; TrueUp retries the first sync
  automatically when consent lands.

## 4. QuickBooks Online app

1. developer.intuit.com → Create an app → **QuickBooks Online and Payments**
2. Scopes: `com.intuit.quickbooks.accounting`
3. Redirect URI: `https://<convex-site>/qbo/callback`
4. Convex env (use Development keys + a sandbox company first):
   ```
   QBO_CLIENT_ID=...
   QBO_CLIENT_SECRET=...
   QBO_ENV=sandbox        # switch to production with production keys
   ```

Intuit requires app review before production keys can be used by arbitrary
companies; your own production company works immediately for dogfooding.

## 5. Polar billing

1. polar.sh → create organization → Products: create three **monthly
   subscription** products — Starter $79, Pro $149, Scale $249
2. Settings → Developers → access token
3. Settings → Webhooks → endpoint `https://<convex-site>/polar/events`, select
   all subscription + order events, copy secret
4. Convex env:
   ```
   POLAR_ORGANIZATION_TOKEN=polar_at_...
   POLAR_WEBHOOK_SECRET=...
   POLAR_SERVER=sandbox            # production when live
   POLAR_PRODUCT_STARTER_MONTHLY=<product id>
   POLAR_PRODUCT_PRO_MONTHLY=<product id>
   POLAR_PRODUCT_SCALE_MONTHLY=<product id>
   ```
5. First run: Settings → Plan & Billing → "Sync products from Polar" (or
   `npx convex run polarSync:syncProducts`).

## 6. Digest email (optional)

```
RESEND_API_KEY=re_...
EMAIL_FROM=TrueUp <digest@updates.yourdomain.com>
```

Unset = digests are skipped silently. The digest cron runs daily 09:00 UTC and
emails each workspace 3 days before its configured billing day, once per month.

## 7. Run

```bash
yarn dev     # Next.js + Convex together
```

Nightly syncs: Graph at 03:00 UTC, QuickBooks at 03:30 UTC (see `convex/crons.ts`).

## 8. Deploy

- **Convex:** `npx convex deploy`, then set all Convex env vars on the
  production deployment (they do not copy from dev).
- **Next.js (Vercel):** import repo, set `CONVEX_DEPLOYMENT`,
  `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`. 
- Update the three redirect/webhook URLs (Clerk webhook, Entra redirect URI,
  QBO redirect URI, Polar webhook) to the production Convex site URL, and
  `APP_URL` to the production app URL.
- Switch `POLAR_SERVER=production` and QBO to production keys after review.

## Smoke test (15 min)

1. Sign up → workspace auto-created → Onboarding
2. Add your own MSP tenant ID → open the consent link as Global Admin → accept
   → within a minute the tenant shows **connected** with seat counts
3. Connect a QBO sandbox company that has a recurring invoice → lines appear
4. Mapping: accept suggestions → Dashboard shows the diff
5. Settings → Plan & Billing → checkout with Polar sandbox → plan reflects
