import type { MetadataRoute } from "next";
import { applicationUrl } from "@/lib/siteUrl";

/**
 * Mapa strony obejmuje wyłącznie trasy publiczne.
 *
 * Przestrzenie firm (/{firma}) świadomie pominięte: konfigurator bywa chroniony
 * kodem dostępu albo limitem czasu, a katalog i cennik należą do klienta — nie
 * chcemy ich indeksować bez jego zgody.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = applicationUrl();
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/rejestracja`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/logowanie`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/polityka-prywatnosci`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/polityka-cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
}
