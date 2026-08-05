// Rzut z góry: obrys budynku i dachu, siatka konstrukcji, otwory, linie wymiarowe.
// Rysunek powstaje z tego samego modelu, który renderuje scenę 3D.

import { roofFootprint } from "@/scene/geometry";
import { frontProjectionDepth } from "@/scene/frontProjectionMath";
import { openingWallCoord } from "@/scene/structure/openings";
import {
  ACCENT,
  DIM,
  INK,
  INK_LIGHT,
  STEEL,
  TITLE_BLOCK_HEIGHT,
  createProjector,
  dimLineH,
  dimLineV,
  drawingScaleLabel,
  formatMetersLabel,
  line,
  rect,
  svgDocument,
  text,
  titleBlock,
} from "@/lib/drawings/svgPrimitives";

// Elementy pionowe (słupy) rysujemy jako kwadraciki, poziome jako linie.
const VERTICAL_ROLES = new Set(["cornerPost", "post", "column", "wallPost", "endPost", "overOpeningPost", "projectionPost", "openingJamb"]);

/**
 * @param {object} [options]
 * @param {number} [options.widthPt]  domyślnie szerokość kolumny tekstu w PDF —
 *   dokument osadza rysunek 1:1, więc jednostka SVG = punkt PDF i skala jest prawdziwa
 * @param {string} [options.accent]   kolor akcentu firmy
 * @param {object} [options.sheet]    pola tabelki rysunkowej; bez nich tabelki nie ma
 */
export function planSvg(config, model, { widthPt = 515, heightPt = 340, accent = ACCENT, sheet = null } = {}) {
  const { widthM, lengthM } = config.dimensions;
  const footprint = roofFootprint(config);
  const projectionM = frontProjectionDepth(config);

  // Rysunek żyje nad tabelką — inaczej linie wymiarowe wchodziłyby pod nią.
  const contentHeight = sheet ? heightPt - TITLE_BLOCK_HEIGHT : heightPt;
  const worldWidth = Math.max(footprint.roofWidth, widthM) + 1.6;
  const worldHeight = Math.max(footprint.roofLength + projectionM, lengthM) + 1.6;
  const padding = { left: 34, right: 18, top: 20, bottom: 34 };
  const projector = createProjector({
    worldWidth,
    worldHeight,
    boxWidth: widthPt,
    boxHeight: contentHeight,
    padding,
    snapScale: Boolean(sheet),
  });

  // Świat: x ∈ [-worldWidth/2, worldWidth/2] → u = x + worldWidth/2
  const ux = (x) => projector.x(x + worldWidth / 2);
  const vz = (z) => projector.y(z + worldHeight / 2 - projectionM / 2);

  const parts = [];

  // Obrys dachu (z wysięgami) linią przerywaną.
  parts.push(
    rect(
      ux(footprint.centerX - footprint.roofWidth / 2),
      vz(footprint.centerZ + footprint.roofLength / 2 + projectionM),
      projector.length(footprint.roofWidth),
      projector.length(footprint.roofLength + projectionM),
      { stroke: DIM, strokeWidth: 0.6 },
    ),
  );
  parts.push(text(ux(footprint.centerX - footprint.roofWidth / 2) + 2, vz(footprint.centerZ + footprint.roofLength / 2 + projectionM) - 3, "obrys dachu", { size: 5.5, fill: DIM, anchor: "start" }));

  // Obrys ścian.
  parts.push(rect(ux(-widthM / 2), vz(lengthM / 2), projector.length(widthM), projector.length(lengthM), { stroke: INK, strokeWidth: 1.2, fill: "#ffffff" }));

  // Wypust frontowy — kontur wysunięcia.
  if (projectionM > 0) {
    parts.push(
      rect(ux(-widthM / 2), vz(lengthM / 2 + projectionM), projector.length(widthM), projector.length(projectionM), {
        stroke: accent,
        strokeWidth: 0.9,
        fill: "none",
      }),
    );
    parts.push(text(ux(0), vz(lengthM / 2 + projectionM / 2) + 2, `wypust ${formatMetersLabel(projectionM)}`, { size: 5.5, fill: accent }));
  }

  // Konstrukcja w rzucie.
  model.members.forEach((member) => {
    const [x1, , z1] = member.start;
    const [x2, , z2] = member.end;
    if (VERTICAL_ROLES.has(member.role) && Math.hypot(x2 - x1, z2 - z1) < 0.02) {
      const size = Math.max(2, projector.length(member.sizeM));
      parts.push(rect(ux(x1) - size / 2, vz(z1) - size / 2, size, size, { stroke: STEEL, fill: STEEL, strokeWidth: 0.4 }));
      return;
    }
    const isRoofMember = member.role === "rafter" || member.role === "purlin" || member.role === "ridge" || member.role === "eaveStrut" || member.role === "ridgePurlin" || member.role === "projectionRafter" || member.role === "projectionPurlin";
    if (!isRoofMember) return;
    parts.push(
      line(ux(x1), vz(z1), ux(x2), vz(z2), {
        stroke: member.role === "rafter" || member.role === "projectionRafter" ? STEEL : INK_LIGHT,
        width: member.role === "rafter" || member.role === "projectionRafter" ? 1 : 0.5,
      }),
    );
  });

  // Otwory jako grube odcinki na obrysie ścian.
  config.openings
    .filter((opening) => opening.wall !== "roof")
    .forEach((opening) => {
      const coord = openingWallCoord(opening);
      const half = opening.widthM / 2;
      if (opening.wall === "front" || opening.wall === "back") {
        const z = opening.wall === "front" ? lengthM / 2 : -lengthM / 2;
        parts.push(line(ux(coord - half), vz(z), ux(coord + half), vz(z), { stroke: accent, width: 2.6 }));
      } else {
        const x = opening.wall === "right" ? widthM / 2 : -widthM / 2;
        parts.push(line(ux(x), vz(coord - half), ux(x), vz(coord + half), { stroke: accent, width: 2.6 }));
      }
    });

  // Wymiary zewnętrzne.
  parts.push(dimLineH(ux(-widthM / 2), ux(widthM / 2), contentHeight - 12, formatMetersLabel(widthM)));
  parts.push(dimLineV(vz(-lengthM / 2), vz(lengthM / 2), 22, formatMetersLabel(lengthM)));

  // Rozstaw ram/krokwi jako opis siatki.
  const spec = model.plan.spec;
  const gridLabel =
    spec.kind === "garage"
      ? `krokwie co ${formatMetersLabel(spec.rafterSpacing)}, słupy co ${formatMetersLabel(spec.postSpacing)}`
      : `ramy co ${formatMetersLabel(spec.baySpacing)}, słupki co ${formatMetersLabel(spec.wallPostSpacing)}`;
  parts.push(text(widthPt - 6, 12, gridLabel, { size: 6, fill: INK_LIGHT, anchor: "end" }));
  parts.push(text(6, 12, "RZUT Z GÓRY", { size: 7.5, fill: INK, anchor: "start", bold: true }));

  if (sheet) {
    parts.push(
      titleBlock(
        widthPt,
        heightPt,
        { ...sheet, title: "RZUT Z GÓRY", scaleLabel: drawingScaleLabel(projector.scaleDenominator) },
        { accent },
      ),
    );
  }

  return svgDocument(widthPt, heightPt, parts.join(""));
}
