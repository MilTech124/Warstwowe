// Definicja dokumentu zamówienia dla pdfmake.
//
// Ceny: dokument NIGDY nie liczy wyceny sam. Przyjmuje gotowy `quote`
// policzony po stronie serwera z opublikowanego cennika firmy. Bez `quote`
// (firma bez funkcji `pricing` albo bez cennika) rubryki zostają puste do
// ręcznego uzupełnienia — dokładnie tak, jak działało to wcześniej.

import { CUTTING_ALLOWANCE } from "@/lib/bom/steelBom";
import { formatKg, formatM2, formatNumber } from "@/lib/projectSummary";
import { elevationSvg } from "@/lib/drawings/elevationSvg";
import { frameSvg } from "@/lib/drawings/frameSvg";
import { planSvg } from "@/lib/drawings/planSvg";

const INK = "#1f2933";
const MUTED = "#7b8794";
const ACCENT = "#0f766e";
const PAGE_MARGIN = [40, 52, 40, 46];
const CONTENT_WIDTH = 515;

export function orderNumberFor(config, date = new Date()) {
  if (config.order?.orderNo) return config.order.orderNo;
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("");
  const seed = Math.abs(
    Math.round(
      (config.dimensions.widthM * 100 + config.dimensions.lengthM * 10 + config.dimensions.wallHeightM) *
        (config.openings.length + 1),
    ) % 1000,
  );
  return `KW-${stamp}-${String(seed).padStart(3, "0")}`;
}

const PLN = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  minimumFractionDigits: 2,
});

function formatPln(amount) {
  return PLN.format(Number(amount) || 0);
}

/**
 * Rubryka wyceny. Trzy przypadki: pełna wycena, wycena niepełna (cennik ma
 * luki — pokazujemy co się da i oznaczamy jako wstępną) oraz brak wyceny.
 */
function quoteBox(quote) {
  if (!quote) {
    return [
      { text: "Wycena", style: "miniHeading" },
      {
        table: {
          widths: ["50%", "50%"],
          body: [
            [{ text: "Wartość netto", style: "key" }, { text: " ", style: "value" }],
            [{ text: "VAT", style: "key" }, { text: " ", style: "value" }],
            [{ text: "Wartość brutto", style: "key" }, { text: " ", style: "value" }],
            [{ text: "Termin realizacji", style: "key" }, { text: " ", style: "value" }],
          ],
        },
        layout: "kvLayout",
      },
      {
        text: "Rubryki do uzupełnienia — konfigurator nie zawiera cennika.",
        style: "footnote",
        margin: [0, 4, 0, 0],
      },
    ];
  }

  const stack = [
    { text: quote.incomplete ? "Wycena wstępna" : "Wycena", style: "miniHeading" },
    {
      table: {
        widths: ["50%", "50%"],
        body: [
          [{ text: "Wartość netto", style: "key" }, { text: formatPln(quote.totalNet), style: "value" }],
          [
            { text: `VAT ${quote.vatRatePercent}%`, style: "key" },
            { text: formatPln(quote.vatAmount), style: "value" },
          ],
          [
            { text: "Wartość brutto", style: "key" },
            { text: formatPln(quote.totalGross), style: "value", bold: true },
          ],
          [{ text: "Termin realizacji", style: "key" }, { text: " ", style: "value" }],
        ],
      },
      layout: "kvLayout",
    },
  ];

  if (quote.incomplete) {
    stack.push({
      text: "Wycena niepełna — część pozycji nie ma jeszcze stawek w cenniku firmy.",
      style: "footnote",
      margin: [0, 4, 0, 0],
    });
  }
  return stack;
}

