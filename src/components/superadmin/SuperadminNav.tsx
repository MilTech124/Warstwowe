"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Building2, CreditCard, Gauge, PackageOpen, ScrollText } from "lucide-react";

const items = [
  { href: "/superadmin", label: "Przegląd", description: "Stan platformy", icon: Gauge },
  { href: "/superadmin/companies", label: "Firmy", description: "Dostęp i pakiety", icon: Building2 },
  { href: "/superadmin/plans", label: "Pakiety", description: "Ceny i funkcje", icon: PackageOpen },
  { href: "/superadmin/catalog", label: "Katalog", description: "Płyty i bramy", icon: Boxes },
  { href: "/superadmin/billing", label: "Płatności", description: "PayU i automatyzacja", icon: CreditCard },
  { href: "/superadmin/audit", label: "Audyt", description: "Historia operacji", icon: ScrollText },
];

export function SuperadminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="sa-nav" aria-label="Główna nawigacja superadministratora">
      <span className="sa-nav-label">Zarządzanie</span>
      {items.map(({ href, label, description, icon: Icon }) => {
        const active = href === "/superadmin" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={href} href={href} className={active ? "is-active" : ""} aria-current={active ? "page" : undefined} onClick={onNavigate}>
            <span className="sa-nav-icon"><Icon size={18} /></span>
            <span><strong>{label}</strong><small>{description}</small></span>
          </Link>
        );
      })}
    </nav>
  );
}
