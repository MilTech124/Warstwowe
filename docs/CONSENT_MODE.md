# Consent Mode v2 — konfiguracja produkcyjna

Warstwowe3D używa wariantu **Basic**. Kontener Google Tag Manager nie jest
pobierany przed zgodą na analitykę lub marketing. Brak zmiennej środowiskowej
oznacza, że żaden skrypt Google nie zostanie załadowany.

## 1. Zmienna środowiskowa

W Vercel ustaw dla środowiska produkcyjnego:

```text
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

Po zmianie wykonaj nowy deployment. Identyfikator jest dodatkowo walidowany w
przeglądarce i musi mieć format `GTM-...`.

## 2. Wymagane ustawienia GTM

- Włącz „Consent Overview” i sprawdź ustawienia zgody każdego tagu.
- Tag GA4 może uruchamiać się wyłącznie przy `analytics_storage=granted`.
- Tagi Google Ads, remarketingu i konwersji mogą uruchamiać się wyłącznie, gdy
  `ad_storage`, `ad_user_data` i `ad_personalization` mają wartość `granted`.
- Dla tagów bez właściwych wbudowanych kontroli dodaj „Additional Consent
  Checks”. Nie pozostawiaj nierozpatrzonych tagów z opcją „Not set”.
- Dla GA4 wyłącz automatyczne `page_view` (`send_page_view=false`) i uruchamiaj
  kontrolowany pomiar stron na zdarzeniu `virtual_page_view`. Aplikacja wysyła to
  zdarzenie po zmianie trasy Next.js tylko przy zgodzie analitycznej.
- Nie dodawaj osobnego, statycznego snippetu GTM lub Google tag do layoutu,
  szablonu Vercel ani innego menedżera skryptów — ominąłby tryb Basic.

## 3. Scenariusze odbioru w Tag Assistant

1. Wyczyść dane witryny i otwórz stronę bez podejmowania decyzji. Nie może być
   żądania do `googletagmanager.com`, `google-analytics.com` ani
   `googleadservices.com`.
2. Odrzuć opcjonalne. Strona ma pozostać w pełni funkcjonalna, bez `_ga` i
   `_gcl_*`.
3. Włącz tylko analitykę. `analytics_storage` ma być `granted`, a trzy sygnały
   reklamowe `denied`.
4. Włącz marketing. `ad_storage`, `ad_user_data` i `ad_personalization` mają być
   `granted`.
5. Cofnij każdą zgodę w „Ustawieniach cookies”. Odpowiednie cookies mają zostać
   usunięte; po całkowitym cofnięciu strona przeładuje się w ścisłym trybie
   Basic.
6. Sprawdź nawigację SPA: każde przejście powinno utworzyć dokładnie jedno
   `virtual_page_view`, wyłącznie po zgodzie analitycznej.

## 4. Utrzymanie

Wersja polityki znajduje się w `src/config/legal.ts`. Jej zmiana automatycznie
unieważnia starszy zapis `w3d_consent_v1` i wymaga ponownego wyboru. Przed
wdrożeniem nowego narzędzia audytuj jego cookies, transfery i tagi oraz uzupełnij
obie polityki. AdSense, Ad Manager lub AdMob wymagają ponownej oceny CMP i mogą
wymagać certyfikowanego rozwiązania zgodnego z TCF.

