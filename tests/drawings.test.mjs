// Generatory rysunków wektorowych. Dotąd nie miały żadnego testu, a właśnie tu
// dwukrotnie wysłano ten sam błąd: podwójną zmianę znaku współrzędnej otworu,
// widoczną WYŁĄCZNIE na ścianie lewej (docs §7).

import test from "node:test";
import assert from "node:assert/strict";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureInputs } from "@/scene/structure/inputs";
import { openingWallCoord } from "@/scene/structure/openings";
import { elevationSvg } from "@/lib/drawings/elevationSvg";
import { frameSvg } from "@/lib/drawings/frameSvg";
import { planSvg } from "@/lib/drawings/planSvg";
import {
  ACCENT,
  TITLE_BLOCK_HEIGHT,
  createProjector,
  drawingScaleDenominator,
  drawingScaleLabel,
} from "@/lib/drawings/svgPrimitives";

const OPENINGS = [
  { id: "o1", kind: "gate", wall: "front", offsetM: 0, widthM: 2.5, heightM: 2.2, sillM: 0 },
  { id: "o2", kind: "door", wall: "back", offsetM: -1.5, widthM: 1, heightM: 2, sillM: 0 },
  { id: "o3", kind: "window", wall: "right", offsetM: 2, widthM: 1.2, heightM: 1, sillM: 1.1 },
  { id: "o4", kind: "window", wall: "left", offsetM: -2, widthM: 1.2, heightM: 1, sillM: 1.1 },
];

const config = {
  preset: "double_garage",
  dimensions: { widthM: 6, lengthM: 9, wallHeightM: 3 },
  roof: {
    type: "gable_left_right",
    pitchPercent: 28,
    overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
  },
  cladding: { wallPirThicknessMm: 60, roofPirThicknessMm: 80 },
  frontProjection: { depthM: 0 },
  structure: { reinforcement: "standard", snowZone: 2, visible: true },
  openings: OPENINGS,
};

const model = buildStructure(structureInputs(config));
const SHEET = { object: "Garaż 6,00 × 9,00 m", investor: "Jan Kowalski", contractor: "Stal-Bud", date: "05.08.2026" };

/** Pierwszy wielokąt rysunku to obrys ściany; jego skrajne punkty wyznaczają rozpiętość. */
function outlineSpanPx(svg) {
  const points = /<polygon points="([^"]+)"/.exec(svg)[1]
    .split(" ")
    .map((pair) => pair.split(",").map(Number));
  return { left: points[0][0], right: points[points.length - 1][0] };
}

/** Prostokąty otworów to jedyne rysowane kolorem akcentu. */
function openingRects(svg, accent = ACCENT) {
  const pattern = new RegExp(
    `<rect x="(-?[\\d.]+)" y="-?[\\d.]+" width="(-?[\\d.]+)" height="-?[\\d.]+" fill="#ffffff" stroke="${accent}"`,
    "g",
  );
  return [...svg.matchAll(pattern)].map((match) => ({
    centerX: Number(match[1]) + Number(match[2]) / 2,
    widthPx: Number(match[2]),
  }));
}

const wallSpanM = (wall) =>
  wall === "front" || wall === "back" ? config.dimensions.widthM : config.dimensions.lengthM;

// --- pułapka znaku -------------------------------------------------------

for (const wall of ["front", "back", "left", "right"]) {
  test(`elewacja ${wall}: otwór leży tam, gdzie wskazuje openingWallCoord`, () => {
    const svg = elevationSvg(config, model, wall);
    const { left, right } = outlineSpanPx(svg);
    const rects = openingRects(svg);
    assert.equal(rects.length, 1, `ściana ${wall} ma dokładnie jeden otwór`);

    const opening = OPENINGS.find((item) => item.wall === wall);
    const span = wallSpanM(wall);
    // Ułamek rozpiętości liczony niezależnie od projektora rysunku: podwójna
    // zmiana znaku odbiłaby otwór względem środka ściany.
    const fraction = (openingWallCoord(opening) + span / 2) / span;
    const expected = left + fraction * (right - left);

    assert.ok(
      Math.abs(rects[0].centerX - expected) < 0.1,
      `${wall}: środek otworu ${rects[0].centerX} ≠ ${expected}`,
    );
  });
}

test("otwór asymetryczny nie wypada na środku ściany", () => {
  // Bez tego poprzedni test przeszedłby także dla otworu zawsze centrowanego.
  const svg = elevationSvg(config, model, "left");
  const { left, right } = outlineSpanPx(svg);
  const center = (left + right) / 2;
  assert.ok(Math.abs(openingRects(svg)[0].centerX - center) > 5, "otwór jest przesunięty od środka");
});

test("elewacje lewa i prawa są względem siebie odbite", () => {
  // Ten sam offset po przeciwnych stronach: gdyby jedna ze ścian gubiła znak,
  // oba otwory wypadłyby po tej samej stronie rysunku.
  const mirrored = {
    ...config,
    openings: [
      { id: "l", kind: "window", wall: "left", offsetM: 2, widthM: 1.2, heightM: 1, sillM: 1.1 },
      { id: "r", kind: "window", wall: "right", offsetM: 2, widthM: 1.2, heightM: 1, sillM: 1.1 },
    ],
  };
  const mirroredModel = buildStructure(structureInputs(mirrored));
  const leftSvg = elevationSvg(mirrored, mirroredModel, "left");
  const rightSvg = elevationSvg(mirrored, mirroredModel, "right");
  const mid = (svg) => {
    const { left, right } = outlineSpanPx(svg);
    return (left + right) / 2;
  };
  const leftOffset = openingRects(leftSvg)[0].centerX - mid(leftSvg);
  const rightOffset = openingRects(rightSvg)[0].centerX - mid(rightSvg);
  assert.ok(Math.abs(leftOffset - rightOffset) < 0.1, "ten sam offset daje ten sam kadr na obu ścianach");
});

