// Katalog profili stalowych do doboru przekrojów i zestawienia materiału (BOM).
//
// Masy jednostkowe (kgPerM) wg tablic wyrobów: rury zamknięte EN 10219 (SHS/RHS),
// dwuteowniki EN 10365 (IPE/HEA), profile zimnogięte Z/C wg kart producentów
// (wartości orientacyjne — różnią się o kilka procent między wytwórcami).
//
// WAŻNE: `sizeM` to WYŁĄCZNIE podpowiedź renderowania — krawędź kwadratowego boxa,
// którym scena rysuje element (patrz src/scene/Beam.jsx). Profile są prostokątne
// lub dwuteowe, więc `sizeM` NIE służy do liczenia masy. Masa zawsze z `kgPerM`.

export const STEEL_GRADE_GARAGE = "S235JRH, ocynk";
export const STEEL_GRADE_HALL = "S235JR";

// kind: SHS = rura kwadratowa, RHS = rura prostokątna, IPE/HEA = dwuteownik,
//       Z / C = profil zimnogięty (płatwie, rygle)
export const PROFILES = {
  // --- rury kwadratowe ---
  shs_40x40x2: { id: "shs_40x40x2", label: "40×40×2", kind: "SHS", hMm: 40, bMm: 40, tMm: 2, kgPerM: 2.31, sizeM: 0.04 },
  shs_40x40x3: { id: "shs_40x40x3", label: "40×40×3", kind: "SHS", hMm: 40, bMm: 40, tMm: 3, kgPerM: 3.3, sizeM: 0.04 },
  shs_50x50x2: { id: "shs_50x50x2", label: "50×50×2", kind: "SHS", hMm: 50, bMm: 50, tMm: 2, kgPerM: 2.93, sizeM: 0.045 },
  shs_50x50x3: { id: "shs_50x50x3", label: "50×50×3", kind: "SHS", hMm: 50, bMm: 50, tMm: 3, kgPerM: 4.25, sizeM: 0.045 },
  shs_60x60x2: { id: "shs_60x60x2", label: "60×60×2", kind: "SHS", hMm: 60, bMm: 60, tMm: 2, kgPerM: 3.56, sizeM: 0.06 },
  shs_60x60x3: { id: "shs_60x60x3", label: "60×60×3", kind: "SHS", hMm: 60, bMm: 60, tMm: 3, kgPerM: 5.19, sizeM: 0.06 },
  shs_70x70x2: { id: "shs_70x70x2", label: "70×70×2", kind: "SHS", hMm: 70, bMm: 70, tMm: 2, kgPerM: 4.19, sizeM: 0.07 },
  shs_70x70x3: { id: "shs_70x70x3", label: "70×70×3", kind: "SHS", hMm: 70, bMm: 70, tMm: 3, kgPerM: 6.13, sizeM: 0.07 },
  shs_80x80x3: { id: "shs_80x80x3", label: "80×80×3", kind: "SHS", hMm: 80, bMm: 80, tMm: 3, kgPerM: 7.07, sizeM: 0.08 },
  shs_80x80x4: { id: "shs_80x80x4", label: "80×80×4", kind: "SHS", hMm: 80, bMm: 80, tMm: 4, kgPerM: 9.22, sizeM: 0.08 },
  shs_100x100x3: { id: "shs_100x100x3", label: "100×100×3", kind: "SHS", hMm: 100, bMm: 100, tMm: 3, kgPerM: 8.96, sizeM: 0.1 },
  shs_100x100x4: { id: "shs_100x100x4", label: "100×100×4", kind: "SHS", hMm: 100, bMm: 100, tMm: 4, kgPerM: 11.7, sizeM: 0.1 },
  shs_120x120x4: { id: "shs_120x120x4", label: "120×120×4", kind: "SHS", hMm: 120, bMm: 120, tMm: 4, kgPerM: 14.2, sizeM: 0.12 },
  shs_120x120x5: { id: "shs_120x120x5", label: "120×120×5", kind: "SHS", hMm: 120, bMm: 120, tMm: 5, kgPerM: 17.5, sizeM: 0.12 },
  shs_140x140x5: { id: "shs_140x140x5", label: "140×140×5", kind: "SHS", hMm: 140, bMm: 140, tMm: 5, kgPerM: 20.7, sizeM: 0.14 },

  // --- rury prostokątne ---
  rhs_60x40x2: { id: "rhs_60x40x2", label: "60×40×2", kind: "RHS", hMm: 60, bMm: 40, tMm: 2, kgPerM: 2.93, sizeM: 0.055 },
  rhs_60x40x3: { id: "rhs_60x40x3", label: "60×40×3", kind: "RHS", hMm: 60, bMm: 40, tMm: 3, kgPerM: 4.25, sizeM: 0.055 },
  rhs_80x40x3: { id: "rhs_80x40x3", label: "80×40×3", kind: "RHS", hMm: 80, bMm: 40, tMm: 3, kgPerM: 5.19, sizeM: 0.065 },
  rhs_80x60x3: { id: "rhs_80x60x3", label: "80×60×3", kind: "RHS", hMm: 80, bMm: 60, tMm: 3, kgPerM: 6.13, sizeM: 0.075 },
  rhs_80x60x4: { id: "rhs_80x60x4", label: "80×60×4", kind: "RHS", hMm: 80, bMm: 60, tMm: 4, kgPerM: 7.97, sizeM: 0.075 },
  rhs_100x60x3: { id: "rhs_100x60x3", label: "100×60×3", kind: "RHS", hMm: 100, bMm: 60, tMm: 3, kgPerM: 7.07, sizeM: 0.09 },
  rhs_100x60x4: { id: "rhs_100x60x4", label: "100×60×4", kind: "RHS", hMm: 100, bMm: 60, tMm: 4, kgPerM: 9.22, sizeM: 0.09 },
  rhs_120x60x4: { id: "rhs_120x60x4", label: "120×60×4", kind: "RHS", hMm: 120, bMm: 60, tMm: 4, kgPerM: 10.7, sizeM: 0.11 },
  rhs_120x80x4: { id: "rhs_120x80x4", label: "120×80×4", kind: "RHS", hMm: 120, bMm: 80, tMm: 4, kgPerM: 11.9, sizeM: 0.115 },
  rhs_140x80x4: { id: "rhs_140x80x4", label: "140×80×4", kind: "RHS", hMm: 140, bMm: 80, tMm: 4, kgPerM: 13.1, sizeM: 0.13 },
  rhs_160x80x5: { id: "rhs_160x80x5", label: "160×80×5", kind: "RHS", hMm: 160, bMm: 80, tMm: 5, kgPerM: 17.5, sizeM: 0.145 },

  // --- dwuteowniki: słupy i rygle ram portalowych ---
  ipe_160: { id: "ipe_160", label: "IPE 160", kind: "IPE", hMm: 160, bMm: 82, tMm: 5, kgPerM: 15.8, sizeM: 0.16 },
  ipe_180: { id: "ipe_180", label: "IPE 180", kind: "IPE", hMm: 180, bMm: 91, tMm: 5.3, kgPerM: 18.8, sizeM: 0.18 },
  ipe_200: { id: "ipe_200", label: "IPE 200", kind: "IPE", hMm: 200, bMm: 100, tMm: 5.6, kgPerM: 22.4, sizeM: 0.2 },
  ipe_220: { id: "ipe_220", label: "IPE 220", kind: "IPE", hMm: 220, bMm: 110, tMm: 5.9, kgPerM: 26.2, sizeM: 0.22 },
  ipe_240: { id: "ipe_240", label: "IPE 240", kind: "IPE", hMm: 240, bMm: 120, tMm: 6.2, kgPerM: 30.7, sizeM: 0.24 },
  ipe_270: { id: "ipe_270", label: "IPE 270", kind: "IPE", hMm: 270, bMm: 135, tMm: 6.6, kgPerM: 36.1, sizeM: 0.27 },
  ipe_300: { id: "ipe_300", label: "IPE 300", kind: "IPE", hMm: 300, bMm: 150, tMm: 7.1, kgPerM: 42.2, sizeM: 0.3 },
  ipe_330: { id: "ipe_330", label: "IPE 330", kind: "IPE", hMm: 330, bMm: 160, tMm: 7.5, kgPerM: 49.1, sizeM: 0.33 },
  ipe_360: { id: "ipe_360", label: "IPE 360", kind: "IPE", hMm: 360, bMm: 170, tMm: 8, kgPerM: 57.1, sizeM: 0.36 },
  hea_160: { id: "hea_160", label: "HEA 160", kind: "HEA", hMm: 152, bMm: 160, tMm: 6, kgPerM: 30.4, sizeM: 0.16 },
  hea_180: { id: "hea_180", label: "HEA 180", kind: "HEA", hMm: 171, bMm: 180, tMm: 6, kgPerM: 35.5, sizeM: 0.18 },
  hea_200: { id: "hea_200", label: "HEA 200", kind: "HEA", hMm: 190, bMm: 200, tMm: 6.5, kgPerM: 42.3, sizeM: 0.2 },
  hea_220: { id: "hea_220", label: "HEA 220", kind: "HEA", hMm: 210, bMm: 220, tMm: 7, kgPerM: 50.5, sizeM: 0.22 },
  hea_240: { id: "hea_240", label: "HEA 240", kind: "HEA", hMm: 230, bMm: 240, tMm: 7.5, kgPerM: 60.3, sizeM: 0.24 },
  hea_260: { id: "hea_260", label: "HEA 260", kind: "HEA", hMm: 250, bMm: 260, tMm: 7.5, kgPerM: 68.2, sizeM: 0.26 },
  hea_280: { id: "hea_280", label: "HEA 280", kind: "HEA", hMm: 270, bMm: 280, tMm: 8, kgPerM: 76.4, sizeM: 0.28 },

  // --- profile zimnogięte: płatwie i rygle ścienne hal ---
  z_150x2: { id: "z_150x2", label: "Z 150×2,0", kind: "Z", hMm: 150, bMm: 60, tMm: 2, kgPerM: 4.9, sizeM: 0.062 },
  z_200x2: { id: "z_200x2", label: "Z 200×2,0", kind: "Z", hMm: 200, bMm: 65, tMm: 2, kgPerM: 5.9, sizeM: 0.07 },
  z_200x25: { id: "z_200x25", label: "Z 200×2,5", kind: "Z", hMm: 200, bMm: 65, tMm: 2.5, kgPerM: 7.4, sizeM: 0.07 },
  z_250x25: { id: "z_250x25", label: "Z 250×2,5", kind: "Z", hMm: 250, bMm: 70, tMm: 2.5, kgPerM: 8.6, sizeM: 0.078 },
  z_300x3: { id: "z_300x3", label: "Z 300×3,0", kind: "Z", hMm: 300, bMm: 80, tMm: 3, kgPerM: 12, sizeM: 0.088 },
  z_350x3: { id: "z_350x3", label: "Z 350×3,0", kind: "Z", hMm: 350, bMm: 85, tMm: 3, kgPerM: 13.6, sizeM: 0.095 },
  c_150x2: { id: "c_150x2", label: "C 150×2,0", kind: "C", hMm: 150, bMm: 50, tMm: 2, kgPerM: 4.7, sizeM: 0.052 },
  c_200x2: { id: "c_200x2", label: "C 200×2,0", kind: "C", hMm: 200, bMm: 60, tMm: 2, kgPerM: 5.6, sizeM: 0.062 },
  c_250x25: { id: "c_250x25", label: "C 250×2,5", kind: "C", hMm: 250, bMm: 65, tMm: 2.5, kgPerM: 8.3, sizeM: 0.072 },

  // --- pręty stężeń ---
  rod_m16: { id: "rod_m16", label: "Ściąg M16", kind: "ROD", hMm: 16, bMm: 16, tMm: 16, kgPerM: 1.58, sizeM: 0.04 },
  rod_m20: { id: "rod_m20", label: "Ściąg M20", kind: "ROD", hMm: 20, bMm: 20, tMm: 20, kgPerM: 2.47, sizeM: 0.048 },
};

