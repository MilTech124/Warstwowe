// Szkielet hali: ramy portalowe na przęsłach, ściany szczytowe, płatwie i rygle
// wtórne, stężenia krzyżowe ścian i połaci.
//
// Poprawka względem wcześniejszej wersji: ściany dostają SŁUPKI POŚREDNIE
// w rozstawie z rozpiętości płyty. Płyty warstwowe leżą poziomo, więc rygle
// poziome nie są ich podporą — usztywniają szkielet i dają bazę montażową,
// ale ciężar poszycia przenoszą podpory pionowe.

import { isGableRoof } from "@/scene/roofMath";
import {
  densifyPositions,
  frameAxes,
  levelsBelow,
  pointFromAxes,
  positionsBySpacing,
  roofYOnRun,
  trimmedRunForLevel,
  wallForLongSide,
  wallForRunSide,
} from "@/scene/structure/axes";
import {
  blockingOpeningAt,
  bracedBaysForWall,
  openingBandsAtCoord,
  openingHeaderY,
  openingsAtCoord,
  railSegments,
  splitAtMembers,
  wallOpenings,
} from "@/scene/structure/openings";
import { addColumn, addPostWithOpenings } from "@/scene/structure/parts";

const SILL_LEVEL_M = 0.06;

/**
 * Słup ramy portalowej to główna droga obciążenia — nie dzielimy go otworem.
 * Gdy światło otworu wypada w osi ramy, trzeba to zgłosić.
 *
 * Dla pasa okiennego jest to sytuacja normalna (szklenie wykonuje się w polach
 * między ramami). Dla bramy lub drzwi to błąd rozplanowania: skrzydło nie zmieści
 * się obok słupa i otwór trzeba przesunąć.
 */
function warnFrameCrossings(inputs, collector, wall, coord) {
  openingsAtCoord(inputs, wall, coord).forEach((opening) => {
    if (opening.kind === "window") {
      collector.warn(
        "window_crosses_frame",
        `Pas okienny ${opening.widthM.toFixed(2)} m na ścianie „${wall}" przechodzi przez oś ramy portalowej — ` +
          "szklenie zostanie podzielone słupem na pola między ramami.",
        { openingId: opening.id },
      );
      return;
    }
    collector.warn(
      "opening_crosses_frame",
      `Otwór ${opening.widthM.toFixed(2)} × ${opening.heightM.toFixed(2)} m na ścianie „${wall}" wypada w osi ramy portalowej — ` +
        "słup ramy stanąłby w świetle otworu. Przesuń otwór między ramy.",
      { openingId: opening.id },
    );
  });
}

