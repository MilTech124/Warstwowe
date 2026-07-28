// Uporządkowany opis projektu po polsku — jedno źródło treści dla zakładki
// „Konstrukcja" w panelu i dla dokumentu zamówienia (PDF).
//
// Etykiety pochodzą z katalogu (catalog.js) i z tabel profili — nic nie jest
// zapisywane po raz drugi, więc opis nie rozjedzie się z konfiguracją.

import {
  GATE_PATTERNS,
  GATE_STRUCTURES,
  GATE_TYPES,
  PRESETS,
  ROOF_TYPES,
  WINDOW_GLASS_TYPES,
  getDoorColor,
  getDoorModel,
  getGateColor,
  getGateManufacturer,
  getGateModel,
  getWindowFrameColor,
  getWindowModel,
} from "@/config/catalog";
import { getFrontProjectionFinish } from "@/config/frontProjection";
import { LIGHTING_LABELS } from "@/config/lighting";
import { roleLabel } from "@/config/steelProfiles";
import { openingTitle, openingWallLabel } from "@/lib/openingLabels";
import { accessoryBom } from "@/lib/bom/accessoryBom";
import { panelBom } from "@/lib/bom/panelBom";
import { steelBom, steelOrderByProfile } from "@/lib/bom/steelBom";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureClassLabel, STRUCTURE_CLASSES } from "@/scene/structure/classes";
import { structureInputs } from "@/scene/structure/inputs";
import { frontProjectionDepth } from "@/scene/frontProjectionMath";

export function formatM(value, digits = 2) {
  return `${Number(value).toFixed(digits).replace(".", ",")} m`;
}

export function formatM2(value, digits = 1) {
  return `${Number(value).toFixed(digits).replace(".", ",")} m²`;
}

export function formatKg(value) {
  return `${Number(value).toFixed(0).replace(".", ",")} kg`;
}

export function formatNumber(value, digits = 2) {
  return Number(value).toFixed(digits).replace(".", ",");
}

/**
 * Pełny obraz projektu: model konstrukcji, zestawienia i gotowe do wydruku
 * sekcje opisowe.
 */
export function projectSummary(config) {
  const inputs = structureInputs(config);
  const model = buildStructure(inputs);
  const panels = panelBom(config);
  const accessories = accessoryBom(config);
  const steel = steelBom(model);
  const steelOrder = steelOrderByProfile(steel);

  return {
    model,
    panels,
    accessories,
    steel,
    steelOrder,
    building: buildingSection(config, panels),
    roof: roofSection(config, panels),
    frontProjection: frontProjectionSection(config, panels),
    cladding: claddingSection(panels),
    accessorySection: accessorySection(accessories),
    lighting: lightingSection(config),
    openings: openingRows(config),
    structure: structureSection(model, steel),
    warnings: model.warnings,
  };
}

function lightingSection(config) {
  const lighting = config.lighting ?? {};
  const enabled = Object.entries(LIGHTING_LABELS)
    .filter(([key]) => Boolean(lighting[key]));
  const gateCount = config.openings.filter((opening) => opening.kind === "gate").length;

  return {
    title: "Oświetlenie",
    rows: enabled.length > 0
      ? enabled.map(([key, label]) => [
          label,
          key === "gateLamps" ? `włączone, ${gateCount} szt.` : "włączone",
        ])
      : [["Wyposażenie oświetleniowe", "bez oświetlenia"]],
  };
}

function buildingSection(config, panels) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  return {
    title: "Opis obiektu",
    rows: [
      ["Typ obiektu", PRESETS[config.preset]?.label ?? config.preset],
      ["Szerokość × długość", `${formatNumber(widthM)} × ${formatNumber(lengthM)} m`],
      ["Wysokość ścianki", formatM(wallHeightM)],
      ["Powierzchnia zabudowy", formatM2(panels.footprint.buildingAreaM2)],
      ["Powierzchnia dachu w rzucie", formatM2(panels.footprint.roofPlanAreaM2)],
      ["Wysokość w okapie", formatM(panels.roof.eaveHeightM)],
      ["Wysokość w kalenicy", formatM(panels.roof.ridgeHeightM)],
    ],
  };
}

function roofSection(config, panels) {
  const { overhangM } = config.roof;
  return {
    title: "Dach",
    rows: [
      ["Typ dachu", ROOF_TYPES[config.roof.type] ?? config.roof.type],
      ["Spadek", `${formatNumber(config.roof.pitchPercent, 0)}% (${formatNumber(panels.roof.angleDeg, 1)}°)`],
      ["Wzniesienie połaci", formatM(panels.roof.riseM)],
      [
        "Wysięgi (przód / tył / lewo / prawo)",
        `${formatNumber(overhangM.front)} / ${formatNumber(overhangM.back)} / ${formatNumber(overhangM.left)} / ${formatNumber(overhangM.right)} m`,
      ],
      ["Powierzchnia połaci (po spadzie)", formatM2(panels.roof.grossM2)],
    ],
  };
}

