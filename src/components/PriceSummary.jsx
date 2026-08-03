import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { quoteFromConfiguration } from "@/domain/pricing/quote";

const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

/**
 * Cena na żywo w konfiguratorze klienta.
 *
 * Renderuje się tylko wtedy, gdy serwer w ogóle przysłał stawki — bramkowanie
 * (pakiet + zgoda firmy na pokazywanie cen) jest w getConfiguratorBootstrap,
 * nie tutaj, bo publiczny bootstrap jest nieuwierzytelniony.
 */
export function PriceSummary() {
  const access = useConfiguratorAccess();
  const config = useConfiguratorStore((state) => state.config);
  const [expanded, setExpanded] = useState(false);

  // projectSummary uruchamia buildStructure — nie jest darmowe, więc podczas
  // przeciągania suwaka liczymy je najwyżej co 250 ms, a nie co klatkę.
  const [debouncedConfig, setDebouncedConfig] = useState(config);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedConfig(config), 250);
    return () => clearTimeout(timer);
  }, [config]);

  const priceList = access?.priceList;

  const quote = useMemo(() => {
    if (!priceList?.rates) return null;
    try {
      return quoteFromConfiguration(debouncedConfig, priceList.rates, {
        currency: priceList.currency,
        priceListVersion: priceList.version,
      });
    } catch {
      return null;
    }
  }, [debouncedConfig, priceList]);

  if (!quote) return null;

  return (
    <section className="price-summary">
      <div className="price-summary-head">
        <div>
          <span>Szacunkowa cena</span>
          <strong>{PLN.format(quote.totalGross)}</strong>
          <small>brutto, VAT {quote.vatRatePercent}%</small>
        </div>
        <button
          type="button"
          className="price-summary-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          Szczegóły
          <ChevronDown size={15} aria-hidden="true" data-open={expanded} />
        </button>
      </div>

      {quote.incomplete && (
        <p className="price-summary-note">
          <Info size={14} aria-hidden="true" />
          Wycena wstępna — część elementów nie ma jeszcze stawek. Ostateczną cenę potwierdzi
          sprzedawca.
        </p>
      )}

      {expanded && (
        <dl className="price-summary-lines">
          {quote.groups.map((group) => (
            <div key={group.id}>
              <dt>{group.label}</dt>
              <dd>{PLN.format(group.subtotalNet)}</dd>
            </div>
          ))}
          <div className="price-summary-total">
            <dt>Razem netto</dt>
            <dd>{PLN.format(quote.totalNet)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
