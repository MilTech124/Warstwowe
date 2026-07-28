// Czysta geometria dachu — bez zależności od three.
//
// Wydzielone z geometry.js, żeby model konstrukcji (src/scene/structure/) mógł
// liczyć spadki bez wciągania three. geometry.js re-eksportuje te funkcje, więc
// dla pozostałych modułów scen nic się nie zmienia.

// Typy dachu, których spad biegnie wzdłuż osi X (szerokości budynku).
// Dla pozostałych spad biegnie wzdłuż osi Z (długości).
export const ROOF_RUN_X = new Set(["single_left", "single_right", "gable_left_right"]);

export function isGableRoof(type) {
  return type === "gable_left_right" || type === "gable_front_back";
}

export function roofRunAxis(type) {
  return ROOF_RUN_X.has(type) ? "x" : "z";
}

// Pełny bieg połaci wzdłuż osi spadu = wymiar budynku w tej osi.
export function roofRunM(type, widthM, lengthM) {
  return ROOF_RUN_X.has(type) ? widthM : lengthM;
}

/**
 * Metryki dachu. `pitchPercent` to spadek procentowy (nie stopnie).
 * Dla dwuspadu rozpiętość liczona jest od kalenicy do okapu (połowa biegu).
 *
 * @param {{ dimensions: { widthM, lengthM, wallHeightM }, roof: { type, pitchPercent } }} config
 */
export function roofMetrics(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const { type, pitchPercent } = config.roof;
  const pitch = pitchPercent / 100;
  const fullRun = roofRunM(type, widthM, lengthM);
  const run = isGableRoof(type) ? fullRun / 2 : fullRun;
  const rise = Math.max(0.15, run * pitch);

  return {
    pitch,
    rise,
    angle: Math.atan2(rise, run),
    ridgeHeight: wallHeightM + rise,
    eaveHeight: wallHeightM,
  };
}

export function roofPitchBounds(type) {
  return isGableRoof(type) ? { min: 18, max: 45, fallback: 28 } : { min: 3, max: 18, fallback: 7 };
}

export function slopedRoofLength(run, angle) {
  return run / Math.max(0.001, Math.cos(angle));
}
