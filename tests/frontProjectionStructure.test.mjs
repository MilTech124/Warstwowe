import test from "node:test";
import assert from "node:assert/strict";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureInputs } from "@/scene/structure/inputs";
import { steelBom } from "@/lib/bom/steelBom";

const ROOF_TYPES = [
  "single_back",
  "single_front",
  "single_right",
  "single_left",
  "gable_left_right",
  "gable_front_back",
];

function config(type, depthM = 0.5, preset = "single_garage") {
  const double = preset === "double_garage";
  return {
    preset,
    dimensions: double
      ? { widthM: 6, lengthM: 6, wallHeightM: 2.8 }
      : { widthM: 3.5, lengthM: 6, wallHeightM: 2.7 },
    roof: {
      type,
      pitchPercent: type.startsWith("gable") ? 28 : 8,
      overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
    },
    cladding: { wallPirThicknessMm: 60, roofPirThicknessMm: 80 },
    frontProjection: { depthM, liningFinish: "golden_oak" },
    structure: { reinforcement: "standard", snowZone: 2, visible: true },
    openings: [],
  };
}

test("depth zero does not add projection steel", () => {
  const model = buildStructure(structureInputs(config("single_back", 0)));
  assert.equal(model.members.filter((member) => member.role.startsWith("projection")).length, 0);
});

for (const type of ROOF_TYPES) {
  test(`${type}: open portal has two edge posts and valid members`, () => {
    const baseModel = buildStructure(structureInputs(config(type, 0)));
    const model = buildStructure(structureInputs(config(type, 0.5)));
    const projectionMembers = model.members.filter((member) => member.role.startsWith("projection"));
    const posts = projectionMembers.filter((member) => member.role === "projectionPost");

    assert.equal(posts.length, 2);
    assert.ok(posts.every((post) => Math.abs(post.start[0]) > 1));
    assert.ok(projectionMembers.length > 4);
    assert.ok(projectionMembers.every((member) => member.lengthM > 0.05));
    assert.equal(model.plates.length, baseModel.plates.length + 2);
    assert.ok(steelBom(model).totalMassKg > steelBom(baseModel).totalMassKg);
    assert.equal(
      model.warnings.filter((warning) => warning.code === "profile_missing" && warning.role?.startsWith("projection")).length,
      0,
    );
  });
}

test("double garage keeps the front opening clear", () => {
  const model = buildStructure(structureInputs(config("gable_left_right", 1.5, "double_garage")));
  const posts = model.members.filter((member) => member.role === "projectionPost");
  assert.equal(posts.length, 2);
  assert.ok(posts.every((post) => Math.abs(post.start[0]) > 2.5));
});
