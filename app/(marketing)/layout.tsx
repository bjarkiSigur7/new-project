import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MarketingSignIn } from "@/components/marketing/sign-in-button";
import {
  MobileNav,
  type MarketingNavLink,
} from "@/components/marketing/mobile-nav";

const NAV_LINKS: MarketingNavLink[] = [
  { href: "/#how", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Live demo" },
  { href: "/tools/m365-price-checklist", label: "Price checklist" },
  { href: "/security", label: "Security" },
];

const FOOTER_LINKS: MarketingNavLink[] = [
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Live demo" },
  { href: "/security", label: "Security" },
  { href: "/tools/m365-price-checklist", label: "Price checklist" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-6">
          <Link
            href="/"
            className="display text-xl font-semibold tracking-tight"
          >
            TrueUp
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <MarketingSignIn />
            </div>
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link href="/dashboard">Start free trial</Link>
            </Button>
            <MobileNav links={NAV_LINKS} />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl px-6 py-12">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div className="max-w-sm space-y-3">
              <p className="display text-lg font-semibold tracking-tight">
                TrueUp
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nightly diff of your clients&rsquo; live Microsoft 365 seat
                counts against your QuickBooks recurring invoices — so every
                seat you&rsquo;re licensed for lands on an invoice.
              </p>
            </div>
            <nav className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
              {FOOTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
            <p>&copy; 2026 TrueUp. Not affiliated with Microsoft or Intuit.</p>
            <p>
              Microsoft 365 is a trademark of Microsoft Corporation. QuickBooks
              is a trademark of Intuit Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
