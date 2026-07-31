import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  Check,
  CirclePlay,
  FileText,
  Gauge,
  Layers3,
  LockKeyhole,
  MousePointer2,
  Palette,
  PanelTop,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  UsersRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { getAvailablePlans } from "@/server/services/planService";
import { ClerkMarketingActions } from "@/components/auth/ClerkMarketingActions";
import { HeroProductVideo } from "@/components/saas/HeroProductVideo";
import { LazyProductVideo } from "@/components/saas/LazyProductVideo";
import {
  CatalogControlVisual,
  ConfiguratorCardVisual,
  PdfSnapshotVisual,
  SalesPipelineVisual,
  TeamRolesVisual,
  TenantWorkspaceVisual,
  WorkflowDataVisual,
} from "@/components/saas/LandingProductVisuals";
import "./marketing-premium.css";
import "./landing-product-visuals.css";

const planContent: Record<string, { description: string; features: string[] }> = {
  STANDARD: {
    description: "Solidny start sprzedaży online dla mniejszego zespołu.",
    features: [
      "Konfigurator 3D pod Twoją marką",
      "Zamówienia i podstawowy CRM",
      "Własne kolory, presety i producenci",
      "Obróbki i orynnowanie",
      "1 konto pracownika",
    ],
  },
  GOLD: {
    description: "Więcej narzędzi do pozyskiwania i obsługi zapytań.",
    features: [
      "Wszystko z pakietu Standard",
      "Wypusty frontowe",
      "Analityka zamówień",
      "Eksport CSV i powiadomienia",
      "3 konta pracowników",
    ],
  },
  PLATINUM: {
    description: "Dla firm, które sprzedają także techniczną stroną produktu.",
    features: [
      "Wszystko z pakietu Gold",
      "Widok konstrukcji stalowej",
      "Dane techniczne obiektu",
      "Zaawansowany podgląd oferty",
      "5 kont pracowników",
    ],
  },
  DIAMOND: {
    description: "Pełne doświadczenie premium od prezentacji po dokument PDF.",
    features: [
      "Wszystko z pakietu Platinum",
      "Animacje bram i oświetlenie",
      "Brandowany PDF zamówienia",
      "Najpełniejsza prezentacja 3D",
      "10 kont pracowników",
    ],
  },
};

const workflow = [
  {
    number: "01",
    title: "Ustawiasz własną ofertę",
    description: "Wybierasz presety, kolory, producentów i dostępne warianty produktu.",
  },
  {
    number: "02",
    title: "Klient projektuje online",
    description: "Konfigurator działa pod adresem /twoja-firma i prowadzi klienta krok po kroku.",
  },
  {
    number: "03",
    title: "Zespół domyka sprzedaż",
    description: "Kompletne zapytanie trafia do panelu wraz ze snapshotem 3D i danymi klienta.",
  },
];

export const revalidate = 60;

