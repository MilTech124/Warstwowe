import test from "node:test";
import assert from "node:assert/strict";
import {
  FINISH_IDS,
  FINISH_PRESETS,
  FINISH_ROLES,
  getFinishForRole,
  getFinishesForRole,
} from "../src/config/materialFinishes.js";
import {
  DEFAULT_GATE_SELECTION,
  getGateAvailableColors,
} from "../src/config/catalog.js";

test("finish catalog contains 29 metals and 16 wood decors", () => {
  assert.equal(FINISH_IDS.length, 45);
  assert.equal(new Set(FINISH_IDS).size, FINISH_IDS.length);
  assert.equal(Object.values(FINISH_PRESETS).filter((finish) => finish.kind === "metal").length, 29);
  assert.equal(Object.values(FINISH_PRESETS).filter((finish) => finish.kind === "wood").length, 16);
});

test("every finish exposes the complete public material contract", () => {
  Object.entries(FINISH_PRESETS).forEach(([id, finish]) => {
    assert.equal(finish.id, id);
    assert.ok(finish.label);
    assert.match(finish.hex, /^#[0-9A-F]{6}$/i);
    assert.ok(finish.surfaceFamily);
    assert.ok(Array.isArray(finish.scaleM));
    assert.equal(finish.scaleM.length, 2);
    assert.ok(finish.maps.balanced);
    assert.ok(finish.maps.high);
    assert.ok(Number.isFinite(finish.roughness));
    assert.ok(Number.isFinite(finish.metalness));
    assert.ok(finish.allowedRoles.length > 0);
    finish.allowedRoles.forEach((role) => assert.ok(FINISH_ROLES.includes(role)));
  });
});

test("legacy configuration identifiers remain available", () => {
  ["anthracite", "silver", "graphite", "white", "golden_oak", "walnut", "winchester"].forEach((id) => {
    assert.equal(FINISH_PRESETS[id].id, id);
  });
});

test("role compatibility follows conservative sandwich-panel availability", () => {
  const roof = Object.values(getFinishesForRole("roof"));
  const wall = Object.values(getFinishesForRole("wall"));
  const flashing = Object.values(getFinishesForRole("flashing"));
  const gate = Object.values(getFinishesForRole("gate"));

  assert.equal(roof.filter((finish) => finish.kind === "wood").length, 0);
  assert.equal(roof.filter((finish) => finish.kind === "metal").length, 5);
  assert.equal(wall.filter((finish) => finish.kind === "metal").length, 7);
  assert.deepEqual(
    wall.filter((finish) => finish.kind === "wood").map((finish) => finish.id),
    ["golden_oak", "dark_oak", "bog_oak"],
  );
  assert.equal(flashing.length, 19);
  assert.equal(gate.filter((finish) => finish.kind === "wood").length, 16);
  assert.equal(getFinishForRole("walnut", "roof", "graphite").id, "graphite");
  assert.equal(getFinishForRole("walnut", "wall").id, "anthracite");
  assert.match(getFinishForRole("golden_oak", "wall").preview, /panel-wood/);
  assert.equal(getFinishForRole("golden_oak", "wall").grainAxis.wall, "horizontal");
});

test("gate structures retain commercial finish constraints", () => {
  const sandgrain = getGateAvailableColors({
    ...DEFAULT_GATE_SELECTION,
    structure: "sandgrain",
  });
  const smoothgrain = getGateAvailableColors({
    ...DEFAULT_GATE_SELECTION,
    structure: "smoothgrain",
  });

  assert.equal(Object.values(sandgrain).some((finish) => finish.kind === "wood"), false);
  assert.equal(Object.values(smoothgrain).filter((finish) => finish.kind === "wood").length, 16);
});
