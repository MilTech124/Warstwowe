// Dobór rozstawów i przekrojów szkieletu.
//
// Rozstawy podpór poszycia wynikają z dopuszczalnej rozpiętości płyty warstwowej
// (docs/konstrukcja-garazy-plyta-warstwowa.md tabela 3.1), przekroje z rozpiętości
// elementu (tabela 3.2). Poziom wzmocnienia zagęszcza rozstawy i podnosi profile
// o stopień w tablicach doboru.

import {
  GARAGE_PROFILE_TABLES,
  HALL_PROFILE_TABLES,
  STEEL_GRADE_GARAGE,
  STEEL_GRADE_HALL,
  STEEL_YIELD_MPA,
  pickProfile,
  pickProfileByBending,
  spanPickRecord,
} from "@/config/steelProfiles";
import { isGableRoof } from "@/scene/roofMath";
import { axisSpan, frameAxes } from "@/scene/structure/axes";

// Kolejność = kolejność w UI, od najlżejszej do najmocniejszej.
export const REINFORCEMENT_LEVELS = {
  light: {
    id: "light",
    label: "Lekka",
    description: "Rozstawy przy górnej granicy praktyki — mniej słupów, płatwi i ram",
    // Rozstawy szersze niż tabelaryczne. Płyta warstwowa ma tu jeszcze zapas
    // (100 mm PIR przenosi kilkumetrowe rozpiętości), ale margines sztywności
    // szkieletu jest mniejszy — dlatego model dokłada ostrzeżenie ofertowe.
    spacingFactor: 1.25,
    profileStepUp: 0,
    braceAllPosts: false,
    xBraceGarage: false,
    collarTieMinRunM: 5.5,
    plateThicknessM: 0.008,
  },
  standard: {
    id: "standard",
    label: "Standard",
    description: "Rozstawy i przekroje wg praktyki producentów",
    spacingFactor: 1,
    profileStepUp: 0,
    braceAllPosts: false,
    xBraceGarage: false,
    collarTieMinRunM: 4.5,
    plateThicknessM: 0.008,
  },
  reinforced: {
    id: "reinforced",
    label: "Wzmocniona",
    description: "Zagęszczone rozstawy, profil o stopień większy, zastrzały i stężenia krzyżowe",
    spacingFactor: 0.85,
    profileStepUp: 1,
    braceAllPosts: true,
    // Stężenia X to praktyka halowa (docs §2), ale w świadomie wzmocnionym
    // garażu są uzasadnione — dlatego wchodzą na tym poziomie.
    xBraceGarage: true,
    collarTieMinRunM: 3.8,
    plateThicknessM: 0.008,
  },
};

export const SNOW_ZONES = [1, 2, 3, 4, 5];

// Charakterystyczne obciążenie śniegiem gruntu sk [kN/m²] wg stref PN-EN 1991-1-3
// z załącznikiem krajowym. Strefa 5 zależy od wysokości n.p.m. — bierzemy dolny próg.
//
// Eksportowane, bo dokument ofertowy pokazuje sk obok wyniku. Druga kopia tablicy
// w warstwie opisowej rozjechałaby się z tą przy pierwszej korekcie.
export const SNOW_ZONE_SK_KN_M2 = { 1: 0.7, 2: 0.9, 3: 1.2, 4: 1.6, 5: 2.0 };

// Ciężar własny poszycia dachowego z łącznikami [kN/m²].
export const ROOF_DEAD_LOAD_KN_M2 = 0.15;

// μ₁ — współczynnik kształtu dachu. 0,8 obowiązuje dla połaci do 30°; konfigurator
// dopuszcza spadek do 45% (24,2°), więc cały zakres mieści się w tej wartości.
export const SNOW_SHAPE_COEFFICIENT = 0.8;

// Częściowe współczynniki bezpieczeństwa kombinacji podstawowej (SGN).
export const LOAD_FACTOR_G = 1.35;
export const LOAD_FACTOR_Q = 1.5;

