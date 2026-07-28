export const DEFAULT_LIGHTING = Object.freeze({
  interiorLighting: false,
  roofPerimeterLed: false,
  gateLamps: false,
  exteriorSconces: false,
  frontProjectionLed: false,
});

export const LIGHTING_LABELS = Object.freeze({
  interiorLighting: "Oświetlenie wewnętrzne",
  roofPerimeterLed: "LED po obrysie dachu",
  gateLamps: "Lampy podłużne nad bramami",
  exteriorSconces: "Kinkiety zewnętrzne",
  frontProjectionLed: "LED przy obróbce wypustu",
});

export function normalizeLighting(lighting, { frontProjectionAvailable = true } = {}) {
  return {
    interiorLighting: Boolean(lighting?.interiorLighting),
    roofPerimeterLed: Boolean(lighting?.roofPerimeterLed),
    gateLamps: Boolean(lighting?.gateLamps),
    exteriorSconces: Boolean(lighting?.exteriorSconces),
    frontProjectionLed: Boolean(frontProjectionAvailable && lighting?.frontProjectionLed),
  };
}
