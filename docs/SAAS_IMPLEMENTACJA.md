# Implementacja wielofirmowej aplikacji SaaS

Data aktualizacji: 30 lipca 2026

## 1. Cel zmian

Istniejący konfigurator garaży i obiektów z płyt warstwowych został rozbudowany o warstwę wielofirmowej aplikacji SaaS.

Konfigurator React Three Fiber pozostał silnikiem wizualizacji 3D, natomiast katalog produktów, ustawienia firmowe, pakiety, uprawnienia, zamówienia, użytkownicy i płatności zostały wydzielone do osobnych modułów.

Docelowo każda firma otrzymuje:

- publiczny konfigurator pod adresem `/{firma}`,
- własny dashboard,
- własne ustawienia i branding,
- odseparowane zamówienia,
- wybrany pakiet funkcjonalny,
- pracowników powiązanych z firmą wspólnym `companyId`,
- rozliczenia obsługiwane przez PayU.

## 2. Zaimplementowane ścieżki

### Część publiczna

- `/` — strona produktu i cennik.
- `/demo` — demonstracyjny konfigurator w pakiecie Diamond.
- `/rejestracja` — rejestracja użytkownika przez Clerk.
- `/logowanie` — logowanie przez Clerk.
- `/onboarding` — utworzenie firmy, wybór slugu, pakietu i sposobu płatności.
- `/{firma}` — publiczny konfigurator konkretnej firmy.

Jeżeli firma nie ma aktywnego dostępu, jej publiczna ścieżka pokazuje brandowany komunikat:

> Konfigurator jest obecnie nieaktywny.

### Dashboard firmy

- `/{firma}/dashboard` — podsumowanie firmy.
- `/{firma}/dashboard/orders` — lista zamówień.
- `/{firma}/dashboard/orders/{orderId}` — szczegóły zamówienia.
- `/{firma}/dashboard/settings` — ustawienia konfiguratora i branding.
- `/{firma}/dashboard/catalog` — dostępny katalog.
- `/{firma}/dashboard/team` — pracownicy i zaproszenia.
- `/{firma}/dashboard/billing` — pakiet, płatności i rezygnacja.
- `/{firma}/dashboard/audit` — dziennik aktywności.

### Superadmin

- `/superadmin` — podsumowanie całego SaaS.
- `/superadmin/companies` — firmy, statusy i daty dostępu.
- `/superadmin/plans` — ceny, limity oraz funkcje pakietów.
- `/superadmin/catalog` — producenci i produkty.
- `/superadmin/billing` — płatności, webhooki i błędy odnowień.
- `/superadmin/audit` — globalny audyt zmian.

Statyczne nazwy, takie jak `api`, `superadmin`, `logowanie`, `rejestracja`, `onboarding` i `demo`, są zablokowane jako slug firmy.

## 3. Pakiety i centralne uprawnienia

Zaimplementowano cztery pakiety:

| Pakiet | Cena miesięczna | Przedpłata 6 miesięcy | Limit kont |
|---|---:|---:|---:|
| Standard | 500 zł | 2700 zł | 1 |
| Gold | 800 zł | 4320 zł | 3 |
| Platinum | 1000 zł | 5400 zł | 5 |
| Diamond | 1400 zł | 7560 zł | 10 |

Przedpłata półroczna uwzględnia rabat 10%.

Uprawnienia nie są rozproszone po komponentach w postaci porównań nazw pakietów. Powstał centralny resolver, który uwzględnia:

1. wersję i funkcje pakietu,
2. status subskrypcji,
3. datę zakończenia dostępu,
4. zawieszenie firmy,
5. ręczne wyłączenie konfiguratora,
6. nadpisania superadmina,
7. funkcje wyłączone przez administratora firmy.

Superadmin może wymusić dostęp albo blokadę wybranej funkcji dla konkretnej firmy. Administrator firmy może jedynie zawężać dostęp wynikający z pakietu.

### Macierz funkcji

- Standard: podstawowy konfigurator, obróbki, orynnowanie i zamówienia.
- Gold: funkcje Standard oraz wypust frontowy, analityka, CSV i powiadomienia.
- Platinum: funkcje Gold oraz widok konstrukcji.
- Diamond: funkcje Platinum oraz animacje bram, oświetlenie i PDF.

Kontrola funkcji działa w:

- interfejsie konfiguratora,
- scenie 3D,
- danych bootstrap firmy,
- walidacji zamówienia po stronie serwera,
- endpointach dashboardu.

## 4. Wielofirmowość i baza danych

