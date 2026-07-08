import "./globals.css";

export const metadata = {
  title: "Konfigurator garazy warstwowych",
  description: "Konfigurator obiektow z plyt warstwowych dla wielu firm.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  );
}
