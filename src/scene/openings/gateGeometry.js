export const OPENING_ORIGIN_OFFSET_M = 0.025;
export const GATE_FLASHING_SHEET_M = 0.0012;
export const GATE_OPENING_CLEARANCE_M = 0.01;

const GATE_RECESS_EXTRA_M = Object.freeze({
  sectional: 0.045,
  roller: 0.065,
  tilting: 0.04,
});

export function getGateMountMetrics(opening, cladding, flashings) {
  const wallThicknessM = Math.max(
    0.04,
    (cladding?.wallPirThicknessMm || cladding?.thicknessMm || 60) / 1000,
  );
  const recessM = wallThicknessM + (GATE_RECESS_EXTRA_M[opening.gateType] || GATE_RECESS_EXTRA_M.sectional);
  const trimWidthM = flashings?.package === "premium" ? 0.1 : 0.07;
  const wallFaceZ = -OPENING_ORIGIN_OFFSET_M;
  const flashingFaceZ = wallFaceZ + 0.016;
  const leafFaceZ = wallFaceZ - recessM;
  const revealFrontZ = flashingFaceZ - GATE_FLASHING_SHEET_M / 2;
  const revealBackZ = leafFaceZ + 0.008;

  return {
    wallThicknessM,
    recessM,
    trimWidthM,
    wallFaceZ,
    flashingFaceZ,
    leafFaceZ,
    revealFrontZ,
    revealBackZ,
    revealDepthM: Math.max(0.02, revealFrontZ - revealBackZ),
  };
}

export function getTiltingProfileMetrics(layout) {
  const high = layout === "vertical_high" || layout === "horizontal_high";
  const horizontal = layout === "horizontal_low" || layout === "horizontal_high";
  const diagonal = layout === "diagonal";

  return {
    pitchM: high ? 0.15 : 0.082,
    horizontal,
    diagonal,
    profileDepthM: 0.01,
  };
}

