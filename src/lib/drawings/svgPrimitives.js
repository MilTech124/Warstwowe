// Podstawowe elementy rysunku wektorowego dla pdfmake.
//
// Ograniczenia węzłów { svg } w pdfmake (svg-to-pdfkit) — trzymamy się ich ściśle:
//  * `assumePt: true` jest wymuszone → 1 jednostka SVG = 1 punkt PDF,
//  * `stripUnits` to parseFloat, więc ŻADNYCH jednostek ani procentów w wymiarach,
//  * parser XML jest ścisły (xmldoc) → każdy `&` w tekście musi być `&amp;`,
//  * CSS nie działa dla formy stringowej → tylko atrybuty prezentacyjne inline,
//    bez <style> i bez class,
//  * Roboto ma tylko normal/bold/italics/bolditalics — font-weight="300" rzuci
//    wyjątkiem, nie zdegraduje się,
//  * dominant-baseline jest słabo wspierane → text-anchor + jawne dy.

export const INK = "#1f2933";
export const INK_LIGHT = "#7b8794";
export const STEEL = "#3f6d8f";
export const ACCENT = "#0f766e";
export const DIM = "#9aa5b1";

export function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function num(value) {
  // Bez notacji wykładniczej — parseFloat po stronie pdfmake jej nie lubi.
  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isFinite(rounded) ? String(rounded) : "0";
}

export function line(x1, y1, x2, y2, { stroke = INK, width = 0.8, dash = null } = {}) {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${num(x1)}" y1="${num(y1)}" x2="${num(x2)}" y2="${num(y2)}" stroke="${stroke}" stroke-width="${num(width)}"${dashAttr} />`;
}

export function rect(x, y, width, height, { stroke = INK, fill = "none", strokeWidth = 0.8 } = {}) {
  return `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" fill="${fill}" stroke="${stroke}" stroke-width="${num(strokeWidth)}" />`;
}

export function polygon(points, { stroke = INK, fill = "none", strokeWidth = 0.8 } = {}) {
  const path = points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
  return `<polygon points="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${num(strokeWidth)}" />`;
}

export function text(x, y, value, { size = 7, fill = INK, anchor = "middle", bold = false, rotate = null } = {}) {
  const weight = bold ? ' font-weight="bold"' : "";
  const transform = rotate == null ? "" : ` transform="rotate(${num(rotate)} ${num(x)} ${num(y)})"`;
  return `<text x="${num(x)}" y="${num(y)}" font-family="Roboto" font-size="${num(size)}" fill="${fill}" text-anchor="${anchor}"${weight}${transform}>${xmlEscape(value)}</text>`;
}

// Linia wymiarowa pozioma ze strzałkami i opisem nad nią.
export function dimLineH(x1, x2, y, label, { size = 7, color = DIM, labelColor = INK } = {}) {
  const tick = 3;
  return [
    line(x1, y, x2, y, { stroke: color, width: 0.6 }),
    line(x1, y - tick, x1, y + tick, { stroke: color, width: 0.6 }),
    line(x2, y - tick, x2, y + tick, { stroke: color, width: 0.6 }),
    text((x1 + x2) / 2, y - 3, label, { size, fill: labelColor }),
  ].join("");
}

// Linia wymiarowa pionowa; opis obrócony o 90° w lewo.
export function dimLineV(y1, y2, x, label, { size = 7, color = DIM, labelColor = INK } = {}) {
  const tick = 3;
  return [
    line(x, y1, x, y2, { stroke: color, width: 0.6 }),
    line(x - tick, y1, x + tick, y1, { stroke: color, width: 0.6 }),
    line(x - tick, y2, x + tick, y2, { stroke: color, width: 0.6 }),
    text(x - 3, (y1 + y2) / 2, label, { size, fill: labelColor, rotate: -90 }),
  ].join("");
}

export function formatMetersLabel(value) {
  return `${Number(value).toFixed(2).replace(".", ",")} m`;
}

// Znormalizowany szereg skal rysunkowych. Rysunek dopasowany do arkusza wypada
// na przypadkowe „1:87", co czyta się jak błąd — schodzimy więc do najbliższej
// wartości z szeregu. Zawsze W DÓŁ (mniejszy rysunek), żeby treść nadal się mieściła.
const NORMALISED_SCALES = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000];

// 1 pt = 25,4/72 mm, więc mianownik skali = (mm w metrze) / (mm rysunku na metr).
export function drawingScaleDenominator(scalePtPerM) {
  return (1000 * 72) / (25.4 * scalePtPerM);
}

function scaleFromDenominator(denominator) {
  return (1000 * 72) / (25.4 * denominator);
}

export function drawingScaleLabel(denominator) {
  return `1:${Math.round(denominator)}`;
}

/**
 * Skala odwzorowująca prostokąt świata na obszar rysunku (w punktach),
 * z zachowaniem proporcji. Oś Y jest odwracana, bo w SVG rośnie w dół.
 *
 * @param {object} params
 * @param {boolean} [params.snapScale]  zejdź do znormalizowanej skali rysunkowej,
 *   żeby tabelka mogła podać uczciwe „1:100" zamiast wyliczonego „1:87"
 */
