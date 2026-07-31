import "./globals.css";
import "./saas.css";
import { Providers } from "./providers";

export const metadata = {
  title: {
    default: "Warstwowe3D — konfigurator 3D dla producentów",
    template: "%s | Warstwowe3D",
  },
  description:
    "Wielofirmowy konfigurator obiektów z płyt warstwowych z zamówieniami i panelem sprzedaży.",
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
