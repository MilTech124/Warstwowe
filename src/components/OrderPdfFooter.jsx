// Stopka panelu: dane do zamówienia + generowanie PDF.

import { useState } from "react";
import { ChevronRight, FileDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { generateOrderPdf } from "@/lib/pdf/generateOrderPdf";

const ORDER_FIELDS = [
  { key: "customerName", label: "Zamawiający", placeholder: "Nazwa firmy lub imię i nazwisko" },
  { key: "customerAddress", label: "Adres", placeholder: "Ulica, kod, miejscowość" },
  { key: "phone", label: "Telefon", placeholder: "+48 …" },
  { key: "email", label: "E-mail", placeholder: "adres@example.com", type: "email" },
  { key: "orderNo", label: "Nr zamówienia", placeholder: "pozostaw puste, aby nadać automatycznie" },
];

export function OrderPdfFooter() {
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const order = useConfiguratorStore((state) => state.config.order);
  const updateOrder = useConfiguratorStore((state) => state.updateOrder);
  const busy = Boolean(status) && status.phase !== "done";

  async function handleGenerate() {
    setError(null);
    setStatus({ phase: "loading", label: "Przygotowanie…" });

    const store = useConfiguratorStore.getState();
    try {
      await generateOrderPdf({
        getConfig: () => useConfiguratorStore.getState().config,
        setViewModeOnly: store.setViewModeOnly,
        setShowDimensions: store.setShowDimensions,
        getLightingPreviewSuppressed: () => useConfiguratorStore.getState().ui.lightingPreviewSuppressed,
        setLightingPreviewSuppressed: store.setLightingPreviewSuppressed,
        onProgress: setStatus,
      });
      setStatus(null);
    } catch (caught) {
      setStatus(null);
      setError(caught?.message || "Nie udało się wygenerować dokumentu.");
    }
  }

  return (
    <div className="order-footer">
      <button
        type="button"
        className={cn("order-form-toggle", formOpen && "open")}
        onClick={() => setFormOpen((open) => !open)}
        aria-expanded={formOpen}
      >
        <span>Dane do zamówienia</span>
        <ChevronRight className="h-4 w-4" />
      </button>

      {formOpen && (
        <div className="order-form">
          {ORDER_FIELDS.map((field) => (
            <label key={field.key} className="order-field">
              <span>{field.label}</span>
              <input
                type={field.type ?? "text"}
                value={order?.[field.key] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => updateOrder({ [field.key]: event.target.value })}
              />
            </label>
          ))}
          <label className="order-field">
            <span>Uwagi</span>
            <textarea
              rows={3}
              value={order?.notes ?? ""}
              placeholder="Dodatkowe ustalenia, terminy, warunki dostawy"
              onChange={(event) => updateOrder({ notes: event.target.value })}
            />
          </label>
        </div>
      )}

      {error && (
        <p className="order-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="order-generate" onClick={handleGenerate} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 order-spinner" /> : <FileDown className="h-4 w-4" />}
        <span>{busy ? status.label : "Generuj PDF zamówienia"}</span>
      </button>
      <small className="order-hint">
        Dokument zawiera opis obiektu, zestawienie stali, rysunki i wizualizacje. Rubryka wyceny pozostaje do
        uzupełnienia.
      </small>
    </div>
  );
}
