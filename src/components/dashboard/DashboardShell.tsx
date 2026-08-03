"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Boxes, Check, ChevronsUpDown, ExternalLink, Menu, ShieldAlert, X } from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CompanyRole, FeatureKey } from "@/types/saas";

export function DashboardShell({
  slug,
  companyName,
  packageCode,
  accessActive,
  role,
  features,
  superadminAccess = false,
  children,
}: {
  slug: string;
  companyName: string;
  packageCode: string;
  accessActive: boolean;
  role: CompanyRole;
  features?: Partial<Record<FeatureKey, boolean>>;
  superadminAccess?: boolean;
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  const initials = companyName.slice(0, 2).toUpperCase();

  return (
    // `.dashboard-shell` survives only as the scope hook for src/app/dashboard.css.
    <TooltipProvider delayDuration={150}>
    <div className="dashboard-shell flex min-h-screen bg-surface-muted">
      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Zamknij nawigację"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        aria-label="Panel firmy"
        data-panel-drawer
        data-open={mobileNavOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(300px,calc(100vw-3rem))] flex-col gap-5 bg-sidebar px-3 py-5 text-sidebar-foreground",
          "lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-[268px]",
          mobileNavOpen && "max-lg:shadow-2xl",
        )}
      >
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center gap-2.5 focus-visible:outline-none">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Boxes size={19} aria-hidden="true" />
            </span>
            <span className="grid leading-tight">
              <span className="text-sm font-bold tracking-tight text-white">
                Warstwowe<span className="text-primary">3D</span>
              </span>
              <span className="text-[11px] text-sidebar-muted">Panel firmy</span>
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Zamknij menu"
            onClick={() => setMobileNavOpen(false)}
            className="text-sidebar-muted hover:bg-white/10 hover:text-white lg:hidden"
          >
            <X size={18} />
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-white/5 p-2.5 text-left transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                {companyName.slice(0, 1).toUpperCase()}
              </span>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate text-[13px] font-semibold text-white">{companyName}</span>
                <span className="text-[11px] text-sidebar-muted">Pakiet {packageCode}</span>
              </span>
              <ChevronsUpDown size={15} aria-hidden="true" className="shrink-0 text-sidebar-muted" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
              Aktywna firma
            </DropdownMenuLabel>
            <DropdownMenuItem disabled className="opacity-100">
              <Check size={15} className="text-primary" />
              <span className="truncate font-medium">{companyName}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={`/${slug}`} target="_blank">
                <ExternalLink size={15} />
                Otwórz konfigurator
              </Link>
            </DropdownMenuItem>
            {role === "OWNER" && (
              <DropdownMenuItem asChild>
                <Link href={`/${slug}/dashboard/billing`}>Zmień pakiet</Link>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DashboardNav
          slug={slug}
          role={role}
          features={features}
          onNavigate={() => setMobileNavOpen(false)}
        />

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-xl border p-2.5",
            accessActive
              ? "border-sidebar-border bg-white/5"
              : "border-destructive/40 bg-destructive/15",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              accessActive ? "bg-success" : "bg-destructive",
            )}
          />
          <span className="grid min-w-0 leading-tight">
            <span className="truncate text-[12px] font-semibold text-white">
              {accessActive ? "Konfigurator aktywny" : "Brak aktywnego dostępu"}
            </span>
            <span className="truncate text-[11px] text-sidebar-muted">/{slug}</span>
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Otwórz menu"
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen(true)}
              className="lg:hidden"
            >
              <Menu size={20} />
            </Button>
            <div className="grid min-w-0 leading-tight">
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Panel firmy
              </span>
              <span className="truncate text-sm font-semibold">{companyName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex">
              {packageCode}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Powiadomienia">
                  <Bell size={18} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Powiadomienia</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Brak nowych powiadomień.
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <UserMenu fallbackInitials={initials} companyName={companyName} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1520px] flex-1 px-4 pt-7 pb-14 sm:px-6 lg:px-10">
          {superadminAccess && (
            <Alert className="mb-5 border-warning/40 bg-warning/10">
              <ShieldAlert className="text-warning" />
              <AlertTitle>Tryb nadzoru superadmina</AlertTitle>
              <AlertDescription>
                Panel firmy jest domyślnie tylko do odczytu. Zmiany wykonuj w centrum /superadmin.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
      </div>

      <Toaster position="bottom-right" richColors closeButton />
    </div>
    </TooltipProvider>
  );
}
