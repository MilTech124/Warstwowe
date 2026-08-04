// Przekrój przez ramę: słupy, krokwie, płatwie i belka kalenicowa z oznaczeniami
// profili — rysunek warsztatowy do dokumentu zamówienia.

import { frameAxes, roofYOnRun } from "@/scene/structure/axes";
import { structureInputs } from "@/scene/structure/inputs";
import {
  ACCENT,
  DIM,
  INK,
  INK_LIGHT,
  STEEL,
  createProjector,
  dimLineH,
  dimLineV,
  formatMetersLabel,
  line,
  rect,
  svgDocument,
  text,
} from "@/lib/drawings/svgPrimitives";

// Elementy leżące w płaszczyźnie ramy (wzdłuż osi spadu).
const IN_FRAME_ROLES = new Set(["cornerPost", "post", "column", "overOpeningPost", "rafter", "haunch", "collarTie", "kneeBrace", "endPost"]);
// Elementy przebijające ramę prostopadle — rysowane jako przekroje.
const CROSS_ROLES = new Set(["purlin", "ridge", "eaveStrut", "ridgePurlin", "topRail", "sillRail", "midGirt", "girt"]);

export function frameSvg(config, model, { widthPt = 470, heightPt = 270 } = {}) {
  const inputs = structureInputs(config);
  const { runAxis } = frameAxes(inputs);
  const { plan } = model;
  const spec = plan.spec;
  const runSpan = plan.runSpan;
  const runHalf = runSpan / 2;

  // Współrzędna wzdłuż osi spadu i wysokość — to definiuje płaszczyznę przekroju.
  const runOf = (point) => (runAxis === "x" ? point[0] : point[2]);
  const longOf = (point) => (runAxis === "x" ? point[2] : point[0]);

  // Rama odniesienia: linia najbliższa środkowi budynku.
  const frameLine = plan.framePositions.reduce((best, coord) => (Math.abs(coord) < Math.abs(best) ? coord : best), plan.framePositions[0] ?? 0);

  const topY = Math.max(roofYOnRun(-runHalf, inputs), roofYOnRun(0, inputs), roofYOnRun(runHalf, inputs));
  const worldWidth = runSpan + 1.6;
  const worldHeight = topY + 0.9;
  const padding = { left: 36, right: 60, top: 24, bottom: 34 };
  const projector = createProjector({ worldWidth, worldHeight, boxWidth: widthPt, boxHeight: heightPt, padding });

  const ux = (run) => projector.x(run + worldWidth / 2);
  const vy = (y) => projector.y(y);

  const parts = [];
  parts.push(line(ux(-worldWidth / 2 + 0.2), vy(0), ux(worldWidth / 2 - 0.2), vy(0), { stroke: INK, width: 1.1 }));

  const inThisFrame = (member) => Math.abs(longOf(member.start) - frameLine) < 0.35 && Math.abs(longOf(member.end) - frameLine) < 0.35;

  // Elementy w płaszczyźnie ramy.
  model.members
    .filter((member) => IN_FRAME_ROLES.has(member.role) && inThisFrame(member))
    .forEach((member) => {
      const width = Math.max(1.2, projector.length(member.sizeM) * 0.9);
      parts.push(
        line(ux(runOf(member.start)), vy(member.start[1]), ux(runOf(member.end)), vy(member.end[1]), {
          stroke: STEEL,
          width,
        }),
      );
    });

  // Przekroje elementów prostopadłych — kwadraciki na siatce rozstawu.
  const crossSections = new Map();
  model.members
    .filter((member) => CROSS_ROLES.has(member.role))
    .forEach((member) => {
      const run = runOf(member.start);
      const y = member.start[1];
      const key = `${member.role}|${run.toFixed(2)}|${y.toFixed(2)}`;
      if (!crossSections.has(key)) crossSections.set(key, { run, y, member });
    });

  crossSections.forEach(({ run, y, member }) => {
    const size = Math.max(1.8, projector.length(member.sizeM));
    parts.push(rect(ux(run) - size / 2, vy(y) - size / 2, size, size, { stroke: INK_LIGHT, fill: "#ffffff", strokeWidth: 0.5 }));
  });

  // Opisy profili — tylko kluczowe role, żeby rysunek pozostał czytelny.
  const isGarage = spec.kind === "garage";
  const callouts = isGarage
    ? [
        ["Słup narożny", spec.profiles.cornerPost],
        ["Słup pośredni", spec.profiles.post],
        ["Krokiew", spec.profiles.rafter],
        ["Płatew", spec.profiles.purlin],
        ["Rygiel górny / podwalina", spec.profiles.topRail],
      ]
    : [
        ["Słup ramy", spec.profiles.column],
        ["Rygiel ramy", spec.profiles.rafter],
        ["Płatew", spec.profiles.purlin],
        ["Słupek ściany", spec.profiles.wallPost],
        ["Rygiel ścienny", spec.profiles.girt],
      ];

  callouts.forEach(([label, profile], index) => {
    if (!profile) return;
    const y = 30 + index * 11;
    parts.push(rect(widthPt - 56, y - 5, 6, 6, { stroke: STEEL, fill: STEEL, strokeWidth: 0.4 }));
    parts.push(text(widthPt - 47, y, `${label}`, { size: 5.6, fill: INK_LIGHT, anchor: "start" }));
    parts.push(text(widthPt - 47, y + 6, profile.label, { size: 6.2, fill: INK, anchor: "start", bold: true }));
  });

  // Wymiary rozpiętości i wysokości.
  parts.push(dimLineH(ux(-runHalf), ux(runHalf), heightPt - 10, `rozpiętość ${formatMetersLabel(runSpan)}`));
  parts.push(dimLineV(vy(0), vy(roofYOnRun(-runHalf, inputs)), 24, formatMetersLabel(roofYOnRun(-runHalf, inputs))));
  parts.push(
    text(ux(0), vy(topY) - 5, `${spec.reinforcement.label} · strefa śniegowa ${spec.snowZone}`, {
      size: 6,
      fill: ACCENT,
    }),
  );

  parts.push(text(6, 12, "PRZEKRÓJ RAMY", { size: 7.5, fill: INK, anchor: "start", bold: true }));
  parts.push(
    text(widthPt - 6, 12, isGarage ? `krokwie co ${formatMetersLabel(spec.rafterSpacing)}` : `ramy co ${formatMetersLabel(spec.baySpacing)}`, {
      size: 6,
      fill: DIM,
      anchor: "end",
    }),
  );

  return svgDocument(widthPt, heightPt, parts.join(""));
}