export function createProjector({ worldWidth, worldHeight, boxWidth, boxHeight, padding, snapScale = false }) {
  const usableWidth = boxWidth - padding.left - padding.right;
  const usableHeight = boxHeight - padding.top - padding.bottom;
  const fitted = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);

  const fittedDenominator = drawingScaleDenominator(fitted);
  const snapped = snapScale ? NORMALISED_SCALES.find((value) => value >= fittedDenominator) : null;
  const scale = snapped ? scaleFromDenominator(snapped) : fitted;

  const offsetX = padding.left + (usableWidth - worldWidth * scale) / 2;
  const offsetY = padding.top + (usableHeight - worldHeight * scale) / 2;

  return {
    scale,
    scaleDenominator: snapped ?? fittedDenominator,
    // u, v w układzie świata liczone od lewego-dolnego narożnika prostokąta.
    x: (u) => offsetX + u * scale,
    y: (v) => offsetY + (worldHeight - v) * scale,
    length: (value) => value * scale,
  };
}

// Wysokość tabelki rysunkowej. Generatory odejmują ją od arkusza, żeby rysunek
// i linie wymiarowe nie wchodziły pod tabelkę.
export const TITLE_BLOCK_HEIGHT = 52;

// Roboto 6,5 pt ma ~3,1 pt na znak. Bez skrócenia długa nazwa firmy wychodziłaby
// poza komórkę — svg-to-pdfkit nie zawija tekstu ani go nie przycina.
function clip(value, widthPt) {
  const source = String(value ?? "—").trim() || "—";
  const maxChars = Math.max(4, Math.floor((widthPt - 8) / 3.1));
  return source.length <= maxChars ? source : `${source.slice(0, maxChars - 1)}…`;
}

/**
 * Tabelka rysunkowa u dołu arkusza — obiekt, tytuł, inwestor, wykonawca,
 * skala, numer i data. Zbudowana wyłącznie z prymitywów tego modułu, więc
 * dziedziczy ograniczenia svg-to-pdfkit (brak CSS, jawne `dy`, escapowanie).
 *
 * @param {number} boxWidth
 * @param {number} boxHeight   pełna wysokość arkusza — tabelka siada na dole
 * @param {{object?, title?, drawingNo?, scaleLabel?, date?, investor?, contractor?}} fields
 */
export function titleBlock(boxWidth, boxHeight, fields = {}, { accent = ACCENT } = {}) {
  const top = boxHeight - TITLE_BLOCK_HEIGHT;
  const rowHeight = TITLE_BLOCK_HEIGHT / 2;
  const parts = [rect(0, top, boxWidth, TITLE_BLOCK_HEIGHT, { stroke: INK, strokeWidth: 0.8, fill: "#ffffff" })];

  const cell = (x, y, width, label, value, { emphasise = false } = {}) => {
    parts.push(text(x + 4, y + 9, label, { size: 4.8, fill: INK_LIGHT, anchor: "start" }));
    parts.push(
      text(x + 4, y + 19, clip(value, width), {
        size: emphasise ? 7.2 : 6.5,
        fill: emphasise ? accent : INK,
        anchor: "start",
        bold: true,
      }),
    );
  };

  const columns = [0.4, 0.24, 0.18, 0.18].map((share) => share * boxWidth);
  const [c1, c2, c3, c4] = columns;

  // Górny wiersz: obiekt, inwestor, skala, numer rysunku.
  cell(0, top, c1, "OBIEKT", fields.object);
  cell(c1, top, c2, "INWESTOR", fields.investor);
  cell(c1 + c2, top, c3, "SKALA", fields.scaleLabel);
  cell(c1 + c2 + c3, top, c4, "NR RYSUNKU", fields.drawingNo);

  // Dolny wiersz: tytuł rysunku (wyróżniony), wykonawca, data.
  cell(0, top + rowHeight, c1, "RYSUNEK", fields.title, { emphasise: true });
  cell(c1, top + rowHeight, c2, "WYKONAWCA", fields.contractor);
  cell(c1 + c2, top + rowHeight, c3 + c4, "DATA", fields.date);

  // Linie siatki: poziom między wierszami i pionowe podziały kolumn.
  parts.push(line(0, top + rowHeight, boxWidth, top + rowHeight, { stroke: INK, width: 0.5 }));
  parts.push(line(c1, top, c1, boxHeight, { stroke: INK, width: 0.5 }));
  parts.push(line(c1 + c2, top, c1 + c2, boxHeight, { stroke: INK, width: 0.5 }));
  // Podział skala/nr rysunku istnieje tylko w górnym wierszu — na dole DATA
  // zajmuje obie kolumny.
  parts.push(line(c1 + c2 + c3, top, c1 + c2 + c3, top + rowHeight, { stroke: INK, width: 0.5 }));

  return parts.join("");
}

export function svgDocument(widthPt, heightPt, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(widthPt)}" height="${num(heightPt)}" viewBox="0 0 ${num(widthPt)} ${num(heightPt)}">${body}</svg>`;
}
