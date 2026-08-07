import type { MetadataRoute } from "next";
import { applicationUrl } from "@/lib/siteUrl";

export default function robots(): MetadataRoute.Robots {
  const base = applicationUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Panele, API i trasy wymagające logowania nie mają czego szukać w indeksie.
        disallow: ["/api/", "/panel", "/superadmin", "/onboarding", "/demo/dashboard"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
