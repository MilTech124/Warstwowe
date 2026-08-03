import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PRICE_LIST,
  isPriceListEmpty,
  normalizePriceList,
} from "@/domain/pricing/priceList";
import { quoteFromConfiguration } from "@/domain/pricing/quote";
import { projectSummary } from "@/lib/projectSummary";
import { createInitialConfiguratorConfig } from "@/store/configuratorStore";

/** Kompletny cennik — każda pozycja BOM ma stawkę, więc wycena jest pełna. */
const FULL_PRICE_LIST = {
  vatRatePercent: 23,
  panels: {
    wall: { defaultPerM2: 150, wastePercent: 10 },
    roof: { defaultPerM2: 180, wastePercent: 5 },
  },
  frontProjection: { liningPerM2: 220 },
  steel: { profilePerKg: 12, platePerKg: 14, anchorPerUnit: 9, fixingsPerKg: 18 },
  flashings: { defaultPerMeter: 35 },
  gutters: {
    gutterPerMeter: 60,
    downspoutPerMeter: 55,
    bracketPerUnit: 12,
    clampPerUnit: 8,
    leafGuardPerMeter: 20,
  },
  openings: {
    // Brama do 2,5 m w cenie; każde rozpoczęte 50 cm powyżej to +600 zł.
    gate: { default: { pricePerUnit: 3000, baseWidthM: 2.5, widthStepPrice: 600 } },
    door: { default: { pricePerUnit: 1200 } },
    window: { default: { pricePerUnit: 800 } },
    roofWindow: { default: { pricePerUnit: 1500 } },
  },
  lighting: {
    interiorLighting: 900,
    roofPerimeterLed: 1400,
    gateLamps: 400,
    exteriorSconces: 600,
    frontProjectionLed: 800,
  },
  labour: { perM2BuildingArea: 120, percentOfMaterials: 0 },
  extras: [],
  marginPercent: 0,
  delivery: { flat: 0, perKm: 0 },
  rounding: "NONE",
};

const config = () => createInitialConfiguratorConfig("single_garage");

// ------------------------------------------------------------- normalizacja

test("normalizePriceList uzupełnia braki i nigdy nie rzuca", () => {
  assert.deepEqual(normalizePriceList({}), DEFAULT_PRICE_LIST);
  assert.deepEqual(normalizePriceList(undefined), DEFAULT_PRICE_LIST);
  assert.deepEqual(normalizePriceList(null), DEFAULT_PRICE_LIST);

  const garbage = normalizePriceList({
    vatRatePercent: "abc",
    panels: { wall: { defaultPerM2: -5, wastePercent: 999 }, roof: { defaultPerM2: NaN } },
    steel: { profilePerKg: Infinity },
    extras: [{ kind: "NIEZNANY", value: 10 }, { id: "x", label: "Kran", kind: "FIXED", value: "12" }],
    marginPercent: 5000,
    rounding: "TO_7",
    nieznanyKlucz: true,
  });

  assert.equal(garbage.vatRatePercent, 23, "nieliczbowy VAT wraca do domyślnego");
  assert.equal(garbage.panels.wall.defaultPerM2, 0, "ujemna stawka jest odrzucana");
  assert.equal(garbage.panels.wall.wastePercent, 50, "zapas jest ograniczony");
  assert.equal(garbage.panels.roof.defaultPerM2, 0);
  assert.equal(garbage.steel.profilePerKg, 0, "Infinity nie jest stawką");
  assert.equal(garbage.marginPercent, 200, "marża jest ograniczona");
  assert.equal(garbage.rounding, "TO_1", "nieznany tryb zaokrąglania wraca do domyślnego");
  assert.equal(garbage.extras.length, 1, "pozycja o nieznanym rodzaju znika");
  assert.equal(garbage.extras[0].value, 12);
  assert.equal("nieznanyKlucz" in garbage, false, "nieznane klucze nie przechodzą dalej");
});

test("isPriceListEmpty rozpoznaje pusty cennik", () => {
  assert.equal(isPriceListEmpty({}), true);
  assert.equal(isPriceListEmpty(FULL_PRICE_LIST), false);
});

