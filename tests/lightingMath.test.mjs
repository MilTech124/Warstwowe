import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLighting } from "../src/config/lighting.js";
import {
  exteriorSconcePlacements,
  frontProjectionLedSegments,
  gateLampPlacements,
  interiorLampPlacements,
  interiorSoftLightPlacement,
  roofPerimeterLedSegments,
  sampleSegmentPoints,
} from "../src/scene/lightingMath.js";
import { roofSurfaceYAt } from "../src/scene/frontProjectionMath.js";

const ROOF_TYPES = [
  "single_back",
  "single_front",
  "single_right",
  "single_left",
  "gable_left_right",
  "gable_front_back",
];

function config(type, depthM = 0.6) {
  return {
    preset: "single_garage",
    dimensions: { widthM: 4, lengthM: 6, wallHeightM: 2.7 },
    roof: {
      type,
      pitchPercent: type.startsWith("gable") ? 28 : 8,
      overhangM: { front: 0.3, back: 0.25, left: 0.2, right: 0.35 },
    },
    cladding: { roofPirThicknessMm: 80 },
    frontProjection: { depthM, liningFinish: "golden_oak" },
    openings: [],
  };
}

for (const type of ROOF_TYPES) {
  test(`${type}: roof LED follows every exterior roof edge`, () => {
    const subject = config(type);
    const segments = roofPerimeterLedSegments(subject);
    assert.equal(segments.length, type.startsWith("gable") ? 6 : 4);

    segments.forEach((item) => {
      assert.ok(item.length > 0);
      assert.ok(item.start.every(Number.isFinite));
      assert.ok(item.end.every(Number.isFinite));
      const surfaceDelta = roofSurfaceYAt(item.end[0], item.end[2], subject)
        - roofSurfaceYAt(item.start[0], item.start[2], subject);
      assert.ok(Math.abs((item.end[1] - item.start[1]) - surfaceDelta) < 1e-9);
      assert.ok(item.lightDirection.every(Number.isFinite));
      [item.start, item.end].forEach((point) => {
        assert.ok(Math.abs(point[0]) <= subject.dimensions.widthM / 2 + 0.101);
        assert.ok(Math.abs(point[2]) <= subject.dimensions.lengthM / 2 + 0.101);
        const nearWallX = Math.abs(Math.abs(point[0]) - subject.dimensions.widthM / 2) <= 0.101;
        const nearWallZ = Math.abs(Math.abs(point[2]) - subject.dimensions.lengthM / 2) <= 0.101;
        assert.ok(nearWallX || nearWallZ);
      });
    });

    const points = sampleSegmentPoints(segments, 5);
    assert.equal(points.length, 5);
    assert.ok(points.every((point) => point.position.every(Number.isFinite)));
  });
}

test("gate lamps are placed over every gate and follow wall orientation", () => {
  const subject = config("single_back");
  subject.openings = [
    { id: "front-gate", kind: "gate", wall: "front", offsetM: -0.5, widthM: 2.5, heightM: 2.25, sillM: 0 },
    { id: "back-gate", kind: "gate", wall: "back", offsetM: 0.4, widthM: 2.2, heightM: 2.1, sillM: 0 },
    { id: "left-gate", kind: "gate", wall: "left", offsetM: -0.6, widthM: 2.4, heightM: 2.2, sillM: 0 },
    { id: "right-gate", kind: "gate", wall: "right", offsetM: 0.7, widthM: 2.8, heightM: 2.35, sillM: 0 },
    { id: "window", kind: "window", wall: "front", offsetM: 1, widthM: 1, heightM: 1, sillM: 1 },
  ];

  const placements = gateLampPlacements(subject);
  assert.equal(placements.length, 4);
  assert.deepEqual(
    Object.fromEntries(placements.map((item) => [item.wall, item.rotation[1]])),
    {
      front: 0,
      back: Math.PI,
      left: -Math.PI / 2,
      right: Math.PI / 2,
    },
  );
  placements.forEach((item) => {
    assert.ok(item.width >= 0.9 && item.width <= 2.4);
    assert.ok(item.localPosition[1] > 1);
    assert.ok(item.localPosition[2] >= 0.02 && item.localPosition[2] <= 0.04);
    assert.ok(item.position.every(Number.isFinite));
  });
});

