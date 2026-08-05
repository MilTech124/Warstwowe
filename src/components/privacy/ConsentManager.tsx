"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, Megaphone, Settings2, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { PRIVACY_POLICY_VERSION } from "@/config/legal";
import {
  consentCookieValue,
  createConsentRecord,
  DEFAULT_CONSENT,
  googleConsentFromPreferences,
  readConsentFromCookieHeader,
} from "@/lib/privacy/consent";
import type { ConsentPreferences, ConsentRecord } from "@/types/saas";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    __w3dConsentInitialized?: boolean;
    __w3dGtmLoaded?: boolean;
  }
}

type ConsentAction = "ACCEPT_ALL" | "REJECT_OPTIONAL" | "SAVE_PREFERENCES" | "REVOKE";

function consentId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function ensureGoogleConsent(preferences: ConsentPreferences) {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(..._args: unknown[]) {
      window.dataLayer.push(arguments);
    };
  }
  if (!window.__w3dConsentInitialized) {
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted",
    });
    window.gtag("set", "ads_data_redaction", true);
    window.__w3dConsentInitialized = true;
  }
  window.gtag("consent", "update", googleConsentFromPreferences(preferences));
  window.dataLayer.push({
    event: "consent_update",
    consent_analytics: preferences.analytics,
    consent_marketing: preferences.marketing,
  });
}

function loadGtm(gtmId: string | undefined, preferences: ConsentPreferences) {
  if (!gtmId || !/^GTM-[A-Z0-9]+$/i.test(gtmId)) return;
  if (!preferences.analytics && !preferences.marketing) return;
  ensureGoogleConsent(preferences);
  if (window.__w3dGtmLoaded) return;
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const script = document.createElement("script");
  script.async = true;
  script.id = "w3d-gtm-script";
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
  document.head.appendChild(script);
  window.__w3dGtmLoaded = true;
}

function clearGoogleCookies(categories: { analytics?: boolean; marketing?: boolean } = {
  analytics: true,
  marketing: true,
}) {
  const hostParts = window.location.hostname.split(".");
  const parentDomain = hostParts.length > 1 ? `.${hostParts.slice(-2).join(".")}` : "";
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0]?.trim();
    const analyticsCookie = /^(_ga|_gid|_gat)/.test(name || "");
    const marketingCookie = /^_gcl_/.test(name || "");
    if (
      !name
      || (!categories.analytics || !analyticsCookie)
        && (!categories.marketing || !marketingCookie)
    ) continue;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    if (parentDomain) {
      document.cookie = `${name}=; Path=/; Domain=${parentDomain}; Max-Age=0; SameSite=Lax`;
    }
  }
}

function logConsent(action: ConsentAction, record: ConsentRecord) {
  void fetch("/api/privacy/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      consentId: record.consentId,
      action,
      policyVersion: record.policyVersion,
      preferences: record.preferences,
      decidedAt: record.decidedAt,
    }),
  }).catch(() => undefined);
}