/** Szczegółowe zestawienie kosztów, tylko dla kompletnej wyceny. */
function quoteBreakdown(quote) {
  const body = [
    [
      { text: "Pozycja", style: "tableHeader" },
      { text: "Ilość", style: "tableHeader", alignment: "right" },
      { text: "J.m.", style: "tableHeader" },
      { text: "Cena jedn. netto", style: "tableHeader", alignment: "right" },
      { text: "Wartość netto", style: "tableHeader", alignment: "right" },
    ],
  ];

  for (const group of quote.groups) {
    body.push([
      { text: group.label, style: "key", bold: true, colSpan: 4 },
      {},
      {},
      {},
      { text: formatPln(group.subtotalNet), style: "value", alignment: "right", bold: true },
    ]);
    for (const line of group.lines) {
      body.push([
        { text: `   ${line.label}`, style: "value" },
        { text: formatNumber(line.quantity), style: "value", alignment: "right" },
        { text: line.unit, style: "value" },
        { text: formatPln(line.unitPriceNet), style: "value", alignment: "right" },
        { text: formatPln(line.totalNet), style: "value", alignment: "right" },
      ]);
    }
  }

  const total = (label, amount, bold = false) => [
    { text: label, style: "key", colSpan: 4, bold },
    {},
    {},
    {},
    { text: formatPln(amount), style: "value", alignment: "right", bold },
  ];
  if (quote.marginNet) body.push(total(`Marża ${quote.marginPercent}%`, quote.marginNet));
  body.push(total("Razem netto", quote.totalNet, true));
  body.push(total(`VAT ${quote.vatRatePercent}%`, quote.vatAmount));
  body.push(total("Razem brutto", quote.totalGross, true));

  return {
    table: { widths: ["40%", "12%", "8%", "20%", "20%"], headerRows: 1, body },
    layout: "dataLayout",
  };
}