// Wskaźnik zginania względem osi mocnej [cm³].
//
// Dla rur zamkniętych liczony z geometrii (dokładny wzór na przekrój skrzynkowy),
// dla dwuteowników i profili zimnogiętych brany z tablic wyrobów — pole `wyCm3`.
// Potrzebny, bo przekrój płatwi i krokwi musi wynikać z MOMENTU (rozpiętość ×
// obciążenie × rozstaw), a nie z samej rozpiętości.
export function sectionModulusCm3(profile) {
  if (profile.wyCm3 != null) return profile.wyCm3;
  if (profile.kind !== "SHS" && profile.kind !== "RHS") return null;

  const { hMm: h, bMm: b, tMm: t } = profile;
  const inertiaMm4 = (b * h ** 3 - (b - 2 * t) * (h - 2 * t) ** 3) / 12;
  return (2 * inertiaMm4) / h / 1000;
}

// Tablicowe wskaźniki zginania dla profili, których nie liczymy z geometrii.
const TABULATED_WY_CM3 = {
  ipe_160: 109, ipe_180: 146, ipe_200: 194, ipe_220: 252, ipe_240: 324,
  ipe_270: 429, ipe_300: 557, ipe_330: 713, ipe_360: 904,
  hea_160: 220, hea_180: 294, hea_200: 389, hea_220: 515, hea_240: 675,
  hea_260: 836, hea_280: 1010,
  z_150x2: 22, z_200x2: 35, z_200x25: 43, z_250x25: 62, z_300x3: 95, z_350x3: 122,
  c_150x2: 18, c_200x2: 29, c_250x25: 52,
  // Ściąg pracuje wyłącznie na rozciąganie — zginanie go nie dotyczy.
  rod_m16: 0, rod_m20: 0,
};

