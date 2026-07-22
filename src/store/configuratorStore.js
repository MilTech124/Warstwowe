import { create } from "zustand";
import {
  DEFAULT_CLADDING_SELECTION,
  DEFAULT_DOOR_SELECTION,
  DEFAULT_GATE_SELECTION,
  DEFAULT_ROOF_CLADDING_SELECTION,
  DEFAULT_WINDOW_SELECTION,
  PRESETS,
  getDoorModel,
  getWindowDefaultSize,
  getWindowModel,
  getWindowOrientation,
  getWindowSizeRanges,
  getWallPanelLengthM,
} from "@/config/catalog";
import { clamp } from "@/lib/utils";
import { roofPitchBounds } from "@/scene/geometry";

const defaultConfig = {
  schemaVersion: 6,
  preset: "single_garage",
  dimensions: { ...PRESETS.single_garage.dimensions },
  viewMode: "full",
  cameraMode: "orbit",
  showDimensions: true,
  roof: {
    type: "single_back",
    pitchPercent: 7,
    overhangM: { front: 0.2, back: 0.2, left: 0.2, right: 0.2 },
  },
  cladding: {
    ...DEFAULT_CLADDING_SELECTION,
    ...DEFAULT_ROOF_CLADDING_SELECTION,
    wallProfile: DEFAULT_CLADDING_SELECTION.profile,
    wallPirThicknessMm: DEFAULT_CLADDING_SELECTION.thicknessMm,
    roofPirThicknessMm: DEFAULT_ROOF_CLADDING_SELECTION.roofThicknessMm,
  },
  flashings: {
    enabled: true,
    package: "standard",
    color: "roof_match",
    corners: true,
    roofEdges: true,
    ridge: true,
  },
  gutters: {
    enabled: true,
    color: "roof_match",
    profile: "half_round",
    size: 150,
    downspoutSize: 100,
    downspouts: true,
    leafGuards: false,
    package: "standard",
  },
  structure: {
    visible: true,
    mode: "visual_rules",
  },
  openings: [
    {
      id: "main-gate",
      kind: "gate",
      wall: "front",
      offsetM: 0,
      widthM: 2.5,
      heightM: 2.25,
      sillM: 0,
      ...DEFAULT_GATE_SELECTION,
    },
    {
      id: "service-door",
      kind: "door",
      wall: "right",
      offsetM: 1.55,
      widthM: 0.95,
      heightM: 2.1,
      sillM: 0,
      ...DEFAULT_DOOR_SELECTION,
    },
    {
      id: "side-window",
      kind: "window",
      wall: "left",
      offsetM: -1,
      widthM: 1.2,
      heightM: 1,
      sillM: 1.05,
      ...DEFAULT_WINDOW_SELECTION,
    },
  ],
};

const OPENING_LIMITS = {
  gate: { width: [1.8, 6], height: [1.8, 4.5], sill: [0, 0] },
  door: { width: [0.8, 2.4], height: [1.9, 2.5], sill: [0, 0] },
  window: { width: [0.5, 3.6], height: [0.4, 1.8], sill: [0.35, 2.4] },
  roofWindow: { width: [0.6, 4], height: [0.7, 3], sill: [-20, 20] },
};

function getWallSpan(dimensions, wall) {
  if (wall === "roof") return dimensions.widthM;
  return wall === "front" || wall === "back" ? dimensions.widthM : dimensions.lengthM;
}

function openingsOverlap(a, b, clearanceM = 0.14) {
  if (a.wall !== b.wall) return false;
  if (a.kind === "roofWindow" || b.kind === "roofWindow") return false;
  const horizontal = Math.abs(a.offsetM - b.offsetM) < (a.widthM + b.widthM) / 2 + clearanceM;
  const aBottom = a.sillM;
  const aTop = a.sillM + a.heightM;
  const bBottom = b.sillM;
  const bTop = b.sillM + b.heightM;
  const vertical = aBottom < bTop + clearanceM && aTop + clearanceM > bBottom;
  return horizontal && vertical;
}

function availableOffset(opening, placed, dimensions) {
  const span = getWallSpan(dimensions, opening.wall);
  const halfFree = Math.max(0, (span - opening.widthM) / 2 - 0.25);
  const preferred = clamp(opening.offsetM, -halfFree, halfFree);
  const candidates = [preferred, 0];
  for (let distance = 0.25; distance <= halfFree + 0.001; distance += 0.25) {
    candidates.push(clamp(preferred - distance, -halfFree, halfFree));
    candidates.push(clamp(preferred + distance, -halfFree, halfFree));
    candidates.push(-distance, distance);
  }
  const unique = [...new Set(candidates.map((value) => Number(clamp(value, -halfFree, halfFree).toFixed(3))))];
  return unique.find((offsetM) => !placed.some((other) => openingsOverlap({ ...opening, offsetM }, other))) ?? preferred;
}

