# Next.js + Clerk + Convex + Polar Template

A production-ready SaaS starter template with authentication, real-time database, subscription billing, and a full UI component library.

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Backend:** [Convex](https://convex.dev/) (real-time serverless database + functions)
- **Auth:** [Clerk](https://clerk.com/) (authentication + user management)
- **Billing:** [Polar](https://polar.sh/) (merchant-of-record subscription billing)
- **UI:** [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS 4](https://tailwindcss.com/) + [Radix UI](https://radix-ui.com/)

## Prerequisites

- [Node.js](https://nodejs.org/) 20.9 or later (Node 24 LTS recommended — Vercel's default runtime)
- A [Clerk](https://clerk.com/) account
- A [Convex](https://convex.dev/) account
- A [Polar](https://polar.sh/) account (for billing)

---

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd nextjs-clerk-shadcn
yarn install
```

### 2. Set Up Convex

1. Create a new project at [dashboard.convex.dev](https://dashboard.convex.dev/)
2. Install the Convex CLI if you haven't:
   ```bash
   npm install -g convex
   ```
3. Link your project:
   ```bash
   npx convex dev
   ```
   This will prompt you to log in and select your project. It generates a `.env.local` file with `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL`.

### 3. Set Up Clerk

1. Create a new application at [dashboard.clerk.com](https://dashboard.clerk.com/)
2. Go to **API Keys** and copy your keys
3. Add to `.env.local`:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

### 4. Connect Clerk to Convex

1. In your Clerk Dashboard, go to **JWT Templates**
2. Create a new template:
   - Name: `convex`
   - Issuer: leave as default (e.g. `https://your-app.clerk.accounts.dev`)
3. Copy the **Issuer URL**
4. In your [Convex Dashboard](https://dashboard.convex.dev/), go to **Settings > Environment Variables** and add:
   ```
   CLERK_JWT_ISSUER_DOMAIN=https://your-app.clerk.accounts.dev
   ```

> See [Convex Clerk docs](https://docs.convex.dev/auth/clerk) for detailed instructions.

### 5. Set Up Clerk Webhooks (User Sync)

This template automatically syncs Clerk users to your Convex database via webhooks.

1. In your Clerk Dashboard, go to **Webhooks**
2. Add a new endpoint:
   - **URL:** `https://<your-convex-deployment>.convex.site/clerk/webhook`
     (Find your Convex site URL in your Convex Dashboard under **Settings > URL & Deploy Key**)
   - **Events:** Select `user.created`, `user.updated`, `user.deleted`
3. Copy the **Signing Secret**
4. In your Convex Dashboard, add the environment variable:
   ```
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### 6. Set Up Polar (Billing)

1. Create an organization at [polar.sh](https://polar.sh/)
2. Create a product (e.g., "Premium Monthly" subscription)
3. Go to **Settings > Developers** and create an access token
4. In your Convex Dashboard, add these environment variables:
   ```
   POLAR_ORGANIZATION_TOKEN=polar_at_...
   POLAR_WEBHOOK_SECRET=...
   POLAR_SERVER=sandbox
   POLAR_PRODUCT_PREMIUM_MONTHLY=<your-polar-product-id>
   ```

5. Set up the Polar webhook:
   - Go to **Settings > Webhooks** in your Polar Dashboard
   - Add a new endpoint:
     - **URL:** `https://<your-convex-deployment>.convex.site/polar/events`
     - **Events:** Select all subscription and order events
   - Copy the **Webhook Secret** and set it as `POLAR_WEBHOOK_SECRET` in Convex

6. Sync your products by clicking "Sync Products" in the app UI, or run:
   ```bash
   npx convex run polarSync:syncProducts
   ```

> Use `POLAR_SERVER=sandbox` for development, change to `production` when going live.

### 7. Run the Development Server

```bash
yarn dev
```

This starts both the Next.js frontend and Convex backend in parallel. Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables Summary

### `.env.local` (local dev, created by `npx convex dev`)

| Variable | Description |
|---|---|
| `CONVEX_DEPLOYMENT` | Your Convex deployment identifier |
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |

### Convex Dashboard Environment Variables

| Variable | Description |
|---|---|
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT issuer URL for Convex auth |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret |
| `POLAR_ORGANIZATION_TOKEN` | Polar API access token |
| `POLAR_WEBHOOK_SECRET` | Polar webhook signing secret |
| `POLAR_SERVER` | `sandbox` or `production` |
| `POLAR_PRODUCT_PREMIUM_MONTHLY` | Polar product ID for the premium plan |

---

## Deployment

### Deploy Convex Backend

```bash
npx convex deploy
```

This deploys your Convex functions to production. Make sure all environment variables are set in the Convex Dashboard for your production deployment.

### Deploy Next.js Frontend

#### Vercel (Recommended)

1. Push your repo to GitHub
2. Import the project at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel:
   - `CONVEX_DEPLOYMENT` (your production deployment)
   - `NEXT_PUBLIC_CONVEX_URL` (your production Convex URL)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production key from Clerk)
   - `CLERK_SECRET_KEY` (production key from Clerk)
4. Deploy

#### Other Hosts

Any platform that supports Node.js can host this app:

```bash
yarn build
yarn start
```

### Post-Deployment Checklist

- [ ] Update Clerk webhook URL to use production Convex site URL
- [ ] Update Polar webhook URL to use production Convex site URL
- [ ] Switch `POLAR_SERVER` from `sandbox` to `production` in Convex env vars
- [ ] Verify user sign-up creates a user document in Convex
- [ ] Verify billing checkout flow works end-to-end
- [ ] Set up a production Clerk instance (not just test mode)

---

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout (Clerk + Convex providers)
│   ├── page.tsx            # Home page (auth UI + billing)
│   └── globals.css         # Global styles + Tailwind theme
├── components/
│   ├── ConvexClientProvider.tsx  # Convex + Clerk auth bridge
│   ├── SectionBilling.tsx       # Subscription management UI
│   └── ui/                      # shadcn/ui components (40+)
├── convex/
│   ├── schema.ts           # Database schema (users table)
│   ├── auth.config.ts      # Clerk JWT config for Convex
│   ├── convex.config.ts    # Convex app config + Polar plugin
│   ├── http.ts             # HTTP routes (Clerk + Polar webhooks)
│   ├── example.ts          # Polar billing queries + actions
│   ├── user.ts             # User query (getMe)
│   ├── users.ts            # User mutations (webhook handlers)
│   └── polarSync.ts        # Product sync action
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities (cn helper)
├── proxy.ts                # Clerk auth proxy (route protection)
└── package.json
```

---

## Scripts

| Command | Description |
|---|---|
| `yarn dev` | Start frontend + backend in parallel |
| `yarn dev:frontend` | Start Next.js dev server only |
| `yarn dev:backend` | Start Convex dev server only |
| `yarn build` | Build for production |
| `yarn start` | Start production server |
| `yarn lint` | Run ESLint |

---

## Adding UI Components

This template includes [shadcn/ui](https://ui.shadcn.com/). Add more components with:

```bash
npx shadcn@latest add <component-name>
```

For example: `npx shadcn@latest add button dialog sheet`

---

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Convex Documentation](https://docs.convex.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [Polar Documentation](https://docs.polar.sh/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
