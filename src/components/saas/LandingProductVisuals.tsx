import {
  BarChart3,
  Check,
  CircleUserRound,
  FileCheck2,
  FileText,
  Layers3,
  PackageCheck,
  Palette,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

export function ConfiguratorCardVisual() {
  return (
    <div className="lpv-configurator lpv-configurator-process" aria-hidden="true">
      <div className="lpv-window-top">
        <span className="lpv-window-brand"><Layers3 size={12} /> STALPROJEKT</span>
        <span className="lpv-live"><i /> Konfigurator online</span>
      </div>
      <div className="lpv-process-flow">
        <article>
          <span><Layers3 size={14} /></span>
          <small>01 · PARAMETRY</small>
          <strong>Wymiary i bryła</strong>
          <em>6,0 × 6,0 × 2,8 m</em>
        </article>
        <i aria-hidden="true" />
        <article>
          <span><Palette size={14} /></span>
          <small>02 · WYGLĄD</small>
          <strong>Materiały i kolory</strong>
          <em>Podgląd aktualizowany</em>
        </article>
        <i aria-hidden="true" />
        <article>
          <span><Send size={14} /></span>
          <small>03 · ZAPYTANIE</small>
          <strong>Kompletna konfiguracja</strong>
          <em>Gotowa dla handlowca</em>
        </article>
      </div>
      <div className="lpv-process-status"><Check size={12} /> Jeden spójny proces bez przepisywania danych</div>
    </div>
  );
}

export function CatalogControlVisual() {
  return (
    <div className="lpv-catalog" aria-hidden="true">
      <div className="lpv-small-head">
        <span><Palette size={12} /> Katalog oferty</span>
        <em><i /> Opublikowany</em>
      </div>
      <div className="lpv-catalog-summary">
        <span><small>PRODUCENCI</small><strong>4</strong></span>
        <span><small>PRODUKTY</small><strong>28</strong></span>
        <span><small>KOLORY</small><strong>16</strong></span>
      </div>
      <div className="lpv-catalog-list">
        <span>
          <i className="lpv-product-swatch steel" />
          <b>SteelProfil</b>
          <small>12 płyt</small>
          <em className="on"><i /></em>
        </span>
        <span>
          <i className="lpv-product-swatch oak" />
          <b>Golden Oak</b>
          <small>RAL + Wood</small>
          <em className="on"><i /></em>
        </span>
        <span>
          <i className="lpv-product-swatch gate" />
          <b>WIŚNIOWSKI</b>
          <small>8 bram</small>
          <em className="on"><i /></em>
        </span>
      </div>
      <div className="lpv-publish-row">
        <span>Wersja 12 · zapisano 2 min temu</span>
        <b><Check size={10} /> Oferta aktualna</b>
      </div>
    </div>
  );
}

export function SalesPipelineVisual() {
  const bars = [36, 54, 44, 68, 57, 82, 70, 92, 78, 100];

  return (
    <div className="lpv-sales" aria-hidden="true">
      <div className="lpv-small-head">
        <span><BarChart3 size={12} /> Zapytania</span>
        <em>OSTATNIE 30 DNI</em>
      </div>
      <div className="lpv-sales-kpi">
        <div><small>WSZYSTKIE</small><strong>128</strong></div>
        <span><i>+28%</i> vs poprzedni miesiąc</span>
      </div>
      <div className="lpv-sales-chart">
        {bars.map((height, index) => (
          <i key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
      <div className="lpv-latest-order">
        <span className="lpv-order-avatar">MN</span>
        <span><b>STP/2026/0128</b><small>Marek Nowak · 6 × 8 m</small></span>
        <em>NOWE</em>
      </div>
    </div>
  );
}

export function TenantWorkspaceVisual() {
  return (
    <div className="lpv-tenant" aria-hidden="true">
      <aside>
        <span className="lpv-tenant-brand"><Layers3 size={13} /> STALPROJEKT</span>
        <nav>
          <span className="active"><BarChart3 size={11} /> Pulpit</span>
          <span><FileText size={11} /> Zamówienia <b>18</b></span>
          <span><PackageCheck size={11} /> Katalog</span>
          <span><UsersRound size={11} /> Zespół</span>
        </nav>
        <small>Pakiet DIAMOND</small>
      </aside>
      <main>
        <div className="lpv-tenant-head">
          <span><small>WTOREK, 30 LIPCA</small><strong>Dzień dobry, Anna</strong></span>
          <i className="lpv-avatar">AK</i>
        </div>
        <div className="lpv-tenant-metrics">
          <span><small>NOWE ZAPYTANIA</small><strong>18</strong><em>+12%</em></span>
          <span><small>DO WYCENY</small><strong>7</strong><em>3 pilne</em></span>
          <span><small>KONWERSJA</small><strong>34%</strong><em>+4,8%</em></span>
        </div>
        <div className="lpv-tenant-table">
          <header><span>OSTATNIE ZAMÓWIENIA</span><b>Zobacz wszystkie</b></header>
          <div><i className="new" /><span><b>STP/2026/0128</b><small>Marek Nowak</small></span><em>6 × 8 m</em><strong>NOWE</strong></div>
          <div><i className="quoted" /><span><b>STP/2026/0127</b><small>Dom-Bud Sp. z o.o.</small></span><em>8 × 10 m</em><strong>WYCENIONE</strong></div>
          <div><i className="accepted" /><span><b>STP/2026/0126</b><small>Karol Wiśniewski</small></span><em>5 × 6 m</em><strong>PRZYJĘTE</strong></div>
        </div>
      </main>
    </div>
  );
}

export function PdfSnapshotVisual() {
  return (
    <div className="lpv-compact-visual lpv-pdf" aria-hidden="true">
      <div className="lpv-pdf-page">
        <span className="lpv-pdf-brand"><Layers3 size={8} /> STALPROJEKT</span>
        <div className="lpv-pdf-garage"><i /><b /><em /></div>
        <span className="lpv-pdf-lines" />
        <small>STP/2026/0128</small>
      </div>
      <span className="lpv-compact-badge"><FileCheck2 size={11} /> PDF gotowy</span>
    </div>
  );
}

export function TeamRolesVisual() {
  return (
    <div className="lpv-compact-visual lpv-team" aria-hidden="true">
      <div className="lpv-team-stack">
        <span><i>AK</i><b>Anna Kowalska</b><em>Właściciel</em></span>
        <span><i>PM</i><b>Piotr Maj</b><em>Admin</em></span>
        <span><i>MK</i><b>Monika K.</b><em>Handlowiec</em></span>
      </div>
      <span className="lpv-compact-badge"><ShieldCheck size={11} /> Role aktywne</span>
    </div>
  );
}

export function WorkflowDataVisual() {
  return (
    <div className="lpv-workflow-data" aria-hidden="true">
      <div className="lpv-flow-card lpv-flow-config">
        <span><Sparkles size={11} /> KONFIGURACJA 3D</span>
        <strong>Garaż 6 × 8 m</strong>
        <small>Dwuspadowy · 2 bramy · RAL 7016</small>
      </div>
      <span className="lpv-flow-line"><i /></span>
      <div className="lpv-flow-card lpv-flow-order">
        <span><Send size={11} /> NOWE ZAPYTANIE</span>
        <strong>STP/2026/0128</strong>
        <small>Komplet danych trafił do handlowca</small>
      </div>
      <div className="lpv-flow-avatars">
        <CircleUserRound size={17} />
        <span>Anna dostała powiadomienie</span>
      </div>
    </div>
  );
}
