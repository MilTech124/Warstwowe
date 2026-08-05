// Wymiary domalowywane na zrzutach 3D.
//
// Miarki w scenie są etykietami DOM (<Html>) i nie trafiają do bufora WebGL,
// więc captureViews wymusza na czas zrzutu `showDimensions = false`. Ten moduł
// jest ich zamiennikiem: rzutuje punkty świata na piksele gotowej bitmapy
// i dorysowuje linie wymiarowe na canvasie 2D. Dzięki temu wizualizacja
// w ofercie ma opisy, a scena nie musi o tym nic wiedzieć.

import { roofFootprint, wallTopHeightAt } from "@/scene/wallProfile";
import { formatMetersLabel } from "@/lib/drawings/svgPrimitives";

/**
 * Rzut punktu świata na piksele bitmapy zrzutu.
 *
 * `viewProjection` to `Matrix4.toArray()` z three, czyli układ KOLUMNAMI —
 * stąd indeksy co 4, a nie co 1. Funkcja jest celowo wolna od importu three,
 * żeby całą matematykę dało się przetestować pod loaderem `.mjs`.
 *
 * @param {[number, number, number]} point
 * @param {{ viewProjection: number[], pixelWidth: number, pixelHeight: number }} projection
 * @returns {{ x: number, y: number, visible: boolean }}
 */
export function projectPoint([x, y, z], projection) {
  const m = projection.viewProjection;
  const clipX = m[0] * x + m[4] * y + m[8] * z + m[12];
  const clipY = m[1] * x + m[5] * y + m[9] * z + m[13];
  const clipW = m[3] * x + m[7] * y + m[11] * z + m[15];

  // w ≤ 0 oznacza punkt za kamerą albo dokładnie w jej płaszczyźnie — dzielenie
  // dałoby wtedy współrzędną odbitą, czyli miarkę narysowaną po złej stronie.
  if (!(clipW > 1e-6)) return { x: 0, y: 0, visible: false };

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  return {
    x: (ndcX * 0.5 + 0.5) * projection.pixelWidth,
    // NDC rośnie w górę, piksele w dół.
    y: (0.5 - ndcY * 0.5) * projection.pixelHeight,
    visible: true,
  };
}

/**
 * Deskryptory wymiarów dla widoku. Czysta funkcja konfiguracji — bez canvasu
 * i bez rzutowania, więc łatwo sprawdzić, CO opisujemy, niezależnie od tego, GDZIE.
 *
 * @returns {Array<{ from: [number,number,number], to: [number,number,number], label: string, side: 1|-1 }>}
 */
export function shotAnnotations(config, viewId) {
  const { widthM, lengthM } = config.dimensions;
  const footprint = roofFootprint(config);
  const halfW = widthM / 2;
  const halfL = lengthM / 2;
  // Lico ściany, nie krawędź dachu — wymiarujemy obiekt, nie wysięg okapu.
  const frontZ = halfL;
  const rightX = halfW;
  // Miarka odsunięta od bryły, żeby nie leżała na poszyciu.
  const gap = 0.45;
  const below = -0.28;

  const eaveFront = wallTopHeightAt("front", -halfW, config);
  const ridgeFront = Math.max(
    wallTopHeightAt("front", 0, config),
    wallTopHeightAt("front", halfW, config),
    eaveFront,
  );

  if (viewId === "front") {
    const rows = [
      { from: [-halfW, below, frontZ], to: [halfW, below, frontZ], label: formatMetersLabel(widthM), side: 1 },
      { from: [-halfW - gap, 0, frontZ], to: [-halfW - gap, eaveFront, frontZ], label: formatMetersLabel(eaveFront), side: -1 },
    ];
    // Druga pionowa tylko wtedy, gdy dach faktycznie wznosi się nad okap na tej
    // ścianie — przy jednospadzie w bok obie wartości są identyczne.
    if (ridgeFront > eaveFront + 0.02) {
      rows.push({
        from: [halfW + gap, 0, frontZ],
        to: [halfW + gap, ridgeFront, frontZ],
        label: formatMetersLabel(ridgeFront),
        side: 1,
      });
    }
    return rows;
  }

  if (viewId === "side") {
    const eaveSide = wallTopHeightAt("right", -halfL, config);
    return [
      { from: [rightX, below, -halfL], to: [rightX, below, halfL], label: formatMetersLabel(lengthM), side: 1 },
      { from: [rightX, 0, halfL + gap], to: [rightX, eaveSide, halfL + gap], label: formatMetersLabel(eaveSide), side: 1 },
    ];
  }

  if (viewId === "top") {
    const edgeZ = footprint.centerZ + footprint.roofLength / 2 + 0.35;
    const edgeX = footprint.centerX + footprint.roofWidth / 2 + 0.35;
    return [
      { from: [-halfW, 0, edgeZ], to: [halfW, 0, edgeZ], label: formatMetersLabel(widthM), side: 1 },
      { from: [edgeX, 0, -halfL], to: [edgeX, 0, halfL], label: formatMetersLabel(lengthM), side: 1 },
    ];
  }

  // orbit — zdjęcie ze strony tytułowej; miarki na perspektywie czytają się
  // niechlujnie. structure — wymiary niesie rysunek przekroju ramy.
  return [];
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Nie udało się wczytać zrzutu do opisania."));
    image.src = dataUrl;
  });
}

