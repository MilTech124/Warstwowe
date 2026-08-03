import { projectSummary } from "@/lib/projectSummary";
import { normalizePriceList } from "@/domain/pricing/priceList";

export const QUOTE_SCHEMA_VERSION = 1;

// Wszystko liczymy w groszach jako liczby całkowite i dzielimy raz na końcu.
const toGrosz = (amount) => Math.round(Number(amount) * 100);
const fromGrosz = (grosz) => Math.round(grosz) / 100;

const GROUP_LABELS = {
  panels_wall: "Płyty ścienne",
  panels_roof: "Płyty dachowe",
  front_projection: "Wypust frontowy",
  steel: "Konstrukcja stalowa",
  flashings: "Obróbki blacharskie",
  gutters: "Orynnowanie",
  openings: "Bramy, drzwi i okna",
  lighting: "Oświetlenie",
  labour: "Robocizna",
  extras: "Pozycje dodatkowe",
  delivery: "Dostawa",
};

const LIGHTING_LABELS = {
  interiorLighting: "Oświetlenie wewnętrzne",
  roofPerimeterLed: "LED po obwodzie dachu",
  gateLamps: "Lampy nad bramą",
  exteriorSconces: "Kinkiety zewnętrzne",
  frontProjectionLed: "LED w wypuście",
};

const OPENING_KIND_LABELS = {
  gate: "Brama",
  door: "Drzwi",
  window: "Okno",
  roofWindow: "Okno dachowe",
};

class QuoteBuilder {
  constructor() {
    this.groups = new Map();
    this.missingRates = new Set();
  }

  /** Rejestruje pozycję. Zerowa stawka przy niezerowej ilości = luka w cenniku. */
  line(groupId, { id, label, quantity, unit, unitPriceNet, rateKey }) {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) return;

    const rate = Number(unitPriceNet) || 0;
    if (rate <= 0) {
      this.missingRates.add(rateKey || `${groupId}.${id}`);
      return;
    }

    if (!this.groups.has(groupId)) {
      this.groups.set(groupId, { id: groupId, label: GROUP_LABELS[groupId] || groupId, lines: [] });
    }
    this.groups.get(groupId).lines.push({
      id,
      label,
      quantity: Math.round(amount * 1000) / 1000,
      unit,
      unitPriceNet: rate,
      totalNetGrosz: Math.round(toGrosz(rate) * amount),
    });
  }

  build() {
    return [...this.groups.values()].map((group) => ({
      ...group,
      subtotalNetGrosz: group.lines.reduce((sum, line) => sum + line.totalNetGrosz, 0),
    }));
  }
}

function panelUnitPrice(rates, { modelId, thicknessMm }) {
  // Precedencja: model → grubość → stawka bazowa.
  if (modelId && rates.byModelId[modelId] > 0) return rates.byModelId[modelId];
  if (thicknessMm != null && rates.byThicknessMm[String(thicknessMm)] > 0) {
    return rates.byThicknessMm[String(thicknessMm)];
  }
  return rates.defaultPerM2;
}

/** Krok dopłaty za szerokość bramy. */
export const GATE_WIDTH_STEP_M = 0.5;

/**
 * Cena otworu za sztukę.
 *
 * Drzwi i okna mają sztywną cenę per model. Bramy: cena bazowa obejmuje
 * szerokość do `baseWidthM`, a każde ROZPOCZĘTE 50 cm powyżej to dopłata —
 * brama 2,6 m przy bazie 2,5 m kosztuje już jeden krok więcej.
 */
function openingUnitPrice(rates, kind, modelId, widthM) {
  const group = rates[kind] || rates.window;
  const entry = (modelId && group.byModelId[modelId]) || group.default;

  if (kind !== "gate") return { price: entry.pricePerUnit, steps: 0 };

  // Zaokrąglenie do milimetra, żeby błąd zmiennoprzecinkowy nie naliczył
  // fikcyjnego kroku przy szerokości równej bazowej.
  const overhangM = Math.max(0, Math.round((widthM - entry.baseWidthM) * 1000) / 1000);
  const steps = Math.ceil(overhangM / GATE_WIDTH_STEP_M);
  return { price: entry.pricePerUnit + steps * entry.widthStepPrice, steps };
}

function applyRounding(netGrosz, mode) {
  if (mode === "TO_1") return Math.round(netGrosz / 100) * 100;
  if (mode === "TO_10") return Math.round(netGrosz / 1000) * 1000;
  return netGrosz;
}