Object.entries(TABULATED_WY_CM3).forEach(([id, wyCm3]) => {
  if (PROFILES[id]) PROFILES[id].wyCm3 = wyCm3;
});

export function getProfile(id) {
  return PROFILES[id] ?? null;
}

// Granica plastyczności S235 [MPa]. Do prostego sprawdzenia zginania na potrzeby
// ofertowania — nie zastępuje wymiarowania wg Eurokodu.
export const STEEL_YIELD_MPA = 235;

// Blacha podstawy: kg = pole × grubość × 7850 kg/m³
export const STEEL_DENSITY_KG_M3 = 7850;

// Kotwa rozporowa/wklejana M12 wg docs §1 — 4 szt. na stopę.
export const ANCHOR = { label: "Kotwa M12", massKg: 0.12 };

// ---------------------------------------------------------------------------
// Tabele doboru wg rozpiętości elementu.
//
// Kolejność w tablicy = kolejność „o stopień wyżej" przy wzmocnieniu konstrukcji.
// Progi `maxSpanM` dla garaży pochodzą z docs/konstrukcja-garazy-plyta-warstwowa.md
// tabela 3.2 (praktyka producentów), dla hal z typowych rozpiętości ram portalowych.
// ---------------------------------------------------------------------------

export const GARAGE_PROFILE_TABLES = {
  // słup pośredni — dobór wg wysokości ściany
  post: [
    { maxSpanM: 3.0, profileId: "shs_60x60x2" },
    { maxSpanM: 3.6, profileId: "shs_70x70x2" },
    { maxSpanM: Infinity, profileId: "shs_80x80x3" },
  ],
  // słup narożny — zawsze o stopień większy od pośredniego
  cornerPost: [
    { maxSpanM: 3.0, profileId: "shs_70x70x2" },
    { maxSpanM: 3.6, profileId: "shs_80x80x3" },
    { maxSpanM: Infinity, profileId: "shs_100x100x3" },
  ],
  // Krokiew. Dobór przez pickProfileByBending — `maxSpanM` to zapasowy porządek.
  // Górne pozycje (RHS 140–160, IPE 180) są realnie potrzebne przy szerokim
  // garażu w strefie śniegowej 4–5: krokiew 5,7 m zbierająca pas 2,9 m przy
  // 2,6 kN/m² wymaga ok. 130 cm³, czyli już dwuteownika.
  rafter: [
    { maxSpanM: 3.5, profileId: "rhs_60x40x2" },
    { maxSpanM: 5.0, profileId: "rhs_80x60x3" },
    { maxSpanM: 6.0, profileId: "rhs_100x60x3" },
    { maxSpanM: 7.0, profileId: "rhs_120x60x4" },
    { maxSpanM: 8.0, profileId: "rhs_140x80x4" },
    { maxSpanM: 9.0, profileId: "rhs_160x80x5" },
    { maxSpanM: Infinity, profileId: "ipe_180" },
  ],
  // Płatew. Kolejność rosnąca po nośności — dobór idzie przez pickProfileByBending
  // (moment ze rozpiętości × rozstawu × obciążenia), więc `maxSpanM` służy tylko
  // jako zapasowy porządek. Górne pozycje są potrzebne przy szerokim rozstawie
  // płatwi i strefie śniegowej 4–5.
  purlin: [
    { maxSpanM: 2.2, profileId: "shs_40x40x2" },
    { maxSpanM: 3.0, profileId: "rhs_60x40x2" },
    { maxSpanM: 3.5, profileId: "rhs_80x40x3" },
    { maxSpanM: 4.5, profileId: "rhs_80x60x3" },
    { maxSpanM: 5.5, profileId: "rhs_100x60x3" },
    { maxSpanM: Infinity, profileId: "rhs_120x60x4" },
  ],
  // słupek pomocniczy (nadprożowy, szczytowy)
  endPost: [
    { maxSpanM: 3.0, profileId: "shs_60x60x2" },
    { maxSpanM: Infinity, profileId: "shs_70x70x2" },
  ],
  // jętka / zastrzał
  brace: [
    { maxSpanM: 2.5, profileId: "shs_40x40x2" },
    { maxSpanM: Infinity, profileId: "shs_50x50x2" },
  ],
  // rama otworu bramowego — zawsze wzmocniona (docs 3.2: ≥ 80×80×3)
  gateFrame: [
    { maxSpanM: 3.5, profileId: "shs_80x80x3" },
    { maxSpanM: 5.0, profileId: "shs_100x100x3" },
    { maxSpanM: Infinity, profileId: "shs_120x120x4" },
  ],
};

