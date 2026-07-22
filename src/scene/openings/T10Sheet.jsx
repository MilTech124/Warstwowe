import { useMemo } from "react";
import { BufferGeometry, Float32BufferAttribute } from "three";

export const T10_MODULE_WIDTH_M = 1;
export const T10_PITCH_M = 0.1;
export const T10_DEPTH_M = 0.01;
export const T10_SHEET_THICKNESS_M = 0.0012;

function profileHeightAt(distance, pitch, depth, profileKind) {
  const phase = ((distance % pitch) + pitch) % pitch / pitch;
  if (profileKind === "wide") {
    if (phase < 0.04 || phase > 0.96) return 0;
    if (phase < 0.07) return ((phase - 0.04) / 0.03) * depth;
    if (phase <= 0.93) return depth;
    return ((0.96 - phase) / 0.03) * depth;
  }
  if (phase < 0.3 || phase > 0.7) return 0;
  if (phase < 0.4) return ((phase - 0.3) / 0.1) * depth;
  if (phase <= 0.6) return depth;
  return ((0.7 - phase) / 0.1) * depth;
}

function profileBreakpoints(width, pitch, profileKind, profileOffset = 0) {
  const points = new Set([0, width]);
  const phases = profileKind === "wide"
    ? [0, 0.04, 0.07, 0.93, 0.96, 1]
    : [0, 0.3, 0.4, 0.6, 0.7, 1];
  const firstPeriod = Math.floor(profileOffset / pitch) - 1;
  const lastPeriod = Math.ceil((profileOffset + width) / pitch) + 1;

  for (let period = firstPeriod; period <= lastPeriod; period += 1) {
    phases.forEach((phase) => {
      const point = (period + phase) * pitch - profileOffset;
      if (point > 0 && point < width) points.add(point);
    });
  }

  return [...points].sort((a, b) => a - b);
}

export function createT10SheetModuleGeometry({
  width = T10_MODULE_WIDTH_M,
  length = 2,
  pitch = T10_PITCH_M,
  depth = T10_DEPTH_M,
  thickness = T10_SHEET_THICKNESS_M,
  uvOffset = 0,
  profileOffset = uvOffset,
  profileKind = "t10",
}) {
  const geometry = new BufferGeometry();
  const positions = [];
  const uvs = [];
  const breaks = profileBreakpoints(width, pitch, profileKind, profileOffset);
  const halfLength = length / 2;

  const pushTriangle = (a, b, c, uvA, uvB, uvC) => {
    positions.push(...a, ...b, ...c);
    uvs.push(...uvA, ...uvB, ...uvC);
  };

  const pushQuad = (a, b, c, d, uvA, uvB, uvC, uvD) => {
    pushTriangle(a, b, c, uvA, uvB, uvC);
    pushTriangle(a, c, d, uvA, uvC, uvD);
  };

  for (let index = 0; index < breaks.length - 1; index += 1) {
    const d0 = breaks[index];
    const d1 = breaks[index + 1];
    const x0 = d0 - width / 2;
    const x1 = d1 - width / 2;
    const z0 = profileHeightAt(d0 + profileOffset, pitch, depth, profileKind);
    const z1 = profileHeightAt(d1 + profileOffset, pitch, depth, profileKind);
    const u0 = uvOffset + d0;
    const u1 = uvOffset + d1;

    const frontA = [x0, -halfLength, z0];
    const frontB = [x1, -halfLength, z1];
    const frontC = [x1, halfLength, z1];
    const frontD = [x0, halfLength, z0];
    const backA = [x0, -halfLength, z0 - thickness];
    const backB = [x1, -halfLength, z1 - thickness];
    const backC = [x1, halfLength, z1 - thickness];
    const backD = [x0, halfLength, z0 - thickness];

    pushQuad(frontA, frontB, frontC, frontD, [u0, 0], [u1, 0], [u1, length], [u0, length]);
    pushQuad(backD, backC, backB, backA, [u0, length], [u1, length], [u1, 0], [u0, 0]);
    pushQuad(frontA, backA, backB, frontB, [u0, 0], [u0, thickness], [u1, thickness], [u1, 0]);
    pushQuad(frontC, backC, backD, frontD, [u1, length], [u1, length + thickness], [u0, length + thickness], [u0, length]);
  }

  const firstZ = profileHeightAt(profileOffset, pitch, depth, profileKind);
  const lastZ = profileHeightAt(width + profileOffset, pitch, depth, profileKind);
  const leftX = -width / 2;
  const rightX = width / 2;
  pushQuad(
    [leftX, -halfLength, firstZ],
    [leftX, halfLength, firstZ],
    [leftX, halfLength, firstZ - thickness],
    [leftX, -halfLength, firstZ - thickness],
    [0, 0], [0, length], [thickness, length], [thickness, 0],
  );
  pushQuad(
    [rightX, -halfLength, lastZ],
    [rightX, -halfLength, lastZ - thickness],
    [rightX, halfLength, lastZ - thickness],
    [rightX, halfLength, lastZ],
    [0, 0], [thickness, 0], [thickness, length], [0, length],
  );

  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function modulePieces(span) {
  const pieces = [];
  let cursor = -span / 2;
  let remaining = span;

  while (remaining > 0.0001) {
    const width = Math.min(T10_MODULE_WIDTH_M, remaining);
    pieces.push({
      width,
      center: cursor + width / 2,
      uvOffset: cursor + span / 2,
    });
    cursor += width;
    remaining -= width;
  }

  return pieces;
}

export function fitProfilePitch(span, nominalPitch, fitMode, referenceSpan = span) {
  if (!fitMode || fitMode === "none" || span <= 0 || nominalPitch <= 0) return nominalPitch;

  const ratio = Math.max(span, referenceSpan) / nominalPitch;
  const repeats = Math.max(
    1,
    fitMode === "ceil"
      ? Math.ceil(ratio)
      : fitMode === "floor"
        ? Math.floor(ratio)
        : Math.round(ratio),
  );

  return span / repeats;
}

function T10Module({ width, length, center, uvOffset, pitch, depth, profileKind, material }) {
  const geometry = useMemo(
    () => createT10SheetModuleGeometry({ width, length, uvOffset, pitch, depth, profileKind }),
    [depth, length, pitch, profileKind, uvOffset, width],
  );

  return (
    <mesh
      name={width >= T10_MODULE_WIDTH_M - 0.0001 ? "t10-sheet-module-1m" : "t10-sheet-module-trimmed"}
      geometry={geometry}
      position={[center, 0, 0]}
      material={material}
      castShadow
      receiveShadow
    />
  );
}

export function T10SheetModules({
  width,
  height,
  orientation = "vertical",
  pitch = T10_PITCH_M,
  depth = T10_DEPTH_M,
  profileKind = "t10",
  material,
}) {
  const horizontal = orientation === "horizontal";
  const span = horizontal ? height : width;
  const length = horizontal ? width : height;
  const pieces = useMemo(() => modulePieces(span), [span]);

  return (
    <group name="t10-sheet-replicated-1m" rotation={[0, 0, horizontal ? Math.PI / 2 : 0]}>
      {pieces.map((piece, index) => (
        <T10Module
          key={`${index}-${piece.width.toFixed(4)}`}
          width={piece.width}
          length={length}
          center={piece.center}
          uvOffset={piece.uvOffset}
          pitch={pitch}
          depth={depth}
          profileKind={profileKind}
          material={material}
        />
      ))}
    </group>
  );
}