export function buildHall(inputs, spec, collector) {
  const { wallHeightM } = inputs.dimensions;
  const { runAxis } = frameAxes(inputs);
  const gable = isGableRoof(inputs.roof.type);
  const { runSpan, longSpan, plateThicknessM, profiles, girtSpacing, wallPostSpacing, purlinSpacing, haunchLength } = spec;
  const runHalf = runSpan / 2;
  const longHalf = longSpan / 2;
  const roofY = (runCoord) => roofYOnRun(runCoord, inputs);
  const flushTopY = (runCoord, sizeM) => roofY(runCoord) + profiles.rafter.sizeM / 2 - sizeM / 2;

  const framePositions = positionsBySpacing(longSpan, spec.baySpacing * 1.001);
  const runSides = [-runHalf, runHalf];
  const longSides = [-longHalf, longHalf];
  const sideLevels = levelsBelow(wallHeightM, girtSpacing);

  // --- ramy portalowe ---
  framePositions.forEach((longCoord) => {
    const group = "primary-frame";
    runSides.forEach((runCoord) => {
      const eaveY = roofY(runCoord);
      // Słup kończy się na SPODZIE rygla ramy (nie przebija go w połowie przekroju).
      const columnTop = eaveY - profiles.rafter.sizeM / 2;
      const wall = wallForRunSide(runAxis, runCoord);
      const blocking = blockingOpeningAt(inputs, wall, longCoord);
      const position = pointFromAxes(runAxis, runCoord, longCoord, 0);

      warnFrameCrossings(inputs, collector, wall, longCoord);

      if (blocking) {
        // Słupa ramy portalowej nie dzielimy oknem — to główna droga obciążenia.
        // Przerywa go wyłącznie otwór sięgający posadzki (brama/drzwi), a nad
        // nadprożem stoi już tylko słupek.
        addPostWithOpenings(collector, {
          role: "wallPost",
          group,
          profile: profiles.wallPost,
          position,
          topY: columnTop,
          plateThicknessM,
          bands: [{ from: 0, to: openingHeaderY(blocking, spec) }],
        });
      } else {
        addColumn(collector, { role: "column", group, profile: profiles.column, position, topY: columnTop, plateThicknessM });
      }

      collector.addJoint({
        position: pointFromAxes(runAxis, runCoord, longCoord, eaveY),
        sizeM: profiles.column.sizeM * 0.58,
        role: "column",
      });

      // Zastrzał podokapowy (wyoblenie ramy) — pomijany, gdy słup opiera się
      // na nadprożu i nie ma dla niego miejsca.
      const braceStartY = columnTop - 0.5;
      if (!blocking || braceStartY > openingHeaderY(blocking, spec) + 0.05) {
        const inner = runCoord < 0 ? Math.min(runCoord + haunchLength, -0.05) : Math.max(runCoord - haunchLength, 0.05);
        collector.addMember({
          role: "haunch",
          group,
          profile: profiles.haunch,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, longCoord, braceStartY),
          end: pointFromAxes(runAxis, inner, longCoord, roofY(inner) - 0.03),
        });
      }
    });

    if (gable) {
      collector.addMember({
        role: "rafter",
        group,
        profile: profiles.rafter,
        start: pointFromAxes(runAxis, -runHalf, longCoord, roofY(-runHalf)),
        end: pointFromAxes(runAxis, 0, longCoord, roofY(0)),
      });
      collector.addMember({
        role: "rafter",
        group,
        profile: profiles.rafter,
        start: pointFromAxes(runAxis, 0, longCoord, roofY(0)),
        end: pointFromAxes(runAxis, runHalf, longCoord, roofY(runHalf)),
      });
      collector.addJoint({ position: pointFromAxes(runAxis, 0, longCoord, roofY(0)), sizeM: profiles.rafter.sizeM * 0.62, role: "ridge" });
    } else {
      collector.addMember({
        role: "rafter",
        group,
        profile: profiles.rafter,
        start: pointFromAxes(runAxis, -runHalf, longCoord, roofY(-runHalf)),
        end: pointFromAxes(runAxis, runHalf, longCoord, roofY(runHalf)),
      });
    }
  });

  // --- ściany szczytowe: słupki + rygle ---
  longSides.forEach((longCoord) => {
    const group = "endwall-frame";
    const wall = wallForLongSide(runAxis, longCoord);
    // Słupy narożne ramy leżą TAKŻE w płaszczyźnie ściany szczytowej — otwór
    // w ich osi jest tu równie niedopuszczalny jak na ścianie podłużnej.
    runSides.forEach((runCoord) => warnFrameCrossings(inputs, collector, wall, runCoord));
    const openings = wallOpenings(inputs, wall);
    // Bez skrajnych pozycji — w narożach stoją już słupy ramy głównej.
    const postRuns = positionsBySpacing(runSpan, wallPostSpacing, 5).slice(1, -1);

    // Jak na ścianie podłużnej: rygiel ściany szczytowej przerywają tylko słupy
    // narożne ramy, a nie każdy słupek szczytowy.
    const girtMembers = [
      { coord: -runHalf, size: profiles.column.sizeM },
      { coord: runHalf, size: profiles.column.sizeM },
    ];

    postRuns.forEach((runCoord) => {
      const position = pointFromAxes(runAxis, runCoord, longCoord, 0);
      const topY = roofY(runCoord) - profiles.rafter.sizeM / 2;

      addPostWithOpenings(collector, {
        role: "endPost",
        group,
        profile: profiles.endPost,
        position,
        topY,
        material: "trim",
        plateThicknessM,
        bands: openingBandsAtCoord(inputs, wall, runCoord, spec),
      });
      collector.addJoint({
        position: pointFromAxes(runAxis, runCoord, longCoord, topY),
        sizeM: profiles.endPost.sizeM * 0.58,
        role: "endPost",
      });
    });

    railSegments(-runHalf, runHalf, openings, SILL_LEVEL_M, girtMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "sillRail",
        group,
        profile: profiles.sillRail,
        material: "trim",
        start: pointFromAxes(runAxis, from, longCoord, SILL_LEVEL_M),
        end: pointFromAxes(runAxis, to, longCoord, SILL_LEVEL_M),
      });
    });

    sideLevels.forEach((level) => {
      trimmedRunForLevel(level, inputs, runSpan).forEach(([startRun, endRun]) => {
        railSegments(startRun, endRun, openings, level, girtMembers).forEach(([from, to]) => {
          collector.addMember({
            role: "girt",
            group,
            profile: profiles.girt,
            material: "trim",
            start: pointFromAxes(runAxis, from, longCoord, level),
            end: pointFromAxes(runAxis, to, longCoord, level),
          });
        });
      });
    });
  });

  // --- ściany podłużne: słupki pośrednie pod poszycie + rygle + podwalina ---
  const wallPostLongPositions = densifyPositions(framePositions, wallPostSpacing).filter(
    (coord) => !framePositions.some((frameCoord) => Math.abs(frameCoord - coord) < 0.05),
  );

  runSides.forEach((runCoord) => {
    const group = "wall-secondary";
    const wall = wallForRunSide(runAxis, runCoord);
    const openings = wallOpenings(inputs, wall);
    // Słupek kończy się pod płatwią okapową, na której leży poszycie dachu.
    const wallPostTopY = flushTopY(runCoord, profiles.eaveStrut.sizeM) - profiles.eaveStrut.sizeM / 2;

    wallPostLongPositions.forEach((longCoord) => {
      addPostWithOpenings(collector, {
        role: "wallPost",
        group,
        profile: profiles.wallPost,
        position: pointFromAxes(runAxis, runCoord, longCoord, 0),
        topY: wallPostTopY,
        plateThicknessM,
        bands: openingBandsAtCoord(inputs, wall, longCoord, spec),
      });
    });

    // Rygiel i podwalina są przerywane TYLKO słupami ram. Przez słupki pośrednie
    // przechodzą ciągiem i są do nich przykręcone — cięcie na każdym słupku dawało
    // kilkadziesiąt odcinków po ~1,6 m zamiast pełnych przęseł po ~3,3 m.
    const girtMembers = framePositions.map((longCoord) => ({ coord: longCoord, size: profiles.column.sizeM }));

    railSegments(-longHalf, longHalf, openings, SILL_LEVEL_M, girtMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "sillRail",
        group,
        profile: profiles.sillRail,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, SILL_LEVEL_M),
        end: pointFromAxes(runAxis, runCoord, to, SILL_LEVEL_M),
      });
    });

    sideLevels.forEach((level) => {
      railSegments(-longHalf, longHalf, openings, level, girtMembers).forEach(([from, to]) => {
        collector.addMember({
          role: "girt",
          group,
          profile: profiles.girt,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, from, level),
          end: pointFromAxes(runAxis, runCoord, to, level),
        });
      });
    });
  });

  // --- płatwie, płatwie okapowe i kalenicowe ---
  const rafterMembers = framePositions.map((longCoord) => ({ coord: longCoord, size: profiles.rafter.sizeM }));
  const purlinRuns = gable
    ? purlinRunsForGable(runHalf, purlinSpacing, profiles)
    : positionsBySpacing(runSpan, purlinSpacing, 3).slice(1, -1);

  purlinRuns.forEach((runCoord) => {
    splitAtMembers(-longHalf, longHalf, rafterMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "purlin",
        group: "roof-secondary",
        profile: profiles.purlin,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, flushTopY(runCoord, profiles.purlin.sizeM)),
        end: pointFromAxes(runAxis, runCoord, to, flushTopY(runCoord, profiles.purlin.sizeM)),
      });
    });
  });

  runSides.forEach((runCoord) => {
    splitAtMembers(-longHalf, longHalf, rafterMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "eaveStrut",
        group: "roof-secondary",
        profile: profiles.eaveStrut,
        start: pointFromAxes(runAxis, runCoord, from, flushTopY(runCoord, profiles.eaveStrut.sizeM)),
        end: pointFromAxes(runAxis, runCoord, to, flushTopY(runCoord, profiles.eaveStrut.sizeM)),
      });
    });
  });

  if (gable) {
    splitAtMembers(-longHalf, longHalf, rafterMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "ridgePurlin",
        group: "roof-secondary",
        profile: profiles.ridge,
        start: pointFromAxes(runAxis, 0, from, flushTopY(0, profiles.ridge.sizeM)),
        end: pointFromAxes(runAxis, 0, to, flushTopY(0, profiles.ridge.sizeM)),
      });
    });
  }

  // --- stężenia krzyżowe ścian ---
  runSides.forEach((runCoord) => {
    const wall = wallForRunSide(runAxis, runCoord);
    const y0 = 0.35;
    const y1 = roofY(runCoord) - profiles.girt.sizeM;

    bracedBaysForWall(inputs, wall, framePositions).forEach(([from, to]) => {
      collector.addMember({
        role: "xBrace",
        group: "hall-bracing",
        profile: profiles.xBrace,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, y0),
        end: pointFromAxes(runAxis, runCoord, to, y1),
      });
      collector.addMember({
        role: "xBrace",
        group: "hall-bracing",
        profile: profiles.xBrace,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, y1),
        end: pointFromAxes(runAxis, runCoord, to, y0),
      });
    });
  });

  // --- stężenia połaciowe w pierwszym i ostatnim przęśle ---
  const bracedRoofBays = [
    [framePositions[0], framePositions[1]],
    [framePositions.at(-2), framePositions.at(-1)],
  ].filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(b - a) > 0.3);

  bracedRoofBays.forEach(([a, b]) => {
    const spans = gable
      ? [
          [-runHalf, 0],
          [0, runHalf],
        ]
      : [[-runHalf, runHalf]];

    spans.forEach(([startRun, endRun]) => {
      collector.addMember({
        role: "roofBrace",
        group: "roof-plan-bracing",
        profile: profiles.roofBrace,
        material: "trim",
        start: pointFromAxes(runAxis, startRun, a, roofY(startRun)),
        end: pointFromAxes(runAxis, endRun, b, roofY(endRun)),
      });
      collector.addMember({
        role: "roofBrace",
        group: "roof-plan-bracing",
        profile: profiles.roofBrace,
        material: "trim",
        start: pointFromAxes(runAxis, endRun, a, roofY(endRun)),
        end: pointFromAxes(runAxis, startRun, b, roofY(startRun)),
      });
    });
  });

  // --- walidacje ofertowe ---
  const rafterRunM = gable ? runSpan / 2 : runSpan;

  // Płatwie muszą biec prostopadle do spadu, więc ramy zawsze rozpinają się
  // wzdłuż osi spadu. Gdy spad wybrano wzdłuż DŁUŻSZEGO boku, ramy rozpinają
  // dłuższy wymiar hali — konstrukcyjnie możliwe, ale nieopłacalne.
  if (runSpan > longSpan + 0.5) {
    collector.warn(
      "slope_along_long_axis",
      `Spad wzdłuż dłuższego boku wymusza ramy o rozpiętości ${runSpan.toFixed(1)} m w rozstawie ${spec.baySpacing.toFixed(2)} m. ` +
        "W halach spad prowadzi się w poprzek krótszego boku — zmień typ dachu na spad w lewo/w prawo, żeby obniżyć zużycie stali.",
    );
  } else if (rafterRunM > 11) {
    collector.warn(
      "rafter_span",
      `Rozpiętość rygla ramy ${rafterRunM.toFixed(2)} m przekracza tabelę doboru — wymiarowanie wymaga indywidualnego projektu konstrukcyjnego.`,
    );
  }
  if (spec.baySpacing > 6.5) {
    collector.warn("bay_spacing", `Rozstaw ram ${spec.baySpacing.toFixed(2)} m przekracza typowe 5,5 m — sprawdź dobór płatwi.`);
  }
}

// Dwuspad: płatwie liczone osobno na każdej połaci, pierwsza tuż przy kalenicy.
function purlinRunsForGable(runHalf, purlinSpacing, profiles) {
  const clear = profiles.ridge.sizeM / 2 + profiles.purlin.sizeM / 2 + 0.05;
  const slope = positionsBySpacing(runHalf, purlinSpacing, 2).map((value) => value + runHalf / 2);
  const perSlope = [...new Set(slope.slice(1, -1).map((value) => Number(Math.max(value, clear).toFixed(4))))]
    .filter((value) => value < runHalf - 0.15)
    .sort((a, b) => a - b);

  return perSlope.flatMap((value) => [-value, value]).sort((a, b) => a - b);
}
