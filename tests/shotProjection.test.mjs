// Rzutowanie punktów świata na piksele zrzutu 3D — matematyka opisów wymiarowych
// domalowywanych na wizualizacjach w ofercie.

import test from "node:test";
import assert from "node:assert/strict";
import { Matrix4, PerspectiveCamera, Vector3 } from "three";
import { projectPoint, shotAnnotations } from "@/lib/capture/annotateShot";
import { cameraView } from "@/scene/cameraViews";

// Lustro CAPTURE_VIEWS. Samego modułu nie importujemy: captureViews.js ciągnie
// @react-three/drei, którego nie da się załadować poza przeglądarką.
const CAPTURE_VIEWS = [
  { id: "orbit", cameraMode: "orbit" },
  { id: "front", cameraMode: "front" },
  { id: "side", cameraMode: "side" },
  { id: "top", cameraMode: "top" },
  { id: "structure", cameraMode: "structure" },
];

const IDENTITY = { viewProjection: new Matrix4().elements.slice(), pixelWidth: 800, pixelHeight: 600 };

const config = ({ widthM = 6, lengthM = 9, wallHeightM = 3, type = "gable_left_right" } = {}) => ({
  preset: "double_garage",
  dimensions: { widthM, lengthM, wallHeightM },
  roof: {
    type,
    pitchPercent: type.startsWith("gable") ? 28 : 8,
    overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
  },
  cladding: { wallPirThicknessMm: 60, roofPirThicknessMm: 80 },
  frontProjection: { depthM: 0 },
});

/** Ta sama macierz, którą captureViews zapisuje wewnątrz `shoot`. */
function projectionFor(cfg, cameraMode, pixelWidth = 1600, pixelHeight = 900) {
  const camera = new PerspectiveCamera(38, pixelWidth / pixelHeight, 0.08, 320);
  const { position, target } = cameraView(cfg, cameraMode);
  camera.position.set(...position);
  camera.up.set(0, 1, 0);
  camera.lookAt(new Vector3(...target));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
  return {
    viewProjection: camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).toArray(),
    pixelWidth,
    pixelHeight,
  };
}

// --- projectPoint --------------------------------------------------------

test("środek frustum trafia w środek bitmapy", () => {
  const point = projectPoint([0, 0, -1], IDENTITY);
  assert.ok(point.visible);
  assert.ok(Math.abs(point.x - 400) < 1e-9, "poziomo");
  assert.ok(Math.abs(point.y - 300) < 1e-9, "pionowo");
});

test("oś Y rośnie w górę w NDC, a w dół w pikselach", () => {
  const up = projectPoint([0, 0.5, -1], IDENTITY);
  const down = projectPoint([0, -0.5, -1], IDENTITY);
  assert.ok(up.y < down.y, "punkt wyżej w świecie ma mniejszy Y w pikselach");
});

test("rozmiar bitmapy skaluje wynik liniowo", () => {
  const small = projectPoint([0.5, 0.25, -1], IDENTITY);
  const large = projectPoint([0.5, 0.25, -1], { ...IDENTITY, pixelWidth: 1600, pixelHeight: 1200 });
  assert.ok(Math.abs(large.x - small.x * 2) < 1e-9, "X skaluje się dwukrotnie");
  assert.ok(Math.abs(large.y - small.y * 2) < 1e-9, "Y skaluje się dwukrotnie");
});

test("punkt za kamerą jest niewidoczny zamiast trafiać w odbite miejsce", () => {
  // Bez sprawdzenia w > 0 dzielenie odbijałoby współrzędną i miarka wychodziłaby
  // po przeciwnej stronie obrazu. Potrzebna prawdziwa perspektywa — przy macierzy
  // jednostkowej w wynosi zawsze 1 i pojęcie „za kamerą" nie istnieje.
  const cfg = config();
  const projection = projectionFor(cfg, "front");
  const cameraZ = cameraView(cfg, "front").position[2];

  assert.equal(projectPoint([0, 1, cameraZ + 5], projection).visible, false, "punkt za kamerą");
  assert.equal(projectPoint([0, 1, 0], projection).visible, true, "punkt przed kamerą");
});