Zastosowano logiczną izolację tenantów przez `companyId`. Nie są tworzone osobne kolekcje MongoDB dla każdej firmy.

Dodane modele obejmują:

- firmy,
- ustawienia firm,
- pakiety i wersje pakietów,
- nadpisania funkcji,
- subskrypcje,
- płatności i próby obciążeń,
- webhooki PayU,
- producentów i produkty katalogowe,
- presety i wykończenia,
- zamówienia i zdarzenia zamówień,
- liczniki numeracji,
- dziennik audytu.

Każde zapytanie dashboardu ogranicza dane przez `companyId`.

## 5. Konfigurator firmy

Konfigurator jest inicjalizowany dokumentem `ConfiguratorBootstrap`, który zawiera:

- identyfikator i slug firmy,
- branding,
- aktywny pakiet,
- efektywne funkcje,
- limit kont,
- opublikowane ustawienia,
- dozwolony katalog,
- wersję katalogu.

Dotychczasowy globalny singleton Zustand został zastąpiony fabryką store i Providerem. Każda instancja konfiguratora otrzymuje osobny store inicjalizowany ustawieniami konkretnej firmy.

Schemat konfiguracji został podniesiony z wersji 11 do wersji 12.

### Ograniczenia pakietowe w scenie 3D

- wypust jest zerowany, jeżeli firma nie ma odpowiedniego uprawnienia,
- konstrukcja nie może zostać uruchomiona poza Platinum i Diamond,
- oświetlenie jest wyłączane poza Diamond,
- bramy pozostają zamknięte bez dostępu do animacji,
- PDF jest dostępny wyłącznie w Diamond,
- presety i producenci są filtrowani ustawieniami firmy.

## 6. Dashboard firmy

### Pulpit

Zawiera:

- status konfiguratora,
- pakiet i datę dostępu,
- liczbę zamówień,
- liczbę nowych i zaakceptowanych zamówień,
- konwersję,
- wykres sprzedaży,
- ostatnie zamówienia.

### Zamówienia

Zaimplementowano:

- wyszukiwanie i filtrowanie,
- statusy zamówienia,
- dane klienta,
- przypisanie handlowca,
- notatki,
- historię zdarzeń,
- snapshot konfiguracji,
- wersję ustawień i katalogu,
- eksport CSV w odpowiednim pakiecie,
- zapis i pobieranie prywatnego PDF w Diamond.

Numery zamówień mają format:

`KOD-FIRMY/ROK/NUMER`

Snapshot przechowuje konfigurację niezależnie od późniejszych zmian katalogu.

### Ustawienia

Zaimplementowano:

- ręczne włączanie konfiguratora,
- branding firmy,
- nazwę marki,
- kolory główny i akcentowy,
- dane kontaktowe,
- logo przesyłane do publicznego Vercel Blob,
- wybór presetów,
- domyślny preset,
- wybór producentów płyt,
- wybór producentów bram,
- wybór kolorów ścian i dachu,
- wyłączanie funkcji dostępnych w pakiecie,
- model szkic → publikacja.

Zmiany zapisane jako szkic nie wpływają na publiczny konfigurator do chwili publikacji.

### Zespół

Zaimplementowano:

- członkostwa firmy zapisane w MongoDB i izolowane przez `companyId`,
- role właściciel, administrator i handlowiec,
- zaproszenia e-mail we własnym UI, wysyłane przez SMTP,
- automatyczne połączenie zaproszenia z kontem Clerk po zalogowaniu zweryfikowanym adresem e-mail,
- kontrolę limitu kont również po stronie API,
- zmianę roli przez endpoint,
- usuwanie dostępu pracownika do firmy bez usuwania jego konta Clerk,
- zabezpieczenie właściciela przed usunięciem.

Clerk służy wyłącznie do uwierzytelniania. Każdy pracownik ma własny `clerkUserId`, natomiast właściciel i pracownicy tej samej firmy korzystają ze wspólnego `companyId`. Funkcja Clerk Organizations nie jest wymagana.

Handlowiec widzi pulpit i zamówienia. Nie otrzymuje dostępu do katalogu, ustawień, zespołu, rozliczeń ani audytu.

## 7. Superadmin

Superadmin jest identyfikowany przez:

`CLERK_SUPERADMIN_USER_IDS`

Identyfikatory nie są zapisane w repozytorium.

Panel umożliwia:

