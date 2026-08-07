"use client";

import Link from "next/link";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";

// Klasy przychodzą z zewnątrz, bo ten komponent obsługuje stronę główną, a ta ma
// własny namespace CSS. Domyślne wartości zachowują dotychczasowy wygląd.
type ClerkMarketingActionsProps = {
  linkClassName?: string;
  buttonClassName?: string;
  userButtonClassName?: string;
  userNameClassName?: string;
};

export function ClerkMarketingActions({
  linkClassName = "pm-auth-link",
  buttonClassName = "pm-button pm-button-nav",
  userButtonClassName = "pm-clerk-user-button",
  userNameClassName = "pm-clerk-user-name",
}: ClerkMarketingActionsProps = {}) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <>
        <Link className={linkClassName} href="/logowanie">Zaloguj się</Link>
        <Link className={buttonClassName} href="/rejestracja">
          Załóż firmę <ArrowRight size={15} />
        </Link>
      </>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton forceRedirectUrl="/panel">
          <button className={linkClassName} type="button">Zaloguj się</button>
        </SignInButton>
        <SignUpButton forceRedirectUrl="/panel">
          <button className={buttonClassName} type="button">
            Załóż firmę <ArrowRight size={15} />
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <Link className={linkClassName} href="/panel">Przejdź do firmy</Link>
        <UserButton
          showName
          userProfileMode="modal"
          appearance={{
            elements: {
              userButtonBox: userButtonClassName,
              userButtonOuterIdentifier: userNameClassName,
            },
          }}
        />
      </Show>
    </>
  );
}
