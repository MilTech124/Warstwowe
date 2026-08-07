import "./globals.css";
import "./saas.css";
import { Providers } from "./providers";
import { siteUrl } from "@/lib/siteUrl";

export const metadata = {
  // metadataBase pozwala podawać canonical i og:url ścieżkami względnymi
  // w poszczególnych stronach — bez niego Next ostrzega i pomija og:image.
  metadataBase: siteUrl(),
  title: {
    default: "Warstwowe3D — konfigurator 3D hal i garaży z płyty warstwowej",
    template: "%s | Warstwowe3D",
  },
  description:
    "Konfigurator 3D dla firm budujących hale i garaże z płyty warstwowej. Własny adres i marka, " +
    "dobór konstrukcji stalowej, zestawienie materiałów i oferta PDF z wyceną z Twojego cennika.",
  applicationName: "Warstwowe3D",
  authors: [{ name: "Warstwowe3D" }],
  creator: "Warstwowe3D",
  publisher: "Warstwowe3D",
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export const viewport = {
  themeColor: "#0a0c0d",
  colorScheme: "dark light",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
