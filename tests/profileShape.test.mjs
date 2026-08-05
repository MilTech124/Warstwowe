// Kontury przekrojów profili i ustawienie elementu w przestrzeni.
//
// Do tej pory scena rysowała każdy profil kwadratowym boxem, więc pomylenie osi
// mocnej ze słabą nie miało jak się ujawnić. Teraz ma — stąd te testy.

import test from "node:test";
import assert from "node:assert/strict";
import { Vector3 } from "three";
import { PROFILES } from "@/config/steelProfiles";
import { contourBounds, profileContour } from "@/scene/profileShape";
import { profileGeometry } from "@/scene/profileGeometry";
import { memberTransform } from "@/scene/geometry";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureInputs } from "@/scene/structure/inputs";

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} ≠ ${expected}`);

const boundsOf = (id) => contourBounds(profileContour(PROFILES[id]));

// --- kontury -------------------------------------------------------------

test("SHS jest kwadratem wycentrowanym na osi elementu", () => {
  const contour = profileContour(PROFILES.shs_100x100x3);
  assert.equal(contour.points.length, 4);
  const { minU, maxU, minV, maxV } = contourBounds(contour);
  close(maxU - minU, 0.1, "wysokość");
  close(maxV - minV, 0.1, "szerokość");
  close(minU + maxU, 0, "wycentrowanie w osi mocnej");
  close(minV + maxV, 0, "wycentrowanie w osi słabej");
});

test("RHS 120×60: wysokość idzie na oś MOCNĄ, szerokość na słabą", () => {
  // Przestawienie tych dwóch osi to najłatwiejsza możliwa pomyłka — położona
  // na płask płatew wyglądałaby poprawnie na pierwszy rzut oka.
  const { minU, maxU, minV, maxV } = boundsOf("rhs_120x60x4");
  close(maxU - minU, 0.12, "h w osi u");
  close(maxV - minV, 0.06, "b w osi v");
});

test("dwuteownik ma 12 punktów i gabaryty wg tablicy", () => {
  const contour = profileContour(PROFILES.ipe_300);
  assert.equal(contour.points.length, 12);
  const { minU, maxU, minV, maxV } = contourBounds(contour);
  close(maxU - minU, 0.3, "wysokość IPE 300");
  close(maxV - minV, 0.15, "szerokość stopki");

  // Środnik o grubości z katalogu — punkty wewnętrzne leżą na ±t/2.
  const webEdges = contour.points.filter(([, v]) => Math.abs(Math.abs(v) - PROFILES.ipe_300.tMm / 2000) < 1e-9);
  assert.equal(webEdges.length, 4, "cztery punkty na licach środnika");
});

test("grubość półki mieści się w udokumentowanej klamrze", () => {
  for (const id of ["ipe_160", "ipe_360", "hea_200", "hea_280"]) {
    const profile = PROFILES[id];
    const contour = profileContour(profile);
    const halfHeight = profile.hMm / 2000;
    // Wewnętrzne lico półki: pierwszy punkt o |u| < h/2.
    const inner = Math.max(...contour.points.map(([u]) => Math.abs(u)).filter((u) => u < halfHeight - 1e-9));
    const flange = halfHeight - inner;
    const web = profile.tMm / 1000;
    assert.ok(flange >= web * 1.4 - 1e-9 && flange <= web * 2.0 + 1e-9, `${id}: półka ${flange} wobec środnika ${web}`);
  }
});

test("Z ma półki w przeciwne strony, C w tę samą — to cała różnica", () => {
  const zFlanges = profileContour(PROFILES.z_200x2).points.map(([, v]) => v);
  assert.ok(Math.min(...zFlanges) < -1e-6 && Math.max(...zFlanges) > 1e-6, "zetownik po obu stronach środnika");

  const cFlanges = profileContour(PROFILES.c_200x2).points.map(([, v]) => v);
  assert.ok(Math.min(...cFlanges) >= -1e-9, "ceownik tylko po jednej stronie");
});

test("profile zimnogięte zachowują wysokość środnika", () => {
  for (const id of ["z_150x2", "z_350x3", "c_250x25"]) {
    const { minU, maxU } = boundsOf(id);
    close(maxU - minU, PROFILES[id].hMm / 1000, `${id}: wysokość`);
  }
});

test("ściąg jest okręgiem, nie wielokątem", () => {
  const contour = profileContour(PROFILES.rod_m16);
  assert.equal(contour.kind, "circle");
  close(contour.radiusM, 0.008, "promień M16");
});

test("nieznany profil degraduje się do kwadratu zamiast rzucać wyjątkiem", () => {
  // Renderer nie może wywalić sceny na elemencie spoza katalogu.
  for (const input of [null, undefined, {}, { sizeM: 0.09 }, { kind: "SHS", hMm: 0 }]) {
    const contour = profileContour(input);
    assert.equal(contour.kind, "polygon");
    const { minU, maxU, minV, maxV } = contourBounds(contour);
    assert.ok(maxU > minU && maxV > minV, "kontur ma dodatnie wymiary");
    close(maxU - minU, maxV - minV, "kwadrat");
  }
  close(contourBounds(profileContour({ sizeM: 0.09 })).maxU * 2, 0.09, "zachowuje sizeM");
});

test("każdy profil z katalogu daje poprawny kontur", () => {
  for (const [id, profile] of Object.entries(PROFILES)) {
    const contour = profileContour(profile);
    if (contour.kind === "circle") {
      assert.ok(contour.radiusM > 0, `${id}: promień`);
      continue;
    }
    assert.ok(contour.points.length >= 4, `${id}: za mało punktów`);
    assert.ok(
      contour.points.every(([u, v]) => Number.isFinite(u) && Number.isFinite(v)),
      `${id}: NaN w konturze`,
    );
    const { minU, maxU } = contourBounds(contour);
    close(maxU - minU, profile.hMm / 1000, `${id}: wysokość wg katalogu`);
  }
});

// --- geometria three -----------------------------------------------------

test("każdy profil daje bryłę o poprawnych gabarytach i bez NaN", () => {
  // Triangulacja konturu potrafi cicho wyprodukować pustą albo zdegenerowaną
  // geometrię — w scenie objawia się to zniknięciem elementu, nie wyjątkiem.
  //
  // Tolerancja luźniejsza niż w testach konturu: bufor wierzchołków three jest
  // typu Float32, więc 0,06 wraca jako 0,059999998.
  const closeF32 = (actual, expected, message) =>
    assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} ≠ ${expected}`);

  for (const [id, profile] of Object.entries(PROFILES)) {
    const geometry = profileGeometry(id, profile.sizeM);
    const position = geometry.getAttribute("position");
    assert.ok(position && position.count > 0, `${id}: pusta geometria`);
    assert.ok(
      Array.from(position.array).every(Number.isFinite),
      `${id}: NaN we współrzędnych wierzchołków`,
    );

    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    closeF32(max.z - min.z, 1, `${id}: długość jednostkowa do skalowania`);
    closeF32(max.y - min.y, profile.hMm / 1000, `${id}: wysokość na osi mocnej (lokalne Y)`);
    assert.ok(Math.abs(min.z + 0.5) < 1e-6, `${id}: geometria wycentrowana wzdłuż osi`);
  }
});

