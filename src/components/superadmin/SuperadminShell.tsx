"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Boxes, Building2, Menu, PanelLeftClose, ShieldCheck, X } from "lucide-react";
import { SuperadminNav } from "@/components/superadmin/SuperadminNav";

const sectionNames: Record<string, string> = {
  "/superadmin": "Przegląd systemu",
  "/superadmin/companies": "Firmy",
  "/superadmin/plans": "Pakiety",
  "/superadmin/catalog": "Katalog",
  "/superadmin/billing": "Płatności i system",
  "/superadmin/audit": "Dziennik audytu",
};

export function SuperadminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const section = Object.entries(sectionNames)
    .sort(([a], [b]) => b.length - a.length)
    .find(([path]) => pathname === path || (path !== "/superadmin" && pathname.startsWith(path)))?.[1] || "Superadmin";

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="sa-shell">
      <button
        className={`sa-backdrop ${menuOpen ? "is-open" : ""}`}
        onClick={() => setMenuOpen(false)}
        aria-label="Zamknij menu"
        tabIndex={menuOpen ? 0 : -1}
      />
      <aside className={`sa-sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Panel superadministratora">
        <div className="sa-sidebar-head">
          <Link className="sa-brand" href="/" aria-label="Warstwowe 3D — strona główna">
            <span className="sa-brand-mark"><Boxes size={20} /></span>
            <span>Warstwowe <strong>3D</strong></span>
          </Link>
          <button className="sa-mobile-close" onClick={() => setMenuOpen(false)} aria-label="Zamknij nawigację"><X size={20} /></button>
        </div>

        <div className="sa-admin-identity">
          <span><ShieldCheck size={19} /></span>
          <div><strong>Superadmin</strong><small>Właściciel platformy</small></div>
        </div>

        <SuperadminNav onNavigate={() => setMenuOpen(false)} />

        <div className="sa-sidebar-footer">
          <div className="sa-system-state">
            <span className="sa-pulse" aria-hidden="true" />
            <div><strong>System operacyjny</strong><small>Globalna kontrola aktywna</small></div>
          </div>
          <Link href="/panel" className="sa-exit-link"><Building2 size={16} /> Moja firma</Link>
          <Link href="/" className="sa-exit-link"><PanelLeftClose size={16} /> Wyjdź do serwisu</Link>
        </div>
      </aside>

      <div className="sa-workspace">
        <header className="sa-topbar">
          <div className="sa-topbar-title">
            <button onClick={() => setMenuOpen(true)} className="sa-menu-button" aria-label="Otwórz nawigację" aria-expanded={menuOpen}>
              <Menu size={20} />
            </button>
            <div><span>Centrum operacyjne</span><strong>{section}</strong></div>
          </div>
          <div className="sa-topbar-actions">
            <span className="sa-environment"><i /> Produkcja</span>
            <button className="sa-icon-button" aria-label="Alerty systemowe">
              <Bell size={18} />
              <span className="sa-notification-dot" aria-hidden="true" />
            </button>
            <span className="sa-avatar" title="Superadmin">SA</span>
          </div>
        </header>
        <main className="sa-content">{children}</main>
      </div>
    </div>
  );
}
