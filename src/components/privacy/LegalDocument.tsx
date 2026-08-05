import Link from "next/link";
import { ArrowLeft, Layers3 } from "lucide-react";

export function LegalDocument({
  eyebrow,
  title,
  lead,
  backHref = "/",
  backLabel = "Wróć do Warstwowe3D",
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link className="legal-brand" href="/" aria-label="Warstwowe3D — strona główna">
          <span><Layers3 size={20} /></span>
          Warstwowe<strong>3D</strong>
        </Link>
        <Link className="legal-back" href={backHref}><ArrowLeft size={15} /> {backLabel}</Link>
      </header>
      <article className="legal-document">
        <div className="legal-hero">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
          <p>{lead}</p>
        </div>
        <div className="legal-content">{children}</div>
      </article>
      <footer className="legal-footer">
        <span>© {new Date().getFullYear()} BruteCode Jarosław Matusiak</span>
        <nav aria-label="Dokumenty prawne">
          <Link href="/polityka-prywatnosci">Prywatność</Link>
          <Link href="/polityka-cookies">Cookies</Link>
          <button type="button" data-open-consent-settings="true">Ustawienia cookies</button>
        </nav>
      </footer>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return <section className="legal-section"><h2>{title}</h2>{children}</section>;
}
