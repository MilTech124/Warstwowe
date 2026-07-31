"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { plPL } from "@clerk/localizations";

export function Providers({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) return children;
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      localization={plPL}
      telemetry={false}
      signInUrl="/logowanie"
      signUpUrl="/rejestracja"
      signInFallbackRedirectUrl="/panel"
      signUpFallbackRedirectUrl="/panel"
    >
      {children}
    </ClerkProvider>
  );
}
