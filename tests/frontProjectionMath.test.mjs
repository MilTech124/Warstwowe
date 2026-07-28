import test from "node:test";
import assert from "node:assert/strict";
import {
  effectiveFrontOverhangM,
  frontProjectionAreas,
  frontProjectionDepth,
  frontProjectionRoofAssemblies,
  frontProjectionSideProfiles,
  roofSurfaceYAt,
} from "../src/scene/frontProjectionMath.js";

const ROOF_TYPES = [
  "single_back",
  "single_front",
  "single_right",
  "single_left",
  "gable_left_right",
  "gable_front_back",
];

function config(type, depthM = 0.5) {
  return {
    preset: "single_garage",
    dimensions: { widthM: 3.5, lengthM: 6, wallHeightM: 2.7 },
    roof: {
      type,
      pitchPercent: type.startsWith("gable") ? 28 : 8,
      overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
    },
    cladding: { roofPirThicknessMm: 80 },
    frontProjection: { depthM, liningFinish: "golden_oak" },
  };
}

test("depth zero preserves the original roof footprint input", () => {
  const subject = config("single_back", 0);
  assert.equal(frontProjectionDepth(subject), 0);
  assert.equal(effectiveFrontOverhangM(subject), 0.25);
  assert.deepEqual(frontProjectionSideProfiles(subject), []);
  assert.deepEqual(frontProjectionRoofAssemblies(subject), []);
  assert.deepEqual(frontProjectionAreas(subject), {
    outerWallM2: 0,
    liningSideM2: 0,
    liningRoofM2: 0,
    liningTotalM2: 0,
  });
});

for (const type of ROOF_TYPES) {
  test(`${type}: wings and lining follow the roof plane`, () => {
    const subject = config(type);
    assert.equal(frontProjectionDepth(subject), 0.5);
    assert.equal(effectiveFrontOverhangM(subject), 0.75);

    const profiles = frontProjectionSideProfiles(subject);
    assert.equal(profiles.length, 2);
    profiles.forEach((profile) => {
      assert.ok(Number.isFinite(profile.startTopY));
      assert.ok(Number.isFinite(profile.endTopY));
      assert.ok(profile.startTopY > 1.5);
      assert.ok(profile.endTopY > 1.5);
      assert.ok(Math.abs(
        profile.startTopY + 0.035 - roofSurfaceYAt(profile.x, profile.zStart, subject),
      ) < 1e-9);
      assert.ok(Math.abs(
        profile.endTopY + 0.035 - roofSurfaceYAt(profile.x, profile.zEnd, subject),
      ) < 1e-9);
    });

    const assemblies = frontProjectionRoofAssemblies(subject);
    assert.equal(assemblies.length, type === "gable_left_right" ? 2 : 1);
    assemblies.forEach((assembly) => {
      assert.ok(assembly.width > 0);
      assert.ok(assembly.length > 0);
      assert.ok(assembly.position.every(Number.isFinite));
      assert.ok(assembly.rotation.every(Number.isFinite));
    });

    const areas = frontProjectionAreas(subject);
    assert.ok(areas.outerWallM2 > 0);
    assert.ok(areas.liningRoofM2 > 0);
    assert.equal(areas.liningTotalM2, areas.liningSideM2 + areas.liningRoofM2);
  });
}

test("projection is unavailable for hall presets", () => {
  const subject = { ...config("gable_left_right", 1), preset: "hall" };
  assert.equal(frontProjectionDepth(subject), 0);
  assert.equal(effectiveFrontOverhangM(subject), 0.25);
});
