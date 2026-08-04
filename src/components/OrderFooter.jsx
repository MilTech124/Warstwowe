"use client";

import { useState } from "react";
import { Check, ChevronRight, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfiguratorStore, useConfiguratorStoreApi } from "@/store/configuratorStore";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";

const ORDER_FIELDS = [
  { key: "customerName", label: "Zamawiający", placeholder: "Nazwa firmy lub imię i nazwisko" },
  { key: "customerAddress", label: "Adres", placeholder: "Ulica, kod, miejscowość" },
  { key: "phone", label: "Telefon", placeholder: "+48 …" },
  { key: "email", label: "E-mail", placeholder: "adres@example.com", type: "email" },
  { key: "orderNo", label: "Nr zamówienia", placeholder: "nadawany automatycznie", readOnly: true },
];

export function OrderFooter() {
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const access = useConfiguratorAccess();
  const storeApi = useConfiguratorStoreApi();
  const order = useConfiguratorStore((state) => state.config.order);
  const updateOrder = useConfiguratorStore((state) => state.updateOrder);
  const busy = Boolean(status);

  async function handleSubmitOrder() {
    setError(null);
    setStatus({ label: "Zapisywanie zamówienia…" });
    try {
      const store = storeApi.getState();
      const currentOrder = store.config.order || {};
      if (!currentOrder.customerName || !currentOrder.phone || !currentOrder.email) {
        throw new Error("Uzupełnij nazwę klienta, telefon i e-mail.");
      }
      if (!consent) throw new Error("Potwierdź zgodę na obsługę danych zamówienia.");
      const response = await fetch(`/api/public/companies/${access.company.slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: currentOrder.customerName,
            address: currentOrder.customerAddress,
            phone: currentOrder.phone,
            email: currentOrder.email,
          },
          notes: currentOrder.notes,
          consent,
          settingsVersion: access.settings.version,
          configuration: store.config,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać zamówienia.");
      updateOrder({ orderNo: result.order.number });
      setReceipt({ number: result.order.number });
      setStatus(null);
    } catch (caught) {
      setStatus(null);
      setError(caught?.message || "Nie udało się zapisać zamówienia.");
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
                readOnly={field.readOnly}
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
          <label className="order-consent">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>Zgadzam się na przekazanie danych firmie w celu przygotowania i obsługi zamówienia.</span>
          </label>
        </div>
      )}

      {error && <p className="order-error" role="alert">{error}</p>}

      <button type="button" className="order-submit" onClick={handleSubmitOrder} disabled={busy || Boolean(receipt)}>
        {busy ? <Loader2 className="h-4 w-4 order-spinner" /> : receipt ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        <span>{receipt ? `Zapisano ${receipt.number}` : busy ? status.label : "Wyślij zamówienie"}</span>
      </button>
    </div>
  );
}