test("geometria profilu jest współdzielona między elementami", () => {
  // Bez cache hala alokowała osobną BufferGeometry na każdy z kilkuset elementów.
  assert.equal(profileGeometry("ipe_300", 0.3), profileGeometry("ipe_300", 0.3));
  assert.notEqual(profileGeometry("ipe_300", 0.3), profileGeometry("ipe_240", 0.24));
});

test("element bez profilu w katalogu dostaje kwadrat, nie wyjątek", () => {
  const geometry = profileGeometry(null, 0.05);
  geometry.computeBoundingBox();
  const { min, max } = geometry.boundingBox;
  assert.ok(Math.abs(max.y - min.y - 0.05) < 1e-6, "wysokość zastępcza");
  assert.ok(Math.abs(max.x - min.x - 0.05) < 1e-6, "szerokość zastępcza");
});

// --- ustawienie w przestrzeni -------------------------------------------

const localAxis = (transform, axis) => new Vector3(...axis).applyQuaternion(transform.quaternion);

test("element poziomy: oś mocna pionowo, długość i środek bez zmian", () => {
  const transform = memberTransform([-2, 3, 0], [2, 3, 0], [0, 1, 0]);
  close(transform.length, 4, "długość");
  assert.deepEqual(transform.position, [0, 3, 0], "środek elementu");

  const strong = localAxis(transform, [0, 1, 0]);
  assert.ok(Math.abs(strong.y - 1) < 1e-6, "lokalne +Y pokrywa się z pionem");

  const forward = localAxis(transform, [0, 0, 1]);
  assert.ok(Math.abs(Math.abs(forward.x) - 1) < 1e-6, "lokalne +Z biegnie wzdłuż elementu");
});

