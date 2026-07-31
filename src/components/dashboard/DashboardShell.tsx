"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Boxes, ChevronDown, Menu, X } from "lucide-react";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import type { CompanyRole } from "@/types/saas";

export function DashboardShell({
  slug,
  companyName,
  packageCode,
  accessActive,
  role,
  superadminAccess = false,
  children,
}: {
  slug: string;
  companyName: string;
  packageCode: string;
  accessActive: boolean;
  role: CompanyRole;
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

  return (
    <div className={`dashboard-shell ${mobileNavOpen ? "nav-open" : ""}`}>
      <button
        className="dashboard-nav-scrim"
        type="button"
        aria-label="Zamknij nawigację"
        onClick={() => setMobileNavOpen(false)}
      />
      <aside className="dashboard-sidebar" aria-label="Panel firmy">
        <Link className="brand-lockup dashboard-brand" href="/">
          <span className="brand-mark"><Boxes size={19} /></span>
          <span>Warstwowe<span>3D</span><small>Panel firmy</small></span>
        </Link>
        <button className="mobile-nav-close" type="button" aria-label="Zamknij menu" onClick={() => setMobileNavOpen(false)}>
          <X size={20} />
        </button>
        <div className="company-switcher">
          <span className="company-switcher-avatar">{companyName.slice(0, 1).toUpperCase()}</span>
          <div><strong>{companyName}</strong><small>Pakiet {packageCode}</small></div>
          <ChevronDown size={15} aria-hidden="true" />
        </div>
        <DashboardNav slug={slug} role={role} onNavigate={() => setMobileNavOpen(false)} />
        <div className={`access-state ${accessActive ? "active" : "inactive"}`}>
          <i aria-hidden="true" />
          <div>
            <strong>{accessActive ? "Konfigurator aktywny" : "Brak aktywnego dostępu"}</strong>
            <small>/{slug}</small>
          </div>
        </div>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-context">
            <button className="mobile-menu-button" type="button" aria-label="Otwórz menu" aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen(true)}>
              <Menu size={20} />
            </button>
            <div><span>Panel firmy</span><strong>{companyName}</strong></div>
          </div>
          <div className="dashboard-top-actions">
            <button className="notification-button" type="button" aria-label="Powiadomienia">
              <Bell size={18} />
              <i aria-hidden="true" />
            </button>
            <span className="dashboard-avatar" aria-label={`Firma ${companyName}`}>{companyName.slice(0, 2).toUpperCase()}</span>
          </div>
        </header>
        <main className="dashboard-content">
          {superadminAccess && (
            <div className="superadmin-view-banner" role="status">
              <strong>Tryb nadzoru superadmina</strong>
              <span>Panel firmy jest domyślnie tylko do odczytu. Zmiany wykonuj w centrum /superadmin.</span>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
