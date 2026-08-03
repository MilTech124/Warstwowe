"use client";

import Link from "next/link";
import { SignOutButton, useClerk, useUser } from "@clerk/nextjs";
import { LogOut, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

function Trigger({
  label,
  initials,
  imageUrl,
}: {
  label: string;
  initials: string;
  imageUrl?: string;
}) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Konto: ${label}`}>
        <Avatar className="size-8">
          {imageUrl && <AvatarImage src={imageUrl} alt="" />}
          <AvatarFallback className="bg-primary text-[11px] font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Button>
    </DropdownMenuTrigger>
  );
}

/** Rendered only when Clerk is configured, so the hooks are always safe. */
function ClerkUserMenu({ fallbackInitials }: { fallbackInitials: string }) {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || email || "Konto";
  const initials =
    [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase()
    || email.slice(0, 2).toUpperCase()
    || fallbackInitials;

  return (
    <DropdownMenu>
      <Trigger
        label={name}
        initials={isLoaded ? initials : fallbackInitials}
        imageUrl={user?.imageUrl}
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="grid gap-0.5">
          <span className="truncate text-sm font-semibold">{name}</span>
          {email && (
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openUserProfile()}>
          <UserRound size={15} />
          Moje konto
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SignOutButton redirectUrl="/">
          <DropdownMenuItem variant="destructive" onSelect={(event) => event.preventDefault()}>
            <LogOut size={15} />
            Wyloguj się
          </DropdownMenuItem>
        </SignOutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Account menu for the panel topbar. The panel previously had no sign-out
 * affordance at all — the avatar was a plain <span>.
 */
export function UserMenu({
  fallbackInitials,
  companyName,
}: {
  fallbackInitials: string;
  companyName: string;
}) {
  if (clerkConfigured) return <ClerkUserMenu fallbackInitials={fallbackInitials} />;

  // Local/demo runs without Clerk: no session to sign out of.
  return (
    <DropdownMenu>
      <Trigger label={companyName} initials={fallbackInitials} />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="text-sm font-semibold">{companyName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/logowanie">Zaloguj się</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