- podgląd liczby firm i aktywnych dostępów,
- podgląd MRR,
- kontrolę nieudanych płatności,
- zmianę slugu firmy,
- zawieszenie i aktywację firmy,
- zmianę pakietu i statusu subskrypcji,
- zmianę daty dostępu,
- definiowanie nadpisań funkcji,
- edycję cen i limitów pakietów,
- publikowanie nowych wersji pakietów,
- zarządzanie producentami,
- zarządzanie produktami płyt i bram,
- publikowanie i archiwizowanie katalogu,
- kontrolę webhooków, odnowień i audytu.

Wejście superadmina do dashboardu firmy pokazuje wyraźny baner. Tryb nadzoru jest domyślnie tylko do odczytu, a endpointy firmy blokują zwykłe operacje zapisu wykonywane w tym trybie.

## 8. PayU

Zaimplementowano:

- adapter PayU Sandbox/Production,
- OAuth,
- Secure Form po stronie przeglądarki,
- tokenizację karty,
- `recurring: FIRST` przy rozpoczynaniu trialu,
- `recurring: STANDARD` przy kolejnych obciążeniach,
- trial 7 dni tylko dla subskrypcji miesięcznej,
- płatność jednorazową za miesiąc,
- płatność jednorazową za pół roku,
- unikalny `extOrderId`,
- weryfikację podpisu webhooka,
- idempotencję webhooków,
- obsługę `COMPLETED` i `CANCELED`,
- natychmiastowe wyłączenie dostępu po nieudanym odnowieniu,
- zaplanowaną zmianę pakietu na koniec okresu,
- natychmiastową zmianę pakietu podczas trialu,
- rezygnację na koniec opłaconego okresu,
- automatyczne wygaszanie przedpłat.

Cron odnowień jest skonfigurowany w `vercel.json`. Na planie Vercel Hobby uruchamia się raz dziennie, ponieważ ten plan nie obsługuje częstszych harmonogramów. Plan Pro pozwala wrócić do harmonogramu co 5 minut.

Aplikacja nie zapisuje numeru karty ani CVV. Lokalnie pozostają wyłącznie identyfikatory PayU oraz maskowane dane karty.

## 9. PDF, pliki i e-maile

PDF nadal jest generowany w przeglądarce na podstawie istniejących zrzutów WebGL.

Dla pakietu Diamond:

1. klient zapisuje zamówienie,
2. otrzymuje jednorazowy token potwierdzenia,
3. generuje PDF w przeglądarce,
4. przesyła dokument do prywatnego Vercel Blob,
5. PDF zostaje przypisany do zamówienia,
6. autoryzowany pracownik firmy może pobrać dokument.

Logo firmowe jest przechowywane w publicznym Vercel Blob.

Dodano adapter SMTP oparty na Nodemailer do wysyłania powiadomień o nowych zamówieniach przez skrzynkę Webd.

## 10. Bezpieczeństwo

Zaimplementowano:

- ochronę tras przez Clerk Proxy,
- ponowną autoryzację w endpointach,
- izolację danych przez `companyId`,
- kontrolę roli blisko chronionego zasobu,
- kontrolę limitu kont w API,
- walidację Zod,
- ponowną walidację konfiguracji zamówienia po stronie serwera,
- weryfikację podpisów PayU na surowym body,
- idempotencję webhooków,
- prywatny dostęp do PDF,
- brak danych kart w bazie,
- audyt zmian ustawień, pakietów, firm, zespołu i zamówień,
- tryb superadmina tylko do odczytu w dashboardzie firmy.

## 11. Warstwa UI/UX

Interfejs został przebudowany jako spójny, responsywny produkt SaaS:

- strona główna ma nową hierarchię sprzedażową, realny podgląd konfiguratora, sekcje procesu i rozbudowany cennik,
- dodano dużą galerię produktu pokazującą konfigurator, dashboard firmy, ustawienia oferty i panel superadmina jako realne powierzchnie systemu,
- atrapy w sekcjach marketingowych zastąpiono szczegółowymi wizualizacjami produktu z rzeczywistymi etykietami, statusami, zamówieniami, katalogiem, rolami i przekazaniem danych do handlowca,
- hero wykorzystuje krótki `hero-video.webm`, osobna duża sekcja pełną prezentację `long-videlo-full.webm`, a sekcja Diamond nocny `darc-scene-garagewithlight.webm`; każdy film występuje tylko raz,
- strona główna nie osadza już konfiguratora `/demo` ani silnika 3D; pełne sterowanie jest dostępne dopiero po przejściu do osobnej ścieżki `/demo`, dzięki czemu homepage pozostaje lżejszy,
- logowanie, rejestracja i onboarding mają wspólny premium layout oraz polską lokalizację komponentów Clerk,
- publiczny konfigurator pokazuje branding firmy, status online, uporządkowane kroki i lepsze stany aktywne,
- stan nieaktywnego konfiguratora ma pełny branding, kontakt do firmy i jasną ścieżkę do rozliczeń,
- dashboard firmy ma responsywny shell, mobilną nawigację, czytelniejsze metryki, formularze, tabele i stany puste,
- superadmin ma osobny operacyjny system wizualny, aby nie wyglądał jak kopia panelu firmy,
- dodano widoczne focus states, mikrointerakcje i obsługę `prefers-reduced-motion`,
- naprawiono poziomy overflow konfiguratora na telefonach; szerokość strony odpowiada szerokości viewportu,
- krytyczne paski opcji pozostają przewijane wewnętrznie na małych ekranach, bez przesuwania całej aplikacji.

