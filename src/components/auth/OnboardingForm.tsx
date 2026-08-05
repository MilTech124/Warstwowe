"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Loader2,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import { companySlugSchema } from "@/domain/company";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import type { PackageDefinition } from "@/domain/plans";
import type { BillingMode, PackageCode } from "@/types/saas";

const planDescriptions: Record<PackageCode, string> = {
  STANDARD: "Podstawowy konfigurator i zamówienia",
  GOLD: "Wypusty, analityka i narzędzia zespołu",
  PLATINUM: "Widok konstrukcji i dane techniczne",
  DIAMOND: "Animacje, oświetlenie i dokumenty PDF",
};

const billingOptions: Array<{
  code: BillingMode;
  title: string;
  badge?: string;
  icon: typeof CreditCard;
}> = [
  {
    code: "RECURRING_MONTHLY",
    title: "Subskrypcja miesięczna",
    badge: "7 dni bez opłat",
    icon: CreditCard,
  },
  {
    code: "PREPAID_MONTHLY",
    title: "Dostęp na miesiąc",
    icon: CalendarDays,
  },
  {
    code: "PREPAID_SIX_MONTHS",
    title: "Dostęp na 6 miesięcy",
    badge: "Oszczędzasz 10%",
    icon: Sparkles,
  },
];

