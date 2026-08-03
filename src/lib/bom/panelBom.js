// Zapotrzebowanie na płyty warstwowe: powierzchnia ścian netto (bez otworów)
// i rzeczywista (pochylona) powierzchnia połaci dachu.

import {
  WALL_PANEL_DIMENSIONS,
  getCladdingColor,
  getCladdingManufacturer,
  getCladdingModel,
  getCladdingProfile,
  getRoofCladdingColor,
  getRoofCladdingManufacturer,
  getRoofCladdingModel,
  getWallPanelLengthM,
} from "@/config/catalog";
import { roofFootprint, wallTopHeightAt } from "@/scene/wallProfile";
import { isGableRoof, roofMetrics, slopedRoofLength } from "@/scene/roofMath";
import { getFrontProjectionFinish } from "@/config/frontProjection";
import { frontProjectionAreas, frontProjectionDepth } from "@/scene/frontProjectionMath";

const WALLS = ["front", "back", "left", "right"];
const INTEGRATION_STEPS = 400;

function wallSpanM(wall, dimensions) {
  return wall === "front" || wall === "back" ? dimensions.widthM : dimensions.lengthM;
}

// Ściany szczytowe i skośne mają zmienną wysokość — całkujemy numerycznie
// po tym samym profilu, którego używa poszycie (wallTopHeightAt).
function grossWallArea(wall, config) {
  const span = wallSpanM(wall, config.dimensions);
  const step = span / INTEGRATION_STEPS;
  let area = 0;
  for (let index = 0; index < INTEGRATION_STEPS; index += 1) {
    const offset = -span / 2 + step * (index + 0.5);
    area += wallTopHeightAt(wall, offset, config) * step;
  }
  return area;
}

export function panelBom(config) {
  const { widthM, lengthM } = config.dimensions;
  const metrics = roofMetrics(config);
  const footprint = roofFootprint(config);
  const moduleWidthM = WALL_PANEL_DIMENSIONS.moduleWidthM;
  const projectionDepthM = frontProjectionDepth(config);
  const projectionAreas = frontProjectionAreas(config);
  const projectionFinish = getFrontProjectionFinish(config.frontProjection?.liningFinish);

  const walls = WALLS.map((wall) => {
    const grossM2 = grossWallArea(wall, config);
    const openings = config.openings.filter((opening) => opening.wall === wall);
    const openingsM2 = openings.reduce((sum, opening) => sum + opening.widthM * opening.heightM, 0);
    const maxTopM = Math.max(
      wallTopHeightAt(wall, -wallSpanM(wall, config.dimensions) / 2, config),
      wallTopHeightAt(wall, 0, config),
      wallTopHeightAt(wall, wallSpanM(wall, config.dimensions) / 2, config),
    );

    return {
      wall,
      spanM: wallSpanM(wall, config.dimensions),
      maxTopM,
      grossM2,
      openingsM2,
      netM2: Math.max(0, grossM2 - openingsM2),
      openingCount: openings.length,
      // Pasy poziome o module 1 m — tyle rzędów płyt wchodzi na najwyższym punkcie.
      rowCount: Math.max(1, Math.ceil(maxTopM / moduleWidthM)),
    };
  });

  const roofSlabs = roofSlabAreas(config, metrics, footprint);
  const roofOpeningsM2 = config.openings
    .filter((opening) => opening.wall === "roof")
    .reduce((sum, opening) => sum + opening.widthM * opening.heightM, 0);
  const roofGrossM2 = roofSlabs.reduce((sum, slab) => sum + slab.areaM2, 0);

  const baseWallGrossM2 = walls.reduce((sum, entry) => sum + entry.grossM2, 0);
  const baseWallOpeningsM2 = walls.reduce((sum, entry) => sum + entry.openingsM2, 0);
  const baseWallNetM2 = walls.reduce((sum, entry) => sum + entry.netM2, 0);

  return {
    wall: {
      manufacturerLabel: getCladdingManufacturer(config.cladding).label,
      modelLabel: getCladdingModel(config.cladding).label,
      profileLabel: getCladdingProfile(config.cladding).label,
      colorLabel: getCladdingColor(config.cladding).label,
      thicknessMm: config.cladding.wallPirThicknessMm,
      panelLengthM: getWallPanelLengthM(config.cladding),
      moduleWidthM,
      walls,
      grossM2: baseWallGrossM2 + projectionAreas.outerWallM2,
      openingsM2: baseWallOpeningsM2,
      netM2: baseWallNetM2 + projectionAreas.outerWallM2,
      rowCount: Math.max(...walls.map((entry) => entry.rowCount)),
    },
    roof: {
      manufacturerLabel: getRoofCladdingManufacturer(config.cladding).label,
      modelLabel: getRoofCladdingModel(config.cladding).label,
      colorLabel: getRoofCladdingColor(config.cladding).label,
      thicknessMm: config.cladding.roofPirThicknessMm,
      slabs: roofSlabs,
      grossM2: roofGrossM2,
      openingsM2: roofOpeningsM2,
      netM2: Math.max(0, roofGrossM2 - roofOpeningsM2),
      pitchPercent: config.roof.pitchPercent,
      angleDeg: (metrics.angle * 180) / Math.PI,
      riseM: metrics.rise,
      eaveHeightM: metrics.eaveHeight,
      ridgeHeightM: metrics.ridgeHeight,
    },
    frontProjection: {
      enabled: projectionDepthM > 0,
      depthM: projectionDepthM,
      outerWallM2: projectionAreas.outerWallM2,
      liningSideM2: projectionAreas.liningSideM2,
      liningRoofM2: projectionAreas.liningRoofM2,
      liningTotalM2: projectionAreas.liningTotalM2,
      liningFinishId: config.frontProjection?.liningFinish || "golden_oak",
      liningFinishLabel: projectionFinish.label,
    },
    footprint: {
      buildingAreaM2: widthM * lengthM,
      roofPlanAreaM2: footprint.roofWidth * footprint.roofLength,
      volumeM3: widthM * lengthM * config.dimensions.wallHeightM + (widthM * lengthM * metrics.rise) / (isGableRoof(config.roof.type) ? 2 : 2),
    },
  };
}

// Powierzchnia POCHYLONA połaci (do zamówienia płyt), z uwzględnieniem wysięgów.
function roofSlabAreas(config, metrics, footprint) {
  const { roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } = footprint;
  const type = config.roof.type;

  if (type === "single_back" || type === "single_front") {
    const slopedM = slopedRoofLength(roofLength, metrics.angle);
    return [{ label: "Połać jednospadowa", runM: slopedM, widthM: roofWidth, areaM2: slopedM * roofWidth }];
  }

  if (type === "single_right" || type === "single_left") {
    const slopedM = slopedRoofLength(roofWidth, metrics.angle);
    return [{ label: "Połać jednospadowa", runM: slopedM, widthM: roofLength, areaM2: slopedM * roofLength }];
  }

  if (type === "gable_front_back") {
    const front = slopedRoofLength(frontRun, metrics.angle);
    const back = slopedRoofLength(backRun, metrics.angle);
    return [
      { label: "Połać przednia", runM: front, widthM: roofWidth, areaM2: front * roofWidth },
      { label: "Połać tylna", runM: back, widthM: roofWidth, areaM2: back * roofWidth },
    ];
  }

  const right = slopedRoofLength(rightRun, metrics.angle);
  const left = slopedRoofLength(leftRun, metrics.angle);
  return [
    { label: "Połać prawa", runM: right, widthM: roofLength, areaM2: right * roofLength },
    { label: "Połać lewa", runM: left, widthM: roofLength, areaM2: left * roofLength },
  ];
}