function fitOpeningsToDimensions(openings, dimensions) {
  const placed = [];
  openings.forEach((opening) => {
    const limits = OPENING_LIMITS[opening.kind] || OPENING_LIMITS.window;
    const isWindowKind = opening.kind === "window" || opening.kind === "roofWindow";
    const productModel = opening.kind === "door"
      ? getDoorModel(opening)
      : isWindowKind
        ? getWindowModel(opening)
        : null;
    const orientation = isWindowKind ? getWindowOrientation(opening, productModel) : "horizontal";
    const sizeRanges = isWindowKind ? getWindowSizeRanges(productModel, orientation) : null;
    const widthLimits = sizeRanges?.widthRange || productModel?.widthRange || limits.width;
    const heightLimits = sizeRanges?.heightRange || productModel?.heightRange || limits.height;
    const wallSpan = getWallSpan(dimensions, opening.wall);
    const maxWidth = Math.max(0.6, wallSpan - 0.8);
    const widthM = clamp(opening.widthM, widthLimits[0], Math.min(widthLimits[1], maxWidth));
    const sillM = opening.kind === "roofWindow"
      ? clamp(opening.sillM, -Math.max(0.1, (dimensions.lengthM - opening.heightM) / 2 - 0.3), Math.max(0.1, (dimensions.lengthM - opening.heightM) / 2 - 0.3))
      : opening.kind === "window"
      ? clamp(opening.sillM, limits.sill[0], Math.min(limits.sill[1], dimensions.wallHeightM - heightLimits[0] - 0.25))
      : 0;
    const maxHeight = opening.kind === "roofWindow"
      ? Math.max(heightLimits[0], Math.min(heightLimits[1], dimensions.lengthM - 0.8))
      : Math.max(heightLimits[0], dimensions.wallHeightM - sillM - 0.25);
    const next = {
      ...opening,
      ...(isWindowKind ? { orientation } : {}),
      widthM,
      sillM,
      heightM: clamp(opening.heightM, heightLimits[0], Math.min(heightLimits[1], maxHeight)),
    };
    if (next.kind === "window" || next.kind === "roofWindow") {
      const model = getWindowModel(next);
      const requestedMode = next.openMode || (next.open ? "turn" : "closed");
      const compatibleMode = model.openModes.includes(requestedMode) ? requestedMode : "closed";
      next.openMode = compatibleMode;
      next.open = compatibleMode !== "closed";
    }
    next.offsetM = availableOffset(next, placed, dimensions);
    placed.push(next);
  });
  return placed;
}

let openingSequence = 0;

function makeOpening(kind) {
  openingSequence += 1;
  const common = {
    id: `${kind}-${Date.now().toString(36)}-${openingSequence}`,
    kind,
    offsetM: 0,
  };
  if (kind === "gate") {
    return {
      ...common,
      wall: "front",
      widthM: 2.5,
      heightM: 2.25,
      sillM: 0,
      ...DEFAULT_GATE_SELECTION,
    };
  }
  if (kind === "door") {
    return {
      ...common,
      wall: "right",
      widthM: 0.95,
      heightM: 2.1,
      sillM: 0,
      ...DEFAULT_DOOR_SELECTION,
    };
  }
  if (kind === "roofWindow") {
    const roofSelection = { ...DEFAULT_WINDOW_SELECTION, model: "roof_skylight" };
    const roofModel = getWindowModel(roofSelection);
    const [widthM, heightM] = getWindowDefaultSize(roofModel);
    return {
      ...common,
      kind: "roofWindow",
      wall: "roof",
      widthM,
      heightM,
      sillM: 0,
      ...roofSelection,
    };
  }
  const windowModel = getWindowModel(DEFAULT_WINDOW_SELECTION);
  const [windowWidthM, windowHeightM] = getWindowDefaultSize(windowModel, DEFAULT_WINDOW_SELECTION.orientation);
  return {
    ...common,
    wall: "left",
    widthM: windowWidthM,
    heightM: windowHeightM,
    sillM: 1.15,
    ...DEFAULT_WINDOW_SELECTION,
  };
}

function addOpeningWithPlacement(openings, kind, dimensions) {
  const preferredWalls = kind === "gate"
    ? ["front", "back", "right", "left"]
    : kind === "door"
      ? ["right", "left", "back", "front"]
      : kind === "roofWindow"
        ? ["roof"]
        : ["left", "right", "back", "front"];
  const candidate = makeOpening(kind);
  for (const wall of preferredWalls) {
    const proposed = fitOpeningsToDimensions([...openings, { ...candidate, wall }], dimensions);
    const placed = proposed[proposed.length - 1];
    const collides = proposed.slice(0, -1).some((other) => openingsOverlap(placed, other));
    if (!collides) return proposed;
  }
  return openings;
}

