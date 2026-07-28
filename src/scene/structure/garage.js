// Szkielet garażu z płyt warstwowych: słupy narożne i pośrednie, podwalina,
// oczep za spadkiem, krokwie wzdłuż spadu z płatwiami poprzecznymi (lub para
// krokwi + belka kalenicowa dla dwuspadu), jętki, zastrzały, ramy otworów.

import { isGableRoof, roofMetrics } from "@/scene/roofMath";
import {
  densifyPositions,
  frameAxes,
  pointFromAxes,
  positionsBySpacing,
  roofRun,
  roofYOnRun,
  wallForLongSide,
  wallForRunSide,
} from "@/scene/structure/axes";
import {
  blockingOpeningAt,
  bracedBaysForWall,
  columnBlockedByOpening,
  openingBandsAtCoord,
  splitAroundOpenings,
  splitAtMembers,
  wallOpenings,
} from "@/scene/structure/openings";
import { addColumn, addPostWithOpenings } from "@/scene/structure/parts";

const GROUP = "garage-structure";
const SILL_LEVEL_M = 0.05;
const KNEE_BRACE_DROP_M = 0.42;
const KNEE_BRACE_RUN_M = 0.45;

/**
 * Rozkład płatwi wzdłuż osi spadu.
 *
 * Dwuspad: płatwie liczone osobno na każdej połaci, z pierwszą tuż przy kalenicy —
 * inaczej górna krawędź płyty dachowej wisi bez podparcia między krokwiami.
 * Odsunięcie od osi mieści belkę kalenicową obok płatwi bez kolizji.
 */
function purlinPositions(spec, gable, runSpan, purlinSpacing) {
  const runHalf = runSpan / 2;

  if (!gable) {
    // Okapy są podparte oczepami na obu ścianach biegu — bierzemy tylko wnętrze.
    return positionsBySpacing(runSpan, purlinSpacing, 3).slice(1, -1);
  }

  const clear = spec.profiles.ridge.sizeM / 2 + spec.profiles.purlin.sizeM / 2 + 0.04;
  const slope = positionsBySpacing(runHalf, purlinSpacing, 2).map((value) => value + runHalf / 2);
  const interior = slope
    .slice(1, -1)
    .map((value) => Math.max(value, clear))
    .filter((value) => value < runHalf - 0.15);

  const perSlope = [...new Set([clear, ...interior].map((value) => Number(value.toFixed(4))))]
    .filter((value) => value < runHalf - 0.1)
    .sort((a, b) => a - b);

  return perSlope.flatMap((value) => [-value, value]).sort((a, b) => a - b);
}

// Pozycje zakotwienia zastrzałów i kierunki, w które biegną.
//
// Standard: tylko naroża. Wzmocnienie: dodatkowo osie krokwi — tam gdzie krokiew
// przekazuje obciążenie na słup, a nie przy każdym słupku poszyciowym (zastrzał
// przy każdym słupku nie jest praktyką wykonawczą i zaśmiecałby model).
function kneeBraceAnchors(cornerPositions, frameLinePositions, braceAllPosts) {
  const anchors = cornerPositions.map((coord) => ({ coord, directions: [-Math.sign(coord) || 1] }));
  if (!braceAllPosts) return anchors;

  const corners = new Set(cornerPositions.map((coord) => coord.toFixed(3)));
  const interior = frameLinePositions
    .filter((coord) => !corners.has(coord.toFixed(3)))
    .map((coord) => ({ coord, directions: [Math.sign(coord) || 1] }));
  return [...anchors, ...interior];
}