Nowe wydzielone arkusze:

- `src/app/marketing-premium.css`,
- `src/app/landing-product-visuals.css`,
- `src/app/dashboard-premium.css`,
- `src/app/superadmin-premium.css`.

## 12. Testy i wykonana weryfikacja

Aktualny wynik:

- 47 testów regresji istniejącego konfiguratora 3D,
- 5 testów pakietów i resolvera SaaS,
- łącznie 52 zaliczone testy,
- produkcyjny `npm run build` przechodzi,
- `/` zwraca HTTP 200,
- `/demo` zwraca HTTP 200,
- `/api/public/companies/demo/bootstrap` zwraca HTTP 200.

Zachowano testy:

- geometrii wypustów,
- konstrukcji wypustów,
- oświetlenia,
- materiałów,
- assetów materiałowych,
- otworów w presetach.

Dodano testy:

- cen pakietów,
- rabatu półrocznego,
- dokładnej macierzy funkcji,
- limitów kont,
- nadpisań superadmina,
- wygasania nadpisań,
- wyłączenia dostępu po błędzie płatności,
- wyłączenia dostępu po końcu okresu,
- zawieszenia firmy.

## 13. Co pozostało do zrobienia

### Konfiguracja usług

- [ ] Utworzyć produkcyjny klaster MongoDB Atlas w regionie europejskim.
- [ ] Skonfigurować Clerk oraz dozwolone adresy aplikacji.
- [ ] Skonfigurować w Clerk logowanie, rejestrację i dozwolone adresy przekierowań.
- [ ] Uzupełnić `CLERK_SUPERADMIN_USER_IDS`.
- [ ] Skonfigurować PayU Sandbox.
- [ ] Uzyskać aktywację tokenizacji i płatności cyklicznych od PayU.
- [ ] Skonfigurować prywatny i publiczny Vercel Blob.
- [ ] Skonfigurować konto SMTP Webd oraz adres nadawcy we wszystkich środowiskach.
- [ ] Ustawić bezpieczny `CRON_SECRET`.
- [ ] Uzupełnić wszystkie wartości z `.env.example` na Vercel.

### Testy integracyjne

- [ ] Przetestować pełną rejestrację z prawdziwym środowiskiem Clerk.
- [ ] Przetestować utworzenie członkostwa właściciela oraz przyjęcie zaproszenia pracownika.
- [ ] Przetestować tokenizację karty w PayU Secure Form.
- [ ] Przetestować transakcję 0 zł i rozpoczęcie trialu.
- [ ] Przetestować pierwsze obciążenie po trialu.
- [ ] Przetestować odnowienie `recurring: STANDARD`.
- [ ] Przetestować płatność za miesiąc.
- [ ] Przetestować przedpłatę półroczną.
- [ ] Przetestować anulowanie i odrzucenie płatności.
- [ ] Przetestować ponowiony webhook PayU.
- [ ] Przetestować niepoprawny podpis webhooka.
- [ ] Przetestować prywatny PDF na produkcyjnym Vercel Blob.
- [ ] Przetestować wiadomości SMTP Webd, odpowiedzi `reply-to` i dostarczalność.

### Funkcje wymagające dalszego rozwoju

- [ ] Dodać kontrolowany proces zwrotów PayU z osobnym potwierdzeniem superadmina.
- [ ] Dodać zmianę zapisanej karty PayU w panelu rozliczeń.
- [ ] Dodać ręczne ponowienie płatności po zmianie karty.
- [ ] Dodać globalną, paginowaną listę wszystkich zamówień w superadminie.
- [ ] Dodać globalny ekran użytkowników Clerk.
- [ ] Dodać ekran szczegółów firmy w superadminie zamiast edycji wyłącznie na liście.
- [ ] Dodać datę wygaśnięcia nadpisania funkcji do formularza superadmina. Endpoint i model już ją obsługują.
- [ ] Dodać przesyłanie modeli 3D i tekstur przez panel superadmina.
- [ ] Dodać podgląd i walidację modelu 3D przed publikacją katalogu.
- [ ] Rozbudować dynamiczny adapter produktów 3D, aby nowe profile dodane z MongoDB były renderowane bez zmian w kodzie.
- [ ] Dodać panel błędów aplikacyjnych z zewnętrznym monitoringiem.
- [ ] Dodać paginację dla dużej liczby firm, zamówień, płatności i wpisów audytu.
- [ ] Dodać faktury VAT/KSeF w osobnym etapie.

