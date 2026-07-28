import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.cwd(), "public", "materials");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));

function uint24(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

async function webpSize(path) {
  const buffer = await readFile(path);
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8 ") {
    return [
      buffer.readUInt16LE(26) & 0x3fff,
      buffer.readUInt16LE(28) & 0x3fff,
    ];
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return [
      (bits & 0x3fff) + 1,
      ((bits >> 14) & 0x3fff) + 1,
    ];
  }
  if (chunk === "VP8X") {
    return [
      uint24(buffer, 24) + 1,
      uint24(buffer, 27) + 1,
    ];
  }
  throw new Error(`Unsupported WebP chunk ${chunk} in ${path}`);
}

test("material manifest documents all generated and CC0 sources", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.licensePolicy, /CC0/);
  assert.equal(Object.keys(manifest.woodFinishes).length, 16);
  assert.equal(Object.keys(manifest.panelWoodFinishes).length, 3);
  assert.equal(Object.keys(manifest.metalFamilies).length, 6);

  Object.values(manifest.woodFinishes).forEach((finish) => {
    assert.ok(finish.license);
    assert.ok(finish.author);
    assert.ok(finish.transformation);
    if (finish.license === "CC0 1.0") assert.match(finish.url, /^https:\/\/ambientcg\.com\//);
  });
});

test("sandwich-panel wood packs use role-specific smooth coated-steel maps", async () => {
  for (const [finishId, finish] of Object.entries(manifest.panelWoodFinishes)) {
    assert.equal(finish.license, "Project-owned generated asset");
    assert.match(finish.referenceUrl, /^https:\/\/www\.steelprofil\.eu\//);
    assert.match(finish.transformation, /smooth polyester-coated steel/);
    for (const [quality, expectedSize] of [["1k", 1024], ["2k", 2048]]) {
      for (const map of ["albedo", "normal", "roughness"]) {
        assert.deepEqual(
          await webpSize(resolve(root, "panel-wood", finishId, quality, `${map}.webp`)),
          [expectedSize, expectedSize],
        );
      }
    }
    assert.deepEqual(
      await webpSize(resolve(root, "panel-wood", finishId, "preview.webp")),
      [320, 320],
    );
  }
});

test("wood packs contain albedo, normal and roughness at both quality tiers", async () => {
  for (const finishId of Object.keys(manifest.woodFinishes)) {
    for (const [quality, expectedSize] of [["1k", 1024], ["2k", 2048]]) {
      for (const map of ["albedo", "normal", "roughness"]) {
        assert.deepEqual(
          await webpSize(resolve(root, "wood", finishId, quality, `${map}.webp`)),
          [expectedSize, expectedSize],
        );
      }
    }
    assert.deepEqual(
      await webpSize(resolve(root, "wood", finishId, "preview.webp")),
      [320, 320],
    );
  }
});

test("metal families contain shared normal and roughness maps", async () => {
  for (const family of Object.keys(manifest.metalFamilies)) {
    for (const [quality, expectedSize] of [["1k", 1024], ["2k", 2048]]) {
      for (const map of ["normal", "roughness"]) {
        assert.deepEqual(
          await webpSize(resolve(root, "metal", family, quality, `${map}.webp`)),
          [expectedSize, expectedSize],
        );
      }
    }
  }
});
