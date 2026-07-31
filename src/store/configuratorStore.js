import { createContext, createElement, useContext, useRef } from "react";
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import { isQualityPreference, writeQualityPreference } from "@/lib/viewerPreferences";
import {
  DEFAULT_DOOR_SELECTION,
  DEFAULT_GATE_SELECTION,
  DEFAULT_WINDOW_SELECTION,
  PRESETS,
  getDoorModel,
  getPresetDefaults,
  getPresetOpenings,
  getWindowDefaultSize,
  getWindowModel,
  getWindowOrientation,
  getWindowSizeRanges,
  getWallPanelLengthM,
} from "@/config/catalog";
import {
  DEFAULT_FRONT_PROJECTION,
  FRONT_PROJECTION_FINISHES,
  FRONT_PROJECTION_LIMITS,
  isFrontProjectionAvailable,
} from "@/config/frontProjection";
import { DEFAULT_LIGHTING, normalizeLighting } from "@/config/lighting";
import { clamp } from "@/lib/utils";
import { roofPitchBounds } from "@/scene/geometry";
import { DEFAULT_STRUCTURE } from "@/scene/structure/inputs";
import { SNOW_ZONES, REINFORCEMENT_LEVELS } from "@/scene/structure/spec";

const defaultPreset = getPresetDefaults("single_garage");

const defaultOrder = {
  customerName: "",
  customerAddress: "",
  phone: "",
  email: "",
  orderNo: "",
  notes: "",
};

const defaultConfig = {
  schemaVersion: 12,
  preset: "single_garage",
  dimensions: { ...PRESETS.single_garage.dimensions },
  viewMode: "full",
  cameraMode: "orbit",
  showDimensions: true,
  roof: defaultPreset.roof,
  cladding: defaultPreset.cladding,
  flashings: defaultPreset.flashings,
  gutters: defaultPreset.gutters,
  frontProjection: { ...DEFAULT_FRONT_PROJECTION },
  lighting: { ...DEFAULT_LIGHTING },
  structure: { ...DEFAULT_STRUCTURE },
  order: defaultOrder,
  openings: getPresetOpenings("single_garage"),
};

export function createInitialConfiguratorConfig(presetId = "single_garage") {
  const preset = PRESETS[presetId] ? presetId : "single_garage";
  const defaults = getPresetDefaults(preset);
  return {
    ...defaultConfig,
    preset,
    dimensions: { ...PRESETS[preset].dimensions },
    roof: { ...defaults.roof, overhangM: { ...defaults.roof.overhangM } },
    cladding: { ...defaults.cladding },
    flashings: { ...defaults.flashings },
    gutters: { ...defaults.gutters },
    frontProjection: { ...DEFAULT_FRONT_PROJECTION },
    lighting: { ...DEFAULT_LIGHTING },
    structure: { ...DEFAULT_STRUCTURE },
    order: { ...defaultOrder },
    openings: getPresetOpenings(preset),
  };
}

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

