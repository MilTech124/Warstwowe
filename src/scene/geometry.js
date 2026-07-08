import { MathUtils, Quaternion, Vector3 } from "three";

export function getStructureClass(dimensions) {
  if (dimensions.widthM >= 12 || dimensions.lengthM >= 20) return "heavy_hall";
  if (dimensions.widthM >= 7) return "portal_hall";
  return "garage_frame";
}

export function getBayPositions(lengthM, structureClass) {
  const spacing = structureClass === "heavy_hall" ? 5.5 : structureClass === "portal_hall" ? 4 : 2;
  const count = Math.max(2, Math.ceil(lengthM / spacing) + 1);
  const start = -lengthM / 2;
  return Array.from({ length: count }, (_, index) => start + (lengthM * index) / (count - 1));
}

export function roofMetrics(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const pitch = config.roof.pitchPercent / 100;
  const singleRun = config.roof.type.includes("right") || config.roof.type.includes("left") ? widthM : lengthM;
  const gableRun = config.roof.type === "gable_front_back" ? lengthM / 2 : widthM / 2;
  const run = config.roof.type.startsWith("gable") ? gableRun : singleRun;
  const rise = Math.max(0.15, run * pitch);
  return {
    pitch,
    rise,
    angle: Math.atan2(rise, run),
    ridgeHeight: wallHeightM + rise,
    eaveHeight: wallHeightM,
  };
}

export function isGableRoof(type) {
  return type === "gable_left_right" || type === "gable_front_back";
}

export function roofPitchBounds(type) {
  return isGableRoof(type) ? { min: 18, max: 45, fallback: 28 } : { min: 3, max: 18, fallback: 7 };
}

export function roofFootprint(config) {
  const { widthM, lengthM } = config.dimensions;
  const { front, back, left, right } = config.roof.overhangM;

  return {
    centerX: (right - left) / 2,
    centerZ: (front - back) / 2,
    roofWidth: widthM + left + right,
    roofLength: lengthM + front + back,
    frontRun: lengthM / 2 + front,
    backRun: lengthM / 2 + back,
    leftRun: widthM / 2 + left,
    rightRun: widthM / 2 + right,
  };
}

export function slopedRoofLength(run, angle) {
  return run / Math.max(0.001, Math.cos(angle));
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

export function wallOpeningTransform(opening, dimensions) {
  const span = opening.wall === "front" || opening.wall === "back" ? dimensions.widthM : dimensions.lengthM;
  const xOrZ = MathUtils.clamp(opening.offsetM, -span / 2 + opening.widthM / 2, span / 2 - opening.widthM / 2);
  const y = opening.sillM + opening.heightM / 2;
  const normalOffset = 0.025;

  if (opening.wall === "front") {
    return { position: [xOrZ, y, dimensions.lengthM / 2 + normalOffset], rotation: [0, 0, 0], horizontal: "x" };
  }
  if (opening.wall === "back") {
    return { position: [-xOrZ, y, -dimensions.lengthM / 2 - normalOffset], rotation: [0, Math.PI, 0], horizontal: "x" };
  }
  if (opening.wall === "left") {
    return { position: [-dimensions.widthM / 2 - normalOffset, y, -xOrZ], rotation: [0, -Math.PI / 2, 0], horizontal: "z" };
  }
  return { position: [dimensions.widthM / 2 + normalOffset, y, xOrZ], rotation: [0, Math.PI / 2, 0], horizontal: "z" };
}

export function quaternionBetween(start, end) {
  const a = new Vector3(...start);
  const b = new Vector3(...end);
  const direction = b.clone().sub(a);
  const quaternion = new Quaternion();
  quaternion.setFromUnitVectors(new Vector3(0, 0, 1), direction.clone().normalize());
  return {
    position: a.add(b).multiplyScalar(0.5).toArray(),
    length: direction.length(),
    quaternion,
  };
}