/**
 * Buduje wycenę z gotowego zestawienia materiałowego (projectSummary) oraz
 * cennika firmy. Nie liczy własnej geometrii — wszystkie ilości pochodzą z BOM.
 */
export function buildQuote({ summary, configuration, priceList, currency = "PLN", priceListVersion = null }) {
  const rates = normalizePriceList(priceList);
  const builder = new QuoteBuilder();
  const config = configuration || {};

  // --- płyty ---------------------------------------------------------------
  const wall = summary.panels?.wall;
  if (wall?.netM2 > 0) {
    const quantity = wall.netM2 * (1 + rates.panels.wall.wastePercent / 100);
    builder.line("panels_wall", {
      id: "wall",
      label: `Płyta ścienna${wall.thicknessMm ? ` ${wall.thicknessMm} mm` : ""}`,
      quantity,
      unit: "m²",
      // cladding trzyma modele płasko: `model` = ścienny, `roofModel` = dachowy.
      unitPriceNet: panelUnitPrice(rates.panels.wall, {
        modelId: config.cladding?.model,
        thicknessMm: wall.thicknessMm,
      }),
      rateKey: "panels.wall",
    });
  }

  const roof = summary.panels?.roof;
  if (roof?.netM2 > 0) {
    const quantity = roof.netM2 * (1 + rates.panels.roof.wastePercent / 100);
    builder.line("panels_roof", {
      id: "roof",
      label: `Płyta dachowa${roof.thicknessMm ? ` ${roof.thicknessMm} mm` : ""}`,
      quantity,
      unit: "m²",
      unitPriceNet: panelUnitPrice(rates.panels.roof, {
        modelId: config.cladding?.roofModel,
        thicknessMm: roof.thicknessMm,
      }),
      rateKey: "panels.roof",
    });
  }

  const projection = summary.panels?.frontProjection;
  if (projection?.enabled) {
    builder.line("front_projection", {
      id: "lining",
      label: `Obudowa wypustu${projection.liningFinishLabel ? ` — ${projection.liningFinishLabel}` : ""}`,
      quantity: (projection.outerWallM2 || 0) + (projection.liningTotalM2 || 0),
      unit: "m²",
      unitPriceNet: rates.frontProjection.liningPerM2,
      rateKey: "frontProjection.liningPerM2",
    });
  }

  // --- konstrukcja ---------------------------------------------------------
  const steel = summary.steel;
  if (steel) {
    builder.line("steel", {
      id: "profiles",
      label: "Profile stalowe",
      quantity: steel.profileMassKg,
      unit: "kg",
      unitPriceNet: rates.steel.profilePerKg,
      rateKey: "steel.profilePerKg",
    });
    builder.line("steel", {
      id: "plates",
      label: "Blachy podstaw",
      quantity: steel.plateMassKg,
      unit: "kg",
      unitPriceNet: rates.steel.platePerKg,
      rateKey: "steel.platePerKg",
    });
    builder.line("steel", {
      id: "anchors",
      label: steel.anchorLabel || "Kotwy",
      quantity: steel.anchorCount,
      unit: "szt.",
      unitPriceNet: rates.steel.anchorPerUnit,
      rateKey: "steel.anchorPerUnit",
    });
    builder.line("steel", {
      id: "fixings",
      label: "Łączniki i mocowania",
      quantity: steel.fixingsMassKg,
      unit: "kg",
      unitPriceNet: rates.steel.fixingsPerKg,
      rateKey: "steel.fixingsPerKg",
    });
  }

  // --- obróbki i orynnowanie ----------------------------------------------
  const flashings = summary.accessories?.flashings;
  if (flashings?.enabled) {
    for (const item of flashings.items || []) {
      if (!item.included) continue;
      builder.line("flashings", {
        id: item.label,
        label: item.label,
        quantity: item.lengthM,
        unit: "mb",
        unitPriceNet: rates.flashings.byItemLabel[item.label] || rates.flashings.defaultPerMeter,
        rateKey: "flashings.defaultPerMeter",
      });
    }
  }

  const gutters = summary.accessories?.gutters;
  if (gutters?.enabled) {
    builder.line("gutters", {
      id: "gutter",
      label: `Rynny${gutters.sizeMm ? ` Ø ${gutters.sizeMm} mm` : ""}`,
      quantity: gutters.gutterLengthM,
      unit: "mb",
      unitPriceNet: rates.gutters.gutterPerMeter,
      rateKey: "gutters.gutterPerMeter",
    });
    builder.line("gutters", {
      id: "downspout",
      label: "Rury spustowe",
      quantity: gutters.downspoutLengthM,
      unit: "mb",
      unitPriceNet: rates.gutters.downspoutPerMeter,
      rateKey: "gutters.downspoutPerMeter",
    });
    builder.line("gutters", {
      id: "brackets",
      label: "Haki rynnowe",
      quantity: gutters.bracketCount,
      unit: "szt.",
      unitPriceNet: rates.gutters.bracketPerUnit,
      rateKey: "gutters.bracketPerUnit",
    });
    builder.line("gutters", {
      id: "clamps",
      label: "Obejmy rur spustowych",
      quantity: gutters.clampCount,
      unit: "szt.",
      unitPriceNet: rates.gutters.clampPerUnit,
      rateKey: "gutters.clampPerUnit",
    });
    if (gutters.leafGuards) {
      builder.line("gutters", {
        id: "leafGuards",
        label: "Siatki na liście",
        quantity: gutters.gutterLengthM,
        unit: "mb",
        unitPriceNet: rates.gutters.leafGuardPerMeter,
        rateKey: "gutters.leafGuardPerMeter",
      });
    }
  }

  // --- otwory --------------------------------------------------------------
  // Wymiary bierzemy z konfiguracji, bo BOM podaje je tylko jako tekst.
  const openings = Array.isArray(config.openings) ? config.openings : [];
  openings.forEach((opening, index) => {
    const widthM = Number(opening.widthM);
    const heightM = Number(opening.heightM);
    if (!Number.isFinite(widthM) || widthM <= 0 || !Number.isFinite(heightM) || heightM <= 0) return;

    const { price, steps } = openingUnitPrice(rates.openings, opening.kind, opening.model, widthM);
    const summaryEntry = summary.openings?.[index];
    const name =
      summaryEntry?.product
      || `${OPENING_KIND_LABELS[opening.kind] || "Otwór"} ${widthM}×${heightM} m`;

    builder.line("openings", {
      id: opening.id || `${opening.kind}-${index}`,
      // Dopłata za szerokość musi być widoczna w ofercie, inaczej klient nie
      // zrozumie, skąd wzięła się cena wyższa niż katalogowa.
      label: steps
        ? `${name} (${widthM} m, dopłata za ${steps} × ${GATE_WIDTH_STEP_M * 100} cm)`
        : name,
      quantity: 1,
      unit: "szt.",
      unitPriceNet: price,
      rateKey: `openings.${opening.kind}`,
    });
  });

  // --- oświetlenie ---------------------------------------------------------
  for (const [key, label] of Object.entries(LIGHTING_LABELS)) {
    if (!config.lighting?.[key]) continue;
    builder.line("lighting", {
      id: key,
      label,
      quantity: 1,
      unit: "kpl.",
      unitPriceNet: rates.lighting[key],
      rateKey: `lighting.${key}`,
    });
  }

  const groups = builder.build();
  const materialsNetGrosz = groups.reduce((sum, group) => sum + group.subtotalNetGrosz, 0);

  // --- robocizna, dodatki, marża, dostawa ---------------------------------
  const buildingAreaM2 = summary.panels?.footprint?.buildingAreaM2 || 0;
  const labourGroup = { id: "labour", label: GROUP_LABELS.labour, lines: [] };
  if (rates.labour.perM2BuildingArea > 0 && buildingAreaM2 > 0) {
    labourGroup.lines.push({
      id: "area",
      label: "Montaż wg powierzchni zabudowy",
      quantity: Math.round(buildingAreaM2 * 1000) / 1000,
      unit: "m²",
      unitPriceNet: rates.labour.perM2BuildingArea,
      totalNetGrosz: Math.round(toGrosz(rates.labour.perM2BuildingArea) * buildingAreaM2),
    });
  }
  if (rates.labour.percentOfMaterials > 0 && materialsNetGrosz > 0) {
    labourGroup.lines.push({
      id: "percent",
      label: `Robocizna ${rates.labour.percentOfMaterials}% wartości materiałów`,
      quantity: 1,
      unit: "kpl.",
      unitPriceNet: fromGrosz((materialsNetGrosz * rates.labour.percentOfMaterials) / 100),
      totalNetGrosz: Math.round((materialsNetGrosz * rates.labour.percentOfMaterials) / 100),
    });
  }
  const labourNetGrosz = labourGroup.lines.reduce((sum, line) => sum + line.totalNetGrosz, 0);
  if (labourGroup.lines.length) {
    labourGroup.subtotalNetGrosz = labourNetGrosz;
    groups.push(labourGroup);
  }

  const extrasGroup = { id: "extras", label: GROUP_LABELS.extras, lines: [] };
  for (const extra of rates.extras) {
    let totalNetGrosz = 0;
    if (extra.kind === "FIXED") totalNetGrosz = toGrosz(extra.value);
    else if (extra.kind === "PER_M2_BUILDING") {
      totalNetGrosz = Math.round(toGrosz(extra.value) * buildingAreaM2);
    } else if (extra.kind === "PERCENT_OF_MATERIALS") {
      totalNetGrosz = Math.round((materialsNetGrosz * extra.value) / 100);
    }
    if (totalNetGrosz <= 0) continue;
    extrasGroup.lines.push({
      id: extra.id,
      label: extra.label,
      quantity: 1,
      unit: "kpl.",
      unitPriceNet: fromGrosz(totalNetGrosz),
      totalNetGrosz,
    });
  }
  const extrasNetGrosz = extrasGroup.lines.reduce((sum, line) => sum + line.totalNetGrosz, 0);
  if (extrasGroup.lines.length) {
    extrasGroup.subtotalNetGrosz = extrasNetGrosz;
    groups.push(extrasGroup);
  }

  // Marża obejmuje materiały, robociznę i dodatki — nie dotyczy dostawy.
  const marginBaseGrosz = materialsNetGrosz + labourNetGrosz + extrasNetGrosz;
  const marginNetGrosz = Math.round((marginBaseGrosz * rates.marginPercent) / 100);

  const deliveryNetGrosz = toGrosz(rates.delivery.flat);
  if (deliveryNetGrosz > 0) {
    groups.push({
      id: "delivery",
      label: GROUP_LABELS.delivery,
      lines: [
        {
          id: "flat",
          label: "Transport",
          quantity: 1,
          unit: "kpl.",
          unitPriceNet: rates.delivery.flat,
          totalNetGrosz: deliveryNetGrosz,
        },
      ],
      subtotalNetGrosz: deliveryNetGrosz,
    });
  }

  const rawNetGrosz = marginBaseGrosz + marginNetGrosz + deliveryNetGrosz;
  // Zaokrąglamy tylko sumę netto; VAT liczymy od zaokrąglonej podstawy, żeby
  // netto + VAT zawsze dawało dokładnie brutto.
  const totalNetGrosz = applyRounding(rawNetGrosz, rates.rounding);
  const vatAmountGrosz = Math.round((totalNetGrosz * rates.vatRatePercent) / 100);

  return {
    schemaVersion: QUOTE_SCHEMA_VERSION,
    currency,
    priceListVersion,
    groups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      subtotalNet: fromGrosz(group.subtotalNetGrosz),
      lines: group.lines.map((line) => ({
        id: line.id,
        label: line.label,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceNet: line.unitPriceNet,
        totalNet: fromGrosz(line.totalNetGrosz),
      })),
    })),
    materialsNet: fromGrosz(materialsNetGrosz),
    labourNet: fromGrosz(labourNetGrosz),
    extrasNet: fromGrosz(extrasNetGrosz),
    deliveryNet: fromGrosz(deliveryNetGrosz),
    marginPercent: rates.marginPercent,
    marginNet: fromGrosz(marginNetGrosz),
    totalNet: fromGrosz(totalNetGrosz),
    vatRatePercent: rates.vatRatePercent,
    vatAmount: fromGrosz(vatAmountGrosz),
    totalGross: fromGrosz(totalNetGrosz + vatAmountGrosz),
    // Niekompletny cennik ma renderować „wycena niepełna", nigdy pewne 0,00 zł.
    incomplete: builder.missingRates.size > 0,
    missingRates: [...builder.missingRates].sort(),
  };
}

export function quoteFromConfiguration(configuration, priceList, options = {}) {
  return buildQuote({
    summary: projectSummary(configuration),
    configuration,
    priceList,
    ...options,
  });
}
