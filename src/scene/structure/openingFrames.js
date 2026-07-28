// Wzmocniona rama otworu: stojaki przybramowe + nadproże.

import {
  isStructuralOpening,
  openingFrameProfile,
  openingInsidePlane,
  openingPoint,
  openingSillRailY,
  openingWallCoord,
  reachesFloor,
} from "@/scene/structure/openings";

export function buildOpeningFrames(inputs, spec, collector) {
  const group = "opening-frames";

  inputs.openings.filter(isStructuralOpening).forEach((opening) => {
    const wallData = openingInsidePlane(opening.wall, inputs.dimensions, spec.frameInset + 0.05);
    const span = opening.wall === "front" || opening.wall === "back" ? inputs.dimensions.widthM : inputs.dimensions.lengthM;
    const halfWidth = Math.min(opening.widthM / 2, span / 2 - 0.35);
    const center = Math.max(-span / 2 + halfWidth, Math.min(span / 2 - halfWidth, openingWallCoord(opening)));
    const left = center - halfWidth;
    const right = center + halfWidth;
    const top = opening.sillM + opening.heightM;

    const isGate = opening.kind === "gate";
    const profile = openingFrameProfile(opening, spec);
    const size = profile.sizeM;
    const jambOffset = isGate ? Math.max(0.12, size * 1.35) : Math.max(0.08, size);
    // Otwór z podokiennikiem (okno) dostaje pełną podramę: stojaki tylko na
    // wysokość otworu, nadproże u góry i rygiel podokienny u dołu. Otwór do
    // posadzki (brama/drzwi) nie ma podokiennika — stojaki idą od blachy.
    const onFloor = reachesFloor(opening);
    const sillRailY = onFloor ? null : openingSillRailY(opening, spec);
    const jambBottomY = onFloor ? spec.plateThicknessM : sillRailY;

    // Stojak ramy nie może najechać na słup narożny — granica to lico słupa
    // narożnego minus połowa stojaka i mała szczelina montażowa.
    const cornerProfile = spec.profiles.cornerPost ?? spec.profiles.column;
    const jambLimit = span / 2 - spec.frameInset - cornerProfile.sizeM / 2 - size / 2 - 0.02;
    // Stojak nigdy nie może wejść w ŚWIATŁO otworu — przy otworze tuż przy
    // narożniku granica `jambLimit` wypada wewnątrz otworu, więc dociskamy
    // stojak najdalej do jego krawędzi (i zgłaszamy to ostrzeżeniem niżej).
    const leftJamb = Math.min(left, Math.max(-jambLimit, left - jambOffset));
    const rightJamb = Math.max(right, Math.min(jambLimit, right + jambOffset));
    // Musi być spójne z openingHeaderY w openings.js.
    const headerY = top + size * 0.45;

    collector.addMember({
      role: "openingJamb",
      group,
      profile,
      start: openingPoint(wallData, leftJamb, jambBottomY),
      end: openingPoint(wallData, leftJamb, headerY),
    });
    collector.addMember({
      role: "openingJamb",
      group,
      profile,
      start: openingPoint(wallData, rightJamb, jambBottomY),
      end: openingPoint(wallData, rightJamb, headerY),
    });
    collector.addMember({
      role: "openingHeader",
      group,
      profile,
      start: openingPoint(wallData, leftJamb, headerY),
      end: openingPoint(wallData, rightJamb, headerY),
    });

    // Rygiel podokienny: dolna krawędź płyty nad otworem musi mieć oparcie,
    // a na nim staje słupek podokienny przerwany oknem.
    if (sillRailY != null) {
      collector.addMember({
        role: "openingSill",
        group,
        profile,
        material: "trim",
        start: openingPoint(wallData, leftJamb, sillRailY),
        end: openingPoint(wallData, rightJamb, sillRailY),
      });
      collector.addJoint({ position: openingPoint(wallData, leftJamb, sillRailY), sizeM: size * 0.52, role: "openingFrame" });
      collector.addJoint({ position: openingPoint(wallData, rightJamb, sillRailY), sizeM: size * 0.52, role: "openingFrame" });
    }

    collector.addJoint({ position: openingPoint(wallData, leftJamb, headerY), sizeM: size * 0.52, role: "openingFrame" });
    collector.addJoint({ position: openingPoint(wallData, rightJamb, headerY), sizeM: size * 0.52, role: "openingFrame" });

    // Stojak dociśnięty do granicy słupa narożnego: rama wzmacniająca nie ma
    // gdzie się zmieścić między światłem otworu a narożnikiem.
    if (rightJamb - leftJamb < right - left + 0.02) {
      const clearanceM = Math.max(0, Math.min(span / 2 - right, span / 2 + left));
      collector.warn(
        "opening_near_corner",
        `Otwór ${opening.widthM.toFixed(2)} × ${opening.heightM.toFixed(2)} m na ścianie „${opening.wall}" stoi ${clearanceM.toFixed(2)} m od narożnika — ` +
          "rama wzmacniająca nie mieści się między otworem a słupem narożnym. Odsuń otwór od naroża lub zmniejsz jego szerokość.",
        { openingId: opening.id },
      );
    }
  });
}
