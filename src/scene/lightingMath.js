import { wallOpeningTransform } from "./geometry.js";
import {
  frontProjectionPortalFasciaAssemblies,
  frontProjectionSideProfiles,
  roofSurfaceYAt,
} from "./frontProjectionMath.js";

function distance3d(start, end) {
  return Math.hypot(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2],
  );
}

function roofLedUndersideM(config) {
  const coreM = Math.max(0.05, (config.cladding?.roofPirThicknessMm ?? 80) / 1000 * 0.7);
  return coreM + 0.055;
}

function roofPoint(config, x, z) {
  return [x, roofSurfaceYAt(x, z, config) - roofLedUndersideM(config), z];
}

function segment(name, start, end, lightDirection = [0, -1, 0]) {
  return {
    name,
    start,
    end,
    lightDirection,
    length: distance3d(start, end),
  };
}

function roofEdgeSegment(config, name, start, end, lightDirection) {
  return segment(
    name,
    roofPoint(config, start[0], start[1]),
    roofPoint(config, end[0], end[1]),
    lightDirection,
  );
}

export function roofPerimeterLedSegments(config) {
  const { widthM, lengthM } = config.dimensions;
  const { front = 0, back = 0, left = 0, right = 0 } = config.roof.overhangM ?? {};
  const xMin = -widthM / 2 - Math.min(0.1, Math.max(0, left * 0.45));
  const xMax = widthM / 2 + Math.min(0.1, Math.max(0, right * 0.45));
  const zMin = -lengthM / 2 - Math.min(0.1, Math.max(0, back * 0.45));
  const zMax = lengthM / 2 + Math.min(0.1, Math.max(0, front * 0.45));
  const type = config.roof.type;
  const backLight = [0, -1, 0.42];
  const rightLight = [-0.42, -1, 0];
  const frontLight = [0, -1, -0.42];
  const leftLight = [0.42, -1, 0];

  if (type === "gable_left_right") {
    return [
      roofEdgeSegment(config, "roof-led-back-left", [xMin, zMin], [0, zMin], backLight),
      roofEdgeSegment(config, "roof-led-back-right", [0, zMin], [xMax, zMin], backLight),
      roofEdgeSegment(config, "roof-led-right", [xMax, zMin], [xMax, zMax], rightLight),
      roofEdgeSegment(config, "roof-led-front-right", [xMax, zMax], [0, zMax], frontLight),
      roofEdgeSegment(config, "roof-led-front-left", [0, zMax], [xMin, zMax], frontLight),
      roofEdgeSegment(config, "roof-led-left", [xMin, zMax], [xMin, zMin], leftLight),
    ];
  }

  if (type === "gable_front_back") {
    return [
      roofEdgeSegment(config, "roof-led-back", [xMin, zMin], [xMax, zMin], backLight),
      roofEdgeSegment(config, "roof-led-right-back", [xMax, zMin], [xMax, 0], rightLight),
      roofEdgeSegment(config, "roof-led-right-front", [xMax, 0], [xMax, zMax], rightLight),
      roofEdgeSegment(config, "roof-led-front", [xMax, zMax], [xMin, zMax], frontLight),
      roofEdgeSegment(config, "roof-led-left-front", [xMin, zMax], [xMin, 0], leftLight),
      roofEdgeSegment(config, "roof-led-left-back", [xMin, 0], [xMin, zMin], leftLight),
    ];
  }

  return [
    roofEdgeSegment(config, "roof-led-back", [xMin, zMin], [xMax, zMin], backLight),
    roofEdgeSegment(config, "roof-led-right", [xMax, zMin], [xMax, zMax], rightLight),
    roofEdgeSegment(config, "roof-led-front", [xMax, zMax], [xMin, zMax], frontLight),
    roofEdgeSegment(config, "roof-led-left", [xMin, zMax], [xMin, zMin], leftLight),
  ];
}

export function gateLampPlacements(config) {
  return (config.openings ?? [])
    .filter((opening) => opening.kind === "gate")
    .map((opening) => {
      const transform = wallOpeningTransform(opening, config.dimensions);
      return {
        id: opening.id,
        wall: opening.wall,
        position: transform.position,
        rotation: transform.rotation,
        localPosition: [0, opening.heightM / 2 + 0.24, 0.025],
        width: Math.min(2.4, Math.max(0.9, opening.widthM * 0.68)),
      };
    });
}

