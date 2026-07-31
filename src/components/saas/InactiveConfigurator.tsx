import Link from "next/link";
import {
  ArrowLeft,
  CircleOff,
  Clock3,
  CreditCard,
  LifeBuoy,
  Mail,
  Phone,
} from "lucide-react";
import type { ConfiguratorBootstrap } from "@/types/saas";

export function InactiveConfigurator({ bootstrap }: { bootstrap: ConfiguratorBootstrap }) {
  const { branding } = bootstrap.company;

  return (
    <main
      className="inactive-page inactive-page-premium"
      style={{
        "--tenant-primary": branding.primaryColor,
        "--tenant-accent": branding.accentColor,
      } as React.CSSProperties}
    >
      <div className="inactive-backdrop" aria-hidden="true">
        <span />
        <span />
      </div>

      <header className="inactive-header">
        <div className="inactive-brand">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={`Logo ${branding.name}`} />
          ) : (
            <span>{branding.name.slice(0, 1).toUpperCase()}</span>
          )}
          <div>
            <strong>{branding.name}</strong>
            <small>Konfigurator 3D</small>
          </div>
        </div>
        <Link href="/" className="inactive-home-link">
          <ArrowLeft size={16} />
          Strona główna
        </Link>
      </header>

      <section className="inactive-status-card">
        <div className="inactive-status-visual" aria-hidden="true">
          <div className="inactive-model">
            <span className="inactive-model-roof" />
            <span className="inactive-model-wall" />
            <span className="inactive-model-gate" />
          </div>
          <div className="inactive-icon">
            <CircleOff size={26} />
          </div>
        </div>

        <div className="inactive-copy">
          <span className="inactive-kicker">
            <Clock3 size={14} />
            Dostęp czasowo wstrzymany
          </span>
          <h1>Konfigurator jest obecnie nieaktywny</h1>
          <p>
            {bootstrap.accessMessage ||
              "Firma tymczasowo wyłączyła możliwość tworzenia nowych konfiguracji."}
          </p>

          {(branding.supportEmail || branding.supportPhone) && (
            <div className="inactive-support">
              <div>
                <LifeBuoy size={18} />
                <span>
                  <strong>Potrzebujesz pomocy?</strong>
                  <small>Skontaktuj się bezpośrednio z firmą.</small>
                </span>
              </div>
              <div className="inactive-contact">
                {branding.supportEmail && (
                  <a href={`mailto:${branding.supportEmail}`}>
                    <Mail size={16} />
                    {branding.supportEmail}
                  </a>
                )}
                {branding.supportPhone && (
                  <a href={`tel:${branding.supportPhone}`}>
                    <Phone size={16} />
                    {branding.supportPhone}
                  </a>
                )}
              </div>
            </div>
          )}

          <Link
            className="secondary-button inactive-billing-link"
            href={`/${bootstrap.company.slug}/dashboard/billing`}
          >
            <CreditCard size={16} />
            Przejdź do rozliczeń firmy
          </Link>
        </div>
      </section>

      <footer className="inactive-footer">
        Konfigurator obsługiwany przez <strong>Warstwowe3D</strong>
      </footer>
    </main>
  );
}