export function createConfiguratorStore(initialConfig = createInitialConfiguratorConfig()) {
  return createStore((set) => ({
  config: initialConfig,
  ui: {
    activeTab: "body",
    lightingPreviewSuppressed: false,
    // "auto" | "low" | "balanced" | "high" - świadomy wybór użytkownika.
    qualityPreference: "auto",
    // Poziom wyliczony z detekcji sprzętu i PerformanceMonitor - używany tylko w trybie "auto".
    autoQuality: "high",
    // Wymuszenie pełnej jakości na czas zrzutów do PDF, niezależnie od ustawień.
    qualityOverride: null,
  },
  setActiveTab: (activeTab) =>
    set((state) => ({
      ui: { ...state.ui, activeTab },
    })),
  setLightingPreviewSuppressed: (lightingPreviewSuppressed) =>
    set((state) => ({
      ui: { ...state.ui, lightingPreviewSuppressed },
    })),
  setQualityPreference: (qualityPreference) => {
    if (!isQualityPreference(qualityPreference)) return;
    writeQualityPreference(qualityPreference);
    set((state) => ({
      ui: { ...state.ui, qualityPreference },
    }));
  },
  // PerformanceMonitor potrafi wołać onDecline wielokrotnie z rzędu - bez tego
  // strażnika każde wywołanie tworzyłoby nowy obiekt ui i przerenderowywało scenę.
  setAutoQuality: (autoQuality) =>
    set((state) => (state.ui.autoQuality === autoQuality
      ? state
      : { ui: { ...state.ui, autoQuality } })),
  setQualityOverride: (qualityOverride) =>
    set((state) => ({
      ui: { ...state.ui, qualityOverride },
    })),
  setPreset: (preset) =>
    set((state) => {
      const dimensions = { ...PRESETS[preset].dimensions };
      const defaults = getPresetDefaults(preset);
      return {
        config: {
          ...state.config,
          preset,
          dimensions,
          roof: defaults.roof,
          cladding: defaults.cladding,
          flashings: defaults.flashings,
          gutters: defaults.gutters,
          frontProjection: { ...DEFAULT_FRONT_PROJECTION },
          lighting: normalizeLighting(state.config.lighting, {
            frontProjectionAvailable: false,
          }),
          openings: fitOpeningsToDimensions(getPresetOpenings(preset), dimensions),
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
  // Zmiana samego trybu widoku, bez wymuszania kamery „structure".
  // Używane przez zrzuty do PDF, które ustawiają kamerę imperatywnie.
  setViewModeOnly: (viewMode) =>
    set((state) => ({ config: { ...state.config, viewMode } })),
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
  updateFrontProjection: (patch) =>
    set((state) => {
      const current = { ...DEFAULT_FRONT_PROJECTION, ...(state.config.frontProjection ?? {}) };
      const nextDepth = patch.depthM === undefined
        ? current.depthM
        : clamp(Number(patch.depthM) || 0, FRONT_PROJECTION_LIMITS.minM, FRONT_PROJECTION_LIMITS.maxM);
      const nextFinish = patch.liningFinish && FRONT_PROJECTION_FINISHES[patch.liningFinish]
        ? patch.liningFinish
        : current.liningFinish;
      return {
        config: {
          ...state.config,
          frontProjection: {
            depthM: nextDepth,
            liningFinish: nextFinish,
          },
          lighting: normalizeLighting(state.config.lighting, {
            frontProjectionAvailable: isFrontProjectionAvailable(state.config.preset) && nextDepth > 0,
          }),
        },
      };
    }),
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
  updateLighting: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        lighting: normalizeLighting(
          { ...DEFAULT_LIGHTING, ...state.config.lighting, ...patch },
          {
            frontProjectionAvailable: isFrontProjectionAvailable(state.config.preset)
              && Number(state.config.frontProjection?.depthM) > 0,
          },
        ),
      },
    })),
  updateStructure: (patch) =>
    set((state) => {
      const next = { ...DEFAULT_STRUCTURE, ...state.config.structure, ...patch };
      return {
        config: {
          ...state.config,
          structure: {
            ...next,
            reinforcement: REINFORCEMENT_LEVELS[next.reinforcement] ? next.reinforcement : DEFAULT_STRUCTURE.reinforcement,
            snowZone: SNOW_ZONES.includes(Number(next.snowZone)) ? Number(next.snowZone) : DEFAULT_STRUCTURE.snowZone,
          },
        },
      };
    }),
  updateOrder: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        order: { ...defaultOrder, ...state.config.order, ...patch },
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
}

export function selectEffectiveQuality(state) {
  const { qualityPreference, autoQuality, qualityOverride } = state.ui;
  if (qualityOverride) return qualityOverride;
  return qualityPreference === "auto" ? autoQuality : qualityPreference;
}

const ConfiguratorStoreContext = createContext(null);

export function ConfiguratorStoreProvider({ initialConfig, children }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createConfiguratorStore(initialConfig);
  }
  return createElement(ConfiguratorStoreContext.Provider, { value: storeRef.current }, children);
}

export function useConfiguratorStore(selector = (state) => state) {
  const store = useContext(ConfiguratorStoreContext);
  if (!store) throw new Error("ConfiguratorStoreProvider is missing.");
  return useStore(store, selector);
}

export function useConfiguratorStoreApi() {
  const store = useContext(ConfiguratorStoreContext);
  if (!store) throw new Error("ConfiguratorStoreProvider is missing.");
  return store;
}