export function interiorLampPlacements(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const laneCount = Math.min(4, Math.max(1, Math.ceil(widthM / 3.5)));
  const runCount = Math.min(6, Math.max(1, Math.ceil(lengthM / 3)));
  const usableWidth = Math.max(0, widthM - 1.4);
  const usableLength = Math.max(0, lengthM - 1.6);
  const fixtureLength = Math.min(1.5, Math.max(0.9, (lengthM / runCount) * 0.58));
  const y = Math.max(2.05, wallHeightM - 0.38);

  return Array.from({ length: laneCount }, (_, laneIndex) => {
    const x = laneCount === 1
      ? 0
      : -usableWidth / 2 + (usableWidth * laneIndex) / (laneCount - 1);
    return Array.from({ length: runCount }, (_, runIndex) => {
      const z = runCount === 1
        ? 0
        : -usableLength / 2 + (usableLength * runIndex) / (runCount - 1);
      return {
        id: `interior-led-${laneIndex}-${runIndex}`,
        position: [x, y, z],
        length: fixtureLength,
      };
    });
  }).flat();
}

export function interiorSoftLightPlacement(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  return {
    position: [0, Math.max(2.05, wallHeightM - 0.42), 0],
    width: Math.max(0.8, widthM - 0.6),
    length: Math.max(1, lengthM - 0.8),
  };
}

export function exteriorSconcePlacements(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const x = Math.max(0.45, widthM / 2 - 0.38);
  const y = Math.max(1.8, Math.min(2.35, wallHeightM - 0.32));
  return [-x, x].map((positionX, index) => ({
    id: `front-exterior-sconce-${index}`,
    position: [positionX, y, lengthM / 2 + 0.105],
    rotation: [0, 0, 0],
  }));
}

export function frontProjectionLedSegments(config) {
  const fasciaAssemblies = frontProjectionPortalFasciaAssemblies(config);
  const sideProfiles = frontProjectionSideProfiles(config);
  if (!fasciaAssemblies.length || !sideProfiles.length) return [];

  const roofFlashingSegments = fasciaAssemblies.map((assembly, index) => {
    const angle = assembly.rotation[2] || 0;
    const direction = [Math.cos(angle), Math.sin(angle), 0];
    const downward = [Math.sin(angle), -Math.cos(angle), 0];
    const center = [
      assembly.position[0] + downward[0] * 0.105,
      assembly.position[1] + downward[1] * 0.105,
      assembly.position[2] - 0.032,
    ];
    const half = assembly.width / 2;
    return segment(
      `front-projection-roof-flashing-led-${index}`,
      [
        center[0] - direction[0] * half,
        center[1] - direction[1] * half,
        center[2],
      ],
      [
        center[0] + direction[0] * half,
        center[1] + direction[1] * half,
        center[2],
      ],
      [0, -1, -0.42],
    );
  });

  const wallThicknessM = Math.max(
    0.04,
    (config.cladding?.wallPirThicknessMm ?? 60) / 1000,
  );
  const frontCapWidthM = 0.024 + wallThicknessM + 0.022 + 0.12;
  const frontCapCenterInsetM = 0.024 + wallThicknessM / 2;
  const ledInsetM = frontCapCenterInsetM + frontCapWidthM / 2 + 0.018;
  const wallFlashingSegments = sideProfiles.map((profile) => {
    const inward = profile.side === "left" ? 1 : -1;
    const x = profile.x + inward * ledInsetM;
    const z = profile.zEnd - 0.004;
    const topY = Math.max(0.36, profile.endTopY - 0.235);
    return segment(
      `front-projection-${profile.side}-wall-flashing-led`,
      [x, 0.16, z],
      [x, topY, z],
      [inward * 0.78, -0.12, -0.42],
    );
  });

  return [...roofFlashingSegments, ...wallFlashingSegments];
}

export function sampleSegmentPoints(segments, maximumPoints) {
  if (!segments.length || maximumPoints <= 0) return [];
  const totalLength = segments.reduce((sum, item) => sum + item.length, 0);
  const desired = Math.max(1, Math.min(maximumPoints, Math.ceil(totalLength / 2.8)));
  return Array.from({ length: desired }, (_, index) => {
    const distance = ((index + 0.5) / desired) * totalLength;
    let traversed = 0;
    const item = segments.find((candidate) => {
      const contains = distance <= traversed + candidate.length;
      if (!contains) traversed += candidate.length;
      return contains;
    }) ?? segments.at(-1);
    const t = Math.min(1, Math.max(0, (distance - traversed) / Math.max(0.001, item.length)));
    return {
      position: [
        item.start[0] + (item.end[0] - item.start[0]) * t,
        item.start[1] + (item.end[1] - item.start[1]) * t,
        item.start[2] + (item.end[2] - item.start[2]) * t,
      ],
      segment: item.name,
    };
  });
}