export const HALL_PROFILE_TABLES = {
  // Słup ramy portalowej — dobór wg wysokości ściany.
  //
  // IPE, nie HEA: rama portalowa pracuje głównie na zginanie w płaszczyźnie ramy,
  // gdzie dwuteownik wąskostopowy daje nośność taniej. HEA 200 to 42,3 kg/mb
  // wobec 30,7 kg/mb dla IPE 240 o podobnej nośności na zginanie — na słupach
  // szło ~30% masy hali, więc wybór profilu decydował o całym bilansie.
  column: [
    { maxSpanM: 4.0, profileId: "ipe_200" },
    { maxSpanM: 5.0, profileId: "ipe_240" },
    { maxSpanM: 6.0, profileId: "ipe_270" },
    { maxSpanM: Infinity, profileId: "ipe_300" },
  ],
  // rygiel ramy (krokiew) — dobór wg rozpiętości połaci
  rafter: [
    { maxSpanM: 5.0, profileId: "ipe_200" },
    { maxSpanM: 7.0, profileId: "ipe_240" },
    { maxSpanM: 9.0, profileId: "ipe_270" },
    { maxSpanM: 11.0, profileId: "ipe_300" },
    { maxSpanM: Infinity, profileId: "ipe_360" },
  ],
  // Płatew zimnogięta. Kolejność rosnąca po nośności — dobór idzie przez
  // pickProfileByBending, więc `maxSpanM` służy tylko jako zapasowy porządek.
  // Górne pozycje (Z 350, IPE 180) są potrzebne dla dużych hal przy szerokim
  // rozstawie ram i strefie śniegowej 4–5.
  purlin: [
    { maxSpanM: 4.5, profileId: "z_150x2" },
    { maxSpanM: 6.0, profileId: "z_200x2" },
    { maxSpanM: 7.0, profileId: "z_200x25" },
    { maxSpanM: 8.0, profileId: "z_250x25" },
    { maxSpanM: 9.0, profileId: "z_300x3" },
    { maxSpanM: 10.0, profileId: "z_350x3" },
    { maxSpanM: Infinity, profileId: "ipe_180" },
  ],
  // rygiel ścienny zimnogięty
  girt: [
    { maxSpanM: 4.5, profileId: "c_150x2" },
    { maxSpanM: 6.0, profileId: "c_200x2" },
    { maxSpanM: Infinity, profileId: "c_250x25" },
  ],
  // słupek pośredni ściany (podpora płyt poziomych) — wg wysokości ściany
  wallPost: [
    { maxSpanM: 4.0, profileId: "shs_80x80x3" },
    { maxSpanM: 5.5, profileId: "shs_100x100x3" },
    { maxSpanM: Infinity, profileId: "shs_120x120x4" },
  ],
  // słupek ściany szczytowej
  endPost: [
    { maxSpanM: 4.5, profileId: "shs_100x100x3" },
    { maxSpanM: 6.0, profileId: "shs_120x120x4" },
    { maxSpanM: Infinity, profileId: "shs_140x140x5" },
  ],
  // zastrzały podokapowe — pracują na ŚCISKANIE, więc profil zamknięty
  brace: [
    { maxSpanM: 4.5, profileId: "shs_60x60x3" },
    { maxSpanM: 6.5, profileId: "shs_70x70x3" },
    { maxSpanM: Infinity, profileId: "shs_80x80x4" },
  ],
  // stężenia krzyżowe — para przekątnych pracuje na ROZCIĄGANIE, więc ściągi
  // prętowe, a nie profile zamknięte (SHS 60×60×3 to 5,19 kg/mb wobec 1,58 kg/mb
  // ściągu M16 — na SHS szło tu ~7% masy hali bez uzasadnienia)
  tieRod: [
    { maxSpanM: 6.0, profileId: "rod_m16" },
    { maxSpanM: Infinity, profileId: "rod_m20" },
  ],
  gateFrame: [
    { maxSpanM: 4.0, profileId: "shs_100x100x3" },
    { maxSpanM: 6.0, profileId: "shs_120x120x4" },
    { maxSpanM: Infinity, profileId: "shs_140x140x5" },
  ],
};