// --- arkusz: tabelka i skala --------------------------------------------

test("bez `sheet` rysunek nie ma tabelki — zgodność ze starym wywołaniem", () => {
  for (const svg of [
    planSvg(config, model),
    frameSvg(config, model),
    elevationSvg(config, model, "front"),
  ]) {
    assert.ok(!svg.includes("NR RYSUNKU"), "tabelka pojawia się tylko na żądanie");
  }
});

test("tabelka rysunkowa zawiera wszystkie pola i tytuł rysunku", () => {
  const svg = planSvg(config, model, { sheet: { ...SHEET, drawingNo: "KOD/2026/0001 / R-01" } });
  for (const label of ["OBIEKT", "INWESTOR", "SKALA", "NR RYSUNKU", "RYSUNEK", "WYKONAWCA", "DATA"]) {
    assert.ok(svg.includes(`>${label}<`), `brak pola ${label}`);
  }
  assert.ok(svg.includes("Jan Kowalski"), "inwestor");
  assert.ok(/>1:\d+</.test(svg), "skala w formacie 1:N");
});

test("każda elewacja podpisuje się własnym tytułem", () => {
  const titles = {
    front: "ELEWACJA FRONTOWA",
    back: "ELEWACJA TYLNA",
    left: "ELEWACJA LEWA",
    right: "ELEWACJA PRAWA",
  };
  for (const [wall, title] of Object.entries(titles)) {
    const svg = elevationSvg(config, model, wall, { sheet: { ...SHEET, drawingNo: "R-01" } });
    assert.ok(svg.includes(`>${title}<`), `${wall}: brak tytułu w tabelce`);
  }
});

test("tabelka nie zasłania rysunku — arkusz rośnie o jej wysokość", () => {
  const withSheet = planSvg(config, model, { sheet: { ...SHEET, drawingNo: "R-01" } });
  const height = Number(/height="([\d.]+)"/.exec(withSheet)[1]);
  // Ramka tabelki zaczyna się dokładnie TITLE_BLOCK_HEIGHT nad dolną krawędzią.
  assert.ok(withSheet.includes(`y="${height - TITLE_BLOCK_HEIGHT}"`), "tabelka siedzi na dole arkusza");
});

test("długie wartości są przycinane, a nie wylewane poza komórkę", () => {
  const svg = planSvg(config, model, {
    sheet: { ...SHEET, contractor: "Przedsiębiorstwo Produkcyjno-Usługowo-Handlowe Konstrukcje Stalowe", drawingNo: "R-01" },
  });
  assert.ok(svg.includes("…"), "za długa nazwa dostaje wielokropek");
});

// --- skala znormalizowana ------------------------------------------------

test("snapScale schodzi do szeregu znormalizowanego i nigdy nie powiększa", () => {
  const params = { worldWidth: 12, worldHeight: 8, boxWidth: 515, boxHeight: 296, padding: { left: 34, right: 18, top: 20, bottom: 34 } };
  const fitted = createProjector(params);
  const snapped = createProjector({ ...params, snapScale: true });

  assert.ok(snapped.scale <= fitted.scale, "znormalizowana skala nie może powiększyć rysunku");
  assert.ok(Number.isInteger(snapped.scaleDenominator), "mianownik z szeregu jest całkowity");
  assert.ok(snapped.scaleDenominator >= drawingScaleDenominator(fitted.scale), "mianownik nie maleje");
});

test("mianownik skali odpowiada rzeczywistej długości na rysunku", () => {
  // 1 pt = 25,4/72 mm. Przy 1:100 metr terenu to 10 mm rysunku.
  const scalePtPerM = (1000 * 72) / (25.4 * 100);
  assert.ok(Math.abs(drawingScaleDenominator(scalePtPerM) - 100) < 1e-9);
  assert.equal(drawingScaleLabel(100), "1:100");
});

// --- ograniczenia svg-to-pdfkit -----------------------------------------

test("rysunki nie łamią ograniczeń parsera pdfmake", () => {
  const svgs = [
    planSvg(config, model, { sheet: { ...SHEET, contractor: "Stal & Bud", drawingNo: "R-01" } }),
    frameSvg(config, model, { sheet: { ...SHEET, drawingNo: "R-02" } }),
    elevationSvg(config, model, "left", { sheet: { ...SHEET, drawingNo: "R-03" } }),
  ];
  for (const svg of svgs) {
    assert.ok(!svg.includes("<style"), "brak CSS — svg-to-pdfkit go nie czyta");
    assert.ok(!/\sclass=/.test(svg), "brak atrybutu class");
    assert.ok(!/font-weight="[1-9]00"/.test(svg), "Roboto ma tylko normal/bold");
    assert.ok(!/(width|height|x|y)="[\d.]+(px|pt|%)"/.test(svg), "wymiary bez jednostek");
    assert.ok(!/[\d.]e[+-]\d/i.test(svg), "brak notacji wykładniczej");
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(svg), "każdy & jest zaescapowany");
  }
});

test("kolor akcentu firmy przenosi się na rysunek", () => {
  const svg = elevationSvg(config, model, "front", { accent: "#b91c1c" });
  assert.equal(openingRects(svg, "#b91c1c").length, 1, "otwór rysowany kolorem firmy");
  assert.equal(openingRects(svg, ACCENT).length, 0, "domyślny kolor nie zostaje");
});