export function buildGarage(inputs, spec, collector) {
  const { widthM, lengthM, wallHeightM } = inputs.dimensions;
  const { runAxis } = frameAxes(inputs);
  const gable = isGableRoof(inputs.roof.type);
  const { rise } = roofMetrics(inputs);
  const { runSpan, longSpan, postSpacing, purlinSpacing, plateThicknessM, profiles, flags } = spec;
  const runHalf = runSpan / 2;
  const longHalf = longSpan / 2;
  const roofY = (runCoord) => roofYOnRun(runCoord, inputs);

  // LINIE NOŚNE DACHU: dwie skrajne to OCZEPY SKOŚNE ścian biegnących wzdłuż
  // spadu, pozostałe to krokwie pośrednie. Rozstaw wynika z nośności płatwi.
  // Słupy dogęszczamy pod gotową siatką, żeby każda krokiew stała na słupie.
  const roofLinePositions = positionsBySpacing(longSpan, spec.rafterSpacing * 1.001);
  const postLongPositions = densifyPositions(roofLinePositions, postSpacing);
  const interiorLongPositions = postLongPositions.slice(1, -1);

  // Oczep skośny leży NA słupach ściany (co ~1,2–1,8 m), więc jego rozpiętość to
  // rozstaw słupów, a nie długość ściany — dlatego dostaje profil oczepu, a nie
  // krokwi. Krokiew pośrednia rozpina się swobodnie między ścianami szczytowymi
  // i tylko ona potrzebuje przekroju z tabeli krokwi.
  const isRakedTopRail = (longCoord) => Math.abs(Math.abs(longCoord) - longHalf) < 0.01;
  const roofLineProfile = (longCoord) => (isRakedTopRail(longCoord) ? profiles.topRail : profiles.rafter);
  // Grubość płaszczyzny nośnej dachu = najgłębszy element, który ją tworzy.
  const roofDepthM = Math.max(...roofLinePositions.map((longCoord) => roofLineProfile(longCoord).sizeM));
  // Górne lico wszystkich elementów połaci jest zlicowane — na nim leży poszycie.
  const flushTopY = (runCoord, sizeM) => roofY(runCoord) + roofDepthM / 2 - sizeM / 2;

  let interiorRunPositions = positionsBySpacing(runSpan, postSpacing).slice(1, -1);
  if (gable && !interiorRunPositions.some((runCoord) => Math.abs(runCoord) < 0.3)) {
    // Słupek szczytowy pod kalenicą musi istnieć niezależnie od rozstawu.
    interiorRunPositions = [...interiorRunPositions, 0].sort((a, b) => a - b);
  }

  const purlinRunPositions = purlinPositions(spec, gable, runSpan, purlinSpacing);

  const runSides = [-runHalf, runHalf];
  const longSides = [-longHalf, longHalf];
  const girtLevel = wallHeightM * 0.52;
  // Jętka: próg z RZECZYWISTEGO biegu połaci, nie ze zwężonego rozstawu słupów.
  const hasCollarTies = gable && roofRun(inputs) >= flags.collarTieMinRunM && rise >= 0.5;
  const tieRun = Math.min((roofRun(inputs) / 2) * 0.45, runHalf - 0.15);
  const tieY = roofYOnRun(tieRun, inputs);

  // Słup kończy się na SPODZIE elementu, który podpiera (oczepu lub krokwi) —
  // nie przebija go w połowie przekroju.
  const rafterUnderY = (runCoord) => flushTopY(runCoord, profiles.topRail.sizeM) - profiles.topRail.sizeM / 2;
  const rafterMembers = roofLinePositions.map((longCoord) => ({ coord: longCoord, size: roofLineProfile(longCoord).sizeM }));
  const ridgeCenterY = roofY(0) + roofDepthM / 2 - roofDepthM * 1.425;
  const ridgeBottomY = ridgeCenterY - profiles.ridge.sizeM / 2;

  // --- słupy narożne ---
  runSides.forEach((runCoord) => {
    longSides.forEach((longCoord) => {
      const topY = rafterUnderY(runCoord);
      addColumn(collector, {
        role: "cornerPost",
        group: GROUP,
        profile: profiles.cornerPost,
        position: pointFromAxes(runAxis, runCoord, longCoord, 0),
        topY,
        plateThicknessM,
      });
      collector.addJoint({
        position: pointFromAxes(runAxis, runCoord, longCoord, topY),
        sizeM: profiles.cornerPost.sizeM * 0.55,
        role: "cornerPost",
      });
    });
  });

  // --- słupy pośrednie ścian biegu (wzdłuż spadu) ---
  runSides.forEach((runCoord) => {
    const wall = wallForRunSide(runAxis, runCoord);
    interiorLongPositions.forEach((longCoord) => {
      addPostWithOpenings(collector, {
        role: "post",
        group: GROUP,
        profile: profiles.post,
        position: pointFromAxes(runAxis, runCoord, longCoord, 0),
        topY: rafterUnderY(runCoord),
        plateThicknessM,
        // Słupek pośredni wspawany w podwalinę — kotwiona jest podwalina.
        plated: false,
        bands: openingBandsAtCoord(inputs, wall, longCoord, spec),
      });
    });
  });

  // --- słupy pośrednie ścian szczytowych ---
  longSides.forEach((longCoord) => {
    const wall = wallForLongSide(runAxis, longCoord);
    interiorRunPositions.forEach((runCoord) => {
      addPostWithOpenings(collector, {
        role: "post",
        group: GROUP,
        profile: profiles.post,
        position: pointFromAxes(runAxis, runCoord, longCoord, 0),
        // Słupek w osi kalenicy (dwuspad) kończy się pod belką kalenicową,
        // pozostałe pod krokwią ściany szczytowej.
        topY: gable && Math.abs(runCoord) < 0.05 ? ridgeBottomY : rafterUnderY(runCoord),
        plateThicknessM,
        // Słupek pośredni wspawany w podwalinę — kotwiona jest podwalina.
        plated: false,
        bands: openingBandsAtCoord(inputs, wall, runCoord, spec),
      });
    });
  });

  // --- podwalina (przerwana w świetle bram i drzwi) ---
  // Podwalina jest CIĄGŁA — słupy są do niej przyspawane, więc przerywają ją
  // tylko otwory sięgające posadzki. Przycinanie przy każdym słupie dawało
  // kilkanaście krótkich odcinków (w tym 20-centymetrowe skrawki), czego nikt
  // nie spawa i co zaśmiecało zestawienie stali.
  runSides.forEach((runCoord) => {
    const wall = wallForRunSide(runAxis, runCoord);
    splitAroundOpenings(-longHalf, longHalf, wallOpenings(inputs, wall), SILL_LEVEL_M).forEach(([from, to]) => {
      collector.addMember({
        role: "sillRail",
        group: GROUP,
        profile: profiles.sillRail,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, SILL_LEVEL_M),
        end: pointFromAxes(runAxis, runCoord, to, SILL_LEVEL_M),
      });
    });
  });
  longSides.forEach((longCoord) => {
    const wall = wallForLongSide(runAxis, longCoord);
    splitAroundOpenings(-runHalf, runHalf, wallOpenings(inputs, wall), SILL_LEVEL_M).forEach(([from, to]) => {
      collector.addMember({
        role: "sillRail",
        group: GROUP,
        profile: profiles.sillRail,
        material: "trim",
        start: pointFromAxes(runAxis, from, longCoord, SILL_LEVEL_M),
        end: pointFromAxes(runAxis, to, longCoord, SILL_LEVEL_M),
      });
    });
  });

  // --- oczep: wspawany między krokwie, górne lico zlicowane z krokwiami ---
  runSides.forEach((runCoord) => {
    const railY = flushTopY(runCoord, profiles.topRail.sizeM);
    splitAtMembers(-longHalf, longHalf, rafterMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "topRail",
        group: GROUP,
        profile: profiles.topRail,
        start: pointFromAxes(runAxis, runCoord, from, railY),
        end: pointFromAxes(runAxis, runCoord, to, railY),
      });
    });
  });

  // --- rygiel pośredni przy ścianach wyższych niż ~3 m (również ciągły) ---
  if (flags.hasMidGirt) {
    runSides.forEach((runCoord) => {
      const wall = wallForRunSide(runAxis, runCoord);
      splitAroundOpenings(-longHalf, longHalf, wallOpenings(inputs, wall), girtLevel).forEach(([from, to]) => {
        collector.addMember({
          role: "midGirt",
          group: GROUP,
          profile: profiles.midGirt,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, from, girtLevel),
          end: pointFromAxes(runAxis, runCoord, to, girtLevel),
        });
      });
    });
    longSides.forEach((longCoord) => {
      const wall = wallForLongSide(runAxis, longCoord);
      splitAroundOpenings(-runHalf, runHalf, wallOpenings(inputs, wall), girtLevel).forEach(([from, to]) => {
        collector.addMember({
          role: "midGirt",
          group: GROUP,
          profile: profiles.midGirt,
          material: "trim",
          start: pointFromAxes(runAxis, from, longCoord, girtLevel),
          end: pointFromAxes(runAxis, to, longCoord, girtLevel),
        });
      });
    });
  }

  // --- linie nośne połaci: skrajne oczepy skośne + krokwie pośrednie ---
  roofLinePositions.forEach((longCoord) => {
    const raked = isRakedTopRail(longCoord);
    const profile = roofLineProfile(longCoord);
    // Rola rozróżnia oba elementy w zestawieniu stali: oczep skośny ściany
    // to nie krokiew, choć leży w tej samej płaszczyźnie.
    const role = raked ? "rakedTopRail" : "rafter";
    const atY = (runCoord) => flushTopY(runCoord, profile.sizeM);

    if (!gable) {
      collector.addMember({
        role,
        group: GROUP,
        profile,
        start: pointFromAxes(runAxis, -runHalf, longCoord, atY(-runHalf)),
        end: pointFromAxes(runAxis, runHalf, longCoord, atY(runHalf)),
      });
      return;
    }

    collector.addMember({
      role,
      group: GROUP,
      profile,
      start: pointFromAxes(runAxis, -runHalf, longCoord, atY(-runHalf)),
      end: pointFromAxes(runAxis, 0, longCoord, atY(0)),
    });
    collector.addMember({
      role,
      group: GROUP,
      profile,
      start: pointFromAxes(runAxis, 0, longCoord, atY(0)),
      end: pointFromAxes(runAxis, runHalf, longCoord, atY(runHalf)),
    });
    collector.addJoint({
      position: pointFromAxes(runAxis, 0, longCoord, atY(0)),
      sizeM: profile.sizeM * 0.6,
      role: "ridge",
    });

    if (hasCollarTies && Math.abs(Math.abs(longCoord) - longHalf) > 0.05) {
      collector.addMember({
        role: "collarTie",
        group: GROUP,
        profile: profiles.collarTie,
        material: "trim",
        start: pointFromAxes(runAxis, -tieRun, longCoord, tieY),
        end: pointFromAxes(runAxis, tieRun, longCoord, tieY),
      });
    }
  });

  // --- belka kalenicowa ---
  if (gable) {
    collector.addMember({
      role: "ridge",
      group: GROUP,
      profile: profiles.ridge,
      start: pointFromAxes(runAxis, 0, -longHalf, ridgeCenterY),
      end: pointFromAxes(runAxis, 0, longHalf, ridgeCenterY),
    });
  }

  // --- płatwie: wspawane między krokwie, zlicowane górą z krokwiami ---
  purlinRunPositions.forEach((runCoord) => {
    const purlinY = flushTopY(runCoord, profiles.purlin.sizeM);
    splitAtMembers(-longHalf, longHalf, rafterMembers).forEach(([from, to]) => {
      collector.addMember({
        role: "purlin",
        group: GROUP,
        profile: profiles.purlin,
        material: "trim",
        start: pointFromAxes(runAxis, runCoord, from, purlinY),
        end: pointFromAxes(runAxis, runCoord, to, purlinY),
      });
    });
  });

  // --- zastrzały narożne (i podokapowe przy wzmocnieniu) ---
  runSides.forEach((runCoord) => {
    const wall = wallForRunSide(runAxis, runCoord);
    const topY = roofY(runCoord);
    if (topY - KNEE_BRACE_DROP_M < 0.8) return;

    kneeBraceAnchors(longSides, roofLinePositions, flags.braceAllPosts).forEach(({ coord, directions }) => {
      directions.forEach((direction) => {
        const inner = coord + direction * KNEE_BRACE_RUN_M;
        if (Math.abs(inner) > longHalf - 0.02) return;
        if (columnBlockedByOpening(inputs, wall, inner) || columnBlockedByOpening(inputs, wall, coord)) return;
        collector.addMember({
          role: "kneeBrace",
          group: GROUP,
          profile: profiles.kneeBrace,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, coord, topY - KNEE_BRACE_DROP_M),
          end: pointFromAxes(runAxis, runCoord, inner, topY - 0.03),
        });
      });
    });
  });

  longSides.forEach((longCoord) => {
    const wall = wallForLongSide(runAxis, longCoord);
    // W ścianie szczytowej jedyną osią nośną poza narożami jest słupek pod kalenicą.
    const endWallFrameLines = gable ? [0] : [];
    kneeBraceAnchors(runSides, endWallFrameLines, flags.braceAllPosts).forEach(({ coord, directions }) => {
      const topY = roofY(coord);
      if (topY - KNEE_BRACE_DROP_M < 0.8) return;

      directions.forEach((direction) => {
        const inner = coord + direction * KNEE_BRACE_RUN_M;
        if (Math.abs(inner) > runHalf - 0.02) return;
        if (columnBlockedByOpening(inputs, wall, inner) || columnBlockedByOpening(inputs, wall, coord)) return;
        collector.addMember({
          role: "kneeBrace",
          group: GROUP,
          profile: profiles.kneeBrace,
          material: "trim",
          start: pointFromAxes(runAxis, coord, longCoord, topY - KNEE_BRACE_DROP_M),
          end: pointFromAxes(runAxis, inner, longCoord, roofY(inner) - 0.03),
        });
      });
    });
  });

  // --- stężenia krzyżowe ścian (tylko konstrukcja ciężka) ---
  if (flags.xBrace) {
    runSides.forEach((runCoord) => {
      const wall = wallForRunSide(runAxis, runCoord);
      const topY = roofY(runCoord) - profiles.topRail.sizeM;
      if (topY < 1.2) return;

      bracedBaysForWall(inputs, wall, postLongPositions).forEach(([from, to]) => {
        collector.addMember({
          role: "xBrace",
          group: GROUP,
          profile: profiles.xBrace,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, from, SILL_LEVEL_M + 0.15),
          end: pointFromAxes(runAxis, runCoord, to, topY),
        });
        collector.addMember({
          role: "xBrace",
          group: GROUP,
          profile: profiles.xBrace,
          material: "trim",
          start: pointFromAxes(runAxis, runCoord, from, topY),
          end: pointFromAxes(runAxis, runCoord, to, SILL_LEVEL_M + 0.15),
        });
      });
    });
  }

  // --- walidacje ofertowe ---
  const rafterRunM = gable ? runSpan / 2 : runSpan;
  if (rafterRunM > 7) {
    collector.warn(
      "rafter_span",
      `Rozpiętość krokwi ${rafterRunM.toFixed(2)} m wychodzi poza tabelę doboru dla garaży — rozważ konstrukcję halową lub podparcie pośrednie.`,
    );
  }
  if (wallHeightM > 3.6 && !flags.hasMidGirt) {
    collector.warn("mid_girt_missing", "Ściana wyższa niż 3,6 m bez rygla pośredniego — sprawdź podparcie płyt.");
  }
  if (!gable && inputs.roof.pitchPercent < 7) {
    const roofRunM = roofRun(inputs);
    const panelLengthM = Math.max(widthM, lengthM) > 0 ? roofRunM : 0;
    if (panelLengthM > 6) {
      collector.warn(
        "low_pitch",
        `Spadek ${inputs.roof.pitchPercent}% przy połaci ${panelLengthM.toFixed(1)} m sztukowanej z kilku płyt — praktyka wymaga ≥ 10%.`,
      );
    } else {
      collector.warn("low_pitch", `Spadek ${inputs.roof.pitchPercent}% jest poniżej zalecanego minimum 7% dla dachu jednospadowego.`);
    }
  }
}