// -------------------------------------------------------------------- ilości

test("wycena korzysta z zestawienia materiałowego, nie liczy geometrii od nowa", () => {
  const cfg = config();
  const summary = projectSummary(cfg);
  const quote = quoteFromConfiguration(cfg, FULL_PRICE_LIST);

  const wallLine = quote.groups.find((g) => g.id === "panels_wall").lines[0];
  const expectedWall = summary.panels.wall.netM2 * 1.1;
  assert.equal(wallLine.quantity, Math.round(expectedWall * 1000) / 1000);
  assert.equal(wallLine.unitPriceNet, 150);
  assert.equal(wallLine.unit, "m²");

  const roofLine = quote.groups.find((g) => g.id === "panels_roof").lines[0];
  assert.equal(roofLine.quantity, Math.round(summary.panels.roof.netM2 * 1.05 * 1000) / 1000);

  const steelGroup = quote.groups.find((g) => g.id === "steel");
  const profiles = steelGroup.lines.find((l) => l.id === "profiles");
  assert.equal(profiles.quantity, Math.round(summary.steel.profileMassKg * 1000) / 1000);
  assert.equal(profiles.unit, "kg");

  const anchors = steelGroup.lines.find((l) => l.id === "anchors");
  assert.equal(anchors.quantity, summary.steel.anchorCount);
});

test("pusty cennik daje wycenę niepełną, a nie zero", () => {
  const quote = quoteFromConfiguration(config(), {});
  assert.equal(quote.incomplete, true);
  assert.ok(quote.missingRates.length > 0, "brakujące stawki są wymienione");
  assert.ok(quote.missingRates.includes("panels.wall"));
  assert.equal(quote.totalGross, 0);
  assert.equal(quote.groups.length, 0);
});

test("kompletny cennik daje wycenę pełną", () => {
  const quote = quoteFromConfiguration(config(), FULL_PRICE_LIST);
  assert.equal(quote.incomplete, false, `brakujące stawki: ${quote.missingRates.join(", ")}`);
  assert.ok(quote.totalNet > 0);
});

// ------------------------------------------------------------ VAT i pieniądze

test("netto + VAT zawsze równa się dokładnie brutto", () => {
  for (const vatRatePercent of [23, 8, 0]) {
    const quote = quoteFromConfiguration(config(), { ...FULL_PRICE_LIST, vatRatePercent });
    assert.equal(
      Math.round(quote.totalGross * 100),
      Math.round(quote.totalNet * 100) + Math.round(quote.vatAmount * 100),
      `VAT ${vatRatePercent}%`,
    );
  }
});

test("zaokrąglanie dotyczy tylko netto, a brutto liczone jest od zaokrąglonej podstawy", () => {
  const none = quoteFromConfiguration(config(), { ...FULL_PRICE_LIST, rounding: "NONE" });
  const toTen = quoteFromConfiguration(config(), { ...FULL_PRICE_LIST, rounding: "TO_10" });

  assert.equal(toTen.totalNet % 10, 0, "netto zaokrąglone do 10 zł");
  assert.ok(Math.abs(toTen.totalNet - none.totalNet) <= 5);
  assert.equal(
    Math.round(toTen.totalGross * 100),
    Math.round(toTen.totalNet * 100) + Math.round(toTen.vatAmount * 100),
  );
});

test("kwoty nie gubią się na groszach przy wielu pozycjach", () => {
  const quote = quoteFromConfiguration(config(), { ...FULL_PRICE_LIST, rounding: "NONE" });
  const sumOfGroups = quote.groups.reduce((sum, group) => sum + Math.round(group.subtotalNet * 100), 0);
  const sumOfLines = quote.groups.reduce(
    (sum, group) => sum + group.lines.reduce((inner, line) => inner + Math.round(line.totalNet * 100), 0),
    0,
  );
  assert.equal(sumOfGroups, sumOfLines, "sumy grup zgadzają się z pozycjami");
  assert.equal(Math.round(quote.totalNet * 100), sumOfGroups, "brak marży i dostawy = suma grup");
});

