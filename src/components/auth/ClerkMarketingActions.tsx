"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

export function ClerkMarketingActions() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <>
        <Link className="pm-auth-link" href="/logowanie">Zaloguj się</Link>
        <Link className="pm-button pm-button-nav" href="/rejestracja">
          Załóż firmę <ArrowRight size={15} />
        </Link>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton forceRedirectUrl="/panel">
          <button className="pm-auth-link" type="button">Zaloguj się</button>
        </SignInButton>
        <SignUpButton forceRedirectUrl="/panel">
          <button className="pm-button pm-button-nav" type="button">
            Załóż firmę <ArrowRight size={15} />
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link className="pm-auth-link" href="/panel">Przejdź do firmy</Link>
        <UserButton
          showName
          userProfileMode="modal"
          appearance={{
            elements: {
              rootBox: "pm-clerk-user-root",
              userButtonBox: "pm-clerk-user-button",
              userButtonOuterIdentifier: "pm-clerk-user-name",
            },
          }}
        />
      </Show>
    </>
  );
}
