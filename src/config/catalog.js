import {
  FLASHING_FINISH_OPTIONS,
  FRAME_FINISH_OPTIONS,
  GATE_FINISH_OPTIONS,
  GUTTER_FINISH_OPTIONS,
  ROOF_FINISH_OPTIONS,
  WALL_FINISH_OPTIONS,
  getFinishForRole,
} from "@/config/materialFinishes";

export const PRESETS = {
  large_hall: {
    label: "Duża hala",
    dimensions: { widthM: 12, lengthM: 24, wallHeightM: 5.5 },
    dimensionLimits: { widthM: [10, 18], lengthM: [18, 36], wallHeightM: [4, 7] },
  },
  hall: {
    label: "Hala",
    dimensions: { widthM: 9, lengthM: 15, wallHeightM: 4.5 },
    dimensionLimits: { widthM: [7, 12], lengthM: [10, 24], wallHeightM: [3.5, 6] },
  },
  double_garage: {
    label: "Garaż podwójny",
    dimensions: { widthM: 6, lengthM: 6, wallHeightM: 2.8 },
    dimensionLimits: { widthM: [5, 8], lengthM: [5, 9], wallHeightM: [2.4, 3.6] },
  },
  single_garage: {
    label: "Garaż pojedynczy",
    dimensions: { widthM: 3.5, lengthM: 6, wallHeightM: 2.7 },
    dimensionLimits: { widthM: [3, 5], lengthM: [5, 8], wallHeightM: [2.3, 3.4] },
  },
};

export const ROOF_TYPES = {
  single_back: "Spad tył",
  single_front: "Spad przód",
  single_right: "Spad w prawo",
  single_left: "Spad w lewo",
  gable_left_right: "Dwuspad",
  gable_front_back: "Odwrócony dwuspad",
};

export const WALL_PROFILES = {
  smooth: {
    label: "Gładka",
    url: "/wall_panels/WSP_wall_smooth_profile_1m.glb",
  },
  linear: {
    label: "Linear",
    url: "/wall_panels/WSP_wall_linear_profile_1m.glb",
  },
  macro_linear: {
    label: "Macro linear",
    url: "/wall_panels/WSP_wall_macro_linear_profile_1m.glb",
  },
  micro_linear: {
    label: "Micro linear",
    url: "/wall_panels/WSP_wall_micro_linear_profile_1m.glb",
  },
  micro_wave: {
    label: "Micro wave",
    url: "/wall_panels/WSP_wall_micro_wave_profile_1m.glb",
  },
};

// Płyty ścienne są produkowane pod wymiar. Moduł 1 m określa wysokość
// poziomego pasa, nie długość arkusza. Odcinek 12 m odpowiada praktycznemu
// podziałowi transportowo-montażowemu, a 16 m typowej granicy produkcyjnej.
export const WALL_PANEL_DIMENSIONS = Object.freeze({
  moduleWidthM: 1,
  preferredTransportLengthM: 12,
  maxProductionLengthM: 16,
});

export const WALL_PANEL_LENGTH_STANDARDS = Object.freeze([
  { value: 6, label: "6 m", description: "Krotki odcinek, latwy transport i montaz" },
  { value: 8, label: "8 m", description: "Standard dla garazy i mniejszych obiektow" },
  { value: 10, label: "10 m", description: "Ograniczona liczba laczen na srednich halach" },
  { value: 12, label: "12 m", description: "Zalecany podzial transportowo-montazowy" },
  { value: 16, label: "16 m", description: "Maksymalny wariant produkcyjny" },
]);

export function getWallPanelLengthM(selection) {
  const requestedLength = Number(selection.panelLengthM);
  return WALL_PANEL_LENGTH_STANDARDS.some((option) => option.value === requestedLength)
    ? requestedLength
    : WALL_PANEL_DIMENSIONS.preferredTransportLengthM;
}

// Parametry cieplne rdzenia. Producent może je nadpisać w katalogu (Mongo) —
// tutaj trzymamy wartości katalogowe PIR, żeby konfigurator zawsze miał czym
// opisać wybraną płytę, nawet gdy baza jest pusta.
const PIR_CORE_SPECS = {
  coreType: "PIR",
  lambdaWmK: 0.022,
};

