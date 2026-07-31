"use client";

import { useState } from "react";
import { Check, Crown, LoaderCircle, Save, ShieldCheck, Sparkles, Users } from "lucide-react";
import { FEATURE_KEYS } from "@/types/saas";

const featureNames: Record<string, string> = {
  coreConfigurator: "Konfigurator",
  orders: "Zamówienia",
  flashings: "Obróbki",
  gutters: "Orynnowanie",
  catalogCuration: "Wybór katalogu",
  frontProjection: "Wypust frontowy",
  orderAnalytics: "Analityka",
  csvExport: "Eksport CSV",
  emailNotifications: "Powiadomienia",
  structureView: "Konstrukcja",
  gateAnimations: "Animacje bram",
  lighting: "Oświetlenie",
  orderPdf: "PDF zamówienia",
};

const planIcons: Record<string, typeof ShieldCheck> = {
  STANDARD: ShieldCheck,
  GOLD: Sparkles,
  PLATINUM: Crown,
  DIAMOND: Crown,
};

export function PlansManager({ initialPlans }: { initialPlans: any[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  function update(code: string, patch: Record<string, unknown>) {
    setPlans((current) => current.map((plan) => plan.code === code ? { ...plan, ...patch } : plan));
  }

  async function save(plan: any) {
    setBusy(plan.code);
    setNotice(null);
    try {
      const response = await fetch(`/api/superadmin/plans/${plan.code}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthlyGross: Number(plan.monthlyGross),
          prepaidSixMonthsGross: Number(plan.prepaidSixMonthsGross),
          seatLimit: Number(plan.seatLimit),
          features: plan.features,
          active: plan.active !== false,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setNotice({ tone: "error", text: result.error || "Nie udało się opublikować pakietu." });
        return;
      }
      update(plan.code, result.plan);
      setNotice({ tone: "success", text: `Opublikowano wersję ${result.plan.version} pakietu ${plan.name}. Istniejące subskrypcje zachowały swoją cenę.` });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem. Spróbuj ponownie." });
    } finally {
      setBusy("");
    }
  }

  return (
    <>
      {notice ? <div className={`sa-form-notice is-${notice.tone}`} role={notice.tone === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</div> : null}
      <div className="sa-plan-grid">
        {plans.map((plan) => {
          const Icon = planIcons[plan.code] || ShieldCheck;
          const enabledCount = FEATURE_KEYS.filter((feature) => Boolean(plan.features?.[feature])).length;
          const planBusy = busy === plan.code;
          return (
            <article className={`sa-card sa-plan sa-plan-${String(plan.code).toLowerCase()}`} key={plan.code} aria-busy={planBusy}>
              <header className="sa-plan-head">
                <span className="sa-plan-icon"><Icon size={20} /></span>
                <div><span>{plan.code} · wersja {plan.version}</span><h2>{plan.name}</h2></div>
                <label className="sa-switch">
                  <input type="checkbox" checked={plan.active !== false} onChange={(event) => update(plan.code, { active: event.target.checked })} />
                  <span aria-hidden="true" />
                  <i>{plan.active !== false ? "Aktywny" : "Wyłączony"}</i>
                </label>
              </header>

              <div className="sa-price-fields">
                <label><span>Miesięcznie brutto</span><div><input type="number" min="1" value={plan.monthlyGross} onChange={(event) => update(plan.code, { monthlyGross: event.target.valueAsNumber })} /><i>zł</i></div></label>
                <label><span>6 miesięcy brutto</span><div><input type="number" min="1" value={plan.prepaidSixMonthsGross} onChange={(event) => update(plan.code, { prepaidSixMonthsGross: event.target.valueAsNumber })} /><i>zł</i></div></label>
                <label><span>Limit kont</span><div><Users size={15} /><input type="number" min="1" value={plan.seatLimit} onChange={(event) => update(plan.code, { seatLimit: event.target.valueAsNumber })} /></div></label>
              </div>

              <div className="sa-feature-heading"><span>Funkcje pakietu</span><strong>{enabledCount}/{FEATURE_KEYS.length} aktywnych</strong></div>
              <div className="sa-feature-grid">
                {FEATURE_KEYS.map((feature) => (
                  <label className={plan.features?.[feature] ? "is-checked" : ""} key={feature}>
                    <input type="checkbox" checked={Boolean(plan.features?.[feature])} onChange={(event) => update(plan.code, { features: { ...plan.features, [feature]: event.target.checked } })} />
                    <span><Check size={13} /></span>
                    <strong>{featureNames[feature] || feature}</strong>
                  </label>
                ))}
              </div>
              <footer className="sa-plan-footer">
                <small>Publikacja utworzy wersję {Number(plan.version || 0) + 1}</small>
                <button className="sa-button sa-button-primary" disabled={planBusy} onClick={() => save(plan)}>
                  {planBusy ? <LoaderCircle className="sa-spin" size={16} /> : <Save size={16} />} {planBusy ? "Publikowanie…" : "Opublikuj wersję"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
}
