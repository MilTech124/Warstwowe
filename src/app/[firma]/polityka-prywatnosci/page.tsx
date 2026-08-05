import { notFound } from "next/navigation";
import { LegalDocument, LegalSection } from "@/components/privacy/LegalDocument";
import { OPERATOR, PRIVACY_POLICY_EFFECTIVE_DATE } from "@/config/legal";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const bootstrap = await getConfiguratorBootstrap(firma);
  return { title: bootstrap ? `Prywatność — ${bootstrap.company.branding.name}` : "Prywatność" };
}

export default async function TenantPrivacyPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) notFound();
  const profile = bootstrap.company.privacyProfile;

  if (!profile) {
    return (
      <LegalDocument
        eyebrow="Informacja niedostępna"
        title={`Prywatność — ${bootstrap.company.branding.name}`}
        lead="Firma nie opublikowała jeszcze danych administratora. Do tego czasu formularz zamówienia pozostaje wyłączony."
        backHref={`/${firma}`}
        backLabel="Wróć do konfiguratora"
      >
        <LegalSection title="Kontakt z operatorem platformy">
          <p>
            W sprawach technicznych skontaktuj się z BruteCode: {OPERATOR.email}. Nie przesyłaj
            danych zamówienia, dopóki firma nie opublikuje kompletnej informacji prywatności.
          </p>
        </LegalSection>
      </LegalDocument>
    );
  }

  return (
    <LegalDocument
      eyebrow={`Wersja ${profile.noticeVersion} · ${PRIVACY_POLICY_EFFECTIVE_DATE}`}
      title={`Informacja prywatności — ${bootstrap.company.branding.name}`}
      lead="Dotyczy danych przekazywanych w formularzu zamówienia i podczas obsługi przygotowanej konfiguracji."
      backHref={`/${firma}`}
      backLabel="Wróć do konfiguratora"
    >
      <LegalSection title="1. Administrator danych">
        <p>
          Administratorem danych zamówienia jest <strong>{profile.controllerName}</strong>, {profile.address},
          NIP {profile.taxId}. Kontakt w sprawach danych osobowych: {" "}
          <a href={`mailto:${profile.privacyEmail}`}>{profile.privacyEmail}</a>
          {profile.privacyPhone ? <>, tel. <a href={`tel:${profile.privacyPhone.replaceAll(" ", "")}`}>{profile.privacyPhone}</a></> : null}.
        </p>
        <p>
          {OPERATOR.legalName} zapewnia platformę Warstwowe3D i przetwarza dane zamówienia na
          polecenie administratora. BruteCode pozostaje odrębnym administratorem technicznych logów
          bezpieczeństwa i wyborów cookies zgodnie z własną polityką prywatności.
        </p>
      </LegalSection>

      <LegalSection title="2. Dane, cele i podstawy">
        <ul>
          <li>imię i nazwisko lub nazwa firmy, adres, telefon, e-mail oraz dobrowolne uwagi;</li>
          <li>wybrana konfiguracja obiektu, wycena, numer i historia obsługi zamówienia;</li>
          <li>techniczne informacje niezbędne do bezpieczeństwa i przesłania formularza.</li>
        </ul>
        <p>
          Dane służą przygotowaniu oferty, kontaktowi i obsłudze zamówienia na podstawie art. 6 ust. 1
          lit. b RODO, realizacji obowiązków prawnych na podstawie lit. c oraz obronie przed roszczeniami
          i zapewnieniu bezpieczeństwa na podstawie lit. f. Potwierdzenie przy formularzu dokumentuje
          zapoznanie się z tą informacją — nie jest wymuszoną zgodą na realizację zamówienia.
        </p>
      </LegalSection>

      <LegalSection title="3. Odbiorcy i okres przechowywania">
        <p>
          Dostęp mogą otrzymać upoważnieni pracownicy administratora, BruteCode i jego dostawcy
          hostingu, bazy danych, poczty oraz plików, a także doradcy i organy publiczne, gdy wymagają
          tego przepisy. Dane są przechowywane przez czas obsługi zapytania i realizacji umowy, a
          następnie przez okres konieczny do rozliczeń, obowiązków prawnych i przedawnienia roszczeń.
          O konkretny okres dla swojego zamówienia możesz zapytać administratora.
        </p>
      </LegalSection>

      <LegalSection title="4. Prawa osoby">
        <p>
          Możesz żądać dostępu, sprostowania, usunięcia, ograniczenia, przeniesienia danych oraz
          wnieść sprzeciw wobec przetwarzania opartego na uzasadnionym interesie. Skontaktuj się z
          administratorem pod adresem <a href={`mailto:${profile.privacyEmail}`}>{profile.privacyEmail}</a>.
          Możesz również złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych. Podanie pól
          wymaganych jest konieczne do przygotowania i obsługi zamówienia. Administrator nie podejmuje
          wobec Ciebie decyzji wywołujących skutki prawne wyłącznie automatycznie.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
