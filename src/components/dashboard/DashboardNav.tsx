"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Boxes,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  PackageSearch,
  Settings2,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { CompanyRole } from "@/types/saas";

const navigation = [
  { path: "", label: "Pulpit", section: "Praca", icon: LayoutDashboard, roles: ["OWNER", "ADMIN", "SALESPERSON"] },
  { path: "/orders", label: "Zamówienia", section: "Praca", icon: ShoppingCart, roles: ["OWNER", "ADMIN", "SALESPERSON"] },
  { path: "/settings", label: "Ustawienia", section: "Konfigurator", icon: Settings2, roles: ["OWNER", "ADMIN"] },
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
}>;

export function DashboardNav({
  slug,
  role,
  onNavigate,
}: {
  slug: string;
  role: CompanyRole;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const base = `/${slug}/dashboard`;
  const availableItems = navigation.filter((item) => item.roles.includes(role));
  const sections = [...new Set(availableItems.map((item) => item.section))];

  return (
    <nav className="dashboard-nav" aria-label="Nawigacja panelu firmy">
      {sections.map((section) => (
        <div className="dashboard-nav-section" key={section}>
          <span className="dashboard-nav-label">{section}</span>
          {availableItems.filter((item) => item.section === section).map((item) => {
            const href = `${base}${item.path}`;
            const active = item.path ? pathname.startsWith(href) : pathname === base;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                className={active ? "active" : ""}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      <div className="dashboard-nav-utility">
        <Link href={`/${slug}`} target="_blank" onClick={onNavigate}>
          <Boxes size={18} strokeWidth={1.8} aria-hidden="true" />
          <span>Otwórz konfigurator</span>
          <ExternalLink className="nav-external-icon" size={14} aria-hidden="true" />
        </Link>
      </div>
    </nav>
  );
}
