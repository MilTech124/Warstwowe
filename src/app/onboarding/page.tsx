import Link from "next/link";
import { ArrowLeft, Check, Layers3, ShieldCheck } from "lucide-react";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { resolvePayUChargePrice } from "@/server/payu/pricing";
import { getAvailablePlans } from "@/server/services/planService";
import "../marketing-premium.css";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const plans = await getAvailablePlans();
  const diamondPlan = plans.find((item) => item.code === "DIAMOND");
  const diamondTestPrice = diamondPlan
    ? resolvePayUChargePrice("DIAMOND", diamondPlan.monthlyGross)
    : null;

  return (
    <main className="pm-page pm-onboarding-page">
      <header className="pm-onboarding-header">
        <Link className="pm-brand" href="/">
          <span className="pm-brand-mark"><Layers3 size={20} /></span>
          <span className="pm-brand-name">Warstwowe<span>3D</span></span>
        </Link>
        <div className="pm-onboarding-safe">
          <ShieldCheck size={16} />
          Bezpieczna konfiguracja konta
        </div>
      </header>

      <div className="pm-onboarding-progress" aria-label="Postęp konfiguracji">
        <span className="is-active"><i><Check size={12} /></i> Konto</span>
        <em />
        <span className="is-current"><i>2</i> Firma i pakiet</span>
        <em />
        <span><i>3</i> Gotowe</span>
      </div>

      <section className="pm-onboarding-shell">
        <Link className="pm-inline-back" href="/">
          <ArrowLeft size={15} /> Wróć
        </Link>
        <div className="pm-onboarding-heading">
          <span>Ostatni krok</span>
          <h1>Skonfiguruj przestrzeń swojej firmy.</h1>
          <p>Wybierz adres konfiguratora, pakiet i wygodny sposób rozliczenia.</p>
        </div>
        <OnboardingForm
          initialPlan={plan}
          plans={plans}
          diamondTestAmountGross={diamondTestPrice?.testOverride
            ? diamondTestPrice.chargedAmountGross
            : null}
        />
      </section>
    </main>
  );
}