function frontProjectionSection(config, panels) {
  const depthM = frontProjectionDepth(config);
  if (depthM <= 0) return null;

  const finish = getFrontProjectionFinish(config.frontProjection?.liningFinish);
  return {
    title: "Wypust frontowy",
    rows: [
      ["Głębokość wypustu", formatM(depthM)],
      ["Wykończenie podbitki", finish.label],
      ["Poszycie ścian bocznych wypustu", formatM2(panels.frontProjection.outerWallM2)],
      ["Podbitka sufitowa", formatM2(panels.frontProjection.liningRoofM2)],
      ["Podbitka razem", formatM2(panels.frontProjection.liningTotalM2)],
    ],
  };
}

function claddingSection(panels) {
  const { wall, roof } = panels;
  return {
    title: "Poszycie",
    wallRows: [
      ["Producent / model", `${wall.manufacturerLabel} — ${wall.modelLabel}`],
      ["Profil płyty", wall.profileLabel],
      ["Grubość rdzenia PIR", `${wall.thicknessMm} mm`],
      ["Kolor", wall.colorLabel],
      ["Długość handlowa płyt", formatM(wall.panelLengthM, 1)],
      ["Układ", `poziomy, moduł ${formatM(wall.moduleWidthM, 2)}, ${wall.rowCount} pasów`],
      ["Powierzchnia brutto", formatM2(wall.grossM2)],
      ["Odliczenie otworów", formatM2(wall.openingsM2)],
      ["Powierzchnia netto", formatM2(wall.netM2)],
    ],
    roofRows: [
      ["Producent / model", `${roof.manufacturerLabel} — ${roof.modelLabel}`],
      ["Grubość rdzenia PIR", `${roof.thicknessMm} mm`],
      ["Kolor", roof.colorLabel],
      ["Układ płyt", "wzdłuż spadu (żebra prowadzą wodę)"],
      ...roof.slabs.map((slab) => [slab.label, `${formatNumber(slab.runM)} × ${formatNumber(slab.widthM)} m = ${formatM2(slab.areaM2)}`]),
      ["Powierzchnia netto", formatM2(roof.netM2)],
    ],
  };
}

function accessorySection(accessories) {
  const { flashings, gutters } = accessories;
  return {
    title: "Obróbki blacharskie i orynnowanie",
    flashingRows: flashings.enabled
      ? [
          ["Pakiet", flashings.packageLabel],
          ["Kolor", flashings.colorLabel],
          ...flashings.items.map((item) => [item.label, `${formatNumber(item.lengthM, 1)} mb`]),
          ["Razem", `${formatNumber(flashings.totalLengthM, 1)} mb`],
        ]
      : [["Obróbki blacharskie", "nie objęte zamówieniem"]],
    gutterRows: gutters.enabled
      ? [
          ["Pakiet", gutters.packageLabel],
          ["Profil / rozmiar", `${gutters.profileLabel}, ${gutters.sizeMm ? `${gutters.sizeMm} mm` : "—"}`],
          ["Kolor", gutters.colorLabel],
          ["Rynna", `${formatNumber(gutters.gutterLengthM, 1)} mb (${gutters.runs.map((run) => run.label).join(", ")})`],
          ["Haki rynnowe", `${gutters.bracketCount} szt.`],
          ["Rury spustowe", `${gutters.downspoutCount} szt. ${gutters.downspoutSizeLabel}, ${formatNumber(gutters.downspoutLengthM, 1)} mb`],
          ["Obejmy rur", `${gutters.clampCount} szt.`],
          ["Koszki liściaste", gutters.leafGuards ? "tak" : "nie"],
        ]
      : [["Orynnowanie", "nie objęte zamówieniem"]],
  };
}

function openingRows(config) {
  return config.openings.map((opening, index) => {
    const row = {
      title: openingTitle(opening, index),
      kind: opening.kind,
      wall: openingWallLabel(opening.wall),
      sizeText: `${formatNumber(opening.widthM)} × ${formatNumber(opening.heightM)} m`,
      offsetText: formatNumber(opening.offsetM),
      sillText: formatNumber(opening.sillM),
      details: [],
    };

    if (opening.kind === "gate") {
      const model = getGateModel(opening);
      row.product = `${getGateManufacturer(opening).label} ${model.label}`;
      row.details.push(GATE_TYPES[opening.gateType]?.label ?? opening.gateType);
      if (opening.gateType === "sectional") {
        row.details.push(`przetłoczenia: ${GATE_PATTERNS[opening.pattern]?.label ?? opening.pattern}`);
      }
      row.details.push(`struktura: ${GATE_STRUCTURES[opening.structure]?.label ?? opening.structure}`);
      row.colorLabel = getGateColor(opening)?.label ?? "—";
    } else if (opening.kind === "door") {
      const model = getDoorModel(opening);
      row.product = model.label;
      row.details.push(`skrzydeł: ${model.leafCount}`);
      row.details.push(`zawias: ${opening.hinge === "left" ? "lewy" : "prawy"}`);
      row.colorLabel =
        opening.model === "cladding_match" ? "jak poszycie ścian" : getDoorColor(opening)?.label ?? "—";
    } else {
      const model = getWindowModel(opening);
      row.product = model.label;
      // Pole w konfiguracji nazywa się `glassType` (nie `glass`).
      row.details.push(`szyba: ${WINDOW_GLASS_TYPES[opening.glassType]?.label ?? "—"}`);
      if (opening.openMode && opening.openMode !== "closed") {
        row.details.push(`otwieranie: ${opening.openMode === "tilt" ? "uchylne" : "rozwierne"}`);
      }
      row.colorLabel = getWindowFrameColor(opening)?.label ?? "—";
    }

    return row;
  });
}

