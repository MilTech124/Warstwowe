/**
 * Ilustracje sekcji strony głównej.
 *
 * Zamiast udawanych zrzutów panelu — rysunek techniczny, tabela pozycji i karta
 * ustawień. Dla firmy, która na co dzień czyta rzuty i zestawienia materiałów,
 * kreska z linią wymiarową jest wiarygodniejsza niż wyrenderowany dashboard.
 * Wszystko dekoracyjne, więc aria-hidden.
 */

const LINE = "rgba(255,255,255,0.34)";
const DIM = "rgba(61,220,151,0.85)";
const FAINT = "rgba(255,255,255,0.16)";

/** Rzut hali z liniami wymiarowymi i siatką słupów — miniatura rysunku R-01. */
export function BlueprintVisual() {
  return (
    <div className="w3-blueprint" aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
        {/* obrys dachu — przerywany, jak w rzucie */}
        <rect
          x="52" y="58" width="296" height="176"
          fill="none" stroke={FAINT} strokeWidth="1" strokeDasharray="5 4"
        />
        {/* obrys ścian */}
        <rect x="66" y="72" width="268" height="148" fill="none" stroke={LINE} strokeWidth="1.4" />

        {/* płatwie */}
        {[104, 142, 180, 218, 256, 294].map((x) => (
          <line key={x} x1={x} y1="72" x2={x} y2="220" stroke={FAINT} strokeWidth="0.8" />
        ))}
        {/* krokwie */}
        <line x1="66" y1="146" x2="334" y2="146" stroke={FAINT} strokeWidth="0.8" />

        {/* słupy */}
        {[66, 133, 200, 267, 334].map((x) =>
          [72, 220].map((y) => (
            <rect key={`${x}-${y}`} x={x - 4} y={y - 4} width="8" height="8" fill={DIM} opacity="0.9" />
          )),
        )}

        {/* brama na ścianie frontowej */}
        <line x1="150" y1="220" x2="216" y2="220" stroke={DIM} strokeWidth="3.5" />
        {/* drzwi na ścianie prawej */}
        <line x1="334" y1="112" x2="334" y2="140" stroke={DIM} strokeWidth="3.5" />

        {/* linia wymiarowa — szerokość */}
        <line x1="66" y1="252" x2="334" y2="252" stroke={DIM} strokeWidth="1" />
        <line x1="66" y1="246" x2="66" y2="258" stroke={DIM} strokeWidth="1" />
        <line x1="334" y1="246" x2="334" y2="258" stroke={DIM} strokeWidth="1" />
        <text x="200" y="247" fill={DIM} fontSize="11" fontFamily="monospace" textAnchor="middle">
          15,0 m
        </text>

        {/* linia wymiarowa — głębokość */}
        <line x1="34" y1="72" x2="34" y2="220" stroke={DIM} strokeWidth="1" />
        <line x1="28" y1="72" x2="40" y2="72" stroke={DIM} strokeWidth="1" />
        <line x1="28" y1="220" x2="40" y2="220" stroke={DIM} strokeWidth="1" />
        <text
          x="34" y="146" fill={DIM} fontSize="11" fontFamily="monospace"
          textAnchor="middle" transform="rotate(-90 34 146)"
        >
          9,0 m
        </text>

        <text x="66" y="46" fill="rgba(255,255,255,0.42)" fontSize="10" fontFamily="monospace">
          RZUT DACHU — słupy co 3,35 m
        </text>
      </svg>
      <div className="w3-blueprint-title">
        <span>OBIEKT: HALA 9 × 15 m</span>
        <b>R-01</b>
      </div>
    </div>
  );
}

/** Strona oferty — pozycje z ilościami, tak jak wychodzą z zestawienia materiałów. */
export function DocumentVisual() {
  return (
    <div className="w3-doc" aria-hidden="true">
      <div className="w3-doc-page">
        <b>
          <span>4. Poszycie ścian</span>
          <em>PIR</em>
        </b>
        {[
          ["Grubość rdzenia", "100 mm"],
          ["Współczynnik U", "0,22 W/m²K"],
          ["Kolor", "RAL 7016"],
          ["Powierzchnia netto", "182,4 m²"],
          ["Liczba pasów", "38 szt."],
        ].map(([label, value]) => (
          <div className="w3-doc-row" key={label}>
            <span>{label}</span>
            <i />
            <var>{value}</var>
          </div>
        ))}
      </div>

      <div className="w3-doc-page">
        <b>
          <span>14. Zestawienie stali</span>
          <em>kg</em>
        </b>
        {[
          ["Słupy ram — IPE 200", "1 284 kg"],
          ["Rygle — IPE 180", "968 kg"],
          ["Płatwie — Z 200", "612 kg"],
          ["Blachy podstawy", "94 kg"],
          ["Masa całkowita", "3 108 kg"],
        ].map(([label, value]) => (
          <div className="w3-doc-row" key={label}>
            <span>{label}</span>
            <i />
            <var>{value}</var>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Wycena pozycja po pozycji — z widoczną dopłatą za szerokość bramy. */
export function QuoteVisual() {
  return (
    <div className="w3-quote" aria-hidden="true">
      <div className="w3-quote-head">
        <span>Zestawienie kosztów</span>
        <span>netto</span>
      </div>

      {[
        { name: "Płyta ścienna PIR 100 mm", qty: "182,4 m²", value: "34 656,00" },
        { name: "Płyta dachowa PIR 120 mm", qty: "148,0 m²", value: "31 080,00" },
        { name: "Konstrukcja stalowa", qty: "3 108 kg", value: "27 972,00" },
        {
          name: "Brama segmentowa UniPro",
          note: "3,0 m — dopłata za 1 × 50 cm",
          qty: "1 szt.",
          value: "8 400,00",
        },
        { name: "Obróbki blacharskie", qty: "96,4 mb", value: "3 856,00" },
      ].map((row) => (
        <div className="w3-quote-line" key={row.name}>
          <span>
            {row.name}
            {row.note ? <small>{row.note}</small> : null}
          </span>
          <i>{row.qty}</i>
          <b>{row.value}</b>
        </div>
      ))}

      <div className="w3-quote-total">
        <span>Razem brutto</span>
        <strong>131 623,08 zł</strong>
      </div>
    </div>
  );
}

/** Karta ustawień — marka firmy i przełączniki tego, co widzi klient. */
export function BrandControlVisual() {
  return (
    <div className="w3-brandcard" aria-hidden="true">
      <div className="w3-brandcard-top">
        <span className="w3-brandcard-logo">SP</span>
        <span>
          <b>STALPROJEKT</b>
          <small>warstwowe3d.pl/stalprojekt</small>
        </span>
      </div>

      <div className="w3-swatches">
        <i className="is-on" style={{ background: "#176e5d" }} />
        <i style={{ background: "#3a3f42" }} />
        <i style={{ background: "#8c2f2f" }} />
        <i style={{ background: "#2b4a7a" }} />
        <i style={{ background: "#b8791c" }} />
      </div>

      <div className="w3-toggles">
        <span>
          Bramy Wiśniowski — 11 modeli
          <i className="is-on" />
        </span>
        <span>
          Wypust frontowy
          <i className="is-on" />
        </span>
        <span>
          Widok konstrukcji stalowej
          <i className="is-on" />
        </span>
        <span>
          Ceny widoczne dla klienta
          <i />
        </span>
      </div>
    </div>
  );
}