/** Charakterystyczne obciążenie śniegiem gruntu sk [kN/m²] dla strefy. */
export function snowGroundLoadKnM2(zone) {
  return SNOW_ZONE_SK_KN_M2[Math.min(5, Math.max(1, Number(zone) || 2))] ?? SNOW_ZONE_SK_KN_M2[2];
}

/**
 * Obliczeniowe obciążenie połaci [kN/m²] do sprawdzenia przekrojów.
 * s = μ₁·sk, kombinacja γ_G·G + γ_Q·s.
 */
export function roofDesignLoadKnM2(zone) {
  return (
    LOAD_FACTOR_G * ROOF_DEAD_LOAD_KN_M2 + LOAD_FACTOR_Q * SNOW_SHAPE_COEFFICIENT * snowGroundLoadKnM2(zone)
  );
}

/**
 * Wspólny blok założeń obliczeniowych dla obu klas konstrukcji. Trzyma w jednym
 * miejscu wszystko, co dokument ofertowy musi zacytować obok tabeli sprawdzeń.
 */
function staticsBlock({ snowZone, designLoadKnM2, steelGrade, checks }) {
  const skKnM2 = snowGroundLoadKnM2(snowZone);
  return {
    snowZone,
    skKnM2,
    shapeCoefficient: SNOW_SHAPE_COEFFICIENT,
    roofSnowKnM2: SNOW_SHAPE_COEFFICIENT * skKnM2,
    deadLoadKnM2: ROOF_DEAD_LOAD_KN_M2,
    gammaG: LOAD_FACTOR_G,
    gammaQ: LOAD_FACTOR_Q,
    designLoadKnM2,
    steelGrade,
    yieldMpa: STEEL_YIELD_MPA,
    checks,
  };
}

export function reinforcementLevel(id) {
  return REINFORCEMENT_LEVELS[id] ?? REINFORCEMENT_LEVELS.standard;
}

// Strefa śniegowa koryguje wyłącznie rozstaw płatwi. Przybliżenie ofertowe —
// docelowo wartości z tablic obciążeniowych producenta płyt (docs §8.2).
export function snowZoneFactor(zone) {
  const clamped = Math.min(5, Math.max(1, Number(zone) || 2));
  return Math.min(1.1, Math.max(0.75, 1 - (clamped - 2) * 0.07));
}

