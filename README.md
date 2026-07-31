# Warstwowe3D SaaS

Wielofirmowa aplikacja SaaS oparta na Next.js 16. Istniejący konfigurator React Three Fiber działa jako silnik 3D, a warstwa serwerowa zapewnia firmy, pakiety, katalog, zamówienia, PayU, Clerk i panele administracyjne.

## Uruchomienie lokalne

```bash
npm install
copy .env.example .env.local
npm run dev
```

Bez zewnętrznych usług dostępny jest tryb demonstracyjny:

- `/` — strona SaaS i cennik,
- `/demo` — konfigurator Diamond,
- `/api/public/companies/demo/bootstrap` — przykładowy bootstrap.

Pełny onboarding i dashboard wymagają uzupełnienia `.env.local`.

## Usługi

- MongoDB Atlas: `MONGODB_URI`, `MONGODB_DB`
- Clerk: klucze API oraz adresy `/logowanie` i `/rejestracja` z `.env.example`
- Superadmin: lista identyfikatorów Clerk w `CLERK_SUPERADMIN_USER_IDS`
- PayU: dane POS, OAuth i drugi klucz do podpisów webhooków
- Vercel Blob: `BLOB_READ_WRITE_TOKEN`
- Resend: `RESEND_API_KEY`, `MAIL_FROM`
- Cron: `CRON_SECRET`

PayU działa domyślnie w Sandbox. Płatności cykliczne i tokenizacja muszą być aktywowane na punkcie płatności przed testami pełnego procesu. Harmonogram odnawiania jest ustawiony na 5 minut w `vercel.json`, co na produkcji wymaga planu Vercel obsługującego taką częstotliwość.

Pełna instrukcja konfiguracji konta, POS, webhooków i testów: [`docs/PAYU.md`](docs/PAYU.md).

## Routing

- `/[firma]` — publiczny konfigurator firmy
- `/[firma]/dashboard` — panel firmy
- `/[firma]/dashboard/orders` — CRM zamówień
- `/[firma]/dashboard/settings` — szkic i publikacja ustawień
- `/[firma]/dashboard/catalog` — katalog dostępny firmie
- `/[firma]/dashboard/team` — konta Clerk Organization
- `/[firma]/dashboard/billing` — pakiet i płatności
- `/[firma]/dashboard/audit` — dziennik aktywności
- `/superadmin` — centrum właściciela SaaS

## Weryfikacja

```bash
npm test
npm run build
```

Testy obejmują dotychczasową geometrię, wypusty, materiały, konstrukcję i oświetlenie oraz macierz pakietów, ceny, wygasanie dostępu i nadpisania funkcji.
