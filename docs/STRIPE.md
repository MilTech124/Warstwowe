# Stripe — konfiguracja i testowanie płatności

Integracja wykorzystuje hostowany Stripe Checkout, Stripe Billing, Customer Portal i podpisane webhooki. Obsługuje miesięczną subskrypcję z 7-dniowym trialem oraz jednorazowy dostęp na 1 lub 6 miesięcy. Aplikacja nie otrzymuje numeru karty ani CVC.

## Konfiguracja

1. Utwórz konto Stripe i włącz tryb testowy.
2. Ustaw branding, e-maile do klientów, Customer Portal oraz Smart Retries w Dashboardzie Stripe.
3. Dodaj zmienne środowiskowe:

```dotenv
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_APP_URL=https://publiczny-adres-aplikacji.example
CRON_SECRET=dlugi-losowy-sekret
```

Klucze `sk_*` i `whsec_*` są wyłącznie serwerowe. Aplikacja rozpoznaje tryb test/live po kluczu i przechowuje osobne identyfikatory produktów oraz cen dla obu środowisk.

## Webhook

Publiczny endpoint:

```text
POST https://PUBLICZNY_ADRES/api/stripe/webhook
```

Zarejestruj zdarzenia:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `charge.refunded`

Endpoint weryfikuje `Stripe-Signature` na surowym body, zapisuje `event.id` idempotentnie i dopiero wtedy aktualizuje płatność oraz dostęp firmy. Powrót przeglądarki z Checkout przyspiesza uzgodnienie, lecz źródłem prawdy pozostaje webhook.

## Checkout i Billing

- Subskrypcja: `mode=subscription`, metoda płatności jest zbierana od razu, a pierwsze obciążenie następuje po 7 dniach.
- Przedpłata: `mode=payment`, Stripe tworzy fakturę, zbiera adres rozliczeniowy i NIP.
- Każda publikacja planu tworzy nową, niezmienną wersję cen Stripe. Obecne subskrypcje pozostają na starej cenie.
- Zmiana planu podczas trialu obowiązuje od razu. Dla aktywnej subskrypcji Stripe Subscription Schedule zmienia cenę od kolejnego okresu.
- Karta, faktury, dane firmy i anulowanie są zarządzane w Stripe Customer Portal.
- Stripe obsługuje odnowienia i Smart Retries. Cron aplikacji wyłącznie wygasza lub przesuwa lokalne przedpłaty.

## Testy lokalne

Uruchom aplikację oraz Stripe CLI:

```powershell
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
npm run dev
```

Skopiuj sekret `whsec_...` wypisany przez CLI do `.env.local`. W Checkout użyj kart testowych Stripe:

- `4242 4242 4242 4242` — sukces,
- `4000 0025 0000 3155` — wymagane 3DS,
- `4000 0000 0000 9995` — odrzucenie.

Użyj dowolnej przyszłej daty i dowolnego trzycyfrowego CVC. Sprawdź kolejno trial, pierwszą fakturę, odnowienie, Smart Retry, zmianę karty, anulowanie, przedpłaty oraz zwrot. Do przyspieszania cykli subskrypcji użyj Stripe Test Clocks.

## Produkcja

1. Zakończ weryfikację konta Stripe i skonfiguruj rachunek wypłat.
2. Zweryfikuj branding, numerację i dane podatkowe dokumentów.
3. Skonfiguruj Customer Portal, e-maile o fakturach, trialu i nieudanych płatnościach.
4. Utwórz produkcyjny webhook i ustaw jego `whsec_...`.
5. Ustaw `STRIPE_SECRET_KEY=sk_live_...` oraz produkcyjny `NEXT_PUBLIC_APP_URL`.
6. Wykonaj kontrolowaną płatność i sprawdź Checkout, webhook, fakturę, portal i dostęp firmy.

Automatyczny Stripe Tax nie jest włączany przez kod. Ceny są przekazywane jako kwoty brutto z `tax_behavior=inclusive`; zgodność dokumentów z wymaganiami księgowymi należy zatwierdzić przed uruchomieniem produkcyjnym.
