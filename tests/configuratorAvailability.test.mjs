import assert from "node:assert/strict";
import test from "node:test";
import { getPresetDefaults, getPresetOpenings, PRESETS } from "../src/config/catalog.js";
import { normalizeConfigurationAvailability } from "../src/domain/configuratorAvailability.js";

function baseConfiguration() {
  const defaults = getPresetDefaults("single_garage");
  return {
    preset: "single_garage",
    dimensions: { ...PRESETS.single_garage.dimensions },
    roof: defaults.roof,
    cladding: defaults.cladding,
    flashings: defaults.flashings,
    gutters: defaults.gutters,
    openings: getPresetOpenings("single_garage"),
  };
}

test("ustawienia firmy normalizują dach, otwory, produkty i akcesoria", () => {
  const normalized = normalizeConfigurationAvailability(baseConfiguration(), {
    allowedRoofTypeIds: ["gable_left_right"],
    allowedOpeningKinds: ["door"],
    allowedPanelManufacturerIds: ["steelprofil"],
    allowedWallPanelModelIds: ["smooth"],
    allowedRoofPanelModelIds: ["pir_roof"],
    allowedDoorModelIds: ["thermo_solid"],
  }, {
    flashings: false,
    gutters: false,
  });

  assert.equal(normalized.roof.type, "gable_left_right");
  assert.equal(normalized.cladding.manufacturer, "steelprofil");
  assert.equal(normalized.cladding.model, "smooth");
  assert.equal(normalized.flashings.enabled, false);
  assert.equal(normalized.gutters.enabled, false);
  assert.ok(normalized.openings.every((opening) => opening.kind === "door"));
  assert.ok(normalized.openings.every((opening) => opening.model === "thermo_solid"));
});

test("puste listy zachowują zgodność ze starszymi ustawieniami", () => {
  const original = baseConfiguration();
  const normalized = normalizeConfigurationAvailability(original, {}, { flashings: true, gutters: true });
  assert.equal(normalized.roof.type, original.roof.type);
  assert.equal(normalized.openings.length, original.openings.length);
});