/**
 * Dobór profilu wg NOŚNOŚCI NA ZGINANIE, a nie samej rozpiętości.
 *
 * Belka zbierająca obciążenie z pasa o szerokości `tributaryM` przenosi
 * q = load × tributary, więc moment rośnie z rozstawu belek — dobór po samej
 * rozpiętości dawał przekroje niedowymiarowane przy szerszych rozstawach.
 *
 * Schemat: belka swobodnie podparta, M = qL²/8, σ = M/Wy ≤ f_y.
 * `stepUp` (wzmocnienie) podnosi wybór o N pozycji ponad wymaganą.
 *
 * `check` to zapis toku doboru do udokumentowania w ofercie — dopisany
 * addytywnie, więc `profile`/`requiredWyCm3`/`adequate` zostają bez zmian
 * dla dotychczasowych konsumentów.
 *
 * @returns {{ profile: object, requiredWyCm3: number, adequate: boolean, check: object }}
 */
export function pickProfileByBending(tables, role, { spanM, tributaryM, loadKnM2 }, stepUp = 0) {
  const table = tables[role];
  if (!table) throw new Error(`Brak tabeli profili dla roli "${role}"`);

  const lineLoadKnM = loadKnM2 * tributaryM;
  const momentKnM = (lineLoadKnM * spanM ** 2) / 8;
  const requiredWyCm3 = (momentKnM * 1e6) / STEEL_YIELD_MPA / 1000;

  const candidates = table.map((step) => PROFILES[step.profileId]);
  const firstAdequate = candidates.findIndex((profile) => (sectionModulusCm3(profile) ?? 0) >= requiredWyCm3);
  const baseIndex = firstAdequate === -1 ? candidates.length - 1 : firstAdequate;
  const index = Math.min(candidates.length - 1, baseIndex + stepUp);
  const profile = candidates[index];

  // Wskaźnik profilu PO uwzględnieniu stepUp. Gdyby brać go sprzed podniesienia,
  // poziom „Wzmocniona" byłby w dokumencie niewidoczny — wytężenie zostawałoby
  // przy 100%, choć realnie spada.
  const providedWyCm3 = sectionModulusCm3(profile) ?? 0;
  // Gdy nawet najmocniejszy profil z tablicy nie wystarcza, trzeba to zgłosić.
  const adequate = providedWyCm3 >= requiredWyCm3;

  return {
    profile,
    requiredWyCm3,
    adequate,
    check: {
      role,
      method: "bending",
      scheme: "simple_beam",
      spanM,
      tributaryM,
      loadKnM2,
      lineLoadKnM,
      momentKnM,
      requiredWyCm3,
      providedWyCm3,
      utilisation: providedWyCm3 > 0 ? requiredWyCm3 / providedWyCm3 : null,
      adequate,
      profileId: profile.id,
      profileLabel: profile.label,
      yieldMpa: STEEL_YIELD_MPA,
    },
  };
}