export default async function HomePage() {
  const plans = await getAvailablePlans();

  return (
    <main className="pm-page premium-marketing">
      <header className="pm-header">
        <nav className="pm-nav" aria-label="Główna nawigacja">
          <Link className="pm-brand" href="/" aria-label="Warstwowe3D — strona główna">
            <span className="pm-brand-mark"><Layers3 size={21} strokeWidth={2.2} /></span>
            <span className="pm-brand-name">Warstwowe<span>3D</span></span>
          </Link>

          <div className="pm-nav-links">
            <Link href="#mozliwosci">Możliwości</Link>
            <Link href="#platforma">Platforma</Link>
            <Link href="#jak-to-dziala">Jak to działa</Link>
            <Link href="#cennik">Cennik</Link>
          </div>

          <div className="pm-nav-actions">
            <Link className="pm-nav-demo" href="/demo">Demo 3D</Link>
            <ClerkMarketingActions />
          </div>
        </nav>
      </header>

      <section className="pm-hero">
        <div className="pm-hero-ambient" aria-hidden="true" />
        <div className="pm-container pm-hero-grid">
          <div className="pm-hero-copy">
            <div className="pm-eyebrow">
              <span><Sparkles size={14} /></span>
              System sprzedaży dla branży płyt warstwowych
            </div>
            <h1>
              Zamień konfigurator 3D w
              <span> skutecznego handlowca.</span>
            </h1>
            <p className="pm-hero-lead">
              Daj klientom swobodę projektowania, a zespołowi kompletne zapytania gotowe
              do wyceny. Wszystko pod marką Twojej firmy i w jednym panelu.
            </p>
            <div className="pm-hero-actions">
              <Link className="pm-button pm-button-primary pm-button-lg" href="/rejestracja">
                Rozpocznij 7-dniowy trial <ArrowRight size={18} />
              </Link>
              <Link className="pm-button pm-button-ghost pm-button-lg" href="/demo">
                <CirclePlay size={18} /> Zobacz konfigurator
              </Link>
            </div>
            <div className="pm-hero-proof" aria-label="Najważniejsze korzyści">
              <span><BadgeCheck size={16} /> Bez wdrożenia IT</span>
              <span><ShieldCheck size={16} /> Bezpieczne płatności PayU</span>
              <span><Zap size={16} /> Start w kilka minut</span>
            </div>
          </div>

          <div className="pm-product-stage">
            <div className="pm-product-caption pm-product-caption-top">
              <span className="pm-status-dot" />
              Konfigurator aktywny
            </div>
            <div className="pm-product-window">
              <div className="pm-browser-bar">
                <span className="pm-browser-dots" aria-hidden="true"><i /><i /><i /></span>
                <span className="pm-browser-address">
                  <LockKeyhole size={11} />
                  warstwowe3d.pl/twoja-firma
                </span>
                <span className="pm-browser-live">LIVE</span>
              </div>
              <HeroProductVideo />
            </div>
            <div className="pm-product-caption pm-product-caption-bottom">
              <span className="pm-caption-icon"><MousePointer2 size={16} /></span>
              <span><strong>Gotowe zapytanie</strong><small>z pełną konfiguracją 3D</small></span>
              <Check size={16} />
            </div>
          </div>
        </div>
      </section>

      <section className="pm-proof-strip" aria-label="Platforma w liczbach">
        <div className="pm-container pm-proof-grid">
          <div><strong>1</strong><span>panel dla całej sprzedaży</span></div>
          <div><strong>24/7</strong><span>konfigurator dostępny dla klientów</span></div>
          <div><strong>4</strong><span>pakiety dopasowane do skali firmy</span></div>
          <div><strong>100%</strong><span>oferty pod Twoją marką</span></div>
        </div>
      </section>

      <section className="pm-section pm-capabilities" id="mozliwosci">
        <div className="pm-container">
          <div className="pm-section-heading pm-section-heading-split">
            <div>
              <span className="pm-section-kicker">Jedna platforma</span>
              <h2>Od pierwszego kliknięcia klienta do gotowej oferty.</h2>
            </div>
            <p>
              Konfigurator, zarządzanie katalogiem i obsługa zapytań działają razem.
              Bez ręcznego przepisywania danych i bez chaosu między narzędziami.
            </p>
          </div>

          <div className="pm-bento">
            <article className="pm-bento-card pm-bento-main">
              <div className="pm-card-icon pm-icon-violet"><WandSparkles size={22} /></div>
              <div className="pm-bento-copy">
                <span>Konfigurator 3D</span>
                <h3>Produkt, który klient rozumie od razu.</h3>
                <p>
                  Wymiary, dach, bramy, okna, kolory, obróbki i dodatki w czytelnym
                  procesie z natychmiastowym podglądem.
                </p>
              </div>
              <ConfiguratorCardVisual />
            </article>

            <article className="pm-bento-card">
              <div className="pm-card-icon pm-icon-amber"><Palette size={21} /></div>
              <h3>Oferta pod pełną kontrolą</h3>
              <p>Publikuj tylko wybrane presety, kolory, płyty i bramy.</p>
              <CatalogControlVisual />
            </article>

            <article className="pm-bento-card">
              <div className="pm-card-icon pm-icon-blue"><BarChart3 size={21} /></div>
              <h3>Lejek sprzedażowy w panelu</h3>
              <p>Zamówienia, statusy, handlowcy i historia kontaktu w jednym miejscu.</p>
              <SalesPipelineVisual />
            </article>

            <article className="pm-bento-card pm-bento-wide">
              <div className="pm-bento-wide-copy">
                <div className="pm-card-icon pm-icon-green"><Building2 size={21} /></div>
                <h3>Każda firma ma własną przestrzeń.</h3>
                <p>
                  Osobny adres, branding, ustawienia, zespół i zamówienia.
                  Ty decydujesz, co widzi klient.
                </p>
              </div>
              <TenantWorkspaceVisual />
            </article>

            <article className="pm-bento-card pm-bento-compact">
              <div className="pm-card-icon pm-icon-rose"><FileText size={21} /></div>
              <div><h3>PDF i snapshot</h3><p>Pełny zapis konfiguracji dla klienta i handlowca.</p></div>
              <PdfSnapshotVisual />
            </article>

            <article className="pm-bento-card pm-bento-compact">
              <div className="pm-card-icon pm-icon-slate"><UsersRound size={21} /></div>
              <div><h3>Zespół i role</h3><p>Właściciel, administrator i handlowcy z właściwym dostępem.</p></div>
              <TeamRolesVisual />
            </article>
          </div>
        </div>
      </section>

      <section className="pm-long-demo-section" aria-labelledby="pelna-prezentacja-heading">
        <div className="pm-container">
          <div className="pm-long-demo-heading">
            <div>
              <span className="pm-section-kicker"><CirclePlay size={14} /> Pełna prezentacja produktu</span>
              <h2 id="pelna-prezentacja-heading">Zobacz cały proces konfiguracji.</h2>
            </div>
            <div>
              <p>106 sekund rzeczywistej pracy aplikacji — od wyboru bryły i wymiarów po gotową konfigurację dla handlowca.</p>
              <Link href="/demo">Otwórz osobne demo 3D <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="pm-long-demo-stage">
            <div className="pm-long-demo-bar">
              <span><i /><i /><i /></span>
              <b>Warstwowe3D · pełny przebieg</b>
              <em>01:47</em>
            </div>
            <LazyProductVideo
              src="/video/long-videlo-full.webm"
              label="Pełna prezentacja procesu konfiguracji w Warstwowe3D"
              className="pm-long-demo-video"
              eager
              autoPlay={false}
              controls
            />
          </div>
        </div>
      </section>

      <section className="pm-product-gallery" id="platforma">
        <div className="pm-gallery-glow" aria-hidden="true" />
        <div className="pm-container">
          <div className="pm-gallery-heading">
            <div>
              <span className="pm-gallery-kicker"><Sparkles size={14} /> Zobacz cały produkt</span>
              <h2>
                To nie jest tylko konfigurator.
                <span> To kompletny system sprzedaży.</span>
              </h2>
            </div>
            <p>
              Każda część platformy została zaprojektowana pod konkretną rolę:
              klienta, handlowca, administratora firmy i operatora SaaS.
            </p>
          </div>

          <div className="pm-gallery-filters" aria-label="Obszary platformy">
            <span className="active">Cała platforma <strong>3</strong></span>
            <span>Sprzedaż</span>
            <span>Zarządzanie</span>
            <span>Rozliczenia</span>
          </div>

          <div className="pm-gallery-grid">
            <article className="pm-showcase-card pm-showcase-dashboard" id="platforma-dashboard">
              <div className="pm-showcase-visual">
                <div className="pm-dashboard-demo">
                  <aside>
                    <span className="pm-dashboard-demo-brand"><Layers3 size={17} /> Warstwowe3D</span>
                    <nav>
                      <span className="active"><Gauge size={10} /> Pulpit</span>
                      <span><ShoppingCart size={10} /> Zamówienia <b>18</b></span>
                      <span><PanelTop size={10} /> Katalog</span>
                      <span><UsersRound size={10} /> Zespół</span>
                      <span><Settings2 size={10} /> Ustawienia</span>
                    </nav>
                    <span className="pm-dashboard-demo-user"><i>AK</i><b>Anna Kowalska</b></span>
                  </aside>
                  <main>
                    <div className="pm-dashboard-demo-head">
                      <span><small>DZISIAJ, 30 LIPCA</small><b>Centrum sprzedaży</b></span>
                      <i>7</i><i>AK</i>
                    </div>
                    <div className="pm-dashboard-demo-metrics">
                      <span><small>ZAMÓWIENIA</small><strong>128</strong><em>+12%</em></span>
                      <span><small>NOWE</small><strong>18</strong><em>dzisiaj</em></span>
                      <span><small>KONWERSJA</small><strong>34%</strong><em>+4.8%</em></span>
                    </div>
                    <div className="pm-dashboard-demo-main">
                      <div className="pm-dashboard-demo-chart">
                        {[46, 68, 52, 81, 62, 91, 76, 100].map((height, index) => (
                          <i key={index} style={{ height: `${height}%` }} />
                        ))}
                      </div>
                      <div className="pm-dashboard-demo-orders">
                        <span><i>MN</i><b>STP/2026/0128</b><em>NOWE</em></span>
                        <span><i>DB</i><b>STP/2026/0127</b><em>WYCENA</em></span>
                        <span><i>KW</i><b>STP/2026/0126</b><em>PRZYJĘTE</em></span>
                        <span><i>AM</i><b>STP/2026/0125</b><em>KONTAKT</em></span>
                      </div>
                    </div>
                  </main>
                </div>
              </div>
              <div className="pm-showcase-overlay">
                <span className="pm-showcase-type"><Gauge size={14} /> Dashboard firmy</span>
                <h3>Sprzedaż uporządkowana od pierwszego dnia.</h3>
                <p>Lejek, zamówienia, handlowcy i aktywność w jednym widoku.</p>
                <div className="pm-showcase-tags"><span>CRM</span><span>Analityka</span><span>Zespół</span></div>
              </div>
            </article>

            <article className="pm-showcase-card pm-showcase-settings" id="platforma-ustawienia">
              <div className="pm-showcase-visual">
                <div className="pm-settings-demo">
                  <div className="pm-settings-demo-top">
                    <span><Settings2 size={17} /> Ustawienia konfiguratora</span>
                    <button type="button" tabIndex={-1}>Opublikuj zmiany</button>
                  </div>
                  <div className="pm-settings-demo-body">
                    <nav>
                      <span className="active">Marka</span>
                      <span>Presety</span>
                      <span>Kolory</span>
                      <span>Producenci</span>
                      <span>Funkcje</span>
                    </nav>
                    <div className="pm-settings-demo-form">
                      <label className="wide"><small>NAZWA W KONFIGURATORZE</small><b>STALPROJEKT</b></label>
                      <label><small>KOLOR MARKI</small><b>#176E5D</b></label>
                      <div className="pm-settings-colors"><i className="selected" /><i /><i /><i /></div>
                      <label className="wide"><small>DOMYŚLNY PRESET</small><b>Garaż dwustanowiskowy 6 × 8 m</b></label>
                      <div className="pm-settings-switches">
                        <span><b>Wypust frontowy</b><i className="on" /></span>
                        <span><b>Widok konstrukcji</b><i className="on" /></span>
                        <span><b>Oświetlenie</b><i /></span>
                      </div>
                    </div>
                    <div className="pm-settings-demo-preview">
                      <span className="pm-settings-demo-logo">TWOJA MARKA</span>
                      <div className="pm-settings-demo-object"><i /><b /></div>
                      <small>Podgląd zmian na żywo</small>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pm-showcase-overlay">
                <span className="pm-showcase-type"><Palette size={14} /> Oferta i branding</span>
                <h3>Administrator decyduje, co może skonfigurować klient.</h3>
                <p>Kolory, presety, producenci i funkcje publikowane bez udziału programisty.</p>
                <div className="pm-showcase-tags"><span>Draft</span><span>Preview</span><span>Publikacja</span></div>
              </div>
            </article>

            <article className="pm-showcase-card pm-showcase-superadmin" id="platforma-superadmin">
              <div className="pm-showcase-visual">
                <div className="pm-superadmin-demo">
                  <aside>
                    <span><ShieldCheck size={18} /> Control</span>
                    <nav>
                      <b className="active"><Gauge size={10} /> Pulpit</b>
                      <b><Building2 size={10} /> Firmy</b>
                      <b><Layers3 size={10} /> Pakiety</b>
                      <b><ShoppingCart size={10} /> Płatności</b>
                      <b><Settings2 size={10} /> System</b>
                    </nav>
                  </aside>
                  <main>
                    <div className="pm-superadmin-demo-top"><span>Centrum operacyjne</span><i /></div>
                    <div className="pm-superadmin-demo-stats">
                      <span><Building2 size={15} /><strong>42</strong><small>firmy</small></span>
                      <span><ShoppingCart size={15} /><strong>1 284</strong><small>zamówienia</small></span>
                      <span><BarChart3 size={15} /><strong>38 400 zł</strong><small>MRR</small></span>
                    </div>
                    <div className="pm-superadmin-demo-table">
                      <header><b>FIRMA</b><b>PAKIET</b><b>DOSTĘP</b><b>STATUS</b></header>
                      <span><b>StalProjekt</b><i>DIAMOND</i><i>30.08.2026</i><em>AKTYWNA</em></span>
                      <span><b>PanelDom</b><i>GOLD</i><i>14.08.2026</i><em>TRIAL</em></span>
                      <span><b>MaxGarage</b><i>PLATINUM</i><i>02.09.2026</i><em>AKTYWNA</em></span>
                    </div>
                  </main>
                </div>
              </div>
              <div className="pm-showcase-overlay">
                <span className="pm-showcase-type"><ShieldCheck size={14} /> Superadmin SaaS</span>
                <h3>Pełna kontrola nad firmami, pakietami i katalogiem.</h3>
                <p>Operacyjne centrum platformy z audytem i stanem płatności.</p>
                <div className="pm-showcase-tags"><span>Tenanci</span><span>Pakiety</span><span>PayU</span></div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="pm-cinematic-section" aria-labelledby="prezentacja-heading">
        <div className="pm-container pm-cinematic-grid">
          <div className="pm-cinematic-copy">
            <span className="pm-section-kicker">Funkcje Diamond</span>
            <h2 id="prezentacja-heading">Pokaż klientowi obiekt także po zmroku.</h2>
            <p>
              Tryb prezentacyjny pozwala uruchomić oświetlenie dachu, bram i wnętrza.
              Klient widzi efekt przed wysłaniem zapytania, bez renderów przygotowywanych ręcznie.
            </p>
            <div className="pm-cinematic-features">
              <span><Check size={14} /> oświetlenie aktualizowane na żywo</span>
              <span><Check size={14} /> sterowanie bezpośrednio w konfiguratorze</span>
              <span><Check size={14} /> dostępne w pakiecie Diamond</span>
            </div>
          </div>
          <div className="pm-cinematic-stage">
            <div className="pm-cinematic-windowbar">
              <span><i /><i /><i /></span>
              <b>Tryb prezentacji oświetlenia</b>
              <em><i /> LIVE</em>
            </div>
            <LazyProductVideo
              src="/video/darc-scene-garagewithlight.webm"
              label="Nocny tryb prezentacji oświetlenia garażu"
              className="pm-cinematic-video"
            />
            <div className="pm-cinematic-caption" aria-hidden="true">
              <span><Zap size={14} /> Oświetlenie obiektu</span>
              <strong>Podgląd bez renderowania</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="pm-section pm-workflow-section" id="jak-to-dziala">
        <div className="pm-container pm-workflow-layout">
          <div className="pm-workflow-intro">
            <span className="pm-section-kicker pm-kicker-light">Prosty start</span>
            <h2>Twoja cyfrowa sprzedaż działa w trzech krokach.</h2>
            <p>
              Nie musisz budować własnego systemu ani utrzymywać infrastruktury.
              Konfigurujesz ofertę i zaczynasz zbierać wartościowe zapytania.
            </p>
            <Link className="pm-text-link-light" href="/rejestracja">
              Utwórz przestrzeń firmy <ArrowRight size={16} />
            </Link>
            <WorkflowDataVisual />
          </div>
          <div className="pm-workflow-list">
            {workflow.map((step) => (
              <article key={step.number}>
                <span>{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pm-section pm-pricing-section" id="cennik">
        <div className="pm-container">
          <div className="pm-section-heading pm-section-heading-center">
            <span className="pm-section-kicker">Przejrzysty cennik</span>
            <h2>Wybierz możliwości, których potrzebuje Twój zespół.</h2>
            <p>
              Wszystkie ceny są brutto. Przy płatności za 6 miesięcy z góry otrzymujesz 10% rabatu.
            </p>
            <div className="pm-pricing-note">
              <Check size={14} /> 7 dni trialu dla subskrypcji miesięcznej
              <span />
              <Check size={14} /> bez długoterminowej umowy
            </div>
          </div>

          <div className="pm-pricing-grid">
            {plans.map((plan) => {
              const content = planContent[plan.code] ?? {
                description: "Pakiet konfiguratora dopasowany do Twojej firmy.",
                features: [],
              };
              const highlighted = plan.code === "GOLD";
              return (
                <article
                  key={plan.code}
                  className={`pm-price-card ${highlighted ? "is-recommended" : ""}`}
                >
                  {highlighted && <span className="pm-price-badge">Najczęściej wybierany</span>}
                  <div className="pm-price-head">
                    <span className="pm-plan-code">{plan.code}</span>
                    <h3>{plan.name}</h3>
                    <p>{content.description}</p>
                  </div>
                  <div className="pm-price-value">
                    <strong>{plan.monthlyGross}</strong>
                    <span>zł brutto<br />miesięcznie</span>
                  </div>
                  <div className="pm-prepaid">
                    <span>6 miesięcy z góry</span>
                    <strong>{plan.prepaidSixMonthsGross} zł</strong>
                  </div>
                  <ul>
                    {content.features.map((feature) => (
                      <li key={feature}><Check size={15} /> <span>{feature}</span></li>
                    ))}
                  </ul>
                  <Link
                    className={`pm-button ${highlighted ? "pm-button-primary" : "pm-button-outline"} pm-button-full`}
                    href={`/rejestracja?plan=${plan.code}`}
                  >
                    Wybieram {plan.name} <ArrowRight size={16} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="pm-final-section">
        <div className="pm-container pm-final-card">
          <div>
            <span className="pm-section-kicker pm-kicker-light">Gotowy na własny konfigurator?</span>
            <h2>Pokaż produkt tak, jak naprawdę na to zasługuje.</h2>
            <p>Uruchom przestrzeń firmy, wybierz pakiet i zacznij 7-dniowy trial.</p>
          </div>
          <div className="pm-final-actions">
            <Link className="pm-button pm-button-white pm-button-lg" href="/rejestracja">
              Załóż firmę <ArrowRight size={18} />
            </Link>
            <Link className="pm-final-demo" href="/demo">Najpierw zobacz demo</Link>
          </div>
        </div>
      </section>

      <footer className="pm-footer">
        <div className="pm-container pm-footer-content">
          <Link className="pm-brand pm-brand-footer" href="/">
            <span className="pm-brand-mark"><Layers3 size={19} /></span>
            <span className="pm-brand-name">Warstwowe<span>3D</span></span>
          </Link>
          <p>Konfiguracja. Sprzedaż. Wzrost.</p>
          <div>
            <Link href="/logowanie">Logowanie</Link>
            <Link href="/rejestracja">Rejestracja</Link>
            <Link href="/demo">Demo</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
