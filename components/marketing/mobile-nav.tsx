"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Menu } from "lucide-react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type MarketingNavLink = { href: Route; label: string };

export function MobileNav({ links }: { links: MarketingNavLink[] }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open menu"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle className="display text-left text-lg font-semibold tracking-tight">
            TrueUp
          </SheetTitle>
          <SheetDescription className="sr-only">
            Site navigation
          </SheetDescription>
        </SheetHeader>
        <nav className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t p-4">
          <SignInButton mode="modal">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Sign in
            </Button>
          </SignInButton>
          <Button asChild onClick={() => setOpen(false)}>
            <Link href="/dashboard">Start free trial</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
