/**
 * Kształt cennika firmy. Wszystkie kwoty są NETTO.
 *
 * Źródłem prawdy jest `src/domain/pricing/priceList.js` (czysty JS, żeby dało
 * się go testować runnerem `test:3d`); ten plik daje TypeScriptowi typ, którego
 * nie potrafi wywnioskować z modułu JS.
 */

export interface PanelRate {
  defaultPerM2: number;
  byThicknessMm: Record<string, number>;
  byModelId: Record<string, number>;
  wastePercent: number;
}

/** Drzwi i okna: sztywna cena za sztukę. */
export interface UnitPricedOpening {
  pricePerUnit: number;
}

/**
 * Bramy: cena za sztukę obejmuje szerokość do `baseWidthM`, każde rozpoczęte
 * 50 cm powyżej to dopłata `widthStepPrice`.
 */
export interface SizedOpening extends UnitPricedOpening {
  baseWidthM: number;
  widthStepPrice: number;
}

export interface OpeningRate<T = UnitPricedOpening> {
  default: T;
  byModelId: Record<string, T>;
}

export type PriceListExtraKind = "FIXED" | "PER_M2_BUILDING" | "PERCENT_OF_MATERIALS";

export interface PriceListExtra {
  id: string;
  label: string;
  kind: PriceListExtraKind;
  value: number;
}

export type PriceListRounding = "NONE" | "TO_1" | "TO_10";

export interface PriceListRates {
  schemaVersion: number;
  vatRatePercent: number;
  panels: { wall: PanelRate; roof: PanelRate };
  frontProjection: { liningPerM2: number };
  steel: {
    profilePerKg: number;
    platePerKg: number;
    anchorPerUnit: number;
    fixingsPerKg: number;
  };
  flashings: { defaultPerMeter: number; byItemLabel: Record<string, number> };
  gutters: {
    gutterPerMeter: number;
    downspoutPerMeter: number;
    bracketPerUnit: number;
    clampPerUnit: number;
    leafGuardPerMeter: number;
  };
  openings: {
    gate: OpeningRate<SizedOpening>;
    door: OpeningRate;
    window: OpeningRate;
    roofWindow: OpeningRate;
  };
  lighting: {
    interiorLighting: number;
    roofPerimeterLed: number;
    gateLamps: number;
    exteriorSconces: number;
    frontProjectionLed: number;
  };
  labour: { perM2BuildingArea: number; percentOfMaterials: number };
  extras: PriceListExtra[];
  marginPercent: number;
  delivery: { flat: number; perKm: number };
  rounding: PriceListRounding;
}

export interface PriceListEditorState {
  version: number;
  publishedVersion: number;
  published: boolean;
  showToCustomer: boolean;
  currency: string;
  draft: PriceListRates;
}