/**
 * Linia wymiarowa: kreska, dwie poprzeczki na końcach i opis nad środkiem.
 * Poprzeczki i odsunięcie opisu liczone są prostopadle do linii, więc działa
 * to zarówno dla wymiarów poziomych, jak i pionowych na rzucie perspektywicznym.
 */
function drawDimension(ctx, a, b, label, side, unit) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 12 * unit) return;

  const nx = (-dy / length) * side;
  const ny = (dx / length) * side;
  const tick = 6 * unit;

  const stroke = (width, color) => {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.moveTo(a.x - nx * tick, a.y - ny * tick);
    ctx.lineTo(a.x + nx * tick, a.y + ny * tick);
    ctx.moveTo(b.x - nx * tick, b.y - ny * tick);
    ctx.lineTo(b.x + nx * tick, b.y + ny * tick);
    ctx.stroke();
  };

  // Ciemna otoczka pod jasną kreską — opis musi być czytelny i na niebie,
  // i na ciemnym poszyciu.
  stroke(3.6 * unit, "rgba(15, 23, 42, 0.8)");
  stroke(1.5 * unit, "#ffffff");

  const midX = (a.x + b.x) / 2 + nx * 11 * unit;
  const midY = (a.y + b.y) / 2 + ny * 11 * unit;
  ctx.font = `700 ${Math.round(15 * unit)}px "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 3.4 * unit;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
  ctx.strokeText(label, midX, midY);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, midX, midY);
}

/**
 * Zwraca zrzut z domalowanymi wymiarami. Widok bez opisów (orbit, szkielet)
 * wraca BEZ ZMIAN — nie ma po co ponownie kompresować JPEG-a.
 *
 * @param {{ id, dataUrl, format, projection }} shot
 * @param {object} config
 */
export async function annotateShot(shot, config) {
  const annotations = shotAnnotations(config, shot.id);
  if (annotations.length === 0 || !shot.projection) return shot;

  const points = annotations.map((item) => ({
    a: projectPoint(item.from, shot.projection),
    b: projectPoint(item.to, shot.projection),
    label: item.label,
    side: item.side,
  }));
  if (!points.some((item) => item.a.visible && item.b.visible)) return shot;

  const { pixelWidth, pixelHeight } = shot.projection;
  const image = await loadImage(shot.dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, pixelWidth, pixelHeight);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Jedna dźwignia skali: zrzut bywa nadpróbkowany do 3×, a opisy mają wyglądać
  // tak samo niezależnie od rozdzielczości bufora.
  const unit = pixelWidth / 1200;
  for (const item of points) {
    if (!item.a.visible || !item.b.visible) continue;
    drawDimension(ctx, item.a, item.b, item.label, item.side, unit);
  }

  // Źródłem jest data URL z tego samego dokumentu, więc canvas nie jest
  // „taint" i toDataURL nie rzuci SecurityError.
  return {
    ...shot,
    dataUrl: shot.format === "png" ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.92),
  };
}

/** Opisuje wszystkie zrzuty; błąd pojedynczego nie może zablokować dokumentu. */
export async function annotateShots(shots, config) {
  return Promise.all(
    shots.map(async (shot) => {
      try {
        return await annotateShot(shot, config);
      } catch {
        return shot;
      }
    }),
  );
}