/**
 * Zapis doboru „wg rozpiętości z tablicy" — do udokumentowania w ofercie obok
 * rekordów ze zginania.
 *
 * Świadomie NIE liczy wytężenia: progi `maxSpanM` to praktyka producentów
 * (docs tabela 3.2), a nie wynik obliczeń, więc procent byłby zmyślony.
 * `adequate: null` (a nie `false`) jest tu nośne — `warnAboutSectionCapacity`
 * reaguje wyłącznie na `=== false`, więc rekord rozpiętościowy nie może udawać
 * przekroju niedowymiarowanego.
 *
 * @returns {object} rekord o tym samym kształcie co `check` z pickProfileByBending
 */
export function spanPickRecord(role, profile, { spanM, basis } = {}) {
  return {
    role,
    method: "span",
    scheme: null,
    spanM,
    tributaryM: null,
    loadKnM2: null,
    lineLoadKnM: null,
    momentKnM: null,
    requiredWyCm3: null,
    providedWyCm3: sectionModulusCm3(profile),
    utilisation: null,
    adequate: null,
    profileId: profile.id,
    profileLabel: profile.label,
    yieldMpa: STEEL_YIELD_MPA,
    basis: basis ?? "dobór wg rozpiętości z tablicy",
  };
}

/**
 * Dobór profilu dla roli i rozpiętości. `stepUp` podnosi wybór o N pozycji
 * w tablicy (wzmocnienie konstrukcji) — nigdy poza ostatnią pozycję.
 *
 * @returns {{ id, label, kind, hMm, bMm, tMm, kgPerM, sizeM }}
 */
