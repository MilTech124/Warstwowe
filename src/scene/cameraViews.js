// Kadry kamery jako czysta funkcja konfiguracji.
//
// Wyciągnięte z CameraRig, żeby zrzuty do PDF ustawiały kamerę dokładnie tak samo,
// jak widzi ją użytkownik. Zwraca zwykłe tablice — bez obiektów three.

import { roofFootprint } from "@/scene/geometry";

export const CAMERA_VERTICAL_FOV = (38 * Math.PI) / 180;

export function perspectiveFitDistance(span) {
  return ((span / 2) / Math.tan(CAMERA_VERTICAL_FOV / 2)) * 1.14;
}

function normalize(vector) {
  const length = Math.hypot(...vector) || 1;
  return vector.map((value) => value / length);
}

const ORBIT_DIRECTION = normalize([1, 0.25, 1]);

/**
 * @param {{ dimensions: { widthM, lengthM, wallHeightM }, roof: object }} config
 * @param {string} cameraMode
 * @returns {{ position: [number, number, number], target: [number, number, number] }}
 */
export function cameraView(config, cameraMode) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const footprint = roofFootprint(config);
  const frontEdgeZ = footprint.centerZ + footprint.roofLength / 2;
  const frontDistance = perspectiveFitDistance(Math.max(footprint.roofWidth, wallHeightM * 1.35)) * 1.28;
  const sideDistance = perspectiveFitDistance(Math.max(footprint.roofLength, wallHeightM * 1.35)) * 1.22;
  const boundsRadius = Math.hypot(footprint.roofWidth, footprint.roofLength, wallHeightM) / 2;
  const orbitDistance = (boundsRadius / Math.sin(CAMERA_VERTICAL_FOV / 2)) * 1.18;
  const target = [footprint.centerX, wallHeightM * 0.52, footprint.centerZ];

  if (cameraMode === "front") {
    return { position: [footprint.centerX, wallHeightM * 0.58, frontEdgeZ + frontDistance], target };
  }
  if (cameraMode === "side") {
    return {
      position: [footprint.centerX + footprint.roofWidth / 2 + sideDistance, wallHeightM * 0.58, footprint.centerZ],
      target,
    };
  }
  if (cameraMode === "top") {
    return {
      position: [
        footprint.centerX + 0.001,
        perspectiveFitDistance(Math.max(footprint.roofWidth, footprint.roofLength)) * 1.18,
        footprint.centerZ + 0.001,
      ],
      target: [footprint.centerX, 0, footprint.centerZ],
    };
  }
  if (cameraMode === "interior") {
    return {
      position: [-widthM * 0.32, Math.min(1.62, wallHeightM * 0.6), -lengthM * 0.32],
      target: [widthM * 0.18, Math.min(1.4, wallHeightM * 0.51), lengthM * 0.22],
    };
  }

  const distance = cameraMode === "structure" ? orbitDistance * 1.08 : orbitDistance;
  return {
    position: [
      target[0] + ORBIT_DIRECTION[0] * distance,
      target[1] + ORBIT_DIRECTION[1] * distance,
      target[2] + ORBIT_DIRECTION[2] * distance,
    ],
    target,
  };
}
