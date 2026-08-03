export const PRICE_LIST_SCHEMA_VERSION = 1;

/**
 * Wszystkie stawki są NETTO. Pieniądze w module wyceny liczymy wewnętrznie
 * w groszach (liczby całkowite) — przy kilkudziesięciu pozycjach float
 * rozjeżdża sumę tak, że netto + VAT ≠ brutto.
 */
export const DEFAULT_PRICE_LIST = {
  schemaVersion: PRICE_LIST_SCHEMA_VERSION,
  vatRatePercent: 23,
  panels: {
    wall: { defaultPerM2: 0, byThicknessMm: {}, byModelId: {}, wastePercent: 0 },
    roof: { defaultPerM2: 0, byThicknessMm: {}, byModelId: {}, wastePercent: 0 },
  },
  frontProjection: { liningPerM2: 0 },
  steel: { profilePerKg: 0, platePerKg: 0, anchorPerUnit: 0, fixingsPerKg: 0 },
  flashings: { defaultPerMeter: 0, byItemLabel: {} },
  gutters: {
    gutterPerMeter: 0,
    downspoutPerMeter: 0,
    bracketPerUnit: 0,
    clampPerUnit: 0,
    leafGuardPerMeter: 0,
  },
  openings: {
    // Bramy: cena za sztukę obejmuje szerokość do `baseWidthM`, a każde
    // rozpoczęte 50 cm powyżej tej szerokości to dopłata `widthStepPrice`.
    gate: {
      default: { pricePerUnit: 0, baseWidthM: 2.5, widthStepPrice: 0 },
      byModelId: {},
    },
    // Drzwi i okna: sztywna cena za sztukę, niezależna od wymiaru.
    door: { default: { pricePerUnit: 0 }, byModelId: {} },
    window: { default: { pricePerUnit: 0 }, byModelId: {} },
    roofWindow: { default: { pricePerUnit: 0 }, byModelId: {} },
  },
  lighting: {
    interiorLighting: 0,
    roofPerimeterLed: 0,
    gateLamps: 0,
    exteriorSconces: 0,
    frontProjectionLed: 0,
  },
  labour: { perM2BuildingArea: 0, percentOfMaterials: 0 },
  extras: [],
  marginPercent: 0,
  delivery: { flat: 0, perKm: 0 },
  rounding: "TO_1",
};

const ROUNDING_MODES = new Set(["NONE", "TO_1", "TO_10"]);
const EXTRA_KINDS = new Set(["FIXED", "PER_M2_BUILDING", "PERCENT_OF_MATERIALS"]);

/** Nieujemna, skończona liczba albo wartość domyślna. Nigdy nie rzuca. */
function money(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

/** Dopuszcza wartości ujemne (marża, rabat). */
function signed(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function rateMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount >= 0) out[String(key)] = amount;
  }
  return out;
}

/** Szerokość bramy poniżej tej wartości nie ma sensu — chroni przed literówką. */
const MIN_GATE_BASE_WIDTH_M = 0.5;

/**
 * @param {boolean} sized czy grupa ma schodkową dopłatę za szerokość (bramy).
 */
function openingRate(raw, fallback, sized = false) {
  const source = raw && typeof raw === "object" ? raw : {};

  const entry = (value, base) => {
    const priced = { pricePerUnit: money(value?.pricePerUnit, base?.pricePerUnit ?? 0) };
    if (!sized) return priced;
    return {
      ...priced,
      baseWidthM: Math.max(
        MIN_GATE_BASE_WIDTH_M,
        money(value?.baseWidthM, base?.baseWidthM ?? 2.5),
      ),
      widthStepPrice: money(value?.widthStepPrice, base?.widthStepPrice ?? 0),
    };
  };

  const byModelId = {};
  if (source.byModelId && typeof source.byModelId === "object") {
    for (const [key, value] of Object.entries(source.byModelId)) {
      if (!value || typeof value !== "object") continue;
      byModelId[String(key)] = entry(value, fallback.default);
    }
  }

  return { default: entry(source.default, fallback.default), byModelId };
}