function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`;
}

function sectionHeading(label) {
  return { text: label, style: "sectionHeading" };
}

function keyValueTable(rows, { widths = ["42%", "58%"] } = {}) {
  return {
    table: {
      widths,
      body: rows.map(([key, value]) => [
        { text: key, style: "key" },
        { text: String(value), style: "value" },
      ]),
    },
    layout: "kvLayout",
    margin: [0, 0, 0, 10],
  };
}

function dataTable({ headers, rows, widths, alignRight = [] }) {
  return {
    table: {
      headerRows: 1,
      widths,
      body: [
        headers.map((header, index) => ({
          text: header,
          style: "tableHeader",
          alignment: alignRight.includes(index) ? "right" : "left",
        })),
        ...rows.map((row) =>
          row.map((cell, index) => ({
            text: String(cell),
            style: "tableCell",
            alignment: alignRight.includes(index) ? "right" : "left",
          })),
        ),
      ],
    },
    layout: "dataLayout",
    margin: [0, 0, 0, 10],
  };
}

/**
 * @param {object} params
 * @param {object} params.config       pełna konfiguracja ze store'u
 * @param {object} params.summary      wynik projectSummary(config)
 * @param {Array}  params.shots        zrzuty z captureViews
 * @param {Date}   [params.date]
 */
export function buildOrderDocument({
  config,
  summary,
  shots,
  date = new Date(),
  quote = null,
  // Logo producentów jako data URL — pdfmake w przeglądarce nie pobiera
  // obrazów z sieci samodzielnie.
  manufacturerLogos = {},
}) {
  const orderNo = orderNumberFor(config, date);
  const order = config.order ?? {};
  const heroShot = shots.find((shot) => shot.id === "orbit") ?? shots[0];
  const structureShot = shots.find((shot) => shot.id === "structure");
  const otherShots = shots.filter((shot) => shot !== heroShot);

  const content = [];

  // ---------------- 1. Strona tytułowa ----------------
  content.push(
    {
      columns: [
        [
          { text: "SPECYFIKACJA ZAMÓWIENIA", style: "eyebrow" },
          { text: "Garaż z płyt warstwowych", style: "title" },
          { text: summary.building.rows[0][1], style: "subtitle" },
        ],
        {
          width: 150,
          stack: [
            { text: `Nr zamówienia\n${orderNo}`, style: "stamp" },
            { text: `Data\n${formatDate(date)}`, style: "stamp", margin: [0, 6, 0, 0] },
          ],
        },
      ],
      margin: [0, 0, 0, 14],
    },
  );

  if (heroShot) {
    content.push({ image: heroShot.dataUrl, width: CONTENT_WIDTH, margin: [0, 0, 0, 14] });
  }

  content.push({
    columns: [
      {
        width: "48%",
        stack: [
          { text: "Zamawiający", style: "miniHeading" },
          keyValueTable(
            [
              ["Nazwa / imię i nazwisko", order.customerName || "—"],
              ["Adres", order.customerAddress || "—"],
              ["Telefon", order.phone || "—"],
              ["E-mail", order.email || "—"],
            ],
            { widths: ["45%", "55%"] },
          ),
        ],
      },
      { width: 14, text: "" },
      {
        width: "48%",
        stack: quoteBox(quote),
      },
    ],
    margin: [0, 0, 0, 8],
  });

  // ---------------- 2-3. Opis obiektu, dach, wypust ----------------
  content.push({ text: "", pageBreak: "after" });
  // Licznik zamiast ręcznych przesunięć — dodanie sekcji nie wymaga
  // przeliczania wszystkich numerów.
  let sectionNo = 0;
  const nextSection = (label) => sectionHeading(`${(sectionNo += 1)}. ${label}`);

  content.push(nextSection("Opis obiektu"));
  content.push(keyValueTable(summary.building.rows));

  content.push(nextSection("Dach"));
  content.push(keyValueTable(summary.roof.rows));

  if (summary.frontProjection) {
    content.push(nextSection("Wypust frontowy"));
    content.push(keyValueTable(summary.frontProjection.rows));
  }

  // ---------------- 4. Poszycie ----------------
  // Logo producenta obok tabeli — ta sama ekspozycja marki, za którą producent
  // płaci w konfiguratorze, trafia do dokumentu oglądanego przez klienta.
  const claddingBlock = (label, rows, logo) => {
    content.push(nextSection(label));
    if (!logo) return content.push(keyValueTable(rows));
    return content.push({
      columns: [
        { width: "*", stack: [keyValueTable(rows)] },
        { width: 90, image: logo, fit: [90, 46], alignment: "right" },
      ],
      columnGap: 12,
    });
  };

  claddingBlock("Poszycie ścian", summary.cladding.wallRows, manufacturerLogos.wall);
  claddingBlock("Poszycie dachu", summary.cladding.roofRows, manufacturerLogos.roof);

  // ---------------- 5. Obróbki i rynny ----------------
  content.push(nextSection("Obróbki blacharskie"));
  content.push(keyValueTable(summary.accessorySection.flashingRows));
  content.push(nextSection("Orynnowanie"));
  content.push(keyValueTable(summary.accessorySection.gutterRows));

  // ---------------- 6. Oświetlenie ----------------
  content.push(nextSection("Oświetlenie"));
  content.push(keyValueTable(summary.lighting.rows));

  // ---------------- 7. Otwory ----------------
  content.push({ text: "", pageBreak: "before" });
  content.push(nextSection("Bramy, drzwi i okna"));
  content.push(
    dataTable({
      headers: ["Pozycja", "Ściana", "Wymiar", "Produkt", "Kolor", "Szczegóły"],
      widths: ["13%", "10%", "15%", "22%", "17%", "23%"],
      rows: summary.openings.map((row) => [row.title, row.wall, row.sizeText, row.product ?? "—", row.colorLabel ?? "—", row.details.join("; ")]),
    }),
  );
  content.push({
    text: `Pozycja otworu liczona jest od środka ściany (offset), wysokość progu od poziomu posadzki.`,
    style: "footnote",
    margin: [0, 0, 0, 10],
  });

  // ---------------- Zestawienie kosztów ----------------
  // Tylko dla kompletnej wyceny — niepełna pokazuje się wyłącznie jako
  // podsumowanie na stronie tytułowej, żeby nie sugerować zamkniętej oferty.
  if (quote && !quote.incomplete && quote.groups.length) {
    content.push({ text: "", pageBreak: "before" });
    content.push(nextSection("Zestawienie kosztów"));
    content.push(quoteBreakdown(quote));
    content.push({
      text: "Ceny netto według cennika firmy. Wycena obowiązuje dla konfiguracji opisanej w tym dokumencie.",
      style: "footnote",
      margin: [0, 0, 0, 10],
    });
  }

  // ---------------- Konstrukcja ----------------
  content.push(nextSection("Konstrukcja stalowa"));
  content.push(keyValueTable(summary.structure.rows));

  content.push({ text: "Dobór przekrojów", style: "miniHeading" });
  content.push(
    dataTable({
      headers: ["Element", "Profil", "Typ", "kg/mb", "Rozstaw"],
      widths: ["34%", "20%", "10%", "12%", "24%"],
      alignRight: [3],
      rows: summary.structure.profileRows.map((row) => [
        row.roleLabel,
        row.profileLabel,
        row.profileKind,
        formatNumber(row.kgPerM, 2),
        row.spacingText,
      ]),
    }),
  );

  content.push({ text: "Zestawienie stali", style: "miniHeading" });
  content.push(
    dataTable({
      headers: ["Element", "Profil", "Szt.", "Długość [m]", "Masa [kg]"],
      widths: ["34%", "20%", "10%", "18%", "18%"],
      alignRight: [2, 3, 4],
      rows: [
        ...summary.steel.rows.map((row) => [
          row.roleLabel,
          row.profileLabel,
          row.count,
          formatNumber(row.totalLengthM, 1),
          formatNumber(row.massKg, 1),
        ]),
        ...summary.steel.plateRows.map((row) => [row.label, "blacha", row.count, "—", formatNumber(row.massKg, 1)]),
        [summary.steel.anchorLabel, "kotwa", summary.steel.anchorCount, "—", formatNumber(summary.steel.anchorMassKg, 1)],
        ["Drobnica montażowa i spoiny", "ryczałt 2%", "—", "—", formatNumber(summary.steel.fixingsMassKg, 1)],
      ],
    }),
  );
  content.push({
    columns: [
      { text: "Masa całkowita konstrukcji", style: "totalLabel" },
      { text: formatKg(summary.steel.totalMassKg), style: "totalValue", alignment: "right" },
    ],
    margin: [0, 0, 0, 10],
  });

  if (summary.steel.membersWithoutProfile > 0) {
    content.push({
      text: `Uwaga: ${summary.steel.membersWithoutProfile} elementów bez przypisanego profilu — ich masa nie została policzona.`,
      style: "warning",
    });
  }

  content.push({ text: "Zapotrzebowanie materiałowe (z zapasem na docinanie)", style: "miniHeading" });
  content.push(
    dataTable({
      headers: ["Profil", "Długość do zamówienia [m]", "Masa [kg]"],
      widths: ["40%", "30%", "30%"],
      alignRight: [1, 2],
      rows: summary.steelOrder.map((row) => [row.profileLabel, formatNumber(row.orderLengthM, 1), formatNumber(row.massKg, 1)]),
    }),
  );
  content.push({
    text: `Zapas na docinanie: ${Math.round(CUTTING_ALLOWANCE * 100)}%. Masy jednostkowe wg tablic wyrobów (EN 10219 / EN 10365).`,
    style: "footnote",
    margin: [0, 0, 0, 10],
  });

  // ---------------- 8. Uwagi ----------------
  if (summary.warnings.length > 0) {
    content.push(nextSection("Uwagi do konfiguracji"));
    content.push({
      ul: summary.warnings.map((warning) => warning.message),
      style: "warningList",
      margin: [0, 0, 0, 10],
    });
  }

  // ---------------- 9. Rysunki ----------------
  content.push({ text: "", pageBreak: "before" });
  content.push(sectionHeading("Rysunki techniczne"));
  content.push({ svg: planSvg(config, summary.model), width: CONTENT_WIDTH, margin: [0, 0, 0, 12] });
  content.push({ svg: frameSvg(config, summary.model), width: CONTENT_WIDTH, margin: [0, 0, 0, 12] });
  content.push({ text: "", pageBreak: "before" });
  content.push(sectionHeading("Elewacje"));
  content.push({ svg: elevationSvg(config, summary.model, "front"), width: CONTENT_WIDTH, margin: [0, 0, 0, 12] });
  content.push({ svg: elevationSvg(config, summary.model, "right"), width: CONTENT_WIDTH, margin: [0, 0, 0, 12] });
  content.push({
    text: "Rysunki poglądowe do celów ofertowych — nie stanowią dokumentacji wykonawczej.",
    style: "footnote",
  });

  // ---------------- 10. Wizualizacje ----------------
  if (otherShots.length > 0) {
    content.push({ text: "", pageBreak: "before" });
    content.push(sectionHeading("Wizualizacje"));
    for (let index = 0; index < otherShots.length; index += 2) {
      const pair = otherShots.slice(index, index + 2);
      content.push({
        columns: pair.map((shot) => ({
          width: "48%",
          stack: [
            { image: shot.dataUrl, width: 244 },
            { text: shot.label, style: "caption" },
          ],
        })),
        columnGap: 14,
        margin: [0, 0, 0, 12],
      });
    }
  }

  // ---------------- 11. Podpisy ----------------
  content.push({ text: "", pageBreak: "before" });
  content.push(sectionHeading("Akceptacja zamówienia"));
  content.push({
    text:
      "Konfigurator jest narzędziem wizualizacyjno-ofertowym. Wymiarowanie konstrukcji pod konkretną lokalizację " +
      "(strefa śniegowa i wiatrowa) wykonuje uprawniony konstruktor. Wykonawstwo konstrukcji stalowych reguluje " +
      "PN-EN 1090, obciążenia i nośność Eurokody (PN-EN 1991, PN-EN 1993), ochronę antykorozyjną m.in. " +
      "PN-EN ISO 1461. Dopuszczalne rozpiętości płyt zawsze według tablic obciążeniowych konkretnego producenta.",
    style: "disclaimer",
    margin: [0, 0, 0, 26],
  });

  if (order.notes) {
    content.push({ text: "Uwagi zamawiającego", style: "miniHeading" });
    content.push({ text: order.notes, style: "value", margin: [0, 0, 0, 22] });
  }

  content.push({
    columns: [
      { width: "45%", stack: [{ text: " ", margin: [0, 18, 0, 0] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.6, lineColor: MUTED }] }, { text: "Zamawiający", style: "signature" }] },
      { width: "10%", text: "" },
      { width: "45%", stack: [{ text: " ", margin: [0, 18, 0, 0] }, { canvas: [{ type: "line", x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 0.6, lineColor: MUTED }] }, { text: "Wykonawca", style: "signature" }] },
    ],
  });

  return {
    content,
    pageSize: "A4",
    pageMargins: PAGE_MARGIN,
    info: {
      title: `Zamówienie ${orderNo}`,
      author: "Konfigurator garaży warstwowych",
      subject: "Specyfikacja techniczna zamówienia",
    },
    defaultStyle: { font: "Roboto", fontSize: 8.5, color: INK, lineHeight: 1.25 },
    header: (currentPage) =>
      currentPage === 1
        ? null
        : {
            columns: [
              { text: "Specyfikacja zamówienia", style: "runningHead" },
              { text: orderNo, style: "runningHead", alignment: "right" },
            ],
            margin: [40, 24, 40, 0],
          },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: `${formatDate(date)} · ${structureShot ? "z wizualizacją szkieletu" : "bez wizualizacji szkieletu"}`, style: "runningFoot" },
        { text: `Strona ${currentPage} z ${pageCount}`, style: "runningFoot", alignment: "right" },
      ],
      margin: [40, 14, 40, 0],
    }),
    styles: {
      eyebrow: { fontSize: 7.5, color: ACCENT, characterSpacing: 1.2, bold: true, margin: [0, 0, 0, 4] },
      title: { fontSize: 20, bold: true, margin: [0, 0, 0, 2] },
      subtitle: { fontSize: 10, color: MUTED },
      stamp: { fontSize: 8, color: INK, alignment: "right" },
      sectionHeading: { fontSize: 11, bold: true, color: ACCENT, margin: [0, 6, 0, 6] },
      miniHeading: { fontSize: 9, bold: true, margin: [0, 4, 0, 4] },
      key: { fontSize: 8, color: MUTED },
      value: { fontSize: 8.5 },
      tableHeader: { fontSize: 7.5, bold: true, color: MUTED },
      tableCell: { fontSize: 7.5 },
      totalLabel: { fontSize: 9.5, bold: true },
      totalValue: { fontSize: 11, bold: true, color: ACCENT },
      caption: { fontSize: 7.5, color: MUTED, margin: [0, 3, 0, 0] },
      footnote: { fontSize: 7, color: MUTED, italics: true },
      warning: { fontSize: 8, color: "#b45309", margin: [0, 0, 0, 8] },
      warningList: { fontSize: 8, color: "#8a5a00" },
      disclaimer: { fontSize: 7.5, color: MUTED },
      signature: { fontSize: 7.5, color: MUTED, margin: [0, 4, 0, 0] },
      runningHead: { fontSize: 7, color: MUTED },
      runningFoot: { fontSize: 7, color: MUTED },
    },
  };
}

// Własne layouty tabel — pdfmake nie ma wbudowanego „tylko poziome linie".
export const TABLE_LAYOUTS = {
  kvLayout: {
    hLineWidth: (index, node) => (index === 0 || index === node.table.body.length ? 0 : 0.4),
    vLineWidth: () => 0,
    hLineColor: () => "#e4e7eb",
    paddingTop: () => 3,
    paddingBottom: () => 3,
    paddingLeft: () => 0,
    paddingRight: () => 4,
  },
  dataLayout: {
    hLineWidth: (index) => (index <= 1 ? 0.6 : 0.3),
    vLineWidth: () => 0,
    hLineColor: (index) => (index <= 1 ? "#9aa5b1" : "#e4e7eb"),
    paddingTop: () => 3,
    paddingBottom: () => 3,
    paddingLeft: () => 0,
    paddingRight: () => 4,
  },
};
