"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutGrid,
  GitCompareArrows,
  CalendarClock,
  Settings,
  Rocket,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/mapping", label: "Mapping", icon: GitCompareArrows },
  { href: "/renewals", label: "Renewals", icon: CalendarClock },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ensureWorkspace = useMutation(api.workspaces.ensureWorkspace);
  const status = useQuery(api.workspaces.getWorkspaceStatus);

  useEffect(() => {
    void ensureWorkspace({});
  }, [ensureWorkspace]);

  const setupDone =
    status != null &&
    status.connectedTenantCount > 0 &&
    status.hasAccounting &&
    status.mappedClientCount > 0;

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col bg-sidebar text-sidebar-foreground max-md:hidden">
        <Link href="/dashboard" className="flex items-baseline gap-1 px-5 pt-6 pb-8">
          <span className="display text-xl font-semibold tracking-tight text-sidebar-primary">
            TrueUp
          </span>
          <span className="money text-[10px] text-sidebar-foreground/50">
            beta
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {!setupDone && (
            <NavLink
              href="/onboarding"
              label="Get set up"
              icon={Rocket}
              active={pathname.startsWith("/onboarding")}
              highlight
            />
          )}
          {NAV.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname.startsWith(item.href)}
            />
          ))}
        </nav>

        <div className="px-5 py-5">
          {status && (
            <div className="eyebrow text-sidebar-foreground/60">
              {status.trialDaysLeft > 0
                ? `Trial · ${status.trialDaysLeft}d left`
                : "Trial ended"}
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col md:pl-56">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/90 px-6 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="display text-lg font-semibold md:hidden">
              TrueUp
            </Link>
            <span className="text-sm text-muted-foreground max-md:hidden">
              {status?.workspace.name ?? ""}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="flex gap-3 md:hidden">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm",
                    pathname.startsWith(item.href)
                      ? "font-medium text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <UserButton />
          </div>
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  highlight,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
        highlight && !active && "text-sidebar-primary"
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
