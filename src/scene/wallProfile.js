import { roofMetrics } from "@/scene/roofMath";
import { effectiveFrontOverhangM } from "@/scene/frontProjectionMath";

// Geometria obrysu dachu i profilu ścian — bez zależności od three.js.
//
// Wydzielone z geometry.js, bo zestawienie materiałowe (panelBom, accessoryBom)
// używa tylko tych dwóch funkcji, a import three do funkcji serverless
// dokładałby ~1 MB do każdego zapisu zamówienia. geometry.js re-eksportuje je
// dla zgodności wstecznej.

export function roofFootprint(config) {
  const { widthM, lengthM } = config.dimensions;
  const { front, back, left, right } = config.roof.overhangM;
  const effectiveFront = effectiveFrontOverhangM(config);

  return {
    centerX: (right - left) / 2,
    centerZ: (effectiveFront - back) / 2,
    roofWidth: widthM + left + right,
    roofLength: lengthM + effectiveFront + back,
    frontRun: lengthM / 2 + effectiveFront,
    backRun: lengthM / 2 + back,
    leftRun: widthM / 2 + left,
    rightRun: widthM / 2 + right,
  };
}

export function wallTopHeightAt(side, offset, config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const { rise } = roofMetrics(config);
  const type = config.roof.type;

  if (type === "single_back") {
    if (side === "front") return wallHeightM + rise;
    if (side === "back") return wallHeightM;
    if (side === "left" || side === "right") {
      return wallHeightM + ((offset + lengthM / 2) / lengthM) * rise;
    }
  }

  if (type === "single_front") {
    if (side === "front") return wallHeightM;
    if (side === "back") return wallHeightM + rise;
    if (side === "left" || side === "right") {
      return wallHeightM + (1 - (offset + lengthM / 2) / lengthM) * rise;
    }
  }

  if (type === "single_right") {
    if (side === "right") return wallHeightM;
    if (side === "left") return wallHeightM + rise;
    if (side === "front" || side === "back") {
      return wallHeightM + (1 - (offset + widthM / 2) / widthM) * rise;
    }
  }

  if (type === "single_left") {
    if (side === "left") return wallHeightM;
    if (side === "right") return wallHeightM + rise;
    if (side === "front" || side === "back") {
      return wallHeightM + ((offset + widthM / 2) / widthM) * rise;
    }
  }

  if (type === "gable_left_right" && (side === "front" || side === "back")) {
    const distanceFromRidge = Math.abs(offset) / (widthM / 2);
    return wallHeightM + rise * (1 - Math.min(1, distanceFromRidge));
  }

  if (type === "gable_front_back" && (side === "left" || side === "right")) {
    const distanceFromRidge = Math.abs(offset) / (lengthM / 2);
    return wallHeightM + rise * (1 - Math.min(1, distanceFromRidge));
  }

  return wallHeightM;
}
