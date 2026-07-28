export const FINISH_ROLES = Object.freeze([
  "wall",
  "roof",
  "gate",
  "door",
  "soffit",
  "flashing",
  "gutter",
  "frame",
]);

const OPENING_WOOD_ROLES = ["gate", "door", "soffit", "frame"];
const FACADE_WOOD_ROLES = ["wall", ...OPENING_WOOD_ROLES];
const OPENING_METAL_ROLES = ["gate", "door", "soffit", "frame"];

// Conservative, product-specific availability. The global catalog remains
// broad, but panels and flashings no longer expose every gate colour.
const WALL_PANEL_METAL_CODES = new Set([
  "RAL 7016",
  "RAL 7024",
  "RAL 8017",
  "RAL 9002",
  "RAL 9006",
  "RAL 9010",
  "RAL 9016",
]);
const ROOF_PANEL_METAL_CODES = new Set([
  "RAL 7016",
  "RAL 7024",
  "RAL 8017",
  "RAL 9002",
  "RAL 9006",
]);
const STEELPROFIL_STANDARD_SHEET_CODES = new Set([
  "RAL 9010",
  "RAL 9002",
  "RAL 3011",
  "RAL 9006",
  "RAL 9007",
  "RAL 8017",
  "RAL 8004",
  "RAL 9005",
  "RAL 5010",
  "RAL 5012",
  "RAL 1015",
  "RAL 1003",
  "RAL 7035",
  "RAL 7024",
  "RAL 6020",
  "RAL 6005",
]);

const METAL_FAMILY_MAPS = Object.freeze({
  balanced: {
    normal: "/materials/metal/{family}/1k/normal.webp",
    roughness: "/materials/metal/{family}/1k/roughness.webp",
  },
  high: {
    normal: "/materials/metal/{family}/2k/normal.webp",
    roughness: "/materials/metal/{family}/2k/roughness.webp",
  },
});

function metal(id, label, hex, {
  code = null,
  surfaceFamily = "matte-polyester",
  roughness = 0.48,
  metalness = 0.08,
  popular = false,
  preview = null,
} = {}) {
  const maps = Object.fromEntries(
    Object.entries(METAL_FAMILY_MAPS).map(([quality, entries]) => [
      quality,
      Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [key, value.replace("{family}", surfaceFamily)]),
      ),
    ]),
  );
  const allowedRoles = [...OPENING_METAL_ROLES];
  if (WALL_PANEL_METAL_CODES.has(code)) allowedRoles.push("wall");
  if (ROOF_PANEL_METAL_CODES.has(code)) allowedRoles.push("roof");
  if (STEELPROFIL_STANDARD_SHEET_CODES.has(code) || code === "RAL 7016") {
    allowedRoles.push("flashing");
  }
  if (ROOF_PANEL_METAL_CODES.has(code)) allowedRoles.push("gutter");
  if (id === "galvanized" || id === "aluzinc") {
    allowedRoles.push("flashing", "gutter");
  }

  return Object.freeze({
    id,
    label,
    code,
    kind: "metal",
    group: surfaceFamily === "galvanized" || surfaceFamily === "aluzinc" || surfaceFamily === "brushed-metal"
      ? "metallic"
      : "ral",
    hex,
    surfaceFamily,
    maps,
    scaleM: [0.42, 0.42],
    grainAxis: "isotropic",
    allowedRoles: [...new Set(allowedRoles)],
    roughness,
    metalness,
    popular,
    preview,
  });
}

function wood(id, label, hex, {
  source,
  popular = false,
  facade = false,
  panelDecor = false,
  scaleM = [1.15, 2.35],
} = {}) {
  const base = `/materials/wood/${id}`;
  const panelBase = `/materials/panel-wood/${id}`;
  return Object.freeze({
    id,
    label,
    kind: "wood",
    group: "wood",
    hex,
    wood: true,
    source,
    surfaceFamily: "printed-wood-steel",
    maps: {
      balanced: {
        map: `${base}/1k/albedo.webp`,
        normal: `${base}/1k/normal.webp`,
        roughness: `${base}/1k/roughness.webp`,
      },
      high: {
        map: `${base}/2k/albedo.webp`,
        normal: `${base}/2k/normal.webp`,
        roughness: `${base}/2k/roughness.webp`,
      },
    },
    roleMaps: panelDecor ? {
      wall: {
        balanced: {
          map: `${panelBase}/1k/albedo.webp`,
          normal: `${panelBase}/1k/normal.webp`,
          roughness: `${panelBase}/1k/roughness.webp`,
        },
        high: {
          map: `${panelBase}/2k/albedo.webp`,
          normal: `${panelBase}/2k/normal.webp`,
          roughness: `${panelBase}/2k/roughness.webp`,
        },
      },
    } : null,
    rolePreview: panelDecor ? {
      wall: `${panelBase}/preview.webp`,
    } : null,
    scaleM,
    grainAxis: {
      // WallPanels currently installs sandwich panels in horizontal rows.
      // The printed decor follows the long production axis of each panel.
      wall: "horizontal",
      gate: "horizontal",
      door: "vertical",
      soffit: "longitudinal",
      frame: "vertical",
    },
    allowedRoles: facade ? FACADE_WOOD_ROLES : OPENING_WOOD_ROLES,
    roughness: 0.57,
    metalness: 0.035,
    popular,
    preview: `${base}/preview.webp`,
  });
}

