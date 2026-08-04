// Wizytówka producenta w kreatorze: logo, opis marki i parametry cieplne
// wybranej płyty. Producent płaci za tę ekspozycję, więc karta pojawia się
// w każdym kroku, w którym klient decyduje o produkcie.

import { ArrowUpRight } from "lucide-react";
import { specRows } from "@/domain/catalogPresentation";
import { cn } from "@/lib/utils";

function initialsOf(name) {
  return String(name || "")
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

/**
 * Logo producenta. Dopóki producent nie dostarczy pliku, pokazujemy monogram —
 * nigdy nie podstawiamy pod markę cudzej grafiki.
 */
export function ManufacturerLogo({ presentation, className }) {
  if (!presentation) return null;

  if (presentation.logoUrl) {
    return (
      <img
        className={cn("manufacturer-logo", className)}
        src={presentation.logoUrl}
        alt={`Logo ${presentation.name}`}
        loading="lazy"
      />
    );
  }

  return (
    <span className={cn("manufacturer-logo", "is-monogram", className)} aria-hidden="true">
      {initialsOf(presentation.name)}
    </span>
  );
}

export function ManufacturerSpecCard({ presentation, specs, thicknessMm }) {
  const rows = specRows(specs, thicknessMm);
  if (!presentation && !rows.length) return null;

  return (
    <section className="manufacturer-spec-card" aria-label="Informacje o produkcie">
      {presentation && (
        <header className="manufacturer-spec-head">
          <ManufacturerLogo presentation={presentation} />
          <span className="manufacturer-spec-identity">
            <strong>{presentation.name}</strong>
            {presentation.tagline && <small>{presentation.tagline}</small>}
          </span>
        </header>
      )}

      {rows.length > 0 && (
        <dl className="manufacturer-spec-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {(specs?.datasheetUrl || presentation?.websiteUrl) && (
        <div className="manufacturer-spec-links">
          {specs?.datasheetUrl && (
            <a href={specs.datasheetUrl} target="_blank" rel="noreferrer noopener">
              <span>Karta techniczna</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          {presentation?.websiteUrl && (
            <a href={presentation.websiteUrl} target="_blank" rel="noreferrer noopener">
              <span>Strona producenta</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      )}
    </section>
  );
}
