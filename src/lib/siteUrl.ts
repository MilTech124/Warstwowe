/**
 * Publiczny adres aplikacji.
 *
 * Wyciągnięte z server/stripe/client.ts, bo metadane, sitemap i robots potrzebują
 * tej samej wartości, a nie mogą ciągnąć za sobą SDK Stripe do warstwy renderowania.
 * Stripe re-eksportuje tę funkcję, więc dotychczasowi importerzy działają bez zmian.
 */
export function applicationUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const configuredIsLocal = configured
    ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)
    : false;
  const isVercelProduction = process.env.VERCEL_ENV === "production";

  if (configured && !(isVercelProduction && configuredIsLocal)) return configured;
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return configured || "http://127.0.0.1:3000";
}

/** Ten sam adres jako URL — `metadataBase` w Next.js wymaga obiektu URL. */
export function siteUrl() {
  return new URL(applicationUrl());
}