const presets = [
  metal("ral_1003", "Żółty sygnałowy RAL 1003", "#F9A800", { code: "RAL 1003", surfaceFamily: "smooth-polyester" }),
  metal("ral_1015", "Kość słoniowa RAL 1015", "#E6D2B5", { code: "RAL 1015", surfaceFamily: "smooth-polyester" }),
  metal("ral_3005", "Czerwone wino RAL 3005", "#5E2028", { code: "RAL 3005" }),
  metal("ral_3009", "Czerwień tlenkowa RAL 3009", "#642424", { code: "RAL 3009" }),
  metal("ral_3011", "Czerwień brunatna RAL 3011", "#781F19", { code: "RAL 3011" }),
  metal("ral_5010", "Niebieski gencjanowy RAL 5010", "#004F7C", { code: "RAL 5010" }),
  metal("ral_5012", "Niebieski jasny RAL 5012", "#0089B6", { code: "RAL 5012", surfaceFamily: "smooth-polyester" }),
  metal("ral_6005", "Zieleń mchu RAL 6005", "#0F4336", { code: "RAL 6005" }),
  metal("ral_6020", "Zieleń chromowa RAL 6020", "#37422F", { code: "RAL 6020" }),
  metal("ral_7012", "Szary bazaltowy RAL 7012", "#575D5E", { code: "RAL 7012" }),
  metal("anthracite", "Antracyt RAL 7016", "#383E42", { code: "RAL 7016", popular: true }),
  metal("graphite", "Grafit RAL 7024", "#474A50", { code: "RAL 7024", popular: true }),
  metal("ral_7035", "Szary jasny RAL 7035", "#CBD0CC", { code: "RAL 7035", surfaceFamily: "smooth-polyester" }),
  metal("grey", "Szary RAL 7037", "#7D7F7D", { code: "RAL 7037" }),
  metal("ral_7040", "Szary okienny RAL 7040", "#9DA3A6", { code: "RAL 7040", surfaceFamily: "smooth-polyester" }),
  metal("ral_7047", "Szary mleczny RAL 7047", "#D0D0D0", { code: "RAL 7047", surfaceFamily: "smooth-polyester" }),
  metal("ral_8004", "Brąz miedziany RAL 8004", "#8F4E35", { code: "RAL 8004" }),
  metal("ral_8014", "Brąz sepiowy RAL 8014", "#49392D", { code: "RAL 8014" }),
  metal("brown", "Brąz czekoladowy RAL 8017", "#45322E", { code: "RAL 8017", popular: true }),
  metal("ral_8019", "Brąz szary RAL 8019", "#403A3A", { code: "RAL 8019" }),
  metal("ral_9002", "Biel szara RAL 9002", "#D7D5CB", { code: "RAL 9002", surfaceFamily: "smooth-polyester" }),
  metal("ral_9005", "Czerń głęboka RAL 9005", "#0A0A0D", { code: "RAL 9005", popular: true }),
  metal("silver", "Srebrny RAL 9006", "#A5A8A6", { code: "RAL 9006", surfaceFamily: "metallic", roughness: 0.4, metalness: 0.18, popular: true }),
  metal("ral_9007", "Szare aluminium RAL 9007", "#8F8F88", { code: "RAL 9007", surfaceFamily: "metallic", roughness: 0.4, metalness: 0.18 }),
  metal("ral_9010", "Biel czysta RAL 9010", "#F4F4ED", { code: "RAL 9010", surfaceFamily: "smooth-polyester" }),
  metal("white", "Biały RAL 9016", "#F1F0EA", { code: "RAL 9016", surfaceFamily: "smooth-polyester", popular: true }),
  metal("galvanized", "Stal ocynkowana", "#AEB8BD", { surfaceFamily: "galvanized", roughness: 0.43, metalness: 0.72, preview: "/materials/metal/galvanized/preview.webp" }),
  metal("aluzinc", "Alucynk", "#B9C0C2", { surfaceFamily: "aluzinc", roughness: 0.37, metalness: 0.78, preview: "/materials/metal/aluzinc/preview.webp" }),
  metal("metalbrush", "Metbrush Silver", "#9EA4A6", { surfaceFamily: "brushed-metal", roughness: 0.32, metalness: 0.62, preview: "/materials/metal/brushed-metal/preview.webp" }),

  wood("golden_oak", "Złoty dąb", "#A76B2B", { source: "generated-oak", popular: true, facade: true, panelDecor: true }),
  wood("golden_oak_3d", "Złoty dąb 3D", "#8F5420", { source: "generated-oak", popular: true }),
  wood("natural_oak", "Dąb naturalny", "#A98659", { source: "Wood001", popular: true }),
  wood("dark_oak", "Dąb ciemny", "#4C3526", { source: "Wood027", facade: true, panelDecor: true }),
  wood("bog_oak", "Szary drewnopodobny", "#77736D", { source: "Wood029", facade: true, panelDecor: true }),
  wood("rustic_oak", "Dąb rustykalny", "#7E5636", { source: "generated-oak" }),
  wood("walnut", "Orzech", "#5A3A22", { source: "Wood027", popular: true }),
  wood("winchester", "Winchester", "#7B5A3D", { source: "Wood001", popular: true }),
  wood("wenge", "Wenge", "#2B211D", { source: "Wood029" }),
  wood("mahogany", "Mahoń", "#6A3025", { source: "Wood027" }),
  wood("macore", "Macore", "#713B2D", { source: "Wood027" }),
  wood("oregon", "Oregon", "#A46E3F", { source: "Wood001" }),
  wood("sapeli", "Sapeli", "#704035", { source: "Wood027" }),
  wood("siena_noce", "Siena Noce", "#574337", { source: "Wood029" }),
  wood("anteak", "AnTEAK", "#8B5A35", { source: "generated-oak" }),
  wood("turner_oak_malt", "Turner Oak Malt", "#B18A5E", { source: "generated-oak" }),
];

