"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export type PricingPlan = {
  code: string;
  name: string;
  monthlyGross: number;
  prepaidSixMonthsGross: number;
  description: string;
  features: string[];
};

const zl = (value: number) => value.toLocaleString("pl-PL");

/** Karty pakietów z przełącznikiem okresu rozliczeniowego. */
export function PricingPlans({
  plans,
  highlightCode,
}: {
  plans: PricingPlan[];
  highlightCode: string;
}) {
  const [prepaid, setPrepaid] = useState(false);

  return (
    <>
      <div className="w3-period-wrap">
        <div className="w3-period" role="group" aria-label="Okres rozliczeniowy">
          <button
            type="button"
            className={`w3-period-btn ${prepaid ? "" : "is-on"}`}
            aria-pressed={!prepaid}
            onClick={() => setPrepaid(false)}
          >
            Miesięcznie
          </button>
          <button
            type="button"
            className={`w3-period-btn ${prepaid ? "is-on" : ""}`}
            aria-pressed={prepaid}
            onClick={() => setPrepaid(true)}
          >
            6 miesięcy z góry
            <em>−10%</em>
          </button>
        </div>
      </div>

      <div className="w3-pricing-grid">
        {plans.map((plan) => {
          const highlighted = plan.code === highlightCode;
          const perMonth = prepaid
            ? Math.round(plan.prepaidSixMonthsGross / 6)
            : plan.monthlyGross;
          const saving = plan.monthlyGross * 6 - plan.prepaidSixMonthsGross;

          return (
            <article className={`w3-plan ${highlighted ? "is-top" : ""}`} key={plan.code}>
              {highlighted ? <span className="w3-plan-badge">Najczęściej wybierany</span> : null}
              <span className="w3-plan-code">{plan.code}</span>
              <h3>{plan.name}</h3>
              <p>{plan.description}</p>

              <div className="w3-plan-price">
                <strong>{zl(perMonth)}</strong>
                <span>
                  zł brutto
                  <br />
                  miesięcznie
                </span>
              </div>

              <div className="w3-plan-prepaid">
                {prepaid ? (
                  <>
                    <span>
                      {zl(plan.prepaidSixMonthsGross)} zł za 6 mies.
                      <br />
                      oszczędzasz {zl(saving)} zł
                    </span>
                    <strong>−10%</strong>
                  </>
                ) : (
                  <>
                    <span>rozliczenie miesięczne</span>
                    <strong>7 dni trialu</strong>
                  </>
                )}
              </div>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <Check size={15} /> <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                className={`w3-btn ${highlighted ? "w3-btn-primary" : "w3-btn-ghost"} w3-btn-full`}
                href={`/rejestracja?plan=${plan.code}`}
              >
                Wybieram {plan.name} <ArrowRight size={16} />
              </Link>
            </article>
          );
        })}
      </div>
    </>
  );
}
