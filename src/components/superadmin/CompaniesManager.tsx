"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  LoaderCircle,
  Save,
  Search,
  Settings2,
  ShieldAlert,
  SlidersHorizontal,
} from "lucide-react";
import { FEATURE_KEYS, PACKAGE_CODES, SUBSCRIPTION_STATUSES } from "@/types/saas";
import { SuperadminEmpty, SuperadminStatus } from "@/components/superadmin/SuperadminBits";

const featureNames: Record<string, string> = {
  coreConfigurator: "Konfigurator",
  orders: "Zamówienia",
  flashings: "Obróbki blacharskie",
  gutters: "Orynnowanie",
  catalogCuration: "Wybór katalogu",
  frontProjection: "Wypust frontowy",
  orderAnalytics: "Analityka zamówień",
  csvExport: "Eksport CSV",
  emailNotifications: "Powiadomienia e-mail",
  structureView: "Widok konstrukcji",
  gateAnimations: "Animacje bram",
  lighting: "Oświetlenie",
  orderPdf: "PDF zamówienia",
};

function toLocalDateTime(value: unknown) {
  return value ? String(value).slice(0, 16) : "";
}

export function CompaniesManager({ companies }: { companies: any[] }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(companies);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const filtered = useMemo(
    () => items.filter((item) => `${item.displayName} ${item.slug}`.toLowerCase().includes(query.trim().toLowerCase())),
    [items, query],
  );

  function patchLocal(id: string, patch: Record<string, unknown>) {
    setItems((current) => current.map((item) => item._id === id ? { ...item, ...patch } : item));
  }

  function patchSubscription(company: any, patch: Record<string, unknown>) {
    patchLocal(company._id, { subscription: { ...company.subscription, ...patch } });
  }

  async function save(company: any) {
    setBusy(company._id);
    setNotice(null);
    try {
      const response = await fetch(`/api/superadmin/companies/${company._id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: company.displayName,
          slug: company.slug,
          status: company.status,
          subscription: {
            packageCode: company.subscription?.packageCode,
            status: company.subscription?.status,
            trialEndsAt: company.subscription?.trialEndsAt || null,
            currentPeriodEnd: company.subscription?.currentPeriodEnd || null,
            cancelAtPeriodEnd: Boolean(company.subscription?.cancelAtPeriodEnd),
          },
          overrides: company.overrides || [],
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice({ tone: "error", text: result.error || "Nie udało się zapisać zmian firmy." });
        return;
      }
      setItems((current) => current.map((item) => item._id === company._id ? {
        ...item,
        ...result.company,
        subscription: result.subscription,
      } : item));
      setNotice({ tone: "success", text: `Zapisano zmiany firmy ${company.displayName}.` });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem. Spróbuj ponownie." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="sa-card sa-company-manager">
      <div className="sa-toolbar">
        <label className="sa-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">Szukaj firmy</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Szukaj po nazwie lub slugu…" />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Wyczyść wyszukiwanie">×</button> : null}
        </label>
        <span className="sa-record-count">{filtered.length} z {items.length} firm</span>
      </div>

      {notice ? <div className={`sa-form-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</div> : null}

      <div className="sa-company-list">
        {filtered.map((company) => {
          const companyBusy = busy === company._id;
          return (
            <article className="sa-company" key={company._id} aria-busy={companyBusy}>
              <header className="sa-company-head">
                <span className="sa-company-monogram" aria-hidden="true">{company.displayName.slice(0, 2).toUpperCase()}</span>
                <div className="sa-company-name">
                  <label>
                    <span className="sr-only">Nazwa firmy</span>
                    <input value={company.displayName} onChange={(event) => patchLocal(company._id, { displayName: event.target.value })} />
                  </label>
                  <span><code>/{company.slug}</code> · utworzono {new Date(company.createdAt).toLocaleDateString("pl-PL")}</span>
                </div>
                <div className="sa-company-head-status">
                  <SuperadminStatus status={company.subscription?.status || "ONBOARDING"} />
                  <Link href={`/${company.slug}/dashboard`} target="_blank" rel="noreferrer" className="sa-supervision-link" title="Wejdź w trybie nadzoru">
                    <ShieldAlert size={15} /> Nadzór <ExternalLink size={13} />
                  </Link>
                </div>
              </header>

              <div className="sa-company-fields">
                <label><span>Slug firmy</span><input value={company.slug} onChange={(event) => patchLocal(company._id, { slug: event.target.value })} /></label>
                <label><span>Status firmy</span><select value={company.status} onChange={(event) => patchLocal(company._id, { status: event.target.value })}><option value="ACTIVE">Aktywna</option><option value="SUSPENDED">Zawieszona</option></select></label>
                <label><span>Pakiet</span><select value={company.subscription?.packageCode || "STANDARD"} onChange={(event) => patchSubscription(company, { packageCode: event.target.value })}>{PACKAGE_CODES.map((code) => <option key={code}>{code}</option>)}</select></label>
                <label><span>Status subskrypcji</span><select value={company.subscription?.status || "ONBOARDING"} onChange={(event) => patchSubscription(company, { status: event.target.value })}>{SUBSCRIPTION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label><span>Koniec dostępu</span><input type="datetime-local" value={toLocalDateTime(company.subscription?.currentPeriodEnd)} onChange={(event) => patchSubscription(company, { currentPeriodEnd: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
                <button className="sa-button sa-button-primary" disabled={companyBusy} onClick={() => save(company)}>
                  {companyBusy ? <LoaderCircle className="sa-spin" size={16} /> : <Save size={16} />} {companyBusy ? "Zapisywanie…" : "Zapisz zmiany"}
                </button>
              </div>

              <details className="sa-company-advanced">
                <summary><span><SlidersHorizontal size={16} /> Ustawienia zaawansowane</span><small>{company.overrides?.length || 0} nadpisań funkcji</small></summary>
                <div className="sa-advanced-content">
                  <section className="sa-date-settings">
                    <div className="sa-subsection-title"><CalendarClock size={17} /><div><strong>Okres i rezygnacja</strong><small>Ręczna kontrola dat subskrypcji</small></div></div>
                    <label><span>Koniec trialu</span><input type="datetime-local" value={toLocalDateTime(company.subscription?.trialEndsAt)} onChange={(event) => patchSubscription(company, { trialEndsAt: event.target.value ? new Date(event.target.value).toISOString() : null })} /></label>
                    <label className="sa-check-row"><input type="checkbox" checked={Boolean(company.subscription?.cancelAtPeriodEnd)} onChange={(event) => patchSubscription(company, { cancelAtPeriodEnd: event.target.checked })} /><span><strong>Anuluj na koniec okresu</strong><small>Dostęp pozostanie aktywny do wskazanej daty.</small></span></label>
                  </section>
                  <section className="sa-overrides">
                    <div className="sa-subsection-title"><Settings2 size={17} /><div><strong>Nadpisania funkcji</strong><small>Wyjątki względem uprawnień pakietu</small></div></div>
                    <div className="sa-override-grid">
                      {FEATURE_KEYS.map((feature) => {
                        const override = company.overrides?.find((item: any) => item.feature === feature);
                        return (
                          <label key={feature}>
                            <span>{featureNames[feature] || feature}</span>
                            <select
                              value={override?.mode || "DEFAULT"}
                              onChange={(event) => {
                                const remaining = (company.overrides || []).filter((item: any) => item.feature !== feature);
                                const overrides = event.target.value === "DEFAULT" ? remaining : [...remaining, { feature, mode: event.target.value, expiresAt: null }];
                                patchLocal(company._id, { overrides });
                              }}
                            >
                              <option value="DEFAULT">Z pakietu</option>
                              <option value="FORCE_ENABLE">Wymuś dostęp</option>
                              <option value="FORCE_DISABLE">Zablokuj</option>
                            </select>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </details>
            </article>
          );
        })}
        {!filtered.length ? <SuperadminEmpty>{query ? "Nie znaleziono firmy pasującej do wyszukiwania." : "Brak firm do wyświetlenia."}</SuperadminEmpty> : null}
      </div>
    </section>
  );
}