export function ConsentManager() {
  const pathname = usePathname();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const [record, setRecord] = useState<ConsentRecord | null | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draft, setDraft] = useState<ConsentPreferences>({ ...DEFAULT_CONSENT });

  useEffect(() => {
    const stored = readConsentFromCookieHeader(document.cookie);
    setRecord(stored);
    if (stored) {
      setDraft(stored.preferences);
      loadGtm(gtmId, stored.preferences);
    } else clearGoogleCookies();
  }, [gtmId]);

  useEffect(() => {
    function handleOpenSettings(event: MouseEvent) {
      const target = event.target as Element | null;
      if (!target?.closest("[data-open-consent-settings='true']")) return;
      event.preventDefault();
      openSettings();
    }
    document.addEventListener("click", handleOpenSettings);
    return () => document.removeEventListener("click", handleOpenSettings);
  }, [record]);

  useEffect(() => {
    if (!record?.preferences.analytics) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "virtual_page_view",
      page_path: `${pathname}${window.location.search}`,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, record?.preferences.analytics]);

  const hasDecision = record !== null && record !== undefined;
  const current = useMemo(() => record?.preferences || DEFAULT_CONSENT, [record]);

  function decide(preferences: ConsentPreferences, requestedAction: ConsentAction) {
    const priorOptional = Boolean(record?.preferences.analytics || record?.preferences.marketing);
    const nextOptional = preferences.analytics || preferences.marketing;
    const analyticsRevoked = Boolean(record?.preferences.analytics && !preferences.analytics);
    const marketingRevoked = Boolean(record?.preferences.marketing && !preferences.marketing);
    const action = analyticsRevoked || marketingRevoked ? "REVOKE" : requestedAction;
    const next = createConsentRecord(record?.consentId || consentId(), preferences);
    document.cookie = consentCookieValue(next, window.location.protocol === "https:");
    setRecord(next);
    setDraft(next.preferences);
    setSettingsOpen(false);
    logConsent(action, next);

    if (priorOptional && !nextOptional) {
      ensureGoogleConsent(next.preferences);
      clearGoogleCookies();
      window.setTimeout(() => window.location.reload(), 100);
      return;
    }
    if (nextOptional) {
      loadGtm(gtmId, next.preferences);
      if (analyticsRevoked || marketingRevoked) {
        clearGoogleCookies({ analytics: analyticsRevoked, marketing: marketingRevoked });
      }
    }
    else clearGoogleCookies();
  }

  function openSettings() {
    setDraft({ ...current });
    setSettingsOpen(true);
  }

  if (record === undefined) return null;

  return (
    <>
      {!hasDecision && (
        <section className="consent-banner" aria-labelledby="consent-title">
          <div className="consent-banner__icon" aria-hidden="true"><ShieldCheck /></div>
          <div className="consent-banner__copy">
            <h2 id="consent-title">Twoja prywatność, Twój wybór</h2>
            <p>
              Niezbędne technologie utrzymują logowanie i konfigurator. Google Analytics oraz
              Google Ads uruchomimy dopiero po Twojej zgodzie. Bez zgody nie wysyłamy do Google
              nawet sygnałów bezciasteczkowych. {" "}
              <Link href="/polityka-cookies">Polityka cookies</Link>
            </p>
            <a
              href="https://business.safety.google/privacy/"
              target="_blank"
              rel="noreferrer"
              className="consent-google-link"
            >
              Jak Google wykorzystuje dane
            </a>
          </div>
          <div className="consent-banner__actions">
            <button
              type="button"
              className="consent-action consent-action--accept"
              onClick={() => decide(
                { necessary: true, analytics: true, marketing: true },
                "ACCEPT_ALL",
              )}
            >
              Akceptuję wszystkie
            </button>
            <button
              type="button"
              className="consent-action consent-action--reject"
              onClick={() => decide({ ...DEFAULT_CONSENT }, "REJECT_OPTIONAL")}
            >
              Odrzucam opcjonalne
            </button>
            <button type="button" className="consent-action consent-action--settings" onClick={openSettings}>
              <Settings2 size={15} /> Dostosuj
            </button>
          </div>
        </section>
      )}

      {hasDecision && (
        <button type="button" className="consent-reopen" onClick={openSettings}>
          <ShieldCheck size={16} /> Ustawienia cookies
        </button>
      )}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="consent-dialog sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Ustawienia prywatności</DialogTitle>
            <DialogDescription>
              Opcjonalne kategorie są domyślnie wyłączone. Możesz zmienić wybór w każdej chwili.
            </DialogDescription>
          </DialogHeader>

          <div className="consent-category-list">
            <div className="consent-category">
              <span className="consent-category__icon"><ShieldCheck /></span>
              <span className="consent-category__copy">
                <strong>Niezbędne i funkcjonalne</strong>
                <small>Logowanie Clerk, bezpieczeństwo, płatności i zapamiętanie jakości 3D.</small>
              </span>
              <span className="consent-required">Zawsze aktywne</span>
            </div>
            <label className="consent-category">
              <span className="consent-category__icon consent-category__icon--analytics"><BarChart3 /></span>
              <span className="consent-category__copy">
                <strong>Analityczne</strong>
                <small>GA4 pomaga mierzyć korzystanie z platformy i ulepszać jej działanie.</small>
              </span>
              <Switch
                aria-label="Zgoda na analitykę"
                checked={draft.analytics}
                onCheckedChange={(analytics) => setDraft({ ...draft, analytics })}
              />
            </label>
            <label className="consent-category">
              <span className="consent-category__icon consent-category__icon--marketing"><Megaphone /></span>
              <span className="consent-category__copy">
                <strong>Marketingowe</strong>
                <small>Google Ads, pomiar kampanii i remarketing, w tym personalizacja reklam.</small>
              </span>
              <Switch
                aria-label="Zgoda na marketing"
                checked={draft.marketing}
                onCheckedChange={(marketing) => setDraft({ ...draft, marketing })}
              />
            </label>
          </div>

          <p className="consent-dialog__legal">
            Wersja zasad: {PRIVACY_POLICY_VERSION}. Zobacz {" "}
            <Link href="/polityka-prywatnosci">politykę prywatności</Link> i {" "}
            <Link href="/polityka-cookies">politykę cookies</Link>.
          </p>
          <DialogFooter className="consent-dialog__actions">
            <button
              type="button"
              className="consent-action consent-action--reject"
              onClick={() => decide({ ...DEFAULT_CONSENT }, "REJECT_OPTIONAL")}
            >
              Odrzuć opcjonalne
            </button>
            <button
              type="button"
              className="consent-action consent-action--accept"
              onClick={() => decide(draft, "SAVE_PREFERENCES")}
            >
              Zapisz wybór
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
