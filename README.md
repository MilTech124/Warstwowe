# Warstwowe3D SaaS

Wielofirmowa aplikacja SaaS oparta na Next.js 16. Istniejący konfigurator React Three Fiber działa jako silnik 3D, a warstwa serwerowa zapewnia firmy, pakiety, katalog, zamówienia, Stripe Billing, Clerk i panele administracyjne.

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
- Stripe: klucz serwerowy i sekret podpisu webhooka
- Vercel Blob: `BLOB_READ_WRITE_TOKEN`
- Webd SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`
- Cron: `CRON_SECRET`

Płatności uruchamiaj najpierw z kluczem `sk_test_...`. Stripe Billing obsługuje odnowienia i ponowienia płatności, a codzienny harmonogram w `vercel.json` zajmuje się wyłącznie lokalnym wygaszaniem przedpłat.

Pełna instrukcja konfiguracji Checkout, Billing, Customer Portal, webhooków i testów: [`docs/STRIPE.md`](docs/STRIPE.md).

## Routing

- `/[firma]` — publiczny konfigurator firmy
- `/[firma]/dashboard` — panel firmy
- `/[firma]/dashboard/orders` — CRM zamówień
- `/[firma]/dashboard/settings` — szkic i publikacja ustawień
- `/[firma]/dashboard/catalog` — katalog dostępny firmie
- `/[firma]/dashboard/team` — pracownicy firmy powiązani wspólnym `companyId`
- `/[firma]/dashboard/billing` — pakiet i płatności
- `/[firma]/dashboard/audit` — dziennik aktywności
- `/panel` — automatyczne wejście do istniejącej firmy lub panelu superadmina
- `/superadmin` — centrum właściciela SaaS

## Weryfikacja

```bash
npm test
npm run build
```

Testy obejmują dotychczasową geometrię, wypusty, materiały, konstrukcję i oświetlenie oraz macierz pakietów, ceny, wygasanie dostępu i nadpisania funkcji.
