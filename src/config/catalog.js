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

const DEFAULT_WALL_PANEL_TYPES = {
  wall_panel: {
    label: "Plyta scienna",
    models: {
      linear: {
        label: "Linear",
        defaultProfile: "linear",
        profiles: ["linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: {
          anthracite: { label: "Antracyt", hex: "#3f474f" },
          silver: { label: "Srebrny", hex: "#c8d0d5" },
          graphite: { label: "Grafit", hex: "#4b5563" },
          white: { label: "Bialy", hex: "#e8edf0" },
        },
      },
      smooth: {
        label: "Gladka",
        defaultProfile: "smooth",
        profiles: ["smooth"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: {
          anthracite: { label: "Antracyt", hex: "#3f474f" },
          silver: { label: "Srebrny", hex: "#c8d0d5" },
          graphite: { label: "Grafit", hex: "#4b5563" },
          white: { label: "Bialy", hex: "#e8edf0" },
        },
      },
      macro_linear: {
        label: "Macro linear",
        defaultProfile: "macro_linear",
        profiles: ["macro_linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: {
          anthracite: { label: "Antracyt", hex: "#3f474f" },
          silver: { label: "Srebrny", hex: "#c8d0d5" },
          graphite: { label: "Grafit", hex: "#4b5563" },
          white: { label: "Bialy", hex: "#e8edf0" },
        },
      },
      micro_linear: {
        label: "Micro linear",
        defaultProfile: "micro_linear",
        profiles: ["micro_linear"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: {
          anthracite: { label: "Antracyt", hex: "#3f474f" },
          silver: { label: "Srebrny", hex: "#c8d0d5" },
          graphite: { label: "Grafit", hex: "#4b5563" },
          white: { label: "Bialy", hex: "#e8edf0" },
        },
      },
      micro_wave: {
        label: "Micro wave",
        defaultProfile: "micro_wave",
        profiles: ["micro_wave"],
        thicknessMm: [40, 50, 60, 80, 100, 120],
        colors: {
          anthracite: { label: "Antracyt", hex: "#3f474f" },
          silver: { label: "Srebrny", hex: "#c8d0d5" },
          graphite: { label: "Grafit", hex: "#4b5563" },
          white: { label: "Bialy", hex: "#e8edf0" },
        },
      },
    },
  },
};

export const CLADDING_CATALOG = {
  default_panels: {
    label: "Plyty domyslne",
    types: DEFAULT_WALL_PANEL_TYPES,
  },
  steelprofil: {
    label: "SteelProfil",
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
    colors: {
      graphite: { label: "Grafit", hex: "#4b5563" },
      anthracite: { label: "Antracyt", hex: "#3f474f" },
      silver: { label: "Srebrny", hex: "#c8d0d5" },
    },
  },
};

export const ROOF_CLADDING_CATALOG = {
  default_roof_panels: {
    label: "Plyty domyslne",
    models: ROOF_PANEL_MODELS,
  },
  steelprofil: {
    label: "SteelProfil",
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
  anthracite: { label: "Antracyt", hex: "#3f474f" },
  graphite: { label: "Grafit", hex: "#4b5563" },
  silver: { label: "Srebrny", hex: "#c8d0d5" },
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
  return model.colors[selection.color] || model.colors[DEFAULT_CLADDING_SELECTION.color];
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
  return model.colors[selection.roofColor] || model.colors[DEFAULT_ROOF_CLADDING_SELECTION.roofColor];
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
};

export const GATE_STRUCTURES = {
  smooth: { label: "Gładka", description: "Powierzchnia gładka" },
  woodgrain: { label: "Woodgrain", description: "Struktura drewnopodobna" },
  microline: { label: "Microline", description: "Drobna struktura" },
};

export const TILTING_LAYOUTS = {
  vertical: { label: "Pionowy", description: "Trapez T-10 pionowo" },
  horizontal: { label: "Poziomy", description: "Trapez T-10 poziomo" },
  diagonal: { label: "Skośny", description: "Trapez T-10 skośnie" },
};

export const GATE_COLORS = {
  anthracite: { label: "Antracyt RAL 7016", hex: "#383E42" },
  white: { label: "Biały RAL 9016", hex: "#F1F0EA" },
  brown: { label: "Brązowy RAL 8017", hex: "#45322E" },
  grey: { label: "Szary RAL 7037", hex: "#5B5F62" },
  golden_oak: { label: "Złoty Dąb", hex: "#9A6326", wood: true },
  walnut: { label: "Orzech", hex: "#5A3A22", wood: true },
  winchester: { label: "Winchester", hex: "#6E5A43", wood: true },
};

const SECTIONAL_MODELS = {
  unipro: {
    label: "UniPro",
    note: "Panel 40 mm, uniwersalna",
    panelHeightM: 0.55,
    patterns: ["smooth", "high", "low", "cassette"],
    structures: ["smooth", "woodgrain", "microline"],
    defaultPattern: "high",
    colors: GATE_COLORS,
  },
  unitherm: {
    label: "UniTherm",
    note: "Panel INNOVO 60 mm, premium",
    panelHeightM: 0.55,
    patterns: ["smooth", "high", "low"],
    structures: ["smooth", "woodgrain"],
    defaultPattern: "high",
    colors: GATE_COLORS,
  },
  prime: {
    label: "PRIME",
    note: "Linia premium",
    panelHeightM: 0.61,
    patterns: ["smooth", "high"],
    structures: ["smooth", "woodgrain", "microline"],
    defaultPattern: "smooth",
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
  komfort: {
    label: "KOMFORT",
    note: "Klasyk, trapez T-10",
    layouts: ["vertical"],
    defaultLayout: "vertical",
    colors: GATE_COLORS,
  },
  novum: {
    label: "NOVUM",
    note: "Ekonomiczna, nieocieplana",
    layouts: ["vertical"],
    defaultLayout: "vertical",
    colors: GATE_COLORS,
  },
  select: {
    label: "SELECT",
    note: "Pionowy / poziomy / skośny",
    layouts: ["vertical", "horizontal", "diagonal"],
    defaultLayout: "vertical",
    colors: GATE_COLORS,
  },
  city: {
    label: "CITY",
    note: "Nowoczesne wzory",
    layouts: ["vertical", "horizontal"],
    defaultLayout: "horizontal",
    colors: GATE_COLORS,
  },
};

export const GATE_MANUFACTURERS = {
  wisniowski: {
    label: "WIŚNIOWSKI",
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
  structure: "smooth",
  layout: "vertical",
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

export function getGateColor(selection) {
  const model = getGateModel(selection);
  return model.colors[selection.color] || model.colors[DEFAULT_GATE_SELECTION.color];
}
