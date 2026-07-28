// Obróbki blacharskie i orynnowanie — długości bieżące i liczby sztuk.
//
// Długości wynikają z geometrii budynku i dachu (te same funkcje, których używa
// scena), a nie z osobnych założeń — dzięki temu zestawienie zgadza się z modelem.

import {
  FLASHING_COLORS,
  FLASHING_PACKAGES,
  GUTTER_COLORS,
  GUTTER_DOWNSPOUT_SIZES,
  GUTTER_PACKAGES,
  GUTTER_PROFILES,
} from "@/config/catalog";
import { roofFootprint, wallTopHeightAt } from "@/scene/geometry";
import { isGableRoof, roofMetrics, slopedRoofLength } from "@/scene/roofMath";
import { effectiveFrontOverhangM } from "@/scene/frontProjectionMath";

// Hak rynnowy co 0,6 m, opaska rury co 1,5 m (za opisem pakietów w katalogu).
const GUTTER_BRACKET_SPACING_M = 0.6;
const DOWNSPOUT_CLAMP_SPACING_M = 1.5;

function resolveLabel(map, key, fallbackLabel) {
  const entry = map?.[key];
  if (!entry) return fallbackLabel;
  return typeof entry === "string" ? entry : entry.label;
}

export function accessoryBom(config) {
  const { widthM, lengthM } = config.dimensions;
  const metrics = roofMetrics(config);
  const footprint = roofFootprint(config);
  const gable = isGableRoof(config.roof.type);
  const perimeterM = 2 * (widthM + lengthM);

  // Cokół (listwa startowa) biegnie po całym obwodzie u dołu ścian.
  const plinthM = perimeterM;
  // Narożniki pionowe — 4 krawędzie o wysokości najwyższego punktu ściany.
  const cornerHeights = [
    Math.max(wallTopHeightAt("front", -widthM / 2, config), wallTopHeightAt("left", lengthM / 2, config)),
    Math.max(wallTopHeightAt("front", widthM / 2, config), wallTopHeightAt("right", lengthM / 2, config)),
    Math.max(wallTopHeightAt("back", -widthM / 2, config), wallTopHeightAt("left", -lengthM / 2, config)),
    Math.max(wallTopHeightAt("back", widthM / 2, config), wallTopHeightAt("right", -lengthM / 2, config)),
  ];
  const cornersM = cornerHeights.reduce((sum, height) => sum + height, 0);

  const { eaveM, verjeM, ridgeM } = roofEdgeLengths(config, metrics, footprint, gable);

  // Opaski otworów: obwód każdego otworu ściennego.
  const openingTrimM = config.openings
    .filter((opening) => opening.wall !== "roof")
    .reduce((sum, opening) => sum + 2 * (opening.widthM + opening.heightM), 0);

  const flashings = config.flashings ?? {};
  const flashingEnabled = flashings.enabled !== false;
  const items = [
    { label: "Cokół / listwa startowa", lengthM: plinthM, included: flashingEnabled },
    { label: "Narożniki zewnętrzne", lengthM: cornersM, included: flashingEnabled && flashings.corners !== false },
    { label: "Pas nadrynnowy / okapowy", lengthM: eaveM, included: flashingEnabled && flashings.roofEdges !== false },
    { label: "Wiatrownice (krawędzie boczne dachu)", lengthM: verjeM, included: flashingEnabled && flashings.roofEdges !== false },
    { label: "Obróbka kalenicy", lengthM: ridgeM, included: flashingEnabled && gable && flashings.ridge !== false },
    { label: "Opaski otworów", lengthM: openingTrimM, included: flashingEnabled },
  ].filter((item) => item.included && item.lengthM > 0.01);

  return {
    flashings: {
      enabled: flashingEnabled,
      packageLabel: resolveLabel(FLASHING_PACKAGES, flashings.package, "—"),
      colorLabel: resolveLabel(FLASHING_COLORS, flashings.color, "—"),
      items,
      totalLengthM: items.reduce((sum, item) => sum + item.lengthM, 0),
    },
    gutters: gutterBom(config, metrics, footprint, gable),
  };
}