test("prawdziwa kamera widoku frontowego rzutuje bryłę do wnętrza kadru", () => {
  const cfg = config();
  const projection = projectionFor(cfg, "front");
  const corners = [
    [-3, 0, 4.5],
    [3, 0, 4.5],
    [-3, 3, 4.5],
    [3, 3, 4.5],
  ];
  for (const corner of corners) {
    const point = projectPoint(corner, projection);
    assert.ok(point.visible, `narożnik ${corner} musi być przed kamerą`);
    assert.ok(point.x > 0 && point.x < projection.pixelWidth, `${corner}: X w kadrze`);
    assert.ok(point.y > 0 && point.y < projection.pixelHeight, `${corner}: Y w kadrze`);
  }
});

test("lewy narożnik jest na rysunku po lewej stronie prawego", () => {
  const projection = projectionFor(config(), "front");
  const left = projectPoint([-3, 1, 4.5], projection);
  const right = projectPoint([3, 1, 4.5], projection);
  assert.ok(left.x < right.x, "widok frontowy nie może być odbity");
});

// --- shotAnnotations -----------------------------------------------------

test("hero shot i szkielet zostają bez miarek", () => {
  assert.deepEqual(shotAnnotations(config(), "orbit"), []);
  assert.deepEqual(shotAnnotations(config(), "structure"), []);
});

test("widok frontowy opisuje szerokość, okap i kalenicę", () => {
  const rows = shotAnnotations(config(), "front");
  assert.equal(rows.length, 3, "dwuspad ma też wymiar do kalenicy");
  assert.equal(rows[0].label, "6,00 m", "szerokość obiektu");
  assert.ok(rows.every((row) => row.label.endsWith(" m")), "etykiety w metrach");
});

test("jednospad w bok nie dokłada wymiaru kalenicy na froncie", () => {
  // Na ścianie frontowej jednospadu lewo/prawo okap i kalenica to ta sama linia.
  const rows = shotAnnotations(config({ type: "single_back" }), "front");
  assert.equal(rows.length, 2);
});

test("widok boczny opisuje długość, widok z góry oba wymiary rzutu", () => {
  const side = shotAnnotations(config(), "side");
  assert.equal(side[0].label, "9,00 m", "długość obiektu");

  const top = shotAnnotations(config(), "top");
  assert.equal(top.length, 2);
  assert.deepEqual(top.map((row) => row.label), ["6,00 m", "9,00 m"]);
});

test("wszystkie miarki są widoczne w kadrze swojego widoku", () => {
  // Właściwy test użyteczności: opis poza kadrem jest tak samo bezużyteczny
  // jak jego brak.
  const cfg = config();
  for (const view of CAPTURE_VIEWS) {
    const rows = shotAnnotations(cfg, view.id);
    if (rows.length === 0) continue;
    const projection = projectionFor(cfg, view.cameraMode);
    for (const row of rows) {
      for (const [name, point] of [["from", row.from], ["to", row.to]]) {
        const projected = projectPoint(point, projection);
        assert.ok(projected.visible, `${view.id}/${row.label}/${name}: za kamerą`);
        assert.ok(
          projected.x > -40 && projected.x < projection.pixelWidth + 40,
          `${view.id}/${row.label}/${name}: X poza kadrem (${Math.round(projected.x)})`,
        );
        assert.ok(
          projected.y > -40 && projected.y < projection.pixelHeight + 40,
          `${view.id}/${row.label}/${name}: Y poza kadrem (${Math.round(projected.y)})`,
        );
      }
    }
  }
});

test("duża hala też mieści swoje miarki w kadrze", () => {
  const cfg = config({ widthM: 12, lengthM: 24, wallHeightM: 6 });
  const projection = projectionFor(cfg, "front");
  for (const row of shotAnnotations(cfg, "front")) {
    for (const point of [row.from, row.to]) {
      const projected = projectPoint(point, projection);
      assert.ok(projected.visible && projected.x > -40 && projected.x < projection.pixelWidth + 40, row.label);
    }
  }
});
