import { SOFFIT_FINISH_OPTIONS, getFinishForRole } from "@/config/materialFinishes";

export const FRONT_PROJECTION_LIMITS = Object.freeze({
  minM: 0,
  maxM: 1.5,
  stepM: 0.05,
});

export const FRONT_PROJECTION_FINISHES = SOFFIT_FINISH_OPTIONS;

export const DEFAULT_FRONT_PROJECTION = Object.freeze({
  depthM: 0,
  liningFinish: "golden_oak",
});

const GARAGE_PRESETS = new Set(["single_garage", "double_garage"]);

export function isFrontProjectionAvailable(preset) {
  return GARAGE_PRESETS.has(preset);
}

export function getFrontProjectionFinish(finishId) {
  return getFinishForRole(finishId, "soffit", DEFAULT_FRONT_PROJECTION.liningFinish);
}
