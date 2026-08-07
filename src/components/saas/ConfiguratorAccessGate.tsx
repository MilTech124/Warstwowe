"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Clock3, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import type { ConfiguratorBootstrap } from "@/types/saas";

type AccessState = {
  enabled: boolean;
  unlocked: boolean;
  started: boolean;
  blocked: boolean;
  remainingSeconds: number;
  expiresAt: string | null;
};

function formatRemaining(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function ConfiguratorAccessGate({
  bootstrap,
  accessControlDisabled = false,
}: {
  bootstrap: ConfiguratorBootstrap;
  accessControlDisabled?: boolean;
}) {
  const configured = bootstrap.settings.publicAccessLimitEnabled && !accessControlDisabled;
  const [access, setAccess] = useState<AccessState>({
    enabled: configured,
    unlocked: !configured,
    started: false,
    blocked: false,
    remainingSeconds: bootstrap.settings.publicAccessLimitMinutes * 60,
    expiresAt: null,
  });
  const [now, setNow] = useState(() => Date.now());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startRequested = useRef(false);
  const storageKey = `configurator-access:${bootstrap.company.id}`;
  const endpoint = `/api/public/companies/${bootstrap.company.slug}/access`;

  function acceptState(next: AccessState) {
    setAccess(next);
    if (next.expiresAt) localStorage.setItem(storageKey, next.expiresAt);
    else if (next.unlocked || !next.enabled) localStorage.removeItem(storageKey);
  }

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetch(endpoint, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (!cancelled) acceptState(result);
      })
      .catch(() => {
        // Availability wins over metering during a temporary database/network
        // failure. The order endpoint still repeats the server-side check.
        const localExpiry = localStorage.getItem(storageKey);
        if (!cancelled && localExpiry) {
          const remainingSeconds = Math.max(
            0,
            Math.ceil((new Date(localExpiry).getTime() - Date.now()) / 1000),
          );
          setAccess((current) => ({
            ...current,
            started: true,
            blocked: remainingSeconds === 0,
            remainingSeconds,
            expiresAt: localExpiry,
          }));
        }
      });
    return () => {
      cancelled = true;
    };
  // The public tenant cannot change without remounting this page.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, endpoint]);

  useEffect(() => {
    if (!access.enabled || access.unlocked || access.started || startRequested.current) return;
    const start = () => {
      if (startRequested.current) return;
      startRequested.current = true;
      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })
        .then(async (response) => {
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          acceptState(result);
        })
        .catch(() => undefined);
    };
    document.addEventListener("pointerdown", start, { capture: true, once: true });
    document.addEventListener("keydown", start, { capture: true, once: true });
    return () => {
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("keydown", start, true);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [access.enabled, access.started, access.unlocked, endpoint]);

  useEffect(() => {
    if (!access.enabled || access.unlocked || !access.expiresAt) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [access.enabled, access.expiresAt, access.unlocked]);

  const remainingSeconds = useMemo(() => {
    if (!access.expiresAt) return access.remainingSeconds;
    return Math.max(0, Math.ceil((new Date(access.expiresAt).getTime() - now) / 1000));
  }, [access.expiresAt, access.remainingSeconds, now]);
  const blocked = access.enabled && !access.unlocked && access.started && remainingSeconds === 0;

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", code }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się sprawdzić kodu.");
      acceptState(result);
      setCode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się sprawdzić kodu.");
    } finally {
      setBusy(false);
    }
  }

  const brandName = bootstrap.company.branding.name;
  return (
    <>
      {access.enabled && !access.unlocked && !blocked && (
        <div className="configurator-access-timer" role="status">
          <Clock3 size={14} />
          <span>{access.started ? `Pozostało ${formatRemaining(remainingSeconds)}` : "Czas ruszy przy pierwszej zmianie"}</span>
        </div>
      )}

      {blocked && (
        <div className="configurator-access-blocker" role="dialog" aria-modal="true" aria-labelledby="access-title">
          <form className="configurator-access-card" onSubmit={unlock}>
            <span className="configurator-access-icon"><LockKeyhole size={28} /></span>
            <div>
              <p className="configurator-access-kicker">Dostęp czasowy zakończony</p>
              <h2 id="access-title">Wpisz kod otrzymany od {brandName}</h2>
              <p>
                Projekt pozostaje zachowany na tym urządzeniu. Kod odblokuje konfigurator na 30 dni.
              </p>
            </div>
            <label>
              <span>Kod dostępu</span>
              <div className="configurator-access-input">
                <KeyRound size={17} />
                <input
                  type="password"
                  value={code}
                  minLength={6}
                  maxLength={64}
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  onChange={(event) => setCode(event.target.value)}
                />
              </div>
            </label>
            {error && <p className="configurator-access-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || code.trim().length < 6}>
              {busy ? <Loader2 size={17} className="configurator-access-spinner" /> : <KeyRound size={17} />}
              Odblokuj konfigurator
            </button>
            {(bootstrap.company.branding.supportEmail || bootstrap.company.branding.supportPhone) && (
              <p className="configurator-access-contact">
                Kod uzyskasz od producenta: {[bootstrap.company.branding.supportEmail, bootstrap.company.branding.supportPhone]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            )}
          </form>
        </div>
      )}
    </>
  );
}
