import {
  DEFAULT_FRONT_PROJECTION,
  FRONT_PROJECTION_LIMITS,
  isFrontProjectionAvailable,
} from "../config/frontProjection.js";
import { roofMetrics, slopedRoofLength } from "./roofMath.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function frontProjectionDepth(config) {
  if (!isFrontProjectionAvailable(config?.preset)) return 0;
  const requested = Number(config?.frontProjection?.depthM ?? DEFAULT_FRONT_PROJECTION.depthM);
  if (!Number.isFinite(requested)) return DEFAULT_FRONT_PROJECTION.depthM;
  return clamp(requested, FRONT_PROJECTION_LIMITS.minM, FRONT_PROJECTION_LIMITS.maxM);
}

export function effectiveFrontOverhangM(config) {
  return Math.max(0, Number(config?.roof?.overhangM?.front) || 0) + frontProjectionDepth(config);
}

// Wysokość nominalnej powierzchni połaci. Funkcja celowo ekstrapoluje płaszczyznę
// przed front budynku, dzięki czemu wypust zachowuje ten sam spad co główny dach.
export function roofSurfaceYAt(x, z, config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const { rise } = roofMetrics(config);
  const type = config.roof.type;

  if (type === "single_back") {
    return wallHeightM + ((z + lengthM / 2) / lengthM) * rise;
  }
  if (type === "single_front") {
    return wallHeightM + (1 - (z + lengthM / 2) / lengthM) * rise;
  }
  if (type === "single_right") {
    return wallHeightM + (1 - (x + widthM / 2) / widthM) * rise;
  }
  if (type === "single_left") {
    return wallHeightM + ((x + widthM / 2) / widthM) * rise;
  }
  if (type === "gable_front_back") {
    return wallHeightM + rise * (1 - Math.abs(z) / (lengthM / 2));
  }
  return wallHeightM + rise * (1 - Math.abs(x) / (widthM / 2));
}

export function frontProjectionSideProfiles(config, roofClearanceM = 0.035) {
  const depthM = frontProjectionDepth(config);
  if (depthM <= 0) return [];
  const { widthM, lengthM } = config.dimensions;
  const zStart = lengthM / 2;
  const zEnd = zStart + depthM;

  return [
    { side: "left", x: -widthM / 2, zStart, zEnd },
    { side: "right", x: widthM / 2, zStart, zEnd },
  ].map((profile) => ({
    ...profile,
    depthM,
    startTopY: roofSurfaceYAt(profile.x, zStart, config) - roofClearanceM,
    endTopY: roofSurfaceYAt(profile.x, zEnd, config) - roofClearanceM,
  }));
}

function roofUndersideOffsetM(config) {
  const coreThicknessM = Math.max(0.05, (config.cladding?.roofPirThicknessMm ?? 80) / 1000 * 0.7);
  return 0.03 + coreThicknessM + 0.012;
}

function planeAssemblyBetweenX(config, xStart, xEnd, zCenter, depthM, name) {
  const underside = roofUndersideOffsetM(config);
  const yStart = roofSurfaceYAt(xStart, zCenter, config) - underside;
  const yEnd = roofSurfaceYAt(xEnd, zCenter, config) - underside;
  const run = xEnd - xStart;
  const deltaY = yEnd - yStart;
  return {
    name,
    width: Math.hypot(run, deltaY),
    length: depthM,
    position: [(xStart + xEnd) / 2, (yStart + yEnd) / 2, zCenter],
    rotation: [0, 0, Math.atan2(deltaY, run)],
  };
}

function planeAssemblyBetweenZ(config, zStart, zEnd, widthM, name) {
  const underside = roofUndersideOffsetM(config);
  const yStart = roofSurfaceYAt(0, zStart, config) - underside;
  const yEnd = roofSurfaceYAt(0, zEnd, config) - underside;
  const run = zEnd - zStart;
  const deltaY = yEnd - yStart;
  return {
    name,
    width: widthM,
    length: Math.hypot(run, deltaY),
    position: [0, (yStart + yEnd) / 2, (zStart + zEnd) / 2],
    rotation: [-Math.atan2(deltaY, run), 0, 0],
  };
}

export function frontProjectionRoofAssemblies(config) {
  const depthM = frontProjectionDepth(config);
  if (depthM <= 0) return [];
  const { widthM, lengthM } = config.dimensions;
  const zStart = lengthM / 2;
  const zEnd = zStart + depthM;
  const zCenter = (zStart + zEnd) / 2;

  if (config.roof.type === "gable_left_right") {
    return [
      planeAssemblyBetweenX(config, -widthM / 2, 0, zCenter, depthM, "front-projection-lining-left"),
      planeAssemblyBetweenX(config, 0, widthM / 2, zCenter, depthM, "front-projection-lining-right"),
    ];
  }
  if (config.roof.type === "single_left" || config.roof.type === "single_right") {
    return [planeAssemblyBetweenX(config, -widthM / 2, widthM / 2, zCenter, depthM, "front-projection-lining")];
  }
  return [planeAssemblyBetweenZ(config, zStart, zEnd, widthM, "front-projection-lining")];
}

export function frontProjectionPortalFasciaAssemblies(config, fasciaHeightM = 0.18) {
  const depthM = frontProjectionDepth(config);
  if (depthM <= 0) return [];
  const { widthM, lengthM } = config.dimensions;
  const zEnd = lengthM / 2 + depthM;
  const underside = roofUndersideOffsetM(config);
  const segments = config.roof.type === "gable_left_right"
    ? [[-widthM / 2, 0], [0, widthM / 2]]
    : [[-widthM / 2, widthM / 2]];

  return segments.map(([xStart, xEnd], index) => {
    const yStart = roofSurfaceYAt(xStart, zEnd, config) - underside;
    const yEnd = roofSurfaceYAt(xEnd, zEnd, config) - underside;
    const run = xEnd - xStart;
    const angle = Math.atan2(yEnd - yStart, run);
    const roofLineX = (xStart + xEnd) / 2;
    const roofLineY = (yStart + yEnd) / 2;
    return {
      name: `front-projection-portal-fascia-${index}`,
      width: Math.hypot(run, yEnd - yStart) + 0.018,
      height: fasciaHeightM,
      position: [
        roofLineX + Math.sin(angle) * fasciaHeightM / 2,
        roofLineY - Math.cos(angle) * fasciaHeightM / 2,
        zEnd + 0.014,
      ],
      rotation: [0, 0, angle],
    };
  });
}

export function frontProjectionAreas(config) {
  const profiles = frontProjectionSideProfiles(config, 0);
  const outerWallM2 = profiles.reduce(
    (sum, profile) => sum + profile.depthM * Math.max(0, (profile.startTopY + profile.endTopY) / 2),
    0,
  );
  const liningRoofM2 = frontProjectionRoofAssemblies(config)
    .reduce((sum, assembly) => sum + assembly.width * assembly.length, 0);

  return {
    outerWallM2,
    liningSideM2: outerWallM2,
    liningRoofM2,
    liningTotalM2: outerWallM2 + liningRoofM2,
  };
}

export function frontProjectionSlopedDepth(config) {
  const depthM = frontProjectionDepth(config);
  if (depthM <= 0) return 0;
  if (
    config.roof.type === "single_back"
    || config.roof.type === "single_front"
    || config.roof.type === "gable_front_back"
  ) {
    return slopedRoofLength(depthM, roofMetrics(config).angle);
  }
  return depthM;
}
