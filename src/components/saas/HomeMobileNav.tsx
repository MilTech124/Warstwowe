"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

type NavLink = { href: string; label: string };

/**
 * Menu mobilne strony głównej.
 *
 * Wariant czysto-CSS (<details> albo checkbox) tu nie działa: linki są kotwicami,
 * a nawigacja hashem nie wywołuje zmiany trasy — panel zostałby otwarty nad sekcją,
 * do której użytkownik właśnie skoczył. Stąd komponent kliencki z jawnym zamknięciem.
 */
export function HomeMobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        className="w3-burger"
        type="button"
        aria-expanded={open}
        aria-controls="w3-mobile-nav"
        aria-label={open ? "Zamknij menu" : "Otwórz menu"}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open ? (
        <button
          className="w3-nav-backdrop"
          type="button"
          aria-label="Zamknij menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div id="w3-mobile-nav" className="w3-mobile-nav" hidden={!open}>
        {links.map((link) => (
          <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
            {link.label}
          </Link>
        ))}
        <Link href="/rejestracja" onClick={() => setOpen(false)}>
          Załóż firmę
        </Link>
        <Link href="/logowanie" onClick={() => setOpen(false)}>
          Zaloguj się
        </Link>
      </div>
    </>
  );
}