const DEFAULT_WALL_PANEL_TYPES = {
  wall_panel: {
    label: "Plyta scienna",
    models: {
      linear: {
        label: "Linear",
        defaultProfile: "linear",
        profiles: ["linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: WALL_FINISH_OPTIONS,
        specs: PIR_CORE_SPECS,
      },
      smooth: {
        label: "Gladka",
        defaultProfile: "smooth",
        profiles: ["smooth"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: WALL_FINISH_OPTIONS,
        specs: PIR_CORE_SPECS,
      },
      macro_linear: {
        label: "Macro linear",
        defaultProfile: "macro_linear",
        profiles: ["macro_linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: WALL_FINISH_OPTIONS,
        specs: PIR_CORE_SPECS,
      },
      micro_linear: {
        label: "Micro linear",
        defaultProfile: "micro_linear",
        profiles: ["micro_linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: WALL_FINISH_OPTIONS,
        specs: PIR_CORE_SPECS,
      },
      micro_wave: {
        label: "Micro wave",
        defaultProfile: "micro_wave",
        profiles: ["micro_wave"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: WALL_FINISH_OPTIONS,
        specs: PIR_CORE_SPECS,
      },
    },
  },
};

export const CLADDING_CATALOG = {
  default_panels: {
    label: "Plyty domyslne",
    tagline: "Bazowy system plyt PIR",
    types: DEFAULT_WALL_PANEL_TYPES,
  },
  steelprofil: {
    label: "SteelProfil",
    tagline: "Plyty warstwowe z rdzeniem PIR",
    types: DEFAULT_WALL_PANEL_TYPES,
  },
};

export const DEFAULT_CLADDING_SELECTION = {
  manufacturer: "default_panels",
  type: "wall_panel",
  model: "linear",
  profile: "linear",
  thicknessMm: 60,
  panelLengthM: WALL_PANEL_DIMENSIONS.preferredTransportLengthM,
  color: "anthracite",
};

const ROOF_PANEL_MODELS = {
  pir_roof: {
    label: "PIR Dachowa",
    thicknessMm: [60, 80, 100, 120],
    colors: ROOF_FINISH_OPTIONS,
    specs: PIR_CORE_SPECS,
  },
};

export const ROOF_CLADDING_CATALOG = {
  default_roof_panels: {
    label: "Plyty domyslne",
    tagline: "Bazowa plyta dachowa PIR",
    models: ROOF_PANEL_MODELS,
  },
  steelprofil: {
    label: "SteelProfil",
    tagline: "Plyty dachowe z rdzeniem PIR",
    models: ROOF_PANEL_MODELS,
  },
};

export const DEFAULT_ROOF_CLADDING_SELECTION = {
  roofManufacturer: "default_roof_panels",
  roofModel: "pir_roof",
  roofThicknessMm: 80,
  roofColor: "graphite",
};

export const FLASHING_COLORS = {
  roof_match: { label: "Jak dach", hex: null },
  ...FLASHING_FINISH_OPTIONS,
};

export const FLASHING_PACKAGES = {
  standard: {
    label: "System standard",
    description: "Naroznik od 150 mm na strone, z zakladka i linia giecia",
  },
  premium: {
    label: "System premium",
    description: "Szersze maskowanie laczen i mocniejsza linia krawedzi",
  },
};

// ----------------------------------------------------------------------------
// System orynnowania (rynny, rury spustowe, kotwienie)
// ----------------------------------------------------------------------------

// Kolor "roof_match" jest rozwiazywany w czasie renderu do koloru plyty dachowej.
// Pozostale kolory sa samodzielne (nie dziedzicza po obrobkach blacharskich),
// poniewaz rynny czesto wystepuja w innych wykladzinach (cynk, miedz).
export const GUTTER_COLORS = {
  roof_match: { label: "Jak dach", hex: null },
  zinc: { ...GUTTER_FINISH_OPTIONS.galvanized, id: "zinc", label: "Cynk" },
  copper: { label: "Miedź", hex: "#9c6234", kind: "metal", group: "metallic", surfaceFamily: "metallic", roughness: 0.34, metalness: 0.68 },
  ...GUTTER_FINISH_OPTIONS,
};

export const GUTTER_PROFILES = {
  // Polokragly - klasyczna rynna z walcowanej blachy, przekroj polkola.
  half_round: {
    label: "Polokragla",
    description: "Klasyczny przekroj polkolisty, wysoka wydajnosc",
  },
  // Kasetonowa - rynna trapezowa, modulowa, popularna w halach.
  box: {
    label: "Kasetonowa",
    description: "Prostokatny profil modulowy do hal i duzych dachow",
  },
};

// Szerokosc nominalna rynny [mm]. Realistyczne wartosci stosowane w systemach
// garazowych i halowych: 125 dla garazy, 150 dla wiekszych dachow.
export const GUTTER_SIZES = [
  { value: 125, label: "125 mm", description: "Garaze i male budynki" },
  { value: 150, label: "150 mm", description: "Standard dla wiekszych garazy" },
  { value: 200, label: "200 mm", description: "Hale i duze polacie dachowe" },
];

// Srednica nominalna rury spustowej [mm]. Dobierana proporcjonalnie do rynny.
export const GUTTER_DOWNSPOUT_SIZES = [
  { value: 80, label: "Ø 80 mm", description: "Rura okragla, garaze" },
  { value: 100, label: "Ø 100 mm", description: "Standard dla wiekszych obiektow" },
  { value: 120, label: "Ø 120 mm", description: "Hale i duze rzedy rynien" },
];

export const GUTTER_PACKAGES = {
  standard: {
    label: "Orynnowanie standard",
    description: "Rynna + rura spustowa + hak co 0,6 m i opaski co 1,5 m",
  },
  premium: {
    label: "Orynnowanie premium",
    description: "Dodatkowo koszki lisciaste, zageszczone haki i kolano odchodzace",
  },
};

export function getCladdingManufacturer(selection) {
  return CLADDING_CATALOG[selection.manufacturer] || CLADDING_CATALOG[DEFAULT_CLADDING_SELECTION.manufacturer];
}

export function getCladdingType(selection) {
  const manufacturer = getCladdingManufacturer(selection);
  return manufacturer.types[selection.type] || manufacturer.types[DEFAULT_CLADDING_SELECTION.type];
}

export function getCladdingModel(selection) {
  const type = getCladdingType(selection);
  return type.models[selection.model] || type.models[DEFAULT_CLADDING_SELECTION.model];
}

export function getCladdingProfile(selection) {
  const model = getCladdingModel(selection);
  const profileKey = model.profiles.includes(selection.profile) ? selection.profile : model.defaultProfile;
  return WALL_PROFILES[profileKey] || WALL_PROFILES[DEFAULT_CLADDING_SELECTION.profile];
}

export function getCladdingColor(selection) {
  const model = getCladdingModel(selection);
  return model.colors[selection.color]
    || getFinishForRole(selection.color, "wall", DEFAULT_CLADDING_SELECTION.color);
}

export function getRoofCladdingManufacturer(selection) {
  return ROOF_CLADDING_CATALOG[selection.roofManufacturer] || ROOF_CLADDING_CATALOG[DEFAULT_ROOF_CLADDING_SELECTION.roofManufacturer];
}

export function getRoofCladdingModel(selection) {
  const manufacturer = getRoofCladdingManufacturer(selection);
  return manufacturer.models[selection.roofModel] || manufacturer.models[DEFAULT_ROOF_CLADDING_SELECTION.roofModel];
}

export function getRoofCladdingColor(selection) {
  const model = getRoofCladdingModel(selection);
  return model.colors[selection.roofColor]
    || getFinishForRole(selection.roofColor, "roof", DEFAULT_ROOF_CLADDING_SELECTION.roofColor);
}

export const WALL_THICKNESS = [40, 50, 60, 80, 100, 120];
export const ROOF_THICKNESS = [40, 60, 80, 100, 120];

export const CAMERA_MODES = {
  orbit: "Orbit",
  front: "Front",
  side: "Bok",
  top: "Góra",
  interior: "Wnętrze",
  structure: "Konstrukcja",
};

export const OPENING_WALLS = {
  front: "Przód",
  back: "Tył",
  left: "Lewa",
  right: "Prawa",
};

// ----------------------------------------------------------------------------
// Bramy garażowe WIŚNIOWSKI (producent -> typ -> model -> ustawienia)
// ----------------------------------------------------------------------------

export const GATE_TYPES = {
  sectional: "Brama segmentowa",
  roller: "Brama roletowa",
  tilting: "Brama uchylna",
};

export const GATE_PATTERNS = {
  smooth: { label: "Bez przetłoczeń", description: "Gładkie, płaskie panele" },
  high: { label: "Przetłoczenia wysokie", description: "Poziome linie w większym rozstawie" },
  low: { label: "Przetłoczenia niskie", description: "Gęste, drobne poziome linie" },
  cassette: { label: "Przetłoczenia kasetonowe", description: "Siatka ozdobnych kasetonów" },
  v: { label: "V-przetłoczenia", description: "Gęste, wąskie rowki o przekroju V" },
};

export const GATE_STRUCTURES = {
  woodgrain: { label: "Woodgrain", description: "Struktura drewnopodobna" },
  smoothgrain: { label: "Smoothgrain", description: "Gładka powierzchnia okleinowana" },
  sandgrain: { label: "Sandgrain", description: "Drobnoziarnista, matowa faktura" },
  silkline: { label: "Silkline", description: "Gładka, satynowa powierzchnia malowana" },
};

export const TILTING_LAYOUTS = {
  vertical_high_v: {
    label: "Wypełnienie pionowe wysokie V",
    description: "Szerokie pionowe pola V",
    orientation: "vertical",
    pitchM: 0.5,
    fitMode: "nearest",
    profileKind: "wide",
    depthM: 0.006,
  },
  horizontal_high_h: {
    label: "Wypełnienie poziome wysokie H",
    description: "Szerokie poziome pola H",
    orientation: "horizontal",
    pitchM: 0.5,
    fitMode: "nearest",
    profileKind: "wide",
    depthM: 0.006,
  },
  vertical_low: {
    label: "Wypełnienie pionowe niskie",
    description: "Pionowa blacha T-10, 10 przetłoczeń na metr",
    orientation: "vertical",
    pitchM: 0.1,
    fitMode: "nearest",
    profileKind: "t10",
    depthM: 0.01,
  },
  horizontal_low: {
    label: "Wypełnienie poziome niskie",
    description: "Pozioma blacha T-10, 10 przetłoczeń na metr",
    orientation: "horizontal",
    pitchM: 0.1,
    fitMode: "nearest",
    profileKind: "t10",
    depthM: 0.01,
  },
  horizontal_high: {
    label: "Wypełnienie poziome wysokie",
    description: "Szerokie poziome pola z płytkim rowkiem",
    orientation: "horizontal",
    pitchM: 0.4,
    fitMode: "nearest",
    profileKind: "wide",
    depthM: 0.006,
  },
  vertical_high: {
    label: "Wypełnienie pionowe wysokie",
    description: "Szerokie pionowe pola z płytkim rowkiem",
    orientation: "vertical",
    pitchM: 1 / 6,
    fitMode: "nearest",
    profileKind: "wide",
    depthM: 0.006,
  },
};

export const GATE_COLORS = GATE_FINISH_OPTIONS;

const GATE_METAL_IDS = Object.keys(GATE_COLORS).filter((key) => GATE_COLORS[key].kind === "metal");
const GATE_WOOD_IDS = Object.keys(GATE_COLORS).filter((key) => GATE_COLORS[key].kind === "wood");

const UNIPRO_STRUCTURE_COLORS = {
  woodgrain: ["brown", "white", "anthracite", ...GATE_WOOD_IDS],
  smoothgrain: [...GATE_METAL_IDS, ...GATE_WOOD_IDS],
  sandgrain: GATE_METAL_IDS,
  silkline: GATE_METAL_IDS,
};

const INNOVO_STRUCTURE_COLORS = {
  smoothgrain: [...GATE_METAL_IDS, ...GATE_WOOD_IDS],
  sandgrain: GATE_METAL_IDS,
  silkline: GATE_METAL_IDS,
};

const SECTIONAL_MODELS = {
  unipro: {
    label: "UniPro",
    note: "Panel 40 mm, pięć wzorów przetłoczeń",
    panelHeightM: 0.55,
    panelThicknessM: 0.04,
    patterns: ["smooth", "high", "low", "cassette", "v"],
    structures: ["woodgrain", "smoothgrain", "sandgrain", "silkline"],
    structureColors: UNIPRO_STRUCTURE_COLORS,
    defaultPattern: "high",
    defaultStructure: "sandgrain",
    colors: GATE_COLORS,
  },
  unitherm: {
    label: "UniTherm",
    note: "Panel INNOVO 60 mm, premium",
    panelHeightM: 0.55,
    panelThicknessM: 0.06,
    patterns: ["smooth", "high"],
    structures: ["smoothgrain", "sandgrain", "silkline"],
    structureColors: INNOVO_STRUCTURE_COLORS,
    defaultPattern: "high",
    defaultStructure: "sandgrain",
    colors: GATE_COLORS,
  },
  prime: {
    label: "PRIME",
    note: "Linia premium",
    panelHeightM: 0.61,
    panelThicknessM: 0.06,
    patterns: ["smooth", "high"],
    structures: ["smoothgrain", "sandgrain", "silkline"],
    structureColors: INNOVO_STRUCTURE_COLORS,
    defaultPattern: "smooth",
    defaultStructure: "silkline",
    colors: GATE_COLORS,
  },
};

const ROLLER_MODELS = {
  br77: {
    label: "BR-77",
    note: "Profil AW77 ≈ 77 mm",
    slatHeightMm: 77,
    colors: GATE_COLORS,
  },
  br100: {
    label: "BR-100",
    note: "Profil AW100 ≈ 100 mm",
    slatHeightMm: 100,
    colors: GATE_COLORS,
  },
};

const TILTING_MODELS = {
  vertical_high_v: {
    label: "Wypełnienie pionowe wysokie V",
    note: "Szerokie pionowe pola V",
    layouts: ["vertical_high_v"],
    defaultLayout: "vertical_high_v",
    colors: GATE_COLORS,
  },
  horizontal_high_h: {
    label: "Wypełnienie poziome wysokie H",
    note: "Szerokie poziome pola H",
    layouts: ["horizontal_high_h"],
    defaultLayout: "horizontal_high_h",
    colors: GATE_COLORS,
  },
  vertical_low: {
    label: "Wypełnienie pionowe niskie",
    note: "Gęsty pionowy profil T-10",
    layouts: ["vertical_low"],
    defaultLayout: "vertical_low",
    colors: GATE_COLORS,
  },
  horizontal_low: {
    label: "Wypełnienie poziome niskie",
    note: "Gęsty poziomy profil T-10",
    layouts: ["horizontal_low"],
    defaultLayout: "horizontal_low",
    colors: GATE_COLORS,
  },
  horizontal_high: {
    label: "Wypełnienie poziome wysokie",
    note: "Poziomy profil o większym rozstawie",
    layouts: ["horizontal_high"],
    defaultLayout: "horizontal_high",
    colors: GATE_COLORS,
  },
  vertical_high: {
    label: "Wypełnienie pionowe wysokie",
    note: "Pionowy profil o większym rozstawie",
    layouts: ["vertical_high"],
    defaultLayout: "vertical_high",
    colors: GATE_COLORS,
  },
};

export const GATE_MANUFACTURERS = {
  wisniowski: {
    label: "WIŚNIOWSKI",
    tagline: "Bramy segmentowe, roletowe i uchylne",
    types: {
      sectional: { label: GATE_TYPES.sectional, models: SECTIONAL_MODELS },
      roller: { label: GATE_TYPES.roller, models: ROLLER_MODELS },
      tilting: { label: GATE_TYPES.tilting, models: TILTING_MODELS },
    },
  },
};

export const DEFAULT_GATE_SELECTION = {
  manufacturer: "wisniowski",
  gateType: "sectional",
  model: "unipro",
  pattern: "low",
  structure: "sandgrain",
  layout: "vertical_low",
  color: "anthracite",
  open: false,
};

export function getGateManufacturer(selection) {
  return GATE_MANUFACTURERS[selection.manufacturer] || GATE_MANUFACTURERS[DEFAULT_GATE_SELECTION.manufacturer];
}

export function getGateType(selection) {
  const manufacturer = getGateManufacturer(selection);
  return manufacturer.types[selection.gateType] || manufacturer.types[DEFAULT_GATE_SELECTION.gateType];
}

export function getGateModel(selection) {
  const type = getGateType(selection);
  return type.models[selection.model] || Object.values(type.models)[0];
}

export function getGateAvailableColors(selection) {
  const model = getGateModel(selection);
  const allowedKeys = model.structureColors?.[selection.structure];
  if (!allowedKeys?.length) return model.colors;

  return Object.fromEntries(
    allowedKeys
      .filter((key) => model.colors[key])
      .map((key) => [key, model.colors[key]]),
  );
}

export function getGateColor(selection) {
  const colors = getGateAvailableColors(selection);
  return colors[selection.color] || Object.values(colors)[0] || GATE_COLORS[DEFAULT_GATE_SELECTION.color];
}

// ----------------------------------------------------------------------------
// Drzwi techniczne i okna
// ----------------------------------------------------------------------------

export const OPENING_FRAME_COLORS = FRAME_FINISH_OPTIONS;

export const DOOR_MODELS = {
  cladding_match: {
    label: "Jak poszycie",
    note: "Jednoskrzydłowe drzwi z kolorem i profilem płyty ściennej",
    leafCount: 1,
    glazing: 0,
    panelLayout: "cladding",
    embossment: "cladding_profile",
    matchCladding: true,
    handleStyle: "compact_shield",
    lockStyle: "euro_cylinder",
    hingeStyle: "concealed",
    sealStyle: "perimeter",
    widthRange: [0.8, 1.15],
    heightRange: [1.9, 2.35],
    colors: OPENING_FRAME_COLORS,
  },
  sectional_single: {
    label: "Segmentowe",
    note: "Jednoskrzydłowe drzwi podzielone na poziome segmenty",
    leafCount: 1,
    glazing: 0,
    panelLayout: "sectional",
    embossment: "sectional_panels",
    segmentHeightM: 0.42,
    embossmentDepthM: 0.014,
    handleStyle: "long_shield",
    lockStyle: "euro_cylinder",
    hingeStyle: "concealed",
    sealStyle: "perimeter",
    widthRange: [0.85, 1.2],
    heightRange: [1.95, 2.4],
    colors: OPENING_FRAME_COLORS,
  },
  thermo_solid: {
    label: "Gładkie ocieplane",
    note: "Popularne pełne drzwi stalowe z delikatną ramką skrzydła",
    leafCount: 1,
    glazing: 0,
    panelLayout: "smooth",
    embossment: "smooth_sheet",
    handleStyle: "long_shield",
    lockStyle: "euro_cylinder",
    hingeStyle: "concealed",
    sealStyle: "perimeter",
    widthRange: [0.8, 1.2],
    heightRange: [1.9, 2.4],
    colors: OPENING_FRAME_COLORS,
  },
  thermo_vision: {
    label: "Ocieplane z oknem",
    note: "Jednoskrzydłowe drzwi techniczne z górnym przeszkleniem",
    leafCount: 1,
    glazing: 0.28,
    panelLayout: "smooth",
    embossment: "vision_frame",
    embossmentCount: 1,
    embossmentDepthM: 0.01,
    handleStyle: "long_shield",
    lockStyle: "euro_cylinder",
    hingeStyle: "concealed",
    sealStyle: "perimeter",
    widthRange: [0.85, 1.25],
    heightRange: [2, 2.4],
    colors: OPENING_FRAME_COLORS,
  },
  utility_ribbed: {
    label: "Techniczne T-10",
    note: "Wytrzymałe drzwi profilowane do obiektów gospodarczych",
    leafCount: 1,
    glazing: 0,
    panelLayout: "vertical",
    embossment: "trapezoid_t10",
    ribPitchM: 0.1,
    ribDepthM: 0.018,
    handleStyle: "compact_shield",
    lockStyle: "euro_cylinder",
    hingeStyle: "concealed",
    sealStyle: "perimeter",
    widthRange: [0.8, 1.3],
    heightRange: [1.9, 2.4],
    colors: OPENING_FRAME_COLORS,
  },
};

export const DEFAULT_DOOR_SELECTION = {
  model: "cladding_match",
  color: "anthracite",
  hinge: "left",
  open: false,
};

export function getDoorModel(selection) {
  return DOOR_MODELS[selection.model] || DOOR_MODELS[DEFAULT_DOOR_SELECTION.model];
}

export function getDoorColor(selection) {
  const model = getDoorModel(selection);
  return model.colors[selection.color] || model.colors[DEFAULT_DOOR_SELECTION.color];
}

export const WINDOW_GLASS_TYPES = {
  clear: { label: "Przezroczyste", tint: "#D7EEF4", roughness: 0.06, transmission: 0.9 },
  neutral: { label: "Neutralne", tint: "#B9D1D8", roughness: 0.1, transmission: 0.78 },
  satin: { label: "Matowe", tint: "#E4ECEE", roughness: 0.42, transmission: 0.48 },
  smoke: { label: "Przyciemniane", tint: "#71858B", roughness: 0.12, transmission: 0.54 },
};

export const WINDOW_MODELS = {
  fixed: {
    label: "FIX 150x50",
    note: "Stałe okno gospodarcze do doświetlenia garażu",
    placement: "wall",
    panes: 1,
    operation: "fixed",
    orientationModes: ["horizontal", "vertical"],
    frameProfile: "thermo_70",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: true,
    openModes: ["closed"],
    defaultSizeM: [1.5, 0.5],
    widthRange: [1.2, 1.8],
    heightRange: [0.4, 0.7],
  },
  fixed_double: {
    label: "FIX 200x50",
    note: "Stałe dwupolowe przeszklenie do większego garażu",
    placement: "wall",
    panes: 2,
    operation: "fixed",
    orientationModes: ["horizontal", "vertical"],
    frameProfile: "thermo_70",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: true,
    openModes: ["closed"],
    defaultSizeM: [2, 0.5],
    widthRange: [1.6, 2.3],
    heightRange: [0.4, 0.7],
  },
  fixed_strip: {
    label: "FIX 220x60",
    note: "Szerokie stałe okno gospodarcze do garażu lub warsztatu",
    placement: "wall",
    panes: 1,
    operation: "fixed",
    orientationModes: ["horizontal", "vertical"],
    frameProfile: "industrial_60",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: true,
    openModes: ["closed"],
    defaultSizeM: [2.2, 0.6],
    widthRange: [1.8, 2.6],
    heightRange: [0.45, 0.8],
  },
  tilt_turn: {
    label: "Uchylne 80x60",
    note: "Najczęstsze małe okno garażowe z funkcją wentylacji",
    placement: "wall",
    panes: 1,
    operation: "tilt_turn",
    frameProfile: "thermo_76",
    glazingLayers: 2,
    glazingBead: "softline",
    handleStyle: "standard",
    hingeCovers: true,
    drainage: true,
    openModes: ["closed", "tilt", "turn"],
    defaultSizeM: [0.8, 0.6],
    widthRange: [0.6, 1],
    heightRange: [0.45, 0.8],
  },
  double_tilt_turn: {
    label: "Rozw.-uch. 100x60",
    note: "Standardowe okno do garażu użytkowego lub warsztatu",
    placement: "wall",
    panes: 1,
    operation: "tilt_turn",
    frameProfile: "thermo_76",
    glazingLayers: 2,
    glazingBead: "softline",
    handleStyle: "standard",
    hingeCovers: true,
    drainage: true,
    openModes: ["closed", "turn", "tilt"],
    defaultSizeM: [1, 0.6],
    widthRange: [0.8, 1.2],
    heightRange: [0.5, 0.8],
  },
  industrial_band: {
    label: "Pas hali 300x80",
    note: "Trójpolowe stałe pasmo okienne do hali lub magazynu",
    placement: "wall",
    panes: 3,
    operation: "fixed",
    frameProfile: "industrial_60",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: true,
    openModes: ["closed"],
    defaultSizeM: [3, 0.8],
    widthRange: [2.2, 3.6],
    heightRange: [0.6, 1],
  },
  roof_skylight: {
    label: "Swietlik dachowy 100x200",
    note: "Stale doswietlenie polaci dachowej, typowe dla hal i magazynow",
    placement: "roof",
    panes: 1,
    operation: "fixed",
    frameProfile: "industrial_60",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: false,
    openModes: ["closed"],
    defaultSizeM: [1, 2],
    widthRange: [0.6, 1.4],
    heightRange: [1.2, 3],
  },
  roof_band: {
    label: "Pas dachowy 300x100",
    note: "Dluzszy swietlik pasmowy do wiekszej hali",
    placement: "roof",
    panes: 3,
    operation: "fixed",
    frameProfile: "industrial_60",
    glazingLayers: 2,
    glazingBead: "square",
    handleStyle: null,
    hingeCovers: false,
    drainage: false,
    openModes: ["closed"],
    defaultSizeM: [3, 1],
    widthRange: [1.8, 4],
    heightRange: [0.7, 1.4],
  },
};

export const DEFAULT_WINDOW_SELECTION = {
  model: "tilt_turn",
  frameColor: "anthracite",
  glassType: "clear",
  hinge: "left",
  orientation: "horizontal",
  openMode: "closed",
  open: false,
};

function presetCladding(patch = {}) {
  const selection = {
    ...DEFAULT_CLADDING_SELECTION,
    ...DEFAULT_ROOF_CLADDING_SELECTION,
    ...patch,
  };

  return {
    ...selection,
    wallProfile: selection.profile,
    wallPirThicknessMm: selection.thicknessMm,
    roofPirThicknessMm: selection.roofThicknessMm,
  };
}

function presetRoof(type, pitchPercent, overhangM = {}) {
  return {
    type,
    pitchPercent,
    overhangM: {
      front: 0.2,
      back: 0.2,
      left: 0.2,
      right: 0.2,
      ...overhangM,
    },
  };
}

export const PRESET_DEFAULTS = Object.freeze({
  single_garage: {
    roof: presetRoof("single_back", 8, { front: 0.25, back: 0.25, left: 0.25, right: 0.25 }),
    cladding: presetCladding({
      model: "micro_linear",
      profile: "micro_linear",
      thicknessMm: 60,
      panelLengthM: 8,
      color: "silver",
      roofThicknessMm: 80,
      roofColor: "anthracite",
    }),
    flashings: { enabled: true, package: "premium", color: "anthracite", corners: true, roofEdges: true, ridge: true },
    gutters: { enabled: true, color: "anthracite", profile: "half_round", size: 125, downspoutSize: 80, downspouts: true, leafGuards: false, package: "standard" },
  },
  double_garage: {
    roof: presetRoof("single_back", 8, { front: 0.3, back: 0.3, left: 0.25, right: 0.25 }),
    cladding: presetCladding({
      model: "smooth",
      profile: "smooth",
      thicknessMm: 60,
      panelLengthM: 8,
      color: "silver",
      roofThicknessMm: 80,
      roofColor: "anthracite",
    }),
    flashings: { enabled: true, package: "premium", color: "anthracite", corners: true, roofEdges: true, ridge: true },
    gutters: { enabled: true, color: "anthracite", profile: "half_round", size: 150, downspoutSize: 100, downspouts: true, leafGuards: false, package: "standard" },
  },
  hall: {
    roof: presetRoof("gable_left_right", 22, { front: 0.3, back: 0.3, left: 0.35, right: 0.35 }),
    cladding: presetCladding({
      model: "micro_linear",
      profile: "micro_linear",
      thicknessMm: 80,
      panelLengthM: 12,
      color: "silver",
      roofThicknessMm: 100,
      roofColor: "graphite",
    }),
    flashings: { enabled: true, package: "premium", color: "graphite", corners: true, roofEdges: true, ridge: true },
    gutters: { enabled: true, color: "graphite", profile: "box", size: 150, downspoutSize: 100, downspouts: true, leafGuards: true, package: "premium" },
  },
  large_hall: {
    roof: presetRoof("gable_left_right", 18, { front: 0.35, back: 0.35, left: 0.45, right: 0.45 }),
    cladding: presetCladding({
      model: "smooth",
      profile: "smooth",
      thicknessMm: 100,
      panelLengthM: 16,
      color: "white",
      roofThicknessMm: 120,
      roofColor: "silver",
    }),
    flashings: { enabled: true, package: "premium", color: "silver", corners: true, roofEdges: true, ridge: true },
    gutters: { enabled: true, color: "zinc", profile: "box", size: 200, downspoutSize: 120, downspouts: true, leafGuards: true, package: "premium" },
  },
});

export function getPresetDefaults(preset) {
  const defaults = PRESET_DEFAULTS[preset] || PRESET_DEFAULTS.single_garage;
  return {
    roof: {
      ...defaults.roof,
      overhangM: { ...defaults.roof.overhangM },
    },
    cladding: { ...defaults.cladding },
    flashings: { ...defaults.flashings },
    gutters: { ...defaults.gutters },
  };
}

function presetGate(id, patch) {
  return {
    id,
    kind: "gate",
    wall: "front",
    offsetM: 0,
    widthM: 2.5,
    heightM: 2.25,
    sillM: 0,
    ...DEFAULT_GATE_SELECTION,
    ...patch,
  };
}

function presetDoor(id, patch) {
  return {
    id,
    kind: "door",
    wall: "right",
    offsetM: 0,
    widthM: 0.95,
    heightM: 2.1,
    sillM: 0,
    ...DEFAULT_DOOR_SELECTION,
    ...patch,
  };
}

function presetWindow(id, patch) {
  return {
    id,
    kind: "window",
    wall: "left",
    offsetM: 0,
    widthM: 0.8,
    heightM: 0.6,
    sillM: 1.15,
    ...DEFAULT_WINDOW_SELECTION,
    ...patch,
  };
}

function presetRoofWindow(id, patch) {
  return {
    id,
    kind: "roofWindow",
    wall: "roof",
    offsetM: 0,
    widthM: 1,
    heightM: 2,
    sillM: 0,
    ...DEFAULT_WINDOW_SELECTION,
    model: "roof_skylight",
    ...patch,
  };
}

export const PRESET_OPENINGS = Object.freeze({
  single_garage: [
    presetGate("single-main-gate", {
      widthM: 2.5,
      heightM: 2.25,
      gateType: "sectional",
      model: "prime",
      pattern: "smooth",
      structure: "silkline",
    }),
    presetDoor("single-service-door", {
      wall: "right",
      offsetM: 1.55,
      widthM: 0.95,
      heightM: 2.1,
      model: "sectional_single",
    }),
    presetWindow("single-side-window", {
      wall: "left",
      offsetM: -1,
      widthM: 1.5,
      heightM: 0.5,
      sillM: 1.35,
      model: "fixed",
      glassType: "neutral",
    }),
  ],
  double_garage: [
    presetGate("double-wide-gate", {
      offsetM: 0,
      widthM: 5,
      heightM: 2.35,
      gateType: "sectional",
      model: "prime",
      pattern: "smooth",
      structure: "silkline",
    }),
    presetDoor("double-service-door", {
      wall: "right",
      offsetM: 1.75,
      widthM: 0.95,
      heightM: 2.1,
      model: "sectional_single",
    }),
    presetWindow("double-back-window-left", {
      wall: "back",
      offsetM: -1.2,
      widthM: 1.5,
      heightM: 0.5,
      sillM: 1.4,
      model: "fixed",
      glassType: "neutral",
    }),
    presetWindow("double-back-window-right", {
      wall: "back",
      offsetM: 1.2,
      widthM: 1.5,
      heightM: 0.5,
      sillM: 1.4,
      model: "fixed",
      glassType: "neutral",
    }),
  ],
  hall: [
    presetGate("hall-main-gate", {
      widthM: 4,
      heightM: 3.6,
      gateType: "roller",
      model: "br77",
      color: "anthracite",
    }),
    presetDoor("hall-service-door", {
      wall: "front",
      offsetM: 3.4,
      widthM: 1,
      heightM: 2.2,
      model: "thermo_vision",
    }),
    presetWindow("hall-left-band-front", {
      wall: "left",
      offsetM: -5.35,
      widthM: 3,
      heightM: 0.8,
      sillM: 2.6,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetWindow("hall-left-band-back", {
      wall: "left",
      offsetM: 5.35,
      widthM: 3,
      heightM: 0.8,
      sillM: 2.6,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetWindow("hall-right-band", {
      wall: "right",
      offsetM: 1.8,
      widthM: 3,
      heightM: 0.8,
      sillM: 2.6,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetRoofWindow("hall-roof-band", {
      widthM: 3,
      heightM: 1,
      model: "roof_band",
      glassType: "satin",
    }),
  ],
  large_hall: [
    presetGate("large-hall-left-gate", {
      offsetM: -2.75,
      widthM: 4.5,
      heightM: 4.2,
      gateType: "roller",
      model: "br100",
      color: "anthracite",
    }),
    presetGate("large-hall-right-gate", {
      offsetM: 2.1,
      widthM: 4.5,
      heightM: 4.2,
      gateType: "roller",
      model: "br100",
      color: "anthracite",
    }),
    presetDoor("large-hall-service-door", {
      wall: "front",
      offsetM: 5.2,
      widthM: 1.1,
      heightM: 2.25,
      model: "utility_ribbed",
    }),
    presetGate("large-hall-side-gate", {
      wall: "right",
      offsetM: 0,
      widthM: 3.6,
      heightM: 3.8,
      gateType: "roller",
      model: "br100",
      color: "anthracite",
    }),
    presetGate("large-hall-back-gate", {
      wall: "back",
      offsetM: -2.8,
      widthM: 4,
      heightM: 4,
      gateType: "roller",
      model: "br100",
      color: "anthracite",
    }),
    presetWindow("large-hall-left-band-front", {
      wall: "left",
      offsetM: -9.3,
      widthM: 3.2,
      heightM: 0.8,
      sillM: 3.2,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetWindow("large-hall-left-band-back", {
      wall: "left",
      offsetM: 9.3,
      widthM: 3.2,
      heightM: 0.8,
      sillM: 3.2,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetWindow("large-hall-right-band-front", {
      wall: "right",
      offsetM: -9.3,
      widthM: 3.2,
      heightM: 0.8,
      sillM: 3.2,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetWindow("large-hall-right-band-back", {
      wall: "right",
      offsetM: 9.3,
      widthM: 3.2,
      heightM: 0.8,
      sillM: 3.2,
      model: "industrial_band",
      glassType: "neutral",
    }),
    presetRoofWindow("large-hall-roof-band-left", {
      offsetM: -2.25,
      sillM: -5,
      widthM: 3,
      heightM: 1,
      model: "roof_band",
      glassType: "satin",
    }),
    presetRoofWindow("large-hall-roof-band-right", {
      offsetM: 2.25,
      sillM: 5,
      widthM: 3,
      heightM: 1,
      model: "roof_band",
      glassType: "satin",
    }),
  ],
});

export function getPresetOpenings(preset) {
  const openings = PRESET_OPENINGS[preset] || PRESET_OPENINGS.single_garage;
  return openings.map((opening) => ({ ...opening }));
}

export function getWindowModel(selection) {
  return WINDOW_MODELS[selection.model] || WINDOW_MODELS[DEFAULT_WINDOW_SELECTION.model];
}

export function getWindowFrameColor(selection) {
  return OPENING_FRAME_COLORS[selection.frameColor] || OPENING_FRAME_COLORS[DEFAULT_WINDOW_SELECTION.frameColor];
}

export function getWindowGlass(selection) {
  return WINDOW_GLASS_TYPES[selection.glassType] || WINDOW_GLASS_TYPES[DEFAULT_WINDOW_SELECTION.glassType];
}

export function getWindowOrientation(selection, model = getWindowModel(selection)) {
  const requested = selection.orientation || DEFAULT_WINDOW_SELECTION.orientation;
  return model.orientationModes?.includes(requested) ? requested : "horizontal";
}

export function getWindowDefaultSize(model, orientation = "horizontal") {
  const [width, height] = model.defaultSizeM || [1, 0.6];
  return orientation === "vertical" ? [height, width] : [width, height];
}

export function getWindowSizeRanges(model, orientation = "horizontal") {
  if (orientation === "vertical" && model.orientationModes?.includes("vertical")) {
    return {
      widthRange: model.heightRange,
      heightRange: model.widthRange,
    };
  }
  return {
    widthRange: model.widthRange,
    heightRange: model.heightRange,
  };
}
