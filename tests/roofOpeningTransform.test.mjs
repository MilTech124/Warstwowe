import assert from "node:assert/strict";
import test from "node:test";
import { roofOpeningTransform } from "../src/scene/geometry.js";

const config = {
  preset: "single_garage",
  dimensions: { widthM: 3.5, lengthM: 6, wallHeightM: 2.5 },
  roof: {
    type: "single_back",
    pitchPercent: 10,
    overhangM: { front: 0.25, back: 0.25, left: 0.2, right: 0.2 },
  },
  frontProjection: { depthM: 0 },
};

test("transformacja okna dachowego ma dostęp do obrysu dachu", () => {
  const transform = roofOpeningTransform(
    { offsetM: 0, sillM: 0, widthM: 0.8, heightM: 1.2 },
    config,
  );

  assert.equal(transform.position.length, 3);
  assert.equal(transform.localPosition.length, 3);
  assert.equal(
    [...transform.position, ...transform.localPosition, ...transform.rotation].every(Number.isFinite),
    true,
  );
});
