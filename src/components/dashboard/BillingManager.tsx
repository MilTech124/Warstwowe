"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import type { PackageDefinition } from "@/domain/plans";
import type { PackageCode } from "@/types/saas";

export function BillingManager({
  slug,
  currentPackage,
  cancelAtPeriodEnd = false,
  plans = Object.values(PACKAGE_DEFINITIONS),
}: {
  slug: string;
  currentPackage: PackageCode;
  cancelAtPeriodEnd?: boolean;
  plans?: PackageDefinition[];
}) {
  const [busy, setBusy] = useState<PackageCode | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function schedule(packageCode: PackageCode) {
    setBusy(packageCode);
    setMessage(null);
    try {
      const response = await fetch(`/api/companies/${slug}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CHANGE_PACKAGE", packageCode }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zaplanować zmiany.");
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zaplanować zmiany.");
    } finally {
      setBusy(null);
    }
  }

  async function cancellation(action: "CANCEL" | "RESUME") {
    setMessage(null);
    const response = await fetch(`/api/companies/${slug}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const result = await response.json();
    setMessage(result.message || result.error);
  }

  return (
    <section className="dashboard-card billing-plans">
      <div className="card-title"><div><span>Subskrypcja</span><h2>Zmień pakiet</h2><p>Zmiana zostanie zaplanowana zgodnie z bieżącym okresem rozliczeniowym.</p></div></div>
      {message && <div className="settings-message" role="status">{message}</div>}
      <div className="billing-plan-grid">
        {plans.map((plan) => (
          <article key={plan.code} className={currentPackage === plan.code ? "current" : ""}>
            <div><h3>{plan.name}</h3>{currentPackage === plan.code && <span><Check size={13} /> Aktualny</span>}</div>
            <strong>{plan.monthlyGross} zł<small>/ mies.</small></strong>
            <p>{plan.description}</p>
            <button className="secondary-button full" disabled={currentPackage === plan.code || Boolean(busy)} onClick={() => schedule(plan.code)}>
              {busy === plan.code ? <Loader2 size={15} className="spin" /> : <>Wybierz <ArrowRight size={14} /></>}
            </button>
          </article>
        ))}
      </div>
      <div className="billing-cancel-row">
        <span>{cancelAtPeriodEnd ? "Subskrypcja jest zaplanowana do zakończenia." : "Możesz zakończyć odnowienia bez utraty bieżącego okresu."}</span>
        <button className="link-button" type="button" onClick={() => cancellation(cancelAtPeriodEnd ? "RESUME" : "CANCEL")}>
          {cancelAtPeriodEnd ? "Przywróć odnowienie" : "Anuluj z końcem okresu"}
        </button>
      </div>
    </section>
  );
}