// Krawędzie dachu: okap (przy rynnie), wiatrownica (szczyt połaci), kalenica.
function roofEdgeLengths(config, metrics, footprint, gable) {
  const { roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } = footprint;
  const type = config.roof.type;
  const slope = (run) => slopedRoofLength(run, metrics.angle);

  if (type === "single_back" || type === "single_front") {
    return { eaveM: roofWidth, verjeM: 2 * slope(roofLength), ridgeM: 0 };
  }
  if (type === "single_right" || type === "single_left") {
    return { eaveM: roofLength, verjeM: 2 * slope(roofWidth), ridgeM: 0 };
  }
  if (type === "gable_front_back") {
    return { eaveM: 2 * roofWidth, verjeM: 2 * (slope(frontRun) + slope(backRun)), ridgeM: roofWidth };
  }
  return { eaveM: 2 * roofLength, verjeM: 2 * (slope(leftRun) + slope(rightRun)), ridgeM: gable ? roofLength : 0 };
}

function gutterBom(config, metrics, footprint, gable) {
  const gutters = config.gutters ?? {};
  const enabled = gutters.enabled !== false;
  const { roofWidth, roofLength } = footprint;
  const type = config.roof.type;

  // Rynna biegnie tylko po krawędziach okapowych (tam gdzie spływa woda).
  let runs = [];
  if (type === "single_back" || type === "single_front") {
    runs = [{ label: type === "single_back" ? "Okap tylny" : "Okap przedni", lengthM: roofWidth }];
  } else if (type === "single_right" || type === "single_left") {
    runs = [{ label: type === "single_right" ? "Okap prawy" : "Okap lewy", lengthM: roofLength }];
  } else if (type === "gable_front_back") {
    runs = [
      { label: "Okap przedni", lengthM: roofWidth },
      { label: "Okap tylny", lengthM: roofWidth },
    ];
  } else {
    runs = [
      { label: "Okap lewy", lengthM: roofLength },
      { label: "Okap prawy", lengthM: roofLength },
    ];
  }

  const gutterLengthM = runs.reduce((sum, run) => sum + run.lengthM, 0);
  // Jedna rura spustowa na każdy koniec rynny, ale nie rzadziej niż co ~12 m.
  const downspoutCount = enabled
    ? runs.reduce((sum, run) => sum + Math.max(1, Math.ceil(run.lengthM / 12)), 0)
    : 0;
  const eaveHeightM = metrics.eaveHeight;
  const downspoutLengthM = downspoutCount * (eaveHeightM + 0.35);

  return {
    enabled,
    packageLabel: resolveLabel(GUTTER_PACKAGES, gutters.package, "—"),
    profileLabel: resolveLabel(GUTTER_PROFILES, gutters.profile, "—"),
    colorLabel: resolveLabel(GUTTER_COLORS, gutters.color, "—"),
    sizeMm: gutters.size ?? null,
    downspoutSizeMm: gutters.downspoutSize ?? null,
    downspoutSizeLabel:
      GUTTER_DOWNSPOUT_SIZES.find((entry) => entry.value === gutters.downspoutSize)?.label ??
      (gutters.downspoutSize ? `Ø ${gutters.downspoutSize} mm` : "—"),
    runs,
    gutterLengthM: enabled ? gutterLengthM : 0,
    bracketCount: enabled ? Math.ceil(gutterLengthM / GUTTER_BRACKET_SPACING_M) : 0,
    downspoutCount,
    downspoutLengthM,
    clampCount: enabled ? Math.ceil(downspoutLengthM / DOWNSPOUT_CLAMP_SPACING_M) : 0,
    leafGuards: Boolean(enabled && gutters.leafGuards),
    // Wypust frontowy wydłuża wysięg dachu — rynna przenosi się na jego czoło.
    frontOverhangM: effectiveFrontOverhangM(config),
    gable,
  };
}