export const useConfiguratorStore = create((set) => ({
  config: defaultConfig,
  setPreset: (preset) =>
    set((state) => {
      const dimensions = { ...PRESETS[preset].dimensions };
      return {
        config: {
          ...state.config,
          preset,
          dimensions,
          openings: fitOpeningsToDimensions(state.config.openings, dimensions),
        },
      };
    }),
  setViewMode: (viewMode) =>
    set((state) => ({
      config: {
        ...state.config,
        viewMode,
        cameraMode: viewMode === "structure" ? "structure" : state.config.cameraMode,
      },
    })),
  setCameraMode: (cameraMode) =>
    set((state) => ({ config: { ...state.config, cameraMode } })),
  setShowDimensions: (showDimensions) =>
    set((state) => ({ config: { ...state.config, showDimensions } })),
  updateDimension: (key, value) =>
    set((state) => {
      const [min, max] = PRESETS[state.config.preset].dimensionLimits[key];
      const dimensions = {
        ...state.config.dimensions,
        [key]: clamp(value, min, max),
      };
      return {
        config: {
          ...state.config,
          dimensions,
          openings: fitOpeningsToDimensions(state.config.openings, dimensions),
        },
      };
    }),
  updateRoof: (patch) =>
    set((state) => {
      const nextRoof = { ...state.config.roof, ...patch };
      const bounds = roofPitchBounds(nextRoof.type);
      nextRoof.pitchPercent = patch.type && state.config.roof.pitchPercent < bounds.min
        ? bounds.fallback
        : clamp(nextRoof.pitchPercent, bounds.min, bounds.max);
      return {
        config: {
          ...state.config,
          roof: nextRoof,
        },
      };
    }),
  updateOverhang: (side, value) =>
    set((state) => ({
      config: {
        ...state.config,
        roof: {
          ...state.config.roof,
          overhangM: {
            ...state.config.roof.overhangM,
            [side]: clamp(value, 0, 0.8),
          },
        },
      },
    })),
  updateCladding: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        cladding: {
          ...state.config.cladding,
          ...patch,
          panelLengthM: getWallPanelLengthM({ ...state.config.cladding, ...patch }),
          wallProfile: patch.profile ?? patch.wallProfile ?? state.config.cladding.wallProfile,
          wallPirThicknessMm: patch.thicknessMm ?? patch.wallPirThicknessMm ?? state.config.cladding.wallPirThicknessMm,
          roofPirThicknessMm: patch.roofThicknessMm ?? patch.roofPirThicknessMm ?? state.config.cladding.roofPirThicknessMm,
        },
      },
    })),
  updateFlashings: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        flashings: { ...state.config.flashings, ...patch },
      },
    })),
  updateGutters: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        gutters: { ...state.config.gutters, ...patch },
      },
    })),
  updateOpening: (id, patch) =>
    set((state) => {
      const openings = state.config.openings.map((opening) => {
        if (opening.id !== id) return opening;
        if (opening.kind !== "window" && opening.kind !== "roofWindow") return { ...opening, ...patch };
        const windowPatch = { ...patch };
        if (windowPatch.openMode) {
          windowPatch.open = windowPatch.openMode !== "closed";
        } else if (typeof windowPatch.open === "boolean") {
          windowPatch.openMode = windowPatch.open ? "turn" : "closed";
        }
        return { ...opening, ...windowPatch };
      });
      return {
        config: {
          ...state.config,
          openings: fitOpeningsToDimensions(openings, state.config.dimensions),
        },
      };
    }),
  addOpening: (kind) =>
    set((state) => ({
      config: {
        ...state.config,
        openings: state.config.openings.length >= 12
          ? state.config.openings
          : addOpeningWithPlacement(state.config.openings, kind, state.config.dimensions),
      },
    })),
  duplicateOpening: (id) =>
    set((state) => {
      const source = state.config.openings.find((opening) => opening.id === id);
      if (!source || state.config.openings.length >= 12) return state;
      openingSequence += 1;
      const copy = {
        ...source,
        id: `${source.kind}-${Date.now().toString(36)}-${openingSequence}`,
        offsetM: source.offsetM + source.widthM + 0.25,
        open: false,
        ...(source.kind === "window" || source.kind === "roofWindow" ? { openMode: "closed" } : {}),
      };
      return {
        config: {
          ...state.config,
          openings: fitOpeningsToDimensions([...state.config.openings, copy], state.config.dimensions),
        },
      };
    }),
  removeOpening: (id) =>
    set((state) => ({
      config: {
        ...state.config,
        openings: state.config.openings.filter((opening) => opening.id !== id),
      },
    })),
}));
