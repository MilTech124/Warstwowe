"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Expand,
  Hand,
  MousePointer2,
  Rotate3D,
  X,
} from "lucide-react";

type HeroConfiguratorDemoProps = {
  compact?: boolean;
};

export function HeroConfiguratorDemo({ compact = false }: HeroConfiguratorDemoProps) {
  const [interactive, setInteractive] = useState(compact);

  return (
    <div className={`pm-product-live ${compact ? "is-compact" : ""} ${interactive ? "is-interactive" : ""}`.trim()}>
      <iframe
        src="/demo"
        title="Interaktywny konfigurator Warstwowe3D"
        loading={compact ? "lazy" : "eager"}
        tabIndex={interactive ? 0 : -1}
        aria-hidden={!interactive}
      />

      {!interactive && (
        <button
          className="pm-demo-activation"
          type="button"
          onClick={() => setInteractive(true)}
          aria-label="Włącz interaktywny konfigurator w podglądzie"
        >
          <span className="pm-demo-activation-icon">
            <MousePointer2 size={20} />
          </span>
          <span>
            <strong>Kliknij i konfiguruj</strong>
            <small>Zmieniaj wymiary, kolory i obracaj model 3D</small>
          </span>
          <ArrowRight size={17} />
        </button>
      )}

      {interactive && !compact && (
        <>
          <div className="pm-demo-active-bar" role="status">
            <span>
              <i />
              Tryb interaktywny
            </span>
            <span className="pm-demo-active-hint">
              <Hand size={13} />
              Przeciągnij model lub wybierz opcję
            </span>
            <button
              type="button"
              onClick={() => setInteractive(false)}
              aria-label="Wyłącz sterowanie konfiguratora"
            >
              <X size={15} />
              Zakończ
            </button>
          </div>

          <div className="pm-demo-corner-hint" aria-hidden="true">
            <Rotate3D size={15} />
            Sterowanie 3D aktywne
          </div>
        </>
      )}

      <Link className="pm-preview-open" href="/demo">
        <Expand size={14} />
        Pełny konfigurator
      </Link>
    </div>
  );
}
