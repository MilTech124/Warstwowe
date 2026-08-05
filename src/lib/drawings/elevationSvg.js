// Elewacja z wymiarami: obrys ściany wg linii dachu, otwory, konstrukcja w tle.

import { wallTopHeightAt } from "@/scene/geometry";
import { openingWallCoord } from "@/scene/structure/openings";
import { openingKindLabel } from "@/lib/openingLabels";
import {
  ACCENT,
  DIM,
  INK,
  INK_LIGHT,
  STEEL,
  TITLE_BLOCK_HEIGHT,
  createProjector,
  dimLineH,
  dimLineV,
  drawingScaleLabel,
  formatMetersLabel,
  line,
  polygon,
  rect,
  svgDocument,
  text,
  titleBlock,
} from "@/lib/drawings/svgPrimitives";

const WALL_LABELS = {
  front: "ELEWACJA FRONTOWA",
  back: "ELEWACJA TYLNA",
  left: "ELEWACJA LEWA",
  right: "ELEWACJA PRAWA",
};

const OUTLINE_SAMPLES = 48;

function wallSpanM(wall, dimensions) {
  return wall === "front" || wall === "back" ? dimensions.widthM : dimensions.lengthM;
}

/**
 * Rzut elementu konstrukcji na płaszczyznę ściany.
 * Dla ścian przód/tył osią poziomą jest X, dla lewej/prawej — Z.
 *
 * Zwraca SUROWĄ współrzędną świata, bez zmiany znaku — tak samo jak
 * `openingWallCoord` i `wallOpeningAxisCenter` w geometry.js, które ujemny
 * offset ścian „back" i „left" mają już w sobie. Kierunek patrzenia na elewację
 * uwzględnia dopiero `viewSign` w `ux`, przez które przechodzą WSZYSTKIE
 * elementy rysunku. Odwracanie znaku tutaj, osobno dla szkieletu, odbijało go
 * względem otworów na tych dwóch ścianach — ten błąd wysłano już dwa razy.
 */
function wallCoordOf(wall, point) {
  const [x, , z] = point;
  return wall === "front" || wall === "back" ? x : z;
}

function depthCoordOf(wall, point) {
  const [x, , z] = point;
  if (wall === "front") return z;
  if (wall === "back") return -z;
  if (wall === "left") return -x;
  return x;
}