function structureSection(model, steel) {
  const { plan } = model;
  const spec = plan.spec;
  const isGarage = spec.kind === "garage";

  const rows = [
    ["Klasa konstrukcji", structureClassLabel(plan.structureClass)],
    ["Charakterystyka", STRUCTURE_CLASSES[plan.structureClass]?.description ?? "—"],
    ["Poziom wzmocnienia", spec.reinforcement.label],
    ["Strefa śniegowa", String(spec.snowZone)],
    ["Gatunek stali", spec.steelGrade],
  ];

  if (isGarage) {
    rows.push(
      ["Rozstaw krokwi", `${formatNumber(spec.rafterSpacing)} m (${spec.rafterCount} szt.)`],
      ["Rozstaw słupów ścian", `${formatNumber(spec.postSpacing)} m`],
      ["Rozstaw płatwi", `${formatNumber(spec.purlinSpacing)} m`],
    );
  } else {
    rows.push(
      ["Rozstaw ram", `${formatNumber(spec.baySpacing)} m (${spec.bayCount} szt.)`],
      ["Rozstaw słupków pośrednich ścian", `${formatNumber(spec.wallPostSpacing)} m`],
      ["Rozstaw płatwi", `${formatNumber(spec.purlinSpacing)} m`],
      ["Rozstaw rygli ściennych", `${formatNumber(spec.girtSpacing)} m`],
    );
  }

  rows.push(
    ["Liczba elementów stalowych", `${steel.memberCount} szt.`],
    ["Blachy podstawy", `${steel.plateCount} szt. (${formatNumber(spec.plateThicknessM * 1000, 0)} mm)`],
    ["Masa stali (szacunkowa)", formatKg(steel.totalMassKg)],
  );

  return { title: "Konstrukcja stalowa", rows, profileRows: profileTable(spec, model.members) };
}

// Tabela „rola → profil → rozstaw" — te etykiety profili były dotąd liczone
// i nigdzie nie pokazywane.
/**
 * Tabela „rola → profil → rozstaw".
 *
 * @param {object} spec  plan.spec z modelu konstrukcji
 * @param {Set<string>|Array<object>} [usedRolesFromModel]  zbiór użytych ról albo
 *   lista elementów modelu; bez tego argumentu tabela pokazuje cały dobór.
 */
export function profileTable(spec, usedRolesFromModel) {
  const isGarage = spec.kind === "garage";
  const spacingFor = (role) => {
    if (isGarage) {
      if (role === "post" || role === "sillRail" || role === "topRail" || role === "midGirt") return spec.postSpacing;
      if (role === "rafter") return spec.rafterSpacing;
      if (role === "purlin") return spec.purlinSpacing;
      return null;
    }
    if (role === "column") return spec.baySpacing;
    if (role === "wallPost") return spec.wallPostSpacing;
    if (role === "purlin") return spec.purlinSpacing;
    if (role === "girt") return spec.girtSpacing;
    if (role === "rafter") return spec.baySpacing;
    return null;
  };

  const order = isGarage
    ? ["cornerPost", "post", "sillRail", "topRail", "rakedTopRail", "midGirt", "rafter", "ridge", "purlin", "collarTie", "kneeBrace", "gateFrame"]
    : ["column", "rafter", "purlin", "ridge", "eaveStrut", "wallPost", "endPost", "girt", "sillRail", "haunch", "xBrace", "gateFrame"];

  // Pokazujemy wyłącznie role, które FAKTYCZNIE wystąpiły w modelu. Inaczej
  // tabela obiecywała np. krokiew 100×60×3 w garażu, w którym płatwie leżą wprost
  // na oczepach i żadnej krokwi nie ma.
  const usedRoles = usedRoleSet(spec, usedRolesFromModel);

  const seen = new Set();
  return order
    .filter((role) => spec.profiles[role])
    .filter((role) => usedRoles == null || usedRoles.has(role))
    .filter((role) => {
      const key = `${role}|${spec.profiles[role].id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((role) => {
      const spacing = spacingFor(role);
      return {
        role,
        roleLabel: roleLabel(role),
        profileLabel: spec.profiles[role].label,
        profileKind: spec.profiles[role].kind,
        kgPerM: spec.profiles[role].kgPerM,
        spacingText: spacing ? `co ${formatNumber(spacing)} m` : "—",
      };
    });
}

function usedRoleSet(spec, usedRolesFromModel) {
  if (usedRolesFromModel == null) return null;
  if (usedRolesFromModel instanceof Set) return usedRolesFromModel;
  return new Set(usedRolesFromModel.map((member) => member.role));
}
