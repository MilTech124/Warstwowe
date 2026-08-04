// Interakcja szkieletu z otworami: przerwy w ryglach, słupki nadprożowe,
// wybór przęseł pod stężenia, ramy otworów.

export function openingWallCoord(opening) {
  if (opening.wall === "front") return opening.offsetM;
  if (opening.wall === "back") return -opening.offsetM;
  if (opening.wall === "left") return -opening.offsetM;
  return opening.offsetM;
}

// Konstrukcyjnie liczy się każdy otwór w ŚCIANIE — także okno. Płyta warstwowa
// jest wokół niego docięta, więc jej krawędzie muszą mieć do czego być przykręcone
// (podrama otworu), a słup w osi otworu musi zostać przerwany.
// Okna dachowe leżą w połaci (wall === "roof") i nie dotyczą szkieletu ścian.
export function isStructuralOpening(opening) {
  return opening.wall !== "roof" && (opening.kind === "gate" || opening.kind === "door" || opening.kind === "window");
}

// Otwór sięgający posadzki przerywa podwalinę i słup na całej wysokości.
// Otwór z podokiennikiem (okno) tylko dzieli słup na dwa odcinki.
export function reachesFloor(opening) {
  return opening.sillM <= 0.15;
}

export function wallOpenings(inputs, wall) {
  return inputs.openings.filter((opening) => opening.wall === wall && isStructuralOpening(opening));
}

export function openingCutsAtLevel(openings, level, clearance = 0.12) {
  return openings
    .filter((opening) => level >= opening.sillM - clearance && level <= opening.sillM + opening.heightM + clearance)
    .map((opening) => {
      const center = openingWallCoord(opening);
      const half = opening.widthM / 2 + clearance;
      return [center - half, center + half];
    })
    .sort((a, b) => a[0] - b[0]);
}

export function splitAroundOpenings(start, end, openings, level, clearance = 0.12) {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const cuts = openingCutsAtLevel(openings, level, clearance);
  const segments = [];
  let cursor = min;

  cuts.forEach(([cutStart, cutEnd]) => {
    const a = Math.max(min, cutStart);
    const b = Math.min(max, cutEnd);
    if (b <= cursor) return;
    if (a - cursor > 0.18) segments.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });

  if (max - cursor > 0.18) segments.push([cursor, max]);
  return start <= end ? segments : segments.map(([a, b]) => [b, a]);
}

// Rygle, podwaliny i płatwie są wspawane MIĘDZY elementy poprzeczne
// (słupy, krokwie), a nie przenikają przez nie — tniemy je na odcinki
// z przerwą na każdy element nośny.
export function splitAtMembers(start, end, members, minLength = 0.1) {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const segments = [];
  let cursor = min;
  [...members]
    .sort((a, b) => a.coord - b.coord)
    .forEach(({ coord, size }) => {
      const a = coord - size / 2 - 0.003;
      const b = coord + size / 2 + 0.003;
      if (b <= cursor || a >= max) return;
      if (a - cursor > minLength) segments.push([cursor, a]);
      cursor = Math.max(cursor, b);
    });
  if (max - cursor > minLength) segments.push([cursor, max]);
  return start <= end ? segments : segments.map(([a, b]) => [b, a]);
}

// Odcinki rygla/podwaliny: najpierw wycięcie otworów, potem przerwy na słupy.
export function railSegments(start, end, openings, level, members) {
  return splitAroundOpenings(start, end, openings, level).flatMap(([a, b]) => splitAtMembers(a, b, members));
}

// Otwory, których światło przechodzi przez osi słupa na danej współrzędnej.
export function openingsAtCoord(inputs, wall, coord, clearance = 0.08) {
  return wallOpenings(inputs, wall).filter(
    (opening) => Math.abs(coord - openingWallCoord(opening)) < opening.widthM / 2 + clearance,
  );
}

export function blockingOpeningAt(inputs, wall, coord) {
  return openingsAtCoord(inputs, wall, coord).find(reachesFloor) ?? null;
}

