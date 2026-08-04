// Prezentacja producentów płyt i bram: logo, opis marki i parametry cieplne.
//
// Producenci płacą za obecność w konfiguratorze, więc ich dane muszą trafić
// zarówno do kreatora, jak i do PDF zamówienia — a oba miejsca mają czytać
// je z jednego źródła.
//
// Kolejność źródeł jest zawsze ta sama: najpierw katalog z bootstrapu firmy
// (Mongo, wypełniany przez superadmina danymi od producenta), a gdy go nie ma
// — statyczny katalog z `catalog.js`. Dzięki temu konfigurator standalone i
// firma bez opublikowanego katalogu pokazują komplet informacji.

import { CLADDING_CATALOG, GATE_MANUFACTURERS, ROOF_CLADDING_CATALOG } from "@/config/catalog";

// Opory przejmowania ciepła wg PN-EN ISO 6946 dla przegrody pionowej.
const RSI = 0.13;
const RSE = 0.04;

const STATIC_CATALOGS = {
  WALL_PANEL: CLADDING_CATALOG,
  ROOF_PANEL: ROOF_CLADDING_CATALOG,
  GATE: GATE_MANUFACTURERS,
};

function staticManufacturer(kind, key) {
  const source = STATIC_CATALOGS[kind];
  return source?.[key] ?? null;
}

/** Modele producenta niezależnie od tego, czy katalog ma poziom `types`. */
function staticModels(manufacturer) {
  if (!manufacturer) return {};
  if (manufacturer.models) return manufacturer.models;
  return Object.values(manufacturer.types ?? {}).reduce(
    (models, type) => ({ ...models, ...(type.models ?? {}) }),
    {},
  );
}

function catalogManufacturers(catalog, kind) {
  const list = kind === "GATE" ? catalog?.gateManufacturers : catalog?.panelManufacturers;
  return Array.isArray(list) ? list : [];
}

function normalizeSpecs(specs) {
  if (!specs) return null;

  const lambdaWmK = Number(specs.lambdaWmK);
  const uValues = (Array.isArray(specs.uValues) ? specs.uValues : [])
    .map((entry) => ({
      thicknessMm: Number(entry?.thicknessMm),
      uWm2K: Number(entry?.uWm2K),
    }))
    .filter((entry) => entry.thicknessMm > 0 && entry.uWm2K > 0);

  const normalized = {
    coreType: specs.coreType ? String(specs.coreType) : "",
    lambdaWmK: Number.isFinite(lambdaWmK) && lambdaWmK > 0 ? lambdaWmK : null,
    uValues,
    fireClass: specs.fireClass ? String(specs.fireClass) : "",
    datasheetUrl: specs.datasheetUrl ? String(specs.datasheetUrl) : "",
  };

  const hasContent = normalized.coreType || normalized.lambdaWmK || normalized.uValues.length
    || normalized.fireClass || normalized.datasheetUrl;
  return hasContent ? normalized : null;
}

/**
 * Logo i opis marki producenta.
 * @param {object|null} catalog  katalog z bootstrapu (`access.catalog`)
 * @param {"WALL_PANEL"|"ROOF_PANEL"|"GATE"} kind
 * @param {string} key           klucz producenta z konfiguracji
 */
export function manufacturerPresentation(catalog, kind, key) {
  if (!key) return null;

  const fromCatalog = catalogManufacturers(catalog, kind).find((item) => item?.key === key);
  const fromStatic = staticManufacturer(kind, key);
  if (!fromCatalog && !fromStatic) return null;

  return {
    key,
    name: String(fromCatalog?.name || fromStatic?.label || key),
    logoUrl: String(fromCatalog?.logoUrl || fromStatic?.logoUrl || ""),
    websiteUrl: String(fromCatalog?.websiteUrl || fromStatic?.websiteUrl || ""),
    tagline: String(fromCatalog?.tagline || fromStatic?.tagline || ""),
    description: String(fromCatalog?.description || fromStatic?.description || ""),
  };
}

/**
 * Parametry techniczne modelu (rdzeń, lambda, tabela U).
 * @returns {object|null} znormalizowane `specs` albo `null`, gdy producent ich nie podał
 */
export function productSpecs(catalog, { kind, manufacturerKey, modelKey }) {
  if (!kind || !modelKey) return null;

  const manufacturer = catalogManufacturers(catalog, kind).find((item) => item?.key === manufacturerKey);
  const product = (Array.isArray(manufacturer?.products) ? manufacturer.products : [])
    .find((item) => item?.key === modelKey && (!item.kind || item.kind === kind));
  const fromCatalog = normalizeSpecs(product?.specs);
  if (fromCatalog) return fromCatalog;

  return normalizeSpecs(staticModels(staticManufacturer(kind, manufacturerKey))[modelKey]?.specs);
}

/**
 * Współczynnik przenikania ciepła U dla danej grubości.
 *
 * Wartość zadeklarowana przez producenta ma pierwszeństwo — pochodzi z badań,
 * a wzór jest tylko przybliżeniem dla rdzenia bez mostków liniowych.
 */
export function uValueFor(specs, thicknessMm) {
  const thickness = Number(thicknessMm);
  if (!specs || !(thickness > 0)) return null;

  const declared = specs.uValues?.find((entry) => entry.thicknessMm === thickness);
  if (declared) return declared.uWm2K;

  if (!(specs.lambdaWmK > 0)) return null;
  const resistance = RSI + thickness / 1000 / specs.lambdaWmK + RSE;
  return Math.round((1 / resistance) * 1000) / 1000;
}

function decimalComma(value, digits) {
  return Number(value).toFixed(digits).replace(".", ",");
}

export function formatU(value) {
  if (!(Number(value) > 0)) return "";
  return `${decimalComma(value, 3)} W/(m²·K)`;
}

export function formatLambda(value) {
  if (!(Number(value) > 0)) return "";
  return `${decimalComma(value, 3)} W/(m·K)`;
}

/**
 * Wiersze opisu technicznego — ten sam format w panelu konfiguratora i w PDF.
 * @returns {Array<[string, string]>}
 */
export function specRows(specs, thicknessMm) {
  if (!specs) return [];

  const rows = [];
  if (specs.coreType) rows.push(["Rdzeń", specs.coreType]);
  if (specs.lambdaWmK) rows.push(["Przewodność λ rdzenia", formatLambda(specs.lambdaWmK)]);

  const uValue = uValueFor(specs, thicknessMm);
  if (uValue) {
    const declared = specs.uValues?.some((entry) => entry.thicknessMm === Number(thicknessMm));
    rows.push([
      `Współczynnik U (${Number(thicknessMm)} mm)`,
      declared ? formatU(uValue) : `${formatU(uValue)} (wyliczony)`,
    ]);
  }
  if (specs.fireClass) rows.push(["Reakcja na ogień", specs.fireClass]);

  return rows;
}
