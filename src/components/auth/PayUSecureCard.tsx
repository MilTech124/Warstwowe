"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";

declare global {
  interface Window {
    PayU?: (posId: string) => {
      secureForms: () => {
        add: (type: string, options: Record<string, unknown>) => { render: (selector: string) => void };
      };
      tokenize: (type: "MULTI") => Promise<{
        status: "SUCCESS" | "ERROR";
        body?: { token: string; mask?: string };
        error?: { messages?: Array<{ message: string }> };
      }>;
    };
  }
}

export interface PayUCardHandle {
  tokenize: () => Promise<{ token: string; mask?: string }>;
}

export function PayUSecureCard({
  onReady,
}: {
  onReady: (handle: PayUCardHandle | null) => void;
}) {
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rendered = useRef(false);
  const sdk = useRef<ReturnType<NonNullable<typeof window.PayU>> | null>(null);
  const posId = process.env.NEXT_PUBLIC_PAYU_POS_ID;
  const sandbox = process.env.NEXT_PUBLIC_PAYU_ENV !== "production";
  const sdkUrl = sandbox
    ? "https://secure.snd.payu.com/javascript/sdk"
    : "https://secure.payu.com/javascript/sdk";

  const initialize = useCallback(() => {
    if (!window.PayU || !posId || rendered.current) return;
    try {
      sdk.current = window.PayU(posId);
      const forms = sdk.current.secureForms();
      const card = forms.add("card", {
        lang: "pl",
        style: { basic: { fontSize: "16px", fontColor: "#17201e" } },
      });
      card.render("#payu-card");
      rendered.current = true;
      const handle: PayUCardHandle = {
        tokenize: async () => {
          setError(null);
          const result = await sdk.current!.tokenize("MULTI");
          if (result.status !== "SUCCESS" || !result.body?.token) {
            const message =
              result.error?.messages?.map((item) => item.message).join(", ")
              || "PayU nie mogło zweryfikować karty.";
            setError(message);
            throw new Error(message);
          }
          return result.body;
        },
      };
      onReady(handle);
      setSdkReady(true);
    } catch (caught) {
      const message = caught instanceof Error
        ? caught.message
        : "Nie udało się uruchomić formularza PayU.";
      setError(message);
      onReady(null);
    }
  }, [onReady, posId]);

  useEffect(() => {
    if (window.PayU) initialize();
    return () => onReady(null);
  }, [initialize, onReady]);

  if (!posId) {
    return (
      <div className="pm-setup-notice" role="status">
        <CreditCard size={20} />
        <div>
          <strong>Formularz PayU wymaga konfiguracji</strong>
          <p>Dodaj <code>NEXT_PUBLIC_PAYU_POS_ID</code>, aby uruchomić bezpieczny formularz karty.</p>
        </div>
      </div>
    );
  }

  return (
    <section className="pm-payu-card-shell" aria-label="Dane karty">
      <Script src={sdkUrl} strategy="afterInteractive" onLoad={initialize} />
      <div className="pm-payu-label">
        <span><CreditCard size={17} /></span>
        <div><strong>Karta do miesięcznych odnowień</strong><small>Bezpieczny formularz PayU</small></div>
      </div>
      <div id="payu-card" className="pm-payu-card-form">
        {!sdkReady && (
          <span><Loader2 size={17} className="pm-spin" /> Ładowanie bezpiecznego formularza…</span>
        )}
      </div>
      <small className="pm-payu-security">
        <ShieldCheck size={14} />
        Dane karty trafiają bezpośrednio do PayU i nie są zapisywane w aplikacji.
      </small>
      {error && <p className="pm-form-error" role="alert">{error}</p>}
    </section>
  );
}
