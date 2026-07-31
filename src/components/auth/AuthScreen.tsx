"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Boxes,
  Check,
  Layers3,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "@/app/marketing-premium.css";

const clerkAppearance = {
  variables: {
    colorPrimary: "#7657f6",
    colorText: "#17201e",
    colorTextSecondary: "#68736f",
    colorBackground: "#ffffff",
    colorInputBackground: "#ffffff",
    colorInputText: "#17201e",
    borderRadius: "0.875rem",
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
  },
  elements: {
    rootBox: "pm-clerk-root",
    cardBox: "pm-clerk-card-box",
    card: "pm-clerk-card",
    headerTitle: "pm-clerk-title",
    headerSubtitle: "pm-clerk-subtitle",
    socialButtonsBlockButton: "pm-clerk-social",
    socialButtonsBlockButtonText: "pm-clerk-social-text",
    dividerLine: "pm-clerk-divider",
    dividerText: "pm-clerk-divider-text",
    formFieldLabel: "pm-clerk-label",
    formFieldInput: "pm-clerk-input",
    formButtonPrimary: "pm-clerk-submit",
    footerActionLink: "pm-clerk-footer-link",
    footer: "pm-clerk-footer",
    identityPreview: "pm-clerk-identity",
    formFieldAction: "pm-clerk-field-action",
    alert: "pm-clerk-alert",
  },
};

export function AuthScreen({
  mode,
  redirectUrl,
}: {
  mode: "sign-in" | "sign-up";
  redirectUrl?: string;
}) {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const isSignIn = mode === "sign-in";

  return (
    <main className="pm-page pm-auth-page">
      <Link className="pm-auth-back" href="/">
        <ArrowLeft size={16} /> Wróć na stronę główną
      </Link>

      <section className="pm-auth-showcase" aria-label="Korzyści Warstwowe3D">
        <div className="pm-auth-showcase-inner">
          <Link className="pm-brand pm-brand-inverse" href="/" aria-label="Warstwowe3D">
            <span className="pm-brand-mark"><Layers3 size={21} /></span>
            <span className="pm-brand-name">Warstwowe<span>3D</span></span>
          </Link>

          <div className="pm-auth-pitch">
            <div className="pm-eyebrow pm-eyebrow-dark">
              <Sparkles size={14} /> Platforma sprzedaży 3D
            </div>
            <h1>
              {isSignIn
                ? "Twoja sprzedaż jest dokładnie tam, gdzie ją zostawiłeś."
                : "Zbuduj cyfrowy kanał sprzedaży pod własną marką."}
            </h1>
            <p>
              {isSignIn
                ? "Zaloguj się, aby zarządzać ofertą, zespołem i nowymi zapytaniami klientów."
                : "Załóż konto i uruchom konfigurator, który pracuje dla Twojej firmy przez całą dobę."}
            </p>
            <ul>
              <li><span><Check size={14} /></span> Własny adres i branding firmy</li>
              <li><span><Check size={14} /></span> Kompletny panel zamówień</li>
              <li><span><Check size={14} /></span> 7 dni trialu w subskrypcji miesięcznej</li>
            </ul>
          </div>

          <div className="pm-auth-product-card">
            <div className="pm-auth-product-top">
              <span><i /> Konfigurator online</span>
              <BadgeCheck size={17} />
            </div>
            <div className="pm-auth-product-scene">
              <div className="pm-auth-garage"><i /><b /><em /></div>
              <span className="pm-auth-ground" />
            </div>
            <div className="pm-auth-product-footer">
              <span><Boxes size={16} /><strong>Nowe zamówienie</strong></span>
              <small>pełna konfiguracja zapisana</small>
            </div>
          </div>

          <div className="pm-auth-security">
            <span><ShieldCheck size={16} /> Dane chronione przez Clerk</span>
            <span><LockKeyhole size={15} /> Bezpieczne logowanie</span>
          </div>
        </div>
      </section>

      <section className="pm-auth-form-side">
        <div className="pm-auth-mobile-brand">
          <Link className="pm-brand" href="/">
            <span className="pm-brand-mark"><Layers3 size={20} /></span>
            <span className="pm-brand-name">Warstwowe<span>3D</span></span>
          </Link>
        </div>
        <div className="pm-auth-form-wrap">
          <div className="pm-auth-context">
            <span>{isSignIn ? "Witaj ponownie" : "Zacznij bez zobowiązań"}</span>
            <h2>{isSignIn ? "Zaloguj się do panelu" : "Utwórz swoje konto"}</h2>
            <p>
              {isSignIn
                ? "Uzyskaj dostęp do przestrzeni swojej firmy."
                : "Pierwszy krok do własnego konfiguratora 3D."}
            </p>
          </div>

          {configured ? (
            isSignIn ? (
              <SignIn
                path="/logowanie"
                routing="path"
                signUpUrl="/rejestracja"
                forceRedirectUrl={redirectUrl}
                fallbackRedirectUrl="/panel"
                appearance={clerkAppearance}
              />
            ) : (
              <SignUp
                path="/rejestracja"
                routing="path"
                signInUrl="/logowanie"
                forceRedirectUrl={redirectUrl}
                fallbackRedirectUrl="/panel"
                appearance={clerkAppearance}
              />
            )
          ) : (
            <div className="pm-setup-notice" role="status">
              <ShieldCheck size={20} />
              <div>
                <strong>Clerk wymaga konfiguracji</strong>
                <p>
                  Uzupełnij <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> oraz{" "}
                  <code>CLERK_SECRET_KEY</code> w pliku <code>.env.local</code>.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