test("słup pionowy nie daje NaN mimo zdegenerowanej podpowiedzi", () => {
  // `up = [0,1,0]` jest tu równoległe do elementu. Bez zabezpieczenia iloczyn
  // wektorowy dałby wektor zerowy i kwaterniony NaN — three renderuje wtedy NIC.
  const transform = memberTransform([1, 0, 2], [1, 3, 2], [0, 1, 0]);
  const { x, y, z, w } = transform.quaternion;
  assert.ok([x, y, z, w].every(Number.isFinite), "kwaternion bez NaN");
  close(transform.length, 3, "długość");

  const forward = localAxis(transform, [0, 0, 1]);
  assert.ok(Math.abs(forward.y - 1) < 1e-6, "element biegnie w pionie");
});

test("słup dostaje oś mocną w zadanej płaszczyźnie ramy", () => {
  const transform = memberTransform([0, 0, 0], [0, 4, 0], [1, 0, 0]);
  const strong = localAxis(transform, [0, 1, 0]);
  assert.ok(Math.abs(Math.abs(strong.x) - 1) < 1e-6, "oś mocna wzdłuż X");
});

test("pochyła krokiew: środnik prostopadły do spadu, nie do poziomu", () => {
  // `up = [0,1,0]` nie jest prostopadłe do pochyłego elementu. Ortogonalizacja
  // ma dać oś mocną prostopadłą do niego, ale nadal skierowaną w górę.
  const transform = memberTransform([0, 3, 0], [4, 5, 0], [0, 1, 0]);
  const forward = localAxis(transform, [0, 0, 1]);
  const strong = localAxis(transform, [0, 1, 0]);

  assert.ok(Math.abs(strong.dot(forward)) < 1e-6, "oś mocna prostopadła do elementu");
  assert.ok(strong.y > 0, "oś mocna skierowana w górę");
  assert.ok(Math.abs(strong.length() - 1) < 1e-6, "wektor jednostkowy");
});

test("podpowiedź zerowa albo bezsensowna nie psuje ustawienia", () => {
  for (const up of [[0, 0, 0], undefined, [Number.NaN, 1, 0]]) {
    const transform = memberTransform([0, 0, 0], [3, 0, 0], up);
    const values = [transform.quaternion.x, transform.quaternion.y, transform.quaternion.z, transform.quaternion.w];
    assert.ok(values.every(Number.isFinite), `up=${JSON.stringify(up)} daje NaN`);
  }
});

// --- podpowiedzi z modelu ------------------------------------------------

function model({ widthM = 12, lengthM = 24, wallHeightM = 5 } = {}) {
  return buildStructure(
    structureInputs({
      preset: "hall",
      dimensions: { widthM, lengthM, wallHeightM },
      roof: { type: "gable_left_right", pitchPercent: 20, overhangM: { front: 0.3, back: 0.3, left: 0.3, right: 0.3 } },
      cladding: { wallPirThicknessMm: 100, roofPirThicknessMm: 100 },
      frontProjection: { depthM: 0 },
      structure: { reinforcement: "standard", snowZone: 2, visible: true },
      openings: [],
    }),
  );
}

test("każdy element modelu niesie jednostkową podpowiedź orientacji", () => {
  for (const member of model().members) {
    assert.ok(Array.isArray(member.up), `${member.id}: brak up`);
    const length = Math.hypot(...member.up);
    assert.ok(Math.abs(length - 1) < 1e-6, `${member.id}: up nie jest jednostkowe (${length})`);
  }
});

test("słupy ramy stoją osią mocną w płaszczyźnie ramy, płatwie środnikiem w pionie", () => {
  const built = model();
  const runAxis = built.plan.runAxis;
  const expectedColumnUp = runAxis === "x" ? [1, 0, 0] : [0, 0, 1];

  const column = built.members.find((member) => member.role === "column");
  assert.deepEqual(column.up, expectedColumnUp, "słup w płaszczyźnie ramy");

  const purlin = built.members.find((member) => member.role === "purlin");
  assert.deepEqual(purlin.up, [0, 1, 0], "płatew przenosi śnieg — środnik pionowo");
});

test("rygiel ścienny ustawia oś mocną prostopadle do ściany", () => {
  // Rygiel przenosi wiatr, czyli obciążenie prostopadłe do ściany.
  const built = model();
  const girt = built.members.find((member) => member.role === "girt");
  assert.ok(girt, "hala ma rygle ścienne");

  const direction = new Vector3(
    girt.end[0] - girt.start[0],
    girt.end[1] - girt.start[1],
    girt.end[2] - girt.start[2],
  ).normalize();
  const up = new Vector3(...girt.up);
  assert.ok(Math.abs(up.y) < 1e-9, "oś mocna pozioma");
  assert.ok(Math.abs(up.dot(direction)) < 1e-6, "prostopadła do rygla");
});