// Rozstaw podpór poszycia rośnie z grubością rdzenia PIR (40 mm → min, 120 mm → max).
//
// WARTOŚCI: patrz PANEL_SPAN_* poniżej. Płyta warstwowa jest samonośna na
// kilku metrach — to jej podstawowa zaleta — więc rozstaw podpór liczy się
// w metrach, nie w centymetrach.
export function panelSupportSpacingM(thicknessMm, minSpacingM, maxSpacingM) {
  const t = Math.min(1, Math.max(0, (thicknessMm - 40) / 80));
  return minSpacingM + t * (maxSpacingM - minSpacingM);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Praktyczna rozpiętość lekkiej płatwi garażowej (RHS 60×40 – 80×40) przy
// rozstawie ~1,2 m i obciążeniu śniegiem. Odpowiada progowi 3,5 m w tabeli 3.2.
const PURLIN_PRACTICAL_SPAN_M = 3.5;

// Rozstaw podpór poszycia: interpolacja po grubości rdzenia od 40 do 120 mm.
//
// Wartości wynikają z SAMONOŚNOŚCI PŁYTY, nie z linii mocowania. Producenci
// podają dla lekkich ścian z rdzeniem 80–120 mm rozpiętości „do ~5 m"
// (marpanel.pl), a tablice obciążeń liczą rozpiętości w metrach. Przyjmujemy
// wartości zachowawcze wobec katalogowych, bo:
//   * nie mamy tablic konkretnego wyrobu (wybór producenta jest w katalogu),
//   * o rozstaw walczy też sztywność samego szkieletu i linie mocowania płyt.
//
// Poprzednie 1,20–1,80 m (docs tabela 3.1) NIE opisywało nośności płyty —
// to rozstaw właściwy raczej dla blachy trapezowej. Stąd konstrukcje wychodziły
// ~3× za gęste.
const PANEL_SPAN_WALL_M = [2.0, 3.6];
const PANEL_SPAN_ROOF_M = [1.6, 3.0];

/**
 * Szkielet garażu z płyt warstwowych (klasa garage_frame).
 *
 * Kolejność doboru jest istotna: NAJPIERW krokwie (ich rozstaw wynika z nośności
 * płatwi, nie z rozpiętości płyty ściennej), POTEM słupy dogęszczane pod krokwiami
 * do rozpiętości płyty. Dzięki temu każda krokiew ma pod sobą słup, a nie powstaje
 * krata krokwi × płatwi, której nikt nie spawa.
 */
export function garageSpec(inputs) {
  const { widthM, lengthM, wallHeightM } = inputs.dimensions;
  const level = reinforcementLevel(inputs.structure.reinforcement);
  const stepUp = level.profileStepUp;
  const gable = isGableRoof(inputs.roof.type);

  const post = pickProfile(GARAGE_PROFILE_TABLES, "post", wallHeightM, stepUp);
  const cornerPost = pickProfile(GARAGE_PROFILE_TABLES, "cornerPost", wallHeightM, stepUp);
  const frameInset = 0.08 + post.sizeM;

  const { runAxis } = frameAxes(inputs);
  const runSpan = Math.max(1, axisSpan(runAxis, widthM, lengthM) - frameInset * 2);
  const longSpan = Math.max(1, axisSpan(runAxis === "x" ? "z" : "x", widthM, lengthM) - frameInset * 2);
  const rafterRunM = gable ? runSpan / 2 : runSpan;

  const basePostSpacing = panelSupportSpacingM(inputs.cladding.wallPirThicknessMm, ...PANEL_SPAN_WALL_M);
  const postSpacing = basePostSpacing * level.spacingFactor;
  const purlinSpacing =
    panelSupportSpacingM(inputs.cladding.roofPirThicknessMm, ...PANEL_SPAN_ROOF_M) *
    level.spacingFactor *
    snowZoneFactor(inputs.structure.snowZone);
  const roofLoadKnM2 = roofDesignLoadKnM2(inputs.structure.snowZone);

  // Ile krokwi POŚREDNICH naprawdę trzeba.
  //
  // Płatew biegnie w poprzek spadu i opiera się na skrajnych ryglach górnych skośnych
  // (na ścianach wzdłuż spadu) oraz na krokwiach pośrednich. Lekka płatew
  // przenosi ~3,5 m, więc dopóki budynek jest węższy, KROKWI POŚREDNICH NIE MA
  // — płatwie leżą wprost na ryglach górnych. Krokiew dochodzi dopiero wtedy, gdy
  // rozpiętość płatwi przekroczyłaby jej nośność.
  //
  // Wcześniej krokwie generowane były zawsze (rozstaw z krotności rozstawu
  // słupów), co dawało w garażu 3,5 m zbędną krokiew 100×60×3 przez całą długość.
  const purlinMaxSpanM = PURLIN_PRACTICAL_SPAN_M * level.spacingFactor;
  const interiorRafterCount = Math.max(0, Math.ceil(longSpan / purlinMaxSpanM) - 1);
  // Dwie pozycje skrajne to rygle górne skośne ścian, nie krokwie.
  const rafterCount = interiorRafterCount + 2;
  const rafterSpacing = longSpan / (rafterCount - 1);

  // Płatew: przekrój ze ZGINANIA. Rozpiętość to odstęp linii nośnych dachu,
  // a pas zbierany to rozstaw płatwi — dobór po samej rozpiętości dawał
  // przekroje niedowymiarowane (RHS 60×40×2 ma Wy 6,4 cm³ przy wymaganych 10,3).
  const purlinPick = pickProfileByBending(
    GARAGE_PROFILE_TABLES,
    "purlin",
    { spanM: rafterSpacing, tributaryM: purlinSpacing, loadKnM2: roofLoadKnM2 },
    stepUp,
  );
  const purlin = purlinPick.profile;

  // Krokiew pośrednia zbiera pas o szerokości równej rozstawowi krokwi.
  const rafterPick = pickProfileByBending(
    GARAGE_PROFILE_TABLES,
    "rafter",
    { spanM: rafterRunM, tributaryM: rafterSpacing, loadKnM2: roofLoadKnM2 },
    stepUp,
  );

  // Belka kalenicowa opiera się na krokwiach, więc jej rozpiętość to rozstaw krokwi.
  // Stopień wyżej, bo przenosi styk pary krokwi.
  const ridge = pickProfile(GARAGE_PROFILE_TABLES, "rafter", rafterSpacing, stepUp + 1);
  const midGirt = pickProfile(GARAGE_PROFILE_TABLES, "purlin", postSpacing, stepUp);
  const brace = pickProfile(GARAGE_PROFILE_TABLES, "brace", Math.max(runSpan, longSpan) * 0.25, stepUp);
  const endPost = pickProfile(GARAGE_PROFILE_TABLES, "endPost", wallHeightM, stepUp);
  const widestGate = inputs.openings.reduce(
    (widest, opening) => (opening.kind === "gate" ? Math.max(widest, opening.widthM) : widest),
    0,
  );
  const gateFrame = pickProfile(GARAGE_PROFILE_TABLES, "gateFrame", widestGate || 2.5, stepUp);
  const projectionHeader = pickProfile(GARAGE_PROFILE_TABLES, "gateFrame", widthM, stepUp);

  return {
    kind: "garage",
    structureClass: "garage_frame",
    steelGrade: STEEL_GRADE_GARAGE,
    reinforcement: level,
    snowZone: inputs.structure.snowZone,
    frameInset,
    runSpan,
    longSpan,
    postSpacing,
    purlinSpacing,
    rafterSpacing,
    rafterCount,
    interiorRafterCount,
    roofLoadKnM2,
    // Wymagane wskaźniki zginania — do udokumentowania doboru w ofercie.
    requiredWyCm3: { purlin: purlinPick.requiredWyCm3, rafter: rafterPick.requiredWyCm3 },
    sectionsAdequate: purlinPick.adequate && rafterPick.adequate,
    plateThicknessM: level.plateThicknessM,
    // Pełny tok doboru do udokumentowania w ofercie. Kolejność jak w tabeli:
    // najpierw elementy sprawdzone ze zginania, potem dobrane z rozpiętości.
    statics: staticsBlock({
      snowZone: inputs.structure.snowZone,
      designLoadKnM2: roofLoadKnM2,
      steelGrade: STEEL_GRADE_GARAGE,
      checks: [
        purlinPick.check,
        rafterPick.check,
        spanPickRecord("cornerPost", cornerPost, { spanM: wallHeightM }),
        spanPickRecord("post", post, { spanM: wallHeightM }),
        spanPickRecord("ridge", ridge, {
          spanM: rafterSpacing,
          basis: "dobór wg rozstawu krokwi, stopień wyżej — styk pary krokwi",
        }),
        spanPickRecord("gateFrame", gateFrame, {
          spanM: widestGate || 2.5,
          basis: "rama otworu bramowego — zawsze wzmocniona (docs 3.2)",
        }),
      ],
    }),
    profiles: {
      cornerPost,
      post,
      endPost,
      sillRail: post, // podwalina/rygiel górny „jak słup pośredni" — spójny system (docs 3.2)
      topRail: post,
      // Rygiel górny skośny ścian wzdłuż spadu: leży na słupach, więc profil jak rygiel górny,
      // a nie jak swobodnie rozpięta krokiew.
      rakedTopRail: post,
      midGirt,
      rafter: rafterPick.profile,
      ridge,
      purlin,
      collarTie: brace,
      kneeBrace: brace,
      xBrace: brace,
      overOpeningPost: post,
      gateFrame,
      projectionHeader,
      projectionPost: cornerPost,
      projectionRafter: rafterPick.profile,
      projectionPurlin: purlin,
    },
    flags: {
      hasMidGirt: wallHeightM >= 3.05,
      braceAllPosts: level.braceAllPosts,
      xBrace: level.xBraceGarage,
      collarTieMinRunM: level.collarTieMinRunM,
    },
  };
}

/**
 * Hala z ramami portalowymi (klasy portal_hall / heavy_hall).
 *
 * Poprawka względem wcześniejszej wersji: płyty ścienne układane poziomo wymagają
 * podpór PIONOWYCH, więc między słupami ram stoją słupki pośrednie w rozstawie
 * z rozpiętości płyty. Rygle poziome zostają jako usztywnienie i baza montażowa.
 */
export function hallSpec(inputs, structureClass) {
  const { widthM, lengthM, wallHeightM } = inputs.dimensions;
  const level = reinforcementLevel(inputs.structure.reinforcement);
  const stepUp = level.profileStepUp;
  const heavy = structureClass === "heavy_hall";
  const gable = isGableRoof(inputs.roof.type);

  const column = pickProfile(HALL_PROFILE_TABLES, "column", wallHeightM, stepUp);
  const frameInset = 0.16 + column.sizeM;

  const { runAxis } = frameAxes(inputs);
  const runSpan = Math.max(1, axisSpan(runAxis, widthM, lengthM) - frameInset * 2);
  const longSpan = Math.max(1, axisSpan(runAxis === "x" ? "z" : "x", widthM, lengthM) - frameInset * 2);
  const rafterRunM = gable ? runSpan / 2 : runSpan;
  const rafter = pickProfile(HALL_PROFILE_TABLES, "rafter", rafterRunM, stepUp);

  // Rozstaw ram ograniczony do 6 m — powyżej wychodzi poza praktykę hal
  // z płatwiami zimnogiętymi, niezależnie od wybranego poziomu.
  const baySpacing = Math.min(6, (heavy ? 5.5 : 4) * level.spacingFactor);
  const bayCount = Math.max(2, Math.ceil(longSpan / baySpacing) + 1);
  const actualBaySpacing = longSpan / (bayCount - 1);

  // Te same rozpiętości płyt co w garażu — poszycie jest identyczne.
  const wallPostSpacing = panelSupportSpacingM(inputs.cladding.wallPirThicknessMm, ...PANEL_SPAN_WALL_M) * level.spacingFactor;
  const purlinSpacing =
    panelSupportSpacingM(inputs.cladding.roofPirThicknessMm, ...PANEL_SPAN_ROOF_M) *
    level.spacingFactor *
    snowZoneFactor(inputs.structure.snowZone);
  const roofLoadKnM2 = roofDesignLoadKnM2(inputs.structure.snowZone);

  // Płatew hali: przekrój ze zginania, jak w garażu — rozpiętość to rozstaw ram,
  // pas zbierany to rozstaw płatwi.
  const purlinPick = pickProfileByBending(
    HALL_PROFILE_TABLES,
    "purlin",
    { spanM: actualBaySpacing, tributaryM: purlinSpacing, loadKnM2: roofLoadKnM2 },
    stepUp,
  );
  const purlin = purlinPick.profile;
  const girt = pickProfile(HALL_PROFILE_TABLES, "girt", actualBaySpacing, stepUp);
  const wallPost = pickProfile(HALL_PROFILE_TABLES, "wallPost", wallHeightM, stepUp);
  const endPost = pickProfile(HALL_PROFILE_TABLES, "endPost", wallHeightM, stepUp);
  const brace = pickProfile(HALL_PROFILE_TABLES, "brace", actualBaySpacing, stepUp);
  // Stężenia krzyżowe pracują parami na rozciąganie → ściągi prętowe.
  const tieRod = pickProfile(HALL_PROFILE_TABLES, "tieRod", actualBaySpacing, stepUp);
  // Płatew kalenicowa to PŁATEW, nie rygiel ramy — jeden stopień wyżej od zwykłej,
  // bo zbiera styk obu połaci. Wcześniej brała profil krokwi (IPE), co dawało
  // absurdalne ~5% masy hali na jednym elemencie.
  const ridgePurlin = pickProfile(HALL_PROFILE_TABLES, "purlin", actualBaySpacing, stepUp + 1);
  const widestGate = inputs.openings.reduce(
    (widest, opening) => (opening.kind === "gate" ? Math.max(widest, opening.widthM) : widest),
    0,
  );
  const gateFrame = pickProfile(HALL_PROFILE_TABLES, "gateFrame", widestGate || 3.5, stepUp);

  return {
    kind: "hall",
    structureClass,
    steelGrade: STEEL_GRADE_HALL,
    reinforcement: level,
    snowZone: inputs.structure.snowZone,
    frameInset,
    runSpan,
    longSpan,
    baySpacing: actualBaySpacing,
    bayCount,
    wallPostSpacing,
    purlinSpacing,
    // Rygle ścienne NIE są podporą poszycia — ciężar płyt poziomych przenoszą
    // słupki pośrednie (wallPostSpacing). Rygle usztywniają szkielet i dają bazę
    // montażową, więc realny rozstaw to ~1,8–2,0 m, nie ~1,05 m. Poprzednia
    // wartość podwajała funkcję słupków i dawała ~9% masy hali w samych ryglach.
    roofLoadKnM2,
    requiredWyCm3: { purlin: purlinPick.requiredWyCm3 },
    sectionsAdequate: purlinPick.adequate,
    girtSpacing: (heavy ? 2.0 : 1.8) * level.spacingFactor,
    haunchLength: heavy ? 1.15 : 0.85,
    plateThicknessM: Math.max(0.012, level.plateThicknessM * 1.5),
    // Uwaga: rygiel ramy portalowej idzie przez pickProfile, czyli WYŁĄCZNIE
    // wg rozpiętości — głównego elementu zginanego hali nie sprawdzamy momentem.
    // Tabela musi to powiedzieć wprost, zamiast pokazywać zmyślone wytężenie.
    statics: staticsBlock({
      snowZone: inputs.structure.snowZone,
      designLoadKnM2: roofLoadKnM2,
      steelGrade: STEEL_GRADE_HALL,
      checks: [
        purlinPick.check,
        spanPickRecord("column", column, { spanM: wallHeightM }),
        spanPickRecord("rafter", rafter, {
          spanM: rafterRunM,
          basis: "dobór wg rozpiętości połaci — bez sprawdzenia momentu",
        }),
        spanPickRecord("wallPost", wallPost, { spanM: wallHeightM }),
        spanPickRecord("girt", girt, { spanM: actualBaySpacing }),
      ],
    }),
    profiles: {
      column,
      rafter,
      ridge: ridgePurlin,
      purlin,
      eaveStrut: purlin,
      girt,
      wallPost,
      endPost,
      sillRail: girt,
      xBrace: tieRod,
      roofBrace: tieRod,
      kneeBrace: brace,
      // Zastrzał podokapowy pracuje na ściskanie — musi zostać profilem zamkniętym.
      haunch: brace,
      collarTie: brace,
      overOpeningPost: wallPost,
      gateFrame,
      midGirt: girt,
      topRail: girt,
    },
    flags: {
      hasMidGirt: true,
      braceAllPosts: false,
      xBrace: true,
      collarTieMinRunM: Infinity, // w halach rolę jętek pełnią zastrzały podokapowe
    },
  };
}
