import assert from "node:assert/strict";
import test from "node:test";
import {
  formatLambda,
  formatU,
  manufacturerPresentation,
  productSpecs,
  specRows,
  uValueFor,
} from "../src/domain/catalogPresentation.js";

const CATALOG_WITH_MANUFACTURER = {
  panelManufacturers: [
    {
      key: "steelprofil",
      name: "SteelProfil S.A.",
      logoUrl: "https://blob.example/steelprofil.svg",
      tagline: "Rdzeń PIR, gwarancja 20 lat",
      products: [
        {
          kind: "WALL_PANEL",
          key: "smooth",
          specs: {
            coreType: "PIR",
            lambdaWmK: 0.021,
            uValues: [{ thicknessMm: 100, uWm2K: 0.19 }],
            datasheetUrl: "https://example/karta.pdf",
          },
        },
      ],
    },
  ],
};

test("dane producenta z bazy mają pierwszeństwo przed katalogiem statycznym", () => {
  const fromDatabase = manufacturerPresentation(CATALOG_WITH_MANUFACTURER, "WALL_PANEL", "steelprofil");
  assert.equal(fromDatabase.name, "SteelProfil S.A.");
  assert.equal(fromDatabase.logoUrl, "https://blob.example/steelprofil.svg");
  assert.equal(fromDatabase.tagline, "Rdzeń PIR, gwarancja 20 lat");
});

test("bez katalogu z bazy producent pochodzi z konfiguracji statycznej", () => {
  const fallback = manufacturerPresentation(null, "WALL_PANEL", "steelprofil");
  assert.equal(fallback.name, "SteelProfil");
  assert.equal(fallback.logoUrl, "");
  assert.ok(fallback.tagline.length > 0);

  assert.equal(manufacturerPresentation(null, "GATE", "wisniowski").name, "WIŚNIOWSKI");
  assert.equal(manufacturerPresentation(null, "WALL_PANEL", "nieznany"), null);
});

test("parametry modelu schodzą z bazy do katalogu statycznego", () => {
  const fromDatabase = productSpecs(CATALOG_WITH_MANUFACTURER, {
    kind: "WALL_PANEL",
    manufacturerKey: "steelprofil",
    modelKey: "smooth",
  });
  assert.equal(fromDatabase.lambdaWmK, 0.021);
  assert.equal(fromDatabase.datasheetUrl, "https://example/karta.pdf");

  const fallback = productSpecs(null, {
    kind: "WALL_PANEL",
    manufacturerKey: "steelprofil",
    modelKey: "smooth",
  });
  assert.equal(fallback.coreType, "PIR");
  assert.equal(fallback.lambdaWmK, 0.022);
  assert.deepEqual(fallback.uValues, []);

  const roof = productSpecs(null, {
    kind: "ROOF_PANEL",
    manufacturerKey: "default_roof_panels",
    modelKey: "pir_roof",
  });
  assert.equal(roof.coreType, "PIR");

  assert.equal(productSpecs(null, { kind: "GATE", manufacturerKey: "wisniowski", modelKey: "unipro" }), null);
});

test("U bierze wartość deklarowaną, a bez niej liczy z lambdy", () => {
  const specs = productSpecs(CATALOG_WITH_MANUFACTURER, {
    kind: "WALL_PANEL",
    manufacturerKey: "steelprofil",
    modelKey: "smooth",
  });

  assert.equal(uValueFor(specs, 100), 0.19);
  // 1 / (0,13 + 0,08/0,021 + 0,04) ≈ 0,251
  assert.equal(uValueFor(specs, 80), 0.251);
  // λ 0,022 i 100 mm → ≈ 0,212
  assert.equal(uValueFor({ lambdaWmK: 0.022, uValues: [] }, 100), 0.212);
});

test("brak danych nie wywraca wyliczeń ani opisu", () => {
  assert.equal(uValueFor(null, 100), null);
  assert.equal(uValueFor({ uValues: [] }, 100), null);
  assert.equal(uValueFor({ lambdaWmK: 0.022, uValues: [] }, 0), null);
  assert.deepEqual(specRows(null, 100), []);
  assert.equal(formatU(0), "");
  assert.equal(formatLambda(null), "");
});

test("opis techniczny oznacza wartość wyliczoną", () => {
  const declared = specRows(
    { coreType: "PIR", lambdaWmK: 0.021, uValues: [{ thicknessMm: 100, uWm2K: 0.19 }] },
    100,
  );
  assert.deepEqual(declared, [
    ["Rdzeń", "PIR"],
    ["Przewodność λ rdzenia", "0,021 W/(m·K)"],
    ["Współczynnik U (100 mm)", "0,190 W/(m²·K)"],
  ]);

  const computed = specRows({ coreType: "PIR", lambdaWmK: 0.022, uValues: [] }, 100);
  assert.equal(computed.at(-1)[1], "0,212 W/(m²·K) (wyliczony)");
});
