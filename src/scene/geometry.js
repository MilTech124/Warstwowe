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

// Transformacja otworu dachowego do lokalnego układu połaci dachu.
// Środek otworu = (0,0,0), X = wzdłuż okna, Y = w górę połaci, Z = normala na zewnątrz.
export function roofOpeningTransform(opening, config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const footprint = roofFootprint(config);
  const normalOffset = 0.075;
  const safeX = MathUtils.clamp(opening.offsetM, -widthM / 2 + opening.widthM / 2 + 0.25, widthM / 2 - opening.widthM / 2 - 0.25);
  const safeZ = MathUtils.clamp(opening.sillM, -lengthM / 2 + opening.heightM / 2 + 0.25, lengthM / 2 - opening.heightM / 2 - 0.25);

  if (config.roof.type === "single_back" || config.roof.type === "single_front") {
    const angle = config.roof.type === "single_back" ? -metrics.angle : metrics.angle;
    const t = (footprint.centerZ + lengthM / 2) / lengthM;
    const visibleY = wallHeightM + (config.roof.type === "single_back" ? t : 1 - t) * metrics.rise - 0.03;
    return {
      position: [footprint.centerX, visibleY, footprint.centerZ],
      rotation: [angle, 0, 0],
      localPosition: [safeX - footprint.centerX, normalOffset, safeZ - footprint.centerZ],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  if (config.roof.type === "single_right" || config.roof.type === "single_left") {
    const angle = config.roof.type === "single_right" ? -metrics.angle : metrics.angle;
    const t = (footprint.centerX + widthM / 2) / widthM;
    const visibleY = wallHeightM + (config.roof.type === "single_left" ? t : 1 - t) * metrics.rise - 0.03;
    return {
      position: [footprint.centerX, visibleY, footprint.centerZ],
      rotation: [0, 0, angle],
      localPosition: [safeX - footprint.centerX, normalOffset, safeZ - footprint.centerZ],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  if (config.roof.type === "gable_front_back") {
    const front = safeZ >= 0;
    const run = front ? footprint.frontRun : footprint.backRun;
    const slabLength = slopedRoofLength(run, metrics.angle);
    const centerZ = front ? footprint.frontRun / 2 : -footprint.backRun / 2;
    return {
      position: [footprint.centerX, wallHeightM + metrics.rise / 2 - 0.03, centerZ],
      rotation: [front ? -metrics.angle : metrics.angle, 0, 0],
      localPosition: [safeX - footprint.centerX, normalOffset, MathUtils.clamp(safeZ - centerZ, -slabLength / 2 + opening.heightM / 2, slabLength / 2 - opening.heightM / 2)],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  const right = safeX >= 0;
  const run = right ? footprint.rightRun : footprint.leftRun;
  const slabWidth = slopedRoofLength(run, metrics.angle);
  const centerX = right ? footprint.rightRun / 2 : -footprint.leftRun / 2;
  return {
    position: [centerX, wallHeightM + metrics.rise / 2 - 0.03, footprint.centerZ],
    rotation: [0, 0, right ? -metrics.angle : metrics.angle],
    localPosition: [MathUtils.clamp(safeX - centerX, -slabWidth / 2 + opening.widthM / 2, slabWidth / 2 - opening.widthM / 2), normalOffset, safeZ - footprint.centerZ],
    localRotation: [-Math.PI / 2, 0, 0],
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
