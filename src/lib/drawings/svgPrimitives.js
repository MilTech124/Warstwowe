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

/**
 * Skala odwzorowująca prostokąt świata na obszar rysunku (w punktach),
 * z zachowaniem proporcji. Oś Y jest odwracana, bo w SVG rośnie w dół.
 */
export function createProjector({ worldWidth, worldHeight, boxWidth, boxHeight, padding }) {
  const usableWidth = boxWidth - padding.left - padding.right;
  const usableHeight = boxHeight - padding.top - padding.bottom;
  const scale = Math.min(usableWidth / worldWidth, usableHeight / worldHeight);
  const offsetX = padding.left + (usableWidth - worldWidth * scale) / 2;
  const offsetY = padding.top + (usableHeight - worldHeight * scale) / 2;

  return {
    scale,
    // u, v w układzie świata liczone od lewego-dolnego narożnika prostokąta.
    x: (u) => offsetX + u * scale,
    y: (v) => offsetY + (worldHeight - v) * scale,
    length: (value) => value * scale,
  };
}

export function svgDocument(widthPt, heightPt, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${num(widthPt)}" height="${num(heightPt)}" viewBox="0 0 ${num(widthPt)} ${num(heightPt)}">${body}</svg>`;
}