function panelRate(raw, fallback) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    defaultPerM2: money(source.defaultPerM2, fallback.defaultPerM2),
    byThicknessMm: rateMap(source.byThicknessMm),
    byModelId: rateMap(source.byModelId),
    // Zapas na docinanie — celowo ograniczony, żeby literówka nie podwoiła ceny.
    wastePercent: Math.min(money(source.wastePercent, fallback.wastePercent), 50),
  };
}

/**
 * Sprowadza dowolny (także niekompletny) zapis cennika do pełnego kształtu.
 * Musi być totalna: szkic w trakcie edycji nigdy nie może wysadzić wyceny.
 */
export function normalizePriceList(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const base = DEFAULT_PRICE_LIST;

  return {
    schemaVersion: PRICE_LIST_SCHEMA_VERSION,
    vatRatePercent: Math.min(money(source.vatRatePercent, base.vatRatePercent), 100),
    panels: {
      wall: panelRate(source.panels?.wall, base.panels.wall),
      roof: panelRate(source.panels?.roof, base.panels.roof),
    },
    frontProjection: {
      liningPerM2: money(source.frontProjection?.liningPerM2),
    },
    steel: {
      profilePerKg: money(source.steel?.profilePerKg),
      platePerKg: money(source.steel?.platePerKg),
      anchorPerUnit: money(source.steel?.anchorPerUnit),
      fixingsPerKg: money(source.steel?.fixingsPerKg),
    },
    flashings: {
      defaultPerMeter: money(source.flashings?.defaultPerMeter),
      byItemLabel: rateMap(source.flashings?.byItemLabel),
    },
    gutters: {
      gutterPerMeter: money(source.gutters?.gutterPerMeter),
      downspoutPerMeter: money(source.gutters?.downspoutPerMeter),
      bracketPerUnit: money(source.gutters?.bracketPerUnit),
      clampPerUnit: money(source.gutters?.clampPerUnit),
      leafGuardPerMeter: money(source.gutters?.leafGuardPerMeter),
    },
    openings: {
      gate: openingRate(source.openings?.gate, base.openings.gate, true),
      door: openingRate(source.openings?.door, base.openings.door),
      window: openingRate(source.openings?.window, base.openings.window),
      roofWindow: openingRate(source.openings?.roofWindow, base.openings.roofWindow),
    },
    lighting: {
      interiorLighting: money(source.lighting?.interiorLighting),
      roofPerimeterLed: money(source.lighting?.roofPerimeterLed),
      gateLamps: money(source.lighting?.gateLamps),
      exteriorSconces: money(source.lighting?.exteriorSconces),
      frontProjectionLed: money(source.lighting?.frontProjectionLed),
    },
    labour: {
      perM2BuildingArea: money(source.labour?.perM2BuildingArea),
      percentOfMaterials: money(source.labour?.percentOfMaterials),
    },
    extras: Array.isArray(source.extras)
      ? source.extras
          .filter((item) => item && typeof item === "object" && EXTRA_KINDS.has(item.kind))
          .map((item, index) => ({
            id: String(item.id || `extra-${index + 1}`),
            label: String(item.label || "Pozycja dodatkowa").slice(0, 120),
            kind: item.kind,
            value: money(item.value),
          }))
      : [],
    marginPercent: Math.max(-50, Math.min(signed(source.marginPercent), 200)),
    delivery: {
      flat: money(source.delivery?.flat),
      perKm: money(source.delivery?.perKm),
    },
    rounding: ROUNDING_MODES.has(source.rounding) ? source.rounding : base.rounding,
  };
}

/** Czy cennik ma cokolwiek wypełnione — używane w UI do pustego stanu. */
export function isPriceListEmpty(priceList) {
  const list = normalizePriceList(priceList);
  return (
    list.panels.wall.defaultPerM2 === 0
    && list.panels.roof.defaultPerM2 === 0
    && Object.keys(list.panels.wall.byModelId).length === 0
    && Object.keys(list.panels.roof.byModelId).length === 0
    && list.steel.profilePerKg === 0
    && list.extras.length === 0
  );
}
