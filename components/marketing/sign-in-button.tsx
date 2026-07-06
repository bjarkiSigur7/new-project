"use client";

// Small client island so the (otherwise server-rendered) marketing nav can
// open Clerk's sign-in modal.

import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function MarketingSignIn() {
  return (
    <SignInButton mode="modal">
      <Button variant="ghost" size="sm">
        Sign in
      </Button>
    </SignInButton>
  );
}
