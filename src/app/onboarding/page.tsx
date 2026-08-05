import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Layers3, ShieldCheck } from "lucide-react";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getRequestIdentity } from "@/server/auth";
import { findRegistrationForUser } from "@/server/services/companyService";
import { getAvailablePlans } from "@/server/services/planService";
import "../marketing-premium.css";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; stripe?: string }>;
}) {
  const { plan, stripe } = await searchParams;
  const identity = await getRequestIdentity();
  // Tylko ukończona rejestracja trafia do panelu. Firma z subskrypcją w
  // statusie ONBOARDING (porzucony lub anulowany Checkout) zostaje tutaj,
  // z wypełnionym formularzem, żeby dało się dokończyć albo poprawić dane.
  const registration = identity.userId ? await findRegistrationForUser(identity.userId) : null;
  if (registration?.finished && registration.company?.slug) {
    redirect(`/${registration.company.slug}/dashboard`);
  }
  const pending = registration?.isOwner
    ? {
        companyName: String(registration.company.displayName || ""),
        slug: String(registration.company.slug || ""),
        packageCode: registration.subscription?.packageCode as string | undefined,
        billingMode: registration.subscription?.billingMode as string | undefined,
      }
    : undefined;
  const plans = await getAvailablePlans();

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
          pending={pending}
          checkoutCancelled={stripe === "cancelled"}
        />
      </section>
    </main>
  );
}
