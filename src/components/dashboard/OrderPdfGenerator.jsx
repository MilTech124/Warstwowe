"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileDown, Loader2, RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { generateOrderPdf } from "@/lib/pdf/generateOrderPdf";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";
import { useConfiguratorStoreApi } from "@/store/configuratorStore";

/**
 * Adnotacja jest potrzebna, bo z samej wartości domyślnej TypeScript wywnioskowałby
 * dla `contractor` typ `null` i odrzucił obiekt przekazywany ze strony serwerowej.
 *
 * @param {{
 *   slug: string,
 *   orderId: string,
 *   quote?: object | null,
 *   contractor?: object | null,
 *   hasPdf?: boolean,
 *   autoStart?: boolean,
 *   demo?: boolean,
 *   portalId?: string,
 * }} props
 */
export function OrderPdfGenerator({
  slug,
  orderId,
  quote,
  contractor = null,
  hasPdf,
  autoStart = false,
  demo = false,
  portalId = "order-preview-pdf-actions",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const storeApi = useConfiguratorStoreApi();
  const { catalog } = useConfiguratorAccess();
  const [status, setStatus] = useState(null);
  const [portalTarget, setPortalTarget] = useState(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    setPortalTarget(document.getElementById(portalId));
  }, [portalId]);

  const generate = useCallback(async () => {
    if (status) return;
    setStatus({ phase: "loading", label: "Przygotowanie…" });
    try {
      const store = storeApi.getState();
      const result = await generateOrderPdf({
        getConfig: () => storeApi.getState().config,
        setViewModeOnly: store.setViewModeOnly,
        setShowDimensions: store.setShowDimensions,
        getLightingPreviewSuppressed: () => storeApi.getState().ui.lightingPreviewSuppressed,
        setLightingPreviewSuppressed: store.setLightingPreviewSuppressed,
        setQualityOverride: store.setQualityOverride,
        onProgress: setStatus,
        quote,
        contractor,
        catalog,
        download: demo,
      });

      if (demo) {
        setStatus(null);
        toast.success("PDF zamówienia demo został wygenerowany i pobrany.");
        if (autoStart) router.replace(pathname);
        return;
      }

      setStatus({ phase: "upload", label: "Zapisywanie PDF…" });
      const form = new FormData();
      form.set("file", result.blob, result.fileName);
      const response = await fetch(`/api/companies/${slug}/orders/${orderId}/pdf`, {
        method: "POST",
        body: form,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Nie udało się zapisać PDF.");

      setStatus(null);
      toast.success("PDF zamówienia został wygenerowany i zapisany.");
      if (autoStart) router.replace(pathname);
      else router.refresh();
    } catch (error) {
      setStatus(null);
      toast.error(error instanceof Error ? error.message : "Nie udało się wygenerować PDF.");
    }
    // `contractor` i `quote` to obiekty z serwera — nowa referencja przy każdym
    // renderze. Tu jest to nieszkodliwe: `generate` odpala się z kliknięcia albo
    // z efektu zabezpieczonego `autoStarted`, więc zmiana referencji nic nie robi.
  }, [autoStart, catalog, contractor, demo, orderId, pathname, quote, router, slug, status, storeApi]);

  useEffect(() => {
    if (!autoStart || autoStarted.current || !portalTarget) return;
    autoStarted.current = true;
    void generate();
  }, [autoStart, generate, portalTarget]);

  if (!portalTarget) return null;

  return createPortal(
    <div className="flex flex-wrap items-center justify-end gap-2">
      {hasPdf && (
        <Button asChild variant="outline" size="sm">
          <a href={`/api/companies/${slug}/orders/${orderId}/pdf`}>
            <FileDown size={15} /> Pobierz PDF
          </a>
        </Button>
      )}
      <Button type="button" size="sm" onClick={() => void generate()} disabled={Boolean(status)}>
        {status ? <Loader2 size={15} className="animate-spin" /> : hasPdf ? <RefreshCw size={15} /> : <FileDown size={15} />}
        {status?.label || (hasPdf ? "Wygeneruj ponownie" : "Generuj PDF")}
      </Button>
    </div>,
    portalTarget,
  );
}