export function pickProfile(tables, role, spanM, stepUp = 0) {
  const table = tables[role];
  if (!table) throw new Error(`Brak tabeli profili dla roli "${role}"`);

  const baseIndex = table.findIndex((step) => spanM <= step.maxSpanM);
  const index = Math.min(table.length - 1, (baseIndex === -1 ? table.length - 1 : baseIndex) + stepUp);
  const profile = PROFILES[table[index].profileId];
  if (!profile) throw new Error(`Nieznany profil "${table[index].profileId}" dla roli "${role}"`);
  return profile;
}

// Nazwy ról po polsku — do tabeli profili w UI i do zestawienia stali w PDF.
export const ROLE_LABELS = {
  cornerPost: "Słup narożny",
  post: "Słup pośredni",
  wallPost: "Słupek pośredni ściany",
  endPost: "Słupek ściany szczytowej",
  overOpeningPost: "Słupek nadprożowy",
  underOpeningPost: "Słupek podokienny",
  column: "Słup ramy portalowej",
  sillRail: "Podwalina",
  topRail: "Rygiel górny",
  rakedTopRail: "Rygiel górny skośny",
  midGirt: "Rygiel pośredni ściany",
  girt: "Rygiel ścienny",
  rafter: "Krokiew",
  ridge: "Belka kalenicowa",
  purlin: "Płatew",
  eaveStrut: "Płatew okapowa",
  ridgePurlin: "Płatew kalenicowa",
  collarTie: "Jętka",
  kneeBrace: "Zastrzał narożny",
  haunch: "Zastrzał podokapowy",
  xBrace: "Stężenie ścienne X",
  roofBrace: "Stężenie połaciowe",
  openingJamb: "Stojak ramy otworu",
  openingHeader: "Nadproże otworu",
  openingSill: "Rygiel podokienny",
  gateFrame: "Rama otworu bramowego",
  basePlate: "Blacha podstawy",
  projectionPost: "Słup wypustu frontowego",
  projectionHeader: "Rygiel portalu wypustu",
  projectionRafter: "Krokiew wypustu",
  projectionPurlin: "Płatew wypustu",
  projectionSillRail: "Podwalina skrzydła wypustu",
};

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}