// ------------------------------------------------------------- monotoniczność

test("większy obiekt kosztuje więcej", () => {
  const small = config();
  const large = {
    ...small,
    dimensions: { ...small.dimensions, widthM: small.dimensions.widthM * 1.5 },
  };
  const quoteSmall = quoteFromConfiguration(small, FULL_PRICE_LIST);
  const quoteLarge = quoteFromConfiguration(large, FULL_PRICE_LIST);
  assert.ok(
    quoteLarge.totalNet > quoteSmall.totalNet,
    `${quoteLarge.totalNet} powinno być > ${quoteSmall.totalNet}`,
  );
});

test("dodanie otworu podnosi grupę otworów i obniża grupę płyt ściennych", () => {
  const base = config();
  const withDoor = {
    ...base,
    openings: [
      ...base.openings,
      {
        id: "extra-door",
        kind: "door",
        wall: "left",
        offsetM: 0,
        widthM: 1,
        heightM: 2,
        sillM: 0,
        model: "standard",
      },
    ],
  };

  const before = quoteFromConfiguration(base, FULL_PRICE_LIST);
  const after = quoteFromConfiguration(withDoor, FULL_PRICE_LIST);

  const openingsOf = (q) => q.groups.find((g) => g.id === "openings").subtotalNet;
  const wallOf = (q) => q.groups.find((g) => g.id === "panels_wall").subtotalNet;

  assert.ok(openingsOf(after) > openingsOf(before), "otwory drożeją");
  // Otwory są odejmowane od powierzchni płyt w panelBom — to łapie błąd znaku.
  assert.ok(wallOf(after) < wallOf(before), "powierzchnia płyt ściennych maleje");
});

// ------------------------------------------------------------ marża i dodatki

test("marża obejmuje materiały i robociznę, ale nie dostawę", () => {
  const cfg = config();
  const withoutMargin = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    delivery: { flat: 1000, perKm: 0 },
  });
  const withMargin = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    marginPercent: 10,
    delivery: { flat: 1000, perKm: 0 },
  });

  const base = withoutMargin.materialsNet + withoutMargin.labourNet + withoutMargin.extrasNet;
  assert.equal(withoutMargin.marginNet, 0);
  assert.equal(
    Math.round(withMargin.marginNet * 100),
    Math.round((Math.round(base * 100) * 10) / 100),
    "marża liczona od materiałów + robocizny + dodatków",
  );
  assert.equal(withMargin.deliveryNet, 1000);
});

test("pozycje dodatkowe działają w trzech trybach", () => {
  const cfg = config();
  const summary = projectSummary(cfg);
  const areaM2 = summary.panels.footprint.buildingAreaM2;

  const quote = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    extras: [
      { id: "a", label: "Projekt", kind: "FIXED", value: 500 },
      { id: "b", label: "Posadzka", kind: "PER_M2_BUILDING", value: 10 },
      { id: "c", label: "Narzut", kind: "PERCENT_OF_MATERIALS", value: 5 },
    ],
  });

  const extras = quote.groups.find((g) => g.id === "extras");
  assert.equal(extras.lines.find((l) => l.id === "a").totalNet, 500);
  assert.equal(extras.lines.find((l) => l.id === "b").totalNet, Math.round(10 * areaM2 * 100) / 100);
  assert.equal(
    Math.round(extras.lines.find((l) => l.id === "c").totalNet * 100),
    Math.round((Math.round(quote.materialsNet * 100) * 5) / 100),
  );
});

// ---------------------------------------------------------------- precedencja

test("stawka per model bije stawkę per grubość, a ta bazową", () => {
  const cfg = config();
  const summary = projectSummary(cfg);
  const thickness = String(summary.panels.wall.thicknessMm);
  const modelId = cfg.cladding.model;

  const byThickness = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    panels: {
      ...FULL_PRICE_LIST.panels,
      wall: { defaultPerM2: 150, wastePercent: 0, byThicknessMm: { [thickness]: 200 } },
    },
  });
  assert.equal(byThickness.groups.find((g) => g.id === "panels_wall").lines[0].unitPriceNet, 200);

  const byModel = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    panels: {
      ...FULL_PRICE_LIST.panels,
      wall: {
        defaultPerM2: 150,
        wastePercent: 0,
        byThicknessMm: { [thickness]: 200 },
        byModelId: { [modelId]: 275 },
      },
    },
  });
  assert.equal(byModel.groups.find((g) => g.id === "panels_wall").lines[0].unitPriceNet, 275);
});

