"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  BadgeDollarSign,
  Boxes,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  PackageSearch,
  Settings2,
  ShoppingCart,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyRole, FeatureKey } from "@/types/saas";

const navigation = [
  { path: "", label: "Pulpit", section: "Praca", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "SALESPERSON"] },
  { path: "/orders", label: "Zamówienia", section: "Praca", icon: ShoppingCart, roles: ["OWNER", "ADMIN", "SALESPERSON"] },
  { path: "/settings", label: "Ustawienia", section: "Konfigurator", icon: Settings2, roles: ["OWNER", "ADMIN"] },
  { path: "/pricing", label: "Cennik", section: "Konfigurator", icon: BadgeDollarSign, roles: ["OWNER", "ADMIN"], feature: "pricing" },
  { path: "/catalog", label: "Katalog firmy", section: "Konfigurator", icon: PackageSearch, roles: ["OWNER", "ADMIN"] },
  { path: "/team", label: "Zespół", section: "Organizacja", icon: Users, roles: ["OWNER", "ADMIN"] },
  { path: "/billing", label: "Rozliczenia", section: "Organizacja", icon: CreditCard, roles: ["OWNER"] },
  { path: "/audit", label: "Dziennik aktywności", section: "Organizacja", icon: Activity, roles: ["OWNER", "ADMIN"] },
] satisfies Array<{
  path: string;
  label: string;
  section: string;
  icon: typeof LayoutDashboard;
  roles: CompanyRole[];
  /** Pozycja widoczna tylko, gdy pakiet firmy udostępnia tę funkcję. */
  feature?: FeatureKey;
}>;

export function DashboardNav({
  slug,
  role,
  features,
  onNavigate,
}: {
  slug: string;
  role: CompanyRole;
  features?: Partial<Record<FeatureKey, boolean>>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/${slug}/dashboard`;
  const availableItems = navigation.filter(
    (item) =>
      (item.roles as readonly CompanyRole[]).includes(role)
      && (!("feature" in item) || Boolean(features?.[(item as { feature: FeatureKey }).feature])),
  );
  const sections = [...new Set(availableItems.map((item) => item.section))];

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto" aria-label="Nawigacja panelu firmy">
      {sections.map((section) => (
        <div key={section} className="flex flex-col gap-1">
          <span className="px-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-sidebar-muted uppercase">
            {section}
          </span>
          {availableItems
            .filter((item) => item.section === section)
            .map((item) => {
              const href = `${base}${item.path}`;
              const active = item.path ? pathname.startsWith(href) : pathname === base;
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "relative flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors",
                    "focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground",
                  )}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                    />
                  )}
                  <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
        </div>
      ))}

      <div className="mt-auto border-t border-sidebar-border pt-3">
        <Link
          href={`/${slug}`}
          target="_blank"
          onClick={onNavigate}
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-sidebar-muted transition-colors hover:bg-white/5 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
        >
          <Boxes size={18} strokeWidth={1.8} aria-hidden="true" />
          <span className="truncate">Otwórz konfigurator</span>
          <ExternalLink size={14} aria-hidden="true" className="ml-auto shrink-0 opacity-70" />
        </Link>
      </div>
    </nav>
  );
}
