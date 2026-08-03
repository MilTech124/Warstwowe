import Link from "next/link";

/**
 * Lives at the [firma] level, not inside dashboard/: the dashboard layout calls
 * notFound() after an await, so the throw comes from the layout itself and a
 * boundary nested below it would never catch it.
 */
export default function CompanyNotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-lg place-content-center gap-4 px-6 text-center">
      <span className="text-[11px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
        Błąd 404
      </span>
      <h1 className="text-3xl font-bold tracking-tight">Nie znaleziono tej firmy</h1>
      <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
        Adres jest nieprawidłowy albo nie masz dostępu do tego panelu. Sprawdź link lub zaloguj się
        na właściwe konto.
      </p>
      <div className="mt-2 flex justify-center gap-3">
        <Link
          href="/panel"
          className="inline-flex h-10 items-center rounded-lg bg-[#087f72] px-4 text-sm font-semibold text-white"
        >
          Przejdź do panelu
        </Link>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-lg border border-[#dfe6e3] px-4 text-sm font-semibold"
        >
          Strona główna
        </Link>
      </div>
    </main>
  );
}
