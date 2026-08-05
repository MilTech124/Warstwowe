import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/privacy/LegalDocument";
import { OPERATOR, PRIVACY_POLICY_EFFECTIVE_DATE } from "@/config/legal";

export const metadata = {
  title: "Polityka prywatności",
  description: "Zasady przetwarzania danych osobowych w platformie Warstwowe3D.",
};

export default function PrivacyPolicyPage() {
  return (
    <LegalDocument
      eyebrow={`Obowiązuje od ${PRIVACY_POLICY_EFFECTIVE_DATE}`}
      title="Polityka prywatności Warstwowe3D"
      lead="Wyjaśniamy, jakie dane przetwarzamy, po co to robimy, komu je powierzamy i jak możesz korzystać ze swoich praw."
    >
      <LegalSection title="1. Administrator i zakres polityki">
        <p>
          Administratorem danych związanych z kontem, subskrypcją, bezpieczeństwem i działaniem
          platformy jest <strong>{OPERATOR.legalName}</strong>, {OPERATOR.address}, NIP {OPERATOR.taxId}
          (dalej „BruteCode” lub „my”). Kontakt: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>,
          tel. <a href={`tel:${OPERATOR.phone.replaceAll(" ", "")}`}>{OPERATOR.phone}</a>.
        </p>
        <p>
          Gdy składasz zapytanie w konfiguratorze konkretnej firmy, administratorem danych
          zamówienia jest ta firma, a BruteCode zapewnia jej platformę i co do zasady działa jako
          podmiot przetwarzający. Dane administratora znajdziesz w informacji prywatności pod
          adresem <code>/nazwa-firmy/polityka-prywatnosci</code> oraz przy formularzu zamówienia.
        </p>
      </LegalSection>

      <LegalSection title="2. Jakie dane przetwarzamy">
        <ul>
          <li>dane konta i uwierzytelnienia: identyfikator Clerk, imię, nazwisko, e-mail i informacje o sesji;</li>
          <li>dane firmy i zespołu: nazwa, NIP, adres, branding, role, zaproszenia i ustawienia;</li>
          <li>dane rozliczeniowe: plan, status subskrypcji, identyfikatory Stripe, historia płatności i końcówka karty;</li>
          <li>dane klientów tenantów: imię lub firma, adres, telefon, e-mail, notatki i konfiguracja produktu;</li>
          <li>dane techniczne i bezpieczeństwa: czas operacji, identyfikatory zdarzeń, logi, adres IP dostępny w logach infrastruktury oraz dane urządzenia;</li>
          <li>dane analityczne i reklamowe wyłącznie po udzieleniu odpowiedniej zgody cookies.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Cele i podstawy prawne">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Cel</th><th>Podstawa</th><th>Okres</th></tr></thead>
            <tbody>
              <tr><td>Utworzenie konta, świadczenie platformy i obsługa subskrypcji</td><td>art. 6 ust. 1 lit. b RODO</td><td>czas umowy i okres niezbędny do rozliczeń lub roszczeń</td></tr>
              <tr><td>Dokumentacja płatności i obowiązki podatkowe</td><td>art. 6 ust. 1 lit. c RODO</td><td>przez okres wymagany przepisami rachunkowymi i podatkowymi</td></tr>
              <tr><td>Bezpieczeństwo, audyt, zapobieganie nadużyciom i dochodzenie roszczeń</td><td>art. 6 ust. 1 lit. f RODO</td><td>do ustania uzasadnionego celu lub przedawnienia roszczeń</td></tr>
              <tr><td>Analityka i reklama Google</td><td>art. 6 ust. 1 lit. a RODO oraz art. 399 PKE</td><td>do wycofania zgody lub końca okresu właściwego cookie</td></tr>
              <tr><td>Dowód wyboru ustawień prywatności</td><td>art. 6 ust. 1 lit. c i f RODO</td><td>do 5 lat, w minimalnej pseudonimowej postaci</td></tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="4. Odbiorcy, procesorzy i transfery">
        <p>Dane mogą otrzymać upoważnieni pracownicy administratora oraz dostawcy niezbędni do działania usługi:</p>
        <ul>
          <li><strong>Clerk</strong> — uwierzytelnianie i sesje;</li>
          <li><strong>Stripe</strong> — Checkout, subskrypcje, płatności i dokumenty płatnicze;</li>
          <li><strong>MongoDB Atlas</strong> — baza danych;</li>
          <li><strong>Vercel i Vercel Blob</strong> — hosting aplikacji, logi i pliki;</li>
          <li><strong>webd.pl</strong> — wysyłka wiadomości transakcyjnych SMTP;</li>
          <li><strong>Google</strong> — GA4 i Google Ads, wyłącznie zgodnie z wyborem w centrum zgód;</li>
          <li>profesjonalni doradcy, organy publiczne i inni odbiorcy, gdy wymagają tego przepisy.</li>
        </ul>
        <p>
          Niektórzy dostawcy mogą przetwarzać dane poza EOG. Korzystamy wtedy z mechanizmów
          przewidzianych w rozdziale V RODO, w szczególności decyzji o adekwatności, EU–US Data
          Privacy Framework lub standardowych klauzul umownych. Szczegóły zabezpieczeń można
          uzyskać pod adresem {OPERATOR.email}.
        </p>
      </LegalSection>

      <LegalSection title="5. Twoje prawa">
        <p>
          Możesz żądać dostępu do danych, ich sprostowania, usunięcia, ograniczenia przetwarzania,
          przeniesienia oraz wnieść sprzeciw wobec przetwarzania opartego na uzasadnionym interesie.
          Zgodę możesz wycofać w każdej chwili bez wpływu na zgodność wcześniejszego przetwarzania.
          Wniosek wyślij na <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>. Masz również
          prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych.
        </p>
      </LegalSection>

      <LegalSection title="6. Profilowanie, dobrowolność i bezpieczeństwo">
        <p>
          Nie podejmujemy wobec Ciebie decyzji wywołujących skutki prawne wyłącznie automatycznie.
          Po zgodzie marketingowej Google może pomagać dobierać lub mierzyć reklamy. Podanie danych
          oznaczonych jako wymagane jest konieczne do konta, płatności lub obsługi zapytania; pozostałe
          dane są dobrowolne. Stosujemy kontrolę dostępu, szyfrowanie transmisji, separację danych firm,
          walidację wejścia, audyt operacji i kopie zapewniane przez dostawców infrastruktury.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies i zmiany polityki">
        <p>
          Szczegółowy wykaz technologii znajduje się w <Link href="/polityka-cookies">polityce cookies</Link>.
          Istotna zmiana celów lub kategorii cookies spowoduje ponowne wyświetlenie centrum zgód.
          Aktualna wersja dokumentu jest zawsze dostępna pod tym adresem.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