export const FINISH_PRESETS = Object.freeze(
  Object.fromEntries(presets.map((preset) => [preset.id, preset])),
);

export const FINISH_IDS = Object.freeze(Object.keys(FINISH_PRESETS));

export function getFinishPreset(id, fallbackId = "anthracite") {
  return FINISH_PRESETS[id] || FINISH_PRESETS[fallbackId] || FINISH_PRESETS.anthracite;
}

export function getFinishesForRole(role) {
  return Object.fromEntries(
    Object.entries(FINISH_PRESETS)
      .filter(([, preset]) => preset.allowedRoles.includes(role))
      .map(([id, preset]) => [
        id,
        preset.rolePreview?.[role]
          ? { ...preset, preview: preset.rolePreview[role] }
          : preset,
      ]),
  );
}

export function getFinishForRole(id, role, fallbackId = "anthracite") {
  const requested = FINISH_PRESETS[id];
  if (requested?.allowedRoles.includes(role)) {
    return requested.rolePreview?.[role]
      ? { ...requested, preview: requested.rolePreview[role] }
      : requested;
  }

  const fallback = FINISH_PRESETS[fallbackId];
  if (fallback?.allowedRoles.includes(role)) {
    return fallback.rolePreview?.[role]
      ? { ...fallback, preview: fallback.rolePreview[role] }
      : fallback;
  }

  return Object.values(FINISH_PRESETS).find((preset) => preset.allowedRoles.includes(role))
    || FINISH_PRESETS.anthracite;
}

export const WALL_FINISH_OPTIONS = Object.freeze(getFinishesForRole("wall"));
export const ROOF_FINISH_OPTIONS = Object.freeze(getFinishesForRole("roof"));
export const GATE_FINISH_OPTIONS = Object.freeze(getFinishesForRole("gate"));
export const DOOR_FINISH_OPTIONS = Object.freeze(getFinishesForRole("door"));
export const SOFFIT_FINISH_OPTIONS = Object.freeze(getFinishesForRole("soffit"));
export const FLASHING_FINISH_OPTIONS = Object.freeze(getFinishesForRole("flashing"));
export const GUTTER_FINISH_OPTIONS = Object.freeze(getFinishesForRole("gutter"));
export const FRAME_FINISH_OPTIONS = Object.freeze(getFinishesForRole("frame"));

export function resolveFinishMaps(finish, quality = "high", role = null) {
  const preset = typeof finish === "string" ? getFinishPreset(finish) : finish;
  const roleMaps = role ? preset?.roleMaps?.[role] : null;
  if (roleMaps) {
    return roleMaps[quality] || roleMaps.high || roleMaps.balanced || {};
  }
  return preset?.maps?.[quality] || preset?.maps?.high || preset?.maps?.balanced || {};
}