export function elevationSvg(config, model, wall, { widthPt = 515, heightPt = 340, accent = ACCENT, sheet = null } = {}) {
  const { dimensions } = config;
  const span = wallSpanM(wall, dimensions);
  const maxTop = Math.max(
    ...Array.from({ length: OUTLINE_SAMPLES + 1 }, (_, index) =>
      wallTopHeightAt(wall, -span / 2 + (span * index) / OUTLINE_SAMPLES, config),
    ),
  );

  const contentHeight = sheet ? heightPt - TITLE_BLOCK_HEIGHT : heightPt;
  const worldWidth = span + 1.4;
  const worldHeight = maxTop + 1.0;
  const padding = { left: 34, right: 18, top: 22, bottom: 32 };
  const projector = createProjector({
    worldWidth,
    worldHeight,
    boxWidth: widthPt,
    boxHeight: contentHeight,
    padding,
    snapScale: Boolean(sheet),
  });

  // Elewację ogląda się z ZEWNĄTRZ ściany. Dla tyłu i lewej strony oś świata
  // biegnie wtedy w przeciwną stronę niż oś rysunku — dokładnie ten sam znak,
  // który `openingWallCoord` zdejmuje z `offsetM`. Odbicie robimy JEDEN raz,
  // w rzutowaniu, więc obrys, szkielet i otwory przechodzą przez nie razem.
  // Odbijanie samych otworów (bez szkieletu) to błąd wysłany już dwa razy — docs §7.
  const viewSign = wall === "back" || wall === "left" ? -1 : 1;
  const ux = (coord) => projector.x(viewSign * coord + worldWidth / 2);
  const vy = (y) => projector.y(y);

  const parts = [];

  // Linia gruntu.
  parts.push(line(ux(-worldWidth / 2 + 0.2), vy(0), ux(worldWidth / 2 - 0.2), vy(0), { stroke: INK, width: 1.1 }));

  // Obrys ściany — próbkowany po tym samym profilu, którego używa poszycie.
  const outline = [[ux(-span / 2), vy(0)]];
  for (let index = 0; index <= OUTLINE_SAMPLES; index += 1) {
    const coord = -span / 2 + (span * index) / OUTLINE_SAMPLES;
    outline.push([ux(coord), vy(wallTopHeightAt(wall, coord, config))]);
  }
  outline.push([ux(span / 2), vy(0)]);
  parts.push(polygon(outline, { stroke: INK, fill: "#f6f8f9", strokeWidth: 1.2 }));

  // Konstrukcja: tylko elementy leżące w płaszczyźnie tej ściany.
  // Po przeliczeniu przez depthCoordOf lico każdej ściany wypada dodatnio,
  // w połowie wymiaru prostopadłego do niej.
  const wallPlaneDepth = wall === "front" || wall === "back" ? dimensions.lengthM / 2 : dimensions.widthM / 2;
  const planeTolerance = 0.75;
  const nearWall = (member) =>
    Math.abs(depthCoordOf(wall, member.start) - wallPlaneDepth) < planeTolerance &&
    Math.abs(depthCoordOf(wall, member.end) - wallPlaneDepth) < planeTolerance;

  model.members.filter(nearWall).forEach((member) => {
    const a = [ux(wallCoordOf(wall, member.start)), vy(member.start[1])];
    const b = [ux(wallCoordOf(wall, member.end)), vy(member.end[1])];
    parts.push(line(a[0], a[1], b[0], b[1], { stroke: STEEL, width: 0.6 }));
  });

  // Otwory.
  config.openings
    .filter((opening) => opening.wall === wall)
    .forEach((opening) => {
      const coord = openingWallCoord(opening);
      // Po odbiciu osi lewa krawędź rysunku to ta o mniejszym X na ekranie,
      // niekoniecznie ta o mniejszej współrzędnej świata.
      const x = Math.min(ux(coord - opening.widthM / 2), ux(coord + opening.widthM / 2));
      const y = vy(opening.sillM + opening.heightM);
      parts.push(
        rect(x, y, projector.length(opening.widthM), projector.length(opening.heightM), {
          stroke: accent,
          fill: "#ffffff",
          strokeWidth: 1.1,
        }),
      );
      parts.push(
        text(ux(coord), y + projector.length(opening.heightM) / 2, `${openingKindLabel(opening.kind)} ${formatMetersLabel(opening.widthM)}×${formatMetersLabel(opening.heightM)}`, {
          size: 5.5,
          fill: accent,
        }),
      );
      // Wysokość progu, gdy otwór nie stoi na posadzce.
      if (opening.sillM > 0.05) {
        parts.push(dimLineV(vy(0), vy(opening.sillM), x - 6, formatMetersLabel(opening.sillM), { size: 5 }));
      }
    });

  // Wymiary.
  parts.push(dimLineH(ux(-span / 2), ux(span / 2), contentHeight - 10, formatMetersLabel(span)));
  // Wysokości opisujemy po stronach RYSUNKU, nie po znaku współrzędnej świata —
  // po odbiciu osi te dwie rzeczy przestają się pokrywać.
  const leftTop = wallTopHeightAt(wall, (-span / 2) * viewSign, config);
  const rightTop = wallTopHeightAt(wall, (span / 2) * viewSign, config);
  parts.push(dimLineV(vy(0), vy(leftTop), 22, formatMetersLabel(leftTop)));
  if (Math.abs(rightTop - leftTop) > 0.02) {
    parts.push(dimLineV(vy(0), vy(rightTop), widthPt - 10, formatMetersLabel(rightTop), { size: 6 }));
  }
  if (maxTop > Math.max(leftTop, rightTop) + 0.02) {
    parts.push(text(ux(0), vy(maxTop) - 4, `kalenica ${formatMetersLabel(maxTop)}`, { size: 6, fill: INK_LIGHT }));
  }

  const label = WALL_LABELS[wall] ?? wall.toUpperCase();
  parts.push(text(6, 12, label, { size: 7.5, fill: INK, anchor: "start", bold: true }));
  parts.push(text(widthPt - 6, 12, `poszycie PIR ${config.cladding.wallPirThicknessMm} mm`, { size: 6, fill: DIM, anchor: "end" }));

  if (sheet) {
    parts.push(
      titleBlock(
        widthPt,
        heightPt,
        { ...sheet, title: label, scaleLabel: drawingScaleLabel(projector.scaleDenominator) },
        { accent },
      ),
    );
  }

  return svgDocument(widthPt, heightPt, parts.join(""));
}