export function OnboardingForm({
  initialPlan,
  plans = Object.values(PACKAGE_DEFINITIONS),
  pending,
  checkoutCancelled = false,
}: {
  initialPlan?: string;
  plans?: PackageDefinition[];
  /** Firma z poprzedniej, nieukończonej próby rejestracji. */
  pending?: {
    companyName: string;
    slug: string;
    packageCode?: string;
    billingMode?: string;
  };
  checkoutCancelled?: boolean;
}) {
  const authEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const [companyName, setCompanyName] = useState(pending?.companyName || "");
  const [slug, setSlug] = useState(pending?.slug || "");
  const [packageCode, setPackageCode] = useState<PackageCode>(
    pending?.packageCode && pending.packageCode in PACKAGE_DEFINITIONS
      ? pending.packageCode as PackageCode
      : initialPlan && initialPlan in PACKAGE_DEFINITIONS ? initialPlan as PackageCode : "GOLD",
  );
  const [billingMode, setBillingMode] = useState<BillingMode>(
    billingOptions.some((option) => option.code === pending?.billingMode)
      ? pending!.billingMode as BillingMode
      : "RECURRING_MONTHLY",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans.find((plan) => plan.code === packageCode) || PACKAGE_DEFINITIONS[packageCode];
  const amount = billingMode === "PREPAID_SIX_MONTHS"
    ? selectedPlan.prepaidSixMonthsGross
    : selectedPlan.monthlyGross;

  const slugSuggestion = useMemo(
    () => companyName
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48),
    [companyName],
  );

  function billingDescription(mode: BillingMode) {
    if (mode === "RECURRING_MONTHLY") {
      return `Po trialu ${selectedPlan.monthlyGross} zł / mies.`;
    }
    if (mode === "PREPAID_SIX_MONTHS") {
      return `Jednorazowo ${selectedPlan.prepaidSixMonthsGross} zł`;
    }
    return `Jednorazowo ${selectedPlan.monthlyGross} zł`;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Ten sam schemat co na serwerze: bez tego pusty lub zarezerwowany adres
    // wracał dopiero jako 400 z API, już po utworzeniu sesji płatności.
    const validatedSlug = companySlugSchema.safeParse(slug || slugSuggestion);
    if (!validatedSlug.success) {
      setError(validatedSlug.error.issues[0]?.message || "Podaj poprawny adres konfiguratora.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          slug: validatedSlug.data,
          packageCode,
          billingMode,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się założyć firmy.");
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return;
      }
      window.location.assign(`/${result.slug}/dashboard`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Nie udało się zakończyć rejestracji.");
    } finally {
      setBusy(false);
    }
  }

  if (!authEnabled || !isSignedIn) {
    return (
      <div className="pm-setup-notice" role="status">
        <LockKeyhole size={20} />
        <div>
          <strong>{!authEnabled ? "Clerk nie jest skonfigurowany" : "Zaloguj się, aby kontynuować"}</strong>
          <p>
            {!authEnabled
              ? "Najpierw dodaj klucze Clerk w pliku .env.local."
              : "Utworzenie przestrzeni firmy wymaga aktywnego konta użytkownika."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className="pm-onboarding-form" onSubmit={submit}>
      <div className="pm-onboarding-main">
        {(checkoutCancelled || pending) && (
          <div className="pm-setup-notice" role="status">
            <CreditCard size={20} />
            <div>
              <strong>
                {checkoutCancelled ? "Płatność została przerwana" : "Dokończ rozpoczętą rejestrację"}
              </strong>
              <p>
                Twoja firma czeka na potwierdzenie płatności. Możesz poprawić nazwę,
                adres konfiguratora lub pakiet i ponowić płatność.
              </p>
            </div>
          </div>
        )}

        <section className="pm-form-section">
          <div className="pm-form-section-title">
            <span><Building2 size={18} /></span>
            <div>
              <strong>Dane firmy</strong>
              <small>Nazwa widoczna w panelu i adres publicznego konfiguratora</small>
            </div>
          </div>

          <div className="pm-form-grid">
            <label className="pm-field">
              <span>Nazwa firmy</span>
              <input
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                required
                minLength={2}
                autoComplete="organization"
                placeholder="np. Stalowe Garaże"
              />
            </label>
            <label className="pm-field">
              <span>Adres konfiguratora</span>
              <div className="pm-slug-input">
                <em>/</em>
                <input
                  value={slug}
                  onChange={(event) => setSlug(
                    event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "")
                      .slice(0, 48),
                  )}
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={slugSuggestion || "twoja-firma"}
                  aria-label="Slug adresu konfiguratora"
                />
              </div>
              <small className="pm-field-hint">
                warstwowe3d.pl/{slug || slugSuggestion || "twoja-firma"}
              </small>
            </label>
          </div>
        </section>

        <fieldset className="pm-form-section">
          <legend className="pm-form-section-title">
            <span><BadgeCheck size={18} /></span>
            <span>
              <strong>Wybierz pakiet</strong>
              <small>Możesz zmienić go później w panelu rozliczeń</small>
            </span>
          </legend>
          <div className="pm-plan-picker">
            {plans.map((plan) => {
              const selected = packageCode === plan.code;
              return (
                <button
                  key={plan.code}
                  className={selected ? "is-selected" : ""}
                  type="button"
                  onClick={() => setPackageCode(plan.code)}
                  aria-pressed={selected}
                >
                  <span className="pm-plan-name">{plan.name}</span>
                  <span className="pm-plan-price"><strong>{plan.monthlyGross}</strong> zł / mies.</span>
                  <small>{planDescriptions[plan.code]}</small>
                  <i>{selected ? <Check size={14} /> : null}</i>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="pm-form-section">
          <legend className="pm-form-section-title">
            <span><CreditCard size={18} /></span>
            <span>
              <strong>Sposób rozliczenia</strong>
              <small>Wybierz subskrypcję lub płatność jednorazową</small>
            </span>
          </legend>
          <div className="pm-billing-picker">
            {billingOptions.map((option) => {
              const Icon = option.icon;
              const selected = billingMode === option.code;
              return (
                <button
                  key={option.code}
                  type="button"
                  className={selected ? "is-selected" : ""}
                  onClick={() => setBillingMode(option.code)}
                  aria-pressed={selected}
                >
                  <span className="pm-billing-radio">{selected && <i />}</span>
                  <span className="pm-billing-icon"><Icon size={18} /></span>
                  <span className="pm-billing-copy">
                    <strong>{option.title}</strong>
                    <small>{billingDescription(option.code)}</small>
                  </span>
                  {option.badge && <em>{option.badge}</em>}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="pm-setup-notice" role="status">
          <CreditCard size={20} />
          <div>
            <strong>Bezpieczna płatność Stripe</strong>
            <p>Dane karty, adres i NIP podasz na szyfrowanej stronie Stripe po zatwierdzeniu formularza.</p>
          </div>
        </div>
        {error && <p className="pm-form-error" role="alert">{error}</p>}
      </div>

      <aside className="pm-order-summary">
        <div className="pm-onboarding-user">
          <span>
            {user?.imageUrl
              ? <img src={user.imageUrl} alt="" />
              : <CircleUserRound size={20} />}
          </span>
          <div>
            <small>Zalogowano jako</small>
            <strong>{user?.fullName || user?.primaryEmailAddress?.emailAddress || "Nowe konto"}</strong>
          </div>
        </div>

        <div className="pm-summary-heading">
          <span>Podsumowanie</span>
          <strong>{selectedPlan.name}</strong>
        </div>

        <div className="pm-summary-list">
          <span><small>Plan</small><strong>{selectedPlan.name}</strong></span>
          <span>
            <small>Rozliczenie</small>
            <strong>
              {billingMode === "RECURRING_MONTHLY"
                ? "Co miesiąc"
                : billingMode === "PREPAID_SIX_MONTHS" ? "6 miesięcy" : "1 miesiąc"}
            </strong>
          </span>
          <span><small>Wartość</small><strong>{amount} zł brutto</strong></span>
        </div>

        {billingMode === "RECURRING_MONTHLY" ? (
          <div className="pm-trial-summary">
            <Sparkles size={17} />
            <span><strong>Dzisiaj: 0 zł</strong><small>Pierwsze obciążenie po 7 dniach</small></span>
          </div>
        ) : (
          <div className="pm-trial-summary pm-payment-summary">
            <CreditCard size={17} />
            <span><strong>Płatność przez Stripe</strong><small>Dostęp po potwierdzeniu płatności</small></span>
          </div>
        )}

        <button className="pm-button pm-button-primary pm-button-lg pm-button-full" disabled={busy} type="submit">
          {busy ? <Loader2 size={18} className="pm-spin" /> : null}
          {billingMode === "RECURRING_MONTHLY"
            ? "Rozpocznij trial"
            : `Przejdź do płatności`}
          {!busy && <ArrowRight size={18} />}
        </button>

        <p className="pm-summary-legal">
          <LockKeyhole size={13} />
          Kontynuując, akceptujesz warunki usługi i potwierdzasz zapoznanie się z {" "}
          <Link href="/polityka-prywatnosci" target="_blank">polityką prywatności</Link> oraz {" "}
          <Link href="/polityka-cookies" target="_blank">polityką cookies</Link>.
        </p>
        <div className="pm-summary-support">
          Potrzebujesz pomocy? <button type="button">Skontaktuj się <ChevronRight size={13} /></button>
        </div>
      </aside>
    </form>
  );
}
