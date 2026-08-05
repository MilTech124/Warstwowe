// Kontur przekroju profilu stalowego — czysta matematyka, bez three.
//
// Do tej pory scena rysowała KAŻDY element kwadratowym boxem o krawędzi `sizeM`,
// więc IPE 300, Z 200×2,0 i RHS 120×60 wyglądały identycznie (docs §9 pkt 3).
//
// Układ lokalny przekroju: `u` = oś MOCNA (wysokość h), `v` = oś słaba
// (szerokość b), kontur wycentrowany na (0, 0). Renderer wyciąga go wzdłuż
// elementu i ustawia `u` zgodnie z podpowiedzią `member.up`.
//
// WAŻNE, tak samo jak przy `sizeM` w steelProfiles.js: to jest WYŁĄCZNIE
// przybliżenie renderowania. Masa zawsze pochodzi z `kgPerM` wg tablic wyrobów.

// Katalog podaje tylko `tMm` (grubość ścianki / środnika). Grubość półki
// dwuteownika przybliżamy jej wielokrotnością — sprawdzone na tablicach:
// IPE 200 ma 8,5 / 5,6 = 1,52, IPE 300 10,7 / 7,1 = 1,51.
const IPE_FLANGE_RATIO = 1.55;
const HEA_FLANGE_RATIO = 1.6;
const FLANGE_RATIO_LIMITS = [1.4, 2.0];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rectangle(hM, bM) {
  const u = hM / 2;
  const v = bM / 2;
  return [
    [-u, -v],
    [u, -v],
    [u, v],
    [-u, v],
  ];
}

/**
 * Dwuteownik: 12 punktów obiegających literę I.
 * `u` biegnie wzdłuż wysokości (środnik), `v` wzdłuż półek.
 */
function iBeam(hM, bM, webM, flangeM) {
  const u = hM / 2;
  const v = bM / 2;
  const w = webM / 2;
  const uf = u - flangeM;
  return [
    [-u, -v],
    [-u, v],
    [-uf, v],
    [-uf, w],
    [uf, w],
    [uf, v],
    [u, v],
    [u, -v],
    [uf, -v],
    [uf, -w],
    [-uf, -w],
    [-uf, -v],
  ];
}

/**
 * Profil zimnogięty. `flangeSign` decyduje o charakterze:
 *  +1 → ceownik C (obie półki w tę samą stronę),
 *  -1 → zetownik Z (półki w przeciwne strony).
 * To jedyna różnica między tymi dwoma kształtami.
 */
function coldFormed(hM, bM, tM, flangeSign) {
  const u = hM / 2;
  const top = bM;
  const bottom = bM * flangeSign;
  return [
    [-u, 0],
    [-u, bottom],
    [-u + tM, bottom],
    [-u + tM, tM],
    [u - tM, tM],
    [u - tM, top],
    [u, top],
    [u, 0],
  ];
}

/**
 * @param {object|null} profile  wpis z PROFILES (hMm, bMm, tMm, kind, sizeM)
 * @returns {{ kind: "polygon", points: Array<[number, number]>, hM: number, bM: number }
 *          | { kind: "circle", radiusM: number, hM: number, bM: number }}
 */
export function profileContour(profile) {
  // Nieznany profil albo brak wymiarów → kwadrat jak dotąd. Renderer nie może
  // rzucić wyjątkiem na elemencie, którego nie ma w katalogu.
  if (!profile || !(profile.hMm > 0) || !(profile.bMm > 0)) {
    const side = profile?.sizeM > 0 ? profile.sizeM : 0.06;
    return { kind: "polygon", points: rectangle(side, side), hM: side, bM: side };
  }

  const hM = profile.hMm / 1000;
  const bM = profile.bMm / 1000;
  const tM = (profile.tMm || 2) / 1000;

  if (profile.kind === "ROD") {
    // Pręt jest obrotowo symetryczny — walec jest tańszy niż wyciągany okrąg.
    return { kind: "circle", radiusM: hM / 2, hM, bM: hM };
  }

  if (profile.kind === "IPE" || profile.kind === "HEA") {
    const ratio = clamp(profile.kind === "IPE" ? IPE_FLANGE_RATIO : HEA_FLANGE_RATIO, ...FLANGE_RATIO_LIMITS);
    // Półka nie może zjeść całego środnika w niskich profilach.
    const flangeM = Math.min(tM * ratio, hM * 0.3);
    return { kind: "polygon", points: iBeam(hM, bM, tM, flangeM), hM, bM };
  }

  if (profile.kind === "Z" || profile.kind === "C") {
    return { kind: "polygon", points: coldFormed(hM, bM, tM, profile.kind === "C" ? 1 : -1), hM, bM };
  }

  // SHS / RHS rysujemy jako PEŁNY prostokąt. Końce i tak giną w kostkach węzłów
  // i w zakładce `overlapM`, więc grubość ścianki jest niewidoczna, a otwór
  // podwoiłby liczbę trójkątów w całej hali.
  return { kind: "polygon", points: rectangle(hM, bM), hM, bM };
}

/** Prostokąt opisany na konturze — do testów i do sanity-checków rysunków. */
export function contourBounds(contour) {
  if (contour.kind === "circle") {
    return { minU: -contour.radiusM, maxU: contour.radiusM, minV: -contour.radiusM, maxV: contour.radiusM };
  }
  const us = contour.points.map(([u]) => u);
  const vs = contour.points.map(([, v]) => v);
  return { minU: Math.min(...us), maxU: Math.max(...us), minV: Math.min(...vs), maxV: Math.max(...vs) };
}
