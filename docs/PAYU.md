# PayU — rejestracja, konfiguracja i testowanie płatności

Integracja obsługuje miesięczną subskrypcję z 7-dniowym trialem i automatycznymi odnowieniami oraz jednorazową płatność za miesiąc lub 6 miesięcy. Domyślnie aplikacja korzysta z PayU Sandbox. Sandbox i produkcja są osobnymi środowiskami z osobnymi kontami, POS-ami i kluczami.

## 1. Rejestracja konta Sandbox

1. Zarejestruj konto na [PayU Sandbox](https://registration-merch-prod.snd.payu.com/).
2. Ustaw hasło z otrzymanej wiadomości i zaloguj się do [panelu Sandbox](https://merch-prod.snd.payu.com/).
3. Otwórz `Płatności elektroniczne` → `Moje sklepy` → `Dodaj sklep`.
4. Podaj publiczny adres aplikacji. Do testów użyj Vercel Preview albo tunelu HTTPS do lokalnego portu 3000.
5. Utwórz punkt płatności typu **REST API (Checkout)**.
6. W szczegółach POS skopiuj: POS ID, OAuth `client_id`, OAuth `client_secret` i drugi klucz `MD5` (Second key).

Własny POS Sandbox jest zalecany. Publiczny POS PayU wystarcza do prostych płatności przekierowanych, ale nie do wiarygodnego testu całego procesu subskrypcji tej aplikacji.

### Funkcje wymagane na POS

Pełny proces miesięcznej subskrypcji wymaga:

- płatności cyklicznych,
- tokenizacji karty typu `MULTI` (token wielokrotnego użycia),
- zamówień na kwotę 0 zł, ponieważ aplikacja weryfikuje kartę przy rozpoczęciu trialu bez obciążenia.

Na nowym POS Sandbox płatności cykliczne mogą aktywować się automatycznie dopiero do około 90 minut od utworzenia. Jeżeli tokenizacja `MULTI` albo zamówienie 0 zł nadal są odrzucane, skontaktuj się ze wsparciem PayU i poproś o aktywację tych funkcji dla konkretnego POS ID.

## 2. Zmienne środowiskowe

Skopiuj `.env.example` do `.env.local` i wpisz dane własnego POS Sandbox:

```dotenv
PAYU_ENV=sandbox
PAYU_CLIENT_ID=twoj_client_id
PAYU_CLIENT_SECRET=twoj_client_secret
PAYU_POS_ID=twoj_pos_id
NEXT_PUBLIC_PAYU_POS_ID=twoj_pos_id
NEXT_PUBLIC_PAYU_ENV=sandbox
PAYU_SECOND_KEY=twoj_drugi_klucz_md5

NEXT_PUBLIC_APP_URL=https://publiczny-adres-aplikacji.example
CRON_SECRET=dlugi-losowy-sekret
```

| Zmienna | Zastosowanie |
| --- | --- |
| `PAYU_CLIENT_ID` | pobranie tokena OAuth po stronie serwera |
| `PAYU_CLIENT_SECRET` | sekret OAuth; nigdy nie może trafić do przeglądarki |
| `PAYU_POS_ID` | POS używany podczas tworzenia zamówienia |
| `NEXT_PUBLIC_PAYU_POS_ID` | ten sam POS używany przez Secure Form |
| `PAYU_SECOND_KEY` | sprawdzanie podpisu webhooka `OpenPayu-Signature` |
| `NEXT_PUBLIC_APP_URL` | baza adresów `continueUrl` i `notifyUrl` |

`PAYU_POS_ID` i `NEXT_PUBLIC_PAYU_POS_ID` muszą wskazywać ten sam POS. Sekretów nie wpisuj do zmiennych `NEXT_PUBLIC_*` ani do repozytorium. Po zmianie zmiennych zrestartuj serwer. Na Vercel wykonaj nowe wdrożenie.

## 3. Webhook PayU

Aplikacja automatycznie przekazuje PayU adres:

```text
https://PUBLICZNY_ADRES/api/payu/notify
```

Powstaje on z `NEXT_PUBLIC_APP_URL`. Webhook musi być dostępny publicznie przez HTTPS; `localhost` i `127.0.0.1` nie są osiągalne z serwerów PayU.

Endpoint weryfikuje podpis za pomocą `PAYU_SECOND_KEY`, zapisuje zdarzenie idempotentnie i aktualizuje płatność oraz subskrypcję. Poprawnie odebrany webhook zwraca HTTP `200`.

## 4. Jak aplikacja rejestruje płatność

Płatności nie dodaje się ręcznie w panelu PayU. Powstaje ona podczas onboardingu:

1. Użytkownik zakłada konto Clerk i otwiera `/onboarding`.
2. Wybiera pakiet i sposób rozliczenia.
3. Aplikacja zapisuje w MongoDB `Payment` ze statusem `PENDING` i unikalnym `extOrderId`.
4. Backend pobiera OAuth i wywołuje `POST /api/v2_1/orders` w PayU.
5. PayU zwraca `orderId` i ewentualny `redirectUri`; przeglądarka przechodzi pod ten adres.
6. Ostateczny status przychodzi webhookiem na `/api/payu/notify`.
7. Płatność pojawia się w `/superadmin/billing`, a firma widzi stan w `/{firma}/dashboard/billing`.

Powrót użytkownika z PayU nie potwierdza zapłaty. Źródłem prawdy jest podpisany webhook.

### Subskrypcja miesięczna

Secure Form przesyła dane karty bezpośrednio do PayU i zwraca aplikacji token oraz maskę karty. Aplikacja nie zapisuje numeru karty ani CVV.

Pierwsze zamówienie ma kwotę `0`, `recurring: FIRST` i token z Secure Form. Po `COMPLETED` subskrypcja przechodzi w `TRIALING`. Po 7 dniach cron pobiera token wielokrotnego użycia i tworzy płatne zamówienie z `recurring: STANDARD`.

### Płatność jednorazowa

Dla miesiąca z góry lub 6 miesięcy aplikacja tworzy zwykłe zamówienie na pełną kwotę. Dostęp aktywuje się dopiero po webhooku `COMPLETED`.

## 5. Test pełnego procesu w Sandbox

Do onboardingu muszą działać także Clerk i MongoDB.

1. Uruchom aplikację pod publicznym adresem HTTPS.
2. Ustaw go w `NEXT_PUBLIC_APP_URL` bez końcowego ukośnika.
3. Zarejestruj nowego użytkownika aplikacji.
4. Otwórz `/onboarding` i utwórz firmę z unikalnym slugiem.
5. Najpierw wybierz jednorazową płatność za miesiąc.
6. Na stronie PayU użyj karty testowej i dokończ 3DS, jeśli zostanie wyświetlony.
7. Sprawdź transakcję w panelu PayU Sandbox.
8. Sprawdź `/superadmin/billing`: `PENDING` powinien zmienić się na `COMPLETED`.
9. Sprawdź status `ACTIVE` oraz datę końca okresu subskrypcji.
10. Powtórz dla przedpłaty 6-miesięcznej.
11. Na końcu przetestuj miesięczny trial 0 zł i zapisaną kartę.

### Przykładowe karty Sandbox

| Scenariusz | Numer | Ważność | CVV | Wynik |
| --- | --- | --- | --- | --- |
| pozytywna autoryzacja | `4444333322221111` | `12/29` | `123` | sukces |
| negatywna autoryzacja | `5000105018126595` | `12/29` | `123` | odrzucenie |
| pozytywny challenge 3DS | `4245757666349685` | `12/29` | `123` | sukces po 3DS |

Kart z „domyślnym” wynikiem 3DS PayU nie pozwala używać do zapisania tokena z powodu SCA/PSD2. Do testu subskrypcji użyj karty obsługującej jawny scenariusz 3DS, np. testowego challenge, i sprawdź aktualną tabelę kart w dokumentacji PayU.

## 6. Test automatycznego odnowienia

Cron z `vercel.json` działa co 5 minut:

```text
GET /api/cron/subscriptions
Authorization: Bearer CRON_SECRET
```

Nie trzeba czekać 7 dni. W testowej bazie ustaw dla subskrypcji:

- `status: "TRIALING"`,
- `billingMode: "RECURRING_MONTHLY"`,
- `trialEndsAt` na datę z przeszłości,
- `cancelAtPeriodEnd: false`.

Następnie wywołaj cron:

```powershell
$headers = @{ Authorization = "Bearer $env:CRON_SECRET" }
Invoke-RestMethod -Method Get -Uri "https://PUBLICZNY_ADRES/api/cron/subscriptions" -Headers $headers
```

Oczekiwany przebieg:

- powstaje `BillingAttempt`,
- aplikacja pobiera aktywny token z PayU,
- powstaje `Payment` z prefiksem `REN-`,
- PayU otrzymuje `recurring: STANDARD`,
- webhook `COMPLETED` ustawia `ACTIVE` i przesuwa okres o miesiąc.

Unikalny `attemptKey` chroni przed drugim obciążeniem za ten sam termin.

## 7. Scenariusze do sprawdzenia

- jednorazowa płatność `COMPLETED`,
- płatność odrzucona lub `CANCELED`,
- tokenizacja i zamówienie 0 zł,
- challenge 3DS pierwszej płatności,
- pierwsze odnowienie po trialu (`STANDARD`),
- kolejne odnowienie aktywnej subskrypcji,
- webhook wysłany drugi raz — bez podwójnej zmiany danych,
- webhook z niepoprawnym podpisem — HTTP `401`,
- wygaśnięcie przedpłaty,
- anulowanie subskrypcji na koniec okresu.

## 8. Najczęstsze problemy

| Objaw | Prawdopodobna przyczyna |
| --- | --- |
| `PAYU_NOT_CONFIGURED` | brakuje zmiennej serwerowej PayU |
| Secure Form się nie ładuje | błędny `NEXT_PUBLIC_PAYU_POS_ID`, zły tryb środowiska lub blokada skryptu |
| tokenizacja `MULTI` jest odrzucana | funkcja nie jest aktywna na POS |
| trial 0 zł jest odrzucany | POS nie ma włączonych zamówień zerokwotowych |
| webhook nie dochodzi | `NEXT_PUBLIC_APP_URL` wskazuje localhost lub nieaktualny deployment |
| webhook zwraca `401` | `PAYU_SECOND_KEY` nie odpowiada użytemu POS |
| subskrypcja pozostaje `ONBOARDING` | brak webhooka `COMPLETED` albo nie znaleziono `extOrderId` |
| `ACTIVE_PAYU_TOKEN_MISSING` | pierwsza płatność nie utworzyła aktywnego tokena `TOKC_` |
| cron zwraca `401` | brak `CRON_SECRET` albo zły nagłówek `Authorization` |

## 9. Przejście na produkcję

1. Zarejestruj osobne [konto produkcyjne PayU](https://poland.payu.com/).
2. Zakończ weryfikację firmy, zaakceptuj umowę i wykonaj przelew aktywacyjny.
3. Utwórz sklep i POS REST API dla domeny produkcyjnej.
4. Poproś PayU o płatności cykliczne, tokenizację `MULTI` i zamówienia 0 zł.
5. W Vercel ustaw produkcyjne klucze oraz:

```dotenv
PAYU_ENV=production
NEXT_PUBLIC_PAYU_ENV=production
NEXT_PUBLIC_APP_URL=https://twoja-domena.pl
```

6. Wykonaj transakcję weryfikacyjną zgodnie z instrukcją PayU.
7. Powtórz test webhooka, statusów, 3DS i odnowienia na małej kontrolowanej płatności.

Nie mieszaj kluczy Sandbox i Production. Wszystkie identyfikatory i klucze muszą pochodzić z tego samego POS.

## Dokumentacja PayU

- [Rejestracja konta](https://developers.payu.com/europe/pl/docs/get-started/set-up-account/register/)
- [Panel, sklep i POS](https://developers.payu.com/europe/pl/docs/get-started/set-up-account/management-panel/)
- [Sandbox i karty testowe](https://developers.payu.com/europe/pl/docs/testing/sandbox/)
- [Secure Form](https://developers.payu.com/europe/docs/checkout/secure-form/)
- [Tokenizacja kart](https://developers.payu.com/europe/pl/docs/payment-solutions/cards/tokenization/)
- [Płatności cykliczne](https://developers.payu.com/europe/pl/docs/payment-solutions/cards/recurring/)
- [REST API](https://developers.payu.com/europe/api/)