### Testy automatyczne przed produkcją

- [ ] Dodać testy integracyjne modeli z testową bazą MongoDB.
- [ ] Dodać testy endpointów z mockami Clerk, PayU, Blob i SMTP.
- [ ] Dodać Playwright E2E dla rejestracji i onboardingu.
- [ ] Dodać E2E publicznego zamówienia i dashboardu firmy.
- [ ] Dodać E2E zmiany pakietu.
- [ ] Dodać E2E ograniczeń roli handlowca.
- [ ] Dodać test izolacji zamówień pomiędzy dwiema prawdziwymi firmami.
- [ ] Dodać test przekroczenia limitu kont przez bezpośrednie wywołanie API.
- [ ] Dodać automatyczne testy webhooków PayU.
- [ ] Dodać test odtworzenia starego zamówienia po archiwizacji produktu.

### Bezpieczeństwo i operacje

- [ ] Wykonać pełny przegląd zależności i podatności przed wdrożeniem.
- [ ] Skonfigurować monitoring błędów, np. Sentry.
- [ ] Skonfigurować alerty dla błędów PayU i zadań cron.
- [ ] Skonfigurować backup MongoDB Atlas.
- [ ] Ustalić politykę retencji danych klientów i zamówień.
- [ ] Dodać regulamin, politykę prywatności i treść wymaganych zgód.
- [ ] Zweryfikować zgodność procesu z RODO.
- [ ] Dodać rate limiting do publicznego składania zamówień.
- [ ] Dodać ochronę antyspamową lub CAPTCHA.
- [ ] Zweryfikować indeksy i wydajność na większym zbiorze danych.

### Wdrożenie

- [ ] Utworzyć projekt Vercel.
- [ ] Na planie Hobby zostawić cron raz dziennie albo wybrać plan Pro dla cron co 5 minut.
- [ ] Dodać wszystkie zmienne środowiskowe.
- [ ] Podłączyć domenę produkcyjną.
- [ ] Skonfigurować adres webhooka PayU.
- [ ] Wykonać wdrożenie Preview.
- [ ] Przeprowadzić testy akceptacyjne czterech firm testowych.
- [ ] Wykonać testy mobilne i przeglądarkowe.
- [ ] Po akceptacji uruchomić produkcję.

## 14. Zalecana kolejność dalszych prac

1. Skonfigurować MongoDB Atlas i Clerk.
2. Uruchomić onboarding bez płatności na środowisku Preview.
3. Skonfigurować PayU Sandbox i płatności cykliczne.
4. Wykonać pełne testy webhooków i odnowień.
5. Skonfigurować Blob i SMTP Webd.
6. Dodać E2E z testową bazą.
7. Dodać rate limiting, CAPTCHA i monitoring.
8. Przeprowadzić testy czterech pakietów na czterech firmach.
9. Wykonać audyt bezpieczeństwa i zależności.
10. Wdrożyć środowisko produkcyjne.

## 15. Najważniejsze pliki

- `src/domain/plans.ts` — definicje pakietów i ceny.
- `src/domain/entitlements.ts` — centralny resolver uprawnień.
- `src/types/saas.ts` — publiczne kontrakty i typy.
- `src/server/db/models.ts` — modele MongoDB/Mongoose.
- `src/server/services/companyService.ts` — bootstrap i dane firmy.
- `src/server/services/orderService.ts` — tworzenie i walidacja zamówień.
- `src/server/services/subscriptionService.ts` — odnowienia i wygaszanie dostępu.
- `src/server/payu/client.ts` — adapter PayU.
- `src/app/[firma]` — publiczny konfigurator i dashboard.
- `src/app/superadmin` — panel operatora SaaS.
- `src/app/api` — endpointy aplikacji.
- `src/store/configuratorStore.js` — fabryka store konfiguratora.
- `tests/saas.test.ts` — testy pakietów i dostępu.
- `.env.example` — lista wymaganych zmiennych.
- `vercel.json` — konfiguracja cron.