export function columnBlockedByOpening(inputs, wall, coord) {
  return Boolean(blockingOpeningAt(inputs, wall, coord));
}

/**
 * Pionowe pasy wysokości zajęte przez otwory w osi słupa — słup jest w nich
 * przerwany i opiera się na podramie otworu.
 *
 * Brama/drzwi (do posadzki) dają jeden pas od 0 do nadproża, więc zostaje tylko
 * słupek nadprożowy. Okno daje pas od podokiennika do nadproża, więc słup rozpada
 * się na słupek podokienny i nadprożowy.
 */
export function openingBandsAtCoord(inputs, wall, coord, spec) {
  return openingsAtCoord(inputs, wall, coord)
    .map((opening) => ({
      opening,
      from: reachesFloor(opening) ? 0 : openingSillRailY(opening, spec),
      to: openingHeaderY(opening, spec),
    }))
    .sort((a, b) => a.from - b.from);
}

export function openingFrameProfile(opening, spec) {
  return opening.kind === "gate" ? spec.profiles.gateFrame : spec.profiles.endPost;
}

// Poziom osi nadproża otworu — musi być spójny z headerY w buildOpeningFrames.
export function openingHeaderY(opening, spec) {
  return opening.sillM + opening.heightM + openingFrameProfile(opening, spec).sizeM * 0.45;
}

// Poziom osi rygla podokiennego — musi być spójny z sillRailY w buildOpeningFrames.
export function openingSillRailY(opening, spec) {
  return Math.max(0.12, opening.sillM - openingFrameProfile(opening, spec).sizeM * 0.45);
}

// Płaszczyzna ramy otworu: która oś biegnie wzdłuż ściany i gdzie leży jej lico.
//
// UWAGA: NIE ma tu żadnego współczynnika znaku. `openingWallCoord` zwraca już
// surową współrzędną świata (dla „back" i „left" ujemny offset jest w niej
// zawarty), tak samo jak wallOpeningAxisCenter w geometry.js, które ustawia
// widoczny otwór. Wcześniejsze mnożenie przez `sign` negowało współrzędną po raz
// drugi i odbijało ramę na ścianie lewej (na prawej sign wynosił +1, a na tylnej
// nie był używany — dlatego błąd dotyczył wyłącznie lewej ściany).
export function openingInsidePlane(wall, dimensions, inset) {
  if (wall === "front") return { axis: "x", fixed: dimensions.lengthM / 2 - inset };
  if (wall === "back") return { axis: "x", fixed: -dimensions.lengthM / 2 + inset };
  if (wall === "left") return { axis: "z", fixed: -dimensions.widthM / 2 + inset };
  return { axis: "z", fixed: dimensions.widthM / 2 - inset };
}

export function openingPoint(wallData, coord, y) {
  if (wallData.axis === "x") return [coord, y, wallData.fixed];
  return [wallData.fixed, y, coord];
}

// Czy przęsło [a, b] na danej ścianie koliduje z otworem. Stężeń krzyżowych
// nie wolno prowadzić przez światło otworu.
export function bayIntersectsOpening(inputs, wall, a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return wallOpenings(inputs, wall).some((opening) => {
    const center = openingWallCoord(opening);
    const half = opening.widthM / 2 + 0.15;
    return center + half > min + 0.05 && center - half < max - 0.05;
  });
}

// Wybór przęseł pod stężenia: pierwsze i ostatnie wolne przęsło ściany.
// Gdy cała ściana jest zabudowana otworami — stężeń na niej nie ma.
export function bracedBaysForWall(inputs, wall, positions) {
  const bays = positions.slice(0, -1).map((a, index) => [a, positions[index + 1]]);
  const free = bays.filter(([a, b]) => Math.abs(b - a) > 0.3 && !bayIntersectsOpening(inputs, wall, a, b));
  if (!free.length) return [];
  const first = free[0];
  const last = free.at(-1);
  return first === last ? [first] : [first, last];
}
