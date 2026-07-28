import test from "node:test";
import assert from "node:assert/strict";
import {
  PRESETS,
  getPresetDefaults,
  getPresetOpenings,
} from "@/config/catalog";
import { buildStructure } from "@/scene/structure/buildStructure";
import { DEFAULT_STRUCTURE, structureInputs } from "@/scene/structure/inputs";

function presetConfig(preset) {
  const defaults = getPresetDefaults(preset);

  return {
    preset,
    dimensions: { ...PRESETS[preset].dimensions },
    roof: defaults.roof,
    cladding: defaults.cladding,
    frontProjection: { depthM: 0 },
    structure: { ...DEFAULT_STRUCTURE },
    openings: getPresetOpenings(preset),
  };
}

for (const preset of Object.keys(PRESETS)) {
  test(`${preset}: preset windows do not cross portal frames`, () => {
    const model = buildStructure(structureInputs(presetConfig(preset)));
    const collisions = model.warnings.filter(
      (warning) => warning.code === "window_crosses_frame",
    );

    assert.deepEqual(
      collisions,
      [],
      collisions.map((warning) => warning.message).join("\n"),
    );
  });
}