test("projection LED exists only when a compatible projection has depth", () => {
  assert.equal(frontProjectionLedSegments(config("single_back", 0)).length, 0);
  assert.equal(frontProjectionLedSegments(config("single_back", 0.6)).length, 3);
  assert.equal(frontProjectionLedSegments(config("gable_left_right", 0.6)).length, 4);

  const hall = { ...config("gable_left_right", 0.6), preset: "hall" };
  assert.equal(frontProjectionLedSegments(hall).length, 0);
});

for (const type of ROOF_TYPES) {
  test(`${type}: projection LED follows the inner roof and wall flashings`, () => {
    const subject = config(type, 0.8);
    subject.cladding.wallPirThicknessMm = 80;
    const segments = frontProjectionLedSegments(subject);
    const expectedRoofSegments = type === "gable_left_right" ? 2 : 1;
    assert.equal(segments.length, expectedRoofSegments + 2);

    const zEnd = subject.dimensions.lengthM / 2 + subject.frontProjection.depthM;
    const roofSegments = segments.filter((item) => item.name.includes("roof-flashing"));
    const wallSegments = segments.filter((item) => item.name.includes("wall-flashing"));
    assert.equal(roofSegments.length, expectedRoofSegments);
    assert.equal(wallSegments.length, 2);

    segments.forEach((item) => {
      assert.ok(item.length > 0);
      assert.ok(item.start.every(Number.isFinite));
      assert.ok(item.end.every(Number.isFinite));
      assert.ok(item.lightDirection.every(Number.isFinite));
      assert.ok(item.start[2] < zEnd);
      assert.ok(item.end[2] < zEnd);
    });

    wallSegments.forEach((item) => {
      assert.equal(item.start[0], item.end[0]);
      assert.equal(item.start[2], item.end[2]);
      assert.ok(item.end[1] > item.start[1]);
      assert.ok(Math.abs(item.start[0]) < subject.dimensions.widthM / 2 - 0.16);
      assert.ok(zEnd - item.start[2] <= 0.005);
    });
  });
}

test("interior LED fixtures scale with the building and remain inside its walls", () => {
  const subject = config("single_back");
  const fixtures = interiorLampPlacements(subject);
  assert.equal(fixtures.length, 4);
  fixtures.forEach((fixture) => {
    assert.ok(Math.abs(fixture.position[0]) < subject.dimensions.widthM / 2);
    assert.ok(Math.abs(fixture.position[2]) < subject.dimensions.lengthM / 2);
    assert.ok(fixture.position[1] < subject.dimensions.wallHeightM);
    assert.ok(fixture.length >= 0.9 && fixture.length <= 1.5);
  });

  const hall = config("gable_left_right");
  hall.dimensions = { widthM: 12, lengthM: 20, wallHeightM: 5 };
  assert.equal(interiorLampPlacements(hall).length, 24);
});

test("one soft interior area light stays inside the garage footprint", () => {
  const subject = config("single_back");
  const light = interiorSoftLightPlacement(subject);
  assert.deepEqual(light.position.slice(0, 1), [0]);
  assert.equal(light.position[2], 0);
  assert.ok(light.position[1] > 2 && light.position[1] < subject.dimensions.wallHeightM);
  assert.ok(light.width > 0 && light.width < subject.dimensions.widthM);
  assert.ok(light.length > 0 && light.length < subject.dimensions.lengthM);
});

test("exterior sconces are symmetric and mounted only on the front facade", () => {
  const subject = config("single_back");
  const sconces = exteriorSconcePlacements(subject);
  assert.equal(sconces.length, 2);
  assert.equal(sconces[0].position[0], -sconces[1].position[0]);
  sconces.forEach((sconce) => {
    assert.ok(sconce.position[2] > subject.dimensions.lengthM / 2);
    assert.ok(sconce.position[1] > 1.7);
    assert.deepEqual(sconce.rotation, [0, 0, 0]);
  });
});

test("lighting normalization blocks projection LED when projection is unavailable", () => {
  const selected = {
    interiorLighting: true,
    roofPerimeterLed: true,
    gateLamps: true,
    exteriorSconces: true,
    frontProjectionLed: true,
  };
  assert.deepEqual(normalizeLighting(selected, { frontProjectionAvailable: true }), selected);
  assert.deepEqual(
    normalizeLighting(selected, { frontProjectionAvailable: false }),
    { ...selected, frontProjectionLed: false },
  );
});
