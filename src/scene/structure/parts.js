// Złożone elementy powtarzalne: słup z blachą podstawy, słup przerwany otworami.

export function addColumn(collector, { role, group, profile, position, topY, material = "steel", plateThicknessM, plated = true }) {
  // Straż z pierwotnego komponentu Column: słup nigdy nie jest krótszy niż 0,5 m
  // (chroni przed degeneracją geometrii przy skrajnych proporcjach).
  const top = Math.max(0.5, topY);

  // `plated: false` — słup wspawany w podwalinę, bez własnej stopy. Tak wygląda
  // szkielet garażowy: kotwiona jest podwalina, a nie każdy słupek osobno.
  if (plated) {
    collector.addPlate({ position, columnSizeM: profile.sizeM, thicknessM: plateThicknessM, group });
  }
  return collector.addMember({
    role,
    group,
    profile,
    start: [position[0], plateThicknessM, position[2]],
    end: [position[0], top, position[2]],
    material,
  });
}

// Najkrótszy sensowny odcinek słupka — krótsze skrawki pomijamy.
const MIN_STUB_M = 0.12;

/**
 * Słup przerwany otworami w swojej osi.
 *
 * Zamiast specjalnego przypadku „słupek nadprożowy" liczymy odcinki między pasami
 * zajętymi przez otwory. Dzięki temu jedna reguła obsługuje oba warianty:
 *  - brama/drzwi do posadzki → pas 0..nadproże, zostaje słupek NADPROŻOWY,
 *  - okno z podokiennikiem  → pas podokiennik..nadproże, słup rozpada się na
 *    słupek PODOKIENNY i NADPROŻOWY.
 *
 * Odcinek startujący od posadzki dostaje blachę podstawy; pozostałe opierają się
 * na podramie otworu, więc zamiast blachy mają węzeł spoiny.
 *
 * @param {{ bands: Array<{ from: number, to: number }> }} options
 * @returns {number} liczba wstawionych odcinków
 */
export function addPostWithOpenings(collector, {
  role,
  group,
  profile,
  position,
  topY,
  plateThicknessM,
  bands = [],
  material = "steel",
  plated = true,
  stubRole = "overOpeningPost",
  underRole = "underOpeningPost",
}) {
  const top = Math.max(0.5, topY);

  if (!bands.length) {
    addColumn(collector, { role, group, profile, position, topY, plateThicknessM, material, plated });
    return 1;
  }

  const segments = [];
  let cursor = plateThicknessM;
  [...bands]
    .sort((a, b) => a.from - b.from)
    .forEach(({ from, to }) => {
      if (to <= cursor) return;
      if (from - cursor > MIN_STUB_M) segments.push([cursor, from]);
      cursor = Math.max(cursor, to);
    });
  if (top - cursor > MIN_STUB_M) segments.push([cursor, top]);

  segments.forEach(([fromY, toY], index) => {
    const fromFloor = index === 0 && fromY <= plateThicknessM + 1e-6;
    // Odcinek pod otworem to słupek podokienny, nad otworem — nadprożowy.
    const segmentRole = fromFloor ? underRole : stubRole;

    if (fromFloor && plated) {
      collector.addPlate({ position, columnSizeM: profile.sizeM, thicknessM: plateThicknessM, group });
    } else {
      collector.addJoint({ position: [position[0], fromY, position[2]], sizeM: profile.sizeM * 0.6, role: segmentRole, group });
    }

    collector.addMember({
      role: segmentRole,
      group,
      profile,
      start: [position[0], fromY, position[2]],
      end: [position[0], toY, position[2]],
      material,
    });
  });

  return segments.length;
}
