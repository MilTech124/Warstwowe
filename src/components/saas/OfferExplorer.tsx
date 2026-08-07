"use client";

import { useState } from "react";
import { Boxes, FileText, Layers3, PencilRuler, Wallet } from "lucide-react";

type Section = {
  id: string;
  no: string;
  label: string;
  icon: typeof FileText;
  unit: string;
  rows: [string, string][];
};

// Sekcje i pozycje odwzorowują realny układ dokumentu z lib/pdf/orderDocument.js.
const SECTIONS: Section[] = [
  {
    id: "poszycie",
    no: "04",
    label: "Poszycie ścian",
    icon: Layers3,
    unit: "PIR",
    rows: [
      ["Producent / model", "SteelProfil · PIR Ścienna"],
      ["Grubość rdzenia", "100 mm"],
      ["Przewodność λ", "0,022 W/mK"],
      ["Współczynnik U", "0,22 W/m²K"],
      ["Kolor", "RAL 7016 Antracyt"],
      ["Powierzchnia netto", "182,4 m²"],
    ],
  },
  {
    id: "stal",
    no: "14",
    label: "Zestawienie stali",
    icon: Boxes,
    unit: "kg",
    rows: [
      ["Słupy ram — IPE 200", "1 284 kg"],
      ["Rygle — IPE 180", "968 kg"],
      ["Płatwie — Z 200", "612 kg"],
      ["Blachy podstawy", "94 kg"],
      ["Kotwy M12 + drobnica", "150 kg"],
      ["Masa całkowita", "3 108 kg"],
    ],
  },
  {
    id: "sprawdzenie",
    no: "12",
    label: "Sprawdzenie przekrojów",
    icon: PencilRuler,
    unit: "%",
    rows: [
      ["Rygiel — IPE 180", "rozpiętość 9,0 m"],
      ["Moment M", "18,4 kNm"],
      ["Wy wymagane", "78,3 cm³"],
      ["Wy profilu", "146,0 cm³"],
      ["Wytężenie", "54 %"],
      ["Gatunek stali", "S235JR"],
    ],
  },
  {
    id: "koszty",
    no: "10",
    label: "Zestawienie kosztów",
    icon: Wallet,
    unit: "zł",
    rows: [
      ["Płyta ścienna PIR 100 mm", "34 656,00"],
      ["Płyta dachowa PIR 120 mm", "31 080,00"],
      ["Konstrukcja stalowa", "27 972,00"],
      ["Bramy, drzwi i okna", "12 240,00"],
      ["Razem netto", "107 010,00"],
      ["Razem brutto", "131 622,30"],
    ],
  },
  {
    id: "rysunki",
    no: "17",
    label: "Rysunki techniczne",
    icon: FileText,
    unit: "6 szt.",
    rows: [
      ["R-01", "Rzut dachu z siatką słupów"],
      ["R-02", "Przekrój przez ramę"],
      ["R-03", "Elewacja frontowa"],
      ["R-04", "Elewacja prawa"],
      ["R-05", "Elewacja tylna"],
      ["R-06", "Elewacja lewa"],
    ],
  },
];

/** Przeglądarka zawartości oferty — klikasz sekcję, widzisz, co w niej jest. */
export function OfferExplorer() {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
  const active = SECTIONS.find((section) => section.id === activeId) ?? SECTIONS[0];

  return (
    <div className="w3-explorer">
      <div className="w3-explorer-tabs" role="tablist" aria-label="Sekcje oferty PDF">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          const selected = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              id={`tab-${section.id}`}
              aria-selected={selected}
              aria-controls={`panel-${section.id}`}
              className={`w3-explorer-tab ${selected ? "is-on" : ""}`}
              onClick={() => setActiveId(section.id)}
            >
              <Icon size={15} />
              {section.label}
            </button>
          );
        })}
      </div>

      <div
        className="w3-explorer-panel"
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
      >
        <div className="w3-explorer-head">
          <span>
            Sekcja {active.no} · {active.label}
          </span>
          <em>{active.unit}</em>
        </div>
        {active.rows.map(([label, value]) => (
          <div className="w3-explorer-row" key={label}>
            <span>{label}</span>
            <i />
            <var>{value}</var>
          </div>
        ))}
      </div>
    </div>
  );
}
