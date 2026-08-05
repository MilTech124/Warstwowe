// Kadry kamery. Od czasu wyciągnięcia ich z CameraRig ta jedna funkcja obsługuje
// zarówno podgląd na ekranie, jak i zrzuty do dokumentu ofertowego — rozjazd
// oznaczałby zdjęcie w ofercie inne niż obraz zaakceptowany przez klienta.

import test from "node:test";
import assert from "node:assert/strict";
import { CAMERA_VERTICAL_FOV, cameraView, orbitFitDistance, perspectiveFitDistance } from "@/scene/cameraViews";
import { roofFootprint } from "@/scene/geometry";

function config({ widthM = 6, lengthM = 9, wallHeightM = 3, type = "gable_left_right" } = {}) {
  return {
    // `preset` jest wymagany: frontProjectionDepth zwraca 0 dla presetów,
    // które wypustu nie mają, a od niego zależy obrys dachu.
    preset: "single_garage",
    dimensions: { widthM, lengthM, wallHeightM },
    roof: {
      type,
      pitchPercent: type.startsWith("gable") ? 28 : 8,
      overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
    },
    frontProjection: { depthM: 0 },
  };
}

const MODES = ["orbit", "front", "side", "top", "interior", "structure"];
const finite = (values) => values.every((value) => Number.isFinite(value));

test("każdy tryb zwraca skończone współrzędne", () => {
  for (const mode of MODES) {
    const { position, target } = cameraView(config(), mode);
    assert.equal(position.length, 3, mode);
    assert.equal(target.length, 3, mode);
    assert.ok(finite(position) && finite(target), `${mode}: NaN we współrzędnych`);
  }
});

test("nieznany tryb zachowuje się jak orbita", () => {
  assert.deepEqual(cameraView(config(), "nie-ma-takiego"), cameraView(config(), "orbit"));
});

test("orbitFitDistance rośnie z gabarytami i zgadza się z kadrem orbity", () => {
  const small = orbitFitDistance(config({ widthM: 4, lengthM: 6, wallHeightM: 2.5 }));
  const large = orbitFitDistance(config({ widthM: 12, lengthM: 24, wallHeightM: 6 }));
  assert.ok(large > small, "większy obiekt wymaga większego dystansu");

  // Ten sam wzór, którego CameraRig używa na min/maxDistance OrbitControls.
  const cfg = config();
  const { position, target } = cameraView(cfg, "orbit");
  const distance = Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  assert.ok(Math.abs(distance - orbitFitDistance(cfg)) < 1e-9, "dystans orbity");
});

test("widok konstrukcji odsuwa się o 8% względem orbity", () => {
  const cfg = config();
  const orbit = cameraView(cfg, "orbit");
  const structure = cameraView(cfg, "structure");
  const distanceOf = ({ position, target }) =>
    Math.hypot(position[0] - target[0], position[1] - target[1], position[2] - target[2]);
  assert.ok(Math.abs(distanceOf(structure) / distanceOf(orbit) - 1.08) < 1e-9);
});

test("widok z przodu patrzy zza krawędzi dachu, a nie ze środka bryły", () => {
  const cfg = config();
  const footprint = roofFootprint(cfg);
  const { position } = cameraView(cfg, "front");
  assert.ok(position[2] > footprint.centerZ + footprint.roofLength / 2, "kamera przed budynkiem");
  assert.ok(Math.abs(position[0] - footprint.centerX) < 1e-9, "wyśrodkowana w osi X");
});

test("widok z boku stoi z prawej strony, widok z góry nad środkiem", () => {
  const cfg = config();
  const footprint = roofFootprint(cfg);

  const side = cameraView(cfg, "side");
  assert.ok(side.position[0] > footprint.centerX + footprint.roofWidth / 2, "kamera z prawej");

  const top = cameraView(cfg, "top");
  assert.ok(top.position[1] > cfg.dimensions.wallHeightM, "kamera nad dachem");
  assert.deepEqual(top.target, [footprint.centerX, 0, footprint.centerZ], "celuje w posadzkę");
  // Minimalne odsunięcie w X/Z ratuje lookAt przed zdegenerowanym wektorem „w górę".
  assert.ok(top.position[0] !== footprint.centerX && top.position[2] !== footprint.centerZ);
});

test("wypust frontowy przesuwa kadr do przodu", () => {
  const withProjection = { ...config(), frontProjection: { depthM: 1.2 } };
  const front = cameraView(config(), "front");
  const frontWithProjection = cameraView(withProjection, "front");
  assert.ok(frontWithProjection.position[2] > front.position[2], "kamera cofa się przed wypust");
});

test("zmiana wymiaru zmienia kadr w każdym trybie zewnętrznym", () => {
  // Sygnatura memoizacji w CameraRig zawiera wymiary; gdyby kadr od nich nie
  // zależał, test byłby bezużyteczny — a gdyby zależał, a sygnatura nie,
  // kamera przestałaby podążać za suwakiem.
  for (const mode of ["orbit", "front", "side", "top", "structure"]) {
    const before = cameraView(config({ widthM: 6 }), mode);
    const after = cameraView(config({ widthM: 11 }), mode);
    assert.notDeepEqual(before.position, after.position, `tryb ${mode}`);
  }
});

test("perspectiveFitDistance skaluje się liniowo z rozpiętością", () => {
  assert.ok(Math.abs(perspectiveFitDistance(10) - 2 * perspectiveFitDistance(5)) < 1e-9);
  assert.ok(CAMERA_VERTICAL_FOV > 0 && CAMERA_VERTICAL_FOV < Math.PI / 2, "fov w radianach");
});
