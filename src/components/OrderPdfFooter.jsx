"use client";

import { useState } from "react";
import { Check, ChevronRight, FileDown, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useConfiguratorStore, useConfiguratorStoreApi } from "@/store/configuratorStore";
import { generateOrderPdf } from "@/lib/pdf/generateOrderPdf";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";

const ORDER_FIELDS = [
  { key: "customerName", label: "Zamawiający", placeholder: "Nazwa firmy lub imię i nazwisko" },
  { key: "customerAddress", label: "Adres", placeholder: "Ulica, kod, miejscowość" },
  { key: "phone", label: "Telefon", placeholder: "+48 …" },
  { key: "email", label: "E-mail", placeholder: "adres@example.com", type: "email" },
  { key: "orderNo", label: "Nr zamówienia", placeholder: "nadawany automatycznie", readOnly: true },
];

export function OrderPdfFooter() {
  const [formOpen, setFormOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [consent, setConsent] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const access = useConfiguratorAccess();
  const storeApi = useConfiguratorStoreApi();
  const order = useConfiguratorStore((state) => state.config.order);
  const updateOrder = useConfiguratorStore((state) => state.updateOrder);
  const busy = Boolean(status) && status.phase !== "done";

  async function handleSubmitOrder() {
    setError(null);
    setStatus({ phase: "saving", label: "Zapisywanie zamówienia…" });
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
      const nextReceipt = {
        orderId: result.order.id,
        receiptToken: result.receiptToken,
        number: result.order.number,
      };
      setReceipt(nextReceipt);
      setStatus(null);
      return nextReceipt;
    } catch (caught) {
      setStatus(null);
      setError(caught?.message || "Nie udało się zapisać zamówienia.");
      throw caught;
    }
  }

  async function handleGenerate() {
    setError(null);
    setStatus({ phase: "loading", label: "Przygotowanie…" });
    const store = storeApi.getState();
    try {
      const activeReceipt = receipt || await handleSubmitOrder();
      const result = await generateOrderPdf({
        getConfig: () => storeApi.getState().config,
        setViewModeOnly: store.setViewModeOnly,
        setShowDimensions: store.setShowDimensions,
        getLightingPreviewSuppressed: () => storeApi.getState().ui.lightingPreviewSuppressed,
        setLightingPreviewSuppressed: store.setLightingPreviewSuppressed,
        setQualityOverride: store.setQualityOverride,
        onProgress: setStatus,
      });

      const form = new FormData();
      form.set("file", result.blob, result.fileName);
      const upload = await fetch(
        `/api/public/companies/${access.company.slug}/orders/${activeReceipt.orderId}/pdf`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${activeReceipt.receiptToken}` },
          body: form,
        },
      );
      if (!upload.ok && upload.status !== 503) {
        const uploadResult = await upload.json();
        throw new Error(uploadResult.error || "PDF pobrano, ale nie udało się go dołączyć do zamówienia.");
      }
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

      {access.capabilities.orderPdf && (
        <>
          <button type="button" className="order-generate" onClick={handleGenerate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 order-spinner" /> : <FileDown className="h-4 w-4" />}
            <span>{busy ? status.label : "Generuj PDF zamówienia"}</span>
          </button>
          <small className="order-hint">Dokument zawiera opis obiektu, zestawienie stali, rysunki i wizualizacje.</small>
        </>
      )}
    </div>
  );
}