// ------------------------------------------------------------------- otwory

test("drzwi i okna mają sztywną cenę za sztukę, niezależną od wymiaru", () => {
  const base = config();
  const withOpenings = (widthM, heightM) => ({
    ...base,
    openings: [
      {
        id: "d1",
        kind: "door",
        wall: "left",
        offsetM: 0,
        widthM,
        heightM,
        sillM: 0,
        model: "standard",
      },
    ],
  });

  const small = quoteFromConfiguration(withOpenings(0.9, 2), FULL_PRICE_LIST);
  const large = quoteFromConfiguration(withOpenings(1.4, 2.4), FULL_PRICE_LIST);

  const doorLine = (q) => q.groups.find((g) => g.id === "openings").lines[0];
  assert.equal(doorLine(small).unitPriceNet, 1200);
  assert.equal(doorLine(large).unitPriceNet, 1200, "większe drzwi kosztują tyle samo");
  assert.equal(doorLine(small).unit, "szt.");
});

test("brama dolicza dopłatę za każde rozpoczęte 50 cm ponad szerokość bazową", () => {
  const base = config();
  const gate = (widthM) => ({
    ...base,
    openings: [
      {
        id: "g1",
        kind: "gate",
        wall: "front",
        offsetM: 0,
        widthM,
        heightM: 2.25,
        sillM: 0,
        model: "prime",
      },
    ],
  });
  const priceOf = (widthM) =>
    quoteFromConfiguration(gate(widthM), FULL_PRICE_LIST).groups.find((g) => g.id === "openings")
      .lines[0].unitPriceNet;

  assert.equal(priceOf(2.5), 3000, "szerokość bazowa bez dopłaty");
  assert.equal(priceOf(2.0), 3000, "węższa brama nie jest tańsza");
  assert.equal(priceOf(2.6), 3600, "rozpoczęte 50 cm to pełny krok");
  assert.equal(priceOf(3.0), 3600, "dokładnie 50 cm ponad bazę to jeden krok");
  assert.equal(priceOf(3.01), 4200, "3,01 m to już drugi krok");
  assert.equal(priceOf(4.0), 4800, "150 cm ponad bazę to trzy kroki");
});

test("etykieta bramy ujawnia dopłatę za szerokość", () => {
  const base = config();
  const quote = quoteFromConfiguration(
    {
      ...base,
      openings: [
        { id: "g1", kind: "gate", wall: "front", offsetM: 0, widthM: 3.4, heightM: 2.25, sillM: 0, model: "prime" },
      ],
    },
    FULL_PRICE_LIST,
  );
  const label = quote.groups.find((g) => g.id === "openings").lines[0].label;
  assert.match(label, /dopłata za 2 × 50 cm/);
});

test("cena per model bramy bije stawkę domyślną", () => {
  const base = config();
  const cfg = {
    ...base,
    openings: [
      { id: "g1", kind: "gate", wall: "front", offsetM: 0, widthM: 3.0, heightM: 2.25, sillM: 0, model: "prime" },
    ],
  };
  const quote = quoteFromConfiguration(cfg, {
    ...FULL_PRICE_LIST,
    openings: {
      ...FULL_PRICE_LIST.openings,
      gate: {
        default: { pricePerUnit: 3000, baseWidthM: 2.5, widthStepPrice: 600 },
        byModelId: { prime: { pricePerUnit: 5000, baseWidthM: 3.0, widthStepPrice: 900 } },
      },
    },
  });
  // Model prime ma bazę 3,0 m, więc brama 3,0 m nie ma dopłaty.
  assert.equal(quote.groups.find((g) => g.id === "openings").lines[0].unitPriceNet, 5000);
});
