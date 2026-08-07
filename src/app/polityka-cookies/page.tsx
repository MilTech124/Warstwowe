import { LegalDocument, LegalSection } from "@/components/privacy/LegalDocument";
import { OPERATOR, PRIVACY_POLICY_EFFECTIVE_DATE } from "@/config/legal";

export const metadata = {
  title: "Polityka cookies",
  description: "Informacje o cookies i ustawieniach zgód w Warstwowe3D.",
};

export default function CookiesPolicyPage() {
  return (
    <LegalDocument
      eyebrow={`Obowiązuje od ${PRIVACY_POLICY_EFFECTIVE_DATE}`}
      title="Polityka cookies"
      lead="Opcjonalne technologie Google są domyślnie wyłączone. Możesz korzystać z platformy bez zgody na analitykę i marketing."
    >
      <LegalSection title="1. Jak działa nasze centrum zgód">
        <p>
          W wariancie Google Consent Mode Basic nie ładujemy Google Tag Managera i nie przesyłamy
          żadnych danych do Google przed Twoją zgodą. Możesz zaakceptować wszystkie kategorie,
          odrzucić opcjonalne albo wybrać je oddzielnie. Odrzucenie nie ogranicza dostępu do strony.
          Ustawienie pamiętamy przez 12 miesięcy lub krócej, jeżeli zmienimy wersję zasad.
        </p>
      </LegalSection>

      <LegalSection title="2. Wykaz cookies i podobnych technologii">
        <div className="legal-table-wrap">
          <table className="legal-table legal-cookie-table">
            <thead><tr><th>Technologia</th><th>Kategoria i cel</th><th>Okres</th><th>Dostawca</th></tr></thead>
            <tbody>
              <tr><td><code>w3d_consent_v1</code></td><td>Niezbędne — zapis i respektowanie wyboru zgód</td><td>12 miesięcy</td><td>BruteCode</td></tr>
              <tr><td><code>__session</code>, <code>__client</code>, <code>__client_uat</code></td><td>Niezbędne — logowanie, sesja i ochrona konta</td><td>od 60 sekund do czasu sesji określonego przez Clerk/przeglądarkę</td><td>Clerk</td></tr>
              <tr><td>cookies Stripe Checkout</td><td>Niezbędne — bezpieczeństwo i realizacja płatności wywołanej przez użytkownika</td><td>zgodnie z ustawieniami Stripe</td><td>Stripe</td></tr>
              <tr><td><code>konfigurator:viewer-quality</code> (localStorage)</td><td>Funkcjonalne — zapamiętanie wybranej jakości sceny 3D</td><td>do usunięcia danych przeglądarki</td><td>BruteCode</td></tr>
              <tr><td><code>_ga</code>, <code>_ga_*</code>, ewentualnie <code>_gid</code></td><td>Analityczne — rozróżnianie wizyt i pomiar korzystania z GA4</td><td>zwykle do 2 lat</td><td>Google</td></tr>
              <tr><td><code>_gcl_au</code>, <code>_gcl_*</code></td><td>Marketingowe — pomiar Google Ads, konwersje i remarketing</td><td>zwykle do 90 dni</td><td>Google</td></tr>
            </tbody>
          </table>
        </div>
        <p>
          Dostawcy mogą zmieniać techniczne nazwy pomocniczych cookies. Politykę aktualizujemy, gdy
          zmiana wpływa na cel, kategorię lub okres przetwarzania.
        </p>
      </LegalSection>

      <LegalSection title="3. Sygnały Google Consent Mode v2">
        <ul>
          <li><code>analytics_storage</code> otrzymuje wartość „granted” wyłącznie po zgodzie analitycznej;</li>
          <li><code>ad_storage</code>, <code>ad_user_data</code> i <code>ad_personalization</code> otrzymują „granted” wyłącznie po zgodzie marketingowej;</li>
          <li>przy odrzuceniu opcjonalnych kategorii wszystkie cztery wartości pozostają „denied”, a GTM nie jest ładowany;</li>
          <li>po cofnięciu zgody usuwamy dostępne first-party cookies Google i przeładowujemy stronę.</li>
        </ul>
        <p>
          Informacje o sposobie przetwarzania danych przez Google znajdziesz w {" "}
          <a href="https://business.safety.google/privacy/" target="_blank" rel="noreferrer">
            serwisie Business Data Responsibility Google
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="4. Zarządzanie ustawieniami">
        <p>
          Użyj przycisku „Ustawienia cookies” w prawym dolnym rogu strony, aby zmienić lub wycofać
          zgodę. Możesz też usuwać i blokować cookies w ustawieniach przeglądarki. Zablokowanie cookies
          niezbędnych może uniemożliwić logowanie, zapamiętanie decyzji lub bezpieczną płatność.
          Pytania możesz przesłać na <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
